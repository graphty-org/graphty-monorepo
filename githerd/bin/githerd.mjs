#!/usr/bin/env node
/**
 * The githerd command line. `githerd version` prints the version and, for a copy archived from
 * the default branch, its code hash.
 */

import { readVersion } from "../lib/version.mjs";

const [command] = process.argv.slice(2);

if (command === "version" || command === "--version") {
    const { version, codeHash } = readVersion();
    console.log(codeHash ? `${version} ${codeHash}` : version);
} else {
    console.error("usage: githerd version");
    process.exit(2);
}
