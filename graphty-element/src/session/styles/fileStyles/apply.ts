/**
 * @file A file's styles applied by the load that read the file, inside its `data.import` step: the
 * per-element values the layers read written onto the loaded elements as ordinary data columns
 * (`data.apply`), the layers checked one by one and added above the element's base layers, the
 * hidden elements given to the visibility filter, the background to the configuration and the
 * annotations through `annotations.set`, each through the same command any caller uses. Nothing it
 * writes records that a load wrote it: once loaded, the columns and layers are like any others. One
 * load is one undo step, and redo puts all of it back without reading the file again.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import type { RequestedLayout } from "@graphty/graph-io";
import {
    type ExtractedStyles,
    type GraphAnnotation,
    readAnnotations,
    readImageAnnotations,
} from "@graphty/graph-io/styles";

import type { Channel, EdgeId, LayerId, LayerSpec, NodeId, Path, RuleTree } from "../../../catalog/types";
import type { LoadReport } from "../../../data/report";
import type { DataImportCommand } from "../../commands/data";
import type { UndoableContext } from "../../project/Dispatcher";
import type { TimeField } from "../../time/TimeApi";
import type { CompiledLayer } from "../Layer";
import { quotePath } from "../predicate";
import { FILE_STYLE_TRANSLATION_ISSUE } from "./codes";
import { dataPaths, elementIdsOf, type ReaderColumnPath } from "./columns";
import {
    carriedColumnOf,
    type FileStyleNote,
    type FileStyleOptions,
    type StyleScalar,
    translateFileStyles,
    type Translation,
} from "./translate";

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
        /** The layout the data asks for, as the source read it. */
        readonly requestedLayout?: RequestedLayout | null;
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
 * @returns The scene units one unit of the file's lengths was drawn as, which the file's stored
 *     positions take too (1 when the load keeps file lengths); null when no file styles were drawn,
 *     the file gives no length to scale by, or the load merged into a graph whose positions are in
 *     another unit.
 */
