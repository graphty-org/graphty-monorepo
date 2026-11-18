/**
 * @file Reading a binary USD layer (a `.usdc` "crate" file) far enough for its checks and summary:
 * its tokens, its specs (each prim and property, by path) and the values of the few fields a
 * summary reads -- a prim's type, an attribute's ints, points and asset path, the layer's
 * metadata.
 *
 * A crate file is a table of contents of sections (TOKENS, STRINGS, FIELDS, FIELDSETS, PATHS,
 * SPECS), most of them LZ4-compressed integer runs. Every count, offset and decompressed size is
 * checked against the file and a byte budget before it is used, so a damaged or hostile file is
 * refused (`ModelReadError("usd")`) rather than read past its end or inflated without bound. The
 * layout follows OpenUSD's `crateFile.cpp` (and three.js's USDCParser, MIT, which reads it too).
 *
 * Babylon-free and DOM-free.
 */

import { ModelReadError } from "./geometry.js";

const fail = (): never => {
    throw new ModelReadError("usd");
};

/** The type codes of crate values this reader reads (crateDataTypes.h). */
const TYPE = {
    int: 3,
    uint: 4,
    float: 8,
    double: 9,
    string: 10,
    token: 11,
    assetPath: 12,
    vec3f: 24,
    timeSamples: 46,
} as const;

/** The SdfSpecType of a prim, an attribute and the layer's pseudo-root. */
export const SPEC = { attribute: 1, prim: 6, pseudoRoot: 7 } as const;

/** A 64-bit packed value: its type, flags and payload (an inline value or a file offset). */
export interface ValueRep {
    readonly type: number;
    readonly array: boolean;
    readonly inline: boolean;
    readonly compressed: boolean;
    readonly payload: number;
}

/** One spec: a prim, a property or the pseudo-root, with its fields by name. */
export interface CrateSpec {
    readonly path: string;
    readonly type: number;
    readonly fields: ReadonlyMap<string, ValueRep>;
}

/** A crate file read. */
export interface Crate {
    readonly tokens: readonly string[];
    readonly specs: readonly CrateSpec[];
    /** A field's value as text: a token, a string or an asset path. */
    text(rep: ValueRep | undefined): string | undefined;
    /** A field's value as a number (int, float or double). */
    number(rep: ValueRep | undefined): number | undefined;
    /** A field's value as a number array (int, float or vec3f, flattened). */
    numbers(rep: ValueRep | undefined): ArrayLike<number> | undefined;
}

/** A cursor over the file. */
class Reader {
    readonly view: DataView;
    at = 0;

    constructor(readonly bytes: Uint8Array) {
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }

    need(n: number): void {
        if (n < 0 || this.at + n > this.bytes.length) {
            fail();
        }
    }

    u32(): number {
        this.need(4);
        const v = this.view.getUint32(this.at, true);
        this.at += 4;
        return v;
    }

    u64(): number {
        this.need(8);
        const v = this.view.getBigUint64(this.at, true);
        this.at += 8;
        return v > BigInt(Number.MAX_SAFE_INTEGER) ? fail() : Number(v);
    }

    take(n: number): Uint8Array {
        this.need(n);
        const out = this.bytes.subarray(this.at, this.at + n);
        this.at += n;
        return out;
    }
}

/**
 * Decompress one LZ4 block into `output[from, to)`, never writing past `to`.
 * @param input - The compressed bytes.
 * @param output - Where the bytes go.
 * @param from - Where in `output` to start.
 * @param to - Where in `output` to stop.
 */
function lz4Block(input: Uint8Array, output: Uint8Array, from: number, to: number): void {
    let i = 0;
    let o = from;
    const length = (start: number): number => {
        let n = start;
        if (n === 15) {
            let b: number;
            do {
                if (i >= input.length) {
                    fail();
                }
                b = input[i++];
                n += b;
            } while (b === 255);
        }
        return n;
    };
    while (i < input.length) {
        const token = input[i++];
        const literals = length(token >> 4);
        if (i + literals > input.length || o + literals > to) {
            fail();
        }
        output.set(input.subarray(i, i + literals), o);
        i += literals;
        o += literals;
        if (i >= input.length) {
            return;
        }
        if (i + 2 > input.length) {
            fail();
        }
        const offset = input[i] | (input[i + 1] << 8);
        i += 2;
        const match = length(token & 15) + 4;
        if (offset === 0 || o - offset < from || o + match > to) {
            fail();
        }
        for (let k = 0; k < match; k++, o++) {
            output[o] = output[o - offset];
        }
    }
}

