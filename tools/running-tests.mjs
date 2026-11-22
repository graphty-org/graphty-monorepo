// running-tests.mjs -- a Vitest reporter that keeps a running record of what has started and not ended, so that
// tools/test-quarantine.mjs can name the test that hung when it has to stop a run (its stillRunning()).
//
// It runs in vitest's own process, not the browser page or the worker a hung test blocks, and appends one line per
// event to the file GRAPHTY_RUNNING_TESTS names: `+ <id>` when a file or test starts, `- <id>` when it ends. An id
// is `<file>`, or `<file> > <test>`. Appending keeps every line that was written, whenever the run is killed.
//
// On when GRAPHTY_RUNNING_TESTS is set: test-quarantine.mjs sets it, for a run with a deadline. Every package's
// vitest config adds it through ciReporters() (vitest.ci-junit.mjs); a shard command that passes its own
// --reporter flags names it too (tools/ci-test-matrix.mjs).
import { appendFileSync } from "node:fs";
import process from "node:process";

const moduleId = (testModule) => testModule.relativeModuleId;
const testId = (testCase) => `${moduleId(testCase.module)} > ${testCase.fullName}`;

/** The reporter: `reporters` in a vitest config, or `--reporter` on its command line. */
export default class RunningTests {
    /**
     * Takes the record's path from the environment.
     * @param [options] - what vitest gives a reporter
     * @param [options.file] - the record to append to
     */
    constructor({ file = process.env.GRAPHTY_RUNNING_TESTS } = {}) {
        this.file = file;
    }

    /**
     * Appends one line.
     * @param mark - "+" or "-"
     * @param id - the file or test
     */
    note(mark, id) {
        appendFileSync(this.file, `${mark} ${id}\t${Date.now()}\n`);
    }

    /**
     * A test file was handed to its worker or page: the first event of a file, ahead of its imports.
     * @param testModule - vitest's TestModule
     */
    onTestModuleQueued(testModule) {
        this.note("+", moduleId(testModule));
    }

    /**
     * A test file ended.
     * @param testModule - vitest's TestModule
     */
    onTestModuleEnd(testModule) {
        this.note("-", moduleId(testModule));
    }

    /**
     * A test started.
     * @param testCase - vitest's TestCase
     */
    onTestCaseReady(testCase) {
        this.note("+", testId(testCase));
    }

    /**
     * A test ended.
     * @param testCase - vitest's TestCase
     */
    onTestCaseResult(testCase) {
        this.note("-", testId(testCase));
    }
}
