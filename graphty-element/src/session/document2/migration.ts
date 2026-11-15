/**
 * @file Version 1 files to version 2 (spec 9.1). Experimental (`save-files-v2`).
 *
 * Called by `project.open` only with the experiment on and `migrate: true`; each function returns
 * undefined for anything it does not migrate, and the file is then read as before. Pure: it reads
 * the file it is given and nothing else, never a session.
 *
 * Known gaps -- what the migration leaves out, because a version 1 file does not hold it or holds
 * it in a form that cannot be carried over truthfully:
 *
 * - Data. The version 1 merged graph is one embedded `derived` source keyed by node id in its own
 *   `source:<id>` space, rows in version 1 order, beside an empty reader source; its edits are
 *   already in its rows. The source id, copy id and build stamp are ULIDs derived from the copy,
 *   so migrating one file twice writes the same ids. `kindIds`, `idPrefix` and `kind:` respellings
 *   stay in the key. The `edgeIdPath`, `edgeWeightPath` and `timePath` known fields become mapping
 *   roles where the copy holds the column; every other `data.` config key is reported. A `label`
 *   role is not written as a style layer. Issue fixes and declarations of a column no type carries
 *   are reported.
 * - Runs. Every run becomes a view run record under the namespace `session` (element-minted) or
 *   `reader`, so style paths name it by `as`; its outputs go to results. A run over the selection
 *   or the visible graph is written over the whole graph and `"replayable": false`, reported; a
 *   filter- or window-narrowed run is `"replayable": false`. `engine` names the file's generator
 *   for graphty-element and `unknown` for the algorithms and the layout; a caveat member version 1
 *   lacks takes a stated default; `shape`, `measured` and `sample` are dropped.
 * - Sets. Every set goes to the view; an element-minted `set_<slug>` id becomes `set_` plus a ULID
 *   derived from it, and every `set` member naming it is rewritten.
 * - Visibility. Filter steps are reported and not written; `windowRaw` is not written.
 * - Members. A member of a kind this migration does not read, a second member of one kind, an
 *   assets member with no style, a value label on a path that is neither `data.` nor `results.`,
 *   and `styleVersion` and `recipeVersion` are left out and reported `W_MEMBER_LEFT_OUT`.
 * - Style. Edges a version 1 `ids` selector named (session edge ids) are dropped; built-in palettes
 *   are not carried (that needs the catalog); the style tree is not carried.
 * - Cameras. A saved view's camera has no `fov` in version 1 and takes the view codec's default.
 * - Bare members. A version 1 notes, results, arrangement, view-state, sources or assets member
 *   alone has no data to bind to and is not migrated; neither is a version 1 notes, results or
 *   view section met inside a version 2 file. A version 1 recipe snapshot (`session.recipe()`)
 *   keeps only its style. A session member gives no recipe: opening restores the view.
 */

import { ENGINE_VERSIONS } from "../runs/engine";
import { asName } from "./codecs/recipeCommands";
import { cameraJson } from "./codecs/viewParts";
import {
    decodeColumn,
    documentValue,
    isObject,
    keyText,
    migrateData,
    type MigratedData,
    objectsOf,
    renameFileStyles,
    ulidOf,
} from "./migrationParts";
import type { DocumentProblem, DocumentSection, EdgeRef, JsonObject, NodeRef } from "./types";

/** The version each section is migrated to. */
const VERSIONS: Readonly<Record<DocumentSection, number>> = {
    data: 2,
    style: 2,
    recipe: 2,
    settings: 1,
    results: 2,
    notes: 2,
    view: 1,
};

/** The sections in the order a full file writes them (types.ts `DOCUMENT_SECTIONS`). */
const ORDER: readonly DocumentSection[] = ["data", "style", "recipe", "settings", "results", "notes", "view"];

/** The members of a version 1 `graphty-document`, and the bare version 1 documents. */
const MEMBER_KINDS = new Set([
    "graphty-data",
    "graphty-session",
    "graphty-arrangement",
    "graphty-results",
    "graphty-style",
    "graphty-notes",
    "graphty-view-state",
    "graphty-assets",
    "graphty-sources",
    "graphty-recipe",
]);

/** A set id as the schema spells it: `set_` plus a ULID, under a recipe namespace or not. */
const SET_ID = /^set_([a-z][a-z0-9_]*\.)?[0-9A-HJKMNP-TV-Z]{26}$/;

/** A run namespace and name (common schema `namespace`, `runName`). */
const NAMESPACE = /^[a-z](?:[a-z0-9]|_(?!_))*$/;
const RUN_NAME = /^[a-z][a-z0-9_]*$/;

/** What every section builder reads. */
interface Context {
    readonly members: ReadonlyMap<string, JsonObject>;
    readonly generator: JsonObject;
    readonly data: MigratedData | undefined;
    /** Each version 1 run id's `derived` flag. */
    readonly derived: ReadonlyMap<string, boolean>;
    /** The session's sets, by id. */
    readonly sets: ReadonlyMap<string, JsonObject>;
    /** A version 1 set id's version 2 id (`set_` plus a ULID). */
    setId(id: string): string;
    readonly problems: DocumentProblem[];
}

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

/**
 * A section's header members, in the order HEADER_MEMBERS gives, the empty ones left out.
 * @param section - The section.
 * @param context - For the generator.
 * @param own - The `id`, `name`, `description`, `dependencies`, `bindsTo` and `extensions`.
 * @returns The header.
 */
function header(section: DocumentSection, context: Context, own: JsonObject = {}): JsonObject {
    const kind = `graphty-${section}`;
    const version = VERSIONS[section];
    const pick = (...names: string[]): JsonObject =>
        Object.fromEntries(names.flatMap((name) => (own[name] === undefined ? [] : [[name, own[name]]])));
    return {
        $schema: `https://graphty.app/schema/documents/${kind}/v${String(version)}.json`,
        kind,
        version,
        ...pick("id", "name", "description"),
        generator: context.generator,
        ...pick("dependencies", "bindsTo", "extensions"),
    };
}

/**
 * The header members a version 1 style or recipe names itself with. Its `styleVersion` or
 * `recipeVersion` has no version 2 member: it is dropped and reported.
 * @param value - The version 1 document.
 * @param versionKey - `styleVersion` or `recipeVersion`.
 * @param kind - The version 1 member, for the report.
 * @param problems - Collects the dropped version.
 * @returns `id`, `name` and `description`, as present.
 */
