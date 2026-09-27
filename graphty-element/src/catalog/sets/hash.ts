/**
 * @file Member hashes, the member sum and the `r1:` revision of a set definition.
 *
 * The rules are persisted contract (design/sets/sets-design.md section 12.2); a change to any of
 * them bumps the revision prefix to `r2`:
 *
 * - `H` is two independent 32-bit FNV-1a lanes. Lane A starts at 0x811c9dc5 and multiplies by
 *   0x01000193, lane B starts at 0x1b873593 and multiplies by 0x85ebca6b. Each step is
 *   `lane = Math.imul(lane ^ unit, multiplier) >>> 0` on both lanes, and each lane ends with the
 *   MurmurHash3 32-bit finaliser, so member hashes can be summed without inheriting FNV's
 *   near-linear structure.
 * - A string part is the unit 0x24 then each UTF-16 code unit as one step. A numeric part is the
 *   unit 0x23 then the eight little-endian bytes of its float64 value, `-0` fed as `+0`. No string
 *   is ever built for a number, so `1` and `"1"` differ and `1e21` is never "1e+21".
 * - An edge member combines its endpoint hashes (a lane-wise sum when undirected, so the order of
 *   the ends cannot matter; an ordered hash when the graph was directed at ingest) with the hash of
 *   its one discriminator.
 * - The member sum is the lane-wise sum of member hashes mod 2^32, order-free, so a member delta
 *   updates it by one add or subtract per member.
 *
 * Pure and Node-safe.
 */

import type { EdgeMember, NodeId, SetDefinition } from "../types";
import { canonicalSetDefinition } from "./canonical";

/** A 64-bit hash as its two 32-bit lanes, each an unsigned integer. */
export interface LanePair {
    readonly a: number;
    readonly b: number;
}

/** The sum of no members. */
export const EMPTY_SUM: LanePair = { a: 0, b: 0 };

/**
 * Invocation counts the complexity tests read: member hashes computed, and member hashes added to
 * a sum. Internal; never reset by this module.
 */
export const hashCounters = { memberHashes: 0, sums: 0 };

const BASIS_A = 0x811c9dc5;
const PRIME_A = 0x01000193;
const BASIS_B = 0x1b873593;
const PRIME_B = 0x85ebca6b;

const TAG_NUMBER = 0x23;
const TAG_STRING = 0x24;
const TAG_ID = 0x69;
const TAG_KEY = 0x6b;
const TAG_ORDINAL = 0x6f;

const float = new DataView(new ArrayBuffer(8));
// The same eight bytes through typed views: two word reads are several times faster than eight
// DataView.getUint8 calls. The views are platform-endian, so they are used only where the
// platform is little-endian (every engine the element ships to); elsewhere the DataView feeds.
const floatValue = new Float64Array(float.buffer);
const floatWords = new Uint32Array(float.buffer);
/** The four lane values `hashPairs` feeds, so its loop reads them by index. */
const parts = new Float64Array(4);
const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

// The two running lanes of the hash being fed. Every `H` below is fed start to finish without
// another starting in between, so one pair of lanes serves them all.
let laneA = BASIS_A;
let laneB = BASIS_B;

/** Start a fresh `H`. */
function begin(): void {
    laneA = BASIS_A;
    laneB = BASIS_B;
}

/**
 * Feed one unit to both lanes.
 * @param unit - A byte, a tag or a UTF-16 code unit.
 */
function unit(unit: number): void {
    laneA = Math.imul(laneA ^ unit, PRIME_A) >>> 0;
    laneB = Math.imul(laneB ^ unit, PRIME_B) >>> 0;
}

/**
 * Feed a numeric part: its tag, then its float64 bytes, little-endian.
 * @param value - A finite number.
 */
