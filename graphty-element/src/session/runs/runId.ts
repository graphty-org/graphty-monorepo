/**
 * @file Run identity: what makes two calls the same run, and what makes them different ones.
 *
 * A run id is not a slot number. It is either author-assigned through `as:` or derived from what
 * the run IS -- the algorithm key, the parameters once canonicalised, and the scope that was
 * asked for. An id minted from an execution counter would mean a saved style layer, recipe or
 * template resolves to a different run depending on the order things happened to execute, and
 * changing that afterwards is a behavioural break in everything already persisted.
 *
 * Two rules do the work here:
 *
 * - **Canonicalisation, so two calls that mean the same thing are the same run.** Key order does
 *   not change an id, and neither does writing out a value the algorithm would have defaulted to:
 *   `{}` and `{ resolution: 1 }` are one run when 1 is the declared default.
 * - **The scope SPECIFICATION, not the resolved membership.** An id derived from which nodes were
 *   in scope would change every time a node arrived, so a layer bound to the run would dangle on
 *   the next import. The resolved membership is what {@link computeScopeDigest} answers, and that
 *   digest drives staleness and re-execution -- not identity.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM: it is string arithmetic over plain data.
 */

import type { AlgorithmKey, EdgeId, NodeId, OptionDescriptor, RunId, Scope } from "../../catalog/types";
import { GraphtyError } from "../../errors";
import { RUN_ID_PATTERN } from "./types";

// ---------------------------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------------------------

/** The FNV-1a prime, for the 32-bit variant. */
const FNV_PRIME = 0x01000193;

/** The FNV-1a offset basis, which seeds the first half of a digest. */
const FNV_OFFSET = 0x811c9dc5;

/** A second, unrelated seed, so the two halves of a digest do not agree on their collisions. */
const FNV_OFFSET_ALTERNATE = 0x9dc5811c;

/** The seed the node half of a scope digest folds with. */
const SCOPE_NODE_SEED = 0x1b873593;

/** The seed the edge half of a scope digest folds with, so a node id and an edge id differ. */
const SCOPE_EDGE_SEED = 0xcc9e2d51;

/** How wide one 32-bit half of a digest is once written in base 36. */
const DIGEST_HALF_WIDTH = 7;

/** The base a digest is written in: the widest that stays inside the run-id character class. */
const DIGEST_RADIX = 36;

/**
 * The FNV-1a hash of a string, as an unsigned 32-bit number.
 * @param text - The text to hash.
 * @param seed - The offset basis to start from.
 * @returns The hash.
 */
function hash32(text: string, seed: number): number {
    let hash = seed >>> 0;

    for (let index = 0; index < text.length; index++) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, FNV_PRIME) >>> 0;
    }

    return hash >>> 0;
}

/**
 * A short, stable digest of a string, made of characters a run id may carry.
 *
 * Two independent 32-bit hashes rather than one, because an id derived from a single 32-bit hash
 * starts colliding at a few tens of thousands of runs, and a collision here means two different
 * computations answering to one id.
 * @param text - The text to digest.
 * @returns The digest: fourteen lower-case alphanumeric characters.
 */
export function stableDigest(text: string): string {
    const first = hash32(text, FNV_OFFSET).toString(DIGEST_RADIX).padStart(DIGEST_HALF_WIDTH, "0");
    const second = hash32(text, FNV_OFFSET_ALTERNATE).toString(DIGEST_RADIX).padStart(DIGEST_HALF_WIDTH, "0");

    return `${first}${second}`;
}

// ---------------------------------------------------------------------------------------------
// Canonical form
// ---------------------------------------------------------------------------------------------

/**
 * Tell whether a value is an object literal rather than an instance of something.
 * @param value - The object to test.
 * @returns True when its prototype is `Object.prototype` or null.
 */
function isPlainObject(value: object): boolean {
    const prototype: unknown = Object.getPrototypeOf(value);

    return prototype === null || prototype === Object.prototype;
}

/**
 * The canonical spelling of a number, with the two values that have two spellings folded.
 * @param value - The number.
 * @returns Its canonical text.
 */
function canonicalNumber(value: number): string {
    if (Number.isNaN(value)) {
        return "NaN";
    }

    // Negative zero and positive zero are the same parameter; `String` disagrees.
    if (value === 0) {
        return "0";
    }

    return String(value);
}