function identityOf(value: JsonObject, versionKey: string, kind: string, problems: DocumentProblem[]): JsonObject {
    const text = (name: string): JsonObject =>
        typeof value[name] === "string" && value[name] !== "" ? { [name]: value[name] } : {};
    if (value[versionKey] !== undefined) {
        problems.push(leftOut(kind, `/${versionKey}`));
    }

    return {
        ...text("id"),
        ...text("name"),
        ...text("description"),
        ...(isObject(value.extensions) ? { extensions: value.extensions } : {}),
    };
}

/**
 * A run's namespace and name in a version 2 file (spec 4.3 rule 1), as the results codec spells
 * them (codecs/results.ts `runNameOf`): an id holding `__` splits there; else the element's own
 * runs take `session` and the reader's `reader`. A name the schema rejects is made a valid one.
 * @param id - The version 1 run id.
 * @param derived - Whether the element minted it.
 * @returns The namespace and name.
 */
function runKey(id: string, derived: boolean): { namespace: string; as: string } {
    const at = id.indexOf("__");
    const [namespace, as] = at < 0 ? [derived ? "session" : "reader", id] : [id.slice(0, at), id.slice(at + 2)];
    const nsFits = namespace.length <= 32 && NAMESPACE.test(namespace) && !namespace.endsWith("_");
    const asFits = as.length <= 64 && RUN_NAME.test(as) && !as.includes("__");
    return { namespace: nsFits ? namespace : "reader", as: asFits ? as : asName(as) };
}

/**
 * Every string in a value with each `results.<run>` path renamed.
 * @param value - The value.
 * @param rename - From a version 1 run id to the name the section names it by.
 * @returns A copy.
 */
function renameRuns<T>(value: T, rename: (id: string) => string): T {
    if (typeof value === "string") {
        return value.replaceAll(/results\.([A-Za-z0-9_-]+)/g, (_, id: string) => `results.${rename(id)}`) as T;
    }

    if (Array.isArray(value)) {
        return value.map((entry: unknown) => renameRuns(entry, rename)) as T;
    }

    if (isObject(value)) {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, renameRuns(entry, rename)])) as T;
    }

    return value;
}

/**
 * Node references for a list of version 1 node ids.
 * @param ids - The ids.
 * @param data - The data.
 * @returns The references.
 */
function nodeRefs(ids: unknown, data: MigratedData): NodeRef[] {
    return (Array.isArray(ids) ? (ids as unknown[]) : []).flatMap((id) => data.nodeRef(id) ?? []);
}

/**
 * The reference of a version 1 edge member (`{ source, target, id }` or `{ ..., ordinal }`).
 * @param member - The member.
 * @param data - The data.
 * @returns The reference, or undefined for an edge the data does not hold.
 */
function edgeMemberRef(member: unknown, data: MigratedData): EdgeRef | undefined {
    if (!isObject(member)) {
        return undefined;
    }

    const ordinal = typeof member.ordinal === "number" ? member.ordinal : undefined;
    return data.edgeBetween(member.source, member.target, member.id, ordinal);
}

// ---------------------------------------------------------------------------------------------
// What names elements (spec 4.2 rule 5, 5 rule 1)
// ---------------------------------------------------------------------------------------------

/**
 * Whether a scope names elements: listed nodes, an inline fixed or path set, or a set that does.
 * @param scope - The scope.
 * @param sets - The sets, by id.
 * @param seen - The sets already followed.
 * @returns True when it does.
 */
function scopeNames(scope: unknown, sets: ReadonlyMap<string, JsonObject>, seen: Set<string>): boolean {
    if (!isObject(scope)) {
        return false;
    }

    if (Array.isArray(scope.nodes)) {
        return true;
    }

    if (isObject(scope.define)) {
        return definitionNames(scope.define, sets, seen);
    }

    const set = typeof scope.set === "string" ? sets.get(scope.set) : undefined;
    if (set === undefined || seen.has(String(scope.set))) {
        return false;
    }

    seen.add(String(scope.set));
    return isObject(set.definition) && definitionNames(set.definition, sets, seen);
}

/**
 * Whether a set definition names elements: a fixed or path set, or a rule that does.
 * @param definition - The definition.
 * @param sets - The sets, by id.
 * @param seen - The sets already followed.
 * @returns True when it does.
 */
function definitionNames(definition: JsonObject, sets: ReadonlyMap<string, JsonObject>, seen: Set<string>): boolean {
    return definition.kind === "rule" ? ruleNames(definition.where, sets, seen) : true;
}

/**
 * Whether a rule tree has a leaf naming elements: a neighborhood, listed ids, a result item, or a
 * member of a scope that names elements.
 * @param rule - The rule tree, or an expression.
 * @param sets - The sets, by id.
 * @param seen - The sets already followed.
 * @returns True when it does.
 */
function ruleNames(rule: unknown, sets: ReadonlyMap<string, JsonObject>, seen: Set<string>): boolean {
    if (!isObject(rule)) {
        return false;
    }

    switch (rule.kind) {
        case "neighborhood":
        case "ids":
        case "item":
            return true;
        case "member":
            return scopeNames(rule.of, sets, seen);
        case "all":
        case "any":
            return objectsOf(rule.of).some((each) => ruleNames(each, sets, seen));
        case "not":
            return ruleNames(rule.of, sets, seen);
        default:
            return false;
    }
}

/**
 * Whether a style layer names elements and belongs in the view.
 * @param layer - The version 1 layer.
 * @param sets - The sets, by id.
 * @returns True when it does.
 */
function layerNames(layer: JsonObject, sets: ReadonlyMap<string, JsonObject>): boolean {
    const selector = isObject(layer.selector) ? layer.selector : {};
    switch (selector.match) {
        case "ids":
            return true;
        case "member":
            return scopeNames(selector.of, sets, new Set());
        case "rule":
            return ruleNames(selector.where, sets, new Set());
        default:
            return false;
    }
}

/**
 * A scope or rule leaf's listed nodes as element references.
 * @param scope - The scope.
 * @param data - The data.
 * @returns The scope, its node ids as references.
 */
function boundScope(scope: unknown, data: MigratedData): unknown {
    if (!isObject(scope)) {
        return scope;
    }

    if (Array.isArray(scope.nodes)) {
        return { nodes: nodeRefs(scope.nodes, data) };
    }

    if (isObject(scope.define) && scope.define.kind !== "rule") {
        return { nodes: nodeRefs(scope.define.nodes, data) };
    }

    return scope;
}

