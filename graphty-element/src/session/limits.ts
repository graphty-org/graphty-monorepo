/**
 * @file The ceilings and caps the element runs under when nothing has measured this machine.
 *
 * `Capabilities.limits` is documented as MEASURED: `session.calibrate()` times the host and fills
 * it in. That probe does not exist yet, and until it does every consumer that needs one of these
 * numbers has to invent it -- which is how the one shipped consumer ended up carrying a
 * large-graph threshold of its own, ten times the element's, with nothing between the two to
 * notice they disagreed.
 *
 * So these are published as what they are: SHIPPED DEFAULTS, not measurements of the machine this
 * code is running on. When `calibrate()` lands it replaces them and `Capabilities.calibration.basis`
 * turns from `"defaults"` into `"probe"`, which is how a consumer can tell which kind of number it
 * is holding.
 *
 * TWO OF THEM ARE ENFORCED, AND WERE MEASURED. `renderCeiling` and `edgesDrawn` were once the
 * design table's figures, 200,000 nodes and 500,000 edges, and nothing checked them. The renderer
 * could not reach either: at 18,000 nodes / 180,000 edges the page stopped producing frames
 * (issue #405). The wall was never the GPU. It is V8's heap -- `performance.memory.jsHeapSizeLimit`
 * is 3.5 GB in headless Chromium -- and what filled it was the renderer, which drew every edge as
 * two Babylon meshes plus, on the default arrow-headed style, a ShaderMaterial of its own: about
 * 20 KB per edge.
 *
 * AN EDGE NOW COSTS ABOUT A SIXTEENTH OF THAT, and these numbers moved with it. Its line and its
 * two caps are thin instances of shared meshes, so an edge adds no scene object and no material
 * at all (`EdgeLineBatch`, `ArrowCapBatch`, issue #419). Re-measured 2026-09-26 in headless
 * Chromium on an RTX 4070 SUPER against the source of this branch AND of master, the same way as
 * before -- `layout="random"`, ten edges per node, the default style -- medians of three runs. The
 * heap cap in that Chromium is 4,096 MB, and the RSS column is the RENDERER process, which is what
 * actually gets killed:
 *
 * | nodes | edges | heap | % of cap | renderer RSS | scene meshes | load | frame |
 * | --- | --- | --- | --- | --- | --- | --- | --- |
 * | 10,000 | 100,000 | 312 MB | 8 % | 553 MB | 10,003 | 3.3 s | 54 ms |
 * | 20,000 | 200,000 | 555 MB | 14 % | 2,118 MB | 20,003 | 6.1 s | 162 ms |
 * | 50,000 | 500,000 | 1,031 MB | 25 % | 2,319 MB | 50,003 | 13.0 s | 488 ms |
 * | 100,000 | 1,000,000 | 1,994 MB | 49 % | 3,318 MB | 100,003 | 27.5 s | 1,120 ms |
 * | 150,000 | 1,500,000 | 3,090 MB | 75 % | 4,086 MB | 150,003 | 37.2 s | 1,524 ms |
 *
 * On master the same 10,000 / 100,000 graph is 1,773 MB and 210,003 meshes, 20,000 / 200,000
 * reaches 85 % of the cap, and 30,000 / 300,000 is DEAD in every run -- no result in 180 seconds,
 * the renderer at 4,336 MB, and the main thread never answering again. The mesh count here is the
 * node count instead of twenty-one times it: the edges have left the scene.
 *
 * THE CEILINGS BELOW ARE THE LARGEST PAIR MEASURED THAT STILL HAS ROOM. Together they allow
 * 100,000 nodes AND 1,000,000 edges, which is the 49 % row -- a quarter of the heap still free for
 * a layout and a run to allocate. The row under it survives too, but 150,000 / 1,500,000 leaves
 * nothing: 75 % of the heap, and a renderer within 250 MB of the size at which master's is killed.
 * `DataManager` refuses a load past either with `E_TOO_LARGE`; see `refuseAboveCeiling` there for
 * why a refusal and not a degraded draw.
 *
 * WHAT A CEILING DOES NOT PROMISE. It is the size at which the renderer dies, not the size at
 * which it is pleasant: at 1,000,000 edges the element draws about one frame a second. That was
 * always true of these numbers -- the previous 100,000-edge ceiling already drew at 328 ms a frame
 * -- but the constraint a reader feels has moved from the heap to the frame. Measured on a quiet
 * box, 60 fps holds to 40,000 edges and 30 fps to 80,000, which is the range `largeGraphThreshold`
 * exists to describe; it is 10,000 NODES today and nothing measured it. That is the next number.
 *
 * WHAT THESE NUMBERS DO NOT COVER, and it is the same exclusion as before: a patterned line style
 * gives every dot and dash a mesh and a ShaderMaterial of its own (`PatternedLineRenderer`), and
 * an animated line is never batched. Under either, the heap runs out earlier than this says.
 *
 * ONE OF THE SIX FIELDS IS ABSENT, and it is worth saying why the other five are not.
 *
 * Two names used to collide with `CostGateLimits` and mean different things on each side, so
 * neither could be published without teaching a consumer the wrong unit: `exactComputationCap`
 * was a node count here and seconds there, and `memoryBudgetBytes` was one graph's memory here
 * and one run's published columns there. Both now carry their unit in the name --
 * `approximateAboveNodes` and `graphMemoryBudgetBytes` here, `exactComputationSeconds` and
 * `runColumnBudgetBytes` on the gate -- so the collision is gone and with it the reason to
 * withhold a number.
 *
 * `graphMemoryBudgetBytes` is still absent, for the one reason that survives the rename: the
 * element API design's defaults table names no figure for it. There is nothing measured and
 * nothing designed to publish, and inventing one here is exactly what this file exists to stop a
 * consumer doing. It is omitted from the TYPE as well as from the value, so a reader cannot
 * reach a field that has no defensible answer. A consumer who wants the per-run budget already
 * has `DEFAULT_COST_GATE_LIMITS.runColumnBudgetBytes`.
 */

