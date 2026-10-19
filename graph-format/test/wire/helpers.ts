/**
 * Shared helpers of the wire tests: deep equality of snapshots (topology, ids, columns including
 * validity, dictionaries, lists, json, defaults, extension tables and meta) and container surgery
 * for the corruption tests (rebuild a container from an edited manifest and region). The fixture
 * graphs live in fixture-graph.ts so the golden generator can import them without vitest.
 */

import { expect } from "vitest";

import { ALIGNMENT, WIRE_MAJOR, WIRE_MINOR } from "../../src/constants.js";
import { GraphFormatError } from "../../src/errors.js";
import { equalsTopology, type GraphSnapshot } from "../../src/snapshot/graph-snapshot.js";
import { type AttributeTable, type Column } from "../../src/types/index.js";
import { CONTAINER_HEADER_BYTES } from "../../src/wire/bytes.js";

export { idsSnapshot, richSnapshot } from "./fixture-graph.js";

/** Run fn and return the GraphFormatError it throws, asserting the code. */
export function expectError(fn: () => unknown, code: string): GraphFormatError {
    let caught: unknown = null;
    try {
        fn();
    } catch (err) {
        caught = err;
    }
    expect(caught).toBeInstanceOf(GraphFormatError);
    const error = caught as GraphFormatError;
    expect(error.code).toBe(code);
    return error;
}

function sameNumbers(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!Object.is(a[i], b[i])) {
            return false;
        }
    }
    return true;
}

/**
 * expect(actual, where).toBe(expected), calling expect() only when the values differ. The wire fuzz
 * oracle compares thousands of snapshots, and an expect() call costs far more than the comparison.
 */
function expectSame(actual: unknown, expected: unknown, where?: string): void {
    if (!Object.is(actual, expected)) {
        expect(actual, where).toBe(expected);
    }
}

/** Assert two columns are equal: meta, length, validity, nullCount and every value. */
function expectColumnsEqual(a: Column, b: Column, where: string): void {
    expect(b.meta, `${where}.meta`).toEqual(a.meta);
    expectSame(b.length, a.length, `${where}.length`);
    expectSame(b.nullCount, a.nullCount, `${where}.nullCount`);
    expectSame(b.validity === null, a.validity === null, `${where}.validity presence`);
    if (a.validity !== null && b.validity !== null) {
        expectSame(sameNumbers(a.validity, b.validity), true, `${where}.validity`);
    }
    switch (a.dtype) {
        case "f32":
        case "f64":
        case "i32":
        case "u32":
        case "u8":
            expectSame(b.dtype, a.dtype);
            expectSame(sameNumbers(a.data, (b as typeof a).data), true, `${where}.data`);
            break;
        case "bool":
            expectSame(b.dtype, "bool");
            expectSame(sameNumbers(a.data, (b as typeof a).data), true, `${where}.data`);
            break;
        case "dict": {
            expectSame(b.dtype, "dict");
            const bd = b as typeof a;
            expectSame(sameNumbers(a.codes, bd.codes), true, `${where}.codes`);
            expect(bd.dictionary, `${where}.dictionary`).toEqual(a.dictionary);
            break;
        }
        case "string": {
            expectSame(b.dtype, "string");
            expect((b as typeof a).decodeAll(), `${where}.strings`).toEqual(a.decodeAll());
            break;
        }
        case "list": {
            expectSame(b.dtype, "list");
            const bl = b as typeof a;
            expectSame(sameNumbers(a.offsets, bl.offsets), true, `${where}.offsets`);
            expectColumnsEqual(a.child, bl.child, `${where}.child`);
            break;
        }
        case "json": {
            expectSame(b.dtype, "json");
            expect((b as typeof a).values, `${where}.values`).toEqual(a.values);
            break;
        }
        default:
            throw new Error("unknown dtype");
    }
    for (let row = 0; row < a.length; row++) {
        expectSame(b.isSet(row), a.isSet(row), `${where}.isSet(${row})`);
        const va = a.value(row);
        const vb = b.value(row);
        if (ArrayBuffer.isView(va)) {
            expectSame(
                sameNumbers(va as unknown as ArrayLike<number>, vb as ArrayLike<number>),
                true,
                `${where}.value(${row})`,
            );
        } else if (!Object.is(va, vb)) {
            expect(vb, `${where}.value(${row})`).toEqual(va);
        }
    }
}

/** Assert two tables hold equal columns in the same order. */
function expectTablesEqual(a: AttributeTable, b: AttributeTable, where: string): void {
    expectSame(b.domain, a.domain, `${where}.domain`);
    expectSame(b.rowCount, a.rowCount, `${where}.rowCount`);
    expect(b.names(), `${where}.names`).toEqual(a.names());
    for (const name of a.names()) {
        expectColumnsEqual(a.require(name), b.require(name), `${where}.${name}`);
    }
}

