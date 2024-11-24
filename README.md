# aes-ctr-concurrent

**Native TypeScript Node.js library for AES-256-CTR, enabling concurrent encryption/decryption with precise IV offset handling down to any byte level, not just full blocks.**

## Features

- Native implementation in TypeScript for Node.js
- Utilizes native NodeJS's AES-256-CTR encryption and decryption (this library is just a wrapper for `crypto` module)
- Concurrent operations with precise IV byte-offset handling
- Promise-based API for modern asynchronous workflows
- Flexible IV offset, allowing adjustments at any byte level

## Installation

```bash
npm install aes-ctr-concurrent
```

## Usage

### Importing the Library

```typescript
import { createCipher, createDecipher } from 'aes-ctr-concurrent';
```

### Simple Encryption and Decryption

Here's a basic example of encrypting and decrypting data using the library (also see [`examples/simpleEncryptionAndDecryption.spec.ts`](https://github.com/Rychu-Pawel/aes-ctr-concurrent/blob/master/examples/simpleEncryptionAndDecryption.spec.ts)):

```typescript
import crypto from 'crypto';
import { createCipher, createDecipher } from 'aes-ctr-concurrent';

const key = crypto.randomBytes(32); // 32-byte key for AES-256
const iv = crypto.randomBytes(16);  // 16-byte IV for AES-CTR

const plaintext = Buffer.from('Hello, World!', 'utf-8');

// Encrypt
const cipher = createCipher(key, iv);
const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

// Decrypt
const decipher = createDecipher(key, iv);
const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

console.log(decrypted.toString('utf-8')); // Outputs: Hello, World!
```

### Advanced Example: Concurrent File Encryption with Streams

This example demonstrates how to encrypt a file concurrently by processing it in chunks and adjusting the IV offset precisely for each chunk. This allows for parallel processing of large files. You can also see [`examples/concurrentFileEncryption.spec.ts`](https://github.com/Rychu-Pawel/aes-ctr-concurrent/blob/master/examples/concurrentFileEncryption.spec.ts).

## Setup

Ensure you have a file named `plainTextFile` that you want to encrypt and empty `encryptedFile` to which ecrypted data will be written.

```typescript
import fs from 'fs/promises';
import crypto from 'crypto';
import { ReadStream, WriteStream, constants as fsConsts } from 'fs';
import { pipeline } from 'stream/promises';
import { createCipher } from 'aes-ctr-concurrent';

const key = crypto.randomBytes(32); // Your 32-byte encryption key
const iv = crypto.randomBytes(16);  // Your 16-byte initialization vector
const chunkLengthInBytes = 64 * 1024; // 64 KB chunks

async function encryptFileConcurrently() {
  const fileStats = await fs.stat('plainTextFile');
  const totalSize = fileStats.size;

  const encryptionPromises: Promise<void>[] = [];

  for (let offset = 0; offset < totalSize; offset += chunkLengthInBytes) {
    const encryptionPromise = encryptChunk(offset, chunkLengthInBytes);
    encryptionPromises.push(encryptionPromise);
  }

  await Promise.all(encryptionPromises);
  console.log('File encrypted successfully.');
}

async function encryptChunk(chunkStartPosition: number, chunkLength: number): Promise<void> {
  let fileReadHandle: fs.FileHandle | undefined;
  let fileWriteHandle: fs.FileHandle | undefined;
  let fileReadStream: ReadStream | undefined;
  let fileWriteStream: WriteStream | undefined;

  try {
    fileReadHandle = await fs.open('plainTextFile', fsConsts.O_RDONLY);
    fileWriteHandle = await fs.open('encryptedFile', fsConsts.O_WRONLY | fsConsts.O_CREAT);

    fileReadStream = fileReadHandle.createReadStream({
      start: chunkStartPosition,
      end: chunkStartPosition + chunkLength - 1,
    });

    fileWriteStream = fileWriteHandle.createWriteStream({
      start: chunkStartPosition,
    });

    const cipher = createCipher(key, iv, chunkStartPosition);

    await pipeline(fileReadStream, cipher, fileWriteStream);
  } catch (error) {
    console.error('Error encrypting chunk:', error);
  } finally {
    if (fileReadHandle) await fileReadHandle.close();
    if (fileWriteHandle) await fileWriteHandle.close();
    if (fileReadStream && !fileReadStream.destroyed) fileReadStream.destroy();
    if (fileWriteStream && !fileWriteStream.destroyed) fileWriteStream.destroy();
  }
}

encryptFileConcurrently();
```

## API Reference

### `createCipher(key: Buffer, iv: Buffer, startPositionInBytes?: number | bigint): crypto.Cipher`

Creates a crypto.Cipher instance for AES-256-CTR encryption.

* **Parameters:**
  * `key` (Buffer): A 32-byte encryption key.
  * `iv` (Buffer): A 16-byte initialization vector.
  * `startPositionInBytes` (number | bigint, optional): Start position in bytes for the encryption process. Defaults to `0n`.
* **Returns:** `crypto.Cipher` instance.
* **Throws:** `AesCtrConcurrentError` if parameters are invalid.

### `createDecipher(key: Buffer, iv: Buffer, startPositionInBytes?: number | bigint): crypto.Decipher`

Creates a crypto.Decipher instance for AES-256-CTR decryption.

* **Parameters:**
  * `key` (Buffer): A 32-byte encryption key.
  * `iv` (Buffer): A 16-byte initialization vector.
  * `startPositionInBytes` (number | bigint, optional): Start position in bytes for the decryption process. Defaults to `0n`.
* **Returns:** `crypto.Decipher` instance.
* **Throws:** `AesCtrConcurrentError` if parameters are invalid.

### Exceptions

#### `AesCtrConcurrentError`

Custom error class for handling exceptions within the library.

## Additional Information

### Why Use `aes-ctr-concurrent`?

Standard AES-CTR encryption increments the IV (Initialization Vector) automatically for each block of data (typically 16 bytes). However, when processing large files or data streams, it can be beneficial to encrypt/decrypt different parts of the data concurrently. This library allows you to:
* Precisely Control IV Offsets: Adjust the IV to start encryption/decryption at any byte position, not just on block boundaries.
* Enhance Performance: Process data in parallel, improving performance for large files.
* Maintain Security: Ensures that the encryption remains secure by correctly handling IV adjustments.

### How It Works

The library calculates the necessary IV adjustments based on the startPositionInBytes parameter. It:
* Calculates how many full AES blocks are encompassed by the start position.
* Increments the IV by the number of full blocks.
* Adjusts the cipher stream to discard any bytes within the current block that precede the start position.

## Acknowledgements

* This library builds upon Node.js's native `crypto` module, extending its capabilities to support concurrent operations with precise IV management.