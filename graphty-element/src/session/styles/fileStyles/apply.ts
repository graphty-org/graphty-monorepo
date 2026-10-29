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
import { type ExtractedStyles, readAnnotations, readImageAnnotations } from "@graphty/graph-io/styles";

import type { Channel, EdgeId, LayerId, LayerSpec, NodeId, RuleTree } from "../../../catalog/types";
import type { LoadReport } from "../../../data/report";
import type { DataImportCommand } from "../../commands/data";
import type { UndoableContext } from "../../project/Dispatcher";
import type { CompiledLayer } from "../Layer";
import { quotePath } from "../predicate";
import { ANNOTATIONS_VALUE, type DrawnAnnotations } from "./annotations";
import { FILE_STYLE_TRANSLATION_ISSUE } from "./codes";
import { dataPaths, elementIdsOf, type ReaderColumnPath } from "./columns";
import { withLabelGrid } from "./labelGrid";
import { fileStyleNamespace, fileStylePath } from "./path";
import { asFileStyleStore, FILE_STYLES_VALUE, type FileStyleColumnValues, fileStyleValuesOf } from "./store";
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
    /**
     * How many of the styles' px lengths one unit of the file's stored positions is, when the
     * positions are in another known unit (Graphviz input inches: 72); absent when they share it.
     */
    readonly positionPxPerUnit?: number;
    /**
     * Set when the stored positions have no fixed length and the program that draws the file fits
     * them into its canvas, `padding` px in from each side, drawing label sizes in the canvas's px
     * (sigma.js): the padding and the width and height of the positions' bounding box, in their unit.
     */
    readonly positionFit?: {
        readonly padding: number;
        readonly width: number;
        readonly height: number;
        /** The middle of the bounding box, in the positions' unit. */
        readonly center?: readonly [number, number];
        /** Each node's stored position, three numbers per node by the snapshot's index (NaN where it has none). */
        readonly coords?: ArrayLike<number>;
    };
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
export const HELD_READERS = new WeakMap<
    object,
    Partial<FileStyleSource> & {
        /** The file's graph-level attributes, as the source read them. */
        readonly declaredGraphValues?: Readonly<Record<string, unknown>> | null;
    }
>();

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
     * The scene units one unit of the file's lengths was drawn as: its node sizes, borders, edge
     * widths, label sizes and stored positions all took this one factor, so the drawing keeps the
     * file's proportions. Absent when the load kept the file's lengths and positions as they are.
     * Writing the graph without its styles divides it back out of the positions.
     */
    readonly lengthScale?: number;
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
 * @returns The file scale a replacing load recorded with its styles (`LoadStyleReport.lengthScale`),
 *     which a Graphviz layout of the file takes too; null when it recorded none or the load merged.
 */
export async function applyFileStyles(
    command: DataImportCommand,
    outcome: ImportOutcome | null,
    ctx: UndoableContext,
): Promise<number | null> {
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
        return null;
    }

    const read =
        (await outcome.reader?.fileStyles?.({
            ...(options.toolDefaults === undefined ? {} : { toolDefaults: options.toolDefaults }),
            signal: ctx.signal,
        })) ?? null;
    ctx.signal.throwIfAborted();
    const notes: FileStyleNote[] = [];
    const layers: LayerId[] = [];
    let lengthScale: number | undefined;
    if (read !== null) {
        const applied = await applyRead(outcome, read, options, ctx, replacing);
        layers.push(...applied.layers);
        notes.push(...applied.notes);
        ({ lengthScale } = applied);
    }

    const report: LoadReport = Object.freeze({
        ...outcome.report,
        styles: Object.freeze({
            layers: Object.freeze(layers),
            notes: Object.freeze(notes),
            ...(lengthScale === undefined ? {} : { lengthScale }),
        }),
    });
    ctx.services.data?.values?.({ importReport: report }, ctx.draft);
    return replacing ? (lengthScale ?? null) : null;
}

/**
 * The layers the element accepts, each checked one by one, so a layer the element refuses is left out
 * and the rest apply. A refused layer, or one applied by its fallback, adds a note.
 * @param layers - The translated layers.
 * @param service - The element's style service.
 * @param notes - The load's notes; added to.
 * @returns The specs to apply.
 */
