/**
 * A stand-in for the element's session: the style stack, the run list, and the one policy
 * that turns a finished run into a picture.
 *
 * WHAT IT MODELS, and why each part is here rather than stubbed flat:
 *
 * - **Layers addressed by a minted id, read bottom first.** A stack that handed positions
 *   back would let a board pass while the shell still did index arithmetic, which is the
 *   whole class of defect this migration removes.
 * - **`removeBySource`, with element-owned layers never swept.** The element's own base and
 *   selection layers are seeded here and are `locked`, so a board catches a sweep that would
 *   take the layer carrying every node's shape type -- the failure that left the next load
 *   dying in mesh building with "shape with type required to create mesh".
 * - **Auto-apply on a run's FIRST completion, and a hand-written layer winning.** A run that
 *   publishes a value per element derives one colour encoding; a run that already painted
 *   does not paint twice; and a suggestion is dropped when a layer somebody wrote by hand
 *   already drives that channel.
 * - **A legend derived from the layers**, because that is where the shell reads back what a
 *   run painted.
 *
 * What it does NOT model is anything about drawing: there is no repaint, no canvas and no
 * element. A board that needs those is a browser board against the real element.
 */

import type { Channel, GraphSession, Layer, LayerSpec, LegendBlock, RunId } from "@graphty/graphty-element/session";

/** One run, as the fake session records it. */
interface FakeRun {
    /** The run id. */
    readonly id: RunId;
    /** The catalogue key. */
    readonly algorithm: string;
    /** Where it got to. Every run this fake records has finished. */
    readonly status: "succeeded";
}

/** The doors a board reaches past the session to assert on. */
export interface FakeSession {
    /** The session itself, as the shell sees it. */
    readonly session: GraphSession;
    /** The stack, bottom first, including the element's own locked layers. */
    readonly layers: () => readonly Layer[];
    /** Records a finished run and applies what its shape suggests. */
    readonly finishRun: (algorithm: string, style?: boolean) => RunId;
    /** Adds a layer as a template or a plugin would, bypassing the shell. */
    readonly seed: (spec: LayerSpec) => Layer;
    /** Called with the algorithm key whenever `runs.start` is asked for one. */
    readonly onStart: (handler: (algorithm: string) => void) => void;
}

/**
 * The algorithms whose result shape publishes a value per node, and so derives an encoding,
 * with the field the encoding reads in the words the element's catalogue gives it.
 *
 * The words matter because the legend prints them: a block's `field.plainName` is what the
 * canvas draws beside "Color:", and a fake that invented its own would let a board pass over a
 * legend the element would never produce.
 */
const ENCODING_FIELDS: Readonly<Record<string, { readonly plainName: string; readonly technicalName: string }>> = {
    degree: { plainName: "Connections", technicalName: "degree" },
    pagerank: { plainName: "Influence", technicalName: "PageRank score" },
    betweenness: { plainName: "Bridging", technicalName: "betweenness" },
    louvain: { plainName: "Community", technicalName: "group" },
};

/** The channel every derived encoding in this fake paints. */
const COLOUR: Channel = "node.color";

/**
 * A session holding a style stack, a run list and the auto-apply policy between them.
 * @returns the session and the doors a board asserts through.
 */
