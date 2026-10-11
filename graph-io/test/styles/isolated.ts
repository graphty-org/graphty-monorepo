/**
 * Checks one style corpus file in a process of its own, for `scripts/styles-corpus.mjs`, which kills the process
 * when it runs too long: a hang fails the file instead of the run. Prints one JSON line: the result, the failures,
 * and the round-trip failures when the format writes styles.
 *
 *   tsx test/styles/isolated.ts check <format> <file>
 *   tsx test/styles/isolated.ts table <results.json>
 */

import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { extractStyles } from "../../src/styles/index.js";
import { checkInput, fileInput, readCorpusFile, roundTrip, styleFormats, type StyleResult } from "./harness.js";
import { resultsTable } from "./results.js";

const [mode, ...args] = process.argv.slice(2);
if (mode === "table") {
    const results = JSON.parse(readFileSync(args[0], "utf8")) as StyleResult[];
    process.stdout.write(resultsTable(results));
} else if (mode === "check" && args.length === 2) {
    const [name, path] = args;
    const format = (await styleFormats()).find((f) => f.name === name) ?? { name };
    const { bytes, filename } = readCorpusFile(path);
    const input = fileInput(format, `${name}/${basename(path)}`, bytes, filename);
    const checked = await checkInput(input);
    const roundTripFailures: string[] = [];
    if (format.writer !== undefined && checked.result.styled) {
        const loaded = await input.load();
        const ex = extractStyles(loaded.importer, loaded.snapshot, loaded.report);
        if (ex !== null) {
            roundTripFailures.push(...(await roundTrip(format.writer, loaded, ex)));
        }
    }
    process.stdout.write(
        `${JSON.stringify({ result: checked.result, failures: checked.failures, roundTripFailures })}\n`,
    );
} else {
    process.stderr.write("usage: isolated.ts check <format> <file> | isolated.ts table <results.json>\n");
    process.exitCode = 2;
}
