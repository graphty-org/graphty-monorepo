/**
 * Goldens for the member hashes and the `r1:` revision (design/sets/sets-design.md section 12.2).
 *
 * Every expected value here is derived without the code under test: a reference FNV-1a-32 loop and
 * MurmurHash3 finaliser in BigInt arithmetic (not Math.imul), each checked against published
 * vectors, fed unit sequences
 * written out by hand, float64 bytes included. The frozen hex literals at the end were written only
 * after the derivations passed; they pin the persisted format.
 */

import { assert, describe, it } from "vitest";

import { hashEdgeMember, hashNodeId, type LanePair, revisionOf } from "../../../src/catalog/sets/hash";

const A = { basis: 0x811c9dc5n, prime: 0x01000193n };
const B = { basis: 0x1b873593n, prime: 0x85ebca6bn };

/**
 * Reference FNV-1a over 32 bits: xor each unit in, multiply, keep the low 32 bits.
 * @param units - The units.
 * @param lane - The basis and multiplier.
 * @returns The unsigned 32-bit result.
 */
function fnv(units: readonly number[], lane: { basis: bigint; prime: bigint } = A): number {
    let h = lane.basis;
    for (const u of units) {
        h = ((h ^ BigInt(u)) * lane.prime) & 0xffffffffn;
    }

    return Number(h);
}

/**
 * Reference MurmurHash3 32-bit finaliser, in BigInt arithmetic.
 * @param lane - An unsigned 32-bit value.
 * @returns The mixed value.
 */
function fmix(lane: number): number {
    const M = 0xffffffffn;
    let h = BigInt(lane);
    h ^= h >> 16n;
    h = (h * 0x85ebca6bn) & M;
    h ^= h >> 13n;
    h = (h * 0xc2b2ae35n) & M;
    h ^= h >> 16n;

    return Number(h);
}

/**
 * Both lanes over one unit sequence, each finalised.
 * @param units - The units.
 * @returns The two-lane hash.
 */
function H(units: readonly number[]): LanePair {
    return { a: fmix(fnv(units, A)), b: fmix(fnv(units, B)) };
}

/**
 * A string's ASCII codes.
 * @param text - ASCII text.
 * @returns Its code units.
 */
function ascii(text: string): number[] {
    return Array.from({ length: text.length }, (_, i) => text.charCodeAt(i));
}

/**
 * The little-endian float64 bytes of an unsigned 32-bit integer, built by hand from its bits:
 * value = 1.m * 2^e, exponent biased by 1023, 52-bit mantissa.
 * @param value - An integer in [0, 2^32).
 * @returns The eight bytes, least significant first.
 */
function uintFloatBytes(value: number): number[] {
    if (value === 0) {
        return [0, 0, 0, 0, 0, 0, 0, 0];
    }

    const v = BigInt(value);
    // The exponent: the largest e with 2^e <= v.
    let exp = 0n;
    while (1n << (exp + 1n) <= v) {
        exp++;
    }

    const bits = ((exp + 1023n) << 52n) | ((v - (1n << exp)) << (52n - exp));
    const out: number[] = [];
    for (let i = 0n; i < 8n; i++) {
        out.push(Number((bits >> (8n * i)) & 0xffn));
    }

    return out;
}

/**
 * The numeric part of a 32-bit lane value.
 * @param value - The lane.
 * @returns 0x23 and its eight bytes.
 */
function N(value: number): number[] {
    return [0x23, ...uintFloatBytes(value)];
}

/**
 * A lane-wise sum mod 2^32.
 * @param x - One hash.
 * @param y - The other.
 * @returns The sum.
 */
function sum(x: LanePair, y: LanePair): LanePair {
    return { a: Number((BigInt(x.a) + BigInt(y.a)) & 0xffffffffn), b: Number((BigInt(x.b) + BigInt(y.b)) & 0xffffffffn) };
}

/**
 * The hash of four lane values fed as numeric parts.
 * @param e - The first pair.
 * @param d - The second pair.
 * @returns The hash.
 */
function H4(e: LanePair, d: LanePair): LanePair {
    return H([...N(e.a), ...N(e.b), ...N(d.a), ...N(d.b)]);
}

/**
 * The hex text of a hash, lane A first.
 * @param h - The hash.
 * @returns 16 hex digits.
 */
