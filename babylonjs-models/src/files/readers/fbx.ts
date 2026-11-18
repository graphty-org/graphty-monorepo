/**
 * @file Reading an FBX file's node tree, binary or ASCII, for its checks and summary.
 *
 * FBX is a tree of named nodes, each with a list of values and child nodes. A binary file stores
 * them as records with byte offsets and its number arrays deflated; an ASCII file writes them as
 * `Name: value, value { children }`. Both are read into one {@link FbxNode} tree, with every
 * offset, count and nesting level checked before it is used, so a damaged or hostile file is
 * refused (`ModelReadError("fbx")`) rather than read past its end, and a deflated array is never
 * inflated past the size it declares or past the decoded byte budget.
 *
 * Babylon-free and DOM-free; fflate inflates.
 */

import { unzlibSync } from "fflate";

import { ModelReadError } from "./geometry.js";

/** One value of an FBX node: a number, a 64-bit integer (as a bigint), text, raw bytes or a number array. */
export type FbxValue = number | bigint | string | boolean | Uint8Array | ArrayLike<number>;

/** One node of an FBX file. */
export interface FbxNode {
    readonly name: string;
    readonly values: FbxValue[];
    readonly children: FbxNode[];
}

/** The deepest an FBX file's nodes may nest; real files stay under 10. */
const MAX_DEPTH = 64;

/** The binary file's magic, up to the version number. */
const BINARY_MAGIC = "Kaydara FBX Binary  \0";

/**
 * Whether the bytes are a binary FBX file.
 * @param bytes - The file.
 * @returns True when it starts with the binary magic.
 */
export function isBinaryFbx(bytes: Uint8Array): boolean {
    if (bytes.length < 27) {
        return false;
    }

    for (let i = 0; i < BINARY_MAGIC.length; i++) {
        if (bytes[i] !== BINARY_MAGIC.codePointAt(i)) {
            return false;
        }
    }

    return true;
}

/** What reading a binary file shares between its records. */
interface BinaryState {
    readonly bytes: Uint8Array;
    readonly view: DataView;
    readonly wide: boolean;
    /** Bytes the deflated arrays may still decode to. */
    budget: number;
}

const fail = (): never => {
    throw new ModelReadError("fbx");
};

/**
 * A safe integer from a 64-bit field, refusing one past the file.
 * @param state - The file.
 * @param at - Where the field is.
 * @returns The value.
 */
function offsetAt(state: BinaryState, at: number): number {
    const value = state.wide ? Number(state.view.getBigUint64(at, true)) : state.view.getUint32(at, true);
    return value;
}

/** Bytes per element of each binary array type. */
const ARRAY_SIZES: Readonly<Record<string, number>> = { f: 4, d: 8, l: 8, i: 4, b: 1 };

/**
 * Read a number array value.
 * @param state - The file.
 * @param type - The array's type code.
 * @param at - Where its header starts.
 * @returns The array and where the next value starts.
 */
function readArray(state: BinaryState, type: string, at: number): [ArrayLike<number>, number] {
    const { view, bytes } = state;
    if (at + 12 > bytes.length) {
        fail();
    }

    const count = view.getUint32(at, true);
    const encoding = view.getUint32(at + 4, true);
    const stored = view.getUint32(at + 8, true);
    const start = at + 12;
    const end = start + stored;
    const size = ARRAY_SIZES[type];
    const decoded = count * size;
    if (end > bytes.length || decoded > state.budget || (encoding !== 0 && encoding !== 1)) {
        if (decoded > state.budget) {
            throw new ModelReadError("fbx-size");
        }
        fail();
    }

    state.budget -= decoded;
    let raw: Uint8Array;
    if (encoding === 0) {
        if (stored !== decoded) {
            fail();
        }
        raw = bytes.slice(start, end);
    } else {
        raw = new Uint8Array(decoded);
        try {
            // Inflated into a buffer of the declared size: a stream that says more is cut there.
            unzlibSync(bytes.subarray(start, end), { out: raw });
        } catch {
            fail();
        }
    }

    const { buffer } = raw;
    switch (type) {
        case "f":
            return [new Float32Array(buffer, raw.byteOffset, count), end];
        case "d":
            return [new Float64Array(buffer, raw.byteOffset, count), end];
        case "i":
            return [new Int32Array(buffer, raw.byteOffset, count), end];
        case "l": {
            const longs = new BigInt64Array(buffer, raw.byteOffset, count);
            return [Float64Array.from(longs, Number), end];
        }
        default:
            return [raw, end];
    }
}

/**
 * Read one value of a binary record.
 * @param state - The file.
 * @param at - Where it starts.
 * @returns The value and where the next starts.
 */
