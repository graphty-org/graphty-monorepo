/**
 * @file Type-checks the documentation samples and prints their errors as a JSON array of strings.
 *
 * Usage: node type-check-samples.mjs <tsconfig.json> <samples dir> <sample file>...
 *
 * guide-samples.test.ts runs this in a child process rather than in its own test worker. A worker under
 * `--coverage` counts every block of every script it runs, the TypeScript compiler included (vitest's v8 provider
 * starts precise block coverage for the whole isolate and drops what is not in src/ only afterwards), and that
 * counting doubled the check's time for numbers nobody reads. A child process is not instrumented.
 */

import ts from "typescript";

const [tsconfig, samplesDir, ...files] = process.argv.slice(2);
const config = ts.getParsedCommandLineOfConfigFile(
    tsconfig,
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
);
if (config === undefined) {
    throw new Error(`cannot read ${tsconfig}`);
}
const program = ts.createProgram(files, {
    ...config.options,
    noEmit: true,
    composite: false,
    incremental: false,
    // No ambient @types packages: left unset, every @types package in the workspace's node_modules joins the
    // program (three.js alone is 248 files, two thirds of what is parsed), and neither a sample nor src/ uses
    // one. A sample that leans on Node globals fails here, as it would for a browser reader.
    types: [],
});
// Diagnostics of the sample files only: asking for the whole program's would also type-check every file of src/
// the samples import, which `npm run lint` already does, and that is half of the checker's work.
const errors = files
    .flatMap((f) => ts.getPreEmitDiagnostics(program, program.getSourceFile(f)))
    .filter((d) => d.file === undefined || d.file.fileName.startsWith(samplesDir))
    .map((d) => `${d.file?.fileName ?? "(options)"}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
process.stdout.write(JSON.stringify(errors));
