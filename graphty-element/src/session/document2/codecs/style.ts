/**
 * @file The `style` section codec, version 2: style layers, palettes, shaders, the style tree, value labels and the assets the layers draw (spec 4.2).
 * Experimental (`save-files-v2`).
 *
 * A section that opens and is saved again unchanged is written back exactly as read: the codec
 * remembers, per session, each layer as the file held it beside the form the session gave it, and
 * writes the file's form while the session's still equals it. That is what keeps an unknown member,
 * a layer this release could not apply, a carried palette and the header the file had.
 */

import type { LayerId, LayerSpec, PaletteDescriptor, StyleDocument, StyleDocumentRow } from "../../../catalog/types";
import { isGraphtyError } from "../../../errors/GraphtyError";
import { assetsMember, restoreAssets, withAcceptedAssetIds } from "../../assets/projectMember";
import { dispatcherOf } from "../../dispatchers";
import { channelDescriptor, isEnumCount } from "../../styles/channels";
import type { GraphSession } from "../../types";
import { valueLabelOf } from "../../valueLabels";
import { projectMemory } from "../memory";
import type {
    DocumentProblem,
    JsonObject,
    ReadContext,
    ReadSection,
    SectionCodec,
    SectionHeaderInput,
    SectionWrite,
    WriteContext,
} from "../types";
import { layerNamesElements } from "./elementNaming";
import { asName, columnSchema, isNamespace, namespaceFromId, splitRunId } from "./recipeCommands";
import { fileIdsOf, fileSetId } from "./viewParts";

/** What a session remembers of the style sections it opened, to write them back as read. */
interface StyleMemory {
    /** Each opened layer: as the file held it, and the session's form of it right after the open. */
    readonly layers: Map<LayerId, { readonly original: JsonObject; baseline: string }>;
    /** Layers this release could not apply, kept, with the file id of the layer they followed. */
    readonly kept: { readonly layer: JsonObject; readonly after: string | null }[];
    /** The palettes the opened sections carried, as written. */
    readonly palettes: JsonObject[];
    /** The header members the last opened section had that this codec writes. */
    header: SectionHeaderInput;
    /** The whole body as read and the body the session wrote right after the open, when it held nothing else. */
    body?: { readonly original: JsonObject; readonly baseline: string };
}

const MEMORY = projectMemory<StyleMemory>();

/**
 * A session's style memory, created empty on first use.
 * @param session - The session.
 * @returns Its memory.
 */
function memoryOf(session: GraphSession): StyleMemory {
    let memory = MEMORY.get(session);
    if (memory === undefined) {
        memory = { layers: new Map(), kept: [], palettes: [], header: {} };
        MEMORY.set(session, memory);
    }

    return memory;
}

/** The header members this codec writes back as an opened section had them. */
const OWN_HEADER = [
    "id",
    "name",
    "description",
    "authors",
    "license",
    "keywords",
    "language",
    "dependencies",
    "origin",
] as const;

/** The members of each selector kind this release applies (spec 4.2 rule 3); `type` and `ids` are not among them. */
const SELECTOR_MEMBERS: Readonly<Record<string, readonly string[]>> = {
    everything: [],
    has: ["path"],
    expression: ["where"],
    top: ["path", "n", "ties"],
    member: ["of"],
    rule: ["where", "edges"],
    state: ["state"],
    hover: ["reach", "invert", "orSelected"],
};

/** The members a binding may have: the schema's and the ones graphty-element's bindings add. */
const BINDING_MEMBERS = new Set([
    "value",
    "combine",
    "template",
    "by",
    "scale",
    "palette",
    "colors",
    "domain",
    "clamp",
    "range",
    "map",
    "otherwise",
    "other",
    "overflow",
    "missing",
    "format",
    "unmapped",
    "stops",
    "hidden",
    "reverse",
    "midpoint",
    "bins",
    "exponent",
    "choices",
]);

/** The members of a carried palette. */
const PALETTE_MEMBERS = new Set(["id", "plainName", "kind", "colors", "capacity", "colorblindSafe"]);

/** The members of a layer this release reads; any other is reported and kept. */
const LAYER_MEMBERS = new Set([
    "id",
    "name",
    "target",
    "selector",
    "set",
    "encode",
    "source",
    "enabled",
    "userData",
    "fileStyle",
    "row",
    "unmatched",
]);

/** A shader parameter's address, `<target>.shaders.<id>.<param>`, which is a channel of its own. */
const SHADER_ADDRESS = /^(node|edge)\.shaders\.[^.]+\..+$/;