/** What reading shares: the bytes the decompressed sections may still take. */
interface Budget {
    left: number;
}

/**
 * Decompress OpenUSD's TfFastCompression (LZ4 in chunks of at most 2 GB, with a chunk count first).
 * @param input - The compressed bytes.
 * @param size - The size it decompresses to.
 * @param budget - The bytes left to decompress into.
 * @returns The bytes.
 */
function decompress(input: Uint8Array, size: number, budget: Budget): Uint8Array {
    if (size > budget.left || input.length === 0) {
        fail();
    }

    budget.left -= size;
    const output = new Uint8Array(size);
    const chunks = input[0];
    if (chunks === 0) {
        lz4Block(input.subarray(1), output, 0, size);
        return output;
    }

    let at = 1 + 4 * chunks;
    if (at > input.length) {
        fail();
    }
    let o = 0;
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    for (let c = 0; c < chunks; c++) {
        const stored = view.getInt32(1 + 4 * c, true);
        if (stored < 0 || at + stored > input.length) {
            fail();
        }
        const chunk = Math.min(size - o, 0x7e000000);
        lz4Block(input.subarray(at, at + stored), output, o, o + chunk);
        at += stored;
        o += chunk;
    }

    return output;
}

/**
 * Read a run of compressed 32-bit integers (OpenUSD's integer coding over LZ4).
 * @param reader - The cursor, at the run's compressed size.
 * @param count - How many integers.
 * @param budget - The bytes left to decompress into.
 * @returns The integers.
 */
function readInts(reader: Reader, count: number, budget: Budget): Int32Array {
    const stored = reader.u64();
    const input = reader.take(stored);
    if (count === 0) {
        return new Int32Array(0);
    }
    const codes = (count * 2 + 7) >> 3;
    const data = decompress(input, 4 + codes + count * 4, budget);
    const view = new DataView(data.buffer);
    const common = view.getInt32(0, true);
    const out = new Int32Array(count);
    let value = 0;
    let at = 4 + codes;
    for (let i = 0; i < count; i++) {
        const code = (data[4 + (i >> 2)] >> ((i & 3) * 2)) & 3;
        const width = [0, 1, 2, 4][code];
        if (at + width > data.length) {
            fail();
        }
        if (code === 0) {
            value += common;
        } else if (code === 1) {
            value += view.getInt8(at);
        } else if (code === 2) {
            value += view.getInt16(at, true);
        } else {
            value += view.getInt32(at, true);
        }
        at += width;
        out[i] = value;
    }

    return out;
}

/** The most entries any one section may declare: far beyond a real layer, below what a tab can hold. */
const MAX_COUNT = 1 << 26;

/**
 * A count from the file, refused past {@link MAX_COUNT}.
 * @param reader - The cursor.
 * @returns The count.
 */
function count(reader: Reader): number {
    const n = reader.u64();
    return n > MAX_COUNT ? fail() : n;
}

/**
 * Build the path of each path index from the compressed path tree.
 * @param indices - Each entry's path index.
 * @param elements - Each entry's element token (negative for a property).
 * @param jumps - Each entry's jump: -2 a leaf, -1 a child only, 0 a sibling only, more both.
 * @param tokens - The tokens.
 * @returns The paths by index.
 */
function buildPaths(indices: Int32Array, elements: Int32Array, jumps: Int32Array, tokens: readonly string[]): string[] {
    const paths = Array.from<string>({ length: indices.length }).fill("");
    // An explicit stack instead of recursion: a hostile file cannot run the call stack out.
    const pending: (readonly [number, string])[] = [[0, ""]];
    let steps = 0;
    while (pending.length > 0) {
        let [i, parent] = pending.pop() as readonly [number, string];
        for (; i < indices.length; i++) {
            steps++;
            const index = indices[i];
            if (steps > indices.length * 2 || index < 0 || index >= paths.length) {
                fail();
            }
            const path = pathOf(parent, elements[i], tokens);
            paths[index] = path;
            const jump = jumps[i];
            if (jump > 0) {
                pending.push([i + jump, parent]);
            }
            if (jump === -2) {
                break;
            }
            // -1 and a positive jump: the next entry is this one's child; 0: its sibling.
            parent = jump === 0 ? parent : path;
        }
    }

    return paths;
}

/**
 * One entry's path below its parent's.
 * @param parent - The parent's path ("" for the root).
 * @param element - The element token's index, negative for a property.
 * @param tokens - The tokens.
 * @returns The path.
 */
