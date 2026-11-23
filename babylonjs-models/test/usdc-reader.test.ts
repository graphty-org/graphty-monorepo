/**
 * The binary USD (`.usdc` crate) reader over small layers written here byte by byte: the sections
 * it reads (tokens, strings, fields, field sets, the path tree, specs), each value accessor
 * (text, numbers, arrays, tuples, token arrays, composition arcs, time samples), the LZ4 blocks it
 * inflates, the token renaming that rewrites an asset path, and the damaged layers it refuses.
 */

import { assert, describe, it } from "vitest";

import { ModelReadError } from "../src/files/readers/geometry.js";
import {
    type Crate,
    isTimeSamples,
    readCrate,
    renameCrateTokens,
    SPEC,
    type ValueRep,
} from "../src/files/readers/usdc.js";

/** The crate type codes these layers write (OpenUSD's crateDataTypes.h). */
const T = {
    int: 3,
    uint: 4,
    float: 8,
    double: 9,
    string: 10,
    token: 11,
    assetPath: 12,
    matrix4d: 15,
    quatf: 17,
    vec3d: 23,
    vec3f: 24,
    pathListOp: 34,
    referenceListOp: 35,
    timeSamples: 46,
    payload: 47,
    payloadListOp: 55,
} as const;

const BUDGET = 1 << 20;

/** A byte writer, little-endian. */
class Out {
    private readonly parts: Uint8Array[] = [];
    length = 0;

    bytes(b: ArrayLike<number>): number {
        const at = this.length;
        this.parts.push(Uint8Array.from(b));
        this.length += b.length;
        return at;
    }

    private typed(size: number, set: (view: DataView) => void): number {
        const b = new Uint8Array(size);
        set(new DataView(b.buffer));
        return this.bytes(b);
    }

    u32(n: number): number {
        return this.typed(4, (v) => v.setUint32(0, n, true));
    }

    i32(n: number): number {
        return this.typed(4, (v) => v.setInt32(0, n, true));
    }

    u64(n: number | bigint): number {
        return this.typed(8, (v) => v.setBigUint64(0, BigInt(n), true));
    }

    i64(n: number): number {
        return this.typed(8, (v) => v.setBigInt64(0, BigInt(n), true));
    }

    f32s(values: readonly number[]): number {
        return this.typed(values.length * 4, (v) => values.forEach((x, i) => v.setFloat32(i * 4, x, true)));
    }

    f64s(values: readonly number[]): number {
        return this.typed(values.length * 8, (v) => values.forEach((x, i) => v.setFloat64(i * 8, x, true)));
    }

    done(): Uint8Array {
        const out = new Uint8Array(this.length);
        let at = 0;
        for (const part of this.parts) {
            out.set(part, at);
            at += part.length;
        }
        return out;
    }
}

/**
 * Bytes as one LZ4 block of literals in TfFastCompression (a chunk count of 0 first).
 * @param raw - The bytes.
 * @returns The compressed bytes.
 */
function lz4(raw: Uint8Array): Uint8Array {
    const head = [0, Math.min(raw.length, 15) << 4];
    if (raw.length >= 15) {
        let rest = raw.length - 15;
        for (; rest >= 255; rest -= 255) {
            head.push(255);
        }
        head.push(rest);
    }
    const out = new Uint8Array(head.length + raw.length);
    out.set(head);
    out.set(raw, head.length);
    return out;
}

/**
 * A run of integers as OpenUSD codes them: a common delta, a 2-bit width per value, then each
 * delta in 0, 1, 2 or 4 bytes; written with its compressed size first.
 * @param out - Where it goes.
 * @param values - The integers.
 */
function intRun(out: Out, values: readonly number[]): void {
    const codes = new Uint8Array((values.length * 2 + 7) >> 3);
    const deltas = new Out();
    let previous = 0;
    values.forEach((value, i) => {
        const d = value - previous;
        previous = value;
        let code = 3;
        if (d === 0) {
            code = 0;
        } else if (d >= -128 && d < 128) {
            code = 1;
            deltas.bytes([d & 255]);
        } else if (d >= -32768 && d < 32768) {
            code = 2;
            deltas.bytes([d & 255, (d >> 8) & 255]);
        } else {
            deltas.i32(d);
        }
        codes[i >> 2] |= code << ((i & 3) * 2);
    });
    const raw = new Out();
    raw.i32(0);
    raw.bytes(codes);
    raw.bytes(deltas.done());
    const block = lz4(raw.done());
    out.u64(block.length);
    out.bytes(block);
}