/** A run named in a path or an expression: `results.<run>`. */
// ponytail: a regular expression over the text, so a quoted path or a string literal holding
// `results.x` is read as a path too; parse the expression when that matters.
const RESULT_PATH = /(?<![\w."])results\.([A-Za-z_]\w*)/g;

/** A column named in a path or an expression: `data.<column>`. */
const DATA_PATH = /(?<![\w."])data\.([A-Za-z_]\w*)/g;

/**
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A JSON pointer token.
 * @param token - The member name.
 * @returns It escaped.
 */
function escape(token: string): string {
    return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

/**
 * A run's name in a reusable section (spec 4.2 rule 4): its id without a namespace, made a valid
 * `as` as recipe.md, "Writing a recipe from a session", rule 4 makes one.
 * @param id - The run id.
 * @returns The name.
 */
export function runName(id: string): string {
    return asName(id.includes("__") ? id.slice(id.lastIndexOf("__") + 2) : id);
}

/**
 * Every string in a value with each `results.<run>` renamed.
 * @param value - The value.
 * @param rename - From the name written to the name wanted.
 * @returns A copy, keys in the same order.
 */
function renameRuns<T>(value: T, rename: (run: string) => string): T {
    if (typeof value === "string") {
        return value.replaceAll(RESULT_PATH, (_match, run: string) => `results.${rename(run)}`) as T;
    }

    if (Array.isArray(value)) {
        return value.map((each: unknown) => renameRuns(each, rename)) as T;
    }

    return isObject(value)
        ? (Object.fromEntries(Object.entries(value).map(([key, each]) => [key, renameRuns(each, rename)])) as T)
        : value;
}

/**
 * Every match of a pattern's first group in the strings of a value.
 * @param value - The value.
 * @param pattern - A global pattern.
 * @param into - Where to collect, in order of first appearance.
 */
function collect(value: unknown, pattern: RegExp, into: Set<string>): void {
    if (typeof value === "string") {
        for (const match of value.matchAll(pattern)) {
            into.add(match[1]);
        }
    } else if (Array.isArray(value) || isObject(value)) {
        for (const each of Object.values(value)) {
            collect(each, pattern, into);
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------------------------

/**
 * A selector as a style section writes it. A member of an inline rule set is written as the rule
 * it is; every other kind is written as the session holds it.
 * @param selector - The session's selector.
 * @param session - The session, for the file id of a kept set.
 * @returns The section's selector.
 */
function writeSelector(selector: LayerSpec["selector"], session: GraphSession): JsonObject {
    if (selector.match === "member" && typeof selector.of === "object" && "define" in selector.of) {
        const definition = selector.of.define as { where?: unknown; reading?: unknown };
        const where =
            typeof definition.where === "string" ? { kind: "expression", where: definition.where } : definition.where;
        return { match: "rule", where, ...(definition.reading === undefined ? {} : { edges: definition.reading }) };
    }

    if (selector.match === "member" && typeof selector.of === "object" && "set" in selector.of) {
        return { match: "member", of: { set: bareSetId(fileSetId(session, selector.of.set)) } };
    }

    return { ...selector };
}

/**
 * A set's file id without the namespace a recipe applied it under: what a reusable section names
 * (spec 5 rule 1).
 * @param id - The file id.
 * @returns `set_<ULID>`.
 */
function bareSetId(id: string): string {
    return id.replace(/^set_[a-z][a-z0-9_]*\./, "set_");
}

/**
 * A layer as a style section writes it, its runs named by `as` (spec 4.2 rules 1 and 4).
 * @param spec - The layer as `toDocument` writes it.
 * @param id - The id to write.
 * @param rowId - The written id of the layer named by `row`.
 * @param session - The session, for the file ids of the sets a selector names.
 * @returns The layer.
 */
function writeLayer(spec: LayerSpec, id: string, rowId: string | undefined, session: GraphSession): JsonObject {
    const source = spec.source?.by === "user" ? undefined : spec.source;
    return {
        id,
        name: spec.name,
        ...(spec.target === undefined ? {} : { target: spec.target }),
        selector: renameRuns(writeSelector(spec.selector, session), runName),
        ...(spec.set === undefined ? {} : { set: spec.set }),
        ...(spec.encode === undefined ? {} : { encode: renameRuns(spec.encode, runName) }),
        ...(source === undefined
            ? {}
            : { source: source.by === "run" ? { ...source, runId: runName(source.runId) } : source }),
        ...(spec.enabled === false ? { enabled: false } : {}),
        ...(spec.userData === undefined ? {} : { userData: spec.userData }),
        ...(rowId === undefined ? {} : { row: rowId }),
        ...(spec.fileStyle === undefined ? {} : { fileStyle: spec.fileStyle }),
    };
}

/**
 * A layer's form for comparing with what was opened: everything but its id.
 * @param layer - The written layer.
 * @returns Its canonical text.
 */
function baselineOf(layer: JsonObject): string {
    const { id: _id, ...rest } = layer;
    return JSON.stringify(rest);
}

/**
 * The style tree with layers named by written id, the rows of layers left out dropped.
 * @param rows - The tree as `toDocument` writes it, by place.
 * @param idAt - The written id of the layer at a place, or undefined when it is left out.
 * @returns The rows.
 */
function writeTree(rows: readonly StyleDocumentRow[], idAt: (place: number) => string | undefined): JsonObject[] {
    return rows.flatMap((row): JsonObject[] => {
        const { pin, locked, hidden } = row;
        const flags = {
            ...(pin === undefined ? {} : { pin }),
            ...(locked === undefined ? {} : { locked }),
            ...(hidden === undefined ? {} : { hidden }),
        };
        if ("layer" in row) {
            const layer = idAt(row.layer);
            return layer === undefined ? [] : [{ layer, ...flags }];
        }

        return [{ folder: row.folder, children: writeTree(row.children, idAt), ...flags }];
    });
}

/**
 * Every palette id a binding of the layers names.
 * @param layers - The written layers.
 * @returns The ids, in order of first mention.
 */
function namedPalettes(layers: readonly JsonObject[]): Set<string> {
    const named = new Set<string>();
    for (const layer of layers) {
        if (isObject(layer.encode)) {
            for (const binding of Object.values(layer.encode)) {
                if (isObject(binding) && typeof binding.palette === "string") {
                    named.add(binding.palette);
                }
            }
        }
    }

    return named;
}

/**
 * Each column a style reads, as `dependencies.columns` writes it (spec 3.6 rule 1): its table, its
 * name and the JSON Schema type and measurement the session knows.
 * @param session - The session.
 * @param columns - The columns, as `<node|edge>:<name>`.
 * @returns The entries.
 */
function columnDependencies(session: GraphSession, columns: ReadonlySet<string>): JsonObject[] {
    const attributes = session.data.attributes();
    return [...columns].map((ref) => {
        const kind = ref.slice(0, ref.indexOf(":"));
        const name = ref.slice(kind.length + 1);
        const column = attributes.find((each) => each.kind === kind && each.name === name);
        return {
            kind,
            name,
            schema: column === undefined ? {} : columnSchema(column.type, column.measurement),
        };
    });
}

/**
 * Collect the columns, types and runs one layer reads.
 * @param layer - The written layer.
 * @param columns - Where the columns go, as `<node|edge>:<name>`.
 * @param runs - Where the runs go.
 * @param types - Where the type names a `type` selector names go.
 */
function readsOf(layer: JsonObject, columns: Set<string>, runs: Set<string>, types: Set<string>): void {
    const kind = layer.target === "edge" ? "edge" : "node";
    const names = new Set<string>();
    collect([layer.selector, layer.encode], DATA_PATH, names);
    collect([layer.selector, layer.encode], RESULT_PATH, runs);
    // A `by` with no prefix reads a column (style.md, "Paths" rule 1).
    for (const binding of Object.values(isObject(layer.encode) ? layer.encode : {})) {
        if (isObject(binding) && typeof binding.by === "string" && !/^(data|results)\./.test(binding.by)) {
            names.add(binding.by);
        }
    }

    names.forEach((name) => columns.add(`${kind}:${name}`));
    if (isObject(layer.selector) && layer.selector.match === "type" && Array.isArray(layer.selector.types)) {
        layer.selector.types.forEach((type) => {
            if (typeof type === "string") {
                types.add(type);
            }
        });
    }

    if (isObject(layer.source) && layer.source.by === "run" && typeof layer.source.runId === "string") {
        runs.add(layer.source.runId);
    }
}

/**
 * What the layers need from the data: the columns and runs they read (spec 3.6).
 * @param session - The session, for the columns' types.
 * @param layers - The written layers.
 * @returns `dependencies`, or undefined when they read nothing.
 */
function dependenciesOf(session: GraphSession, layers: readonly JsonObject[]): JsonObject | undefined {
    const columns = new Set<string>();
    const runs = new Set<string>();
    const types = new Set<string>();
    for (const layer of layers) {
        readsOf(layer, columns, runs, types);
    }

    const written = columnDependencies(session, columns);
    const dependencies = {
        ...(written.length === 0 ? {} : { columns: written }),
        ...(types.size === 0 ? {} : { types: [...types] }),
        ...(runs.size === 0 ? {} : { results: [...runs] }),
    };
    return Object.keys(dependencies).length === 0 ? undefined : dependencies;
}

/**
 * The palettes a style carries: each one its layers name, as the opened file carried it, else as
 * the catalog defines it.
 * @param session - The session, for the catalog.
 * @param layers - The written layers.
 * @param opened - The palettes the opened sections carried.
 * @returns The palettes.
 */
function palettesFor(
    session: GraphSession,
    layers: readonly JsonObject[],
    opened: readonly JsonObject[],
): JsonObject[] {
    const named = namedPalettes(layers);
    const carried = opened.filter((palette) => named.has(String(palette.id)));
    const catalog = session.catalog.palettes();
    const palettes: JsonObject[] = [...carried];
    for (const id of named) {
        const descriptor = catalog.find((each) => each.id === id);
        if (descriptor !== undefined && !carried.some((palette) => palette.id === id)) {
            palettes.push({ ...descriptor });
        }
    }

    return palettes;
}

/**
 * The section's header and body from the session as it is now.
 * @param session - The session.
 * @param problems - Where to report the layers left out.
 * @returns What the codec writes.
 */
function compose(session: GraphSession, problems: DocumentProblem[]): SectionWrite {
    const memory = memoryOf(session);
    const document = withAcceptedAssetIds(session, session.styles.toDocument());
    const ids = session.styles
        .list()
        .filter((layer) => !layer.locked)
        .map((layer) => layer.id);
    const writtenId = (id: LayerId): string => {
        const original = memory.layers.get(id)?.original.id;
        return typeof original === "string" ? original : id;
    };

    const placeIds: (string | undefined)[] = [];
    const layers: JsonObject[] = [];
    document.layers.forEach((spec, place) => {
        const id = ids[place];
        if (layerNamesElements(spec, session)) {
            placeIds.push(undefined);
            problems.push({
                code: "W_ELEMENT_NAMING_LEFT_OUT",
                params: { section: "style", pointer: `/layers/${place}` },
            });
            return;
        }

        const own = writtenId(id);
        placeIds.push(own);
        const layer = writeLayer(spec, own, spec.row === undefined ? undefined : writtenId(spec.row), session);
        const opened = memory.layers.get(id);
        layers.push(opened?.baseline === baselineOf(layer) ? opened.original : layer);
    });

    // A layer this release could not apply goes back after the layer it followed in its file.
    for (const { layer, after } of memory.kept) {
        const previous = after === null ? -1 : layers.findIndex((each) => each.id === after);
        layers.splice(after !== null && previous === -1 ? layers.length : previous + 1, 0, layer);
    }

    const palettes = palettesFor(session, layers, memory.palettes);

    const tree = document.tree === undefined ? undefined : writeTree(document.tree, (place) => placeIds[place]);
    if (tree !== undefined) {
        tree.push(...memory.kept.map(({ layer }) => ({ layer: layer.id })));
    }

    const valueLabels = [...dispatcherOf(session).state.valueLabels].map(([key, label]) => {
        const { path, value } = valueLabelOf(key);
        return { path: renameRuns(path, runName), value, label };
    });
    const assets = assetsMember(session).member?.assets as JsonObject[] | undefined;
    const body: JsonObject = {
        ...(palettes.length === 0 ? {} : { palettes }),
        ...(document.shaders === undefined ? {} : { shaders: document.shaders.map(({ id, text }) => ({ id, text })) }),
        layers,
        ...(tree === undefined ? {} : { tree }),
        ...(valueLabels.length === 0 ? {} : { valueLabels }),
        ...(assets === undefined ? {} : { assets }),
    };

    if (memory.body?.baseline === JSON.stringify(body)) {
        return { header: memory.header, body: memory.body.original };
    }

    const { dependencies: _was, ...header } = memory.header;
    const dependencies = dependenciesOf(session, layers);
    return { header: { ...header, ...(dependencies === undefined ? {} : { dependencies }) }, body };
}

// ---------------------------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------------------------

/** What reading one layer gave: the spec to apply, or why it is kept instead. */
type Prepared = { readonly spec: LayerSpec } | { readonly kept: string };

/** What one read lends the per-layer reading. */
interface Reading {
    readonly pointer: string;
    readonly problems: DocumentProblem[];
    /** The section's palettes by id. */
    readonly palettes: ReadonlyMap<string, JsonObject>;
    /** The section's palettes with a member this release does not know: a binding to one fails. */
    readonly failedPalettes: ReadonlySet<string>;
    readonly catalog: readonly PaletteDescriptor[];
    /** From a run's `as` to the one open run with that `as`, or undefined when none or several. */
    readonly rename: (run: string) => string | undefined;
    /** From a bare set id to the one open set it names, or undefined when none or several. */
    readonly set: (id: string) => string | undefined;
}

/**
 * Report a member this release does not know.
 * @param reading - The read.
 * @param pointer - Where it is, below the section.
 * @param reason - The element code that says why, when the member is a value that cannot apply.
 */
function unknown(reading: Reading, pointer: string, reason?: string): void {
    reading.problems.push({
        code: "W_UNKNOWN_MEMBER",
        params: {
            section: "style",
            pointer: `${reading.pointer}${pointer}`,
            ...(reason === undefined ? {} : { reason }),
        },
    });
}

/**
 * An object with the members outside a closed list taken out and reported.
 * @param value - The object.
 * @param known - The members it may have.
 * @param reading - The read.
 * @param at - Its pointer below the section.
 * @returns The object without them.
 */
function closed(value: JsonObject, known: ReadonlySet<string>, reading: Reading, at: string): JsonObject {
    const out: JsonObject = {};
    for (const [member, each] of Object.entries(value)) {
        if (known.has(member)) {
            out[member] = each;
        } else {
            unknown(reading, `${at}/${escape(member)}`);
        }
    }

    return out;
}

/**
 * Whether a closed object has a member outside its list, each reported. A closed object is never
 * read by ignoring a member (spec 10): the caller fails the entry that holds it.
 * @param value - The object.
 * @param known - The members it may have.
 * @param reading - The read.
 * @param at - Its pointer below the section.
 * @returns True when any member is unknown.
 */
function hasUnknown(value: JsonObject, known: ReadonlySet<string>, reading: Reading, at: string): boolean {
    let found = false;
    for (const member of Object.keys(value)) {
        if (!known.has(member)) {
            unknown(reading, `${at}/${escape(member)}`);
            found = true;
        }
    }

    return found;
}

/**
 * A binding as the session applies it, or undefined when it fails: a member this release does not
 * know, or a carried palette with one (spec 10). A carried palette whose colors the
 * session's palette of that id does not have written as the binding's own colors, so the section's
 * palette is the one drawn (spec 4.2 rule 6).
 * @param binding - The binding.
 * @param reading - The read.
 * @param at - Its pointer.
 * @returns The binding.
 */
function readBinding(binding: JsonObject, reading: Reading, at: string): JsonObject | undefined {
    if (hasUnknown(binding, BINDING_MEMBERS, reading, at)) {
        return undefined;
    }

    const out = binding;
    const id = out.palette;
    if (typeof id === "string" && reading.failedPalettes.has(id)) {
        return undefined;
    }

    const carried = typeof id === "string" ? reading.palettes.get(id) : undefined;
    if (carried === undefined || typeof id !== "string") {
        return out;
    }

    // The session refuses a palette nothing registered, so one it does not hold as carried is
    // drawn as the binding's own colors.
    const held = reading.catalog.find((each) => each.id === id);
    if (held !== undefined && JSON.stringify(held.colors) === JSON.stringify(carried.colors)) {
        return out;
    }

    const { palette: _palette, ...rest } = out;
    return { ...rest, colors: carried.colors };
}

/**
 * The channels of a `set` or `encode` the session applies: an unknown channel, or a built-in name
 * the session does not have, is dropped and reported (spec 10).
 * @param part - The `set` or `encode`.
 * @param encode - Whether it is `encode`.
 * @param reading - The read.
 * @param at - Its pointer.
 * @returns The channels kept.
 */
function readChannels(part: JsonObject, encode: boolean, reading: Reading, at: string): JsonObject {
    const out: JsonObject = {};
    for (const [channel, value] of Object.entries(part)) {
        const here = `${at}/${escape(channel)}`;
        const descriptor = channelDescriptor(channel);
        if (descriptor === undefined && !SHADER_ADDRESS.test(channel)) {
            unknown(reading, here, "E_UNKNOWN_CHANNEL");
            continue;
        }

        if (encode) {
            const binding = isObject(value) ? readBinding(value, reading, here) : value;
            // A failed binding fails its channel entry alone; the rest of the layer applies.
            if (binding !== undefined) {
                out[channel] = binding;
            }

            continue;
        }

        const values = descriptor?.accepts === "enum" ? descriptor.values : undefined;
        if (
            values !== undefined &&
            descriptor !== undefined &&
            typeof value === "string" &&
            !values.includes(value) &&
            !values.includes(value.replaceAll("-", "_")) &&
            !isEnumCount(descriptor, value)
        ) {
            unknown(reading, here, "E_OPTION_RANGE");
            continue;
        }

        out[channel] = value;
    }

    return out;
}

/**
 * One layer as the session applies it, or why it is kept instead.
 * @param raw - The layer as the file holds it.
 * @param index - Its place in `layers`.
 * @param reading - The read.
 * @returns The spec, or the code that keeps the layer.
 */
function prepareLayer(raw: unknown, index: number, reading: Reading): Prepared {
    const at = `/layers/${index}`;
    if (!isObject(raw) || !isObject(raw.selector) || typeof raw.selector.match !== "string") {
        return { kept: "E_BAD_LAYER" };
    }

    const members = SELECTOR_MEMBERS[raw.selector.match];
    if (
        members === undefined ||
        (raw.selector.match === "member" && isObject(raw.selector.of) && "types" in raw.selector.of)
    ) {
        return { kept: "E_BAD_SELECTOR" };
    }

    const layer = closed(raw, LAYER_MEMBERS, reading, at);
    // A selector with a member this release does not know could match too much: the layer fails.
    if (hasUnknown(raw.selector, new Set(["match", ...members]), reading, `${at}/selector`)) {
        return { kept: "E_BAD_SELECTOR" };
    }

    const { selector } = raw;
    const set = isObject(layer.set) ? readChannels(layer.set, false, reading, `${at}/set`) : undefined;
    const encode = isObject(layer.encode) ? readChannels(layer.encode, true, reading, `${at}/encode`) : undefined;
    const written =
        Object.keys(isObject(layer.set) ? layer.set : {}).length +
        Object.keys(isObject(layer.encode) ? layer.encode : {}).length;
    const left = Object.keys(set ?? {}).length + Object.keys(encode ?? {}).length;
    if (written > 0 && left === 0) {
        return { kept: "E_UNKNOWN_CHANNEL" };
    }

    const { id: _id, ...rest } = layer;
    // A run named by `as`, or a set by its bare id, binds to the one open run or set (spec 8.2
    // rule 7); one that binds nowhere stays as written and the layer is reported unbound.
    const rename = (run: string): string => {
        const bound = reading.rename(run);
        if (bound === undefined) {
            unbound(reading, at, run);
        }

        return bound ?? run;
    };
    const source =
        isObject(rest.source) && rest.source.by === "run" && typeof rest.source.runId === "string"
            ? { ...rest.source, runId: rename(rest.source.runId) }
            : rest.source;
    const spec = {
        ...rest,
        selector: bindSet(renameRuns(selector, rename), reading, at),
        ...(set === undefined ? {} : { set }),
        ...(encode === undefined ? {} : { encode: renameRuns(encode, rename) }),
        ...(source === undefined ? {} : { source }),
    };
    return { spec: spec as unknown as LayerSpec };
}

/**
 * Report a name a layer reads that binds to no one open run or set.
 * @param reading - The read.
 * @param at - The layer's pointer below the section.
 * @param ref - The name.
 */
function unbound(reading: Reading, at: string, ref: string): void {
    reading.problems.push({
        code: "W_REFERENCE_UNBOUND",
        params: { section: "style", pointer: `${reading.pointer}${at}`, ref },
    });
}

/**
 * A `member` selector with its bare set id bound to the open set it names.
 * @param selector - The selector, runs already bound.
 * @param reading - The read.
 * @param at - The layer's pointer.
 * @returns The selector.
 */
function bindSet(selector: JsonObject, reading: Reading, at: string): JsonObject {
    if (selector.match !== "member" || !isObject(selector.of) || typeof selector.of.set !== "string") {
        return selector;
    }

    const bound = reading.set(selector.of.set);
    if (bound === undefined) {
        unbound(reading, at, selector.of.set);
        return selector;
    }

    return { ...selector, of: { set: bound } };
}

/** Where a tree row may be pinned. */
const PINS = ["top", "bottom", "none"] as const;

/**
 * The style tree with layers named by place among the layers applied.
 * @param rows - The tree as the file holds it.
 * @param placeOf - The place of a layer id among the applied layers.
 * @returns The rows; a row naming a layer not applied is left out.
 */
function readTree(rows: unknown, placeOf: ReadonlyMap<string, number>): StyleDocumentRow[] {
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows.flatMap((row): StyleDocumentRow[] => {
        if (!isObject(row)) {
            return [];
        }

        const pin = PINS.find((each) => each === row.pin);
        const flags = {
            ...(pin === undefined ? {} : { pin }),
            ...(typeof row.locked === "boolean" ? { locked: row.locked } : {}),
            ...(typeof row.hidden === "boolean" ? { hidden: row.hidden } : {}),
        };
        if (typeof row.layer === "string") {
            const place = placeOf.get(row.layer);
            return place === undefined ? [] : [{ layer: place, ...flags }];
        }

        return typeof row.folder === "string"
            ? [{ folder: row.folder, children: readTree(row.children, placeOf), ...flags }]
            : [];
    });
}

/**
 * From each run's `as` to the one open run with that `as` (spec 8.2 rule 7): the session's runs,
 * and the runs this open restores (the view's run records and the results' runs) or starts (a
 * recipe applied alongside, as `<namespace>__<as>`). Only runs that carry an `as` take part.
 * @param context - The open.
 * @returns The binding: the run id, or undefined when none or several runs have the `as`.
 */
function runIdsOf(context: ReadContext): (run: string) => string | undefined {
    const byAs = new Map<string, Set<string>>();
    const add = (id: unknown, as?: unknown): void => {
        if (typeof id !== "string") {
            return;
        }

        const name = typeof as === "string" ? as : splitRunId(id)?.as;
        if (name !== undefined) {
            byAs.set(name, (byAs.get(name) ?? new Set()).add(id));
        }
    };
    for (const run of context.session.runs.list()) {
        add(run.id);
    }

    const viewRuns = context.other("view")?.body.runs;
    for (const record of Array.isArray(viewRuns) ? viewRuns : []) {
        if (isObject(record)) {
            add(record.id, record.as);
        }
    }

    const resultRuns = context.other("results")?.body.runs;
    for (const [id, record] of Object.entries(isObject(resultRuns) ? resultRuns : {})) {
        add(id, isObject(record) ? record.as : undefined);
    }

    const recipe = context.applyRecipe === true ? context.other("recipe") : undefined;
    if (recipe !== undefined) {
        const namespace = isNamespace(recipe.body.namespace)
            ? recipe.body.namespace
            : namespaceFromId(recipe.header.id);
        for (const command of Array.isArray(recipe.body.commands) ? recipe.body.commands : []) {
            if (isObject(command) && command.op === "algo.run" && typeof command.as === "string") {
                add(`${namespace}__${command.as}`, command.as);
            }
        }
    }

    return (run) => {
        const ids = byAs.get(run);
        return ids?.size === 1 ? [...ids][0] : undefined;
    };
}

/**
 * From a bare set id to the one open set it names (spec 8.2 rule 7): a session set whose file id
 * is that id, or that id under a namespace.
 * @param session - The session.
 * @returns The binding: the session set id, or undefined when none or several match.
 */
function setIdsOf(session: GraphSession): (id: string) => string | undefined {
    const { sets: fileIds } = fileIdsOf(session);
    const open = session.sets.list().map((set) => [set.id, fileIds.get(set.id) ?? set.id] as const);
    return (id) => {
        const matches = open.filter(([, file]) => bareSetId(file) === id);
        return matches.length === 1 ? matches[0][0] : undefined;
    };
}

/**
 * Add the prepared layers in one call; when the session refuses that, one call per layer, so a
 * refused layer is kept alone (the tree is then not restored).
 * @param context - The open.
 * @param document - The layers, palettes, shaders and tree.
 * @param indexes - Each layer's place in the file.
 * @returns The places of the layers the session refused, with its code.
 */
async function apply(
    context: ReadContext,
    document: StyleDocument,
    indexes: readonly number[],
): Promise<Map<number, string>> {
    const refused = new Map<number, string>();
    try {
        await context.tx.styles.applyTemplate(document);
        return refused;
    } catch (error) {
        if (!isGraphtyError(error)) {
            throw error;
        }
    }

    if (document.shaders !== undefined) {
        await context.tx.styles.applyTemplate({ version: 1, layers: [], shaders: document.shaders });
    }

    for (const [at, spec] of document.layers.entries()) {
        try {
            await context.tx.styles.applyTemplate({
                version: 1,
                layers: [spec],
                ...(document.palettes === undefined ? {} : { palettes: document.palettes }),
            });
        } catch (error) {
            if (!isGraphtyError(error)) {
                throw error;
            }

            refused.set(indexes[at], error.code);
        }
    }

    return refused;
}

/**
 * Read a style section into the session as new layers, in the open's one step (spec 4.2 rule 10).
 * @param section - The section.
 * @param context - The open.
 */
async function read(section: ReadSection, context: ReadContext): Promise<void> {
    const { body, pointer } = section;
    const { session, problems } = context;
    if (context.dataMode === "replace" && context.sections.has("data")) {
        // A new project: what earlier files held goes.
        MEMORY.delete(session);
    }

    const memory = memoryOf(session);
    memory.body = undefined;
    const ownBefore = session.styles.list().filter((layer) => !layer.locked);
    const before = new Set(ownBefore.map((layer) => layer.id));

    if (Array.isArray(body.assets) && body.assets.length > 0) {
        try {
            await restoreAssets(session, { kind: "graphty-assets", version: 1, assets: body.assets });
        } catch (error) {
            if (!isGraphtyError(error)) {
                throw error;
            }

            problems.push({ code: "E_BAD_DOCUMENT", params: { section: "style", pointer: `${pointer}/assets` } });
        }
    }

    const sectionPalettes = new Map<string, JsonObject>();
    const failedPalettes = new Set<string>();
    const reading: Reading = {
        pointer,
        problems,
        palettes: sectionPalettes,
        failedPalettes,
        catalog: session.catalog.palettes(),
        rename: runIdsOf(context),
        set: setIdsOf(session),
    };
    for (const [index, palette] of (Array.isArray(body.palettes) ? body.palettes : []).entries()) {
        if (isObject(palette) && typeof palette.id === "string") {
            if (hasUnknown(palette, PALETTE_MEMBERS, reading, `/palettes/${index}`)) {
                failedPalettes.add(palette.id);
            } else {
                sectionPalettes.set(palette.id, palette);
            }
        }
    }

    const raws: unknown[] = Array.isArray(body.layers) ? body.layers : [];
    const specs: LayerSpec[] = [];
    const indexes: number[] = [];
    const keptAt = new Map<number, string>();
    raws.forEach((raw, index) => {
        const prepared = prepareLayer(raw, index, reading);
        if ("spec" in prepared) {
            specs.push(prepared.spec);
            indexes.push(index);
        } else {
            keptAt.set(index, prepared.kept);
        }
    });

    const placeOf = new Map(indexes.map((index, place) => [String((raws[index] as JsonObject).id), place]));
    const shaders = (Array.isArray(body.shaders) ? body.shaders : []).filter(
        (shader): shader is { id: string; text: string } =>
            isObject(shader) && typeof shader.id === "string" && typeof shader.text === "string",
    );
    const document: StyleDocument = {
        version: 1,
        layers: specs,
        ...(shaders.length === 0 ? {} : { shaders }),
        ...(body.tree === undefined ? {} : { tree: readTree(body.tree, placeOf) }),
    };
    for (const [index, code] of await apply(context, document, indexes)) {
        keptAt.set(index, code);
    }

    for (const [index, code] of keptAt) {
        unknown(reading, `/layers/${index}`, code);
    }

    // The session's new layers, bottom first, are the applied ones in file order.
    const added = session.styles
        .list()
        .filter((layer) => !layer.locked && !before.has(layer.id))
        .map((layer) => layer.id);
    const applied = indexes.filter((index) => !keptAt.has(index));
    added.forEach((id, place) => {
        const original = raws[applied[place]];
        if (isObject(original)) {
            memory.layers.set(id, { original, baseline: "" });
        }
    });

    raws.forEach((raw, index) => {
        if (keptAt.has(index) && isObject(raw)) {
            const previous = index === 0 ? undefined : raws[index - 1];
            memory.kept.push({
                layer: raw,
                after: isObject(previous) && typeof previous.id === "string" ? previous.id : null,
            });
        }
    });
    memory.palettes.push(...(Array.isArray(body.palettes) ? body.palettes.filter(isObject) : []));
    memory.header = Object.fromEntries(
        OWN_HEADER.flatMap((member) =>
            section.header[member] === undefined ? [] : [[member, section.header[member]]],
        ),
    );

    for (const entry of Array.isArray(body.valueLabels) ? body.valueLabels : []) {
        if (isObject(entry) && typeof entry.path === "string" && typeof entry.label === "string") {
            const { value } = entry;
            const path = renameRuns(entry.path, (run) => reading.rename(run) ?? run);
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                await context.tx.data.setValueLabel(path, value, entry.label);
            }
        }
    }

    // What the session now writes for each opened layer and, when it held no layer of its own
    // before, for the whole section: a save that still writes these writes the file's own form.
    const document2 = session.styles.toDocument();
    const ids = session.styles
        .list()
        .filter((layer) => !layer.locked)
        .map((layer) => layer.id);
    for (const [place, id] of ids.entries()) {
        const opened = memory.layers.get(id);
        const spec = document2.layers[place];
        if (opened !== undefined && added.includes(id)) {
            const rowId =
                spec.row === undefined ? undefined : (memory.layers.get(spec.row)?.original.id as string | undefined);
            opened.baseline = baselineOf(writeLayer(spec, "", rowId ?? spec.row, session));
        }
    }

    if (ownBefore.length === 0) {
        memory.body = { original: body, baseline: JSON.stringify(compose(session, []).body) };
    }

    context.restored.add("styles");
}

/** The `graphty-style` section, version 2. */
export const styleCodec: SectionCodec = {
    section: "style",
    version: 2,
    reads: [2],
    bound: false,
    members: ["palettes", "shaders", "layers", "tree", "valueLabels", "assets"],
    write(context: WriteContext) {
        return Promise.resolve(compose(context.session, context.problems));
    },
    read,
};