function pathOf(parent: string, element: number, tokens: readonly string[]): string {
    if (parent === "") {
        return "/";
    }

    const name = tokens[Math.abs(element)] ?? "";
    if (element < 0) {
        return `${parent}.${name}`;
    }

    return parent === "/" ? `/${name}` : `${parent}/${name}`;
}

/**
 * A field's packed value.
 * @param lo - Its low 32 bits.
 * @param hi - Its high 32 bits.
 * @returns The value rep.
 */
function valueRep(lo: number, hi: number): ValueRep {
    return {
        type: (hi >>> 16) & 0xff,
        array: (hi & 0x80000000) !== 0,
        inline: (hi & 0x40000000) !== 0,
        compressed: (hi & 0x20000000) !== 0,
        payload: lo + (hi & 0xffff) * 0x100000000,
    };
}

/**
 * A float from its 32 bits.
 * @param bits - The bits.
 * @returns The float.
 */
function floatOf(bits: number): number {
    return new Float32Array(Uint32Array.of(bits).buffer)[0];
}

/** A crate file being read: its sections in order, then its values on demand. */
class CrateReader implements Crate {
    tokens: string[] = [];
    readonly specs: CrateSpec[] = [];
    private readonly reader: Reader;
    private readonly left: Budget;
    private readonly minor: number;
    private readonly sections = new Map<string, number>();
    private strings: Int32Array = new Int32Array(0);
    private readonly fieldNames: string[] = [];
    private readonly fieldReps: ValueRep[] = [];
    private readonly fieldSets: Int32Array = new Int32Array(0);
    private paths: string[] = [];

    constructor(bytes: Uint8Array, budget: number) {
        this.reader = new Reader(bytes);
        this.left = { left: budget };
        this.reader.need(24);
        this.minor = bytes[9];
        if (bytes[8] !== 0 || this.minor < 4) {
            // Files before 0.4.0 (2017) store their sections uncompressed; OpenUSD writes 0.8 today.
            fail();
        }

        this.readToc();
        this.readTokens();
        this.readStrings();
        this.readFields();
        if (this.seek("FIELDSETS")) {
            this.fieldSets = readInts(this.reader, count(this.reader), this.left);
        }
        this.readPaths();
        this.readSpecs();
    }

    text(rep: ValueRep | undefined): string | undefined {
        if (rep === undefined || rep.array || !rep.inline) {
            return undefined;
        }
        if (rep.type === TYPE.token || rep.type === TYPE.assetPath) {
            return this.tokens[rep.payload];
        }
        return rep.type === TYPE.string ? this.tokens[this.strings[rep.payload]] : undefined;
    }

    number(rep: ValueRep | undefined): number | undefined {
        if (rep === undefined || rep.array) {
            return undefined;
        }
        if (rep.inline) {
            return inlineNumber(rep);
        }
        if (rep.type !== TYPE.double) {
            return undefined;
        }
        this.reader.at = rep.payload;
        this.reader.need(8);
        return this.reader.view.getFloat64(rep.payload, true);
    }

    numbers(rep: ValueRep | undefined): ArrayLike<number> | undefined {
        if (rep?.array !== true || rep.inline || !NUMBER_ARRAYS.has(rep.type)) {
            return undefined;
        }
        if (rep.payload === 0) {
            return [];
        }
        const { reader } = this;
        reader.at = rep.payload;
        const n = this.minor < 7 ? reader.u32() : reader.u64();
        const width = rep.type === TYPE.vec3f ? 3 : 1;
        if (n > MAX_COUNT || n * 4 * width > this.left.left) {
            fail();
        }
        if (rep.compressed) {
            // Compressed floats ('i' as ints, 't' through a table) are not needed for a summary.
            return rep.type === TYPE.int || rep.type === TYPE.uint ? readInts(reader, n, this.left) : undefined;
        }
        reader.need(n * 4 * width);
        const read = ELEMENT_READERS[rep.type] ?? ELEMENT_READERS[TYPE.float];
        return Float32Array.from({ length: n * width }, (_, i) => read(reader.view, reader.at + i * 4));
    }

    private seek(name: string): boolean {
        const at = this.sections.get(name);
        if (at !== undefined) {
            this.reader.at = at;
        }
        return at !== undefined;
    }

