import test from "ava";

import { incrementIvByFullBlocks } from "../../src/aesCtrConcurrent.js";

test(`Increment by 1`, t => {
    // Arrange
    let originalIV = Buffer.alloc(16, 0);
    const increment = 1n;

    const expectedIV = Buffer.from(`00000000000000000000000000000001`, `hex`);

    // Act
    originalIV = incrementIvByFullBlocks(originalIV, increment);

    // Assert
    t.is(originalIV.toString(`hex`), expectedIV.toString(`hex`));
});

test(`Incrementation causing transfer between segments `, t => {
    // Arrange
    let originalIV = Buffer.from(`00000000FFFFFFFFFFFFFFFFFFFFFFFF`, `hex`);
    const increment = 1n;

    const expectedIV = Buffer.from(`00000001000000000000000000000000`, `hex`);

    // Act
    originalIV = incrementIvByFullBlocks(originalIV, increment);

    // Assert
    t.is(originalIV.toString(`hex`), expectedIV.toString(`hex`));
});

test(`Increment by MAX_UINT32`, t => {
    // Arrange
    let originalIV = Buffer.alloc(16, 0);
    const increment = 0xFFFFFFFFn;

    const expectedIV = Buffer.from(`000000000000000000000000FFFFFFFF`, `hex`);

    // Act
    originalIV = incrementIvByFullBlocks(originalIV, increment);

    // Assert
    t.is(originalIV.toString(`hex`), expectedIV.toString(`hex`));
});

test(`Increment over 64 bits`, t => {
    // Arrange
    let originalIV = Buffer.alloc(16, 0);
    const increment = 0x100_000_000n; // 2^32

    const expectedIV = Buffer.from(`00000000000000000000000100000000`, `hex`);

    // Act
    originalIV = incrementIvByFullBlocks(originalIV, increment);

    // Assert
    t.is(originalIV.toString(`hex`), expectedIV.toString(`hex`));
});

test(`Increment by a big value`, t => {
    // Arrange
    let originalIV = Buffer.alloc(16, 0);
    const increment = 0x1FFFFFFFFn; // 2^33 - 1

    const expectedIV = Buffer.from(`000000000000000000000001FFFFFFFF`, `hex`);

    // Act
    originalIV = incrementIvByFullBlocks(originalIV, increment);

    // Assert
    t.is(originalIV.toString(`hex`), expectedIV.toString(`hex`));
});

test(`Increment causing overflow of entire IV`, t => {
    let originalIV = Buffer.from(`ffffffffffffffffffffffffffffffff`, `hex`);
    const increment = 3n;

    const expectedIV = Buffer.from(`00000000000000000000000000000002`, `hex`);

    originalIV = incrementIvByFullBlocks(originalIV, increment);

    t.is(originalIV.toString(`hex`), expectedIV.toString(`hex`));
});

test(`Increment by maximum possible value`, t => {
    let originalIV = Buffer.alloc(16, 0);
    const increment = 0xffffffffffffffffffffffffffffffffn; // 2^128 - 1

    const expectedIV = Buffer.from(`ffffffffffffffffffffffffffffffff`, `hex`);

    originalIV = incrementIvByFullBlocks(originalIV, increment);

    t.is(originalIV.toString(`hex`), expectedIV.toString(`hex`));
});