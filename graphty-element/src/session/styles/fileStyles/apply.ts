/**
 * @file A file's styles applied by the load that read the file, inside its `data.import` step: the
 * layers the previous load added removed on a replacing load (those the reader left as they were),
 * the style values written to a new set of the style value store, the layers checked one by one
 * and added above the element's base layers, the hidden elements given to the visibility filter,
 * the background to the configuration and the annotations through `annotations.set`, each through
 * the same command any caller uses. Nothing it writes records that a load wrote it. One load is one
 * undo step, and redo puts all of it back without reading the file again.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import type { FileLayout } from "@graphty/graph-io";
import {
    type ExtractedStyles,
    type GraphAnnotation,
    readAnnotations,
    readImageAnnotations,
} from "@graphty/graph-io/styles";

import type { Channel, EdgeId, LayerId, LayerSpec, NodeId, RuleTree } from "../../../catalog/types";
import type { LoadReport } from "../../../data/report";
import type { DataImportCommand } from "../../commands/data";
import type { UndoableContext } from "../../project/Dispatcher";
import type { TimeField } from "../../time/TimeApi";
import { type CompiledLayer, specOf } from "../Layer";
import { deepEquals, quotePath } from "../predicate";
import { FILE_STYLE_TRANSLATION_ISSUE } from "./codes";
import { dataPaths, elementIdsOf, type ReaderColumnPath } from "./columns";
import { fileStylePath } from "./path";
import {
    asStyleValueStore,
    nextStyleValueSetName,
    STYLE_VALUES_VALUE,
    type StyleValueColumn,
    styleValueSetsOf,
} from "./store";
import { type FileStyleNote, type FileStyleOptions, translateFileStyles, type Translation } from "./translate";

/**
 * The graph value holding the layers the loads since the last replacing one added, each as it was
 * added: session state the next replacing load reads to remove them, never saved and never on a layer.
 */
const IMPORTED_LAYERS_VALUE = "importedLayers";

/** A layer a load added, as it was added. */
export interface ImportedLayer {
    readonly id: LayerId;
    readonly spec: LayerSpec;
}

/**
 * The layers the loads since the last replacing one added, read before a load replaces the graph
 * (which sweeps its values).
 * @param state - The project state.
 * @param state.graph - Its graph slice.
 * @param state.graph.values - Its graph values.
 * @returns The layers, as they were added.
 */
export function importedLayersOf(state: {
    readonly graph: { readonly values: ReadonlyMap<string, unknown> };
}): readonly ImportedLayer[] {
    const held = state.graph.values.get(IMPORTED_LAYERS_VALUE);
    return Array.isArray(held) ? (held as readonly ImportedLayer[]) : [];
}

/** A file's styles, as the data source that read the file gives them. */
export interface FileStylesRead {
    /** The styles. */
    readonly extracted: ExtractedStyles;
    /** The graph the import built, which the styles' element indexes refer to. */
    readonly snapshot: GraphSnapshot;
    /** Where the reader put each column on its records. */
    readonly path: ReaderColumnPath;
    /**
     * How many of the styles' px lengths one unit of the file's stored positions is, when the
     * positions are in another known unit (Graphviz input inches: 72); absent when they share it.
     */
    readonly positionPxPerUnit?: number;
    /**
     * What the format draws beside the graph that its importer reads (`importer.annotations()`: DOT's root graph
     * label), in the same convention as the annotations a file keeps in a column; absent when it draws none.
     */
    readonly annotations?: readonly GraphAnnotation[];
    /** Whether the file stored a usable position for any node; absent counts as none. */
    readonly positionsStored?: boolean;
    /**
     * How many CSS px in from the canvas's shorter side the file's node centers are framed, when the file states
     * that its stored positions are fitted to the canvas; absent when it states none.
     */
    readonly framingPadding?: number;
}