/**
 * A rule tree with the ids its leaves name written as element references (a bound rule tree).
 * @param rule - The rule tree.
 * @param data - The data.
 * @returns The rule tree.
 */
function boundRule(rule: unknown, data: MigratedData): unknown {
    if (!isObject(rule)) {
        return rule;
    }

    switch (rule.kind) {
        case "neighborhood":
            return { ...rule, seeds: nodeRefs(rule.seeds, data) };
        case "member":
            return { ...rule, of: boundScope(rule.of, data) };
        case "all":
        case "any":
            return {
                ...rule,
                of: (Array.isArray(rule.of) ? (rule.of as unknown[]) : []).map((each) => boundRule(each, data)),
            };
        case "not":
            return { ...rule, of: boundRule(rule.of, data) };
        default:
            return rule;
    }
}

// ---------------------------------------------------------------------------------------------
// style (spec 4.2) and the view's layers (4.7)
// ---------------------------------------------------------------------------------------------

/** The members of a version 2 palette (common schema `palette`). */
const PALETTE_MEMBERS = ["id", "plainName", "kind", "colors", "capacity", "colorblindSafe"];

/** The members of a version 2 asset (common schema `asset`). */
const ASSET_MEMBERS = ["id", "sha256", "format", "main", "source", "stored", "plainName", "skipped", "files"];

/**
 * An object's listed members, in that order.
 * @param value - The object.
 * @param names - The members to keep.
 * @returns The copy.
 */
function pick(value: JsonObject, names: readonly string[]): JsonObject {
    return Object.fromEntries(names.flatMap((name) => (value[name] === undefined ? [] : [[name, value[name]]])));
}

/**
 * Every `set` member in a value holding a version 1 set id, written as the set's version 2 id.
 * @param value - The value.
 * @param context - The file.
 * @returns A copy.
 */
function renameSets<T>(value: T, context: Context): T {
    if (Array.isArray(value)) {
        return value.map((entry: unknown) => renameSets(entry, context)) as T;
    }

    if (!isObject(value)) {
        return value;
    }

    return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
            key,
            key === "set" && typeof entry === "string" ? context.setId(entry) : renameSets(entry, context),
        ]),
    ) as T;
}

/**
 * A version 1 style document, split: the layers that name no element into a style section, the
 * others into the view's `layers` with element references; every layer's id into `order`,
 * bottom first, and no layer keeps a `kind`.
 * @param style - The version 1 style document.
 * @param context - The file.
 * @returns The style section, the view's layers and the order.
 */
function migrateStyle(
    style: JsonObject,
    context: Context,
): { section: JsonObject; viewLayers: JsonObject[]; order: string[] } {
    const { data, sets, problems } = context;
    const used = new Set<string>();
    const asName = (id: string): string => runKey(id, context.derived.get(id) ?? false).as;
    const asRunId = (id: string): string => {
        const { namespace, as } = runKey(id, context.derived.get(id) ?? false);
        return `${namespace}__${as}`;
    };
    const layers: JsonObject[] = [];
    const viewLayers: JsonObject[] = [];
    const order: string[] = [];
    const results = new Set<string>();
    objectsOf(style.layers).forEach((layer, at) => {
        let id = typeof layer.id === "string" && layer.id !== "" ? layer.id : `layer-${String(at + 1)}`;
        while (used.has(id)) {
            id = `${id}-${String(at + 1)}`;
        }

        used.add(id);
        const { id: _id, name, kind: _kind, ...rest } = layer;
        const named = layerNames(layer, sets);
        const rename = named ? asRunId : asName;
        const source = isObject(rest.source) && typeof rest.source.runId === "string" ? rest.source : undefined;
        const v2: JsonObject = renameFileStyles(
            renameSets(
                {
                    id,
                    name: typeof name === "string" ? name : "",
                    ...renameRuns(rest, rename),
                    ...(source === undefined ? {} : { source: { ...source, runId: rename(String(source.runId)) } }),
                },
                context,
            ),
            data,
        );
        if (!named) {
            for (const match of JSON.stringify([v2.selector, v2.encode]).matchAll(/results\.([a-z][a-z0-9_]*)/g)) {
                results.add(match[1]);
            }

            layers.push(v2);
            order.push(id);
            return;
        }

        if (data === undefined) {
            problems.push({
                code: "W_ELEMENT_NAMING_LEFT_OUT",
                params: { section: "style", pointer: `/layers/${String(at)}` },
            });
            return;
        }

        viewLayers.push({ ...v2, selector: boundSelector(v2.selector, data) });
        order.push(id);
    });

    const session = context.members.get("graphty-session");
    const valueLabels = objectsOf(session?.valueLabels).flatMap((label, at) => {
        const { path, value } = label;
        const plain = typeof value === "string" || typeof value === "number" || typeof value === "boolean";
        if (typeof path !== "string" || typeof label.label !== "string" || !plain) {
            problems.push(leftOut("graphty-session", `/valueLabels/${String(at)}`));
            return [];
        }

        if (path.startsWith("data.")) {
            return [{ path, value, label: label.label }];
        }

        if (path.startsWith("results.")) {
            return [{ path: renameRuns(path, asName), value, label: label.label }];
        }

        problems.push(leftOut("graphty-session", `/valueLabels/${String(at)}`));
        return [];
    });
    const palettes = objectsOf(style.palettes).map((palette) => pick(palette, PALETTE_MEMBERS));
    const shaders = objectsOf(style.shaders).flatMap((shader) =>
        typeof shader.id === "string" && typeof shader.text === "string" ? [{ id: shader.id, text: shader.text }] : [],
    );
    const assets = objectsOf(context.members.get("graphty-assets")?.assets).flatMap((asset) =>
        typeof asset.id === "string" && typeof asset.sha256 === "string" ? [pick(asset, ASSET_MEMBERS)] : [],
    );
    const identity = identityOf(style, "styleVersion", "graphty-style", problems);
    const section = {
        ...header("style", context, {
            ...identity,
            ...(results.size === 0 ? {} : { dependencies: { results: [...results] } }),
        }),
        layers,
        ...(palettes.length === 0 ? {} : { palettes }),
        ...(shaders.length === 0 ? {} : { shaders }),
        ...(valueLabels.length === 0 ? {} : { valueLabels }),
        ...(assets.length === 0 ? {} : { assets }),
    };
    return { section, viewLayers, order };
}

