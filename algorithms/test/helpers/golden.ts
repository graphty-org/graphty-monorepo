/**
 * Recorded legacy results. The differential suites used to run a legacy function next to its port
 * on the same fixture and compare the two. The legacy functions are deleted at the 3.0.0 release,
 * so what each call returned is recorded in `test/golden/<test file path>.json.gz`, keyed by the full
 * name of the test that made the call and the call's position in that test (`#0`, `#1`, ...).
 * `legacyResult()` hands the recorded value back in its original shape: Map and Set iteration
 * order, number versus string keys, `undefined` properties, `-0`, `NaN` and the infinities all
 * survive the round trip, and every finite number is exact (JSON writes the shortest decimal that
 * parses back to the same f64).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import { afterAll, beforeEach, expect } from "vitest";

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
const ERRORS: Record<string, { prototype: Error }> = { ConvergenceError, PathWalkError };

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

function encode(value: unknown, at: string): Encoded {
    if (value === undefined) {
        return { $undefined: true };
    }
    if (value === null || typeof value === "boolean" || typeof value === "string") {
        return value;
    }
    if (typeof value === "number") {
        if (Number.isNaN(value)) {
            return { $number: "NaN" };
        }
        if (value === Infinity) {
            return { $number: "Infinity" };
        }
        if (value === -Infinity) {
            return { $number: "-Infinity" };
        }
        return Object.is(value, -0) ? { $number: "-0" } : value;
    }
    if (value instanceof Map) {
        return {
            $map: [...value].map(([k, v], i) => [encode(k, `${at} key ${i}`), encode(v, `${at}.get(${String(k)})`)]),
        };
    }
    if (value instanceof Set) {
        return { $set: [...value].map((v, i) => encode(v, `${at} member ${i}`)) };
    }
    if (Array.isArray(value)) {
        return value.map((v, i) => encode(v, `${at}[${i}]`));
    }
    if (ArrayBuffer.isView(value)) {
        const { name } = value.constructor;
        if (!(name in TYPED)) {
            throw new Error(`${at}: cannot record a ${name}`);
        }
        return { $typed: name, values: [...(value as unknown as ArrayLike<number>)].map((v) => encode(v, at)) };
    }
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        const out: Record<string, Encoded> = {};
        for (const [k, v] of Object.entries(value)) {
            out[k] = encode(v, `${at}.${k}`);
        }
        return { $object: out };
    }
    throw new Error(`${at}: cannot record ${Object.prototype.toString.call(value)}`);
}

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
let recording = 0;
beforeEach(() => {
    calls.clear();
});
afterAll(() => {
    if (process.env.GOLDEN_RECORD === "1") {
        for (const [file, records] of files) {
            mkdirSync(dirname(file), { recursive: true });
            // One record per line, gzipped: the suites record about 40 MB of JSON. `zcat` reads a file.
            const lines = Object.entries(records).map(
                ([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`,
            );
            writeFileSync(file, gzipSync(`{\n${lines.join(",\n")}\n}\n`, { level: 9 }));
        }
    }
});

function goldenFile(testPath: string): string {
    return join(TEST_ROOT, "golden", relative(TEST_ROOT, testPath).replace(/\.test\.ts$/, ".json.gz"));
}

function load(file: string): Record<string, Encoded> {
    let records = files.get(file);
    if (records === undefined) {
        records =
            process.env.GOLDEN_RECORD === "1"
                ? {}
                : (JSON.parse(gunzipSync(readFileSync(file)).toString("utf8")) as Record<string, Encoded>);
        files.set(file, records);
    }
    return records;
}

/**
 * The value the legacy function returned at this point of the running test.
 * @param record - Only while recording (`GOLDEN_RECORD=1`): the legacy call to run and record
 * @returns The recorded legacy result
 */
export function legacyResult<T>(record?: () => T): T {
    if (recording > 0 && record !== undefined) {
        // A legacy call inside one being recorded is part of that record, not a record of its own.
        return record();
    }
    const { currentTestName, testPath } = expect.getState();
    if (currentTestName === undefined || testPath === undefined) {
        throw new Error("legacyResult() is only callable inside a test");
    }
    const n = calls.get(currentTestName) ?? 0;
    calls.set(currentTestName, n + 1);
    const key = `${currentTestName} #${n}`;
    const file = goldenFile(testPath);
    const records = load(file);
    if (process.env.GOLDEN_RECORD === "1") {
        if (record === undefined) {
            throw new Error(`${key}: nothing to record`);
        }
        if (key in records) {
            throw new Error(`${key}: recorded twice (two tests share a name?)`);
        }
        let value: T;
        recording++;
        try {
            value = record();
        } catch (error) {
            const { name, message } = error as Error;
            records[key] = { $throws: { name, message } };
            throw error;
        } finally {
            recording--;
        }
        records[key] = encode(value, key);
        return value;
    }
    if (!(key in records)) {
        throw new Error(`${key}: no recorded legacy result in ${file}`);
    }
    const value = decode(records[key]);
    if (value !== null && typeof value === "object" && "$throws" in value) {
        const { name, message } = (value as { $throws: { name: string; message: string } }).$throws;
        const error = Object.create((ERRORS[name] ?? Error).prototype) as Error;
        Object.defineProperties(error, { name: { value: name }, message: { value: message } });
        throw error;
    }
    return value as T;
}