/**
 * A packed value.
 * @param type - Its type code.
 * @param payload - Its inline value or file offset.
 * @param flags - Whether it is an array, inline or compressed.
 * @returns Its 64 bits.
 */
function rep(
    type: number,
    payload: number,
    flags: { array?: boolean; inline?: boolean; compressed?: boolean } = {},
): bigint {
    let hi = BigInt(type) << 48n;
    hi |= flags.array === true ? 1n << 63n : 0n;
    hi |= flags.inline === true ? 1n << 62n : 0n;
    hi |= flags.compressed === true ? 1n << 61n : 0n;
    return hi | BigInt(payload);
}

/** A float's 32 bits. */
const bitsOf = (x: number): number => new Uint32Array(Float32Array.of(x).buffer)[0];

/** A layer to write: each section left out when its entry is. */
interface Layer {
    readonly minor?: number;
    readonly tokens?: readonly string[];
    /** The TOKENS section's compressed bytes and declared size, instead of the tokens'. */
    readonly tokenBlock?: { readonly bytes: Uint8Array; readonly size: number };
    readonly strings?: readonly number[];
    /** Writes the values' bytes and returns the fields: each a name token and a value. */
    readonly fields?: (out: Out) => readonly (readonly [number, bigint])[];
    readonly fieldSets?: readonly number[];
    readonly paths?: {
        readonly total: number;
        readonly indices: readonly number[];
        readonly elements: readonly number[];
        readonly jumps: readonly number[];
    };
    /** Each spec: its path index, its field set's start and its spec type. */
    readonly specs?: readonly (readonly [number, number, number])[];
}

/**
 * Write a crate file: header, values, sections, then the table of contents.
 * @param layer - What it holds.
 * @returns The file.
 */
function crate(layer: Layer): Uint8Array {
    const out = new Out();
    out.bytes(new TextEncoder().encode("PXR-USDC"));
    out.bytes([0, layer.minor ?? 8, 0, 0, 0, 0, 0, 0]);
    out.u64(0);
    const fields = layer.fields?.(out);
    const toc: [string, number][] = [];
    const section = (name: string, write: () => void): void => {
        toc.push([name, out.length]);
        write();
    };
    if (layer.tokens !== undefined || layer.tokenBlock !== undefined) {
        section("TOKENS", () => {
            const tokens = layer.tokens ?? [];
            const raw = new TextEncoder().encode(tokens.map((t) => `${t}\0`).join(""));
            const block = layer.tokenBlock ?? { bytes: lz4(raw), size: raw.length };
            out.u64(tokens.length || 1);
            out.u64(block.size);
            out.u64(block.bytes.length);
            out.bytes(block.bytes);
        });
    }
    if (layer.strings !== undefined) {
        const { strings } = layer;
        section("STRINGS", () => {
            out.u64(strings.length);
            strings.forEach((s) => out.u32(s));
        });
    }
    if (fields !== undefined) {
        section("FIELDS", () => {
            out.u64(fields.length);
            intRun(
                out,
                fields.map(([name]) => name),
            );
            const reps = new Out();
            fields.forEach(([, value]) => reps.u64(value));
            const block = lz4(reps.done());
            out.u64(block.length);
            out.bytes(block);
        });
    }
    if (layer.fieldSets !== undefined) {
        const { fieldSets } = layer;
        section("FIELDSETS", () => {
            out.u64(fieldSets.length);
            intRun(out, fieldSets);
        });
    }
    if (layer.paths !== undefined) {
        const { paths } = layer;
        section("PATHS", () => {
            out.u64(paths.total);
            out.u64(paths.indices.length);
            intRun(out, paths.indices);
            intRun(out, paths.elements);
            intRun(out, paths.jumps);
        });
    }
    if (layer.specs !== undefined) {
        const { specs } = layer;
        section("SPECS", () => {
            out.u64(specs.length);
            intRun(
                out,
                specs.map(([path]) => path),
            );
            intRun(
                out,
                specs.map(([, set]) => set),
            );
            intRun(
                out,
                specs.map(([, , type]) => type),
            );
        });
    }
    const tocAt = out.u64(toc.length);
    for (const [name, start] of toc) {
        const label = new Uint8Array(16);
        label.set(new TextEncoder().encode(name));
        out.bytes(label);
        out.u64(start);
        out.u64(0);
    }
    const bytes = out.done();
    new DataView(bytes.buffer).setBigUint64(16, BigInt(tocAt), true);
    return bytes;
}