/**
 * A view layer's selector, the ids it names written as element references.
 * @param selector - The selector.
 * @param data - The data.
 * @returns The selector.
 */
function boundSelector(selector: unknown, data: MigratedData): unknown {
    if (!isObject(selector)) {
        return selector;
    }

    switch (selector.match) {
        case "ids":
            // Version 1 names a layer's edges by session edge id, which no file can bind.
            return { match: "ids", nodes: nodeRefs(selector.nodes, data) };
        case "member":
            return { ...selector, of: boundScope(selector.of, data) };
        case "rule":
            return { ...selector, where: boundRule(selector.where, data) };
        default:
            return selector;
    }
}

// ---------------------------------------------------------------------------------------------
// Sets and runs: the view (4.7)
// ---------------------------------------------------------------------------------------------

/**
 * Every set, as the view holds it: `{ id, name, definition }`, its node and edge members as
 * element references, rule sets included whatever their rule names.
 * @param context - The file.
 * @param data - The data.
 * @returns The view sets.
 */
function migrateSets(context: Context, data: MigratedData): JsonObject[] {
    return [...context.sets].map(([id, set]) => {
        const definition = isObject(set.definition) ? set.definition : {};
        const reading = typeof definition.reading === "string" ? definition.reading : "induced";
        return {
            id: context.setId(id),
            name: typeof set.name === "string" ? set.name : "",
            definition: renameSets(definitionOf(definition, data, reading), context),
        };
    });
}

/**
 * A set definition with its members written as element references.
 * @param definition - Its version 1 definition.
 * @param data - The data.
 * @param reading - Its edge reading.
 * @returns The definition.
 */
function definitionOf(definition: JsonObject, data: MigratedData, reading: string): JsonObject {
    const edges = Array.isArray(definition.edges) ? (definition.edges as unknown[]) : undefined;
    switch (definition.kind) {
        case "fixed":
            return {
                kind: "fixed",
                nodes: nodeRefs(definition.nodes, data),
                ...(edges === undefined ? {} : { edges: edges.flatMap((edge) => edgeMemberRef(edge, data) ?? []) }),
                reading: reading === "listed" ? "listed" : "induced",
            };
        case "path":
            return {
                kind: "path",
                nodes: nodeRefs(definition.nodes, data),
                ...(edges === undefined
                    ? {}
                    : {
                          edges: edges.map((edge) => {
                              if (Array.isArray(edge)) {
                                  return edge.flatMap((each) => edgeMemberRef(each, data) ?? []);
                              }

                              return edge === null ? null : (edgeMemberRef(edge, data) ?? null);
                          }),
                      }),
                ...(typeof definition.directed === "boolean" ? { directed: definition.directed } : {}),
            };
        default:
            return { kind: "rule", where: boundRule(definition.where, data), reading };
    }
}

/**
 * The version 1 runs as the view's run records (spec 4.7 `runs`), in the order made. A run over
 * the selection or the visible graph, or narrowed by a filter or a time window, cannot be replayed
 * exactly: it is written with `"replayable": false`, over the whole graph when its scope has no
 * version 2 form, and that is reported.
 * @param runs - The version 1 runs.
 * @param context - The file.
 * @param data - The data.
 * @returns The run records.
 */
function migrateRuns(runs: readonly JsonObject[], context: Context, data: MigratedData): JsonObject[] {
    return runs.map((run, at) => {
        const { namespace, as } = runKey(String(run.id), run.derived === true);
        const caveats = isObject(run.caveats) ? run.caveats : {};
        const bare = run.scope === "selection" || run.scope === "visible";
        const narrowed = bare || caveats.filterScope === true || caveats.windowScope === true;
        if (bare) {
            context.problems.push(leftOut("graphty-results", `/runs/${String(at)}/scope`));
        }

        const seed = Number.isInteger(run.seed) ? run.seed : caveats.seed;
        const scope = run.scope === undefined || bare ? "graph" : renameSets(boundScope(run.scope, data), context);
        return {
            id: `${namespace}__${as}`,
            namespace,
            as,
            ...(typeof run.name === "string" ? { name: run.name } : {}),
            algorithm: run.algorithm,
            ...(isObject(run.params) && Object.keys(run.params).length > 0 ? { params: run.params } : {}),
            ...(Number.isInteger(seed) && (seed as number) >= 0 ? { seed } : {}),
            scope,
            ...(narrowed ? { replayable: false } : {}),
        };
    });
}

// ---------------------------------------------------------------------------------------------
// results (4.5)
// ---------------------------------------------------------------------------------------------

/**
 * One version 1 output table as columns over element references.
 * @param columns - The version 1 columns.
 * @param refs - Each row's reference, or undefined for a row to leave out.
 * @returns The output.
 */
function outputOf(columns: unknown, refs: readonly (NodeRef | EdgeRef | undefined)[]): JsonObject {
    const decoded = Object.entries(isObject(columns) ? columns : {}).flatMap(([name, column]) => {
        const values = decodeColumn(column, refs.length);
        return values === undefined ? [] : [[name, values] as const];
    });
    const rows = refs.flatMap((ref, at) =>
        ref !== undefined && decoded.some(([, values]) => values[at] !== null && values[at] !== undefined) ? [at] : [],
    );
    return {
        refs: rows.map((at) => refs[at]),
        columns: Object.fromEntries(
            decoded.map(([name, values]) => [name, rows.map((at) => documentValue(values[at]))]),
        ),
    };
}

/**
 * A version 1 run's fields as version 2 writes them.
 * @param fields - The version 1 fields.
 * @returns The fields with a name, a node, edge or graph kind, and a type.
 */
function fieldsOf(fields: unknown): JsonObject[] {
    return objectsOf(fields).flatMap((field) =>
        typeof field.name === "string" &&
        typeof field.type === "string" &&
        ["node", "edge", "graph"].includes(String(field.kind))
            ? [{ name: field.name, kind: field.kind, type: field.type }]
            : [],
    );
}

/** What a version 1 caveat record may lack that version 2 requires, and the value it takes. */
const CAVEAT_DEFAULTS: JsonObject = {
    exact: false,
    direction: "unknown",
    precision: "f64",
    method: "unknown",
    facts: [],
};

/**
 * A version 1 run's caveats as version 2 writes them: without `notes`, `partialReason` and `seed`
 * (the run's own `seed` holds it), a
 * required member it lacks at its default.
 * @param caveats - The version 1 caveats.
 * @returns The caveats.
 */