function readValue(state: BinaryState, at: number): [FbxValue, number] {
    const { view, bytes } = state;
    if (at >= bytes.length) {
        fail();
    }

    const type = String.fromCodePoint(bytes[at]);
    const body = at + 1;
    const need = (n: number): void => {
        if (body + n > bytes.length) {
            fail();
        }
    };
    switch (type) {
        case "Y":
            need(2);
            return [view.getInt16(body, true), body + 2];
        case "C":
            need(1);
            return [bytes[body] !== 0, body + 1];
        case "I":
            need(4);
            return [view.getInt32(body, true), body + 4];
        case "F":
            need(4);
            return [view.getFloat32(body, true), body + 4];
        case "D":
            need(8);
            return [view.getFloat64(body, true), body + 8];
        case "L":
            need(8);
            return [view.getBigInt64(body, true), body + 8];
        case "S":
        case "R": {
            need(4);
            const length = view.getUint32(body, true);
            need(4 + length);
            const raw = bytes.subarray(body + 4, body + 4 + length);
            return [type === "S" ? new TextDecoder().decode(raw) : raw.slice(), body + 4 + length];
        }
        default:
            if (type in ARRAY_SIZES) {
                return readArray(state, type, body);
            }
            return fail();
    }
}

/**
 * Read one record's name and values.
 * @param state - The file.
 * @param offset - Where the record starts.
 * @param recordEnd - Where it ends.
 * @returns Its name, its values, and where its children start.
 */
function readHead(state: BinaryState, offset: number, recordEnd: number): [string, FbxValue[], number] {
    const word = state.wide ? 8 : 4;
    const valueCount = offsetAt(state, offset + word);
    const nameLength = state.bytes[offset + 3 * word];
    const nameStart = offset + 3 * word + 1;
    if (nameStart + nameLength > recordEnd) {
        fail();
    }

    const name = String.fromCodePoint(...state.bytes.subarray(nameStart, nameStart + nameLength));
    let cursor = nameStart + nameLength;
    const values: FbxValue[] = [];
    for (let i = 0; i < valueCount; i++) {
        const [value, next] = readValue(state, cursor);
        if (next > recordEnd) {
            fail();
        }
        values.push(value);
        cursor = next;
    }

    return [name, values, cursor];
}

/**
 * Read the records from `at` up to `end` (or a null record).
 * @param state - The file.
 * @param at - Where the first record starts.
 * @param end - Where the list must end.
 * @param depth - How deep the list is.
 * @returns The nodes.
 */
function readRecords(state: BinaryState, at: number, end: number, depth: number): FbxNode[] {
    if (depth > MAX_DEPTH) {
        fail();
    }

    const header = state.wide ? 25 : 13;
    const nodes: FbxNode[] = [];
    let offset = at;
    while (offset + header <= end) {
        const recordEnd = offsetAt(state, offset);
        if (recordEnd === 0) {
            // The null record that closes a list.
            return nodes;
        }

        if (recordEnd <= offset || recordEnd > end) {
            fail();
        }

        const [name, values, cursor] = readHead(state, offset, recordEnd);
        const children = cursor < recordEnd ? readRecords(state, cursor, recordEnd, depth + 1) : [];
        nodes.push({ name, values, children });
        offset = recordEnd;
    }

    return nodes;
}

/**
 * Read a binary FBX file's top-level nodes.
 * @param bytes - The file.
 * @param budget - The most bytes its deflated arrays may decode to together.
 * @returns The nodes and the file's version (7400 for 7.4).
 */
function readBinary(bytes: Uint8Array, budget: number): { nodes: FbxNode[]; version: number } {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const version = view.getUint32(23, true);
    const state: BinaryState = { bytes, view, wide: version >= 7500, budget };
    return { nodes: readRecords(state, 27, bytes.length, 0), version };
}

/** One token of an ASCII FBX file. */
type Token =
    | { readonly kind: "key"; readonly text: string }
    | { readonly kind: "value"; readonly value: FbxValue }
    | { readonly kind: "open" | "close" | "comma" | "line" };

/** A number as FBX ASCII writes one. */
const NUMBER = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;

/** The one-character tokens. */
const PUNCTUATION: Readonly<Record<string, Token>> = {
    "\n": { kind: "line" },
    "{": { kind: "open" },
    "}": { kind: "close" },
    ",": { kind: "comma" },
};

/** What ends a bare word. */
const WORD_END = ' \t\r\n,{}";';

/**
 * Read one token that is not punctuation: a quoted string, a key, a number or a bare word.
 * @param text - The file.
 * @param i - Where it starts.
 * @returns The token (none for an array's length) and where the next starts.
 */
function readWord(text: string, i: number): [Token | undefined, number] {
    if (text[i] === '"') {
        const end = text.indexOf('"', i + 1);
        if (end < 0) {
            fail();
        }
        return [{ kind: "value", value: text.slice(i + 1, end).replaceAll("&quot;", '"') }, end + 1];
    }

    let end = i;
    while (end < text.length && !WORD_END.includes(text[end])) {
        end++;
    }
    const word = text.slice(i, end);
    const next = Math.max(end, i + 1);
    if (word.endsWith(":")) {
        return [{ kind: "key", text: word.slice(0, -1) }, next];
    }

    // An array's length, `*24 {`: its values follow in an `a:` child.
    return word.startsWith("*")
        ? [undefined, next]
        : [{ kind: "value", value: NUMBER.test(word) ? Number(word) : word }, next];
}

