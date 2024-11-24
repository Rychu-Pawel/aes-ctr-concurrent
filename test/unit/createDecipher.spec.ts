import test, { ExecutionContext } from "ava";
import { createDecipher } from "../../src/index.js";
import { loremIpsum, key, iv, loremIpsumDividableBy16, loremIpsumDividableBy16EncryptedHex, loremIpsumEncryptedHex } from "./utils/testsConsts.js";

test.serial(`Make sure decrypted value is the same length as original value which is not a multiplication of 16`, async t => {
    // Arrange
    const cipherTextBuffer = Buffer.from(loremIpsumEncryptedHex, `hex`);

    // Act
    const decipher = createDecipher(key, iv);
    const decipherTextBuffer = Buffer.concat([decipher.update(cipherTextBuffer), decipher.final()]);

    // Assert
    t.is(decipherTextBuffer.length, cipherTextBuffer.length);
});

const decryptionComparisonMacro = test.macro(async (t: ExecutionContext<any>, chunkLengthInBytes: number, expectedPlainText: string, cipherTextHex: string) => {
    // Arrange
    const cipherTextBuffer = Buffer.from(cipherTextHex, `hex`);

    // Act
    const decryptionPromises: Promise<Buffer>[] = [];

    for (let nextChunkStartPosition = 0; nextChunkStartPosition < cipherTextBuffer.length; nextChunkStartPosition += chunkLengthInBytes) {
        const decryptionPromise = decryptAsync(nextChunkStartPosition, chunkLengthInBytes, cipherTextBuffer);
        decryptionPromises.push(decryptionPromise);
    }

    const promisesResult = await Promise.all(decryptionPromises);
    const plainTextDecryptedInChunks = Buffer.concat(promisesResult).toString(`utf8`);

    // Assert
    t.is(plainTextDecryptedInChunks, expectedPlainText);
});

function decryptAsync(chunkStartPostionInBytes: number, chunkLengthInBytes: number, cipherTextBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const cipherTextBufferChunk = cipherTextBuffer.subarray(chunkStartPostionInBytes, chunkStartPostionInBytes + chunkLengthInBytes);
            const chunkDecipher = createDecipher(key, iv, chunkStartPostionInBytes);
            const chunkPlainTextBuffer = Buffer.concat([chunkDecipher.update(cipherTextBufferChunk), chunkDecipher.final()]);
            resolve(chunkPlainTextBuffer);
        } catch (error) {
            reject(error);
        }
    });
}

test.serial(`Decrypted value is correct when decrypted as one batch and plainText is multiplication of 16.`, decryptionComparisonMacro, Number.MAX_SAFE_INTEGER, loremIpsumDividableBy16, loremIpsumDividableBy16EncryptedHex);
test.serial(`Decrypted value is correct when decrypted as one batch and plainText is NOT multiplication of 16.`, decryptionComparisonMacro, Number.MAX_SAFE_INTEGER, loremIpsum, loremIpsumEncryptedHex);
test.serial(`Decrypted value is correct when decrypted in simulated concurrent chunks. Chunks are multiplication of 16 and plainText is multiplication of 16.`, decryptionComparisonMacro, 32, loremIpsumDividableBy16, loremIpsumDividableBy16EncryptedHex);
test.serial(`Decrypted value is correct when decrypted in simulated concurrent chunks. Chunks are NOT multiplication of 16 and plainText is multiplication of 16.`, decryptionComparisonMacro, 30, loremIpsumDividableBy16, loremIpsumDividableBy16EncryptedHex);
test.serial(`Decrypted value is correct when decrypted in simulated concurrent chunks. Chunks are multiplication of 16 and plainText is NOT multiplication of 16.`, decryptionComparisonMacro, 32, loremIpsum, loremIpsumEncryptedHex);
test.serial(`Decrypted value is correct when decrypted in simulated concurrent chunks. Chunks are NOT multiplication of 16 and plainText is NOT multiplication of 16.`, decryptionComparisonMacro, 30, loremIpsum, loremIpsumEncryptedHex);