function caveatsOf(caveats: JsonObject): JsonObject {
    const { notes: _notes, partialReason: _reason, seed: _seed, ...rest } = caveats;
    return { ...CAVEAT_DEFAULTS, ...rest };
}

/**
 * The engine versions of a migrated run: the release that saved the file for graphty-element; a
 * version 1 file records none for the algorithms and the layout.
 * @param context - The file.
 * @returns graphty-element's `EngineVersions`.
 */
function engineOf(context: Context): JsonObject {
    return { element: String(context.generator.version), algorithms: "unknown", layout: "unknown" };
}

/**
 * One version 1 run as a results entry.
 * @param run - The version 1 run.
 * @param context - The file.
 * @param data - The data.
 * @param edgeRefs - The file's edges, by position.
 * @returns The entry.
 */
function resultEntry(
    run: JsonObject,
    context: Context,
    data: MigratedData,
    edgeRefs: readonly (EdgeRef | undefined)[],
): JsonObject {
    const { namespace, as } = runKey(String(run.id), run.derived === true);
    const nodes = isObject(run.nodes) ? run.nodes : {};
    const caveats = isObject(run.caveats) ? run.caveats : {};
    const seed = Number.isInteger(caveats.seed) ? caveats.seed : null;
    return {
        namespace,
        as,
        algorithm: run.algorithm,
        ...(isObject(run.params) ? { params: run.params } : {}),
        engine: engineOf(context),
        seed,
        ...(typeof run.durationMs === "number" && run.durationMs >= 0 ? { durationMs: run.durationMs } : {}),
        bindsTo: data.binding,
        fields: fieldsOf(run.fields),
        caveats: caveatsOf(caveats),
        ...(isObject(run.graph) ? { graph: run.graph } : {}),
        nodes: outputOf(nodes.columns, nodeRefs(nodes.ids, data)),
        edges: outputOf(isObject(run.edges) ? run.edges.columns : {}, edgeRefs),
    };
}

/**
 * The layout record (spec 4.5 `layout`): the layout in force and the positions the arrangement
 * holds for the nodes that are not pinned.
 * @param context - The file.
 * @param data - The data.
 * @param positions - The arrangement's positions.
 * @returns The record, or undefined when the file names no layout or holds no position.
 */
function layoutRecord(context: Context, data: MigratedData, positions: readonly Placed[]): JsonObject | undefined {
    const layout = layoutOf(context.members.get("graphty-session"));
    const free = positions.filter((each) => !each.pinned);
    if (layout === undefined || free.length === 0) {
        return undefined;
    }

    const { engine, ...rest } = layout;
    return {
        ...rest,
        // The layout that drew it; version 1 may name only the catalogue id, which a registered
        // engine name is read as.
        algorithm: typeof engine === "string" ? engine : rest.id,
        seed: null,
        engine: engineOf(context),
        bindsTo: data.binding,
        nodes: {
            refs: free.map((each) => each.node),
            columns: { x: free.map((each) => each.x), y: free.map((each) => each.y), z: free.map((each) => each.z) },
        },
    };
}

/**
 * The results section: each version 1 run's record and outputs, keyed by run id, and the layout
 * record.
 * @param runs - The version 1 runs.
 * @param context - The file.
 * @param data - The data.
 * @param layout - The layout record, if any.
 * @returns The section, or undefined when there is nothing to hold.
 */
function migrateResults(
    runs: readonly JsonObject[],
    context: Context,
    data: MigratedData,
    layout: JsonObject | undefined,
): JsonObject | undefined {
    if (runs.length === 0 && layout === undefined) {
        return undefined;
    }

    const links = context.members.get("graphty-data");
    const graph = isObject(links?.graph) ? links.graph : {};
    const edgeCount = Array.isArray(graph.links) ? graph.links.length : 0;
    const edgeRefs = Array.from({ length: edgeCount }, (_, at) => data.edgeAt(at));
    const out: JsonObject = {};
    for (const run of runs) {
        const { namespace, as } = runKey(String(run.id), run.derived === true);
        out[`${namespace}__${as}`] = resultEntry(run, context, data, edgeRefs);
    }

    return {
        ...header("results", context, { bindsTo: { data: data.dataId } }),
        runs: out,
        ...(layout === undefined ? {} : { layout }),
    };
}

// ---------------------------------------------------------------------------------------------
// notes (4.6)
// ---------------------------------------------------------------------------------------------

/**
 * A version 1 note target as a version 2 one. A target that cannot be bound is kept under a kind
 * no reader knows, so it reads unsupported and is written back (spec 4.6).
 * @param target - The version 1 target.
 * @param data - The data.
 * @param context - The file.
 * @returns The target.
 */
function noteTarget(target: JsonObject, data: MigratedData, context: Context): JsonObject {
    const runId = (id: unknown): string => {
        const { namespace, as } = runKey(String(id), context.derived.get(String(id)) ?? false);
        return `${namespace}__${as}`;
    };
    if (target.node !== undefined) {
        const node = data.nodeRef(target.node);
        return node === undefined ? { "version-1": target } : { node };
    }

    if (isObject(target.edge)) {
        const edge = edgeMemberRef(target.edge, data);
        return edge === undefined ? { "version-1": target } : { edge };
    }

    if (target.result !== undefined) {
        return { result: runId(target.result) };
    }

    if (isObject(target.item) && isObject(target.item.key)) {
        return { item: { result: runId(target.item.run ?? target.item.result), key: target.item.key } };
    }

    return renameSets(target, context);
}

/**
 * The notes section: version 1 notes, their targets as element references and run ids.
 * @param notes - The version 1 notes document.
 * @param context - The file.
 * @param data - The data.
 * @returns The section.
 */
function migrateNotes(notes: JsonObject, context: Context, data: MigratedData): JsonObject {
    return {
        ...header("notes", context, { bindsTo: { data: data.dataId } }),
        notes: objectsOf(notes.notes).map((note) => ({
            ...note,
            targets: objectsOf(note.targets).map((target) => noteTarget(target, data, context)),
            ...(Array.isArray(note.cites)
                ? {
                      cites: objectsOf(note.cites).map((cite) => {
                          const id = String(cite.run ?? cite.result);
                          const { namespace, as } = runKey(id, context.derived.get(id) ?? false);
                          return { result: `${namespace}__${as}` };
                      }),
                  }
                : {}),
        })),
    };
}