function hex(h: LanePair): string {
    return h.a.toString(16).padStart(8, "0") + h.b.toString(16).padStart(8, "0");
}

/**
 * The revision the design defines for a canonical JSON text.
 * @param json - The text.
 * @returns `r1:` and its hash as a string part.
 */
function revision(json: string): string {
    return `r1:${hex(H([0x24, ...Array.from({ length: json.length }, (_, i) => json.charCodeAt(i))]))}`;
}

describe("the reference FNV-1a loop", () => {
    it("gives the published FNV-1a-32 vectors", () => {
        assert.strictEqual(fnv([]), 0x811c9dc5);
        assert.strictEqual(fnv(ascii("a")), 0xe40c292c);
        assert.strictEqual(fnv(ascii("foobar")), 0xbf9cf968);
    });

    it("finalises with the published MurmurHash3 fmix32 (x86_32 of the empty input, seeds 1 and ~0)", () => {
        assert.strictEqual(fmix(1), 0x514e28b7);
        assert.strictEqual(fmix(0xffffffff), 0x81f16f39);
        assert.strictEqual(fmix(0), 0);
    });

    it("builds float64 bytes that match hand-written ones", () => {
        assert.deepEqual(uintFloatBytes(1), [0, 0, 0, 0, 0, 0, 0xf0, 0x3f]);
        assert.deepEqual(uintFloatBytes(2), [0, 0, 0, 0, 0, 0, 0x00, 0x40]);
        assert.deepEqual(uintFloatBytes(3), [0, 0, 0, 0, 0, 0, 0x08, 0x40]);
        assert.deepEqual(uintFloatBytes(0xffffffff), [0, 0, 0xe0, 0xff, 0xff, 0xff, 0xef, 0x41]);
    });
});

describe("node member hashes", () => {
    it("hash a string id as 0x24 then its characters, on both lanes", () => {
        for (const id of ["a", "b", "node-17", ""]) {
            assert.deepEqual(hashNodeId(id), H([0x24, ...ascii(id)]), id);
        }
    });

    it("hash a numeric id as 0x23 then its little-endian float64 bytes", () => {
        assert.deepEqual(hashNodeId(1), H([0x23, 0, 0, 0, 0, 0, 0, 0xf0, 0x3f]));
        assert.deepEqual(hashNodeId(-2.5), H([0x23, 0, 0, 0, 0, 0, 0, 0x04, 0xc0]));
        // 1e21 is 0x444B1AE4D6E2EF50; a toString path would hash "1e+21".
        assert.deepEqual(hashNodeId(1e21), H([0x23, 0x50, 0xef, 0xe2, 0xd6, 0xe4, 0x1a, 0x4b, 0x44]));
        assert.deepEqual(hashNodeId(0), H([0x23, 0, 0, 0, 0, 0, 0, 0, 0]));
    });

    it("keeps the number 1 and the string '1' apart and folds -0 into +0", () => {
        assert.notDeepEqual(hashNodeId(1), hashNodeId("1"));
        assert.deepEqual(hashNodeId(-0), hashNodeId(0));
    });

    it("feeds one step per UTF-16 code unit, above 0xFF and outside the BMP", () => {
        assert.deepEqual(hashNodeId(String.fromCharCode(0xe9, 0x4e2d, 0xd83d, 0xde00)), H([0x24, 0xe9, 0x4e2d, 0xd83d, 0xde00]));
    });
});

describe("edge member hashes", () => {
    const ha = H([0x24, 0x61]);
    const hb = H([0x24, 0x62]);

    it("follow the worked example, undirected and directed", () => {
        const d = H([0x69, 0x24, 0x78]);
        const member = { source: "a", target: "b", id: "x" };

        assert.deepEqual(hashEdgeMember(member, false), H4(sum(ha, hb), d));
        assert.deepEqual(hashEdgeMember(member, true), H4(H([...N(ha.a), ...N(ha.b), ...N(hb.a), ...N(hb.b)]), d));
    });

    it("hash each discriminator by its unit sequence", () => {
        const e = sum(ha, hb);
        // A numeric id: 0x69, then 7 as a numeric part.
        assert.deepEqual(
            hashEdgeMember({ source: "a", target: "b", id: 7 }, false),
            H4(e, H([0x69, 0x23, 0, 0, 0, 0, 0, 0, 0x1c, 0x40])),
        );
        // A key: 0x6b, then its string part.
        assert.deepEqual(hashEdgeMember({ source: "a", target: "b", key: "k" }, false), H4(e, H([0x6b, 0x24, 0x6b])));
        // An ordinal: 0x6f, then ordinal and among as numeric parts.
        assert.deepEqual(
            hashEdgeMember({ source: "a", target: "b", ordinal: 1, among: 3 }, false),
            H4(e, H([0x6f, ...N(1), ...N(3)])),
        );
    });
});

