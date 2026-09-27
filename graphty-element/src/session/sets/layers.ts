/**
 * @file The live scopes style layers name (design/sets/sets-design.md section 11). Internal.
 *
 * A `{match:"scope"}` layer tests one bit per element against its scope's live bitmap. Layers
 * naming the same scope share one live entry, keyed by the scope's canonical form. An entry starts
 * watching the first time a pass reads it: it subscribes to the session's change notifier with
 * the scope's input signature, and holds the resolution it last took, pinned in the resolution
 * cache so budget pressure never evicts what is on screen.
 *
 * When the scope moves on the same snapshot, the elements to repaint are exactly the old bitmap
 * XOR the new one. Across a freeze the two bitmaps index different rows, so the entry asks for a
 * full pass of both halves instead, on the scheduler's frame. Until then it keeps its paint: its
 * old members are carried to the new rows by id, once per snapshot, so a whole-graph pass that
 * runs before the frame paints what was painted before.
 *
 * A scope that cannot be resolved -- a removed set, a cycle -- paints nothing, and the pass goes
 * on. Nothing here throws into a pass.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { type GraphSnapshot, INVALID_INDEX, makeMask, maskSet, maskToIndices, maskXor, type U32 } from "@graphty/graph-format";

import type { Scope } from "../../catalog/types";
import { isGraphtyError } from "../../errors";
import { canonicalize } from "../runs/runId";
import { edgeSpaceOf } from "../scope/ScopeApi";
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
     */
    repaint(dirty: ElementIndices): void;
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

            return resolution.problem === undefined ? { resolution, graph } : { resolution: null, graph, problem: resolution.problem.message };
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
        this.#take(next);
        const {graph} = next;
        if (previous?.graph !== graph) {
            this.sources.repaint({ node: every(graph.nodeCount), edge: every(graph.edgeCount) });
            return;
        }

        this.sources.repaint({
            node: moved(previous.resolution?.nodes ?? null, next.resolution?.nodes ?? null, graph.nodeCount),
            edge: moved(previous.resolution?.edges ?? null, next.resolution?.edges ?? null, graph.edgeCount),
        });
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

            const edge = makeMask(graph.edgeCount);
            const fromSpace = edgeSpaceOf(from);
            const toSpace = edgeSpaceOf(graph);
            for (const index of maskToIndices(resolution.edges, from.edgeCount)) {
                const row = toSpace.indexOf(fromSpace.idOf(index));
                if (row !== INVALID_INDEX) {
                    maskSet(edge, row, true);
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

    /**
     * Build over a session.
     * @param sources - The session.
     */
    constructor(private readonly sources: LayerScopeSources) {}

    /**
     * The live membership of a scope, shared by every layer naming it.
     * @param scope - The scope, already checked.
     * @returns Its live membership.
     */
    live(scope: Scope): LiveScope {
        const key = canonicalize(scope);
        let entry = this.#entries.get(key);
        if (entry === undefined) {
            entry = new Entry(scope, this.sources);
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