// ---------------------------------------------------------------------------------------------
// settings (4.4) and view (4.7) from the session member
// ---------------------------------------------------------------------------------------------

/** Config keys a settings section never holds (spec 4.4), or that the view holds. */
const NOT_SETTINGS = new Set(["author", "name", "startingRows", "editableBase", "viewRotation", "framing"]);

/** The `data` config keys the data section's mapping carries (migrationParts.ts `mappingOf`). */
const MAPPED_FIELDS = new Set([
    "data.knownFields.edgeIdPath",
    "data.knownFields.edgeWeightPath",
    "data.knownFields.timePath",
]);

/**
 * What a migration could not carry over, for a caller to tell the reader before the version 2
 * file replaces the version 1 one.
 * @param kind - The version 1 member.
 * @param pointer - Where in it.
 * @returns The problem.
 */
function leftOut(kind: string, pointer: string): DocumentProblem {
    return { code: "W_MEMBER_LEFT_OUT", params: { kind, pointer } };
}

/** Config keys whose value is one object, written whole. */
const OBJECT_SETTINGS = new Set(["background", "selectionStyle", "pinnedStyle", "layoutTransition"]);

/** The timeline playback members (spec 4.4). */
const PLAYBACK_MEMBERS = ["mode", "step", "missing", "outside", "timeZone", "ageFade", "results"];

/**
 * The settings section: the session's config written flat, and the timeline playback. No `data.`
 * key is a setting: the known fields the data's mapping carries are left out quietly, the rest
 * reported.
 * @param session - The session member.
 * @param context - The file.
 * @returns The section.
 */
function migrateSettings(session: JsonObject, context: Context): JsonObject {
    const settings: JsonObject = {};
    const flatten = (prefix: string, value: unknown): void => {
        if (isObject(value) && !OBJECT_SETTINGS.has(prefix)) {
            for (const [key, entry] of Object.entries(value)) {
                flatten(`${prefix}.${key}`, entry);
            }
        } else if (value === undefined) {
            return;
        } else if (prefix.startsWith("data.")) {
            if (!(
                context.data?.carried.has(prefix.slice("data.knownFields.".length)) === true &&
                MAPPED_FIELDS.has(prefix)
            )) {
                context.problems.push(leftOut("graphty-session", `/config/${prefix.replaceAll(".", "/")}`));
            }
        } else {
            settings[prefix] = value;
        }
    };
    for (const [key, value] of Object.entries(isObject(session.config) ? session.config : {})) {
        if (!NOT_SETTINGS.has(key)) {
            flatten(key, value);
        }
    }

    const visibility = isObject(session.visibility) ? session.visibility : {};
    const playback = isObject(visibility.playback) ? pick(visibility.playback, PLAYBACK_MEMBERS) : undefined;
    return { ...header("settings", context), settings, ...(playback === undefined ? {} : { playback }) };
}

/**
 * The layout in force, exactly version 1's `{ id, engine, options, dimension }`.
 * @param session - The session member, if any.
 * @returns The layout record, or undefined for none.
 */
function layoutOf(session: JsonObject | undefined): JsonObject | undefined {
    const layout = isObject(session?.layout) ? session.layout : undefined;
    if (layout === undefined || typeof layout.id !== "string" || layout.id === "") {
        return undefined;
    }

    return {
        id: layout.id,
        ...(typeof layout.engine === "string" && layout.engine !== "" ? { engine: layout.engine } : {}),
        dimension: layout.dimension === "2d" || layout.dimension === 2 ? 2 : 3,
        ...(isObject(layout.options) && Object.keys(layout.options).length > 0 ? { options: layout.options } : {}),
    };
}

/** A placed node of the arrangement member. */
interface Placed {
    readonly node: NodeRef;
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly pinned: boolean;
}

/**
 * The placed nodes of the arrangement member: positions decoded from base64 into plain numbers.
 * @param arrangement - The arrangement member.
 * @param data - The data.
 * @returns The placed nodes.
 */
function placedOf(arrangement: JsonObject | undefined, data: MigratedData): Placed[] {
    if (arrangement === undefined || !Array.isArray(arrangement.ids)) {
        return [];
    }

    const ids = arrangement.ids as unknown[];
    const [xs, ys, zs] = ["x", "y", "z"].map((axis) => decodeColumn(arrangement[axis], ids.length));
    const pins = new Set((Array.isArray(arrangement.pins) ? (arrangement.pins as unknown[]) : []).map(keyText));
    if (xs === undefined || ys === undefined || zs === undefined) {
        return [];
    }

    return ids.flatMap((id, at) => {
        const node = data.nodeRef(id);
        const [x, y, z] = [xs[at], ys[at], zs[at]];
        return node === undefined || typeof x !== "number" || typeof y !== "number" || typeof z !== "number"
            ? []
            : [{ node, x, y, z, pinned: pins.has(keyText(id)) }];
    });
}

/**
 * The view's visibility (spec 4.7): the filter in force, the time window (no `raw`), `showContext`,
 * every condition as one plain list and the hidden nodes, with element references. Filter steps
 * are not written, and are reported.
 * @param visibility - The session member's visibility.
 * @param context - The file.
 * @param data - The data.
 * @returns The visibility.
 */
function visibilityOf(visibility: JsonObject, context: Context, data: MigratedData): JsonObject {
    const conditions = (isObject(visibility.conditions) ? objectsOf(visibility.conditions.list) : []).map((condition) =>
        renameSets({ ...condition, rule: boundRule(condition.rule, data) }, context),
    );
    if (Array.isArray(visibility.steps) && visibility.steps.length > 0) {
        context.problems.push(leftOut("graphty-session", "/visibility/steps"));
    }

    const window =
        isObject(visibility.window) && typeof visibility.window.attribute === "string"
            ? (({ raw: _raw, ...rest }) => rest)(visibility.window)
            : undefined;
    const hidden = nodeRefs(visibility.hidden, data);
    return {
        filter: filterOf(visibility.filter, context),
        ...(window === undefined ? {} : { window }),
        ...(typeof visibility.showContext === "boolean" ? { showContext: visibility.showContext } : {}),
        ...(conditions.length === 0 ? {} : { conditions }),
        ...(hidden.length === 0 ? {} : { hidden }),
    };
}

/**
 * A version 1 filter in force as graph.filter's `{ on, where }` (spec 4.7 rule 4): one expression
 * leaf on nodes or edges. Any other filter has no such form, and is reported.
 * @param filter - The version 1 filter.
 * @param context - The file.
 * @returns The filter, or null.
 */
