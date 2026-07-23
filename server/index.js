import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import QRCode from 'qrcode';
import { getKeymaster, getNode, run, REGISTRY } from './archon.js';
import { loadStore, saveStore, ORGANIZER_WALLET, WALLETS_DIR } from './store.js';
import { seed } from './seed.js';

const PASSPHRASE = process.env.ARCHON_PASSPHRASE;
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'letsfork';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
// Behind Tailscale Funnel (TLS terminates at the proxy) — honor X-Forwarded-Proto
// so the QR code link comes out https.
app.set('trust proxy', true);
app.use(express.json());
app.use(express.static(path.join(ROOT, 'web')));

const organizer = () => getKeymaster(ORGANIZER_WALLET, PASSPHRASE);

function slugify(name) {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
}

// ---- onboarding ----------------------------------------------------------

app.post('/api/onboard', async (req, res) => {
    try {
        const name = slugify(String(req.body?.name || ''));
        if (!name) return res.status(400).json({ error: 'name required' });

        const store = loadStore();
        if (store.attendees[name]) return res.status(409).json({ error: 'name taken', attendee: publicAttendee(store.attendees[name]) });

        const walletFile = path.join(WALLETS_DIR, `${name}.json`);
        const passphrase = crypto.randomBytes(24).toString('base64url');
        const attendeeKm = await getKeymaster(walletFile, passphrase);

        const did = await run(attendeeKm, k => k.createId(name, { registry: REGISTRY }));

        // Issue the attendee credential (the sybil gate: one per badge).
        const org = await organizer();
        const credential = await run(org, k => k.bindCredential(did, {
            schema: store.schemaDid,
            claims: { event: 'bitcoin++ Toronto 2026 (Consensus Edition)', role: 'attendee' },
        }));
        const credentialDid = await run(org, k => k.issueCredential(credential));
        await run(attendeeKm, k => k.acceptCredential(credentialDid));

        // Register as an eligible voter on every open poll.
        for (const poll of store.polls) {
            await run(org, k => k.addPollVoter(poll.did, did));
        }

        store.attendees[name] = { name, did, walletFile, passphrase, credentialDid, votes: {} };
        saveStore(store);
        res.json({ ok: true, attendee: publicAttendee(store.attendees[name]) });
    } catch (err) {
        console.error('onboard failed:', err);
        res.status(500).json({ error: String(err.message || err) });
    }
});

function publicAttendee(a) {
    return { name: a.name, did: a.did, credentialDid: a.credentialDid, votes: a.votes };
}

app.get('/api/attendee/:name', (req, res) => {
    const store = loadStore();
    const attendee = store.attendees[slugify(req.params.name)];
    if (!attendee) return res.status(404).json({ error: 'not found' });
    res.json({ attendee: publicAttendee(attendee) });
});

// ---- voting --------------------------------------------------------------

app.post('/api/vote', async (req, res) => {
    try {
        const { name, slug, vote } = req.body || {};
        const store = loadStore();
        const attendee = store.attendees[slugify(String(name || ''))];
        const poll = store.polls.find(p => p.slug === slug);
        if (!attendee) return res.status(404).json({ error: 'unknown attendee' });
        if (!poll) return res.status(404).json({ error: 'unknown poll' });
        if (!Number.isInteger(vote) || vote < 1 || vote > 3) return res.status(400).json({ error: 'vote must be 1..3' });

        const attendeeKm = await getKeymaster(attendee.walletFile, attendee.passphrase);
        const ballotDid = await run(attendeeKm, k => k.votePoll(poll.did, vote));

        // Hand the encrypted ballot to the poll owner for tallying.
        const org = await organizer();
        await run(org, k => k.updatePoll(ballotDid));

        attendee.votes[slug] = ballotDid;
        saveStore(store);
        res.json({ ok: true, ballotDid });
    } catch (err) {
        console.error('vote failed:', err);
        res.status(500).json({ error: String(err.message || err) });
    }
});

// ---- results -------------------------------------------------------------

app.get('/api/proposals', async (req, res) => {
    try {
        const store = loadStore();
        const org = await organizer();
        const proposals = [];
        for (const poll of store.polls) {
            const view = await run(org, k => k.viewPoll(poll.did));
            const tally = (view.results?.tally || []).map(t => ({
                vote: t.vote, option: t.option, count: t.count,
            }));
            proposals.push({
                slug: poll.slug,
                title: poll.title,
                description: poll.description,
                did: poll.did,
                deadline: view.deadline,
                revealed: !!poll.revealed,
                anchorDid: poll.anchorDid || null,
                ballotCount: view.results?.ballots?.length ?? null,
                tally,
            });
        }
        res.json({ proposals, attendeeCount: Object.keys(store.attendees).length });
    } catch (err) {
        console.error('proposals failed:', err);
        res.status(500).json({ error: String(err.message || err) });
    }
});

// ---- verification --------------------------------------------------------

app.get('/api/verify/:did', async (req, res) => {
    try {
        const node = await getNode();
        const doc = await node.resolveDID(req.params.did);
        res.json({ doc });
    } catch (err) {
        res.status(500).json({ error: String(err.message || err) });
    }
});

app.get('/api/qr', async (req, res) => {
    const url = `${req.protocol}://${req.get('host')}/join.html`;
    res.json({ url, dataUrl: await QRCode.toDataURL(url, { margin: 1, width: 360 }) });
});

// ---- admin ---------------------------------------------------------------

app.post('/api/admin/reveal', async (req, res) => {
    try {
        if (req.body?.token !== ADMIN_TOKEN) return res.status(403).json({ error: 'bad token' });
        const store = loadStore();
        const poll = store.polls.find(p => p.slug === req.body?.slug);
        if (!poll) return res.status(404).json({ error: 'unknown poll' });
        const org = await organizer();
        // A poll only becomes final at its deadline (or when every eligible voter
        // has voted). Closing early is an organizer decision: rewrite the poll
        // config with an already-expired deadline, then publish.
        const config = await run(org, k => k.getPoll(poll.did));
        if (config && new Date(config.deadline).getTime() > Date.now()) {
            config.deadline = new Date(Date.now() - 1000).toISOString();
            await run(org, k => k.addVaultItem(poll.did, 'poll', Buffer.from(JSON.stringify(config), 'utf-8')));
        }
        const ok = await run(org, k => k.publishPoll(poll.did, { reveal: true }));
        if (ok) {
            poll.revealed = true;
            saveStore(store);
        }

        // Anchor the final tally to Bitcoin: a signet asset DID committing to the
        // poll DID and its revealed results.
        if (ok && !poll.anchorDid) {
            const view = await run(org, k => k.viewPoll(poll.did));
            poll.anchorDid = await run(org, k => k.createAsset({
                consensusPulse: {
                    event: 'bitcoin++ Toronto 2026 (Consensus Edition)',
                    poll: poll.did,
                    title: poll.title,
                    revealedAt: new Date().toISOString(),
                    votes: view.results?.votes,
                    tally: view.results?.tally,
                },
            }, { registry: 'BTC:signet' }));
            saveStore(store);
        }
        res.json({ ok, anchorDid: poll.anchorDid });
    } catch (err) {
        res.status(500).json({ error: String(err.message || err) });
    }
});

// ---- startup -------------------------------------------------------------

seed().then(store => {
    app.listen(PORT, () => {
        console.log(`Consensus Pulse listening on http://localhost:${PORT}`);
        console.log(`polls: ${store.polls.map(p => p.slug).join(', ')}`);
    });
}).catch(err => {
    console.error('startup failed:', err);
    process.exit(1);
});