/**
 * The canonical text of a value: the same value always writes the same string.
 *
 * Object keys are sorted and a key whose value is `undefined` is dropped, which is what makes
 * `{ a: 1, b: 2 }`, `{ b: 2, a: 1 }` and `{ a: 1, b: 2, c: undefined }` one parameter set rather
 * than three. The output is close to JSON but is not JSON and is never parsed: it exists to be
 * hashed and compared.
 *
 * A value that cannot be written down honestly -- a function, a symbol, a class instance -- is
 * refused rather than collapsed to `{}`, because collapsing it would silently merge two runs
 * that are not the same run.
 * @param value - The value to write.
 * @returns Its canonical text.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when the value has no canonical form.
 */
export function canonicalize(value: unknown): string {
    if (value === undefined) {
        return "undefined";
    }

    if (value === null) {
        return "null";
    }

    if (typeof value === "string") {
        return JSON.stringify(value);
    }

    if (typeof value === "number") {
        return canonicalNumber(value);
    }

    if (typeof value === "boolean") {
        return value ? "true" : "false";
    }

    if (typeof value === "bigint") {
        return `${value}n`;
    }

    if (value instanceof Date) {
        return `Date(${value.toISOString()})`;
    }

    if (Array.isArray(value)) {
        return `[${value.map((entry: unknown) => canonicalize(entry)).join(",")}]`;
    }

    if (typeof value === "object" && isPlainObject(value)) {
        const entries = Object.entries(value)
            .filter(([, entry]) => entry !== undefined)
            .sort(([left], [right]) => (left < right ? -1 : 1))
            .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`);

        return `{${entries.join(",")}}`;
    }

    throw new GraphtyError({
        code: "E_BAD_COMMAND",
        message: `A run parameter of type "${typeof value}" has no canonical form, so it cannot take part in a run id.`,
        source: "run",
        details: { type: typeof value },
    });
}

/**
 * One parameter set, with the declared defaults filled in and the keys in a fixed order.
 *
 * Filling the defaults rather than stripping them is what makes a call that spells out a default
 * and a call that leaves it out the same run, while keeping the published `run.params` a complete
 * answer to "what did this run actually use". A key the descriptor does not declare is kept, so a
 * plugin's own parameter still tells two runs apart instead of being silently ignored.
 * @param params - What the caller passed, if anything.
 * @param options - The algorithm's declared options, read for their defaults.
 * @returns The canonical parameters, frozen.
 */
export function canonicalizeParams(
    params: Readonly<Record<string, unknown>> | undefined,
    options: readonly OptionDescriptor[],
): Readonly<Record<string, unknown>> {
    const merged = new Map<string, unknown>();

    for (const option of options) {
        if (option.default !== undefined) {
            merged.set(option.name, option.default);
        }
    }

    for (const [name, value] of Object.entries(params ?? {})) {
        if (value !== undefined) {
            merged.set(name, value);
        }
    }

    const canonical: Record<string, unknown> = {};

    for (const name of [...merged.keys()].sort((left, right) => (left < right ? -1 : 1))) {
        canonical[name] = merged.get(name);
    }

    return Object.freeze(canonical);
}

// ---------------------------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------------------------

/**
 * The readable half of a derived id: the algorithm key, reduced to the run-id character class.
 *
 * It carries no meaning the element reads back -- the digest is what identifies the run -- but it
 * is what makes `betweenness_3k1f...` legible in a selector, a filename and a log line.
 * @param algorithm - The algorithm key.
 * @returns A slug matching the leading part of the run-id pattern.
 */
export function algorithmSlug(algorithm: AlgorithmKey): string {
    const slug = algorithm
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^[^a-z]+/, "")
        .replace(/[-_]+$/, "");

    return slug === "" ? "run" : slug;
}

/**
 * Everything that decides whether two calls are one run.
 *
 * `scope` is the specification the caller asked for and not the membership it resolved to: see
 * the file header for why.
 */
export interface RunIdentity {
    /** Which algorithm ran. */
    readonly algorithm: AlgorithmKey;
    /** Its parameters, already canonicalised. */
    readonly params: Readonly<Record<string, unknown>>;
    /** What it was asked to look at. */
    readonly scope: Scope;
    /** The seed a randomised or sampled method used, or null when it needed none. */
    readonly seed: number | null;
    /** The sample size that was asked for, or null when the run was not sampled. */
    readonly sample: number | null;
    /** Whether approximation was refused, or null when the caller did not say. */
    readonly exact: boolean | null;
}

/**
 * The canonical text of an identity, which is what a digest is taken over and what two runs are
 * compared by.
 * @param identity - The identity to write.
 * @returns Its canonical text.
 */
export function canonicalIdentity(identity: RunIdentity): string {
    return canonicalize({
        algorithm: identity.algorithm,
        exact: identity.exact,
        params: identity.params,
        sample: identity.sample,
        scope: identity.scope,
        seed: identity.seed,
    });
}

/**
 * The id a run gets when its author did not name it.
 *
 * Derived, never counted: the same algorithm with the same parameters over the same scope always
 * produces the same id, in this session and in the next one.
 * @param identity - What the run is.
 * @returns The id, which always matches the run-id pattern.
 */
export function deriveRunId(identity: RunIdentity): RunId {
    return `${algorithmSlug(identity.algorithm)}_${stableDigest(canonicalIdentity(identity))}`;
}

/**
 * Check an author-assigned id against the pattern every run id keeps.
 *
 * An id ends up inside a style selector, a saved document and an export filename, so a bad one is
 * refused at the call that offered it rather than at the file that fails to load.
 * @param value - The id the author asked for.
 * @returns The same id, once it is known to be usable.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` when the id does not match the pattern.
 */
export function assertRunId(value: string): RunId {
    if (!RUN_ID_PATTERN.test(value)) {
        throw new GraphtyError({
            code: "E_BAD_COMMAND",
            message:
                `"${value}" cannot be a run id. An id starts with a lower-case letter and carries ` +
                "only lower-case letters, digits, hyphens and underscores.",
            source: "run",
            details: { id: value, pattern: RUN_ID_PATTERN.source },
        });
    }

    return value;
}

// ---------------------------------------------------------------------------------------------
// Scope membership
// ---------------------------------------------------------------------------------------------

/** A commutative fold over one set of ids: equal sets fold equally, whatever order they arrive in. */
interface MembershipFold {
    /** How many ids there were. */
    readonly count: number;
    /** The exclusive-or of their hashes. */
    readonly xor: number;
    /** The wrapping sum of their hashes, which catches the pairs an exclusive-or cancels out. */
    readonly sum: number;
}

/**
 * Fold one set of ids into an order-independent summary.
 * @param ids - The ids in the set, in whatever order they come out.
 * @param seed - The hash seed, which keeps a node id and an edge id from folding the same way.
 * @returns The fold.
 */
function foldMembership(ids: Iterable<NodeId | EdgeId>, seed: number): MembershipFold {
    let count = 0;
    let xor = 0;
    let sum = 0;

    for (const id of ids) {
        // The tag is what keeps the number 1 and the string "1" from being the same element.
        const hashed = hash32(typeof id === "number" ? `#${id}` : `$${id}`, seed);
        xor = (xor ^ hashed) >>> 0;
        sum = (sum + hashed) >>> 0;
        count += 1;
    }

    return { count, xor, sum };
}

/**
 * The digest a resolved scope carries, so that equal digests mean equal scopes.
 *
 * This is the mechanism behind two things a consumer never has to track: whether a finished run's
 * numbers still describe what is on screen, and whether starting the same run again should
 * re-execute it. Both are answered by comparing this digest against the one the run recorded.
 *
 * The fold is commutative and single-pass, so a scope of a million nodes costs one walk and no
 * sort.
 * @param spec - What was asked for.
 * @param nodes - The nodes it resolved to, in any order.
 * @param edges - The edges it resolved to, in any order.
 * @returns The digest.
 */
export function computeScopeDigest(spec: Scope, nodes: Iterable<NodeId>, edges: Iterable<EdgeId>): string {
    const nodeFold = foldMembership(nodes, SCOPE_NODE_SEED);
    const edgeFold = foldMembership(edges, SCOPE_EDGE_SEED);
    const text =
        `${canonicalize(spec)}|` +
        `${nodeFold.count}:${nodeFold.xor.toString(DIGEST_RADIX)}:${nodeFold.sum.toString(DIGEST_RADIX)}|` +
        `${edgeFold.count}:${edgeFold.xor.toString(DIGEST_RADIX)}:${edgeFold.sum.toString(DIGEST_RADIX)}`;

    return stableDigest(text);
}
