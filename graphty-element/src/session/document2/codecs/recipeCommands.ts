/**
 * @file The recipe commands of version 2 (spec 4.3) and their mapping to and from today's session
 * state: which members each command knows, which filter steps are exact `graph.filter` commands,
 * which rules and scopes name elements, and the `results.<as>` rewriting between a recipe's run
 * names and the session's run ids. Experimental (`save-files-v2`).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import { loadSetDefinition } from "../../../catalog/sets/parse";
import type { Measurement, RuleTree, Scope } from "../../../catalog/types";
import { expressionPaths, renamePaths, renameRunInPath, renameRunPaths } from "../../styles/predicate";
import { ignorableOf, isExtensions } from "../framing";
import type { JsonObject } from "../types";

/**
 * What every command may carry besides its own members (spec 4.3, 10): `narrows` (only `false`;
 * a reader that knows the op ignores it), and the must-understand slots `extensions` and `ignorable`.
 */
const COMMON_COMMAND_MEMBERS = ["narrows", "extensions", "ignorable"] as const;

/** The members each command graphty-element knows (spec 4.3); a command's members are closed. */
const OWN_COMMAND_MEMBERS: Readonly<Record<string, readonly string[]>> = {
    "graph.filter": ["op", "where", "on", "dropIsolated", "description"],
    "algo.run": [
        "op",
        "algorithm",
        "as",
        "params",
        "scope",
        "seed",
        "sample",
        "exact",
        "recordedCapSeconds",
        "recordedPrecision",
        "style",
        "description",
    ],
    "layout.set": ["op", "id", "algorithm", "dimension", "options", "description"],
    "set.define": ["op", "id", "name", "where", "reading", "description"],
};

/** Every member each command graphty-element knows may carry, its own and the common ones. */
export const COMMAND_MEMBERS: Readonly<Record<string, readonly string[]>> = Object.freeze(
    Object.fromEntries(
        Object.entries(OWN_COMMAND_MEMBERS).map(([op, members]) => [op, [...members, ...COMMON_COMMAND_MEMBERS]]),
    ),
);

/** The members of each object form of an `algo.run` scope; the scope is closed. */
const SCOPE_FORMS: readonly (readonly string[])[] = [["where", "on"], ["types"], ["set"]];

/** The parts of a run's `style` object this reader passes on; the rest are dropped (spec 10). */
export const STYLE_PARTS: readonly string[] = ["size", "name", "groups", "groupPalettes"];

/** The `as` and namespace patterns of the common schema. */
const RUN_NAME = /^[a-z][a-z0-9_]*$/;
const NAMESPACE = /^[a-z][a-z0-9_]{0,31}$/;

/**
 * Whether a value is a plain JSON object.
 * @param value - The value.
 * @returns True for a non-null, non-array object.
 */
export function isObject(value: unknown): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A closed object's members this reader does not know (spec 10, "Must-understand members"). */
export interface UnknownMembers {
    /** The first must-understand one: not named by `ignorable`, or a malformed slot. */
    readonly unknown?: string;
    /** The ones `ignorable` names, ignored and kept. */
    readonly ignored: readonly string[];
}

/**
 * The members of a closed object outside a known list. The object may also carry `extensions`
 * and `ignorable`; a malformed one is itself an unknown member.
 * @param value - The object.
 * @param known - The members it may hold besides the two slots.
 * @returns The first must-understand member, if any, and the ignored ones.
 */
export function membersOf(value: JsonObject, known: readonly string[]): UnknownMembers {
    const listed = ignorableOf(value.ignorable);
    const ignored: string[] = [];
    let unknown: string | undefined;
    for (const member of Object.keys(value)) {
        if (member === "extensions" || member === "ignorable") {
            const wellFormed = member === "extensions" ? isExtensions(value.extensions) : listed !== undefined;
            unknown ??= wellFormed ? undefined : member;
            continue;
        }

        if (known.includes(member)) {
            continue;
        }

        if (listed?.has(member) === true) {
            ignored.push(member);
        } else {
            unknown ??= member;
        }
    }

    return { ...(unknown === undefined ? {} : { unknown }), ignored };
}

/**
 * The members of an `algo.run` scope object outside the form its first member picks.
 * @param scope - The scope object.
 * @returns The first must-understand member, if any, and the ignored ones.
 */