function acceptedLayers(
    layers: ReturnType<typeof translateFileStyles>["layers"],
    service: UndoableContext["services"]["styles"],
    notes: FileStyleNote[],
): LayerSpec[] {
    const accepted: LayerSpec[] = [];
    for (const layer of layers) {
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
    return accepted;
}

/**
 * Translate and apply one file's styles.
 * @param outcome - What the load left.
 * @param read - The file's styles.
 * @param options - The load's choices.
 * @param ctx - The import's context.
 * @param replacing - Whether the load replaced the graph.
 * @returns The layers made, the notes and the scene units one file unit was drawn as.
 */
async function applyRead(
    outcome: ImportOutcome,
    read: FileStylesRead,
    options: FileStyleOptions,
    ctx: UndoableContext,
    replacing: boolean,
): Promise<LoadStyleReport> {
    const held = replacing ? [] : fileStyleValuesOf(asFileStyleStore(ctx.state.graph.values.get(FILE_STYLES_VALUE)));
    // A load merged into a graph that holds a file's styles takes that graph's scale (issue #2322).
    const heldScale = held.find((load) => load.lengthScale !== undefined)?.lengthScale;
    const namespace = fileStyleNamespace(read.format, new Set(held.map((load) => load.namespace)));
    const importId = namespace;
    const viewport = ctx.services.viewport?.() ?? null;
    const pxPerUnit = labelPxPerUnit(read.positionFit, viewport);
    const fit = read.positionFit;
    const frame =
        fit?.coords === undefined || fit.center === undefined || pxPerUnit === undefined || viewport === null
            ? null
            : { coords: fit.coords, center: fit.center, pxPerUnit, viewport };
    const translation = translateFileStyles({
        extracted: withLabelGrid(read.extracted, read.snapshot, frame),
        snapshot: read.snapshot,
        namespace,
        format: read.format,
        importId,
        options,
        base: baseValues(ctx.state.styles),
        dataPath: dataPaths(read.path),
        labelPxPerUnit: pxPerUnit,
        ...(heldScale === undefined ? {} : { sceneScale: heldScale / (read.positionPxPerUnit ?? 1) }),
    });
    // ponytail: a load merged into a graph that holds no file scale records none, so the positions
    // already there keep their unit; its own lengths are still scaled. Give it the merged file's
    // scale if a merge into a plain graph is ever seen drawn out of proportion.
    const lengthScale = replacing ? fileLengthScaleOf(read, options, translation.sceneScale) : (heldScale ?? null);
    const notes = [...translation.notes];

    // The values, keyed by the ids the element holds the elements under.
    const ids = elementIdsOf(read.snapshot, outcome.edgeIds, (id) => outcome.heldNode(id));
    const columns = keptColumns(translation.columns, ids);

    const load = {
        importId,
        namespace,
        format: read.format,
        columns,
        ...(lengthScale === null ? {} : { lengthScale }),
    };
    await ctx.inline({ op: "data.setFileStyles", loads: [...held, load] });

    const accepted = acceptedLayers(translation.layers, ctx.services.styles, notes);

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

    // The file's annotations, drawn at the scale of its stored positions so they stay beside the
    // nodes they annotate. ponytail: a merging load keeps the graph's earlier annotations only.
    const annotations = [...readAnnotations(read.snapshot).annotations, ...readImageAnnotations(read.snapshot)];
    if (replacing && annotations.length > 0) {
        const value: DrawnAnnotations = Object.freeze({ scale: lengthScale ?? 1, annotations });
        ctx.services.data?.values?.({ [ANNOTATIONS_VALUE]: value }, ctx.draft);
    }

    return { layers, notes, ...(lengthScale === null ? {} : { lengthScale }) };
}

/**
 * The file scale a load records with its styles: the scene units one unit of the file's stored
 * positions is drawn as, so they keep the proportions of the node sizes the styles draw. Where the
 * lengths are kept as the file has them (it sizes nothing, or the load keeps file lengths), the
 * positions are drawn in that unit too; a file graphty wrote holds positions in graphty's own units.
 * A load that keeps file lengths draws one file unit as one scene unit, which a Graphviz layout
 * needs to know (a DOT file's point is then a scene unit, 72 to Graphviz's inch).
 * @param read - The file's styles.
 * @param options - The load's choices.
 * @param scene - The scene units one unit of the file's lengths was drawn as; null when kept.
 * @returns The scale, or null when the positions keep their own unit.
 */
function fileLengthScaleOf(read: FileStylesRead, options: FileStyleOptions, scene: number | null): number | null {
    if (scene !== null) {
        return scene * (read.positionPxPerUnit ?? 1);
    }

    if (read.extracted.styles.source.tool === "graphty") {
        return null;
    }

    return read.positionPxPerUnit ?? (options.lengths === "file" ? 1 : null);
}

/**
 * How many canvas px one unit of the file's positions is when they are fitted to the canvas the
 * element draws on, as sigma.js fits them: the canvas's smaller side less `padding` px at each end,
 * stretched by the canvas's aspect along its longer side, holds the bounding box at its own
 * proportions (sigma 4.0.1 draws a 90 x 90 box 540 px tall and a 712 x 485 one 720 px wide in an
 * 800 x 600 canvas). The file's label sizes are px of that canvas.
 * @param fit - The positions' fit, when they have no fixed length.
 * @param viewport - The canvas's size in CSS px, or null without one.
 * @returns The px per unit, or undefined when the positions keep their own length or there is no
 *     canvas to fit them to.
 */
export function labelPxPerUnit(
    fit: FileStylesRead["positionFit"],
    viewport: { readonly width: number; readonly height: number } | null,
): number | undefined {
    if (fit === undefined || viewport === null) {
        return undefined;
    }

    const short = Math.min(viewport.width, viewport.height);
    const inside = (short - 2 * fit.padding) / short;
    const across = [(inside * viewport.width) / fit.width, (inside * viewport.height) / fit.height].filter(
        (k) => Number.isFinite(k) && k > 0,
    );
    return across.length === 0 ? undefined : Math.min(...across);
}

/**
 * The values the layers read, each kept only for an element the element holds and only where it
 * has a value.
 * @param translated - The values per kind and key, by element index.
 * @param ids - The element's id of each element index, null for one it does not hold.
 * @returns The columns.
 */
function keptColumns(
    translated: Readonly<Record<"node" | "edge", ReadonlyMap<string, readonly (string | number | boolean | null)[]>>>,
    ids: Readonly<Record<"node" | "edge", readonly (NodeId | EdgeId | null | undefined)[]>>,
): FileStyleColumnValues[] {
    const columns: FileStyleColumnValues[] = [];
    for (const kind of ["node", "edge"] as const) {
        for (const [key, values] of translated[kind]) {
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
    return columns;
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
