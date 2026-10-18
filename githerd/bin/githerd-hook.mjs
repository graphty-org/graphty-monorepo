#!/usr/bin/env node
/**
 * The hook command the project settings register (design section 4.10): `githerd-hook.mjs <event>`
 * with Claude Code's JSON on standard input. It always exits 0, so a broken githerd never blocks a
 * session.
 */

import { text } from "node:stream/consumers";

import { runHook } from "../lib/hook.mjs";

try {
    const out = await runHook(process.argv[2] ?? "", await text(process.stdin), {
        cwd: process.cwd(),
        env: process.env,
    });
    if (out !== null) process.stdout.write(`${out}\n`);
} catch (err) {
    process.stdout.write(`githerd: hook failed: ${/** @type {Error} */ (err).message}\n`);
}
process.exit(0);
