#!/usr/bin/env node
/**
 * Runs TypeDoc over the package's published entry points and decides which of its warnings are
 * allowed to be warnings.
 *
 * TypeDoc has one severity switch for the whole of its validation, and the package is not in a
 * state where every switch can be fatal at once: a few thousand members carry no doc comment and
 * over a hundred referenced types are not exported. Those are real debts (issue #282). This script
 * counts them on every run and fails when either count rises above `DEBT_CEILING`, so the debt can
 * shrink but not grow. Any other TypeDoc warning fails the run outright.
 *
 * A broken `{@link}` is different. It renders as plain text, so the reader silently gets a dead
 * reference instead of a page, and nothing else in the pipeline notices -- the site's own
 * link check does not see inside generated markdown. Those fail the run.
 *
 * `KNOWN_BROKEN_LINKS` below is the exception list, and it is deliberately awkward: an entry that
 * stops matching also fails the run, so a fixed link cannot leave a stale exception behind.
 */

import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const typedocBin = resolve(packageRoot, "node_modules/.bin/typedoc");

/**
 * Broken links that exist today, each with the source fix that removes it.
 *
 * Add to this list only when the fix belongs to a file this package's documentation build does
 * not own, and always with the file and the correction. Delete an entry as soon as it is fixed;
 * a stale entry fails the run.
 * @type {{ match: string, fix: string }[]}
 */
const KNOWN_BROKEN_LINKS = [];

/**
 * The most undocumented declarations and unexported-type references the reference may hold.
 *
 * A run above either number fails: document the new member (or mark it `@internal`), or export the
 * type the public API names. A run below prints the lower number; lower the ceiling to it in the
 * same change, so the debt paid off cannot come back.
 */
const DEBT_CEILING = { undocumented: 4360, unexported: 136 };

/** Warning text that means a documentation link does not resolve to a page. */
const LINK_PATTERNS = [/Failed to resolve link to /, /links to ".*" which was resolved but is not included/];

/**
 * Runs TypeDoc, echoing its output, and returns every line it wrote.
 *
 * TypeDoc's output goes to a file, not a pipe. TypeDoc ends with `process.exit()`, and Node writes
 * to a pipe asynchronously, so through a pipe the tail of its output -- about a third of the
 * warnings on a full run -- is dropped unseen and the counts below come out short. Writes to a
 * file are synchronous and nothing is lost.
 * @returns {Promise<{ code: number, lines: string[] }>} TypeDoc's exit code and its output lines.
 */
async function runTypedoc() {
    const dir = await mkdtemp(join(tmpdir(), "build-api-docs-"));
    const logPath = join(dir, "typedoc.log");
    const log = openSync(logPath, "w");

    try {
        const code = await new Promise((resolvePromise, rejectPromise) => {
            const child = spawn(typedocBin, process.argv.slice(2), { cwd: packageRoot, stdio: ["ignore", log, log] });

            child.on("error", rejectPromise);
            child.on("close", (exitCode) => resolvePromise(exitCode ?? 0));
        });
        const output = await readFile(logPath, "utf8");

        process.stdout.write(output);

        return { code, lines: output.split("\n") };
    } finally {
        closeSync(log);
        await rm(dir, { recursive: true, force: true });
    }
}

/** The terminal escape sequences TypeDoc wraps its severity labels in. */
const ANSI = new RegExp(String.raw`${String.fromCharCode(27)}\[[0-9;]*m`, "g");

/**
 * Strips the ANSI colour codes TypeDoc writes around its severity labels.
 * @param {string} line One line of output.
 * @returns {string} The same line with escape sequences removed.
 */
function plain(line) {
    return line.replaceAll(ANSI, "");
}

const { code, lines } = await runTypedoc();

if (code !== 0) {
    process.stderr.write(`\ntypedoc exited with code ${code}\n`);
    process.exit(code);
}

const warnings = lines.map(plain).filter((line) => line.startsWith("[warning] "));
const undocumented = warnings.filter((line) => line.endsWith("does not have any documentation"));
const unexported = warnings.filter((line) => /is referenced by .* but not included in the documentation/.test(line));
const links = warnings.filter((line) => LINK_PATTERNS.some((pattern) => pattern.test(line)));
const other = warnings.filter(
    (line) =>
        !line.startsWith("[warning] Found ") &&
        !undocumented.includes(line) &&
        !unexported.includes(line) &&
        !links.includes(line),
);

const unexpected = links.filter((line) => !KNOWN_BROKEN_LINKS.some((known) => line.includes(known.match)));
const stale = KNOWN_BROKEN_LINKS.filter((known) => !links.some((line) => line.includes(known.match)));

process.stdout.write(
    `\nTypeDoc validation: ${String(links.length)} broken links ` +
        `(${String(KNOWN_BROKEN_LINKS.length)} known), ` +
        `${String(unexported.length)} references to unexported types, ` +
        `${String(undocumented.length)} undocumented declarations.\n`,
);

for (const line of unexpected) {
    process.stderr.write(`BROKEN LINK ${line.replace("[warning] ", "")}\n`);
}

for (const known of stale) {
    process.stderr.write(
        `STALE EXCEPTION no longer reported: ${known.match}\n` +
            "    Remove it from KNOWN_BROKEN_LINKS in scripts/build-api-docs.mjs.\n",
    );
}

for (const line of other) {
    process.stderr.write(`UNEXPECTED WARNING ${line.replace("[warning] ", "")}\n`);
}

/** @type {[keyof typeof DEBT_CEILING, string[]][]} */
const debts = [
    ["undocumented", undocumented],
    ["unexported", unexported],
];
let debtGrew = false;

for (const [name, found] of debts) {
    const ceiling = DEBT_CEILING[name];

    if (found.length > ceiling) {
        debtGrew = true;
        process.stderr.write(
            `TOO MANY ${name} declarations: ${String(found.length)}, the ceiling is ${String(ceiling)}. ` +
                "Document what this change added; the list is above.\n",
        );
    } else if (found.length < ceiling) {
        process.stdout.write(
            `Fewer ${name} declarations than the ceiling: lower DEBT_CEILING.${name} to ${String(found.length)} ` +
                "in scripts/build-api-docs.mjs.\n",
        );
    }
}

if (unexpected.length > 0 || stale.length > 0 || other.length > 0 || debtGrew) {
    process.stderr.write(
        "\nThe documentation build failed. Fix the warnings above, or record a broken link with its fix.\n",
    );
    process.exit(1);
}

for (const known of KNOWN_BROKEN_LINKS) {
    process.stdout.write(`Known broken link, fix pending: ${known.fix}\n`);
}
