/**
 * @file Run identity: what makes two calls the same run, and what makes them different ones.
 *
 * A run id is not a slot number. It is either author-assigned through `as:` or the name the
 * run's algorithm suggests (`./suggestedName`), and an unnamed run is found again by the RESULT it
 * answers -- the algorithm key, whether it is exact or sampled, and the scope it reads with the
 * live keywords frozen -- together with that suggested name. An id minted from an execution
 * counter would mean a saved style layer resolves to a different run depending on the order
 * things happened to execute; a suggested name is the same whatever ran before it, and only a
 * second, different computation under the same name is counted on (`_2`, `_3`, ...).
 *
 * Parameters and the seed are not part of the result's identity, so tuning a setting the name
 * does not carry re-runs the same result and every layer bound to it repaints, instead of growing
 * a second result and a second layer. The keywords `"visible"` and `"selection"` are replaced by
 * the definition in force before comparing -- the visibility filter and time window, the selected
 * nodes -- so the same unscoped call under a different filter is a different result, never a
 * re-execution of the first one over a different graph.
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

import { compareIds } from "../../catalog/sets/canonical";
import { parseScope } from "../../catalog/sets/parse";
import type {
    AlgorithmKey,
    EdgeId,
    NodeId,
    OptionDescriptor,
    RunId,
    Scope,
    SetDefinition,
} from "../../catalog/types";
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
        scope: legacyScope(identity.scope),
        seed: identity.seed,
    });
}

/**
 * One spelling per scope, so one scope has one run id: an inline definition is canonicalised, and
 * one that equals a form older than `{ define }` becomes that form -- a fixed node list read
 * `induced` with no listed edges is `{ nodes }`, a rule over one query read `induced` is
 * `{ where }` -- so every id derived before `{ define }` existed is unchanged.
 * @param scope - The scope a run was asked for.
 * @returns The scope its id is derived from.
 */
function legacyScope(scope: Scope): Scope {
    if (typeof scope !== "object" || !("define" in scope)) {
        return scope;
    }

    let canonical: Scope;
    try {
        canonical = parseScope(scope);
    } catch {
        // A malformed scope is refused where it is resolved; its id is never used.
        return scope;
    }

    const definition = (canonical as { define: SetDefinition }).define;
    if (definition.kind === "fixed" && definition.reading === "induced" && definition.edges === undefined) {
        return { nodes: definition.nodes };
    }

    if (definition.kind === "rule" && definition.reading === "induced" && typeof definition.where === "string") {
        return { where: definition.where };
    }

    return canonical;
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

/** The live scope keywords, whose members change without the scope's spelling changing. */
export type LiveKeyword = "visible" | "selection";

/**
 * A scope with every live keyword replaced by the definition in force, for hashing only: the
 * scope itself, and the `of` of every `member` leaf inside an inline definition.
 * @param scope - The scope a run was asked for.
 * @param live - The definition each live keyword stands for now.
 * @returns The frozen scope, plain data.
 */
export function freezeScope(scope: Scope, live: (keyword: LiveKeyword) => unknown): unknown {
    const walk = (node: unknown, position: boolean): unknown => {
        if (position && (node === "visible" || node === "selection")) {
            return { [node]: live(node) };
        }

        if (Array.isArray(node)) {
            return node.map((entry: unknown) => walk(entry, false));
        }

        if (typeof node !== "object" || node === null) {
            return node;
        }

        const member = (node as { kind?: unknown }).kind === "member";

        return Object.fromEntries(
            Object.entries(node).map(([key, value]) => [key, walk(value, member && key === "of")]),
        );
    };

    return walk(legacyScope(scope), true);
}

/**
 * The selected nodes as a frozen scope names them: sorted, so the same selection made in another
 * order is the same result.
 * @param nodes - The selected node ids.
 * @returns The ids, sorted.
 */
export function frozenSelection(nodes: Iterable<NodeId>): NodeId[] {
    return [...nodes].sort(compareIds);
}

/** What names a result: everything that makes two calls one result, and nothing a re-run may tune. */
export interface ResultIdentity {
    /** Which algorithm ran. */
    readonly algorithm: AlgorithmKey;
    /** The scope, frozen by {@link freezeScope}. */
    readonly scope: unknown;
    /** The sample size that was asked for, or null: a sampled result is never an exact one. */
    readonly sample: number | null;
    /** Whether approximation was refused, or null when the caller did not say. */
    readonly exact: boolean | null;
}

/**
 * The canonical text of a result identity, which is what two runs under one id are compared by.
 * @param identity - The identity.
 * @returns Its canonical text.
 */
export function canonicalResultIdentity(identity: ResultIdentity): string {
    return canonicalize({
        algorithm: identity.algorithm,
        exact: identity.exact,
        sample: identity.sample,
        scope: identity.scope,
    });
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