function numberPart(value: number): void {
    unit(TAG_NUMBER);
    if (!LITTLE_ENDIAN) {
        float.setFloat64(0, value === 0 ? 0 : value, true);
        for (let i = 0; i < 8; i++) {
            unit(float.getUint8(i));
        }

        return;
    }

    // The hot path of the completion pass: the eight bytes read as two words and fed from locals.
    floatValue[0] = value === 0 ? 0 : value;
    let a = laneA;
    let b = laneB;
    for (let w = 0; w < 2; w++) {
        const word = floatWords[w];
        for (let shift = 0; shift < 32; shift += 8) {
            const byte = (word >>> shift) & 0xff;
            a = Math.imul(a ^ byte, PRIME_A) >>> 0;
            b = Math.imul(b ^ byte, PRIME_B) >>> 0;
        }
    }

    laneA = a;
    laneB = b;
}

/**
 * Feed a string part: its tag, then each UTF-16 code unit.
 * @param value - The string.
 */
function stringPart(value: string): void {
    unit(TAG_STRING);
    for (let i = 0; i < value.length; i++) {
        unit(value.charCodeAt(i));
    }
}

/**
 * Feed an id as a numeric or a string part, by its type.
 * @param id - The id.
 */
function idPart(id: string | number): void {
    if (typeof id === "number") {
        numberPart(id);
    } else {
        stringPart(id);
    }
}

/**
 * The MurmurHash3 32-bit finaliser. FNV-1a's last step is a multiply, so the hashes of short
 * inputs that differ in their last unit differ by near-arithmetic steps, and sums of them collide
 * (a, d against b, c). The finaliser breaks that structure before any hash is summed.
 * @param lane - A lane value.
 * @returns The mixed lane, unsigned.
 */
function finalise(lane: number): number {
    let h = lane ^ (lane >>> 16);
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);

    return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The lanes fed so far, each finalised.
 * @returns The hash.
 */
function end(): LanePair {
    return { a: finalise(laneA), b: finalise(laneB) };
}

/**
 * A node id's hash, uncounted.
 * @param id - The id.
 * @returns `H` of its one part.
 */
function nodeHash(id: NodeId): LanePair {
    begin();
    idPart(id);

    return end();
}

/**
 * `H` of four lane values, each fed as a numeric part.
 * @param first - The first pair.
 * @param second - The second pair.
 * @returns The hash.
 */
function hashPairs(first: LanePair, second: LanePair): LanePair {
    if (!LITTLE_ENDIAN) {
        begin();
        numberPart(first.a);
        numberPart(first.b);
        numberPart(second.a);
        numberPart(second.b);

        return end();
    }

    // The same four numeric parts fed from locals: this runs twice for every edge of a load.
    let a = BASIS_A;
    let b = BASIS_B;
    parts[0] = first.a;
    parts[1] = first.b;
    parts[2] = second.a;
    parts[3] = second.b;
    for (let k = 0; k < 4; k++) {
        floatValue[0] = parts[k];
        a = Math.imul(a ^ TAG_NUMBER, PRIME_A) >>> 0;
        b = Math.imul(b ^ TAG_NUMBER, PRIME_B) >>> 0;
        for (let w = 0; w < 2; w++) {
            const word = floatWords[w];
            for (let shift = 0; shift < 32; shift += 8) {
                const byte = (word >>> shift) & 0xff;
                a = Math.imul(a ^ byte, PRIME_A) >>> 0;
                b = Math.imul(b ^ byte, PRIME_B) >>> 0;
            }
        }
    }

    return { a: finalise(a), b: finalise(b) };
}

/**
 * The hash of an edge member's one discriminator.
 * @param member - The member.
 * @returns The discriminator hash.
 */
function discriminatorHash(member: EdgeMember): LanePair {
    begin();
    if (member.id !== undefined) {
        unit(TAG_ID);
        idPart(member.id);
    } else if (member.key !== undefined) {
        unit(TAG_KEY);
        idPart(member.key);
    } else if (member.ordinal !== undefined && member.among !== undefined) {
        unit(TAG_ORDINAL);
        numberPart(member.ordinal);
        numberPart(member.among);
    } else {
        throw new Error("an edge member needs an id, a key, or an ordinal with among");
    }

    return end();
}