function filterOf(filter: unknown, context: Context): JsonObject | null {
    if (!isObject(filter)) {
        return null;
    }

    if ((filter.kind === "expression" || filter.kind === "edges") && typeof filter.where === "string") {
        return { on: filter.kind === "edges" ? "edges" : "nodes", where: filter.where };
    }

    context.problems.push(leftOut("graphty-session", "/visibility/filter"));
    return null;
}

/**
 * The view section: saved views, the selection, the pinned nodes, every set, the visibility,
 * hidden columns, the layer order, the layers that name elements, every run and the layout.
 * @param context - The file.
 * @param data - The data.
 * @param parts - What the style, sets, runs and arrangement placed here.
 * @param parts.layers - The layers that name elements.
 * @param parts.order - Every layer id, bottom first.
 * @param parts.sets - The sets.
 * @param parts.runs - The run records.
 * @param parts.placed - The arrangement's placed nodes.
 * @returns The section.
 */
function migrateView(
    context: Context,
    data: MigratedData,
    parts: { layers: JsonObject[]; order: string[]; sets: JsonObject[]; runs: JsonObject[]; placed: Placed[] },
): JsonObject {
    const session = context.members.get("graphty-session");
    const config = isObject(session?.config) ? session.config : undefined;
    const viewState = context.members.get("graphty-view-state");
    const selection = isObject(viewState?.selection) ? viewState.selection : undefined;
    const views = objectsOf(session?.views).flatMap((view) => {
        const camera = isObject(view.camera) ? cameraJson(view.camera) : undefined;
        return camera === undefined ? [] : [{ name: typeof view.name === "string" ? view.name : "", camera }];
    });
    const pinned = parts.placed
        .filter((each) => each.pinned)
        .map((each) => ({ node: each.node, position: { x: each.x, y: each.y, z: each.z } }));
    const columns =
        isObject(session?.columns) && Array.isArray(session.columns.hidden)
            ? (session.columns.hidden as unknown[])
            : [];
    const hiddenColumns = columns.flatMap((column) => {
        const at = typeof column === "string" ? column.indexOf(":") : -1;
        const kind = typeof column === "string" ? column.slice(0, at) : "";
        return (kind === "node" || kind === "edge") && at > 0 ? [{ kind, name: (column as string).slice(at + 1) }] : [];
    });
    const edgeAt = (position: unknown): EdgeRef[] => {
        const ref = typeof position === "number" ? data.edgeAt(position) : undefined;
        return ref === undefined ? [] : [ref];
    };
    const layout = layoutOf(session);
    return {
        ...header("view", context, { bindsTo: { data: data.dataId } }),
        ...(views.length === 0 ? {} : { views }),
        ...(selection === undefined
            ? {}
            : {
                  selection: {
                      nodes: nodeRefs(selection.nodes, data),
                      edges: (Array.isArray(selection.edges) ? (selection.edges as unknown[]) : []).flatMap(edgeAt),
                  },
              }),
        ...(pinned.length === 0 ? {} : { pinned }),
        ...(parts.sets.length === 0 ? {} : { sets: parts.sets }),
        ...(isObject(session?.visibility) ? { visibility: visibilityOf(session.visibility, context, data) } : {}),
        ...(config?.viewRotation === undefined ? {} : { viewRotation: config.viewRotation }),
        ...(config?.framing === undefined ? {} : { framing: config.framing }),
        ...(hiddenColumns.length === 0 ? {} : { hiddenColumns }),
        ...(parts.order.length === 0 ? {} : { order: parts.order }),
        ...(parts.layers.length === 0 ? {} : { layers: parts.layers }),
        ...(parts.runs.length === 0 ? {} : { runs: parts.runs }),
        ...(layout === undefined ? {} : { layout }),
    };
}

/**
 * A version 1 recipe document as a recipe section: recipe.md's commands, with `id` as `id`, and
 * every `algo.run` writing `style`. `recipeVersion` is dropped and reported. The snapshot
 * `session.recipe()` wrote holds no commands and gives none.
 * @param recipe - The version 1 recipe.
 * @param context - The file.
 * @returns The section, or undefined for a snapshot.
 */
function migrateRecipe1(recipe: JsonObject, context: Context): JsonObject | undefined {
    if (!Array.isArray(recipe.commands)) {
        return undefined;
    }

    const commands = objectsOf(recipe.commands).map((command) => {
        if (command.op === "algo.run") {
            return { ...command, style: command.style ?? true };
        }

        if (command.op === "layout.set") {
            const { dimension, ...rest } = command;
            return { ...rest, dimension: dimension === 2 || dimension === "2d" ? 2 : 3 };
        }

        return command;
    });
    return {
        ...header("recipe", context, identityOf(recipe, "recipeVersion", "graphty-recipe", context.problems)),
        ...(typeof recipe.namespace === "string" ? { namespace: recipe.namespace } : {}),
        commands,
    };
}

// ---------------------------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------------------------

/**
 * The members of a version 1 file by kind: the nine-member document's, a bare member, or the
 * kind-less style graphty-element 2.x wrote.
 * @param value - The parsed file.
 * @returns The members, or undefined for anything else.
 */
function membersOf(value: JsonObject): Map<string, JsonObject> | undefined {
    if (value.kind === "graphty-document" && value.version === 1 && Array.isArray(value.members)) {
        // The first member of each kind, as the version 1 reader takes it.
        const members = new Map<string, JsonObject>();
        for (const member of objectsOf(value.members)) {
            if (typeof member.kind === "string" && !members.has(member.kind)) {
                members.set(member.kind, member);
            }
        }

        return members;
    }

    if (
        typeof value.kind === "string" &&
        MEMBER_KINDS.has(value.kind) &&
        (value.version === 1 || value.kind === "graphty-sources")
    ) {
        return new Map([[value.kind, value]]);
    }

    return value.kind === undefined && value.version === 1 && Array.isArray(value.layers)
        ? new Map([["graphty-style", value]])
        : undefined;
}

/**
 * The members of a version 1 document no section carries: one of a kind this migration does not
 * read (an extension's), a second member of a kind, and an assets member with no style beside it.
 * @param value - The parsed file.
 * @param members - The members migrated, by kind.
 * @returns One problem per member left out.
 */
