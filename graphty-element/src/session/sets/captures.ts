/**
 * @file Held-item captures (design/sets/sets-design.md section 5.2).
 *
 * A rule's `item` leaf that carries an `execution` HOLDS that execution of its run. When the run
 * re-executes in place, the values that execution published are replaced, so before they go the
 * re-run captures the members of every item a live reference holds: a sorted id list per item,
 * stored on the run under the execution, as `held: { [execution]: { [itemKey]: capture } }`. The
 * holding reference then resolves to the capture and reads "Earlier run".
 *
 * A capture is STATE, not cache: it is written only by a run command (a re-run), and each run
 * command carries a capture forward only while live state still holds its execution. Nothing
 * prunes it from anywhere else, so what a saved file holds never depends on when something ran.
 * With no capture (a file written without it), the reference resolves to nothing and its status
 * says `values-not-kept`.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX, makeMask } from "@graphty/graph-format";

import { compareIds, runIdOfRef } from "../../catalog/sets/canonical";
import type { EdgeMember, ItemKey, NodeId, ResultItem, RunId } from "../../catalog/types";
import type { CapturedHalves, FilterRunResult } from "../visibility/filter";
import { compactEdgeMembers, type EdgeMemberList } from "./prepare";
import { addEdgeRow, bindEdgeMembers, edgeMemberKey, type ResolveContext } from "./resolve";

/** One held item's members, as a re-run captured them. Frozen. */
export interface Capture {
    /** Present when the item's field lives on nodes: the node ids, sorted. */
    readonly nodes?: readonly NodeId[];
    /**
     * Present when it lives on edges: the edges' stable identities, sorted by key, in the compact
     * column form a fixed set holds them in.
     */
    readonly edges?: EdgeMemberList;
}

/** One run's captures: by held execution, then by item key ({@link itemKeyOf}). */
export type HeldCaptures = ReadonlyMap<string, ReadonlyMap<string, Capture>>;

type Loose = Readonly<Record<string, unknown>>;

/**
 * Whether a value is a plain object.
 * @param value - Any value.
 * @returns True for an object that is not an array.
 */