describe("revisions", () => {
    it("hash a fixed set's canonical JSON with member arrays replaced by count and sum", () => {
        const nodeSum = sum(H([0x23, 0, 0, 0, 0, 0, 0, 0xf0, 0x3f]), H([0x24, 0x61]));
        const ha = H([0x24, 0x61]);
        const hb = H([0x24, 0x62]);
        const edge = H4(H([...N(ha.a), ...N(ha.b), ...N(hb.a), ...N(hb.b)]), H([0x69, 0x24, 0x78]));
        const json =
            `{"edges":{"count":1,"sum":"${hex(edge)}"},"kind":"fixed",` +
            `"nodes":{"count":2,"sum":"${hex(nodeSum)}"},"reading":"listed"}`;

        assert.strictEqual(
            revisionOf({ kind: "fixed", nodes: ["a", 1, "a"], edges: [{ source: "a", target: "b", id: "x" }], reading: "listed" }),
            revision(json),
        );
    });

    it("hash a rule and a path as their canonical JSON", () => {
        assert.strictEqual(
            revisionOf({ kind: "rule", where: { kind: "expression", where: "degree > 2" }, reading: "induced" }),
            revision('{"kind":"rule","reading":"induced","where":"degree > 2"}'),
        );
        assert.strictEqual(
            revisionOf({ kind: "path", nodes: ["a", "b", 3], edges: [{ source: "a", target: "b", id: "x" }, null], directed: false }),
            revision('{"edges":[{"id":"x","source":"a","target":"b"},null],"kind":"path","nodes":["a","b",3]}'),
        );
    });
});

// Frozen literals, written after the derivations above passed. A change to any of these is a change
// to the persisted format: bump the revision prefix to r2 (design 12.2) instead of editing them.
describe("frozen r1 goldens", () => {
    const hx = (h: LanePair): string => hex(h);

    it("pins the member hashes", () => {
        assert.strictEqual(hx(hashNodeId("a")), "646a3bb740a3d6de");
        assert.strictEqual(hx(hashNodeId(1)), "eaabe5a055e7fa29");
        assert.strictEqual(hx(hashNodeId(-0)), "becac04909d6515d");
        assert.strictEqual(hx(hashEdgeMember({ source: "a", target: "b", id: "x" }, false)), "e401f9c0ab1e0c49");
        assert.strictEqual(hx(hashEdgeMember({ source: "a", target: "b", id: "x" }, true)), "1b06163ef684b158");
        assert.strictEqual(hx(hashEdgeMember({ source: "a", target: "b", key: "k" }, false)), "f5f0a3a31d09d790");
        assert.strictEqual(hx(hashEdgeMember({ source: "a", target: "b", key: "k" }, true)), "2dba5f588e14f82e");
        assert.strictEqual(hx(hashEdgeMember({ source: "a", target: "b", ordinal: 1, among: 3 }, false)), "452b1ce85e5deecd");
        assert.strictEqual(hx(hashEdgeMember({ source: "a", target: "b", ordinal: 1, among: 3 }, true)), "5e50e4d3d1f2198b");
    });

    it("pins the revisions", () => {
        assert.strictEqual(
            revisionOf({ kind: "fixed", nodes: ["a", 1], edges: [{ source: "a", target: "b", id: "x" }], reading: "listed" }),
            "r1:5999b2ae7334200a",
        );
        assert.strictEqual(revisionOf({ kind: "rule", where: "degree > 2", reading: "induced" }), "r1:b8885d1328858272");
        assert.strictEqual(
            revisionOf({ kind: "path", nodes: ["a", "b", 3], edges: [{ source: "a", target: "b", id: "x" }, null] }),
            "r1:17db94f2a2888680",
        );
    });
});
