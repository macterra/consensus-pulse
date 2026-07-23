import { getKeymaster, run } from './archon.js';
import { loadStore, saveStore, ORGANIZER_WALLET } from './store.js';

const PASSPHRASE = process.env.ARCHON_PASSPHRASE;
if (!PASSPHRASE) {
    console.error('ARCHON_PASSPHRASE is required');
    process.exit(1);
}

export const DEADLINE = process.env.POLL_DEADLINE || '2026-07-25T23:59:00Z';

export const ATTENDEE_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
        event: { type: 'string' },
        role: { type: 'string' },
    },
    required: ['event'],
};

export const PROPOSALS = [
    {
        slug: 'ctv',
        title: 'OP_CHECKTEMPLATEVERIFY (BIP 119)',
        description: 'Activate CTV: covenants via committed transaction templates.',
    },
    {
        slug: 'csfs',
        title: 'OP_CHECKSIGFROMSTACK (BIP 348)',
        description: 'Activate CSFS: signature verification over arbitrary stack messages.',
    },
    {
        slug: 'ctv-csfs',
        title: 'CTV + CSFS together',
        description: 'Activate BIP 119 and BIP 348 as a joint soft fork.',
    },
    {
        slug: 'status-quo',
        title: 'No consensus changes for now',
        description: 'Bitcoin should not soft fork until there is much stronger consensus.',
    },
];

export const VOTE_OPTIONS = ['Support', 'Oppose', 'Need more research'];

export async function seed() {
    const km = await getKeymaster(ORGANIZER_WALLET, PASSPHRASE);
    const store = loadStore();

    const current = await run(km, k => k.getCurrentId());
    console.log('organizer id:', current);

    if (!store.schemaDid) {
        store.schemaDid = await run(km, k => k.createSchema(ATTENDEE_SCHEMA, { name: 'btcpp-toronto-2026-attendee' }));
        saveStore(store);
        console.log('schema:', store.schemaDid);
    }

    for (const proposal of PROPOSALS) {
        if (store.polls.find(p => p.slug === proposal.slug)) continue;
        const did = await run(km, k => k.createPoll({
            version: 2,
            name: `btcpp-${proposal.slug}`,
            description: `${proposal.title} — ${proposal.description}`,
            options: VOTE_OPTIONS,
            deadline: DEADLINE,
        }));
        store.polls.push({ ...proposal, did });
        saveStore(store);
        console.log('poll:', proposal.slug, did);
    }

    return store;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    seed().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}