/** The field names of {@link cubeLayer}, after its prim names in its tokens. */
const FIELD_NAMES = [
    "typeName",
    "label",
    "asset",
    "count",
    "ucount",
    "width",
    "dbl",
    "bigDouble",
    "note",
    "points",
    "faces",
    "ucounts",
    "widths",
    "packedFaces",
    "packedFloats",
    "noFaces",
    "translate",
    "orient",
    "scaleInline",
    "matrixInline",
    "matrix",
    "opOrder",
    "noOps",
    "references",
    "inheritPaths",
    "payload",
    "payloads",
    "anim",
    "stuck",
    "hugeArray",
    "badTokens",
] as const;
const PRIM_TOKENS = ["", "Cube", "points", "Child", "Big", "Mesh", "asset.usd", "xformOp:translate"];
const TOKENS = [...PRIM_TOKENS, ...FIELD_NAMES];
const tok = (name: string): number => TOKENS.indexOf(name);

/**
 * A layer of one Mesh prim, `/Cube`, holding a field of every kind the reader reads, with an
 * attribute `/Cube.points` and two more prims, `/Child` and `/Big`.
 * @param minor - The crate version's minor number: arrays count in 32 bits before 7, a payload
 * carries a layer offset from 8.
 * @returns The file.
 */
function cubeLayer(minor = 8): Uint8Array {
    const length = (out: Out, n: number): number => (minor < 7 ? out.u32(n) : out.u64(n));
    const payloadOffset = (out: Out): void => {
        if (minor >= 8) {
            out.bytes(new Uint8Array(16));
        }
    };
    return crate({
        minor,
        tokens: TOKENS,
        strings: [tok("asset.usd")],
        fields: (out) => {
            const at: Record<string, number> = {};
            at.bigDouble = out.f64s([1e300]);
            at.note = out.bytes([1, 2, 3, 4]);
            at.points = length(out, 2);
            out.f32s([0, 1, 2, 3, 4, 5]);
            at.faces = length(out, 3);
            out.i32(3);
            out.i32(-4);
            out.i32(5);
            at.ucounts = length(out, 1);
            out.u32(4_000_000_000);
            at.widths = length(out, 2);
            out.f32s([0.5, 0.75]);
            at.packedFaces = length(out, 4);
            intRun(out, [10, 10, 300, 70_000]);
            at.packedFloats = length(out, 1);
            at.translate = out.f64s([1, 2, 3]);
            at.orient = out.f32s([0, 0, 0.5, 1]);
            at.matrix = out.f64s(Array.from({ length: 16 }, (_, i) => i + 1));
            at.opOrder = length(out, 2);
            out.u32(tok("xformOp:translate"));
            out.u32(tok("Mesh"));
            // Prepended (32) and deleted (8): one reference each, with a layer offset and one custom data entry.
            at.references = out.bytes([32 | 8]);
            for (let list = 0; list < 2; list++) {
                out.u64(1);
                out.u32(0);
                out.u32(1);
                out.bytes(new Uint8Array(16));
                out.u64(1);
                out.bytes(new Uint8Array(12));
            }
            at.inheritPaths = out.bytes([2]);
            out.u64(2);
            out.u32(1);
            out.u32(3);
            at.payload = out.u32(0);
            out.u32(3);
            payloadOffset(out);
            at.payloads = out.bytes([4]);
            out.u64(1);
            out.u32(0);
            out.u32(4);
            payloadOffset(out);
            // A jump over the times to their rep, then a jump to the values' count and values.
            at.anim = out.i64(8);
            out.u64(0);
            out.i64(8);
            out.u64(2);
            out.u64(rep(T.float, bitsOf(1.5), { inline: true }));
            out.u64(rep(T.float, bitsOf(2.5), { inline: true }));
            at.stuck = out.i64(0);
            at.hugeArray = out.u64(2 ** 40);
            at.badTokens = length(out, 1);
            out.u32(999);

            const values: Record<(typeof FIELD_NAMES)[number], bigint> = {
                typeName: rep(T.token, tok("Mesh"), { inline: true }),
                label: rep(T.string, 0, { inline: true }),
                asset: rep(T.assetPath, tok("asset.usd"), { inline: true }),
                count: rep(T.int, 0xffff_ffff, { inline: true }),
                ucount: rep(T.uint, 4_000_000_000, { inline: true }),
                width: rep(T.float, bitsOf(1.5), { inline: true }),
                dbl: rep(T.double, bitsOf(0.25), { inline: true }),
                bigDouble: rep(T.double, at.bigDouble),
                note: rep(T.string, at.note),
                points: rep(T.vec3f, at.points, { array: true }),
                faces: rep(T.int, at.faces, { array: true }),
                ucounts: rep(T.uint, at.ucounts, { array: true }),
                widths: rep(T.float, at.widths, { array: true }),
                packedFaces: rep(T.int, at.packedFaces, { array: true, compressed: true }),
                packedFloats: rep(T.float, at.packedFloats, { array: true, compressed: true }),
                noFaces: rep(T.int, 0, { array: true }),
                translate: rep(T.vec3d, at.translate),
                orient: rep(T.quatf, at.orient),
                scaleInline: rep(T.vec3f, 1 | (0xfe << 8) | (3 << 16), { inline: true }),
                matrixInline: rep(T.matrix4d, 2 | (3 << 8) | (4 << 16) | (1 << 24), { inline: true }),
                matrix: rep(T.matrix4d, at.matrix),
                opOrder: rep(T.token, at.opOrder, { array: true }),
                noOps: rep(T.token, 0, { array: true }),
                references: rep(T.referenceListOp, at.references),
                inheritPaths: rep(T.pathListOp, at.inheritPaths),
                payload: rep(T.payload, at.payload),
                payloads: rep(T.payloadListOp, at.payloads),
                anim: rep(T.timeSamples, at.anim),
                stuck: rep(T.timeSamples, at.stuck),
                hugeArray: rep(T.float, at.hugeArray, { array: true }),
                badTokens: rep(T.token, at.badTokens, { array: true }),
            };
            return FIELD_NAMES.map((name) => [tok(name), values[name]] as const);
        },
        // The pseudo-root has none; /Cube every field; /Cube.points its points.
        fieldSets: [-1, ...FIELD_NAMES.map((_, i) => i), -1, FIELD_NAMES.indexOf("points"), -1],
        paths: {
            total: 6,
            indices: [0, 1, 2, 3, 4],
            elements: [0, tok("Cube"), -tok("points"), tok("Child"), tok("Big")],
            // The root, then /Cube with a child and a sibling, its leaf property, /Child with a
            // sibling only, /Big a leaf.
            jumps: [-1, 2, -2, 0, -2],
        },
        specs: [
            [0, 0, SPEC.pseudoRoot],
            [1, 1, SPEC.prim],
            [2, FIELD_NAMES.length + 2, SPEC.attribute],
        ],
    });
}

