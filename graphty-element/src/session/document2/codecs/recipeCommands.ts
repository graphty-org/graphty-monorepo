/**
 * @file The recipe commands of version 2 (spec 4.3) and their mapping to and from today's session
 * state: which members each command knows, which filter steps are exact `graph.filter` commands,
 * which rules and scopes name elements, and the `results.<as>` rewriting between a recipe's run
 * names and the session's run ids. Experimental (`save-files-v2`).
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

import type { Measurement, RuleTree, Scope } from "../../../catalog/types";
import type { JsonObject } from "../types";

/** The members each command graphty-element knows (spec 4.3); a command's members are closed. */
export const COMMAND_MEMBERS: Readonly<Record<string, readonly string[]>> = Object.freeze({
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
    "layout.set": ["op", "id", "engine", "dimension", "options", "description"],
    "set.define": ["op", "id", "name", "where", "reading", "description"],
});

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

/**
 * The first member of an object outside a known list.
 * @param value - The object.
 * @param known - The members it may hold.
 * @returns The unknown member, or undefined.
 */
export function unknownMember(value: JsonObject, known: readonly string[]): string | undefined {
    return Object.keys(value).find((member) => !known.includes(member));
}

/**
 * The first unknown member of an `algo.run` scope object, read against the form its first member
 * picks.
 * @param scope - The scope object.
 * @returns The unknown member, or undefined.
 */
export function unknownScopeMember(scope: JsonObject): string | undefined {
    const form = SCOPE_FORMS.find((members) => members.some((member) => member in scope)) ?? [];
    return unknownMember(scope, form);
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
    const last =
        typeof id === "string"
            ? (id
                  .split(/[./:]/)
                  .filter((part) => part !== "")
                  .at(-1) ?? "") // NOSONAR(S7750): findLast needs ES2023, the package's lib is ES2022
            : "";
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

/** A run named in a `results.` path: `results.<name>`, ending at anything that is not a name character. */
const RESULT_PATH = /\bresults\.([a-z][a-z0-9_-]*)/g;

/**
 * A value with every run it names renamed: each `results.<name>` in its strings, and each
 * `{ "result": "<name>.<field>" }` option.
 * @param value - The value.
 * @param rename - The new name of a run, or undefined to keep it.
 * @returns The value, copied where it changed.
 */
export function renameRuns<T>(value: T, rename: (name: string) => string | undefined): T {
    const walk = (node: unknown, key: string | undefined): unknown => {
        if (typeof node === "string") {
            if (key === "result") {
                const dot = node.indexOf(".");
                const name = dot < 0 ? node : node.slice(0, dot);
                const renamed = rename(name);
                return renamed === undefined ? node : `${renamed}${node.slice(name.length)}`;
            }

            return node.replaceAll(RESULT_PATH, (whole, name: string) => {
                const renamed = rename(name);
                return renamed === undefined ? whole : `results.${renamed}`;
            });
        }

        if (Array.isArray(node)) {
            return node.map((each) => walk(each, undefined));
        }

        if (isObject(node)) {
            return Object.fromEntries(Object.entries(node).map(([member, each]) => [member, walk(each, member)]));
        }

        return node;
    };
    return walk(value, undefined) as T;
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

/** A column a predicate reads: `data.<name>` or `data."<name>"`. */
const COLUMN_PATH = /\bdata\.(?:([A-Za-z_]\w*)|"((?:[^"\\]|\\.)*)")/g;

/**
 * The columns a value's predicates read.
 * @param value - The value.
 * @param into - Where to add them.
 */
export function columnsRead(value: unknown, into: Set<string>): void {
    if (typeof value === "string") {
        for (const match of value.matchAll(COLUMN_PATH)) {
            into.add(match[1] ?? match[2].replaceAll(/\\(.)/g, "$1"));
        }
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