import type { Limits } from "../acceleration";
import { GraphtyError } from "../errors/GraphtyError";
import { DEFAULT_SELECTION_CAP } from "./selection";

/**
 * The fields of {@link Limits} the element can state a defensible default for.
 *
 * The one it cannot is `graphMemoryBudgetBytes`, for which the design names no figure; see the
 * file comment.
 */
export type DefaultableLimits = Omit<Limits, "graphMemoryBudgetBytes">;

/**
 * What the element runs under until something measures this machine.
 *
 * Read it rather than inventing a number: a consumer's own threshold is a copy that nothing keeps
 * in step, and the element is the party that knows what its own renderer and its own passes cost.
 */
export const DEFAULT_LIMITS: Readonly<DefaultableLimits> = Object.freeze({
    /** Above this node count the element draws less visual detail. A shipped default, not measured. */
    largeGraphThreshold: 10_000,
    /**
     * The most nodes the element will hold. Enforced: a load past it fails with `E_TOO_LARGE`.
     * Measured (see the file comment), on one machine; not this machine's figure.
     */
    renderCeiling: 100_000,
    /** The most elements one selection will hold before it refuses to grow. A shipped default, not measured. */
    selectionCap: DEFAULT_SELECTION_CAP,
    /**
     * The most edges the element will hold. Enforced: a load past it fails with `E_TOO_LARGE`.
     * Measured (see the file comment), on one machine; not this machine's figure.
     */
    edgesDrawn: 1_000_000,
    /**
     * Above this NODE COUNT an approximable algorithm is approximated rather than computed
     * exactly. A shipped default, not measured. Not to be confused with the cost gate's
     * `exactComputationSeconds`, which is a duration and answers a different question.
     */
    approximateAboveNodes: 2_000,
});

/**
 * The refusal of a load past what the renderer can draw.
 * @param of - what is counted
 * @param held - how many the graph holds already
 * @param adding - how many the load would add
 * @param limit - the most the renderer can draw
 * @param graph - the graph's counts now
 * @param graph.nodes - how many nodes it holds
 * @param graph.edges - how many edges it holds
 * @returns the `E_TOO_LARGE` error
 */
export function tooLargeError(
    of: "nodes" | "edges",
    held: number,
    adding: number,
    limit: number,
    graph: { readonly nodes: number; readonly edges: number },
): GraphtyError {
    const count = held + adding;
    return new GraphtyError({
        code: "E_TOO_LARGE",
        source: "data",
        message:
            `Loading ${adding.toLocaleString("en-US")} more ${of} would take the graph to ` +
            `${count.toLocaleString("en-US")}, past the ${limit.toLocaleString("en-US")} ` +
            `this renderer can draw. Load a subset of the graph.`,
        details: { limit, count, of, graph: { nodes: graph.nodes, edges: graph.edges } },
    });
}

