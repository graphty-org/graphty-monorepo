#!/usr/bin/env node
/**
 * The self-update's protocol gate (design section 9.8), run from the NEW copy of githerd:
 * `node <new copy>/bin/githerd-protocol-test.mjs <previous copy>`, in the main checkout. It starts
 * this copy's daemon on a scratch state directory with no polling and asks it what the previous
 * copy's client asks. Prints one line; exit 0 when the previous client is served, 1 when not.
 */

import { startDaemon } from "../lib/daemon.mjs";
import { protocolCheck } from "../lib/self-update.mjs";

const previous = process.argv[2];
if (!previous) {
    console.error("usage: githerd-protocol-test.mjs <previous version directory>");
    process.exit(2);
}
try {
    const r = await protocolCheck({ root: process.cwd(), previous, env: process.env, startDaemon });
    console.log(r.detail);
    process.exit(r.ok ? 0 : 1);
} catch (err) {
    console.log(`protocol test failed: ${/** @type {Error} */ (err).message}`);
    process.exit(1);
}
