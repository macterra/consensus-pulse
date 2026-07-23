# Consensus Pulse

**Measuring consensus about consensus** — sybil-resistant, verifiable straw polls on
Bitcoin soft-fork proposals. Built on [Archon](https://archon.technology) DIDs for the
bitcoin++ Toronto 2026 (Consensus Edition) hackathon.

One badge → one DID + attendee credential → one encrypted, auditable ballot.
Results are revealed in an organizer ceremony and anchored to `BTC:signet`.

- [DEVPOST.md](DEVPOST.md) — full project writeup (what/why/how)
- [DEMO.md](DEMO.md) — 3-minute stage script
- [PLAN.md](PLAN.md) — original hackathon plan

## Run it

Requires Node 22.15.x (the wallet crypto needs modern WebCrypto — older Node fails
with a `getRandomValues` error).

```bash
npm install
ARCHON_PASSPHRASE=<your-wallet-passphrase> PORT=3210 npm start
```

On first start the server creates/uses the organizer wallet (`./wallet.json`), then
seeds the attendee credential schema and four polls (CTV, CSFS, CTV+CSFS, status-quo)
on the Archon registry. State lives in `data/` — wipe it to reseed fresh polls.

- Dashboard + live tallies: `http://localhost:3210/`
- Admin controls (close & reveal + signet anchor): `http://localhost:3210/?admin=<ADMIN_TOKEN>` (default `letsfork`)
- Join & vote: `/join.html` · Resolve any DID: `/verify.html`

### Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `ARCHON_PASSPHRASE` | — (required) | Organizer wallet passphrase |
| `ARCHON_NODE_URL` | `https://archon.technology` | Archon node |
| `ARCHON_WALLET_PATH` | `./wallet.json` | Organizer wallet |
| `ARCHON_DEFAULT_REGISTRY` | `hyperswarm` | Registry for DIDs/ballots |
| `POLL_DEADLINE` | `2026-07-25T23:59:00Z` | Poll deadline (before first seed) |
| `ADMIN_TOKEN` | `letsfork` | Reveal-ceremony token |
| `PORT` | `3000` | HTTP port |