export function createFakeSession(): FakeSession {
    const watchers = new Set<() => void>();
    const runs: FakeRun[] = [];
    let minted = 0;

    const layers: Layer[] = [
        {
            id: "element-base",
            name: "default",
            kind: "base",
            source: { by: "element", reason: "default" },
            locked: true,
            enabled: true,
            target: "node",
            selector: { match: "everything" },
            set: { [COLOUR]: "#6366F1" },
        },
        {
            id: "element-selection",
            name: "selection",
            kind: "base",
            source: { by: "element", reason: "selection" },
            locked: true,
            enabled: true,
            target: "node",
            selector: { match: "everything" },
            set: { [COLOUR]: "#FFD700" },
        },
    ];

    const publish = (): void => {
        for (const watcher of watchers) {
            watcher();
        }
    };

    const build = (spec: LayerSpec): Layer => {
        minted += 1;

        return {
            id: `layer-${String(minted)}`,
            name: spec.name,
            kind: spec.kind ?? "custom",
            source: spec.source ?? { by: "user" },
            locked: spec.source?.by === "element",
            enabled: spec.enabled ?? true,
            target: spec.target ?? "node",
            selector: spec.selector,
            ...(spec.set === undefined ? {} : { set: spec.set }),
            ...(spec.encode === undefined ? {} : { encode: spec.encode }),
        };
    };

    const seed = (spec: LayerSpec): Layer => {
        const layer = build(spec);

        layers.push(layer);
        publish();

        return layer;
    };

    const indexOf = (id: string): number => layers.findIndex((layer) => layer.id === id);

    /** Whether a layer somebody wrote by hand already drives the colour channel. */
    const handHolds = (): boolean =>
        layers.some(
            (layer) =>
                layer.source.by === "user" && (layer.set?.[COLOUR] !== undefined || layer.encode?.[COLOUR] !== undefined),
        );

    const styles = {
        list: (): readonly Layer[] => [...layers],
        get: (id: string): Layer | undefined => layers.find((layer) => layer.id === id),
        add: (spec: LayerSpec): Promise<Layer> => Promise.resolve(seed(spec)),
        update: (id: string, patch: Partial<LayerSpec>): Promise<Layer> => {
            const at = indexOf(id);

            if (at === -1) {
                return Promise.reject(new Error(`no layer ${id}`));
            }

            if (layers[at].locked) {
                return Promise.reject(new Error("E_PROTECTED"));
            }

            const merged = { ...layers[at], ...patch };

            if ("set" in patch && patch.set === undefined) {
                delete (merged as { set?: unknown }).set;
            }

            layers[at] = merged as Layer;
            publish();

            return Promise.resolve(layers[at]);
        },
        remove: (id: string): Promise<void> => {
            const at = indexOf(id);

            if (at === -1 || layers[at].locked) {
                return Promise.reject(new Error("E_PROTECTED"));
            }

            layers.splice(at, 1);
            publish();

            return Promise.resolve();
        },
        move: (id: string, before: string | null): Promise<void> => {
            const at = indexOf(id);

            if (at === -1) {
                return Promise.reject(new Error(`no layer ${id}`));
            }

            const [moved] = layers.splice(at, 1);
            const target = before === null ? layers.length : indexOf(before);

            layers.splice(target === -1 ? layers.length : target, 0, moved);
            publish();

            return Promise.resolve();
        },
        removeBySource: (predicate: (source: Layer["source"]) => boolean): Promise<readonly string[]> => {
            const removed: string[] = [];

            for (let at = layers.length - 1; at >= 0; at--) {
                if (!layers[at].locked && predicate(layers[at].source)) {
                    removed.unshift(layers[at].id);
                    layers.splice(at, 1);
                }
            }

            if (removed.length > 0) {
                publish();
            }

            return Promise.resolve(removed);
        },
        /* `encode` REPLACES rather than stacks: a layer already painting this channel from
           this run is taken over in place, so a run encoded twice leaves one layer and one
           legend block rather than two. */
        encode: (spec: { readonly run: string; readonly channel?: Channel }): Promise<Layer> => {
            const runId = spec.run;
            const channel = spec.channel ?? COLOUR;
            const at = layers.findIndex(
                (layer) =>
                    layer.source.by === "run" && layer.source.runId === runId && layer.encode?.[channel] !== undefined,
            );
            const algorithm = runs.find((run) => run.id === runId)?.algorithm ?? runId;
            const built = build({
                name: algorithm,
                target: "node",
                kind: "encoding",
                source: { by: "run", runId, algorithm, params: {} },
                selector: { match: "has", path: `results.${runId}.value` },
                encode: { [channel]: { by: `results.${runId}.value`, scale: "linear", palette: "viridis" } },
            });

            if (at === -1) {
                layers.push(built);
            } else {
                layers[at] = { ...built, id: layers[at].id };
            }

            publish();

            return Promise.resolve(layers[at === -1 ? layers.length - 1 : at]);
        },
        resolveToStatic: (id: string): Promise<Layer | undefined> => Promise.resolve(styles.get(id)),
        legend: (): readonly LegendBlock[] =>
            layers
                .filter((layer) => layer.encode?.[COLOUR] !== undefined)
                .map((layer): LegendBlock => {
                    const runId = layer.source.by === "run" ? layer.source.runId : undefined;
                    const algorithm = layer.source.by === "run" ? layer.source.algorithm : undefined;
                    const words = ENCODING_FIELDS[algorithm ?? ""] ?? {
                        plainName: layer.name,
                        technicalName: layer.name,
                    };

                    return {
                        channel: COLOUR,
                        layerId: layer.id,
                        ...(runId === undefined ? {} : { runId }),
                        kind: algorithm === "louvain" ? "categorical" : "sequential",
                        field: { ...words, path: `results.${runId ?? ""}.value` },
                        scale: { kind: "linear", label: "linear" },
                        swatches: [
                            { label: "low", value: 0, color: "#440154" },
                            { label: "high", value: 1, color: "#FDE725" },
                        ],
                        departures: [],
                    };
                }),
    };

    let started: (algorithm: string) => void = () => undefined;

    const session = {
        styles,
        runs: {
            list: (): readonly FakeRun[] => [...runs],
            /* `start` is what the shell calls now, so the fake has to be the thing that runs
               the algorithm AND records the run. It resolves on a microtask, as a queued run
               does, and its `style` option decides whether the element paints it. */
            start: (algorithm: string, _params?: unknown, options?: { readonly style?: boolean }) => {
                started(algorithm);

                const id = finishRun(algorithm, options?.style ?? true);

                return Object.assign(Promise.resolve({ id }), { id });
            },
        },
        on: (_event: string, handler: () => void): (() => void) => {
            watchers.add(handler);

            return () => {
                watchers.delete(handler);
            };
        },
    } as unknown as GraphSession;

    function finishRun(algorithm: string, style = true): RunId {
        const id = `run-${algorithm}-${String(runs.length + 1)}`;

        runs.push({ id, algorithm, status: "succeeded" });

        if (style && ENCODING_FIELDS[algorithm] !== undefined && !handHolds()) {
            seed({
                name: algorithm,
                target: "node",
                kind: "encoding",
                source: { by: "run", runId: id, algorithm, params: {} },
                selector: { match: "has", path: `results.${id}.value` },
                encode: { [COLOUR]: { by: `results.${id}.value`, scale: "linear", palette: "viridis" } },
            });
        }

        return id;
    }

    return {
        session,
        layers: () => [...layers],
        finishRun,
        seed,
        onStart: (handler) => {
            started = handler;
        },
    };
}
