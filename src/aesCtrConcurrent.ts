import crypto from "crypto";

import AesCtrConcurrentError from "./errors/aesCtrConcurrentError.js";

const aesBlockSizeInBytes = BigInt(16);
const IV_MAX = BigInt(`0xffffffffffffffffffffffffffffffff`);
const IV_OVERFLOW_MODULO = IV_MAX + 1n;

export function createCipher(key: Buffer, iv: Buffer, startPositionInBytes: number = 0): crypto.Cipher {
    return getCrypotStream(`cipher`, key, iv, startPositionInBytes);
}

export function createDecipher(key: Buffer, iv: Buffer, startPositionInBytes: number = 0): crypto.Cipher {
    return getCrypotStream(`decipher`, key, iv, startPositionInBytes);
}

function getCrypotStream(cipherOrDecipher: `cipher` | `decipher`, key: Buffer, iv: Buffer, startPositionInBytes: number): crypto.Cipher
function getCrypotStream(cipherOrDecipher: `cipher` | `decipher`, key: Buffer, iv: Buffer, startPositionInBytes: bigint): crypto.Cipher
function getCrypotStream(cipherOrDecipher: `cipher` | `decipher`, key: Buffer, iv: Buffer, startPositionInBytesNumberOrBigInt: number | bigint): crypto.Cipher {
    const startPositionInBytes = BigInt(startPositionInBytesNumberOrBigInt);

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
    if (iv.length !== 16)
        throw new AesCtrConcurrentError(`IV is required to be 16 bytes long`);
    if (key.length !== 32)
        throw new AesCtrConcurrentError(`Key is required to be 32 bytes long`);
    if (startPositionInBytes < 0)
        throw new AesCtrConcurrentError(`Start position must be greater or equal to 0`);
}

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