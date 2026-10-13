/**
 * @file A file's styles applied by the load that read the file, inside its `data.import` step: the
 * previous file's layers swept on a replacing load, the style values written to the load's
 * namespace, the layers checked one by one and added above the element's base layers, the hidden
 * elements given to the visibility filter and the background to the configuration. One load is
 * one undo step, and redo puts all of it back without reading the file again.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import type { ExtractedStyles } from "@graphty/graph-io/styles";

import type { Channel, EdgeId, LayerId, LayerSpec, NodeId, RuleTree } from "../../../catalog/types";
import type { LoadReport } from "../../../data/report";
import { readSeedPosition } from "../../../data/seedPosition";
import type { DataImportCommand } from "../../commands/data";
import type { UndoableContext } from "../../project/Dispatcher";
import type { PositionEntry } from "../../types";
import type { CompiledLayer } from "../Layer";
import { quotePath } from "../predicate";
import { FILE_STYLE_TRANSLATION_ISSUE } from "./codes";
import { dataPaths, elementIdsOf, type ReaderColumnPath } from "./columns";
import { fileStyleNamespace, fileStylePath } from "./path";
import {
    asFileStyleStore,
    FILE_STYLES_VALUE,
    fileLengthScale,
    type FileStyleColumnValues,
    fileStyleValuesOf,
    recordPositionScale,
} from "./store";
import { type FileStyleNote, type FileStyleOptions, translateFileStyles, type Translation } from "./translate";

/** The template a file's layers are filed under: `file:<importId>`. */
export const FILE_TEMPLATE_PREFIX = "file:";

/** A file's styles, as the data source that read the file gives them. */
export interface FileStylesRead {
    /** The styles. */
    readonly extracted: ExtractedStyles;
    /** The graph the import built, which the styles' element indexes refer to. */
    readonly snapshot: GraphSnapshot;
    /** Where the reader put each column on its records. */
    readonly path: ReaderColumnPath;
    /** The graph-io format id or JSON dialect the file was read as. */
    readonly format: string;
}

/** What a data source gives a load about the styles of what it read. */
export interface FileStyleSource {
    /** The styles of what it read, read on demand; null when the file carries none. */
    readonly fileStyles: (options?: {
        readonly toolDefaults?: boolean;
        readonly signal?: AbortSignal;
    }) => Promise<FileStylesRead | null>;
}

/**
 * The data source that read a draft's held rows, by the rows: kept beside the import command
 * rather than in it, so the command stays plain data.
 */
export const HELD_READERS = new WeakMap<object, Partial<FileStyleSource>>();

/** What a load leaves for the step that applies its styles. */
export interface ImportOutcome {
    /** The data source the records came from, when it can say what styles it read. */
    readonly reader: Partial<FileStyleSource> | null;
    /** The id each edge record of the load became, in record order; null for one that made no edge. */
    readonly edgeIds: readonly (EdgeId | null)[];
    /** The report the load sealed. */
    readonly report: LoadReport;
    /**
     * The id the graph holds a node under, for an id it may spell the other way.
     * @param id - The id.
     * @returns The held id, or undefined.
     */
    heldNode(id: NodeId): NodeId | undefined;
}

/** What a load says about the styles it applied. */
export interface LoadStyleReport {
    /** The layers the file's styles made, bottom first. */
    readonly layers: readonly LayerId[];
    /** What reading and translating the file's styles met, as codes and facts. */
    readonly notes: readonly FileStyleNote[];
    /**
     * What the load multiplied the file's lengths by: its node sizes, edge widths, label sizes
     * (unless `labelSizes: "file"`) and positions alike, so the drawing keeps the file's
     * proportions. 1 when the file carries no styles. Positions are also multiplied by the
     * element's `positionScale`.
     */
    readonly lengthScale: number;
}

/**
 * The choice of styles an import carries, or reads from its source's options.
 * @param command - The import.
 * @returns Whether to draw the file's styles, and how.
 */
function choiceOf(command: DataImportCommand): {
    readonly styles: "file" | "none";
    readonly options: FileStyleOptions;
} {
    const config = command.source.config ?? {};
    const styles = command.styles ?? (config.styles === "file" ? "file" : "none");
    const fromConfig =
        typeof config.styleOptions === "object" && config.styleOptions !== null
            ? (config.styleOptions as FileStyleOptions)
            : {};
    return { styles, options: command.styleOptions ?? fromConfig };
}

/**
 * Whether a layer was made from a file's styles.
 * @param entry - The layer.
 * @returns True for a layer filed under a `file:` template.
 */
function isFileLayer(entry: CompiledLayer): boolean {
    const { source } = entry.layer;
    return source.by === "template" && source.templateId.startsWith(FILE_TEMPLATE_PREFIX);
}

/**
 * What the element's own base layers paint, per kind.
 * @param stack - The layer stack.
 * @returns The base values.
 */
