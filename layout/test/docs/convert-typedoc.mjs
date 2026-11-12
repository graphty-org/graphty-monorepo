/**
 * @file Converts the package's API with TypeDoc and prints the outcome as JSON.
 *
 * Usage: node convert-typedoc.mjs <package dir>
 *
 * Prints `{ converted, warningCount, errorCount, messages }`, where `messages` holds every warning and error
 * TypeDoc logged. typedoc-config.test.ts runs this in a child process rather than in its own test worker, for the
 * reason type-check-samples.mjs gives: a worker under `--coverage` counts every block of TypeDoc and the
 * TypeScript compiler it drives, and a child process is not instrumented.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";

import { Application, LogLevel } from "typedoc";

const pkg = resolve(process.argv[2]);
const config = JSON.parse(readFileSync(resolve(pkg, "typedoc.json"), "utf8"));
const app = await Application.bootstrapWithPlugins({
    options: resolve(pkg, "typedoc.json"),
    tsconfig: resolve(pkg, "tsconfig.json"),
    entryPoints: config.entryPoints.map((p) => resolve(pkg, p)),
    logLevel: LogLevel.Warn,
});
const messages = [];
const log = app.logger.log.bind(app.logger);
app.logger.log = (message, level) => {
    if (level >= LogLevel.Warn) {
        messages.push(stripVTControlCharacters(message));
    }
    log(message, level);
};
const project = await app.convert();
if (project) {
    app.validate(project);
}
const { warningCount, errorCount } = app.logger;
process.stdout.write(JSON.stringify({ converted: project !== undefined, warningCount, errorCount, messages }));
