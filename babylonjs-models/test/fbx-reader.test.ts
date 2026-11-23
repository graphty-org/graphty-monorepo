/**
 * The FBX node-tree reader over small files written here: every binary value type, number arrays
 * stored raw or deflated, the 32-bit (7.4) and 64-bit (7.5) record layouts, ASCII files with
 * comments, quoted names, arrays and continued lines, the name and id helpers, and the damaged
 * files each form refuses.
 */

import { deflateSync } from "node:zlib";

import { assert, describe, it } from "vitest";

import { fbxId, fbxName, isBinaryFbx, readFbx } from "../src/files/readers/fbx.js";
import { ModelReadError } from "../src/files/readers/geometry.js";

const BUDGET = 1 << 20;
const MAGIC = "Kaydara FBX Binary  \0";

/**
 * Bytes laid out by a DataView writer.
 * @param size - How many.
 * @param set - Writes them.
 * @returns The bytes.
 */
function bytesOf(size: number, set: (view: DataView) => void): Uint8Array {
    const out = new Uint8Array(size);
    set(new DataView(out.buffer));
    return out;
}

/**
 * Join byte runs.
 * @param parts - The runs.
 * @returns One run.
 */
function concat(parts: readonly Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const part of parts) {
        out.set(part, at);
        at += part.length;
    }
    return out;
}

const latin1 = (text: string): Uint8Array => Uint8Array.from(text, (c) => c.codePointAt(0) ?? 0);
const typed = (code: string, body: Uint8Array): Uint8Array => concat([latin1(code), body]);

/** One binary value of each type, as FBX writes it. */
const V = {
    Y: (n: number) =>
        typed(
            "Y",
            bytesOf(2, (v) => v.setInt16(0, n, true)),
        ),
    C: (b: boolean) => typed("C", Uint8Array.of(b ? 1 : 0)),
    I: (n: number) =>
        typed(
            "I",
            bytesOf(4, (v) => v.setInt32(0, n, true)),
        ),
    F: (n: number) =>
        typed(
            "F",
            bytesOf(4, (v) => v.setFloat32(0, n, true)),
        ),
    D: (n: number) =>
        typed(
            "D",
            bytesOf(8, (v) => v.setFloat64(0, n, true)),
        ),
    L: (n: bigint) =>
        typed(
            "L",
            bytesOf(8, (v) => v.setBigInt64(0, n, true)),
        ),
    S: (text: string) => typed("S", concat([bytesOf(4, (v) => v.setUint32(0, text.length, true)), latin1(text)])),
    R: (raw: Uint8Array) => typed("R", concat([bytesOf(4, (v) => v.setUint32(0, raw.length, true)), raw])),
    /** A number array: its count, encoding (0 raw, 1 deflated), stored size, then its bytes. */
    array: (code: string, count: number, raw: Uint8Array, deflated = false, encoding = deflated ? 1 : 0) => {
        const stored = deflated ? new Uint8Array(deflateSync(raw)) : raw;
        const head = bytesOf(12, (v) => {
            v.setUint32(0, count, true);
            v.setUint32(4, encoding, true);
            v.setUint32(8, stored.length, true);
        });
        return typed(code, concat([head, stored]));
    },
};

/** A binary record to write. */
interface Rec {
    readonly name: string;
    readonly values?: readonly Uint8Array[];
    readonly children?: readonly Rec[];
}

/**
 * Write a binary FBX file.
 * @param records - Its top-level records.
 * @param options - The version (7500 and up: 64-bit offsets) and whether a null record closes the top level.
 * @returns The file.
 */