function isObject(value: unknown): value is Loose {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * An item key as a string: the field, and the value with its type, so `1` and `"1"` differ.
 * @param key - The key.
 * @returns The string.
 */
export function itemKeyOf(key: ItemKey): string {
    return JSON.stringify([key.field, typeof key.value, key.value]);
}

/**
 * The items of one run that the holders hold by execution, in the definitions, scopes and rule
 * trees given and the definitions they carry inline.
 * @param holders - Definitions, scopes or rule trees (kept sets' definitions, the visibility filter).
 * @param run - The run.
 * @returns Execution to item key to key.
 */
export function heldItems(holders: Iterable<unknown>, run: RunId): Map<string, Map<string, ItemKey>> {
    const found = new Map<string, Map<string, ItemKey>>();
    const walk = (node: unknown): void => {
        if (!isObject(node)) {
            return;
        }

        if (node.kind === "item") {
            const item = node.item as Partial<ResultItem> | undefined;
            if (isObject(item) && typeof item.execution === "string" && isObject(item.key) && runIdOfRef(item.run) === run) {
                const keys = found.get(item.execution) ?? new Map<string, ItemKey>();
                keys.set(itemKeyOf(item.key), item.key);
                found.set(item.execution, keys);
            }

            return;
        }

        if (node.kind === "rule") {
            walk(node.where);
        } else if (node.kind === "all" || node.kind === "any") {
            for (const child of Array.isArray(node.of) ? node.of : []) {
                walk(child);
            }
        } else if (node.kind === "not") {
            walk(node.of);
        } else if (node.kind === "scope") {
            walk(node.scope);
        } else if (node.define !== undefined) {
            walk(node.define);
        }
    };

    for (const holder of holders) {
        walk(holder);
    }

    return found;
}

/**
 * Whether an element's value is the key's: equal, or an array holding it.
 * @param value - The element's value.
 * @param wanted - The key's value.
 * @returns True when it matches.
 */
function matches(value: unknown, wanted: unknown): boolean {
    return value === wanted || (Array.isArray(value) && value.includes(wanted));
}

/**
 * The members one item of a result holds now, as a capture.
 * @param result - The run's current result, by dense index.
 * @param key - The item's key.
 * @param snapshot - The snapshot the result is read against.
 * @param edgeMemberOf - An edge row's stable identity.
 * @returns The capture: a half only where the result publishes the field per element.
 */
export function captureItem(
    result: FilterRunResult,
    key: ItemKey,
    snapshot: GraphSnapshot,
    edgeMemberOf: (row: number) => EdgeMember | undefined,
): Capture {
    const kinds = new Set(result.fields.filter((field) => field.name === key.field).map((field) => field.kind));
    let nodes: NodeId[] | undefined;
    let edges: EdgeMemberList | undefined;
    if (kinds.has("node")) {
        nodes = [];
        for (let index = 0; index < snapshot.nodeCount; index++) {
            if (matches(result.nodeValue(index, key.field), key.value)) {
                nodes.push(snapshot.ids.idOf(index));
            }
        }

        nodes.sort(compareIds);
    }

    if (kinds.has("edge")) {
        const keyed: [string, EdgeMember][] = [];
        for (let row = 0; row < snapshot.edgeCount; row++) {
            const member = matches(result.edgeValue(row, key.field), key.value) ? edgeMemberOf(row) : undefined;
            if (member !== undefined) {
                keyed.push([edgeMemberKey(member), member]);
            }
        }

        edges = compactEdgeMembers(keyed.sort((a, b) => (a[0] < b[0] ? -1 : Number(a[0] > b[0]))).map(([, member]) => member));
    }

    return Object.freeze({
        ...(nodes === undefined ? {} : { nodes: Object.freeze(nodes) }),
        ...(edges === undefined ? {} : { edges }),
    });
}

/**
 * The captures a re-run leaves on its run: for every item a holder holds, the capture of the
 * execution being replaced when it is that one, else the one already kept. An execution nothing
 * holds any more is not carried forward.
 * @param prior - The run's captures before the re-run.
 * @param held - What the holders hold of this run ({@link heldItems}).
 * @param current - The execution being replaced, or undefined when the run has no result.
 * @param capture - Captures one item of the result being replaced; absent when there is none.
 * @returns The run's captures after the re-run.
 */
export function nextCaptures(
    prior: HeldCaptures,
    held: ReadonlyMap<string, ReadonlyMap<string, ItemKey>>,
    current: string | undefined,
    capture: ((key: ItemKey) => Capture) | undefined,
): HeldCaptures {
    const next = new Map<string, ReadonlyMap<string, Capture>>();
    for (const [execution, keys] of held) {
        const kept = new Map<string, Capture>();
        for (const [name, key] of keys) {
            const value = execution === current && capture !== undefined ? capture(key) : prior.get(execution)?.get(name);
            if (value !== undefined) {
                kept.set(name, value);
            }
        }

        if (kept.size > 0) {
            next.set(execution, kept);
        }
    }

    return next;
}

/**
 * The capture a run keeps for one held item, if any.
 * @param captures - The run's captures.
 * @param item - The item, with its execution.
 * @returns The capture, or undefined.
 */
export function captureOf(captures: HeldCaptures, item: ResultItem): Capture | undefined {
    return item.execution === undefined ? undefined : captures.get(item.execution)?.get(itemKeyOf(item.key));
}

const bitmaps = new WeakMap<Capture, { readonly serial: number; readonly store: object | null; readonly halves: CapturedHalves }>();

/**
 * A capture as bitmaps over the context snapshot, rebound like a fixed set's members: node ids
 * through the id map, edges by stable identity. Memoised per capture and snapshot.
 * @param capture - The capture.
 * @param context - What the resolution reads.
 * @returns The halves.
 */
export function capturedHalves(capture: Capture, context: ResolveContext): CapturedHalves {
    const { snapshot } = context;
    const store = context.store ?? null;
    const cached = bitmaps.get(capture);
    if (cached?.serial === snapshot.serial && cached.store === store) {
        return cached.halves;
    }

    let nodes: CapturedHalves["nodes"] = null;
    if (capture.nodes !== undefined) {
        nodes = makeMask(snapshot.nodeCount);
        const ids = context.ids ?? snapshot.ids;
        for (const id of capture.nodes) {
            const index = ids.indexOf(id);
            if (index !== INVALID_INDEX) {
                nodes[index >>> 5] |= 1 << (index & 31);
            }
        }
    }

    let edges: CapturedHalves["edges"] = null;
    if (capture.edges !== undefined) {
        edges = makeMask(snapshot.edgeCount);
        // Endpoints go to a scratch bitmap: the node half is only what the capture named.
        const scratch = makeMask(snapshot.nodeCount);
        for (const row of bindEdgeMembers(capture, capture.edges, context)) {
            if (row >= 0) {
                addEdgeRow(row, snapshot, scratch, edges);
            }
        }
    }

    const halves = { nodes, edges };
    bitmaps.set(capture, { serial: snapshot.serial, store, halves });

    return halves;
}