/**
 * A node member's hash.
 * @param id - The node id.
 * @returns `H` of its one part.
 */
export function hashNodeId(id: NodeId): LanePair {
    hashCounters.memberHashes++;

    return nodeHash(id);
}

/**
 * An edge member's hash. Undirected, the endpoints combine by a lane-wise sum, so swapping them
 * changes nothing; directed at ingest, they are hashed in order.
 * @param member - The member, with exactly one discriminator.
 * @param directed - Whether the graph was declared directed at ingest.
 * @returns The member hash.
 */
export function hashEdgeMember(member: EdgeMember, directed: boolean): LanePair {
    hashCounters.memberHashes++;
    const source = nodeHash(member.source);
    const target = nodeHash(member.target);
    const ends = directed ? hashPairs(source, target) : addToSum(source, target);
    // ponytail: the reserved `dataSource` (fed last as 0x73 then its string part) is added when
    // the data layer stamps a source; a member without it already hashes as it will then.

    return hashPairs(ends, discriminatorHash(member));
}

/**
 * An edge member's hash from its endpoints' node hashes, equal to {@link hashEdgeMember} of the
 * member those ends and that discriminator spell. The completion pass calls it with hashes it
 * has already computed, so no member object is built and no endpoint id is hashed twice.
 * @param source - `hashNodeId` of the source (or lower end)
 * @param target - `hashNodeId` of the target (or upper end)
 * @param directed - Whether the graph was declared directed at ingest.
 * @param id - The file or minted id; when undefined, `ordinal` and `among` discriminate.
 * @param ordinal - The edge's position among its pair's edges.
 * @param among - Its pair's edge count.
 * @returns The member hash.
 */
export function hashEdgeEnds(
    source: LanePair,
    target: LanePair,
    directed: boolean,
    id: string | number | undefined,
    ordinal: number,
    among: number,
): LanePair {
    hashCounters.memberHashes++;
    const ends = directed ? hashPairs(source, target) : { a: (source.a + target.a) >>> 0, b: (source.b + target.b) >>> 0 };
    let discriminator: LanePair;
    if (id !== undefined) {
        begin();
        unit(TAG_ID);
        idPart(id);
        discriminator = end();
    } else {
        // Nearly every edge of a load is 0 of 1, so the last ordinal discriminator is kept.
        if (ordinal !== lastOrdinal || among !== lastAmong) {
            begin();
            unit(TAG_ORDINAL);
            numberPart(ordinal);
            numberPart(among);
            lastOrdinal = ordinal;
            lastAmong = among;
            lastOrdinalHash = end();
        }

        discriminator = lastOrdinalHash;
    }

    return hashPairs(ends, discriminator);
}

let lastOrdinal = -1;
let lastAmong = -1;
let lastOrdinalHash: LanePair = EMPTY_SUM;

/**
 * Add a member hash to a sum.
 * @param sum - The sum.
 * @param hash - The member hash.
 * @returns The new sum, each lane mod 2^32.
 */
export function addToSum(sum: LanePair, hash: LanePair): LanePair {
    hashCounters.sums++;

    return { a: (sum.a + hash.a) >>> 0, b: (sum.b + hash.b) >>> 0 };
}

/**
 * Take a member hash out of a sum.
 * @param sum - The sum.
 * @param hash - A member hash the sum holds.
 * @returns The new sum, each lane mod 2^32.
 */
export function subtractFromSum(sum: LanePair, hash: LanePair): LanePair {
    return { a: (sum.a - hash.a) >>> 0, b: (sum.b - hash.b) >>> 0 };
}

/**
 * The order-free sum of member hashes.
 * @param hashes - The member hashes.
 * @returns Their lane-wise sum.
 */
export function memberSum(hashes: Iterable<LanePair>): LanePair {
    let sum = EMPTY_SUM;
    for (const hash of hashes) {
        sum = addToSum(sum, hash);
    }

    return sum;
}

