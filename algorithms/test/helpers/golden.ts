/**
 * Recorded legacy results. The differential suites used to run a legacy function next to its port
 * on the same fixture and compare the two. The legacy functions are deleted at the 3.0.0 release,
 * so what each call returned is recorded in `test/golden/<test file path>.json.gz`, keyed by the full
 * name of the test that made the call and the call's position in that test (`#0`, `#1`, ...).
 * `legacyResult()` hands the recorded value back in its original shape: Map and Set iteration
 * order, number versus string keys, `undefined` properties, `-0`, `NaN` and the infinities all
 * survive the round trip, and every finite number is exact (JSON writes the shortest decimal that
 * parses back to the same f64).
 *
 * The records are frozen: the suites no longer call the legacy code, so nothing re-records them.
 * Two tests of one file sharing a name, and a record that a whole passing run of its file never
 * reads, both fail the file, so a renamed test or a dropped fixture cannot go unnoticed.
 */

import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { gunzipSync } from "node:zlib";

import { afterAll, beforeEach, expect, type RunnerTask, type RunnerTestSuite } from "vitest";

import { ConvergenceError, PathWalkError } from "../../src/errors.js";

type Encoded =
    | null
    | boolean
    | number
    | string
    | Encoded[]
    | { $map: [Encoded, Encoded][] }
    | { $set: Encoded[] }
    | { $number: "NaN" | "Infinity" | "-Infinity" | "-0" }
    | { $undefined: true }
    | { $typed: string; values: Encoded[] }
    | { $object: Record<string, Encoded> }
    | { $throws: { name: string; message: string } };

/** A recorded throw is replayed as an instance of its class, so `toThrow(ConvergenceError)` still holds. */
const ERRORS: Record<string, { prototype: Error }> = { ConvergenceError, PathWalkError, RangeError, TypeError };

const TYPED: Record<string, new (values: number[]) => ArrayLike<number>> = {
    Float64Array,
    Float32Array,
    Int32Array,
    Uint32Array,
    Uint8Array,
    Int8Array,
    Uint16Array,
    Int16Array,
};

function decode(value: Encoded): unknown {
    if (value === null || typeof value !== "object") {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(decode);
    }
    if ("$map" in value) {
        return new Map(value.$map.map(([k, v]) => [decode(k), decode(v)]));
    }
    if ("$set" in value) {
        return new Set(value.$set.map(decode));
    }
    if ("$number" in value) {
        return value.$number === "-0" ? -0 : Number(value.$number);
    }
    if ("$undefined" in value) {
        return undefined;
    }
    if ("$typed" in value) {
        return new TYPED[value.$typed](value.values.map(decode) as number[]);
    }
    if ("$throws" in value) {
        return value;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value.$object)) {
        out[k] = decode(v);
    }
    return out;
}

const TEST_ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const files = new Map<string, Record<string, Encoded>>();
const calls = new Map<string, number>();
const read = new Set<string>();
/** Full test name to the id of the test that owns it, to catch two tests sharing a name. */
const owners = new Map<string, string>();
let testFile: RunnerTestSuite | undefined;
beforeEach(({ task }) => {
    calls.clear();
    testFile = task.file;
    const name = expect.getState().currentTestName ?? task.name;
    const owner = owners.get(name);
    if (owner !== undefined && owner !== task.id) {
        throw new Error(`two tests are named "${name}": their golden records would collide`);
    }
    owners.set(name, task.id);
});

function tasksOf(suite: RunnerTestSuite): RunnerTask[] {
    return suite.tasks.flatMap((t) => (t.type === "suite" ? tasksOf(t) : [t]));
}

afterAll(() => {
    // Only a run of every test of the file, all passing, is expected to read every record.
    if (testFile === undefined || !tasksOf(testFile).every((t) => t.mode === "run" && t.result?.state === "pass")) {
        return;
    }
    for (const [file, records] of files) {
        const unread = Object.keys(records).filter((key) => !read.has(`${file} ${key}`));
        if (unread.length > 0) {
            throw new Error(`${file}: ${unread.length} records no test read, first ${unread[0]}`);
        }
    }
});

function goldenFile(testPath: string): string {
    return join(TEST_ROOT, "golden", relative(TEST_ROOT, testPath).replace(/\.test\.ts$/, ".json.gz"));
}

function load(file: string): Record<string, Encoded> {
    let records = files.get(file);
    if (records === undefined) {
        records = JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as Record<string, Encoded>;
        files.set(file, records);
    }
    return records;
}

/**
 * The value the legacy function returned at this point of the running test. A recorded throw is
 * thrown again, as an instance of its class when that class is in `ERRORS`.
 * @returns The recorded legacy result, for the caller to assert the type of
 */
export function legacyResult(): unknown {
    const { currentTestName, testPath } = expect.getState();
    if (currentTestName === undefined || testPath === undefined) {
        throw new Error("legacyResult() is only callable inside a test");
    }
    const n = calls.get(currentTestName) ?? 0;
    calls.set(currentTestName, n + 1);
    const key = `${currentTestName} #${n}`;
    const file = goldenFile(testPath);
    const records = load(file);
    if (!(key in records)) {
        throw new Error(`${key}: no recorded legacy result in ${file}`);
    }
    read.add(`${file} ${key}`);
    const value = decode(records[key]);
    if (value !== null && typeof value === "object" && "$throws" in value) {
        const { name, message } = (value as { $throws: { name: string; message: string } }).$throws;
        const known = ERRORS[name] as { prototype: Error } | undefined;
        // A real Error (vitest's toThrow(new RangeError(...)) accepts nothing else) given the recorded
        // class's prototype, without running a custom error class's constructor.
        const error = new Error(message);
        Object.setPrototypeOf(error, (known ?? Error).prototype);
        if (known === undefined) {
            Object.defineProperty(error, "name", { value: name, writable: true, configurable: true });
        }
        throw error;
    }
    return value;
}