function baseValues(stack: readonly CompiledLayer[]): Record<"node" | "edge", Partial<Record<Channel, unknown>>> {
    const out: Record<"node" | "edge", Partial<Record<Channel, unknown>>> = { node: {}, edge: {} };
    for (const entry of stack) {
        const { layer } = entry;
        if (layer.source.by === "element" && layer.source.reason === "default" && layer.target !== undefined) {
            Object.assign(out[layer.target], layer.set ?? {});
        }
    }

    return out;
}

/**
 * Apply the styles of the file an import read, inside the import's step.
 * @param command - The import.
 * @param outcome - What the load left.
 * @param ctx - The import's context.
 */
export async function applyFileStyles(
    command: DataImportCommand,
    outcome: ImportOutcome | null,
    ctx: UndoableContext,
): Promise<void> {
    const { styles, options } = choiceOf(command);
    const loaded = outcome !== null && command.measure === undefined;
    const replacing = loaded && command.mode !== "merge";
    const stack = ctx.state.styles;
    if (replacing) {
        const ids = stack.filter(isFileLayer).map((entry) => entry.layer.id);
        if (ids.length > 0) {
            await ctx.inline({ op: "style.patch", action: "removeBySource", ids });
        }
    }

    if (!loaded || styles !== "file") {
        return;
    }

    const read =
        (await outcome.reader?.fileStyles?.({
            ...(options.toolDefaults === undefined ? {} : { toolDefaults: options.toolDefaults }),
            signal: ctx.signal,
        })) ?? null;
    ctx.signal.throwIfAborted();
    const applied: LoadStyleReport =
        read === null
            ? { layers: [], notes: [], lengthScale: 1 }
            : await applyRead(outcome, read, options, ctx, replacing);
    const report: LoadReport = Object.freeze({
        ...outcome.report,
        styles: Object.freeze({
            layers: Object.freeze([...applied.layers]),
            notes: Object.freeze([...applied.notes]),
            lengthScale: applied.lengthScale,
        }),
    });
    ctx.services.data?.values?.({ importReport: report }, ctx.draft);
}

/**
 * Translate and apply one file's styles.
 * @param outcome - What the load left.
 * @param read - The file's styles.
 * @param options - The load's choices.
 * @param ctx - The import's context.
 * @param replacing - Whether the load replaced the graph.
 * @returns The layers made and the notes.
 */
async function applyRead(
    outcome: ImportOutcome,
    read: FileStylesRead,
    options: FileStyleOptions,
    ctx: UndoableContext,
    replacing: boolean,
): Promise<LoadStyleReport> {
    const store = asFileStyleStore(ctx.state.graph.values.get(FILE_STYLES_VALUE));
    const held = replacing ? [] : fileStyleValuesOf(store);
    const namespace = fileStyleNamespace(read.format, new Set(held.map((load) => load.namespace)));
    const importId = namespace;
    const translation = translateFileStyles({
        extracted: read.extracted,
        snapshot: read.snapshot,
        namespace,
        format: read.format,
        importId,
        options,
        // A merge draws at the scale the graph's files already have, so one drawing has one scale.
        ...(held.length > 0 ? { lengthScale: fileLengthScale(store) } : {}),
        base: baseValues(ctx.state.styles),
        dataPath: dataPaths(read.path),
    });
    const notes = [...translation.notes];

    // The values, keyed by the ids the element holds the elements under.
    const ids = elementIdsOf(read.snapshot, outcome.edgeIds, (id) => outcome.heldNode(id));
    const columns: FileStyleColumnValues[] = [];
    for (const kind of ["node", "edge"] as const) {
        for (const [key, values] of translation.columns[kind]) {
            const keptIds: (NodeId | EdgeId)[] = [];
            const keptValues: (string | number | boolean)[] = [];
            values.forEach((value, i) => {
                const id = ids[kind][i];
                if (value !== null && id !== null && id !== undefined) {
                    keptIds.push(id);
                    keptValues.push(value);
                }
            });
            columns.push({ kind, key, ids: keptIds, values: keptValues });
        }
    }

    const { lengthScale } = translation;
    const load = { importId, namespace, format: read.format, columns, lengthScale };
    await ctx.inline({ op: "data.setFileStyles", loads: [...held, load] });
    if (lengthScale !== fileLengthScale(store)) {
        await placeAtScale(ids.node, ctx);
    }

    // Checked one by one, so a layer the element refuses is left out and the rest apply.
    const service = ctx.services.styles;
    const accepted: LayerSpec[] = [];
    for (const layer of translation.layers) {
        const candidates = [[layer.spec], ...(layer.fallback === undefined ? [] : [layer.fallback])];
        const usable = candidates.find((specs) => specs.every((spec) => service?.validate?.(spec).ok ?? true));
        if (usable === undefined) {
            notes.push({
                code: FILE_STYLE_TRANSLATION_ISSUE.LAYER_REFUSED,
                params: { property: layer.spec.name, target: layer.spec.target ?? null, count: 1, samples: [] },
            });
            continue;
        }

        if (usable !== candidates[0]) {
            notes.push({
                code: FILE_STYLE_TRANSLATION_ISSUE.LAYER_SPEC_IGNORED,
                params: {
                    property: layer.spec.name,
                    target: layer.spec.target ?? null,
                    count: 1,
                    samples: [],
                    reason: "REFUSED",
                },
            });
        }

        accepted.push(...usable);
    }

    const layers: LayerId[] = [];
    if (accepted.length > 0) {
        const value = (await ctx.inline({
            op: "style.template",
            document: { version: 1, layers: accepted },
            templateId: `${FILE_TEMPLATE_PREFIX}${importId}`,
            at: positionOf(ctx.state.styles, replacing),
        })) as { result?: { applied?: readonly LayerId[]; unbound?: readonly { layerId: LayerId }[] } } | undefined;
        layers.push(...(value?.result?.applied ?? []), ...(value?.result?.unbound ?? []).map((entry) => entry.layerId));
    }

    await hide(translation.hidden, namespace, ctx, notes);
    if (translation.background !== null) {
        await ctx
            .inline({
                op: "config.set",
                values: { background: { backgroundType: "color", color: translation.background } },
            })
            .catch(() => {
                notes.push({
                    code: FILE_STYLE_TRANSLATION_ISSUE.NO_COUNTERPART,
                    params: {
                        property: "background",
                        target: "graph",
                        count: 1,
                        samples: [translation.background ?? ""],
                    },
                });
            });
    }

    return { layers, notes, lengthScale };
}

