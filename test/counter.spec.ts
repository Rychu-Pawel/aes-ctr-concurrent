import test from "ava";

import sanityCheck from "../src/index.js";

test.serial(`Sanity check`, async t => {
    t.is(sanityCheck(), `test`);
});