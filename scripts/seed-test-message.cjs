const nacl = require('./node_modules/tweetnacl');
const util = require('./node_modules/tweetnacl-util');

const publicKey = util.decodeBase64('C25bAjErqOG2+Hkezb7zxkIS7m6Rt4VE8F59V/vtFAM=');

const payload = JSON.stringify({
  version: 1,
  codeword: 'aeneas_ulysses',
  message: 'sum pius aeneas',
  clientTimestamp: new Date().toISOString()
});

const plaintext = util.encodeUTF8(payload);
const ephemeral = nacl.box.keyPair();
const nonce = nacl.randomBytes(nacl.box.nonceLength);
const boxed = nacl.box(plaintext, nonce, publicKey, ephemeral.secretKey);

const out = new Uint8Array(32 + 24 + boxed.length);
out.set(new Uint8Array(ephemeral.publicKey), 0);
out.set(new Uint8Array(nonce), 32);
out.set(new Uint8Array(boxed), 56);

console.log(util.encodeBase64(out));