/**
 * Put the nodes a load placed from their records where the graph's new scale puts them. The load
 * seeded them as it wrote them, before its styles chose the scale they share with the node sizes.
 * @param ids - The load's nodes, by the import's element index.
 * @param ctx - The import's context.
 */
async function placeAtScale(ids: readonly (NodeId | null | undefined)[], ctx: UndoableContext): Promise<void> {
    const { graph } = ctx.state;
    const positionScale = ctx.services.config?.().data.knownFields.positionScale ?? 1;
    const scale = recordPositionScale(positionScale, graph.values);
    const entries: PositionEntry[] = [];
    for (const id of ids) {
        const record = id === null || id === undefined ? undefined : graph.nodes.get(id);
        const seed = record === undefined ? null : readSeedPosition(record);
        if (seed !== null && id !== null && id !== undefined) {
            entries.push({ id, x: seed[0] * scale, y: seed[1] * scale, z: seed[2] * scale });
        }
    }

    if (entries.length > 0) {
        await ctx.inline({ op: "positions.set", entries });
    }
}

/**
 * Where a load's layers go: directly above the element's base layers, or, beside another file's
 * layers, directly above the last of them.
 * @param stack - The stack before the load's layers are added.
 * @param replacing - Whether the load replaced the graph (and swept every file's layers).
 * @returns The position.
 */
function positionOf(stack: readonly CompiledLayer[], replacing: boolean): "aboveBase" | "top" | { before: LayerId } {
    let last = -1;
    if (!replacing) {
        stack.forEach((entry, at) => {
            if (isFileLayer(entry)) {
                last = at;
            }
        });
    }

    if (last === -1) {
        return "aboveBase";
    }

    const next = stack[last + 1] as CompiledLayer | undefined;
    return next === undefined ? "top" : { before: next.layer.id };
}

/**
 * Hide the elements the file hides, through the visibility filter, beside any filter already set.
 * @param hidden - The hidden elements per kind.
 * @param namespace - The load's namespace.
 * @param ctx - The import's context.
 * @param notes - Where a refusal is noted.
 */
async function hide(
    hidden: Translation["hidden"],
    namespace: string,
    ctx: UndoableContext,
    notes: FileStyleNote[],
): Promise<void> {
    const leaves: RuleTree[] = [];
    if (hidden.node !== null) {
        leaves.push({
            kind: "expression",
            where: `${quotePath(fileStylePath(namespace, "node", hidden.node.key))} == \`true\``,
        });
    }

    if (hidden.edge !== null) {
        leaves.push({
            kind: "edges",
            where: `${quotePath(fileStylePath(namespace, "edge", hidden.edge.key))} == \`true\``,
        });
    }

    if (leaves.length === 0) {
        return;
    }

    const rule: RuleTree = { kind: "not", of: leaves.length === 1 ? leaves[0] : { kind: "any", of: leaves } };
    const current = ctx.state.visibility.filter;
    try {
        await ctx.inline({
            op: "visibility.set",
            filter: current === null ? rule : { kind: "all", of: [current, rule] },
        });
    } catch {
        notes.push({
            code: FILE_STYLE_TRANSLATION_ISSUE.NO_COUNTERPART,
            params: {
                property: "visible",
                target: null,
                count: (hidden.node?.count ?? 0) + (hidden.edge?.count ?? 0),
                samples: [],
            },
        });
    }
}
