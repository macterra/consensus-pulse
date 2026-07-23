import path from 'path';
import CipherNode from '@didcid/cipher/node';
import DrawbridgeClient from '@didcid/clients/drawbridge';
import Keymaster from '@didcid/keymaster';
import WalletJson from '@didcid/keymaster/wallet/json';

export const NODE_URL = process.env.ARCHON_NODE_URL || 'https://archon.technology';
export const REGISTRY = process.env.ARCHON_DEFAULT_REGISTRY || 'hyperswarm';

let nodePromise = null;

export function getNode() {
    if (!nodePromise) {
        const node = new DrawbridgeClient();
        nodePromise = node.connect({ url: NODE_URL }).then(() => node);
    }
    return nodePromise;
}

// The Archon node answers concurrent requests out of order, and Keymaster
// wallet saves are read-modify-write on a single file, so every operation on a
// given wallet must be serialized. Each keymaster gets a promise chain; run()
// appends to it.
const queues = new WeakMap();

export function run(keymaster, fn) {
    const prev = queues.get(keymaster) || Promise.resolve();
    const next = prev.catch(() => {}).then(() => fn(keymaster));
    queues.set(keymaster, next);
    return next;
}

const keymasters = new Map();

export async function getKeymaster(walletPath, passphrase) {
    const key = path.resolve(walletPath);
    if (!keymasters.has(key)) {
        const node = await getNode();
        const wallet = new WalletJson(path.basename(key), path.dirname(key));
        const keymaster = new Keymaster({
            gatekeeper: node,
            wallet,
            cipher: new CipherNode(),
            defaultRegistry: REGISTRY,
            passphrase,
        });
        keymasters.set(key, keymaster);
    }
    return keymasters.get(key);
}
