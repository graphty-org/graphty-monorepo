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
 * - Spaces. Every node is keyed in the one `source:<id>` space of the `derived` source the version
 *   1 graph becomes (data-store-options.md 4.8). `kindIds`, `sourceKind` and `targetKind` give
 *   types (a rule on the `kind` column) but not spaces, and `kind:` respellings stay in the key:
 *   `kindIds: "scoped"` respells exactly the ids that appear under two kinds, so stripping them
 *   would make those edge ends ambiguous, and a source's `sourceSpace` is one space for every row.
 *   `idPrefix` stays in the key, since a version 1 file keeps only the merged rows, never each
 *   load's own. Closing it needs each load's rows, which a version 1 file does not keep.
 * - Join steps. `joinOn`, `keep`, `existing` and `columnPrefix` are kept verbatim in the derived
 *   source's `metadata`, not written as join steps: the merged rows already hold their result, a
 *   step may only name a source of the data section, and the combine step spellings are not
 *   settled (version-2.md, "Open items"). Closing it needs those spellings.
 * - Renames and conversions. The copy holds the working names and converted values already, so
 *   `mapping.renamed` stays empty and a conversion reaches a type's schema only when the loads used
 *   kinds; both are kept verbatim in `metadata`. So are the load facts, which `issues` has no
 *   member for. A declared measurement of a column no type carries is dropped.
 * - Direction. A version 1 graph whose direction nothing settled is written as directed.
 * - Results. `engine` is the file's generator (the release that saved the run, not necessarily the
 *   one that computed it); `shape`, `measured` and a run's display name in the recipe are dropped.
 * - Runs. Whether a run's options name a node is not checked (that needs the catalog), so such a
 *   run lands in the recipe. A run over an inline rule set is left out. Every run writes `style:
 *   false`: the saved layers are the file's look.
 * - Visibility. The filter steps and the keep and exclude conditions have no view member and are
 *   left out; `windowRaw` is dropped. Pins with no placed position are left out.
 * - Style. Edges a version 1 `ids` selector named (session edge ids) are dropped; built-in palettes
 *   are not carried (that needs the catalog); the style tree is not carried. A set id the schema
 *   rejects is written as read.
 * - Cameras. A saved view's camera has no `fov` in version 1 and takes the view codec's default.
 * - Bare members. A version 1 notes, results, arrangement, view-state, sources or assets member
 *   alone has no data to bind to and is not migrated; neither is a version 1 notes, results or
 *   view section met inside a version 2 file. A version 1 recipe snapshot (`session.recipe()`)
 *   keeps only its style.
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

/** A SemVer 2.0.0 string (common schema `semver`). */
const SEMVER =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;

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
    readonly problems: DocumentProblem[];
}

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

/**
 * A section's header members, in the order HEADER_MEMBERS gives, the empty ones left out.
 * @param section - The section.
 * @param context - For the generator.
 * @param own - The `id`, `revision`, `name`, `description`, `dependencies`, `bindsTo` and `extensions`.
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
        ...pick("id", "revision", "name", "description"),
        generator: context.generator,
        ...pick("dependencies", "bindsTo", "extensions"),
    };
}

/**
 * The header members a version 1 style or recipe names itself with.
 * @param value - The version 1 document.
 * @param versionKey - `styleVersion` or `recipeVersion`.
 * @returns `id`, `revision`, `name` and `description`, as present.
 */
