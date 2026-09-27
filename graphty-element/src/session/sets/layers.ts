/**
 * @file The live scopes style layers name (design/sets/sets-design.md section 11). Internal.
 *
 * A `{match:"member"}` layer tests one bit per element against its scope's live bitmap. Layers
 * naming the same scope share one live entry, keyed by the scope's canonical form. An entry starts
 * watching the first time a pass reads it: it subscribes to the session's change notifier with
 * the scope's input signature, and holds the resolution it last took, pinned in the resolution
 * cache so budget pressure never evicts what is on screen.
 *
 * When the scope moves on the same snapshot, the elements to repaint are exactly the old bitmap
 * XOR the new one. Across a freeze the two bitmaps index different rows, so the old members are
 * carried to the new rows by id, once per snapshot, and the repaint is the carried bitmap XOR the
 * new resolution, on the scheduler's frame: a freeze that leaves the members alone repaints
 * nothing. Until the frame the entry keeps its paint through the same carry, so a whole-graph pass
 * that runs before it paints what was painted before.
 *
 * A scope that cannot be resolved -- a removed set, a cycle -- paints nothing, and the pass goes
 * on. Nothing here throws into a pass.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import {
    type GraphSnapshot,
    INVALID_INDEX,
    makeMask,
    maskSet,
    maskToIndices,
    maskXor,
    type U32,
} from "@graphty/graph-format";

import type { Scope } from "../../catalog/types";
import { EDGE_ID_COLUMN } from "../../data/edgeIdentity";
import { isGraphtyError } from "../../errors";
import { canonicalize } from "../runs/runId";
import type { LiveScope, SelectorTarget } from "../styles/predicate";
import type { ElementIndices } from "../styles/repaint";
import type { SetWatch } from "./notify";
import type { Resolution } from "./resolve";

/** What one entry holds: its resolution, or null for a scope that paints nothing. */
interface Held {
    readonly resolution: Resolution | null;
    /** The snapshot it was resolved against. */
    readonly graph: GraphSnapshot;
    readonly problem?: string;
}

/** Everything the live scopes read from their session. */
interface LayerScopeSources {
    /**
     * The snapshot the session holds now.
     * @returns The snapshot.
     */
    snapshot(): GraphSnapshot;
    /**
     * Resolve a scope through the cache.
     * @param scope - The scope.
     * @returns The resolution and the snapshot it covers; throws a `GraphtyError` when it cannot.
     */
    resolve(scope: Scope): { readonly resolution: Resolution; readonly graph: GraphSnapshot };
    /**
     * The scope's input signature now.
     * @param scope - The scope.
     * @returns The signature, or null when its inputs cannot be enumerated.
     */
    signature(scope: Scope): string | null;
    /**
     * Watch through the session's notifier.
     * @param watch - The watch.
     * @returns Stops watching.
     */
    subscribe(watch: SetWatch<Held>): () => void;
    /**
     * Pin the scope's current cache entry.
     * @param scope - The scope.
     * @returns Releases the pin.
     */
    pin(scope: Scope): () => void;
    /**
     * Repaint elements whose membership moved.
     * @param dirty - The indices, per half.
     * @returns Settles when the repaint has finished, or nothing when it is not awaitable.
     */
    repaint(dirty: ElementIndices): Promise<unknown> | undefined;
}

/** Nothing to repaint. */
const NONE = new Uint32Array(0);

/**
 * Every index below a count.
 * @param count - How many.
 * @returns The indices.
 */
function every(count: number): Uint32Array {
    const all = new Uint32Array(count);
    for (let index = 0; index < count; index++) {
        all[index] = index;
    }

    return all;
}

/**
 * The indices one half moved between two holdings on the same snapshot.
 * @param before - The old bitmap, or null for none.
 * @param after - The new bitmap, or null for none.
 * @param length - The half's element count.
 * @returns The indices in exactly one of them.
 */
function moved(before: U32 | null, after: U32 | null, length: number): U32 {
    if (before === null && after === null) {
        return NONE;
    }

    if (before === null || after === null) {
        return maskToIndices((before ?? after) as U32, length);
    }

    return maskToIndices(maskXor(before, after, length), length);
}