/** What a data source gives a load about the styles of what it read. */
export interface FileStyleSource {
    /** The styles of what it read, read on demand; null when the file carries none. */
    readonly fileStyles: (options?: {
        readonly toolDefaults?: boolean;
        readonly viewport?: { readonly width: number; readonly height: number } | null;
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
        /** The layout the file asks for, as the source read it. */
        readonly declaredFileLayout?: FileLayout | null;
        /** The time field the file declares, as the source read it. */
        readonly declaredTime?: TimeField | null;
    }
>();

/** What a load leaves for the step that applies its styles. */
export interface ImportOutcome {
    /** The data source the records came from, when it can say what styles it read. */
    readonly reader: (Partial<FileStyleSource> & { readonly declaredTime?: TimeField | null }) | null;
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

/**
 * What a load says about the styles it applied.
 * @experimental file-styles
 */
export interface LoadStyleReport {
    /** The layers the file's styles made, bottom first. */
    readonly layers: readonly LayerId[];
    /** What reading and translating the file's styles met, as codes and facts. */
    readonly notes: readonly FileStyleNote[];
    /**
     * The scene units one unit of the file's lengths was drawn as: the ONE factor node sizes, borders, edge widths,
     * label sizes (unless `labelSizes: "file"`) and the file's stored positions took, so the drawing keeps the file's
     * proportions. 1 when the load kept the file's numbers (`lengths: "file"`, or lengths already in the drawing's
     * units). Absent when no file styles were read.
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
    const styles = asksFileStyles(command) ? "file" : "none";
    const fromConfig =
        typeof config.styleOptions === "object" && config.styleOptions !== null
            ? (config.styleOptions as FileStyleOptions)
            : {};
    return { styles, options: command.styleOptions ?? fromConfig };
}

/**
 * Whether an import asks to draw the file's styles, by its own `styles` or its source's.
 * @param command - The import, or its parts.
 * @param command.styles - Its own choice.
 * @param command.source - Its source, whose options may carry the choice.
 * @param command.source.config - The source's options.
 * @returns True when it draws them.
 */
export function asksFileStyles(command: {
    readonly styles?: "file" | "none";
    readonly source: { readonly config?: Readonly<Record<string, unknown>> };
}): boolean {
    return (command.styles ?? (command.source.config?.styles === "file" ? "file" : "none")) === "file";
}

/**
 * What the element paints every node and edge with before any loaded layer: its own default layers, per kind.
 * @param stack - The layer stack.
 * @returns The default values.
 */
function elementDefaultsOf(
    stack: readonly CompiledLayer[],
): Record<"node" | "edge", Partial<Record<Channel, unknown>>> {
    const out: Record<"node" | "edge", Partial<Record<Channel, unknown>>> = { node: {}, edge: {} };
    for (const { layer } of stack) {
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
 * @param previous - The layers the loads before this one added ({@link importedLayersOf}), read
 *     before the import replaced the graph.
 * @returns The scene units one unit of the file's lengths was drawn as, which the file's stored
 *     positions take too (1 when the load keeps file lengths); null when no file styles were drawn,
 *     the file gives no length to scale by, or the load merged into a graph whose positions are in
 *     another unit.
 */
export async function applyFileStyles(
    command: DataImportCommand,
    outcome: ImportOutcome | null,
    ctx: UndoableContext,
    previous: readonly ImportedLayer[] = [],
): Promise<number | null> {
    const { styles, options } = choiceOf(command);
    const loaded = outcome !== null && command.measure === undefined;
    const replacing = loaded && command.mode !== "merge";
    if (replacing) {
        // Only what the previous loads added and the reader left as it was: an edited layer is the reader's now.
        for (const id of untouched(previous, ctx.state.styles)) {
            await ctx.inline({ op: "style.patch", action: "remove", id });
        }
    }

    if (!loaded || styles !== "file") {
        if (replacing && previous.length > 0) {
            ctx.services.data?.values?.({ [IMPORTED_LAYERS_VALUE]: undefined }, ctx.draft);
        }

        return null;
    }

    const read =
        (await outcome.reader?.fileStyles?.({
            ...(options.toolDefaults === undefined ? {} : { toolDefaults: options.toolDefaults }),
            viewport: ctx.services.viewport?.() ?? null,
            signal: ctx.signal,
        })) ?? null;
    ctx.signal.throwIfAborted();
    const notes: FileStyleNote[] = [];
    const layers: LayerId[] = [];
    let sceneScale: number | null = null;
    let lengthScale: number | undefined;
    if (read !== null) {
        const applied = await applyRead(outcome, read, options, ctx, replacing);
        layers.push(...applied.layers);
        const added = applied.layers.flatMap((id) => {
            const entry = ctx.state.styles.find((each) => each.layer.id === id);
            return entry === undefined ? [] : [{ id, spec: specOf(entry.layer) }];
        });
        const kept = replacing ? [] : previous;
        ctx.services.data?.values?.({ [IMPORTED_LAYERS_VALUE]: Object.freeze([...kept, ...added]) }, ctx.draft);
        notes.push(...applied.notes);
        sceneScale = replacing ? applied.sceneScale : null;
        ({ lengthScale } = applied);
    }

    // The file states that its node centers are fitted into the canvas: framed the same, the drawing fills the canvas
    // as the file's own viewer does. A file that states no padding returns to the element's own framing.
    if (options.framing === "file" && replacing) {
        const padding = read?.framingPadding;
        await ctx.inline({
            op: "config.set",
            values: { framing: padding === undefined ? undefined : { extent: "centers", padding } },
        });
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
    return sceneScale;
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
): Promise<LoadStyleReport & { readonly sceneScale: number | null }> {
    const held = replacing ? [] : styleValueSetsOf(asStyleValueStore(ctx.state.graph.values.get(STYLE_VALUES_VALUE)));
    const namespace = nextStyleValueSetName(new Set(held.map((set) => set.name)));
    const translation = translateFileStyles({
        extracted: read.extracted,
        snapshot: read.snapshot,
        namespace,
        options,
        dataPath: dataPaths(read.path),
        elementDefaults: elementDefaultsOf(ctx.state.styles),
        positionsStored: read.positionsStored === true,
    });
    const notes = [...translation.notes];

    // The values, keyed by the ids the element holds the elements under.
    const ids = elementIdsOf(read.snapshot, outcome.edgeIds, (id) => outcome.heldNode(id));
    const columns = keptColumns(translation.columns, ids);

    await ctx.inline({ op: "data.setStyleValues", sets: [...held, { name: namespace, columns }] });

    const accepted = acceptedLayers(translation.layers, ctx.services.styles, notes);

    const layers: LayerId[] = [];
    if (accepted.length > 0) {
        const value = (await ctx.inline({
            op: "style.template",
            document: { version: 1, layers: accepted },
            at: "aboveBase",
        })) as { result?: { applied?: readonly LayerId[]; unbound?: readonly { layerId: LayerId }[] } } | undefined;
        layers.push(...(value?.result?.applied ?? []), ...(value?.result?.unbound ?? []).map((entry) => entry.layerId));
    }

    await hide(translation.hidden, namespace, ctx);
    // graph-io gives the background as a color it read; a refusal is a defect, reported with its own code.
    if (translation.background !== null) {
        await ctx.inline({
            op: "config.set",
            values: { background: { backgroundType: "color", color: translation.background } },
        });
    }

    // The file turns the whole drawing (Graphviz's rotate=90 and landscape): the 2D view turns, labels and all.
    if (translation.rotation !== null) {
        await ctx.inline({ op: "config.set", values: { viewRotation: translation.rotation } });
    }

    // The stored positions take the styles' unit, so they are drawn at the file's proportions. Where
    // the lengths are kept as the file has them (it sizes nothing, or the load keeps file lengths),
    // they are drawn in that unit too; lengths already in the drawing's units hold positions in those units.
    // A load that keeps file lengths draws one file unit as one scene unit, which a Graphviz layout
    // needs to know (a DOT file's point is then a scene unit, 72 to Graphviz's inch).
    const inScene = read.extracted.styles.lengths?.units === "scene";
    const fileUnit = options.lengths === "file" ? 1 : null;
    const keptScale = inScene ? null : (read.positionPxPerUnit ?? fileUnit);
    const sceneScale =
        translation.sceneScale === null ? keptScale : translation.sceneScale * (read.positionPxPerUnit ?? 1);
    // The file's annotations, drawn at the scale of its stored positions so they stay beside the
    // nodes they annotate. ponytail: a merging load keeps the graph's earlier annotations only.
    const annotations = [
        ...readAnnotations(read.snapshot).annotations,
        ...readImageAnnotations(read.snapshot),
        ...(read.annotations ?? []),
    ];
    if (replacing && annotations.length > 0) {
        await ctx.inline({ op: "annotations.set", annotations, scale: sceneScale ?? 1 });
    }

    return { layers, notes, sceneScale, lengthScale: translation.sceneScale ?? 1 };
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
): StyleValueColumn[] {
    const columns: StyleValueColumn[] = [];
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
 * The layers a previous load added that the stack still holds exactly as they were added.
 * @param previous - The layers, as they were added.
 * @param stack - The stack now.
 * @returns Their ids.
 */
function untouched(previous: readonly ImportedLayer[], stack: readonly CompiledLayer[]): LayerId[] {
    const byId = new Map(stack.map((entry) => [entry.layer.id, entry.layer]));
    return previous.flatMap(({ id, spec }) => {
        const layer = byId.get(id);
        return layer !== undefined && deepEquals(specOf(layer), spec) ? [id] : [];
    });
}

/**
 * Hide the elements the file hides, through the visibility filter, beside any filter already set.
 * @param hidden - The hidden elements per kind.
 * @param namespace - The load's namespace.
 * @param ctx - The import's context.
 */
async function hide(hidden: Translation["hidden"], namespace: string, ctx: UndoableContext): Promise<void> {
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
    // The rule is built here from the file's columns; a refusal is a defect, reported with its own code.
    await ctx.inline({
        op: "visibility.set",
        filter: current === null ? rule : { kind: "all", of: [current, rule] },
    });
}
