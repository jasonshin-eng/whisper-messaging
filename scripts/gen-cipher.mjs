import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

const pub = Uint8Array.from(util.decodeBase64('C25bAjErqOG2+Hkezb7zxkIS7m6Rt4VE8F59V/vtFAM='));
const pt  = Uint8Array.from(util.encodeUTF8(JSON.stringify({
  version: 1,
  codeword: 'aeneas_ulysses',
  message: 'sum pius aeneas',
  clientTimestamp: new Date().toISOString()
})));

const eph   = nacl.box.keyPair();
const nonce = Uint8Array.from(nacl.randomBytes(24));
const box   = nacl.box(pt, nonce, pub, eph.secretKey);

const out = new Uint8Array(32 + 24 + box.length);
out.set(eph.publicKey, 0);
out.set(nonce, 32);
out.set(box, 56);

console.log(util.encodeBase64(out));