function binary(records: readonly Rec[], options: { version?: number; close?: boolean } = {}): Uint8Array {
    const version = options.version ?? 7400;
    const word = version >= 7500 ? 8 : 4;
    const head = 3 * word + 1;
    const parts: Uint8Array[] = [
        latin1(MAGIC),
        Uint8Array.of(0x1a, 0),
        bytesOf(4, (v) => v.setUint32(0, version, true)),
    ];
    let offset = 27;
    const setWord = (view: DataView, at: number, n: number): void => {
        if (word === 8) {
            view.setBigUint64(at, BigInt(n), true);
        } else {
            view.setUint32(at, n, true);
        }
    };
    const write = (record: Rec): void => {
        const header = new Uint8Array(head);
        const name = latin1(record.name);
        const values = concat(record.values ?? []);
        parts.push(header, name, values);
        offset += head + name.length + values.length;
        const children = record.children ?? [];
        children.forEach(write);
        if (children.length > 0) {
            parts.push(new Uint8Array(head));
            offset += head;
        }
        const view = new DataView(header.buffer);
        setWord(view, 0, offset);
        setWord(view, word, record.values?.length ?? 0);
        setWord(view, 2 * word, values.length);
        header[3 * word] = name.length;
    };
    records.forEach(write);
    if (options.close !== false) {
        parts.push(new Uint8Array(head));
    }
    return concat(parts);
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

const ascii = (text: string): Uint8Array => new TextEncoder().encode(text);

describe("readFbx, binary", () => {
    it("reads a value of every scalar type", () => {
        const raw = Uint8Array.of(9, 8, 7);
        const file = readFbx(
            binary([
                {
                    name: "Model",
                    values: [
                        V.Y(-2),
                        V.C(true),
                        V.I(7),
                        V.F(1.5),
                        V.D(2.25),
                        V.L(1n << 40n),
                        V.S("Cube\0\u0001Model"),
                        V.R(raw),
                    ],
                },
            ]),
            BUDGET,
        );
        assert.deepStrictEqual(file.nodes, [
            {
                name: "Model",
                values: [-2, true, 7, 1.5, 2.25, 1n << 40n, "Cube\0\u0001Model", raw],
                children: [],
            },
        ]);
        assert.deepStrictEqual([file.version, file.binary], [7400, true]);
    });

    it("reads number arrays stored raw or deflated", () => {
        const floats = new Uint8Array(Float32Array.of(1.5, -2).buffer);
        const doubles = new Uint8Array(Float64Array.of(0.25, 3).buffer);
        const ints = new Uint8Array(Int32Array.of(-1, 2, 3).buffer);
        const longs = new Uint8Array(BigInt64Array.of(5n, -6n).buffer);
        const flags = Uint8Array.of(1, 0, 1);
        for (const deflated of [false, true]) {
            const [node] = readFbx(
                binary([
                    {
                        name: "Geometry",
                        values: [
                            V.array("f", 2, floats, deflated),
                            V.array("d", 2, doubles, deflated),
                            V.array("i", 3, ints, deflated),
                            V.array("l", 2, longs, deflated),
                            V.array("b", 3, flags, deflated),
                        ],
                    },
                ]),
                BUDGET,
            ).nodes;
            assert.deepStrictEqual(
                node.values.map((v) => Array.from(v as ArrayLike<number>)),
                [
                    [1.5, -2],
                    [0.25, 3],
                    [-1, 2, 3],
                    [5, -6],
                    [1, 0, 1],
                ],
                deflated ? "deflated" : "raw",
            );
        }
    });

    it("reads nested records the same from a 7.4 and a 7.5 (64-bit) file", () => {
        const tree: Rec[] = [
            {
                name: "Objects",
                children: [{ name: "Model", values: [V.L(100n)], children: [{ name: "Version", values: [V.I(232)] }] }],
            },
            { name: "Connections" },
        ];
        const expected = [
            {
                name: "Objects",
                values: [],
                children: [
                    { name: "Model", values: [100n], children: [{ name: "Version", values: [232], children: [] }] },
                ],
            },
            { name: "Connections", values: [], children: [] },
        ];
        for (const version of [7400, 7500]) {
            const file = readFbx(binary(tree, { version }), BUDGET);
            assert.deepStrictEqual(file.nodes, expected, String(version));
            assert.strictEqual(file.version, version);
        }
        // A file that ends without the closing null record reads the same.
        assert.deepStrictEqual(readFbx(binary(tree, { close: false }), BUDGET).nodes, expected);
    });

    it("refuses damaged values", () => {
        const four = new Uint8Array(new Float32Array(1).buffer);
        const damaged: [string, Uint8Array][] = [
            ["an unknown type code", binary([{ name: "N", values: [typed("Z", Uint8Array.of(0))] }])],
            [
                "a raw array whose stored size is not its count's",
                binary([{ name: "N", values: [V.array("f", 2, four)] }]),
            ],
            ["an array of an unknown encoding", binary([{ name: "N", values: [V.array("f", 1, four, false, 2)] }])],
            [
                "a deflated array that is not deflate",
                binary([{ name: "N", values: [V.array("f", 1, four, false, 1)] }]),
            ],
            [
                "an int cut off at the end",
                binary([{ name: "N", values: [typed("I", Uint8Array.of(1, 2))] }], { close: false }),
            ],
            [
                "an array header cut off at the end",
                binary([{ name: "N", values: [typed("f", Uint8Array.of(1, 0, 0))] }], { close: false }),
            ],
        ];
        for (const [what, file] of damaged) {
            assert.strictEqual(
                refusal(() => readFbx(file, BUDGET)),
                "fbx",
                what,
            );
        }
        // A stored size past the end of the file.
        const past = binary([{ name: "N", values: [V.array("b", 4, Uint8Array.of(1, 2, 3, 4))] }], { close: false });
        new DataView(past.buffer).setUint32(27 + 13 + 1 + 1 + 8, 4000, true);
        assert.strictEqual(
            refusal(() => readFbx(past, BUDGET)),
            "fbx",
            "a stored size past the end",
        );
    });

    it("refuses an array past the decoded byte budget as too large", () => {
        const file = binary([{ name: "N", values: [V.array("d", 4, new Uint8Array(32), true)] }]);
        assert.strictEqual(
            refusal(() => readFbx(file, 16)),
            "fbx-size",
        );
        assert.lengthOf(readFbx(file, 32).nodes, 1);
    });

    it("refuses damaged records", () => {
        const good = (): Uint8Array => binary([{ name: "Node", values: [V.I(1)] }]);
        const end = (file: Uint8Array, value: number): Uint8Array => {
            new DataView(file.buffer).setUint32(27, value, true);
            return file;
        };
        // The record of "Node" with one int: 13 + 4 + 5 bytes, ending at 49.
        assert.strictEqual(
            refusal(() => readFbx(end(good(), 20), BUDGET)),
            "fbx",
            "an end before its start",
        );
        assert.strictEqual(
            refusal(() => readFbx(end(good(), 9000), BUDGET)),
            "fbx",
            "an end past the file",
        );
        assert.strictEqual(
            refusal(() => readFbx(end(good(), 27 + 13 + 4 + 2), BUDGET)),
            "fbx",
            "a value past its end",
        );
        const longName = good();
        longName[27 + 12] = 200;
        assert.strictEqual(
            refusal(() => readFbx(longName, BUDGET)),
            "fbx",
            "a name past its end",
        );
        const moreValues = good();
        new DataView(moreValues.buffer).setUint32(27 + 4, 3, true);
        assert.strictEqual(
            refusal(() => readFbx(moreValues, BUDGET)),
            "fbx",
            "more values than it holds",
        );
        const pastEnd = binary([{ name: "Node", values: [V.I(1)] }], { close: false });
        new DataView(pastEnd.buffer).setUint32(27 + 4, 2, true);
        assert.strictEqual(
            refusal(() => readFbx(pastEnd, BUDGET)),
            "fbx",
            "a value past the end of the file",
        );

        let deep: Rec = { name: "Leaf" };
        for (let i = 0; i < 70; i++) {
            deep = { name: "N", children: [deep] };
        }
        assert.strictEqual(
            refusal(() => readFbx(binary([deep]), BUDGET)),
            "fbx",
            "nested too deep",
        );
    });
});

describe("readFbx, ASCII", () => {
    it("reads keys, values, quoted names, comments and arrays", () => {
        const file = readFbx(
            ascii(
                [
                    "; FBX 7.4.0 project file",
                    "FBXHeaderExtension:  {",
                    "\tFBXVersion: 7400",
                    "}",
                    "Objects:  {",
                    '\tModel: 100, "Model::Cube", "Mesh" {',
                    "\t\tShading: T ; a comment after a value",
                    '\t\tTitle: "say &quot;hi&quot;"',
                    "\t\tVertices: *4 {",
                    "\t\t\ta: 1,-2.5,3e2,x",
                    "\t\t}",
                    "\t\tIndex: 1,2,",
                    "\t\t\t3",
                    "\t}",
                    "}",
                    "",
                ].join("\r\n"),
            ),
            BUDGET,
        );
        assert.deepStrictEqual([file.version, file.binary], [7400, false]);
        const model = file.nodes[1].children[0];
        assert.deepStrictEqual(model.values, [100, "Model::Cube", "Mesh"]);
        const [shading, title, vertices, index] = model.children;
        assert.deepStrictEqual(shading.values, ["T"]);
        assert.deepStrictEqual(title.values, ['say "hi"']);
        assert.deepStrictEqual(vertices, {
            name: "Vertices",
            values: [Float64Array.of(1, -2.5, 300, Number.NaN)],
            children: [],
        });
        assert.deepStrictEqual(index.values, [1, 2, 3]);
    });

    it("reads a file with no header as version 0", () => {
        const file = readFbx(ascii("Objects:  {\n}\n; the end"), BUDGET);
        assert.deepStrictEqual([file.version, file.nodes.length], [0, 1]);
    });

    it("refuses damaged ASCII files", () => {
        const damaged: [string, string][] = [
            ["an unterminated string", 'Name: "open'],
            ["a value with no key", "5\n"],
            ["a block with no key", "{\n}"],
            ["a close with nothing open", "Objects: 1\n}"],
            ["a block left open", "Objects:  {\n\tModel: 1"],
            ["nesting too deep", "N: {\n".repeat(70)],
        ];
        for (const [what, text] of damaged) {
            assert.strictEqual(
                refusal(() => readFbx(ascii(text), BUDGET)),
                "fbx",
                what,
            );
        }
    });
});

describe("FBX helpers", () => {
    it("tells a binary file by its magic", () => {
        assert.isTrue(isBinaryFbx(binary([])));
        assert.isFalse(isBinaryFbx(latin1(MAGIC)));
        const other = binary([]);
        other[0] = 0x6b;
        assert.isFalse(isBinaryFbx(other));
    });

    it("names an object without its class, from either form", () => {
        assert.strictEqual(fbxName("Cube\0\u0001Model"), "Cube");
        assert.strictEqual(fbxName("Model::Cube"), "Cube");
        assert.strictEqual(fbxName("Cube"), "Cube");
        assert.strictEqual(fbxName(7), "");
        assert.strictEqual(fbxName(undefined), "");
    });

    it("keys an object by its id, number or name", () => {
        assert.deepStrictEqual(
            [fbxId(100n), fbxId(100), fbxId("Model::Cube"), fbxId(true), fbxId(undefined)],
            ["100", "100", "Model::Cube", "", ""],
        );
    });
});