/**
 * The ceilings a consumer asks for through `limits`: the most nodes and edges a load may bring.
 *
 * Honored under `render-path="batched"`, whose rows cost no meshes of their own; under
 * `"objects"` the {@link DEFAULT_LIMITS} stand, because their reason (the heap a node of meshes
 * costs) still holds there. A field left out keeps its default.
 * @experimental cosmograph
 */
export type LimitsOption = Partial<Pick<Limits, "renderCeiling" | "edgesDrawn">>;

/** The two fields of {@link LimitsOption}, in a fixed order. */
const CEILING_KEYS = ["renderCeiling", "edgesDrawn"] as const;

/**
 * The ceilings asked for and the ceilings in force, which differ while they are not honored.
 *
 * The element owns one and says whether it is honored from its render path; a session reads
 * `effective` for `capabilities.limits` and hears each change. Plain numbers, no renderer.
 * @internal
 */
export class RenderLimits {
    #requested: Readonly<LimitsOption> = Object.freeze({});
    #honored: boolean;
    #effective: Readonly<DefaultableLimits> = DEFAULT_LIMITS;
    readonly #listeners = new Set<() => void>();

    /**
     * Start with nothing asked for.
     * @param honored - Whether the asked-for ceilings are in force from the start.
     */
    constructor(honored: boolean) {
        this.#honored = honored;
    }

    /**
     * The ceilings asked for, as given.
     * @returns The ceilings.
     */
    get requested(): Readonly<LimitsOption> {
        return this.#requested;
    }

    /**
     * Whether a non-empty request is being set aside.
     * @returns True while ceilings were asked for and are not honored.
     */
    get ignored(): boolean {
        return !this.#honored && CEILING_KEYS.some((key) => this.#requested[key] !== undefined);
    }

    /**
     * The limits in force: the same frozen object until either ceiling changes.
     * @returns The limits.
     */
    get effective(): Readonly<DefaultableLimits> {
        return this.#effective;
    }

    /**
     * The limits in force when they are not the shipped ones, for a reader that otherwise reads
     * `DEFAULT_LIMITS` itself.
     * @returns The limits, or undefined while the defaults stand.
     */
    get overrides(): Readonly<DefaultableLimits> | undefined {
        return this.#effective === DEFAULT_LIMITS ? undefined : this.#effective;
    }

    /**
     * Ask for ceilings. Each given value is a whole number of at least 1.
     * @param value - The ceilings; a field left out keeps its default.
     * @throws An Error naming the field when a value is not a whole number of at least 1.
     */
    request(value: LimitsOption): void {
        const next: LimitsOption = {};
        for (const key of CEILING_KEYS) {
            const ceiling = (value as LimitsOption | null | undefined)?.[key];
            if (ceiling === undefined) {
                continue;
            }

            if (!Number.isInteger(ceiling) || ceiling < 1) {
                throw new Error(`limits.${key} must be a whole number of at least 1, not ${String(ceiling)}`);
            }

            next[key] = ceiling;
        }

        this.#requested = Object.freeze(next);
        this.#settle();
    }

    /**
     * Say whether the asked-for ceilings are in force.
     * @param honored - True on the `"batched"` render path.
     */
    honor(honored: boolean): void {
        this.#honored = honored;
        this.#settle();
    }

    /**
     * Hear each change of the limits in force.
     * @param listener - Called after the change.
     * @returns The unsubscribe.
     */
    onChange(listener: () => void): () => void {
        this.#listeners.add(listener);
        return () => this.#listeners.delete(listener);
    }

    #settle(): void {
        const next = this.#honored ? { ...DEFAULT_LIMITS, ...this.#requested } : DEFAULT_LIMITS;
        if (CEILING_KEYS.every((key) => next[key] === this.#effective[key])) {
            return;
        }

        this.#effective = next === DEFAULT_LIMITS ? DEFAULT_LIMITS : Object.freeze(next);
        for (const listener of [...this.#listeners]) {
            listener();
        }
    }
}