function identityOf(value: JsonObject, versionKey: string): JsonObject {
    const text = (name: string): JsonObject =>
        typeof value[name] === "string" && value[name] !== "" ? { [name]: value[name] } : {};
    const revision = value[versionKey];
    return {
        ...text("id"),
        ...(typeof revision === "string" && SEMVER.test(revision) ? { revision } : {}),
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
// style (spec 4.2) and the view's layers (4.7 rule 3)
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
 * A version 1 style document, split: the layers that name no element into a style section, the
 * others into the view's `layers` with element references.
 * @param style - The version 1 style document.
 * @param context - The file.
 * @returns The style section, and the view's layers.
 */
function migrateStyle(style: JsonObject, context: Context): { section: JsonObject; viewLayers: JsonObject[] } {
    const { data, sets, problems } = context;
    const used = new Set<string>();
    const asName = (id: string): string => runKey(id, context.derived.get(id) ?? false).as;
    const asRunId = (id: string): string => {
        const { namespace, as } = runKey(id, context.derived.get(id) ?? false);
        return `${namespace}__${as}`;
    };
    const layers: JsonObject[] = [];
    const viewLayers: JsonObject[] = [];
    const results = new Set<string>();
    let below = "bottom";
    objectsOf(style.layers).forEach((layer, at) => {
        let id = typeof layer.id === "string" && layer.id !== "" ? layer.id : `layer-${String(at + 1)}`;
        while (used.has(id)) {
            id = `${id}-${String(at + 1)}`;
        }

        used.add(id);
        const { id: _id, name, ...rest } = layer;
        const named = layerNames(layer, sets);
        const rename = named ? asRunId : asName;
        const source = isObject(rest.source) && typeof rest.source.runId === "string" ? rest.source : undefined;
        const v2: JsonObject = {
            id,
            name: typeof name === "string" ? name : "",
            ...renameRuns(rest, rename),
            ...(source === undefined ? {} : { source: { ...source, runId: rename(String(source.runId)) } }),
        };
        if (!named) {
            for (const match of JSON.stringify([v2.selector, v2.encode]).matchAll(/results\.([a-z][a-z0-9_]*)/g)) {
                results.add(match[1]);
            }

            layers.push(v2);
            below = id;
            return;
        }

        if (data === undefined) {
            problems.push({
                code: "W_ELEMENT_NAMING_LEFT_OUT",
                params: { section: "style", pointer: `/layers/${String(at)}` },
            });
            return;
        }

        viewLayers.push({ ...v2, selector: boundSelector(v2.selector, data), after: below });
    });

    const session = context.members.get("graphty-session");
    const valueLabels = objectsOf(session?.valueLabels).flatMap((label) =>
        typeof label.path === "string" && label.path.startsWith("data.") && typeof label.label === "string"
            ? [{ column: label.path.slice("data.".length), value: label.value, label: label.label }]
            : [],
    );
    const palettes = objectsOf(style.palettes).map((palette) => pick(palette, PALETTE_MEMBERS));
    const shaders = objectsOf(style.shaders).flatMap((shader) =>
        typeof shader.id === "string" && typeof shader.text === "string" ? [{ id: shader.id, text: shader.text }] : [],
    );
    const assets = objectsOf(context.members.get("graphty-assets")?.assets).flatMap((asset) =>
        typeof asset.id === "string" && typeof asset.sha256 === "string" ? [pick(asset, ASSET_MEMBERS)] : [],
    );
    const identity = identityOf(style, "styleVersion");
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
    return { section, viewLayers };
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
// Sets and runs: the recipe (4.3) or the view (4.7)
// ---------------------------------------------------------------------------------------------

/**
 * The session's sets, placed: rule sets naming no element as `set.define` commands, the rest as
 * view sets with element references.
 * @param context - The file.
 * @returns The recipe commands and the view sets.
 */
function migrateSets(context: Context): { commands: JsonObject[]; view: JsonObject[] } {
    const { data, sets } = context;
    const commands: JsonObject[] = [];
    const view: JsonObject[] = [];
    for (const [id, set] of sets) {
        const definition = isObject(set.definition) ? set.definition : {};
        const name = typeof set.name === "string" ? set.name : "";
        const reading = typeof definition.reading === "string" ? definition.reading : "induced";
        if (definition.kind === "rule" && !ruleNames(definition.where, sets, new Set([id]))) {
            commands.push({ op: "set.define", id, name, where: definition.where, reading });
        } else if (data !== undefined) {
            view.push(viewSet(id, name, definition, data, reading));
        }
    }

    return { commands, view };
}

/**
 * A set that names elements, as the view holds it.
 * @param id - The set's id.
 * @param name - Its name.
 * @param definition - Its version 1 definition.
 * @param data - The data.
 * @param reading - Its edge reading.
 * @returns The view set.
 */
function viewSet(id: string, name: string, definition: JsonObject, data: MigratedData, reading: string): JsonObject {
    const edges = Array.isArray(definition.edges) ? (definition.edges as unknown[]) : undefined;
    switch (definition.kind) {
        case "fixed":
            return {
                id,
                name,
                kind: "fixed",
                nodes: nodeRefs(definition.nodes, data),
                ...(edges === undefined ? {} : { edges: edges.flatMap((edge) => edgeMemberRef(edge, data) ?? []) }),
                reading: reading === "listed" ? "listed" : "induced",
            };
        case "path":
            return {
                id,
                name,
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
            return { id, name, kind: "rule", where: boundRule(definition.where, data), reading };
    }
}

/** A version 1 run's command members an `algo.run` command keeps. */
const RUN_MEMBERS = ["params", "scope", "seed", "sample", "exact", "recordedCapSeconds", "recordedPrecision"];

/**
 * Whether a run's scope is one a recipe holds (recipe.md, "Writing a recipe from a session").
 * @param scope - The scope.
 * @param sets - The sets, by id.
 * @returns True when it is.
 */
function recipeScope(scope: unknown, sets: ReadonlyMap<string, JsonObject>): boolean {
    if (scope === undefined || scope === "graph" || scope === "largest-component") {
        return true;
    }

    return (
        isObject(scope) &&
        (typeof scope.where === "string" || (typeof scope.set === "string" && !scopeNames(scope, sets, new Set())))
    );
}

/**
 * A version 1 run's command as an `algo.run` command or a view run record, both with `style:
 * false` (the saved layers are the file's look).
 * @param run - The version 1 run.
 * @param as - Its name.
 * @returns The command members.
 */
function runCommand(run: JsonObject, as: string): JsonObject {
    const kept = pick(run, RUN_MEMBERS);
    const { params, scope, seed, ...rest } = kept;
    return {
        algorithm: run.algorithm,
        as,
        ...(isObject(params) && Object.keys(params).length > 0 ? { params } : {}),
        ...(scope === undefined || scope === "graph" ? {} : { scope }),
        ...(Number.isInteger(seed) && (seed as number) >= 0 ? { seed } : {}),
        ...rest,
        style: false,
    };
}

/**
 * The version 1 runs, placed: the runs a recipe can hold as `algo.run` commands, under one
 * namespace, and the rest as view run records.
 * @param runs - The version 1 runs.
 * @param context - The file.
 * @returns The namespace, the commands and the view runs.
 */
function migrateRuns(
    runs: readonly JsonObject[],
    context: Context,
): { namespace: string | undefined; commands: JsonObject[]; view: JsonObject } {
    let namespace: string | undefined;
    const commands: JsonObject[] = [];
    const view: JsonObject = {};
    for (const run of runs.filter((each) => typeof each.id === "string" && typeof each.algorithm === "string")) {
        const key = runKey(String(run.id), run.derived === true);
        const command = runCommand(run, key.as);
        if (recipeScope(run.scope, context.sets) && (namespace === undefined || namespace === key.namespace)) {
            ({ namespace } = key);
            commands.push({ op: "algo.run", ...command });
        } else if (context.data !== undefined) {
            const { as: _as, scope, ...rest } = command;
            view[`${key.namespace}__${key.as}`] = {
                namespace: key.namespace,
                as: key.as,
                ...(typeof run.name === "string" ? { name: run.name } : {}),
                ...rest,
                scope: typeof scope === "string" ? scope : (boundScope(scope ?? "graph", context.data) as JsonObject),
            };
        }
    }

    return { namespace, commands, view };
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
 * @returns The fields with a name, a type and a node, edge or graph domain.
 */
function fieldsOf(fields: unknown): JsonObject[] {
    return objectsOf(fields).flatMap((field) =>
        typeof field.name === "string" &&
        typeof field.type === "string" &&
        ["node", "edge", "graph"].includes(String(field.kind))
            ? [{ name: field.name, domain: field.kind, type: field.type }]
            : [],
    );
}

/**
 * One version 1 run as a results entry.
 * @param run - The version 1 run.
 * @param name - Its namespace and `as`.
 * @param name.namespace - The namespace.
 * @param name.as - The name.
 * @param context - The file.
 * @param data - The data.
 * @param edgeRefs - The file's edges, by position.
 * @returns The entry.
 */
function resultEntry(
    run: JsonObject,
    name: { namespace: string; as: string },
    context: Context,
    data: MigratedData,
    edgeRefs: readonly (EdgeRef | undefined)[],
): JsonObject {
    const { namespace, as } = name;
    const nodes = isObject(run.nodes) ? run.nodes : {};
    const caveats = isObject(run.caveats) ? run.caveats : {};
    const seed = Number.isInteger(caveats.seed) ? caveats.seed : null;
    return {
        namespace,
        as,
        algorithm: run.algorithm,
        ...(isObject(run.params) ? { params: run.params } : {}),
        engine: { name: String(context.generator.name), version: String(context.generator.version) },
        seed,
        ...(typeof run.durationMs === "number" && run.durationMs >= 0 ? { durationMs: run.durationMs } : {}),
        fields: fieldsOf(run.fields),
        caveats,
        ...(isObject(run.graph) ? { graph: run.graph } : {}),
        nodes: outputOf(nodes.columns, nodeRefs(nodes.ids, data)),
        edges: outputOf(isObject(run.edges) ? run.edges.columns : {}, edgeRefs),
    };
}

/**
 * The results section: each version 1 run's record and outputs, keyed by run id.
 * @param runs - The version 1 runs.
 * @param context - The file.
 * @param data - The data.
 * @returns The section.
 */
function migrateResults(runs: readonly JsonObject[], context: Context, data: MigratedData): JsonObject {
    const links = context.members.get("graphty-data");
    const graph = isObject(links?.graph) ? links.graph : {};
    const edgeCount = Array.isArray(graph.links) ? graph.links.length : 0;
    const edgeRefs = Array.from({ length: edgeCount }, (_, at) => data.edgeAt(at));
    const out: JsonObject = {};
    for (const run of runs.filter((each) => typeof each.id === "string" && typeof each.algorithm === "string")) {
        const { namespace, as } = runKey(String(run.id), run.derived === true);
        out[`${namespace}__${as}`] = resultEntry(run, { namespace, as }, context, data, edgeRefs);
    }

    return {
        ...header("results", context, { bindsTo: { data: data.dataId, ...data.binding } }),
        runs: out,
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
 * @param runId - A version 1 run id's version 2 id.
 * @returns The target.
 */
function noteTarget(target: JsonObject, data: MigratedData, runId: (id: unknown) => string): JsonObject {
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

    return target;
}

/**
 * The notes section: version 1 notes, their targets as element references and run ids.
 * @param notes - The version 1 notes document.
 * @param context - The file.
 * @param data - The data.
 * @returns The section.
 */
function migrateNotes(notes: JsonObject, context: Context, data: MigratedData): JsonObject {
    const runId = (id: unknown): string => {
        const { namespace, as } = runKey(String(id), context.derived.get(String(id)) ?? false);
        return `${namespace}__${as}`;
    };
    return {
        ...header("notes", context, { bindsTo: { data: data.dataId } }),
        notes: objectsOf(notes.notes).map((note) => ({
            ...note,
            targets: objectsOf(note.targets).map((target) => noteTarget(target, data, runId)),
            ...(Array.isArray(note.cites)
                ? { cites: objectsOf(note.cites).map((cite) => ({ result: runId(cite.run ?? cite.result) })) }
                : {}),
        })),
    };
}

// ---------------------------------------------------------------------------------------------
// settings (4.4), recipe (4.3) and view (4.7) from the session member
// ---------------------------------------------------------------------------------------------

/** Config keys a settings section never holds (spec 4.4 rule 1), or that the data section holds. */
const NOT_SETTINGS = new Set(["data", "author", "name", "startingRows", "editableBase", "viewRotation", "framing"]);

/** Config keys whose value is one object, written whole. */
const OBJECT_SETTINGS = new Set(["background", "selectionStyle", "pinnedStyle", "layoutTransition"]);

/** The timeline playback members (spec 4.4 rule 2). */
const PLAYBACK_MEMBERS = ["mode", "step", "missing", "outside", "timeZone", "ageFade", "results"];

/**
 * The settings section: the session's config written flat, and the timeline playback.
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
        } else if (value !== undefined) {
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
 * The recipe section: the rule sets naming no element, the runs a recipe holds, and the layout.
 * @param session - The session member, if any.
 * @param context - The file.
 * @param parts - The set commands and the runs.
 * @param parts.sets - The `set.define` commands.
 * @param parts.runs - The placed runs.
 * @returns The section, or undefined when there is nothing to hold.
 */
function migrateRecipe(
    session: JsonObject | undefined,
    context: Context,
    parts: { sets: JsonObject[]; runs: ReturnType<typeof migrateRuns> },
): JsonObject | undefined {
    const layout = isObject(session?.layout) ? session.layout : undefined;
    const layoutSet =
        layout === undefined || typeof layout.id !== "string"
            ? []
            : [
                  {
                      op: "layout.set",
                      id: layout.id,
                      ...(typeof layout.engine === "string" ? { engine: layout.engine } : {}),
                      dimension: layout.dimension === "2d" ? 2 : 3,
                      ...(isObject(layout.options) && Object.keys(layout.options).length > 0
                          ? { options: layout.options }
                          : {}),
                  },
              ];
    const commands = [...parts.sets, ...parts.runs.commands, ...layoutSet];
    if (commands.length === 0) {
        return undefined;
    }

    return {
        ...header("recipe", context),
        ...(parts.runs.namespace === undefined ? {} : { namespace: parts.runs.namespace }),
        commands,
    };
}

/**
 * The placed nodes of the arrangement member: positions decoded from base64 into plain numbers.
 * @param arrangement - The arrangement member.
 * @param data - The data.
 * @returns The placed entries.
 */
function placedOf(arrangement: JsonObject | undefined, data: MigratedData): JsonObject[] {
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
        const position = [xs[at], ys[at], zs[at]];
        return node === undefined || !position.every((value) => typeof value === "number")
            ? []
            : [{ node, position, ...(pins.has(keyText(id)) ? { pinned: true } : {}) }];
    });
}

/**
 * The view's visibility: the live filter, the time window, `showContext`, the select conditions
 * and the hidden nodes, with element references.
 * @param visibility - The session member's visibility.
 * @param data - The data.
 * @returns The visibility.
 */
function visibilityOf(visibility: JsonObject, data: MigratedData): JsonObject {
    const conditions = isObject(visibility.conditions) ? objectsOf(visibility.conditions.list) : [];
    const select = conditions.filter((each) => each.effect === "select").map((each) => boundRule(each.rule, data));
    const window =
        isObject(visibility.window) && typeof visibility.window.attribute === "string" ? visibility.window : undefined;
    const hidden = nodeRefs(visibility.hidden, data);
    return {
        filter: isObject(visibility.filter) ? boundRule(visibility.filter, data) : null,
        ...(window === undefined ? {} : { window }),
        ...(typeof visibility.showContext === "boolean" ? { showContext: visibility.showContext } : {}),
        ...(select.length === 0 ? {} : { select }),
        ...(hidden.length === 0 ? {} : { hidden }),
    };
}

/**
 * The view section: saved views, the selection, placed positions and pins, the sets and layers
 * that name elements, the visibility, hidden columns and the runs a recipe cannot hold.
 * @param context - The file.
 * @param data - The data.
 * @param parts - What the style, sets and runs placed here.
 * @param parts.layers - The layers that name elements.
 * @param parts.sets - The sets that name elements.
 * @param parts.runs - The run records.
 * @returns The section.
 */
function migrateView(
    context: Context,
    data: MigratedData,
    parts: { layers: JsonObject[]; sets: JsonObject[]; runs: JsonObject },
): JsonObject {
    const session = context.members.get("graphty-session");
    const viewState = context.members.get("graphty-view-state");
    const selection = isObject(viewState?.selection) ? viewState.selection : undefined;
    const views = objectsOf(session?.views).flatMap((view) => {
        const camera = isObject(view.camera) ? cameraJson(view.camera) : undefined;
        return camera === undefined ? [] : [{ name: typeof view.name === "string" ? view.name : "", camera }];
    });
    const placed = placedOf(context.members.get("graphty-arrangement"), data);
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
        ...(placed.length === 0 ? {} : { placed }),
        ...(parts.sets.length === 0 ? {} : { sets: parts.sets }),
        ...(isObject(session?.visibility) ? { visibility: visibilityOf(session.visibility, data) } : {}),
        ...(hiddenColumns.length === 0 ? {} : { hiddenColumns }),
        ...(parts.layers.length === 0 ? {} : { layers: parts.layers }),
        ...(Object.keys(parts.runs).length === 0 ? {} : { runs: parts.runs }),
    };
}

/**
 * A version 1 recipe document as a recipe section: recipe.md's commands, with `id` and
 * `recipeVersion` as `id` and `revision`, and every `algo.run` writing `style`. The snapshot
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
        ...header("recipe", context, identityOf(recipe, "recipeVersion")),
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
        return new Map(
            objectsOf(value.members).flatMap((member) =>
                typeof member.kind === "string" ? [[member.kind, member]] : [],
            ),
        );
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
            : migrateData({ data: dataMember, session, sources: members.get("graphty-sources"), generator });
    const runs = objectsOf(members.get("graphty-results")?.runs);
    const context: Context = {
        members,
        generator,
        data,
        derived: new Map(runs.map((run) => [String(run.id), run.derived === true])),
        sets: new Map(objectsOf(session?.sets).flatMap((set) => (typeof set.id === "string" ? [[set.id, set]] : []))),
        problems,
    };

    const sections: Partial<Record<DocumentSection, JsonObject>> = {};
    if (data !== undefined) {
        sections.data = data.section;
    }

    const style = members.get("graphty-style");
    const styled = style === undefined ? undefined : migrateStyle(style, context);
    sections.style = styled?.section;

    const sets = migrateSets(context);
    const placedRuns = migrateRuns(runs, context);
    const recipe1 = members.get("graphty-recipe");
    sections.recipe =
        recipe1 === undefined
            ? migrateRecipe(session, context, { sets: sets.commands, runs: placedRuns })
            : migrateRecipe1(recipe1, context);
    if (recipe1 !== undefined && sections.style === undefined && isObject(recipe1.styles)) {
        sections.style = migrateStyle(recipe1.styles, context).section;
    }

    sections.settings = session === undefined ? undefined : migrateSettings(session, context);
    if (data !== undefined) {
        sections.results = runs.length === 0 ? undefined : migrateResults(runs, context, data);
        const notes = members.get("graphty-notes");
        sections.notes = notes === undefined ? undefined : migrateNotes(notes, context, data);
        const viewed = ["graphty-session", "graphty-arrangement", "graphty-view-state"].some((kind) =>
            members.has(kind),
        );
        sections.view = viewed
            ? migrateView(context, data, { layers: styled?.viewLayers ?? [], sets: sets.view, runs: placedRuns.view })
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

    const found: DocumentProblem[] = [];
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