export function scopeMembersOf(scope: JsonObject): UnknownMembers {
    const form = SCOPE_FORMS.find((members) => members.some((member) => member in scope)) ?? [];
    return membersOf(scope, form);
}

/**
 * Whether a name is a valid `as` (common schema `runName`).
 * @param name - The name.
 * @returns True when valid.
 */
export function isRunName(name: unknown): name is string {
    return typeof name === "string" && name.length <= 64 && RUN_NAME.test(name) && !name.includes("__");
}

/**
 * Whether a name is a valid recipe namespace (common schema `namespace`).
 * @param name - The name.
 * @returns True when valid.
 */
export function isNamespace(name: unknown): name is string {
    return typeof name === "string" && NAMESPACE.test(name) && !name.includes("__") && !name.endsWith("_");
}

/**
 * A text made a valid `as` (recipe.md, "Recording" rule 4): lower-cased, each run of other
 * characters one `_`, trimmed, `r_` in front when it would not start with a letter, at most 60.
 * @param text - The text.
 * @returns The name.
 */
export function asName(text: string): string {
    let name = trimUnderscores(text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_"));
    if (!/^[a-z]/.test(name)) {
        name = `r_${name}`;
    }

    return trimUnderscores(name.slice(0, 60));
}

/**
 * A text without the underscores it starts and ends with.
 * @param text - The text.
 * @returns The text trimmed.
 */
function trimUnderscores(text: string): string {
    let start = 0;
    let end = text.length;
    while (start < end && text[start] === "_") {
        start++;
    }

    while (end > start && text[end - 1] === "_") {
        end--;
    }

    return text.slice(start, end);
}

/**
 * The namespace a recipe with no `namespace` takes, from its `id` (recipe.md, "Run ids and
 * namespaces" rule 1).
 * @param id - The section's `id`, if any.
 * @returns The namespace.
 */
export function namespaceFromId(id: unknown): string {
    const parts = typeof id === "string" ? id.split(/[./:]/).filter((part) => part !== "") : [];
    const last = parts.at(-1) ?? "";
    const name = trimUnderscores(
        last
            .toLowerCase()
            .replaceAll(/[^a-z0-9]+/g, "_")
            .replace(/^[^a-z]+/, "")
            .slice(0, 30),
    );
    return name === "" ? "recipe" : name;
}

/**
 * A run id cut into its namespace and its `as`, when it has that shape.
 * @param id - The run id.
 * @returns The two parts, or undefined.
 */
export function splitRunId(id: string): { namespace: string; as: string } | undefined {
    const at = id.indexOf("__");
    if (at < 0) {
        return undefined;
    }

    const namespace = id.slice(0, at);
    const as = id.slice(at + 2);
    return isNamespace(namespace) && isRunName(as) ? { namespace, as } : undefined;
}

/**
 * The members whose text is one raw path, never an expression (spec 4.8.1 rule 2): a selector's
 * `path`, a binding's `by`, a leaf's `attribute`, `path` and `reads`, the window's `attribute`,
 * `end` and `spells`, and a collapse's `groupBy`.
 */
export const PATH_MEMBERS: ReadonlySet<string> = new Set([
    "path",
    "by",
    "attribute",
    "reads",
    "end",
    "spells",
    "groupBy",
]);

/**
 * A value with every run it names renamed: the run of each `results.<run>.<field>` path in a path
 * member, and in an expression (a `where`, or the value itself when it is a string), by token, so a
 * string literal is never touched; and each `{ "result": "<name>.<field>" }` option. An expression
 * that does not parse is kept as it is.
 * @param value - The value.
 * @param rename - The new name of a run, or undefined to keep it.
 * @returns The value, copied where it changed.
 */
export function renameRuns<T>(value: T, rename: (name: string) => string | undefined): T {
    const walk = (node: unknown, key: string | undefined): unknown => {
        if (typeof node === "string") {
            return renameRunsInString(node, key, rename);
        }

        if (Array.isArray(node)) {
            return node.map((each) => walk(each, ""));
        }

        if (isObject(node)) {
            return Object.fromEntries(Object.entries(node).map(([member, each]) => [member, walk(each, member)]));
        }

        return node;
    };
    return walk(value, undefined) as T;
}

/**
 * One string with the runs it names renamed, by the member that holds it (see `renameRuns`).
 * @param text - The string.
 * @param key - The member it is held under, or undefined for the value itself.
 * @param rename - The new name of a run, or undefined to keep it.
 * @returns The string.
 */
function renameRunsInString(
    text: string,
    key: string | undefined,
    rename: (name: string) => string | undefined,
): string {
    if (key === "result") {
        const dot = text.indexOf(".");
        const name = dot < 0 ? text : text.slice(0, dot);
        const renamed = rename(name);
        return renamed === undefined ? text : `${renamed}${text.slice(name.length)}`;
    }

    if (key !== undefined && PATH_MEMBERS.has(key)) {
        return renameRunInPath(text, rename);
    }

    return key === undefined || key === "where" ? renameRunsIn(text, rename) : text;
}

/**
 * An expression with the runs it reads renamed, or as it is when it does not parse.
 * @param where - The expression.
 * @param rename - The new name of a run, or undefined to keep it.
 * @returns The expression.
 */
function renameRunsIn(where: string, rename: (name: string) => string | undefined): string {
    if (!where.includes("results.") && !where.includes('results."')) {
        return where;
    }

    try {
        return renameRunPaths(where, rename);
    } catch {
        return where; // Words, not an expression.
    }
}

/** The set definition kinds, which hold a rule tree rather than being one. */
const DEFINITION_KINDS = new Set(["fixed", "path", "rule"]);

/**
 * Where a holder -- a layer's selector, a set's definition, a visibility filter or condition, a
 * run's scope, a recipe command -- holds an expression or a rule tree graphty-element refuses
 * (spec 4.8.2 rule 6): an expression outside the language, a rule tree leaf of a kind it does not
 * know, or a known leaf with a member it does not know.
 * @param value - The holder.
 * @param pointer - The holder's pointer.
 * @returns The pointer of what is refused, or undefined when nothing is.
 */
export function refusedIn(value: unknown, pointer = ""): string | undefined {
    if (!isObject(value)) {
        return undefined;
    }

    if (typeof value.kind === "string" && !DEFINITION_KINDS.has(value.kind)) {
        return refusedRule(value, pointer);
    }

    for (const key of ["where", "rule", "define", "scope"]) {
        const at = `${pointer}/${key}`;
        const found = key === "define" || key === "scope" ? refusedIn(value[key], at) : refusedRule(value[key], at);
        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}

/**
 * Where an expression or a rule tree is refused (see `refusedIn`).
 * @param rule - The expression or the rule tree.
 * @param pointer - Its pointer.
 * @returns The pointer of what is refused, or undefined.
 */
function refusedRule(rule: unknown, pointer: string): string | undefined {
    if (typeof rule === "string") {
        return acceptsExpression(rule) ? undefined : pointer;
    }

    if (!isObject(rule)) {
        return undefined;
    }

    if (rule.kind === "all" || rule.kind === "any") {
        const of: unknown[] = Array.isArray(rule.of) ? rule.of : [];
        return of.map((each, n) => refusedRule(each, `${pointer}/of/${String(n)}`)).find((at) => at !== undefined);
    }

    if (rule.kind === "not") {
        return refusedRule(rule.of, `${pointer}/of`);
    }

    if ((rule.kind === "expression" || rule.kind === "edges") && typeof rule.where === "string") {
        return acceptsExpression(rule.where) ? undefined : `${pointer}/where`;
    }

    try {
        return loadSetDefinition({ kind: "rule", where: rule, reading: "induced" }).opaque === undefined
            ? undefined
            : pointer;
    } catch {
        return undefined; // A malformed leaf of a known kind: the session refuses it in its own words.
    }
}

/**
 * Whether graphty-element accepts an expression: it parses and reads a path (spec 4.8.2).
 * @param where - The expression.
 * @returns True when it is accepted.
 */
function acceptsExpression(where: string): boolean {
    try {
        return expressionPaths(where).length > 0;
    } catch {
        return false;
    }
}

/**
 * The runs a value reads: each `results.<name>` and `{ "result" }` option in it.
 * @param value - The value.
 * @returns The names, in order of first reading.
 */
export function runsRead(value: unknown): string[] {
    const names = new Set<string>();
    renameRuns(value, (name) => {
        names.add(name);
        return undefined;
    });
    return [...names];
}

/**
 * The columns a path or an expression reads: each `data.<column>` in it, the column being the whole
 * rest of the path (`data.el.load` reads the column `el.load`, `data."a b"` the column `a b`). Text
 * that is no expression reads nothing.
 * @param text - The path or expression.
 * @param into - Where to add the columns.
 */
export function dataColumnsIn(text: string, into: Set<string>): void {
    if (!text.includes("data.")) {
        return;
    }

    try {
        renamePaths(text, (path) => {
            if (path.startsWith("data.") && path.length > "data.".length) {
                into.add(path.slice("data.".length));
            }

            return undefined;
        });
    } catch {
        // Words, not an expression.
    }
}

/**
 * The readable paths of version 2 (spec 4.2 rule 4): values graphty-element computes for every node
 * or edge, read by their bare names.
 */
const READABLE_PATHS: readonly string[] = Object.freeze([
    "graphty.type",
    "graphty.load",
    "_source.loads",
    "graphty.space",
    "graphty.key",
    "graphty.time",
    "graphty.weight",
    "graphty.draft",
]);

/**
 * Whether graphty-element cannot answer a path: a readable path, none of which it computes per
 * element yet, or the saved graph's plural `graphty.types`, which is reserved and never a path
 * (spec 10).
 * @param path - The path.
 * @returns True when nothing reads it.
 */
const unanswered = (path: string): boolean => path === "graphty.types" || READABLE_PATHS.includes(path);

/** The roots a path starts with (spec 4.8.1 rule 1). */
const ROOTED = /^(data|results|graphty|_source)\./;

/**
 * The first path a value reads that graphty-element cannot answer (see `unanswered`): in a member
 * holding one path, or in an expression. A path member with no root names nothing (spec 4.8.1 rule
 * 1), so it is not answered either, except a text leaf's `reads: "id"`; an algorithm's own
 * `params` are options, not path members.
 * @param value - The value.
 * @param member - The member the value is held under.
 * @param options - Whether the value is an algorithm's options, whose names are no path members.
 * @returns The path, or undefined when it reads none.
 */
export function unansweredPath(value: unknown, member = "", options = false): string | undefined {
    if (typeof value === "string" && PATH_MEMBERS.has(member)) {
        const rootless = !options && !ROOTED.test(value) && !(member === "reads" && value === "id");
        return unanswered(value) || rootless ? value : undefined;
    }

    if (typeof value === "string") {
        return unansweredIn(value);
    }

    const values = Array.isArray(value) ? value.map((each): [string, unknown] => ["", each]) : undefined;
    for (const [name, each] of values ?? (isObject(value) ? Object.entries(value) : [])) {
        const found = unansweredPath(each, name, options || name === "params");
        if (found !== undefined) {
            return found;
        }
    }

    return undefined;
}

/**
 * The first path an expression reads that graphty-element cannot answer.
 * @param text - The expression; text that is no expression reads nothing.
 * @returns The path, or undefined.
 */
function unansweredIn(text: string): string | undefined {
    if (!text.includes("graphty.") && !text.includes("_source.")) {
        return undefined;
    }

    let found: string | undefined;
    try {
        renamePaths(text, (path) => {
            found ??= unanswered(path) ? path : undefined;
            return undefined;
        });
    } catch {
        // Words, not an expression.
    }

    return found;
}

/**
 * The columns a value's predicates read.
 * @param value - The value.
 * @param into - Where to add them.
 */
export function columnsRead(value: unknown, into: Set<string>): void {
    if (typeof value === "string") {
        dataColumnsIn(value, into);
    } else if (Array.isArray(value)) {
        value.forEach((each) => {
            columnsRead(each, into);
        });
    } else if (isObject(value)) {
        Object.values(value).forEach((each) => {
            columnsRead(each, into);
        });
        if (typeof value.attribute === "string") {
            into.add(value.attribute.replace(/^data\./, ""));
        }
    }
}

/**
 * The source keys a rule's `source` leaves name.
 * @param value - The rule.
 * @param into - Where to add them.
 */
export function sourcesRead(value: unknown, into: Set<string>): void {
    if (Array.isArray(value)) {
        value.forEach((each) => {
            sourcesRead(each, into);
        });
    } else if (isObject(value)) {
        if (value.kind === "source" && Array.isArray(value.sources)) {
            for (const source of value.sources) {
                if (typeof source === "string") {
                    into.add(source);
                }
            }
        }

        Object.values(value).forEach((each) => {
            sourcesRead(each, into);
        });
    }
}

/**
 * Whether a scope names elements one by one: the selection, a node list, or an inline fixed or
 * path set.
 * @param scope - The scope.
 * @returns True when it does.
 */
export function scopeNamesElements(scope: Scope): boolean {
    return (
        scope === "selection" ||
        (typeof scope === "object" && ("nodes" in scope || ("define" in scope && scope.define.kind !== "rule")))
    );
}

/**
 * Whether a rule names an element: a `neighborhood` seed, an `item` pinned to one run, or a
 * `member` of a scope that names elements or of a set the caller says does.
 * @param rule - The rule.
 * @param setNamesElements - Whether a kept set names elements.
 * @returns True when it does.
 */
export function ruleNamesElements(rule: unknown, setNamesElements: (id: string) => boolean): boolean {
    if (!isObject(rule)) {
        return false;
    }

    switch (rule.kind) {
        case "neighborhood":
        case "item":
        case "ids":
            return true;
        case "member": {
            const of = rule.of as Scope;
            return (
                scopeNamesElements(of) ||
                (isObject(of) && "set" in of && setNamesElements(of.set)) ||
                (isObject(of) && "define" in of && ruleNamesElements(of.define, setNamesElements))
            );
        }
        case "rule":
            // An inline rule set definition.
            return ruleNamesElements(rule.where, setNamesElements);
        case "all":
        case "any":
            return Array.isArray(rule.of) && rule.of.some((each) => ruleNamesElements(each, setNamesElements));
        case "not":
            return ruleNamesElements(rule.of, setNamesElements);
        default:
            return false;
    }
}

/**
 * A filter step's rule as exact `graph.filter` commands: an `expression` leaf keeps nodes, an
 * `edges` leaf keeps edges, and an `all` of such leaves is one command each. A rule that reads a
 * run's result is left to the view, since a run recorded under it would replay before it.
 * @param rule - The step's rule.
 * @returns The commands, or undefined when the rule has no exact equivalent.
 */
export function filterCommands(rule: RuleTree): JsonObject[] | undefined {
    const leaves = rule.kind === "all" ? rule.of : [rule];
    const commands: JsonObject[] = [];
    for (const leaf of leaves) {
        if ((leaf.kind !== "expression" && leaf.kind !== "edges") || runsRead(leaf.where).length > 0) {
            return undefined;
        }

        commands.push(
            leaf.kind === "edges"
                ? { op: "graph.filter", where: leaf.where, on: "edges" }
                : { op: "graph.filter", where: leaf.where },
        );
    }

    return commands.length === 0 ? undefined : commands;
}

/**
 * The filter step rule a `graph.filter` command keeps.
 * @param where - The predicate.
 * @param on - Which table it reads.
 * @returns The rule.
 */
export function filterRule(where: string, on: "nodes" | "edges"): RuleTree {
    return on === "edges" ? { kind: "edges", where } : { kind: "expression", where };
}

/**
 * The JSON Schema fragment a column's type gives (spec 3.6 rule 1), with its declared measurement.
 * @param type - The column's attribute type.
 * @param measurement - Its declared measurement, if any.
 * @returns The schema.
 */
export function columnSchema(type: string, measurement: Measurement | undefined): JsonObject {
    const json: Readonly<Record<string, JsonObject>> = {
        string: { type: "string" },
        category: { type: "string" },
        number: { type: "number" },
        integer: { type: "integer" },
        boolean: { type: "boolean" },
    };
    // A time column may hold text or epoch numbers, and a mixed one anything: no JSON type is said.
    const schema: JsonObject = { ...json[type] };
    if (measurement !== undefined) {
        schema.measurement = measurement;
    } else if (type === "time") {
        schema.measurement = "time";
    }

    return schema;
}