    private readToc(): void {
        const { reader } = this;
        reader.at = 16;
        reader.at = reader.u64();
        for (let n = count(reader), s = 0; s < n; s++) {
            const name = new TextDecoder().decode(reader.take(16)).replace(/\0.*$/s, "");
            const start = reader.u64();
            reader.u64();
            this.sections.set(name, start);
        }
    }

    private readTokens(): void {
        if (this.seek("TOKENS")) {
            const n = count(this.reader);
            const size = this.reader.u64();
            const bytes = decompress(this.reader.take(this.reader.u64()), size, this.left);
            this.tokens = new TextDecoder().decode(bytes).split("\0").slice(0, n);
        }
    }

    private readStrings(): void {
        if (this.seek("STRINGS")) {
            const n = count(this.reader);
            this.strings = Int32Array.from({ length: n }, () => this.reader.u32());
        }
    }

    private readFields(): void {
        if (!this.seek("FIELDS")) {
            return;
        }
        const n = count(this.reader);
        const names = readInts(this.reader, n, this.left);
        const reps = decompress(this.reader.take(this.reader.u64()), n * 8, this.left);
        const view = new DataView(reps.buffer);
        for (let i = 0; i < n; i++) {
            this.fieldNames.push(this.tokens[names[i]] ?? "");
            this.fieldReps.push(valueRep(view.getUint32(i * 8, true), view.getUint32(i * 8 + 4, true)));
        }
    }

    private readPaths(): void {
        if (this.seek("PATHS")) {
            count(this.reader);
            const n = count(this.reader);
            const indices = readInts(this.reader, n, this.left);
            const elements = readInts(this.reader, n, this.left);
            const jumps = readInts(this.reader, n, this.left);
            this.paths = buildPaths(indices, elements, jumps, this.tokens);
        }
    }

    private readSpecs(): void {
        if (!this.seek("SPECS")) {
            return;
        }
        const n = count(this.reader);
        const pathOfSpec = readInts(this.reader, n, this.left);
        const setOf = readInts(this.reader, n, this.left);
        const typeOf = readInts(this.reader, n, this.left);
        for (let i = 0; i < n; i++) {
            this.specs.push({
                path: this.paths[pathOfSpec[i]] ?? "",
                type: typeOf[i],
                fields: this.fieldsOf(setOf[i]),
            });
        }
    }

    private fieldsOf(start: number): Map<string, ValueRep> {
        const fields = new Map<string, ValueRep>();
        const { fieldSets, fieldNames, fieldReps } = this;
        for (let f = start; f >= 0 && f < fieldSets.length && fieldSets[f] >= 0; f++) {
            const field = fieldSets[f];
            if (field < fieldNames.length) {
                fields.set(fieldNames[field], fieldReps[field]);
            }
        }
        return fields;
    }
}

/** The array types {@link CrateReader.numbers} reads. */
const NUMBER_ARRAYS: ReadonlySet<number> = new Set([TYPE.int, TYPE.uint, TYPE.float, TYPE.vec3f]);

/** How one element of each number array type is read. */
const ELEMENT_READERS: Readonly<Record<number, (view: DataView, at: number) => number>> = {
    [TYPE.int]: (view, at) => view.getInt32(at, true),
    [TYPE.uint]: (view, at) => view.getUint32(at, true),
    [TYPE.float]: (view, at) => view.getFloat32(at, true),
    [TYPE.vec3f]: (view, at) => view.getFloat32(at, true),
};

/**
 * An inline number: a float or double is stored as a float's bits, an int as itself.
 * @param rep - The value.
 * @returns The number, or undefined for another type.
 */
function inlineNumber(rep: ValueRep): number | undefined {
    const lo = rep.payload % 0x100000000;
    switch (rep.type) {
        case TYPE.float:
        case TYPE.double:
            return floatOf(lo);
        case TYPE.int:
            return new Int32Array(Uint32Array.of(lo).buffer)[0];
        case TYPE.uint:
            return lo;
        default:
            return undefined;
    }
}

/**
 * Read a crate file.
 * @param bytes - The file.
 * @param budget - The most bytes its compressed sections and arrays may decompress to.
 * @returns The crate.
 * @throws {ModelReadError} `"usd"` for a damaged file or one past the budget.
 */
export function readCrate(bytes: Uint8Array, budget: number): Crate {
    return new CrateReader(bytes, budget);
}

/**
 * Whether a field holds time samples (an animated attribute).
 * @param rep - The field.
 * @returns True for time samples.
 */
export function isTimeSamples(rep: ValueRep | undefined): boolean {
    return rep?.type === TYPE.timeSamples;
}
