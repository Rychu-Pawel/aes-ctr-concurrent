import fs from "fs/promises";
import { ReadStream, WriteStream, constants as fsConsts } from "fs";
import { pipeline } from "stream/promises";

import test from "ava";

import mockFs from "mock-fs";

import { createCipher } from "../src/index.js"

import { loremIpsum, key, iv, loremIpsumEncryptedHex } from "../test/unit//utils/testsConsts.js";

test.serial(`Concurrent file encryption example`, async t => {
    // Arrange
    const chunkLengthInBytes = 20;

    mockFs({
        "plainTextFile": loremIpsum,
        "encryptedFile": ``,
    });

    // Act
    const encryptionPromises: Promise<void>[] = [];

    for (let nextChunkStartPosition = 0; nextChunkStartPosition < loremIpsum.length; nextChunkStartPosition += chunkLengthInBytes) {
        const encryptionPromise = encryptAsync(nextChunkStartPosition, chunkLengthInBytes);
        encryptionPromises.push(encryptionPromise);
    }

    await Promise.all(encryptionPromises);

    const valueEncryptedInChunksAsHex = await fs.readFile(`encryptedFile`, { encoding: `hex` });

    // Assert
    t.is(valueEncryptedInChunksAsHex, loremIpsumEncryptedHex);
});

async function encryptAsync(chunkStartPostionInBytes: number, chunkLengthInBytes: number): Promise<void> {
    let fileReadHandle: fs.FileHandle | undefined;
    let fileWriteHandle: fs.FileHandle | undefined;
    let fileReadStream: ReadStream | undefined;
    let fileWriteStream: WriteStream | undefined;

    try {
        fileReadHandle = await fs.open(`plainTextFile`, fsConsts.O_RDONLY);
        fileWriteHandle = await fs.open(`encryptedFile`, fsConsts.O_WRONLY);

        fileReadStream = fileReadHandle.createReadStream({
            start: chunkStartPostionInBytes,
            end: chunkStartPostionInBytes + chunkLengthInBytes - 1,
        });

        fileWriteStream = fileWriteHandle.createWriteStream({
            start: chunkStartPostionInBytes,
        });

        const chunkCipher = createCipher(key, iv, chunkStartPostionInBytes);

        await pipeline(fileReadStream, chunkCipher, fileWriteStream);
    }
    catch (error) {
        console.error(error);
    }
    finally {
        if (fileReadHandle)
            await fileReadHandle.close();
        if (fileWriteHandle)
            await fileWriteHandle.close();

        if (fileReadStream && !fileReadStream.destroyed)
            fileReadStream.destroy();
        if (fileWriteStream && !fileWriteStream.destroyed)
            fileWriteStream.destroy();
    }
}