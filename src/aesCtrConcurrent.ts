import crypto from "crypto";

import AesCtrConcurrentError from "./errors/aesCtrConcurrentError.js";

const aesBlockSizeInBytes = 16n;
const IV_MAX = 0xffffffffffffffffffffffffffffffffn;
const IV_OVERFLOW_MODULO = IV_MAX + 1n;

/**
 * Creates a `crypto.Cipher` instance using the AES-256-CTR algorithm for encrypting data.
 *
 * @param {Buffer} key - a 32-byte encryption key.
 * @param {Buffer} iv - a 16-byte initialization vector (IV).
 * @param {number | bigint} [startPositionInBytes=0n] - optional start position in bytes for the encryption process.
 * This allows you to set the encryption position precisely, even within a block.
 * @returns {crypto.Cipher} A `Cipher` object ready to encrypt data.
 * @throws {AesCtrConcurrentError} Throws an error if any of the parameters are invalid.
 */
export function createCipher(key: Buffer, iv: Buffer, startPositionInBytes?: number): crypto.Cipher
export function createCipher(key: Buffer, iv: Buffer, startPositionInBytes?: bigint): crypto.Cipher
export function createCipher(key: Buffer, iv: Buffer, startPositionInBytesNumberOrBigInt: number | bigint = 0n): crypto.Cipher {
    const startPositionInBytes = BigInt(startPositionInBytesNumberOrBigInt);

    return getCryptoStream(`cipher`, key, iv, startPositionInBytes);
}

/**
 * Creates a `crypto.Decipher` instance using the AES-256-CTR algorithm for decrypting data.
 *
 * @param {Buffer} key - a 32-byte decryption key.
 * @param {Buffer} iv - a 16-byte initialization vector (IV).
 * @param {number | bigint} [startPositionInBytes=0n] - optional start position in bytes for the decryption process.
 * This allows you to set the decryption position precisely, even within a block.
 * @returns {crypto.Decipher} A `Decipher` object ready to decrypt data.
 * @throws {AesCtrConcurrentError} Throws an error if any of the parameters are invalid.
 */
export function createDecipher(key: Buffer, iv: Buffer, startPositionInBytes?: number): crypto.Cipher
export function createDecipher(key: Buffer, iv: Buffer, startPositionInBytes?: bigint): crypto.Cipher
export function createDecipher(key: Buffer, iv: Buffer, startPositionInBytesNumberOrBigInt: number | bigint = 0n): crypto.Cipher {
    const startPositionInBytes = BigInt(startPositionInBytesNumberOrBigInt);

    return getCryptoStream(`decipher`, key, iv, startPositionInBytes);
}

function getCryptoStream(cipherOrDecipher: `cipher` | `decipher`, key: Buffer, iv: Buffer, startPositionInBytes: bigint): crypto.Cipher {
    throwIfParametersAreInvalid(iv, key, startPositionInBytes);

    const fullAesBlocksIncrement = startPositionInBytes / aesBlockSizeInBytes;
    const incrementedIv = incrementIvByFullBlocks(iv, fullAesBlocksIncrement);

    const cipher = cipherOrDecipher === `cipher`
        ? crypto.createCipheriv(`aes-256-ctr`, key, incrementedIv)
        : crypto.createDecipheriv(`aes-256-ctr`, key, incrementedIv);

    moveCounterToCurrentStartPositionWithinCurrentBlock(cipher, startPositionInBytes);

    return cipher;
}

function throwIfParametersAreInvalid(iv: Buffer, key: Buffer, startPositionInBytes: bigint) {
    if (!Buffer.isBuffer(iv) || iv.length !== 16)
        throw new AesCtrConcurrentError(`IV is required to be 16 bytes long Buffer`);
    if (!Buffer.isBuffer(key) || key.length !== 32)
        throw new AesCtrConcurrentError(`Key is required to be 32 bytes long Buffer`);
    if (startPositionInBytes < 0n)
        throw new AesCtrConcurrentError(`Start position must be greater or equal to 0`);
}

// This method is exported only for test purpose
export function incrementIvByFullBlocks(originalIv: Buffer, fullBlocksToIncrement: bigint): Buffer {
    let ivBigInt = bufferToBigInt(originalIv);

    ivBigInt += fullBlocksToIncrement;

    if (ivBigInt > IV_MAX)
        ivBigInt %= IV_OVERFLOW_MODULO;

    return bigIntToBuffer(ivBigInt);
}

function bufferToBigInt(buffer: Buffer): bigint {
    const hexedBuffer = buffer.toString(`hex`);
    return BigInt(`0x${hexedBuffer}`);
}

function bigIntToBuffer(bigInt: bigint): Buffer {
    const hexedBigInt = bigInt.toString(16).padStart(32, `0`);
    return Buffer.from(hexedBigInt, `hex`);
}

function moveCounterToCurrentStartPositionWithinCurrentBlock(cipher: crypto.Cipher, startPositionInBytes: bigint) {
    const currentBlockOffset = Number(startPositionInBytes % aesBlockSizeInBytes);

    if (currentBlockOffset === 0)
        return;

    const bytesToBeDiscarded = Buffer.alloc(currentBlockOffset);

    cipher.update(bytesToBeDiscarded);
}