export async function applyFileStyles(
    command: DataImportCommand,
    outcome: ImportOutcome | null,
    ctx: UndoableContext,
): Promise<number | null> {
    const { styles, options } = choiceOf(command);
    const loaded = outcome !== null && command.measure === undefined;
    const replacing = loaded && command.mode !== "merge";
    if (!loaded || styles !== "file") {
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
        const applied = await applyRead(command, outcome, read, options, ctx, replacing);
        layers.push(...applied.layers);
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
 * @param command - The import.
 * @param outcome - What the load left.
 * @param read - The file's styles.
 * @param options - The load's choices.
 * @param ctx - The import's context.
 * @param replacing - Whether the load replaced the graph.
 * @returns The layers made, the notes and the scene units one file unit was drawn as.
 */
async function applyRead(
    command: DataImportCommand,
    outcome: ImportOutcome,
    read: FileStylesRead,
    options: FileStyleOptions,
    ctx: UndoableContext,
    replacing: boolean,
): Promise<LoadStyleReport & { readonly sceneScale: number | null }> {
    const ids = elementIdsOf(read.snapshot, outcome.edgeIds, (id) => outcome.heldNode(id));
    const dataPath = dataPaths(read.path);
    const columnPath = columnNamer(command.source.type ?? "file", ids, ctx, (kind, key) => {
        const carried = carriedColumnOf(key);
        return carried === null ? null : (dataPath(kind, carried)?.slice(DATA_PREFIX.length) ?? null);
    });
    const translation = translateFileStyles({
        extracted: read.extracted,
        snapshot: read.snapshot,
        columnPath,
        options,
        dataPath,
        elementDefaults: elementDefaultsOf(ctx.state.styles),
        positionsStored: read.positionsStored === true,
    });
    const notes = [...translation.notes];
    const accepted = acceptedLayers(translation.layers, ctx.services.styles, notes);

    // The values, written onto the elements the element holds as ordinary data columns: only those a layer or the
    // visibility filter reads, so a value a layer the file rebuilt no longer reads leaves no column behind.
    const reads = readsOf(accepted);
    for (const kind of ["node", "edge"] as const) {
        const hiddenKey = translation.hidden[kind]?.key;
        const used = new Map(
            [...translation.columns[kind]].filter(([key]) => key === hiddenKey || reads(columnPath(kind, key))),
        );
        const rows = rowsOf(
            used,
            ids[kind],
            (key) => columnPath(kind, key),
            kind === "node" ? ctx.state.graph.nodes : ctx.state.graph.edges,
        );
        if (rows.length > 0) {
            await ctx.inline({ op: "data.apply", mutation: { kind: "update-rows", target: kind, rows } });
        }
    }

    const layers: LayerId[] = [];
    if (accepted.length > 0) {
        const value = (await ctx.inline({
            op: "style.template",
            document: { version: 1, layers: accepted },
            at: "aboveBase",
        })) as { result?: { applied?: readonly LayerId[]; unbound?: readonly { layerId: LayerId }[] } } | undefined;
        layers.push(...(value?.result?.applied ?? []), ...(value?.result?.unbound ?? []).map((entry) => entry.layerId));
    }

    await hide(translation.hidden, columnPath, ctx);
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

/** The prefix of a path reading a record's attribute. */
const DATA_PREFIX = "data.";

/**
 * Whether any of the layers reads a path, in a binding, a selector or an expression.
 * @param specs - The layers.
 * @returns For a `data.` path, true when a layer reads it.
 */
function readsOf(specs: readonly LayerSpec[]): (path: Path) => boolean {
    const texts: string[] = [];
    JSON.stringify(specs, (_key, value: unknown) => {
        if (typeof value === "string") {
            texts.push(value);
        }

        return value;
    });
    // A spelling read whole: not the start of a longer name (`data.a` in `data.ab`).
    const readsWhole = (text: string, spelling: string): boolean => {
        for (let at = text.indexOf(spelling); at !== -1; at = text.indexOf(spelling, at + 1)) {
            if (!/\w/.test(text.charAt(at + spelling.length))) {
                return true;
            }
        }

        return false;
    };
    return (path) => {
        const spellings = [path, quotePath(path)];
        return texts.some((text) => spellings.some((spelling) => readsWhole(text, spelling)));
    };
}

/**
 * The record keys the element reads as the graph's structure rather than as data, per kind: an
 * edge's ends, its own direction and its capacity (`resolveEdgeDirected`, `resolveEdgeCapacity`).
 * A load's values never land under one, so they never change the graph they style.
 */
const STRUCTURE_KEYS: Readonly<Record<"node" | "edge", ReadonlySet<string>>> = {
    node: new Set(["id"]),
    edge: new Set(["id", "source", "target", "directed", "type", "capacity", "value"]),
};

/**
 * Names the data columns a load's values land in, each once: the key with every character but a
 * letter, a digit or an underscore written as an underscore (a dot in a path would nest, and every
 * format spells such a name back unchanged); a copy graph-io carries of a data column a format
 * could not keep is written back into the column it copies, on the load's own elements, so the
 * column holds its values exactly as they were written. Any other name a record or a layer already uses
 * becomes `<name> (<source id>)`, so a load never writes over other data or feeds an existing
 * layer, unless the load's own elements already hold these values under it as a file spells them
 * (a file graphty wrote carries its columns; a format with no booleans holds `1`), which the load
 * then writes back exactly. Loading the same file into an empty graph names the same columns every
 * time.
 * @param sourceId - The id of the data source that read the file.
 * @param ids - The element's id of each element index of the load, per kind.
 * @param ctx - The import's context, read once the load's records are in.
 * @param carried - The record key of the data column a key copies, or null when it copies none.
 * @returns For a kind and key, given its values by element index, the `data.` path.
 */
function columnNamer(
    sourceId: string,
    ids: Readonly<Record<"node" | "edge", readonly (NodeId | EdgeId | null | undefined)[]>>,
    ctx: UndoableContext,
    carried: (kind: "node" | "edge", key: string) => string | null,
): (kind: "node" | "edge", key: string, values?: readonly (StyleScalar | null)[]) => Path {
    const taken: Partial<Record<"node" | "edge", Set<string>>> = {};
    const named = new Map<string, Path>();
    const recordsOf = (kind: "node" | "edge"): ReadonlyMap<NodeId | EdgeId, Readonly<Record<string, unknown>>> =>
        kind === "node" ? ctx.state.graph.nodes : ctx.state.graph.edges;
    const takenOf = (kind: "node" | "edge"): Set<string> => {
        const existing = taken[kind];
        if (existing !== undefined) {
            return existing;
        }

        const names = new Set<string>(STRUCTURE_KEYS[kind]);
        for (const record of recordsOf(kind).values()) {
            for (const key of Object.keys(record)) {
                names.add(key);
            }
        }

        for (const entry of ctx.state.styles) {
            for (const path of entry.reads) {
                if (path.startsWith(DATA_PREFIX)) {
                    names.add(path.slice(DATA_PREFIX.length).split(".")[0]);
                }
            }
        }

        taken[kind] = names;
        return names;
    };
    const holds = (kind: "node" | "edge", name: string, values: readonly (StyleScalar | null)[]): boolean => {
        const records = recordsOf(kind);
        let any = false;
        for (let i = 0; i < values.length; i++) {
            const id = ids[kind][i];
            if (id === null || id === undefined) {
                continue;
            }

            const value = records.get(id)?.[name] ?? null;
            if (!sameValue(value, values[i])) {
                return false;
            }

            any ||= value !== null;
        }

        return any;
    };
    const path = (kind: "node" | "edge", key: string, values: readonly (StyleScalar | null)[] = []): Path => {
        const known = named.get(`${kind}:${key}`);
        if (known !== undefined) {
            return known;
        }

        const names = takenOf(kind);
        const copied = carried(kind, key);
        const base = copied ?? key.replaceAll(/\W/g, "_");
        let name = base;
        let n = 1;
        // A copy of a data column is that column's own values as written: they go back into it.
        while (copied === null && names.has(name) && !holds(kind, name, values)) {
            const count = n === 1 ? "" : ` ${String(n)}`;
            name = `${base} (${sourceId}${count})`.replaceAll(".", "_");
            n++;
        }

        const at = `${DATA_PREFIX}${name}`;
        names.add(name);
        named.set(`${kind}:${key}`, at);
        return at;
    };
    return path;
}

/**
 * Whether a record's value is a kept value as a file spells it back: the value itself, or its text, a
 * true or false as `1` or `0` (a format with no booleans).
 * @param held - The record's value.
 * @param kept - The kept value.
 * @returns True when they agree.
 */
function sameValue(held: unknown, kept: StyleScalar | null): boolean {
    if (held === kept) {
        return true;
    }

    if (kept === null || (typeof held !== "string" && typeof held !== "number" && typeof held !== "boolean")) {
        return false;
    }

    const text = String(held);
    return text === String(kept) || (typeof kept === "boolean" && text === (kept ? "1" : "0"));
}

/**
 * The row updates writing a kind's kept values onto the elements the element holds, where each has a value.
 * @param translated - The values per key, by element index.
 * @param ids - The element's id of each element index, null for one it does not hold.
 * @param pathOf - The `data.` path each key lands at.
 * @param records - The records of the kind, so a value an element already holds is not written again.
 * @returns One update per element whose value it does not hold yet: a value a file spelled another way
 *     (`1` for true) is written back exactly.
 */
function rowsOf(
    translated: ReadonlyMap<string, readonly (StyleScalar | null)[]>,
    ids: readonly (NodeId | EdgeId | null | undefined)[],
    pathOf: (key: string) => Path,
    records: ReadonlyMap<NodeId | EdgeId, Readonly<Record<string, unknown>>>,
): { id: NodeId | EdgeId; values: Record<string, StyleScalar> }[] {
    const rows = new Map<NodeId | EdgeId, Record<string, StyleScalar>>();
    for (const [key, values] of translated) {
        const name = pathOf(key).slice(DATA_PREFIX.length);
        values.forEach((value, i) => {
            const id = ids[i];
            if (value === null || id === null || id === undefined || records.get(id)?.[name] === value) {
                return;
            }

            const row = rows.get(id) ?? {};
            row[name] = value;
            rows.set(id, row);
        });
    }

    return [...rows].map(([id, values]) => ({ id, values }));
}

/**
 * An expression true where a column holds true, or `1` as a format with no booleans spells it.
 * @param path - The column's path.
 * @returns The expression.
 */
function isTrue(path: Path): string {
    const quoted = quotePath(path);
    return `${quoted} == \`true\` || ${quoted} == \`1\``;
}

/**
 * Hide the elements the file hides, through the visibility filter, beside any filter already set.
 * @param hidden - The hidden elements per kind.
 * @param columnPath - The `data.` path each kept column landed at.
 * @param ctx - The import's context.
 */
async function hide(
    hidden: Translation["hidden"],
    columnPath: (kind: "node" | "edge", key: string) => Path,
    ctx: UndoableContext,
): Promise<void> {
    const leaves: RuleTree[] = [];
    if (hidden.node !== null) {
        leaves.push({
            kind: "expression",
            where: isTrue(columnPath("node", hidden.node.key)),
        });
    }

    if (hidden.edge !== null) {
        leaves.push({
            kind: "edges",
            where: isTrue(columnPath("edge", hidden.edge.key)),
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
