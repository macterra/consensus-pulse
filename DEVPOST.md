# Consensus Pulse

**Measuring consensus about consensus — one badge, one DID, one verifiable ballot.**

## Inspiration

The defining argument at bitcoin++ Consensus Edition — and on bitcoin-dev, and on
X, every week — is *who actually supports which soft fork?* CTV? CSFS? Both?
Nothing? The measurement tools we use to answer that are Twitter polls and vibes:
anonymous, sybil-ridden, unauditable, and quietly editable by whoever runs the
poll. For a community obsessed with verification, we measure our own consensus
with the least verifiable instruments on the internet.

Consensus Pulse is a straw poll you can actually check.

## What it does

- **One badge, one vote.** Scanning the QR at the venue gives an attendee a
  sovereign identity (a `did:cid` DID) and a bitcoin++ Toronto attendee
  **verifiable credential**. Only credential holders can be registered as voters
  — that credential is the sybil gate.
- **Encrypted ballots.** Each vote on a proposal (BIP 119 / BIP 348 / both /
  status quo) is an **encrypted ballot DID**: readable by the poll organizer for
  tallying and by the voter themselves, sealed to everyone else until reveal. No
  bandwagon effects, no mid-poll dashboard-watching.
- **A reveal ceremony.** When the organizer closes a poll, results are published
  to the poll's on-registry vault — and a **results anchor is minted on
  `BTC:signet`**, a DID whose document commits to the poll, the tally, the
  participation count, and the timestamp.
- **Verify anything.** Every object in the system — voter identity, credential,
  poll, ballot, results anchor — is a DID that resolves from the public Archon
  registry. The verify page takes any of them and shows you the document, its
  registry, and its confirmation status. Don't trust the dashboard; resolve it.

## How we built it

Everything rides on [Archon](https://archon.technology) (MDIP): an Express
server uses the `@didcid/keymaster` SDK against a public Archon node
(Gatekeeper/Drawbridge), with the organizer's wallet issuing credentials and
owning the polls. Archon **polls are encrypted vaults**: adding a voter adds a
vault member key; a ballot is an encrypted JSON asset only the owner and voter
can open; publishing results writes them back into the vault for members;
`BTC:signet` is just another registry the anchor asset lands on. The front end
is dependency-free HTML/JS — live tallies, QR onboarding, an admin reveal
control, and the verify page.

For demo-speed onboarding, attendee wallets are hosted server-side with random
per-attendee passphrases. That's a stated tradeoff, not a design ceiling: Archon
supports challenge/response authentication (`create_challenge` /
`verify_response`), so self-custodied wallets slot in without changing the
model.

## Challenges we ran into

- **Runtime discipline.** The wallet crypto needs Node 22's WebCrypto; `npx`'s
  shebang silently resolved to an older Node and crashed key generation with an
  inscrutable `getRandomValues` error. Pinning the runtime everywhere fixed it.
- **Concurrency.** Wallet saves are read-modify-write on a file, and the node
  answers concurrent requests out of order. Every keymaster operation runs
  through a per-wallet promise queue.
- **Poll finality.** The protocol (correctly!) refuses to publish results before
  a poll is final — deadline passed or all eligible voters voted. Our "close &
  reveal" rewrites the poll's config vault item with an expired deadline first:
  an explicit, owner-only action that maps exactly to "the organizer closes the
  poll."

## Accomplishments we're proud of

The full loop is real, end to end, against a public registry: onboard → DID →
credential → encrypted ballot → tally → reveal → **confirmed signet anchor** —
with every artifact independently resolvable by anyone.

## What we learned

Verifiable-credential rails and Bitcoin rails compose cleanly when identity
objects are just DIDs on interchangeable registries. The poll-as-encrypted-vault
model gives you secret ballots and public results with zero custom cryptography.

## What's next

- Self-custodied voting from attendees' own Archon wallets (challenge/response
  is already in the SDK).
- `BTC:mainnet` anchors for polls that matter.
- Credential-weighted rosters (e.g. one poll for devs, one for miners, one for
  users — compare the pulses).
- Recurring pulses across bitcoin++ editions: a longitudinal, verifiable record
  of how developer consensus actually moves.

## Built with

Archon / MDIP (`@didcid/keymaster`, `@didcid/clients`, `@didcid/cipher`),
Node 22, Express, vanilla JS. Registries: `hyperswarm` + `BTC:signet`.
