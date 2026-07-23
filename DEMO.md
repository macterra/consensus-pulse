# Consensus Pulse — demo script (~3 minutes)

## Before you go on stage

1. Stop the server, `rm -rf data/`, restart — fresh polls, empty tallies:
   ```bash
   ARCHON_PASSPHRASE=<passphrase> PORT=3210 \
     PATH=~/.nvm/versions/node/v22.15.1/bin:$PATH node server/index.js
   ```
2. Expose it publicly: `tailscale funnel --bg 3210` → https://hal.tail8f9c2.ts.net
   (use `--bg`; the foreground form stops serving when you close it). Confirm with
   `tailscale funnel status` and load the URL from your phone on cell data.
3. Open two browser windows: **dashboard** (`https://hal.tail8f9c2.ts.net/?admin=letsfork`,
   projector) and your **phone** for joining — audience phones use the public URL,
   no venue Wi-Fi dependency.
4. Optional insurance: pre-onboard 4–5 attendees and cast a few votes on the
   *other* polls beforehand, so tallies aren't all-zero if the room is shy. Leave
   one poll (CTV) untouched for the live vote.
5. Have a ballot DID from a test run in your clipboard in case resolution is
   slow live.

## The script

**[0:00 — the problem]** (dashboard on screen, tallies visible)
> "Quick show of hands: who thinks CTV has consensus? … Now, who would trust a
> Twitter poll about that? Right. We measure consensus about Bitcoin — the most
> verification-obsessed system on earth — with anonymous, sybil-ridden,
> unauditable polls. Consensus Pulse is a straw poll you can actually check."

**[0:30 — one credential, one vote]** (phone: scan the QR on the dashboard)
> "I scan the QR, pick a handle, and I get two things: a sovereign identity — a
> DID on the Archon registry — and a bitcoin++ Toronto attendee credential.
> The protocol enforces one ballot per credential holder. Full disclosure:
> today anyone who scans gets a credential — the sybil gate is the issuance
> policy, and in a real deployment you'd bind it to a badge scan. The rails
> don't change; the policy does."

*(While it creates: "this is minting a real DID on a public registry right now —
about ten seconds.")*

**[1:00 — the encrypted ballot]** (phone: vote Support on CTV)
> "I vote on CTV. What just happened is *not* a row in my database — my ballot
> is an encrypted object on the registry that only the organizer and I can
> open. Nobody watches the tally move and votes with the crowd — the dashboard
> only shows what's been tallied by the organizer, and individual votes stay
> sealed."

*(Audience beat: "everyone else — scan it now, vote while I talk." Dashboard
tallies tick up on the projector.)*

**[1:45 — the reveal ceremony]** (dashboard: click **Close & reveal**)
> "When the poll closes, two things happen. The results are published onto the
> poll itself — any voter can now read them straight off the registry, not off
> my server. And an anchor is minted on Bitcoin signet committing to this poll,
> this tally, this timestamp."

**[2:15 — don't trust, verify]** (click the ⚓ **verify** link)
> "Here's that anchor, resolved live: registry `BTC:signet`, confirmed, and the
> document commits to the poll DID and the exact tally. Voter, credential,
> ballot, result — every object in this system resolves like this. If I tamper
> with the dashboard, you can catch me."

**[2:45 — close]**
> "One credential, one DID, one verifiable ballot. This is a hackathon straw poll
> today — but it's also how you'd run a signal on mainnet, with self-custodied
> wallets, that anyone can audit in ten years. Consensus, measured like we
> measure everything else in Bitcoin: don't trust, verify."

## Q&A ammo

- **"Server holds the wallets — isn't that custodial?"** Yes, for onboarding
  speed today. The SDK already does challenge/response auth; self-custodied
  wallets are a UI task, not a protocol change.
- **"What stops one person registering twice?"** Today: nothing — issuance is
  open in this build, and we say so up front. The protocol enforces one ballot
  per credential holder per poll; making credentials scarce (badge scan or
  per-ticket claim codes — design TBD) is the deployment step that turns the
  gate real.
- **"Why signet, not mainnet?"** One env-var change (`BTC:mainnet` is live on
  the node). Signet keeps the demo free and fast.
- **"Can the organizer forge the tally?"** With reveal, ballots are in the open
  set — voters can check their own ballot is present and recount. Unrevealed,
  voters can verify their ballot exists on-registry.
