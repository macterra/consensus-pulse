import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = path.join(ROOT, 'data');
export const WALLETS_DIR = path.join(DATA_DIR, 'wallets');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

export const ORGANIZER_WALLET = process.env.ARCHON_WALLET_PATH
    ? path.resolve(ROOT, process.env.ARCHON_WALLET_PATH)
    : path.join(ROOT, 'wallet.json');

fs.mkdirSync(WALLETS_DIR, { recursive: true });

// store.json: { schemaDid, polls: [{slug, title, description, did}], attendees: {name: {did, walletFile, passphrase, credentialDid, votes: {slug: ballotDid}}} }
export function loadStore() {
    if (!fs.existsSync(STORE_FILE)) {
        return { schemaDid: null, polls: [], attendees: {} };
    }
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
}

export function saveStore(store) {
    const tmp = STORE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
    fs.renameSync(tmp, STORE_FILE);
}
