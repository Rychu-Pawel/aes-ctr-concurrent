import crypto from "crypto";

import test from "ava";

import { createCipher, createDecipher } from "../src/index.js"

test.serial(`Concurrent file encryption example`, async t => {
    const key = crypto.randomBytes(32); // 32-byte key for AES-256
    const iv = crypto.randomBytes(16);  // 16-byte IV for AES-CTR

    const plaintext = Buffer.from('Hello, World!', 'utf-8');

    // Encrypt
    const cipher = createCipher(key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

    // Decrypt
    const decipher = createDecipher(key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    t.is(decrypted.toString('utf-8'), `Hello, World!`);
});