import test, { ExecutionContext } from "ava";
import { createCipher } from "../../src/index.js";
import { loremIpsum, key, iv, loremIpsumDividableBy16, loremIpsumDividableBy16EncryptedHex, loremIpsumEncryptedHex } from "./utils/testsConsts.js";

test.serial(`Make sure encrypted value is the same length as original value which is not a multiplication of 16`, async t => {
    // Arrange
    const plainText = loremIpsum;

    // Act
    const cipher = createCipher(key, iv);
    const cipherTextBuffer = Buffer.concat([cipher.update(plainText, `utf8`), cipher.final()]);

    // Assert
    t.is(cipherTextBuffer.length, plainText.length);
});

const encryptionComparisonMacro = test.macro(async (t: ExecutionContext<any>, chunkLengthInBytes: number, plainText: string, expectedCipherTextHex: string) => {
    // Act
    const encryptionPromises: Promise<Buffer>[] = [];

    for (let nextChunkStartPosition = 0; nextChunkStartPosition < plainText.length; nextChunkStartPosition += chunkLengthInBytes) {
        const encryptionPromise = encryptAsync(nextChunkStartPosition, chunkLengthInBytes, plainText);
        encryptionPromises.push(encryptionPromise);
    }

    const promisesResult = await Promise.all(encryptionPromises);
    const valueEncryptedInChunksAsHex = Buffer.concat(promisesResult).toString(`hex`);

    // Assert
    t.is(valueEncryptedInChunksAsHex, expectedCipherTextHex);
});

function encryptAsync(chunkStartPostionInBytes: number, chunkLengthInBytes: number, plainText: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const plainTextChunk = plainText.substring(chunkStartPostionInBytes, chunkStartPostionInBytes + chunkLengthInBytes);
            const chunkCipher = createCipher(key, iv, chunkStartPostionInBytes);
            const chunkCipherTextBuffer = Buffer.concat([chunkCipher.update(plainTextChunk, `utf8`), chunkCipher.final()]);
            resolve(chunkCipherTextBuffer);
        } catch (error) {
            reject(error);
        }
    });
}

test.serial(`Encrypted value is correct when encrypted as one batch and plainText is multiplication of 16.`, encryptionComparisonMacro, Number.MAX_SAFE_INTEGER, loremIpsumDividableBy16, loremIpsumDividableBy16EncryptedHex);
test.serial(`Encrypted value is correct when encrypted as one batch and plainText is NOT multiplication of 16.`, encryptionComparisonMacro, Number.MAX_SAFE_INTEGER, loremIpsum, loremIpsumEncryptedHex);
test.serial(`Encrypted value is correct when encrypted in simulated concurrent chunks. Chunks are multiplication of 16 and plainText is multiplication of 16.`, encryptionComparisonMacro, 32, loremIpsumDividableBy16, loremIpsumDividableBy16EncryptedHex);
test.serial(`Encrypted value is correct when encrypted in simulated concurrent chunks. Chunks are NOT multiplication of 16 and plainText is multiplication of 16.`, encryptionComparisonMacro, 30, loremIpsumDividableBy16, loremIpsumDividableBy16EncryptedHex);
test.serial(`Encrypted value is correct when encrypted in simulated concurrent chunks. Chunks are multiplication of 16 and plainText is NOT multiplication of 16.`, encryptionComparisonMacro, 32, loremIpsum, loremIpsumEncryptedHex);
test.serial(`Encrypted value is correct when encrypted in simulated concurrent chunks. Chunks are NOT multiplication of 16 and plainText is NOT multiplication of 16.`, encryptionComparisonMacro, 30, loremIpsum, loremIpsumEncryptedHex);