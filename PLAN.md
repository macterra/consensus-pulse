# Consensus Pulse — bitcoin++ Toronto (Consensus Edition) hackathon

**Pitch:** Measure consensus about consensus. Sybil-resistant, verifiable straw polls
on soft-fork proposals (CTV, CSFS, LNhance, ...) — one conference badge → one DID +
attendee credential → one auditable ballot, with publish/reveal tallies anchored to
Bitcoin via Archon registries.

## Architecture

- **Front end:** Vite + React. Pages: QR onboarding, proposals + live tallies,
  reveal ceremony, `/verify` (resolve any poll/ballot DID, show signet anchor).
- **API:** Express on Node 22.15.x using `@didcid/keymaster` directly (same lib the
  MCP server wraps). Organizer identity: existing `david` wallet
  (`/home/david/dev/btcpp/wallet.json`).
- **Attendee wallets:** hosted per-attendee wallets for demo-speed onboarding;
  self-custodial path via `create_challenge` / `create_response` / `verify_response`
  for attendees running their own Archon wallet.
- **Node:** archon.technology (Gatekeeper/Drawbridge). Registries: hyperswarm for
  speed, `BTC:signet` for anchoring.

## Flow

1. Onboard: QR scan → server creates attendee DID.
2. Credential: `create_schema` (btcpp-toronto-2026-attendee) → `bind_credential` →
   `issue_credential` → `accept_credential`. One per badge = sybil gate.
3. Polls: `create_poll_template` → `create_poll` per proposal; credential holders
   added via `add_poll_voter`; votes via `vote_poll` / `send_ballot`.
4. Reveal: `publish_poll` → `reveal_poll` on stage; ballots resolvable as DIDs.
5. Anchor: poll + result DIDs on `BTC:signet` (anchor early; block-paced).

## Build phases

1. Scaffold (2h): Express + keymaster wired to wallet/node; Vite app; e2e DID create.
2. Identity + credentials (4h): QR onboarding, schema, issue/accept, admin panel.
3. Polls (4h): 3–4 proposal polls, voting UI, credential-gated registration.
4. Reveal + verify (3h): live tallies, reveal button, `/verify` resolver page.
5. Polish (3h): demo script, Devpost writeup, 2-min video.

## Risks / lessons already learned

- Node 22.15.x everywhere (npx shebang falls back to Node 18 → WebCrypto crash).
- Archon server answers concurrent requests out of order — await mutations before
  verifying; never batch a mutation with its own check.
- Signet anchoring is block-paced — don't anchor live on stage.
- Hosted wallets are a stated demo tradeoff; self-custody path exists via
  challenge/response.