/** One live scope, shared by every layer naming it. */
class Entry implements LiveScope {
    #held: Held | null = null;
    /** The old members carried to a newer snapshot's rows, until the new resolution arrives. */
    #carried: { readonly graph: GraphSnapshot; readonly node: U32; readonly edge: U32 } | null = null;
    #stop: (() => void) | null = null;
    #unpin: (() => void) | null = null;
    #disposed = false;

    /**
     * An entry that watches nothing until a pass reads it.
     * @param scope - The scope, already checked.
     * @param sources - The session.
     */
    constructor(
        private readonly scope: Scope,
        private readonly sources: LayerScopeSources,
    ) {}

    bits(target: SelectorTarget): U32 | null {
        const held = this.#ensure();
        if (held.resolution === null) {
            return null;
        }

        const graph = this.sources.snapshot();
        if (held.graph === graph) {
            return target === "node" ? held.resolution.nodes : held.resolution.edges;
        }

        return this.#carry(held, graph)[target];
    }

    problem(): string | undefined {
        return this.#ensure().problem;
    }

    /** Stop watching and release the pin. What it holds still answers a late read. */
    dispose(): void {
        this.#disposed = true;
        this.#stop?.();
        this.#stop = null;
        this.#unpin?.();
        this.#unpin = null;
    }

    /**
     * The holding, starting to watch on the first read. Subscribed before resolving, so no input
     * can move between the signature the notifier records and the resolution taken under it.
     * @returns The holding.
     */
    #ensure(): Held {
        if (this.#held === null) {
            if (!this.#disposed) {
                this.#stop = this.sources.subscribe({
                    signature: () => this.sources.signature(this.scope),
                    resolve: () => this.#resolve(),
                    ready: (next) => {
                        this.#ready(next);
                    },
                    cost: () => {
                        const graph = this.sources.snapshot();
                        return graph.nodeCount + graph.edgeCount;
                    },
                });
            }

            this.#take(this.#resolve());
        }

        return this.#held as Held;
    }

    /**
     * Resolve now; a scope that cannot be resolved holds nothing, with the reason.
     * @returns The holding.
     */
    #resolve(): Held {
        try {
            const { resolution, graph } = this.sources.resolve(this.scope);

            return resolution.problem === undefined
                ? { resolution, graph }
                : { resolution: null, graph, problem: resolution.problem.message };
        } catch (error) {
            if (!isGraphtyError(error)) {
                throw error;
            }

            return { resolution: null, graph: this.sources.snapshot(), problem: error.message };
        }
    }

    /**
     * Take a holding and pin what it resolved to.
     * @param held - The holding.
     */
    #take(held: Held): void {
        this.#held = held;
        this.#carried = null;
        this.#unpin?.();
        this.#unpin = this.#disposed ? null : this.sources.pin(this.scope);
    }

    /**
     * A new resolution: repaint the XOR on the same snapshot, both halves whole across a freeze.
     * @param next - The new holding.
     */
    #ready(next: Held): void {
        const previous = this.#held;
        const { graph } = next;
        if (previous === null) {
            this.#take(next);
            // Fire and forget: a repaint's refusal is reported where it runs.
            void this.sources.repaint({ node: every(graph.nodeCount), edge: every(graph.edgeCount) });
            return;
        }

        // What is on screen is the previous members, carried by id to the new rows across a
        // freeze; only the rows where that differs from the new resolution are repainted, so a
        // freeze that leaves a set's members alone repaints nothing for its layers.
        let before: { readonly node: U32; readonly edge: U32 } | null = null;
        if (previous.resolution !== null) {
            before =
                previous.graph === graph
                    ? { node: previous.resolution.nodes, edge: previous.resolution.edges }
                    : this.#carry(previous, graph);
        }

        this.#take(next);
        const node = moved(before?.node ?? null, next.resolution?.nodes ?? null, graph.nodeCount);
        const edge = moved(before?.edge ?? null, next.resolution?.edges ?? null, graph.edgeCount);
        if (node.length > 0 || edge.length > 0) {
            void this.sources.repaint({ node, edge });
        }
    }

    /**
     * The held members, carried by id to a newer snapshot's rows. Built once per snapshot.
     * @param held - The holding, with a resolution.
     * @param graph - The snapshot the pass paints.
     * @returns The carried bitmaps.
     */
    #carry(held: Held, graph: GraphSnapshot): { readonly node: U32; readonly edge: U32 } {
        if (this.#carried?.graph !== graph) {
            const from = held.graph;
            const resolution = held.resolution as Resolution;
            const node = makeMask(graph.nodeCount);
            for (const index of maskToIndices(resolution.nodes, from.nodeCount)) {
                const row = graph.ids.indexOf(from.ids.idOf(index));
                if (row !== INVALID_INDEX) {
                    maskSet(node, row, true);
                }
            }

            // Edges by their counters: one pass over each edge-id column, never graph-format's
            // EdgeIdIndex (design 6.3), which would hold a map entry per edge of the graph.
            const edge = makeMask(graph.edgeCount);
            const before = from.edges.typed(EDGE_ID_COLUMN, "u32");
            const after = graph.edges.typed(EDGE_ID_COLUMN, "u32");
            if (before !== null && after !== null) {
                const counters = new Set<number>();
                for (const index of maskToIndices(resolution.edges, from.edgeCount)) {
                    if (before.isSet(index)) {
                        counters.add(before.data[index]);
                    }
                }

                for (let row = 0; counters.size > 0 && row < graph.edgeCount; row++) {
                    if (after.isSet(row) && counters.has(after.data[row])) {
                        maskSet(edge, row, true);
                    }
                }
            }

            this.#carried = { graph, node, edge };
        }

        return this.#carried;
    }
}