/** Assert two snapshots are equal in everything the wire carries. */
export function expectSnapshotsEqual(a: GraphSnapshot, b: GraphSnapshot): void {
    expectSame(equalsTopology(a, b), true, "topology");
    expect(b.flags).toEqual(a.flags);
    expectSame(b.label, a.label);
    expectSame(b.selfLoopCount, a.selfLoopCount);
    expectSame(b.ids.kind, a.ids.kind);
    expectSame(b.ids.offset, a.ids.offset);
    expect(b.ids.toArray()).toEqual(a.ids.toArray());
    for (let i = 0; i < a.nodeCount; i++) {
        expectSame(b.ids.indexOf(a.ids.idOf(i)), i);
    }
    expectTablesEqual(a.nodes, b.nodes, "nodes");
    expectTablesEqual(a.edges, b.edges, "edges");
    expectTablesEqual(a.graph, b.graph, "graph");
    expect([...b.extensions.keys()]).toEqual([...a.extensions.keys()]);
    for (const [name, table] of a.extensions) {
        expectTablesEqual(table, b.extensions.get(name) as AttributeTable, `extensions[${name}]`);
    }
    expect(b.meta).toEqual(a.meta);
}

/** The pieces of a container: header fields, manifest text and the buffer region bytes. */
interface ContainerParts {
    readonly major: number;
    readonly minor: number;
    readonly manifestText: string;
    readonly manifest: Record<string, unknown>;
    readonly region: Uint8Array;
}

/** Split a container into its header, manifest and region. */
export function splitContainer(bytes: Uint8Array): ContainerParts {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const major = view.getUint16(4, true);
    const minor = view.getUint16(6, true);
    const length = view.getUint32(12, true);
    const manifestText = new TextDecoder().decode(
        bytes.subarray(CONTAINER_HEADER_BYTES, CONTAINER_HEADER_BYTES + length),
    );
    const start = roundUp(CONTAINER_HEADER_BYTES + length, ALIGNMENT);
    return {
        major,
        minor,
        manifestText,
        manifest: JSON.parse(manifestText) as Record<string, unknown>,
        region: bytes.subarray(start),
    };
}

function roundUp(value: number, multiple: number): number {
    const r = value % multiple;
    return r === 0 ? value : value + multiple - r;
}

/** Options of buildContainer(). */
interface BuildContainerOptions {
    readonly major?: number;
    readonly minor?: number;
    readonly magic?: readonly number[];
    readonly probe?: readonly number[];
    /** Override the declared manifest length. */
    readonly declaredLength?: number;
}

/** Assemble a container from a manifest text and a region (the inverse of splitContainer). */
export function buildContainer(
    manifestText: string,
    region: Uint8Array,
    options: BuildContainerOptions = {},
): Uint8Array {
    const manifestBytes = new TextEncoder().encode(manifestText);
    const start = roundUp(CONTAINER_HEADER_BYTES + manifestBytes.byteLength, ALIGNMENT);
    const out = new Uint8Array(start + region.byteLength);
    out.set(options.magic ?? [0x47, 0x53, 0x4e, 0x50], 0);
    const view = new DataView(out.buffer);
    view.setUint16(4, options.major ?? WIRE_MAJOR, true);
    view.setUint16(6, options.minor ?? WIRE_MINOR, true);
    out.set(options.probe ?? [0x04, 0x03, 0x02, 0x01], 8);
    view.setUint32(12, options.declaredLength ?? manifestBytes.byteLength, true);
    out.set(manifestBytes, CONTAINER_HEADER_BYTES);
    out.set(region, start);
    return out;
}

/** Rebuild a container after editing its parsed manifest in place. */
export function rebuildContainer(
    bytes: Uint8Array,
    edit: (manifest: Record<string, unknown>) => void,
    options: BuildContainerOptions = {},
): Uint8Array {
    const parts = splitContainer(bytes);
    edit(parts.manifest);
    return buildContainer(JSON.stringify(parts.manifest), parts.region, options);
}

/** The manifest of a container with `producer` masked, plus the region bytes, for golden comparisons. */
export function maskedContainer(bytes: Uint8Array): { manifest: Record<string, unknown>; region: number[] } {
    const parts = splitContainer(bytes);
    parts.manifest.producer = "<masked>";
    return { manifest: parts.manifest, region: Array.from(parts.region) };
}

/** Walk a manifest and return the object at a dotted path such as "nodeColumns.2.data". */
export function at(manifest: Record<string, unknown>, path: string): Record<string, unknown> {
    let node: unknown = manifest;
    for (const key of path.split(".")) {
        node = (node as Record<string, unknown>)[key];
    }
    return node as Record<string, unknown>;
}