/**
 * The reading's failure.
 * @param read - The reading.
 * @returns The rule it names.
 */
function refusal(read: () => unknown): string {
    try {
        read();
    } catch (error) {
        assert.instanceOf(error, ModelReadError);
        return error.rule;
    }
    return assert.fail("read without a refusal");
}

/**
 * The /Cube prim's field of a name.
 * @param file - The layer read.
 * @param name - The field.
 * @returns Its value rep.
 */
function field(file: Crate, name: (typeof FIELD_NAMES)[number]): ValueRep | undefined {
    return file.specs[1].fields.get(name);
}

describe("readCrate", () => {
    it("reads the specs at their paths, from the path tree", () => {
        const file = readCrate(cubeLayer(), BUDGET);
        assert.deepStrictEqual(file.tokens, TOKENS);
        assert.deepStrictEqual(
            file.specs.map((s) => [s.path, s.type, [...s.fields.keys()]]),
            [
                ["/", SPEC.pseudoRoot, []],
                ["/Cube", SPEC.prim, [...FIELD_NAMES]],
                ["/Cube.points", SPEC.attribute, ["points"]],
            ],
        );
        const inherits = file.arcs(field(file, "inheritPaths"));
        assert.deepStrictEqual(inherits, [
            { asset: "", path: "/Cube" },
            { asset: "", path: "/Child" },
        ]);
        assert.deepStrictEqual(file.arcs(field(file, "payloads")), [{ asset: "asset.usd", path: "/Big" }]);
    });

    it("reads text from a token, a string and an asset path, and nothing from other values", () => {
        const file = readCrate(cubeLayer(), BUDGET);
        assert.strictEqual(file.text(field(file, "typeName")), "Mesh");
        assert.strictEqual(file.text(field(file, "label")), "asset.usd");
        assert.strictEqual(file.text(field(file, "asset")), "asset.usd");
        for (const name of ["count", "note", "opOrder"] as const) {
            assert.isUndefined(file.text(field(file, name)), name);
        }
        assert.isUndefined(file.text(undefined));
    });

    it("reads a number from an inline int, uint, float or double and a stored double", () => {
        const file = readCrate(cubeLayer(), BUDGET);
        assert.deepStrictEqual(
            (["count", "ucount", "width", "dbl", "bigDouble"] as const).map((name) => file.number(field(file, name))),
            [-1, 4_000_000_000, 1.5, 0.25, 1e300],
        );
        // A token, a stored string and an array are no number.
        for (const name of ["typeName", "note", "faces"] as const) {
            assert.isUndefined(file.number(field(file, name)), name);
        }
    });

    it("reads number arrays: vec3f flattened, floats, ints, uints and compressed ints", () => {
        const file = readCrate(cubeLayer(), BUDGET);
        const read = (name: (typeof FIELD_NAMES)[number]): number[] | undefined => {
            const values = file.numbers(field(file, name));
            return values === undefined ? undefined : Array.from(values);
        };
        assert.deepStrictEqual(read("points"), [0, 1, 2, 3, 4, 5]);
        assert.deepStrictEqual(read("faces"), [3, -4, 5]);
        assert.deepStrictEqual(read("ucounts"), [4_000_000_000]);
        assert.deepStrictEqual(read("widths"), [0.5, 0.75]);
        // Each delta width: 1 byte, none (the common delta), 2 bytes, 4 bytes.
        assert.deepStrictEqual(read("packedFaces"), [10, 10, 300, 70_000]);
        assert.deepStrictEqual(read("noFaces"), []);
        // Compressed floats are not read; a token array or a single value is no number array.
        for (const name of ["packedFloats", "opOrder", "count", "translate"] as const) {
            assert.isUndefined(read(name), name);
        }
    });

    it("reads a single vector, quaternion or matrix, stored or inline, and a number as a tuple of one", () => {
        const file = readCrate(cubeLayer(), BUDGET);
        assert.deepStrictEqual(file.tuple(field(file, "translate")), [1, 2, 3]);
        assert.deepStrictEqual(file.tuple(field(file, "orient")), [0, 0, 0.5, 1]);
        assert.deepStrictEqual(
            file.tuple(field(file, "matrix")),
            Array.from({ length: 16 }, (_, i) => i + 1),
        );
        // Inline: a small vector as one signed byte per component, a diagonal matrix as its diagonal.
        assert.deepStrictEqual(file.tuple(field(file, "scaleInline")), [1, -2, 3]);
        assert.deepStrictEqual(
            file.tuple(field(file, "matrixInline")),
            [2, 0, 0, 0, 0, 3, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1],
        );
        assert.deepStrictEqual(file.tuple(field(file, "width")), [1.5]);
        assert.isUndefined(file.tuple(field(file, "points")));
        assert.isUndefined(file.tuple(undefined));
    });

    it("reads a token array, empty when it has no payload", () => {
        const file = readCrate(cubeLayer(), BUDGET);
        assert.deepStrictEqual(file.texts(field(file, "opOrder")), ["xformOp:translate", "Mesh"]);
        assert.deepStrictEqual(file.texts(field(file, "noOps")), []);
        assert.isUndefined(file.texts(field(file, "faces")));
        assert.isUndefined(file.texts(field(file, "typeName")));
    });

    it("composes the arcs a list keeps and drops the deleted ones", () => {
        const file = readCrate(cubeLayer(), BUDGET);
        assert.deepStrictEqual(file.arcs(field(file, "references")), [{ asset: "asset.usd", path: "/Cube" }]);
        assert.deepStrictEqual(file.arcs(field(file, "payload")), [{ asset: "asset.usd", path: "/Child" }]);
        for (const name of ["typeName", "faces", "note"] as const) {
            assert.isUndefined(file.arcs(field(file, name)), name);
        }
    });

    it("reads time samples' values in order, and none from another field", () => {
        const file = readCrate(cubeLayer(), BUDGET);
        const anim = field(file, "anim");
        assert.isTrue(isTimeSamples(anim));
        assert.isFalse(isTimeSamples(field(file, "points")));
        assert.deepStrictEqual(
            file.samples(anim).map((value) => file.number(value)),
            [1.5, 2.5],
        );
        assert.deepStrictEqual(file.samples(field(file, "points")), []);
    });

    it("reads the same values from a version 0.6 layer (32-bit array counts, no payload offsets)", () => {
        const now = readCrate(cubeLayer(8), BUDGET);
        const old = readCrate(cubeLayer(6), BUDGET);
        for (const file of [now, old]) {
            assert.deepStrictEqual(Array.from(file.numbers(field(file, "points")) ?? []), [0, 1, 2, 3, 4, 5]);
            assert.deepStrictEqual(file.texts(field(file, "opOrder")), ["xformOp:translate", "Mesh"]);
            assert.deepStrictEqual(file.arcs(field(file, "payloads")), [{ asset: "asset.usd", path: "/Big" }]);
        }
    });

    it("reads a layer with no fields or specs as one with no specs", () => {
        assert.deepStrictEqual(readCrate(crate({ tokens: ["a"] }), BUDGET).specs, []);
        assert.deepStrictEqual(readCrate(crate({ tokens: ["a"], specs: [] }), BUDGET).specs, []);
    });

    it("inflates LZ4 matches, in one chunk or several", () => {
        // One literal "a", then a match one byte back of 4 + 4, then the closing "\0".
        const block = [0x14, 0x61, 1, 0, 0x10, 0];
        const single = { bytes: Uint8Array.from([0, ...block]), size: 10 };
        const stored = new Out();
        stored.bytes([1]);
        stored.i32(block.length);
        stored.bytes(block);
        const chunked = { bytes: stored.done(), size: 10 };
        for (const tokenBlock of [single, chunked]) {
            assert.deepStrictEqual(readCrate(crate({ tokenBlock }), BUDGET).tokens, ["aaaaaaaaa"]);
        }
    });

    it("refuses a damaged LZ4 block", () => {
        const damaged: [string, number[], number][] = [
            ["a literal length cut short", [0, 0xf0], 20],
            ["literals past the input", [0, 0x30, 0x61], 3],
            ["literals past the output", [0, 0x20, 0x61, 0x62], 1],
            ["a match offset cut short", [0, 0x10, 0x61, 1], 8],
            ["a match offset of zero", [0, 0x10, 0x61, 0, 0], 8],
            ["a match before the start", [0, 0x10, 0x61, 2, 0], 8],
            ["a match past the output", [0, 0x10, 0x61, 1, 0], 3],
            ["more chunks than bytes", [5, 0, 0], 8],
            ["a chunk of negative size", [1, 0xff, 0xff, 0xff, 0xff, 0x10, 0x61], 8],
            ["no bytes", [], 8],
        ];
        for (const [what, bytes, size] of damaged) {
            const file = crate({ tokenBlock: { bytes: Uint8Array.from(bytes), size } });
            assert.strictEqual(
                refusal(() => readCrate(file, BUDGET)),
                "usd",
                what,
            );
        }
    });

    it("refuses a layer past the budget, an old version and damaged tables", () => {
        assert.strictEqual(
            refusal(() => readCrate(cubeLayer(), 16)),
            "usd",
        );
        assert.strictEqual(
            refusal(() => readCrate(crate({ minor: 3, tokens: ["a"] }), BUDGET)),
            "usd",
        );
        assert.strictEqual(
            refusal(() => readCrate(new Uint8Array(20), BUDGET)),
            "usd",
        );
        const paths = (total: number, indices: number[]): Uint8Array =>
            crate({
                tokens: ["", "a"],
                paths: { total, indices, elements: indices.map(() => 1), jumps: indices.map(() => -1) },
            });
        assert.strictEqual(
            refusal(() => readCrate(paths(1, [0, 1]), BUDGET)),
            "usd",
            "more paths than the layer holds",
        );
        assert.strictEqual(
            refusal(() => readCrate(paths(2, [0, 5]), BUDGET)),
            "usd",
            "a path index past the table",
        );
        assert.strictEqual(
            refusal(() => readCrate(paths(2, [0, -1]), BUDGET)),
            "usd",
            "a negative path index",
        );

        const tocAt = (bytes: Uint8Array): DataView => {
            const view = new DataView(bytes.buffer);
            return new DataView(bytes.buffer, Number(view.getBigUint64(16, true)));
        };
        const many = crate({ tokens: ["a"] });
        tocAt(many).setBigUint64(0, 1n << 30n, true);
        assert.strictEqual(
            refusal(() => readCrate(many, BUDGET)),
            "usd",
            "a section count past the most",
        );
        const far = crate({ tokens: ["a"] });
        new DataView(far.buffer).setBigUint64(16, 1n << 62n, true);
        assert.strictEqual(
            refusal(() => readCrate(far, BUDGET)),
            "usd",
            "an offset past a safe integer",
        );
    });

    it("refuses a value that points past its data", () => {
        const file = readCrate(cubeLayer(), BUDGET);
        assert.strictEqual(
            refusal(() => file.samples(field(file, "stuck"))),
            "usd",
            "a jump that goes nowhere",
        );
        assert.strictEqual(
            refusal(() => file.numbers(field(file, "hugeArray"))),
            "usd",
            "an array longer than the file",
        );
        assert.strictEqual(
            refusal(() => file.texts(field(file, "badTokens"))),
            "usd",
            "a token past the table",
        );
    });
});

describe("renameCrateTokens", () => {
    it("renames an asset path, and the layer reads with the new name", () => {
        const renamed = renameCrateTokens(cubeLayer(), (t) => (t === "asset.usd" ? "parts/asset.usd" : t), BUDGET);
        const file = readCrate(renamed, BUDGET);
        assert.strictEqual(file.text(field(file, "asset")), "parts/asset.usd");
        assert.deepStrictEqual(file.arcs(field(file, "references")), [{ asset: "parts/asset.usd", path: "/Cube" }]);
    });

    it("returns the file itself when nothing changes or it has no tokens", () => {
        const layer = cubeLayer();
        assert.strictEqual(
            renameCrateTokens(layer, (t) => t, BUDGET),
            layer,
        );
        const bare = crate({ strings: [] });
        assert.strictEqual(
            renameCrateTokens(bare, () => "x", BUDGET),
            bare,
        );
    });

    it("refuses an old version", () => {
        assert.strictEqual(
            refusal(() => renameCrateTokens(crate({ minor: 2, tokens: ["a"] }), (t) => t, BUDGET)),
            "usd",
        );
    });
});