function membersLeftOut(value: JsonObject, members: ReadonlyMap<string, JsonObject>): DocumentProblem[] {
    const out: DocumentProblem[] = [];
    if (Array.isArray(value.members)) {
        (value.members as unknown[]).forEach((member, at) => {
            const kind = isObject(member) && typeof member.kind === "string" ? member.kind : "";
            if (!MEMBER_KINDS.has(kind) || members.get(kind) !== member) {
                out.push(leftOut(kind, `/members/${String(at)}`));
            }
        });
    }

    if (members.has("graphty-assets") && !members.has("graphty-style")) {
        out.push(leftOut("graphty-assets", ""));
    }

    return out;
}

/**
 * The software that wrote the file, for every section's `generator`: the version 1 file's own, or
 * this graphty-element when it names none.
 * @param value - The parsed file.
 * @returns The generator.
 */
function generatorOf(value: JsonObject): JsonObject {
    const { generator } = value;
    return isObject(generator) && typeof generator.name === "string" && typeof generator.version === "string"
        ? { name: generator.name, version: generator.version }
        : { name: "graphty-element", version: ENGINE_VERSIONS.element };
}

/**
 * Every section a version 1 file's members give.
 * @param members - The members by kind.
 * @param generator - The generator.
 * @param problems - Collects what could not be carried over.
 * @returns The sections, in file order.
 */
function sectionsOf(
    members: ReadonlyMap<string, JsonObject>,
    generator: JsonObject,
    problems: DocumentProblem[],
): Partial<Record<DocumentSection, JsonObject>> {
    const session = members.get("graphty-session");
    const dataMember = members.get("graphty-data");
    const data =
        dataMember === undefined
            ? undefined
            : migrateData({ data: dataMember, session, sources: members.get("graphty-sources"), generator, problems });
    const runs = objectsOf(members.get("graphty-results")?.runs);
    const context: Context = {
        members,
        generator,
        data,
        derived: new Map(runs.map((run) => [String(run.id), run.derived === true])),
        sets: new Map(objectsOf(session?.sets).flatMap((set) => (typeof set.id === "string" ? [[set.id, set]] : []))),
        setId: (id) => {
            const minted = ulidOf(`set\u0000${id}`);
            return SET_ID.test(id) ? id : `set_${minted}`;
        },
        problems,
    };

    const sections: Partial<Record<DocumentSection, JsonObject>> = {};
    if (data !== undefined) {
        sections.data = data.section;
    }

    const style = members.get("graphty-style");
    const styled = style === undefined ? undefined : migrateStyle(style, context);
    sections.style = styled?.section;

    // Opening restores the session: every set, run and the layout go to the view, never to a
    // recipe, which applies only to new data. Only a version 1 recipe document becomes one.
    const recipe1 = members.get("graphty-recipe");
    sections.recipe = recipe1 === undefined ? undefined : migrateRecipe1(recipe1, context);
    if (recipe1 !== undefined && sections.style === undefined && isObject(recipe1.styles)) {
        sections.style = migrateStyle(recipe1.styles, context).section;
    }

    sections.settings = session === undefined ? undefined : migrateSettings(session, context);
    if (data !== undefined) {
        const placed = placedOf(members.get("graphty-arrangement"), data);
        sections.results = migrateResults(runs, context, data, layoutRecord(context, data, placed));
        const notes = members.get("graphty-notes");
        sections.notes = notes === undefined ? undefined : migrateNotes(notes, context, data);
        const viewed = ["graphty-session", "graphty-arrangement", "graphty-view-state"].some((kind) =>
            members.has(kind),
        );
        sections.view = viewed
            ? migrateView(context, data, {
                  layers: styled?.viewLayers ?? [],
                  order: styled?.order ?? [],
                  sets: migrateSets(context, data),
                  runs: migrateRuns(runs, context, data),
                  placed,
              })
            : undefined;
    }

    return sections;
}

/**
 * A version 1 file as a version 2 full file: the nine-member `graphty-document` version 1, a bare
 * version 1 member, or the kind-less style graphty-element 2.x wrote.
 * @param value - The parsed file.
 * @param problems - Collects `W_SECTION_UPGRADED` and what could not be carried over.
 * @returns The version 2 full file, or undefined to read the file as before.
 */
export function migrateDocument1(value: JsonObject, problems: DocumentProblem[]): JsonObject | undefined {
    const members = membersOf(value);
    if (members === undefined) {
        return undefined;
    }

    const found: DocumentProblem[] = [...membersLeftOut(value, members)];
    const sections = sectionsOf(members, generatorOf(value), found);
    const written = ORDER.filter((section) => sections[section] !== undefined);
    if (written.length === 0) {
        return undefined;
    }

    problems.push(
        ...written.map((section): DocumentProblem => ({
            code: "W_SECTION_UPGRADED",
            params: { section, from: 1, to: VERSIONS[section] },
        })),
        ...found,
    );
    const session = members.get("graphty-session");
    return {
        $schema: "https://graphty.app/schema/documents/graphty-document/v2.json",
        kind: "graphty-document",
        version: 2,
        ...(typeof session?.id === "string" && session.id !== "" ? { id: session.id } : {}),
        ...(typeof value.name === "string" ? { name: value.name } : {}),
        generator: generatorOf(value),
        sections: Object.fromEntries(written.map((section) => [section, sections[section]])),
        ...(isObject(value.extensions) && value.kind === "graphty-document" ? { extensions: value.extensions } : {}),
    };
}

/**
 * A section of a version 2 file written at an older version than its codec reads, upgraded: a
 * version 1 data, style or recipe document. Notes, results and view at version 1 need the data's
 * own version 1 rows to bind, and are held.
 * @param section - The section.
 * @param value - The section as read.
 * @param problems - Collects `W_SECTION_UPGRADED`.
 * @returns The upgraded section, or undefined to hold it as it is.
 */
export function migrateSection(
    section: DocumentSection,
    value: JsonObject,
    problems: DocumentProblem[],
): JsonObject | undefined {
    if (value.version !== 1 || !["data", "style", "recipe"].includes(section)) {
        return undefined;
    }

    const found: DocumentProblem[] = [];
    const upgraded = sectionsOf(new Map([[`graphty-${section}`, value]]), generatorOf(value), found)[section];
    if (upgraded === undefined) {
        return undefined;
    }

    problems.push({ code: "W_SECTION_UPGRADED", params: { section, from: 1, to: VERSIONS[section] } }, ...found);
    return upgraded;
}