/** The live scopes of one session's style layers. */
export class LayerScopes {
    readonly #entries = new Map<string, Entry>();
    readonly #inner: LayerScopeSources;
    readonly #sources: LayerScopeSources;
    /** Whether a whole-graph repaint is running, and whether another was asked for meanwhile. */
    #whole: "idle" | "running" | "again" = "idle";

    /**
     * Build over a session. Whole-graph repaints the entries ask for are coalesced: while one is
     * running, every further request becomes one more pass after it, over the graph as it then
     * stands. After a freeze each live set asks for one as its resolution arrives, frame by frame,
     * so ten live sets would otherwise cost ten whole-graph passes.
     * @param sources - The session.
     */
    constructor(sources: LayerScopeSources) {
        this.#inner = sources;
        this.#sources = {
            ...sources,
            repaint: (dirty) => {
                const graph = sources.snapshot();
                if (dirty.node.length < graph.nodeCount || dirty.edge.length < graph.edgeCount) {
                    return sources.repaint(dirty);
                }

                this.#repaintWhole();
                return undefined;
            },
        };
    }

    /** Run one whole-graph repaint, or fold this request into the one after the running pass. */
    #repaintWhole(): void {
        if (this.#whole !== "idle") {
            this.#whole = "again";
            return;
        }

        this.#whole = "running";
        const graph = this.#sources.snapshot();
        const done = (): void => {
            const again = this.#whole === "again";
            this.#whole = "idle";
            if (again) {
                this.#repaintWhole();
            }
        };
        const pass = this.#inner.repaint({ node: every(graph.nodeCount), edge: every(graph.edgeCount) });
        if (pass === undefined) {
            done();
        } else {
            pass.then(done, done);
        }
    }

    /**
     * The live membership of a scope, shared by every layer naming it.
     * @param scope - The scope, already checked.
     * @returns Its live membership.
     */
    live(scope: Scope): LiveScope {
        const key = canonicalize(scope);
        let entry = this.#entries.get(key);
        if (entry === undefined) {
            entry = new Entry(scope, this.#sources);
            this.#entries.set(key, entry);
        }

        return entry;
    }

    /**
     * Keep only the entries the stack names; the rest stop watching and release their pins.
     * @param scopes - The scopes the stack's layers name.
     */
    keep(scopes: Iterable<Scope>): void {
        const named = new Set<string>();
        for (const scope of scopes) {
            named.add(canonicalize(scope));
        }

        for (const [key, entry] of this.#entries) {
            if (!named.has(key)) {
                entry.dispose();
                this.#entries.delete(key);
            }
        }
    }

    /** Stop every entry. */
    dispose(): void {
        this.keep([]);
    }
}