/**
 * A hash as 16 lower-case hex digits, lane A first.
 * @param hash - The hash.
 * @returns The hex text.
 */
export function hashHex(hash: LanePair): string {
    return hash.a.toString(16).padStart(8, "0") + hash.b.toString(16).padStart(8, "0");
}

/**
 * The summary that replaces a member array in the revision's input.
 * @param count - The member count.
 * @param sum - The member sum.
 * @returns `{ count, sum }` with the sum in hex.
 */
function summary(count: number, sum: LanePair): { count: number; sum: string } {
    return { count, sum: hashHex(sum) };
}

/** A member array as the revision sees it: how many members, and the sum of their hashes. */
export interface MemberSummary {
    readonly count: number;
    readonly sum: LanePair;
}

/**
 * The revision of a fixed definition that carries no field this element does not know, from its
 * member summaries alone, so a member delta can re-derive it without touching the other members.
 * Equal to {@link revisionOf} of the same definition.
 * @param reading - The stored reading, `induced` or `listed`.
 * @param nodes - The node members' summary.
 * @param edges - The edge members' summary; absent or empty when no edge is listed.
 * @returns `r1:` and 16 hex digits.
 */
export function fixedRevision(reading: string, nodes: MemberSummary, edges?: MemberSummary): string {
    // The canonical key order, as `revisionOf` spreads it: edges, kind, nodes, reading.
    const input = {
        ...(edges === undefined || edges.count === 0 ? {} : { edges: summary(edges.count, edges.sum) }),
        kind: "fixed",
        nodes: summary(nodes.count, nodes.sum),
        reading,
    };

    begin();
    stringPart(JSON.stringify(input));

    return `r1:${hashHex(end())}`;
}

/**
 * The revision of a definition: `r1:` and `H` of its canonical JSON as one string part, in which a fixed set's
 * member arrays are replaced by `{"count":k,"sum":"<hex>"}`. A fixed set's edge members are hashed
 * in the order they are written (the directed rule): the revision digests the definition, and
 * the definition's JSON tells `a -> b` from `b -> a`. Unknown kinds hash as their JSON.
 * @param definition - A validated or loaded definition.
 * @returns `r1:` and 16 hex digits.
 */
export function revisionOf(definition: SetDefinition): string {
    const canonical = canonicalSetDefinition(definition);
    let input: unknown = canonical;

    if (canonical.kind === "fixed") {
        let nodes = EMPTY_SUM;
        for (const id of canonical.nodes) {
            nodes = addToSum(nodes, hashNodeId(id));
        }

        const out: Record<string, unknown> = { ...canonical, nodes: summary(canonical.nodes.length, nodes) };
        if (canonical.edges !== undefined) {
            let edges = EMPTY_SUM;
            for (const member of canonical.edges) {
                edges = addToSum(edges, hashEdgeMember(member, true));
            }

            out.edges = summary(canonical.edges.length, edges);
        }

        input = out;
    }

    begin();
    stringPart(JSON.stringify(input));

    return `r1:${hashHex(end())}`;
}

/**
 * The `d1:` membership digest (design section 6.4): `H` of six numeric parts, the node count, the
 * node sum's lanes A and B, the edge count, the edge sum's lanes A and B, where each sum is the
 * member sum of the resolved members' column hashes (`graphty.nodeHash`, `graphty.edgeHash`, the
 * undirected rule while pairs are unordered). The counts keep a node half and an edge half apart
 * even when their sums happen to agree. Comparable only within one session and store.
 * @param nodes - The resolved nodes' count and member sum.
 * @param edges - The resolved edges' count and member sum.
 * @returns `d1:` and 16 hex digits.
 */
export function membershipDigestOf(nodes: MemberSummary, edges: MemberSummary): string {
    begin();
    numberPart(nodes.count);
    numberPart(nodes.sum.a);
    numberPart(nodes.sum.b);
    numberPart(edges.count);
    numberPart(edges.sum.a);
    numberPart(edges.sum.b);

    return `d1:${hashHex(end())}`;
}
