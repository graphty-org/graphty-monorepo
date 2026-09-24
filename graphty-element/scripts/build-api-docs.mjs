#!/usr/bin/env node
/**
 * Runs TypeDoc over the package's published entry points and decides which of its warnings are
 * allowed to be warnings.
 *
 * TypeDoc has one severity switch for the whole of its validation, and the package is not in a
 * state where every switch can be fatal at once: several hundred properties carry no doc comment
 * and a few dozen referenced types are not exported. Those are real debts and this script counts
 * them on every run so that they are visible, but they do not stop a build.
 *
 * A broken `{@link}` is different. It renders as plain text, so the reader silently gets a dead
 * reference instead of a page, and nothing else in the pipeline notices -- the site's own
 * link check does not see inside generated markdown. Those fail the run.
 *
 * `KNOWN_BROKEN_LINKS` below is the exception list, and it is deliberately awkward: an entry that
 * stops matching also fails the run, so a fixed link cannot leave a stale exception behind.
 */

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const typedocBin = resolve(packageRoot, "node_modules/.bin/typedoc");

/**
 * Broken links that exist today, each with the source fix that removes it.
 *
 * Add to this list only when the fix belongs to a file this package's documentation build does
 * not own, and always with the file and the correction. Delete an entry as soon as it is fixed;
 * a stale entry fails the run.
 */
const KNOWN_BROKEN_LINKS = [
    {
        match: 'The comment for index.Edge.dispose links to "Edge.disposed"',
        fix: 'src/Edge.ts: the comment on dispose() should link to {@link Edge.isDisposed}, the public getter, not to the private "disposed" field.',
    },
    {
        match: 'The comment for index.Node.dispose links to "Node.disposed"',
        fix: 'src/Node.ts: the comment on dispose() should link to {@link Node.isDisposed}, the public getter, not to the private "disposed" field.',
    },
];

/** Warning text that means a documentation link does not resolve to a page. */
const LINK_PATTERNS = [/Failed to resolve link to /, /links to ".*" which was resolved but is not included/];

/**
 * Runs TypeDoc, echoing its output, and returns every line it wrote.
 * @returns {Promise<{ code: number, lines: string[] }>} TypeDoc's exit code and its output lines.
 */
function runTypedoc() {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(typedocBin, process.argv.slice(2), { cwd: packageRoot });
        /** @type {string[]} */
        const lines = [];
        /**
         * One partial line per stream. TypeDoc writes its warnings to stderr and its progress to
         * stdout, and a chunk of either can end mid-line; sharing one buffer between the two
         * splices a warning together with an unrelated progress line and loses both.
         * @type {{ stdout: string, stderr: string }}
         */
        const pending = { stdout: "", stderr: "" };

        /**
         * Builds the handler for one of TypeDoc's output streams.
         * @param {"stdout" | "stderr"} stream Which stream the chunks come from.
         * @returns {(chunk: Buffer) => void} A handler that echoes the chunk and keeps its lines.
         */
        const collect = (stream) => (chunk) => {
            process.stdout.write(chunk);
            pending[stream] += chunk.toString();

            const parts = pending[stream].split("\n");

            pending[stream] = parts.pop() ?? "";
            lines.push(...parts);
        };

        child.stdout.on("data", collect("stdout"));
        child.stderr.on("data", collect("stderr"));
        child.on("error", rejectPromise);
        child.on("close", (code) => {
            lines.push(...Object.values(pending).filter((line) => line.length > 0));
            resolvePromise({ code: code ?? 0, lines });
        });
    });
}

/** The terminal escape sequences TypeDoc wraps its severity labels in. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/**
 * Strips the ANSI colour codes TypeDoc writes around its severity labels.
 * @param {string} line One line of output.
 * @returns {string} The same line with escape sequences removed.
 */
function plain(line) {
    return line.replace(ANSI, "");
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

if (unexpected.length > 0 || stale.length > 0) {
    process.stderr.write("\nThe documentation build failed. Fix the links above, or record them with their fix.\n");
    process.exit(1);
}

for (const known of KNOWN_BROKEN_LINKS) {
    process.stdout.write(`Known broken link, fix pending: ${known.fix}\n`);
}