/**
 * Split an ASCII FBX file into tokens, in one pass.
 * @param text - The file.
 * @returns The tokens.
 */
function tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < text.length) {
        const c = text[i];
        const punctuation = PUNCTUATION[c];
        if (punctuation !== undefined) {
            tokens.push(punctuation);
            i++;
        } else if (c === " " || c === "\t" || c === "\r") {
            i++;
        } else if (c === ";") {
            const end = text.indexOf("\n", i);
            i = end < 0 ? text.length : end;
        } else {
            const [token, next] = readWord(text, i);
            if (token !== undefined) {
                tokens.push(token);
            }
            i = next;
        }
    }

    return tokens;
}

/** Builds the node tree from ASCII tokens, one at a time. */
class AsciiTree {
    readonly root: FbxNode = { name: "", values: [], children: [] };
    private readonly stack: FbxNode[] = [this.root];
    private current: FbxNode | undefined;
    /** After a comma, a value may continue on the next line (FBX 6 writes long arrays that way). */
    private continued = false;

    take(token: Token): void {
        switch (token.kind) {
            case "key":
                this.current = { name: token.text, values: [], children: [] };
                (this.stack.at(-1) as FbxNode).children.push(this.current);
                this.continued = false;
                break;
            case "value":
                (this.current ?? fail()).values.push(token.value);
                this.continued = false;
                break;
            case "comma":
                this.continued = true;
                break;
            case "line":
                this.current = this.continued ? this.current : undefined;
                break;
            case "open":
                if (this.stack.length > MAX_DEPTH) {
                    fail();
                }
                this.stack.push(this.current ?? fail());
                this.close();
                break;
            default:
                if (this.stack.length === 1) {
                    fail();
                }
                this.stack.pop();
                this.close();
                break;
        }
    }

    finish(): FbxNode[] {
        if (this.stack.length !== 1) {
            fail();
        }
        return this.root.children;
    }

    private close(): void {
        this.current = undefined;
        this.continued = false;
    }
}

/**
 * Turn `Vertices: *24 { a: 1,2,3 }` into a node whose value is the array, below a node.
 * @param node - The node.
 */
function foldArrays(node: FbxNode): void {
    const [only] = node.children;
    if (node.values.length === 0 && node.children.length === 1 && only.name === "a") {
        node.values.push(Float64Array.from(only.values, (v) => (typeof v === "number" ? v : Number.NaN)));
        node.children.length = 0;
    }
    for (const child of node.children) {
        foldArrays(child);
    }
}

/**
 * Build nodes from ASCII tokens.
 * @param tokens - The tokens.
 * @returns The top-level nodes.
 */
function readAscii(tokens: readonly Token[]): FbxNode[] {
    const tree = new AsciiTree();
    for (const token of tokens) {
        tree.take(token);
    }
    const nodes = tree.finish();
    for (const node of nodes) {
        foldArrays(node);
    }
    return nodes;
}

/** An FBX file read: its top-level nodes and its version. */
export interface FbxFile {
    readonly nodes: readonly FbxNode[];
    /** 7400 for FBX 7.4, 6100 for 6.1. */
    readonly version: number;
    readonly binary: boolean;
}

/**
 * Read an FBX file, binary or ASCII.
 * @param bytes - The file.
 * @param budget - The most bytes a binary file's deflated arrays may decode to together.
 * @returns The file's nodes.
 * @throws {ModelReadError} `"fbx"` for a damaged file, `"fbx-size"` past the budget.
 */
export function readFbx(bytes: Uint8Array, budget: number): FbxFile {
    if (isBinaryFbx(bytes)) {
        return { ...readBinary(bytes, budget), binary: true };
    }

    const nodes = readAscii(tokenize(new TextDecoder().decode(bytes)));
    const header = nodes.find((n) => n.name === "FBXHeaderExtension");
    const version = header?.children.find((n) => n.name === "FBXVersion")?.values[0];
    return { nodes, version: typeof version === "number" ? version : 0, binary: false };
}

/**
 * A node's name without its class: binary files write `Name\0\x01Class`, ASCII ones `Class::Name`.
 * @param value - The name as written.
 * @returns The name.
 */
export function fbxName(value: FbxValue | undefined): string {
    if (typeof value !== "string") {
        return "";
    }

    const binary = value.indexOf("\0\u0001");
    if (binary >= 0) {
        return value.slice(0, binary);
    }

    const ascii = value.indexOf("::");
    return ascii >= 0 ? value.slice(ascii + 2) : value;
}

/**
 * An object's id as a string key (ids are 64-bit; ASCII files may name objects by their name).
 * @param value - The id as written.
 * @returns The key.
 */
export function fbxId(value: FbxValue | undefined): string {
    return typeof value === "bigint" || typeof value === "number" || typeof value === "string" ? String(value) : "";
}
