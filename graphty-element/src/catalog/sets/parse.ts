/**
 * @file The one validator for set definitions, in two modes.
 *
 * DOOR MODE (`parseSetDefinition`, published) refuses anything malformed, unknown or reserved
 * with `E_BAD_COMMAND`, and returns the canonical definition. Every write door, and any caller
 * that wants to check a definition before handing it over, uses it.
 *
 * LOAD MODE (`loadSetDefinition`, internal) is what reading stored state uses. It still refuses
 * a malformed node of a kind this element knows, but an unknown kind, an unknown field or a
 * reserved field is kept instead of refused, and the definition is flagged OPAQUE with the first
 * such name. Ignoring it instead would be wrong in both directions: an older element that
 * dropped a rule's `scope` or an item key's `op` would resolve silently wrong members, and would
 * lose the field on the next save. The whole definition is the opaque unit
 * (design/sets/sets-design.md section 12.5): it round-trips value-identical, resolves to nothing
 * and reads `unresolvable`.
 *
 * One walker serves both modes, so the two can never disagree about what a known node is.
 *
 * Reserved fields -- names a later release will give a meaning, refused at the doors until then:
 * `weights` on a fixed set, `scope` on a rule, `key` and `dataSource` on an edge member, `graph` on
 * `{ set }`, `z` and `population` on a threshold, `op` on an item key. Reserved kinds:
 * the scope keyword `"search"`, and the item key forms `{ smallestNode }`, `{ edges }`, `{ binds }`.
 *
 * `parseScope` is the same validator for a `Scope`, which may carry a definition inline.
 *
 * Pure and Node-safe: nothing here reaches a graph, a renderer or the DOM.
 */

import { GraphtyError } from "../../errors/GraphtyError";
import type { EdgeMember, EdgeReading, Scope, SetDefinition } from "../types";
import { canonicalSetDefinition, DEFINITION_FIELDS, EDGE_MEMBER_FIELDS, runIdOfRef } from "./canonical";

type Loose = Readonly<Record<string, unknown>>;
type Mode = "door" | "load";

/** Reserved field names, by the node that reserves them, as `<node>.<field>`. */
const RESERVED = new Set([
    "fixed.weights",
    "rule.scope",
    "edgeMember.key",
    "edgeMember.dataSource",
    "set.graph",
    "search",
    "threshold.z",
    "threshold.population",
    "itemKey.op",
    "itemKey.smallestNode",
    "itemKey.edges",
    "itemKey.binds",
]);

/** The scope keywords this element defines. */
const KEYWORDS = new Set(["visible", "graph", "selection", "largest-component"]);

/** Every edge reading this element knows. */
export const EDGE_READINGS: readonly EdgeReading[] = ["induced", "listed", "clipped", "incident"];
const DIRECTIONS = new Set(["in", "out", "all"]);
/** The modes a `text` leaf compares by. */
const TEXT_MODES = new Set(["substring", "exact", "starts-with", "ends-with", "regex"]);

/**
 * A refusal.
 * @param message - What is wrong, in a sentence.
 * @param details - The facts, for a caller that answers with a verb.
 * @returns The error to throw.
 */
function bad(message: string, details: Readonly<Record<string, unknown>> = {}): GraphtyError {
    return new GraphtyError({ code: "E_BAD_COMMAND", message, source: "data", details });
}

/**
 * Whether a value is a plain object (not null, not an array).
 * @param value - Any value.
 * @returns True for an object that can carry named fields.
 */
function isObject(value: unknown): value is Loose {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether a value is a finite number.
 * @param value - Any value.
 * @returns True for a number that is not NaN or an infinity.
 */
function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * Whether a value can be a node or edge id: a string, or a finite number.
 * @param value - Any value.
 * @returns True when it is a usable id.
 */
function isId(value: unknown): boolean {
    return typeof value === "string" || isFiniteNumber(value);
}

/** One validation pass: the mode, and the first unknown name met so far. */
class Walker {
    first: string | undefined;
    /** How many union steps the walk is inside: a step leaf is valid only inside one. */
    inStep = 0;

    constructor(readonly mode: Mode) {}

    /**
     * Meet a kind or field this element does not define: refused at a door, remembered on load.
     * @param name - The kind, or `<node>.<field>`.
     * @param what - How to say it in a refusal.
     */
    unknown(name: string, what: string): void {
        if (this.mode === "door") {
            const reserved = RESERVED.has(name);

            throw bad(
                reserved
                    ? `"${name}" is reserved for a later release of graphty-element and cannot be used yet.`
                    : `${what} "${name}" is not one graphty-element knows.`,
                reserved ? { field: name, reserved: true } : { name },
            );
        }

        this.first ??= name;
    }

    /**
     * Meet every field of a node outside its known list, in code-unit order.
     * @param value - The node.
     * @param node - Its name, for `<node>.<field>`.
     * @param known - The fields it defines.
     */
    fields(value: Loose, node: string, known: readonly string[]): void {
        for (const key of Object.keys(value).sort()) {
            if (value[key] !== undefined && !known.includes(key)) {
                this.unknown(`${node}.${key}`, "The field");
            }
        }
    }
}

/**
 * Check a list of node ids.
 * @param value - The candidate list.
 * @param where - What holds it, for the message.
 */
function checkIds(value: unknown, where: string): void {
    if (!Array.isArray(value)) {
        throw bad(`${where} is a list of node ids.`, { value });
    }

    for (const id of value) {
        if (!isId(id)) {
            throw bad(`${where} holds ${String(id)}, which is not a node id: an id is a string or a finite number.`, {
                id,
            });
        }
    }
}

/**
 * Check one edge member: its endpoints and exactly one discriminator.
 * @param value - The candidate member.
 * @param walker - The pass.
 */
function checkEdgeMember(value: unknown, walker: Walker): void {
    if (!isObject(value)) {
        throw bad(
            "An edge member is an object with a source, a target and one of id, key or ordinal with among. " +
                "A session edge id is accepted only at a write door, which stores its stable form.",
            { member: value },
        );
    }

    walker.fields(value, "edgeMember", EDGE_MEMBER_FIELDS);

    if (!isId(value.source) || !isId(value.target)) {
        throw bad("An edge member's source and target are node ids.", { member: value });
    }

    const hasOrdinal = value.ordinal !== undefined;
    if (hasOrdinal !== (value.among !== undefined)) {
        throw bad("An edge member's ordinal and among come together or not at all.", { member: value });
    }

    const discriminators = [value.id, value.key, value.ordinal].filter((part) => part !== undefined).length;
    if (discriminators !== 1) {
        throw bad("An edge member names its edge by exactly one of id, key or ordinal with among.", { member: value });
    }

    if (value.id !== undefined && !isId(value.id)) {
        throw bad("An edge member's id is a string or a finite number.", { member: value });
    }

    if (value.key !== undefined) {
        if (!isId(value.key)) {
            throw bad("An edge member's key is a string or a finite number.", { member: value });
        }

        walker.unknown("edgeMember.key", "The field");
    }

    if (hasOrdinal) {
        const { ordinal, among } = value;

        if (
            !Number.isInteger(among) ||
            (among as number) < 1 ||
            !Number.isInteger(ordinal) ||
            (ordinal as number) < 0 ||
            (ordinal as number) >= (among as number)
        ) {
            throw bad("An edge member's ordinal counts from 0 and is below among, a whole number from 1.", {
                member: value,
            });
        }
    }
}

/**
 * Check a query is a non-blank string. A blank one would match every element.
 * @param value - The candidate query.
 * @param where - What holds it, for the message.
 */
function checkQuery(value: unknown, where: string): void {
    if (typeof value !== "string" || value.trim() === "") {
        throw bad(`${where} needs a query. An empty one matches every element rather than none.`, { where: value });
    }
}

/**
 * Check optional numeric bounds are finite and in order.
 * @param node - The leaf carrying them.
 */
function checkBounds(node: Loose): void {
    for (const name of ["min", "max"]) {
        if (node[name] !== undefined && !isFiniteNumber(node[name])) {
            throw bad(`A "${String(node.kind)}" leaf's ${name} must be a finite number.`, { [name]: node[name] });
        }
    }

    if (node.min !== undefined && node.max !== undefined && (node.min as number) > (node.max as number)) {
        throw bad(`A "${String(node.kind)}" leaf's min is above its max.`, { min: node.min, max: node.max });
    }
}

/**
 * Check a result item: a result, a key, and optionally the run it holds. At a door the result may
 * be a `Run` or `RunResult` handle, which the canonical form replaces by its id.
 * @param value - The candidate item.
 * @param walker - The pass.
 */
function checkItem(value: unknown, walker: Walker): void {
    if (!isObject(value)) {
        throw bad("An item leaf's item is an object with a result and a key.", { item: value });
    }

    walker.fields(value, "resultItem", ["result", "run", "key"]);

    const result = walker.mode === "door" ? runIdOfRef(value.result) : value.result;
    if (typeof result !== "string" || result === "") {
        throw bad("An item names its result by the result's id.", { result: value.result });
    }

    if (value.run !== undefined && (typeof value.run !== "string" || value.run === "")) {
        throw bad("An item's run is the token of the run it holds.", { run: value.run });
    }

    const { key } = value;
    if (!isObject(key)) {
        throw bad('An item\'s key is an object, such as { field: "group", value: 3 }.', { key });
    }

    if (key.field === undefined) {
        walker.unknown(`itemKey.${Object.keys(key).sort()[0] ?? "{}"}`, "The item key form");

        return;
    }

    walker.fields(key, "itemKey", ["field", "value"]);

    if (typeof key.field !== "string" || key.field === "") {
        throw bad("An item key's field names a field of the result.", { key });
    }

    const { value: wanted } = key;
    if (typeof wanted !== "string" && typeof wanted !== "boolean" && !isFiniteNumber(wanted)) {
        throw bad("An item key's value is a string, a finite number or a boolean.", { key });
    }
}

/**
 * Whether a path is a value path a threshold may rank: `data.<field>` or `results.<run>.<field>`.
 * @param path - The candidate.
 * @returns True when it names a field.
 */
function isValuePath(path: unknown): boolean {
    if (typeof path !== "string") {
        return false;
    }

    if (STRUCTURE_PATHS.has(path)) {
        return true;
    }

    if (path.startsWith("data.")) {
        return path.length > "data.".length;
    }

    const rest = path.startsWith("results.") ? path.slice("results.".length) : "";
    const dot = rest.indexOf(".");

    return dot > 0 && dot < rest.length - 1;
}

/**
 * Check a threshold leaf: a value path and exactly one cut.
 * @param value - The leaf.
 * @param walker - The pass.
 */
function checkThreshold(value: Loose, walker: Walker): void {
    walker.fields(value, "threshold", ["kind", "path", "top", "above", "ties", "percentile", "from", "missing"]);
    checkRoot(value.path);

    if (!isValuePath(value.path)) {
        throw bad('A "threshold" leaf\'s path is "data.<field>" or "results.<run>.<field>".', { path: value.path });
    }

    // A reserved cut kept opaque on load counts as the leaf's cut.
    const reservedCut = walker.mode === "load" && value.z !== undefined;
    const cuts = [value.top, value.above, value.percentile].filter((cut) => cut !== undefined).length;
    if (cuts !== 1 && !(reservedCut && cuts === 0)) {
        throw bad('A "threshold" leaf has exactly one cut: top, above or percentile.', {
            top: value.top,
            above: value.above,
            percentile: value.percentile,
        });
    }

    if (
        value.percentile !== undefined &&
        (!isFiniteNumber(value.percentile) || value.percentile < 0 || value.percentile > 100)
    ) {
        throw bad('A "threshold" leaf\'s percentile is a share from 0 to 100.', { percentile: value.percentile });
    }

    checkFrom(value);
    checkMissing(value);

    if (value.top !== undefined && (!Number.isInteger(value.top) || (value.top as number) < 0)) {
        throw bad('A "threshold" leaf\'s top is a whole number of elements.', { top: value.top });
    }

    if (value.above !== undefined && !isFiniteNumber(value.above)) {
        throw bad('A "threshold" leaf\'s above is a finite number.', { above: value.above });
    }

    if (value.ties !== undefined && value.ties !== "fewer" && value.ties !== "all") {
        throw bad('A "threshold" leaf\'s ties is "fewer" or "all".', { ties: value.ties });
    }
}

/**
 * The roots a field path may start with, beside `graphty.source.` and `graphty.target.` in front
 * of one of them. Any other root is reserved for a later release.
 */
const FIELD_ROOTS = new Set(["data", "results"]);

/** The structure values a rule reads with no run and no column: a node's degree. */
export const STRUCTURE_PATHS: ReadonlySet<string> = new Set([
    "graphty.degree",
    "graphty.inDegree",
    "graphty.outDegree",
]);

/**
 * Refuse a field path whose root is reserved: `graph.<measure>` and every other root but `data`
 * and `results` may be given a meaning later, and a stored path must not change meaning when it
 * is (design/sets 15.3, item 36).
 * @param path - The candidate path.
 * @throws `E_BAD_COMMAND` with `details.reason: "reserved-root"`.
 */
function checkRoot(path: unknown): void {
    if (typeof path !== "string" || path === "" || STRUCTURE_PATHS.has(path)) {
        return;
    }

    // A node's value read at an edge's end: its node path is checked as any other.
    const end = /^graphty\.(?:source|target)\.(.+)$/.exec(path);
    if (end !== null) {
        checkRoot(end[1]);
        return;
    }

    const root = path.split(".")[0];
    if (!FIELD_ROOTS.has(root)) {
        throw bad(
            `A field path starts with "data." or "results.", so "${path}" is refused: the root "${root}" is reserved.`,
            {
                path,
                root,
                reason: "reserved-root",
            },
        );
    }
}

/**
 * {@link checkRoot} at a door only: a stored `range` or `categories` leaf written before roots
 * were reserved still loads, and reads its path as an attribute as it always has.
 * @param path - The candidate path.
 * @param walker - The pass.
 */
function checkDoorRoot(path: unknown, walker: Walker): void {
    if (walker.mode === "door") {
        checkRoot(path);
    }
}

/**
 * Check that a leaf's member is a list of strings.
 * @param list - The member's value.
 * @param message - What it must be, for the refusal.
 * @param details - The refusal's details.
 */
function checkStrings(list: unknown, message: string, details: Record<string, unknown>): void {
    if (!Array.isArray(list) || !list.every((entry) => typeof entry === "string")) {
        throw bad(message, details);
    }
}

/**
 * Refuse an attribute leaf's `nodes` that is neither `"all"` nor `"ends"`.
 * @param value - The leaf.
 */
function checkLeafNodes(value: Readonly<Record<string, unknown>>): void {
    if (value.nodes !== undefined && value.nodes !== "all" && value.nodes !== "ends" && value.nodes !== "none") {
        throw bad(`A "${String(value.kind)}" leaf's nodes are "all", "ends" or "none".`, { nodes: value.nodes });
    }
}

/**
 * Check a `text` leaf: what it reads (`"id"` or a value path), a known mode, the text (a
 * regular expression that parses, for `regex`), and the optional flags.
 * @param value - The leaf.
 * @param walker - The pass.
 */
function checkTextLeaf(value: Loose, walker: Walker): void {
    if (value.reads !== "id") {
        checkQuery(value.reads, 'A "text" leaf\'s reads');
        checkDoorRoot(value.reads, walker);
    }

    if (!TEXT_MODES.has(value.mode as string)) {
        walker.unknown(String(value.mode), 'A "text" leaf\'s mode');
    }

    if (typeof value.text !== "string") {
        throw bad('A "text" leaf\'s text is a string.', { text: value.text });
    }

    if (value.caseSensitive !== undefined && typeof value.caseSensitive !== "boolean") {
        throw bad('A "text" leaf\'s caseSensitive is true or false.', { caseSensitive: value.caseSensitive });
    }

    checkLeafNodes(value);

    if (value.mode === "regex") {
        try {
            new RegExp(value.text);
        } catch (error) {
            throw bad(
                `"${value.text}" is not a regular expression: ${error instanceof Error ? error.message : String(error)}`,
                {
                    text: value.text,
                },
            );
        }
    }
}

/**
 * Check a leaf's side, when it has one.
 * @param value - The leaf.
 */
function checkSide(value: Readonly<Record<string, unknown>>): void {
    if (value.side !== undefined && value.side !== "nodes" && value.side !== "edges") {
        throw bad(`A "${String(value.kind)}" leaf's side is "nodes" or "edges".`, { side: value.side });
    }
}

/**
 * Check a range leaf's `as`: "time", or absent to compare numbers.
 * @param value - The leaf.
 */
function checkRangeAs(value: Readonly<Record<string, unknown>>): void {
    if (value.as !== undefined && value.as !== "time") {
        throw bad('A "range" leaf\'s as is "time", or absent to compare numbers.', { as: value.as });
    }
}

/**
 * Refuse a `missing` that is neither `"include"` nor `"exclude"`.
 * @param value - The leaf.
 */
function checkMissing(value: Loose): void {
    if (value.missing !== undefined && value.missing !== "include" && value.missing !== "exclude") {
        throw bad(`A "${String(value.kind)}" leaf's missing is "include" or "exclude".`, { missing: value.missing });
    }
}

/**
 * Refuse a `from` that is neither `"high"` nor `"low"`.
 * @param value - The leaf.
 */
function checkFrom(value: Loose): void {
    if (value.from !== undefined && value.from !== "high" && value.from !== "low") {
        throw bad(`A "${String(value.kind)}" leaf's from is "high" or "low".`, { from: value.from });
    }
}

/**
 * Refuse a path that is not a value path.
 * @param path - The candidate.
 * @param kind - The leaf kind, for the message.
 */
function checkValuePath(path: unknown, kind: string): void {
    checkRoot(path);
    if (!isValuePath(path)) {
        throw bad(`A "${kind}" leaf's path is "data.<field>", "results.<run>.<field>" or "graphty.degree".`, { path });
    }
}

/**
 * Check a `by-size` leaf's cut: a size range, or a top count.
 * @param value - The leaf.
 */
function checkBySize(value: Loose): void {
    checkBounds(value);
    checkFrom(value);
    if (value.top !== undefined && (!Number.isInteger(value.top) || (value.top as number) < 0)) {
        throw bad('A "by-size" leaf\'s top is a whole number of categories.', { top: value.top });
    }

    if (value.top !== undefined && (value.min !== undefined || value.max !== undefined)) {
        throw bad('A "by-size" leaf cuts by top or by min and max, not both.', { top: value.top });
    }

    if (value.ties !== undefined && value.ties !== "fewer" && value.ties !== "all") {
        throw bad('A "by-size" leaf\'s ties is "fewer" or "all".', { ties: value.ties });
    }
}

/**
 * Refuse a step leaf outside a union step: its references are view or step state.
 * @param value - The leaf.
 * @param walker - The pass.
 */
function checkStepLeaf(value: Loose, walker: Walker): void {
    if (walker.inStep === 0) {
        throw bad(`A "${String(value.kind)}" leaf is valid only inside a step of a "union" leaf.`, {
            kind: value.kind,
            reason: "reference-outside-union",
        });
    }
}

/**
 * Check a step's reference: absent (the step is inert), one of the two step forms, or a scope.
 * @param value - The reference.
 * @param walker - The pass.
 */
function checkReference(value: unknown, walker: Walker): void {
    if (value === undefined || value === "hovered-or-selected" || value === "so-far") {
        return;
    }

    checkScope(value, walker);
}

/** The test kinds a `measure` leaf may put to its field, and the field each one names its path by. */
const MEASURE_TESTS: Readonly<Record<string, string>> = {
    range: "attribute",
    threshold: "path",
    categories: "attribute",
    text: "reads",
    "by-size": "path",
    "same-value": "path",
};

/**
 * Check a `measure` leaf: an algorithm, a field, plain params, references bound by option name,
 * and a test that is a known leaf's body without its path.
 * @param value - The leaf.
 * @param walker - The pass.
 */
function checkMeasure(value: Loose, walker: Walker): void {
    if (typeof value.algorithm !== "string" || value.algorithm === "") {
        throw bad('A "measure" leaf names its algorithm by key.', { algorithm: value.algorithm });
    }

    if (typeof value.field !== "string" || value.field === "") {
        throw bad('A "measure" leaf names the result field it tests.', { field: value.field });
    }

    if (value.params !== undefined && !isObject(value.params)) {
        throw bad('A "measure" leaf\'s params are an object of option values.', { params: value.params });
    }

    if (value.bind !== undefined) {
        if (!isObject(value.bind)) {
            throw bad('A "measure" leaf\'s bind maps option names to references.', { bind: value.bind });
        }

        for (const reference of Object.values(value.bind)) {
            checkReference(reference, walker);
        }
    }

    if (value.test === undefined) {
        return;
    }

    const { test } = value;
    const pathField = isObject(test) && typeof test.kind === "string" ? MEASURE_TESTS[test.kind] : undefined;
    if (!isObject(test) || pathField === undefined) {
        throw bad(`A "measure" leaf's test is a ${Object.keys(MEASURE_TESTS).join(", ")} test without its path.`, {
            test,
        });
    }

    checkTree({ ...test, [pathField]: "data.measure" }, walker);
}

/** The fields a union branch and a union step define. */
const BRANCH_FIELDS = ["id", "name", "color", "on", "start", "steps"];
const STEP_FIELDS = ["id", "op", "on", "rule", "computedOn", "links", "ends", "frozenFrom"];

/** The leaf kinds that speak only nodes, or hold a selection: a step's `links` refuses them. */
const NOT_EDGE_KINDS = new Set([
    "union",
    "hops",
    "nonempty",
    "same-value",
    "by-size",
    "isolated",
    "degree",
    "neighborhood",
    "component",
]);

/**
 * Check a step's `links`: an edge-side rule, so no union and no node-only leaf anywhere in it.
 * @param links - The rule.
 * @param walker - The pass.
 */
function checkLinks(links: unknown, walker: Walker): void {
    const refuse = (node: unknown): void => {
        if (!isObject(node)) {
            return;
        }

        if (typeof node.kind === "string" && NOT_EDGE_KINDS.has(node.kind)) {
            throw bad(`A union step's links is an edge-side rule; "${node.kind}" does not speak edges.`, {
                reason: "links-not-edges",
                kind: node.kind,
            });
        }

        if (node.kind === "all" || node.kind === "any") {
            for (const member of Array.isArray(node.of) ? (node.of as readonly unknown[]) : []) {
                refuse(member);
            }
        } else if (node.kind === "not") {
            refuse(node.of);
        }
    };
    refuse(links);
    checkTree(links, walker);
}

/**
 * Check a `union` leaf: its side, its base, and each branch and step; a union inside a step is
 * refused.
 * @param value - The leaf.
 * @param walker - The pass.
 */
function checkUnion(value: Loose, walker: Walker): void {
    if (walker.inStep > 0) {
        throw bad('A "union" leaf cannot sit inside a step of another.', { reason: "nested-union" });
    }

    if (value.side !== "nodes" && value.side !== "edges") {
        throw bad('A "union" leaf\'s side is "nodes" or "edges".', { side: value.side });
    }

    if (value.within !== "graph" && value.within !== "visible") {
        throw bad('A "union" leaf\'s within is "graph" or "visible".', { within: value.within });
    }

    if (!Array.isArray(value.branches)) {
        throw bad('A "union" leaf\'s branches are a list.', { branches: value.branches });
    }

    const ids = new Set<unknown>();
    const unique = (id: unknown, what: string): void => {
        if (id === undefined) {
            return;
        }

        if (typeof id !== "string" || id === "" || ids.has(id)) {
            throw bad(`A union ${what}'s id is a string unique in the leaf.`, { id });
        }

        ids.add(id);
    };

    for (const branch of value.branches as readonly unknown[]) {
        if (!isObject(branch)) {
            throw bad("A union branch is an object with a start and steps.", { branch });
        }

        walker.fields(branch, "unionBranch", BRANCH_FIELDS);
        unique(branch.id, "branch");
        checkFlagAndText(branch, ["name", "color"]);

        if (branch.start !== "all" && branch.start !== "none") {
            throw bad('A union branch\'s start is "all" or "none".', { start: branch.start });
        }

        if (!Array.isArray(branch.steps)) {
            throw bad("A union branch's steps are a list.", { steps: branch.steps });
        }

        for (const step of branch.steps as readonly unknown[]) {
            if (!isObject(step)) {
                throw bad("A union step is an object with an op and a rule.", { step });
            }

            walker.fields(step, "unionStep", STEP_FIELDS);
            unique(step.id, "step");
            checkFlagAndText(step, []);
            checkStepEnums(step);
            walker.inStep++;
            try {
                checkTree(step.rule, walker);
                if (step.links !== undefined) {
                    checkLinks(step.links, walker);
                }
            } finally {
                walker.inStep--;
            }
        }
    }
}

/**
 * Check a branch's or step's optional `on` flag and its optional text fields.
 * @param value - The branch or step.
 * @param texts - Its text fields.
 */
function checkFlagAndText(value: Loose, texts: readonly string[]): void {
    if (value.on !== undefined && typeof value.on !== "boolean") {
        throw bad("A union branch's or step's on is true or false.", { on: value.on });
    }

    for (const name of texts) {
        if (value[name] !== undefined && typeof value[name] !== "string") {
            throw bad(`A union branch's ${name} is a string.`, { [name]: value[name] });
        }
    }
}

/**
 * Check a step's op, computedOn, ends and frozenFrom.
 * @param step - The step.
 */
function checkStepEnums(step: Loose): void {
    const allowed: Readonly<Record<string, readonly unknown[]>> = {
        op: ["add", "keep", "except"],
        computedOn: [undefined, "base", "so-far"],
        ends: [undefined, "both", "either"],
        frozenFrom: [undefined, "selection", "hovered-or-selected"],
    };
    for (const [name, values] of Object.entries(allowed)) {
        if (!values.includes(step[name])) {
            throw bad(
                `A union step's ${name} is ${values
                    .filter((each) => each !== undefined)
                    .map(String)
                    .join(", ")}.`,
                {
                    [name]: step[name],
                },
            );
        }
    }
}

/**
 * Check one rule tree node, all the way down.
 * @param value - The candidate node.
 * @param walker - The pass.
 */
function checkTree(value: unknown, walker: Walker): void {
    if (!isObject(value) || typeof value.kind !== "string") {
        throw bad("A rule tree node is an object with a kind.", { node: value });
    }

    const { kind } = value;
    const known = (fields: readonly string[]): void => {
        walker.fields(value, kind, ["kind", ...fields]);
    };

    switch (kind) {
        case "expression":
        case "edges":
            known(["where"]);
            checkQuery(value.where, `An "${kind}" leaf`);

            return;
        case "range":
            known(["attribute", "min", "max", "nodes", "as", "missing"]);
            checkQuery(value.attribute, 'A "range" leaf\'s attribute');
            checkDoorRoot(value.attribute, walker);
            checkBounds(value);
            checkRangeAs(value);
            checkLeafNodes(value);
            checkMissing(value);

            return;
        case "categories":
            known(["attribute", "values", "nodes", "missing", "match"]);
            checkQuery(value.attribute, 'A "categories" leaf\'s attribute');
            checkDoorRoot(value.attribute, walker);
            checkLeafNodes(value);
            checkMissing(value);

            if (value.match !== undefined && value.match !== "any" && value.match !== "all") {
                throw bad('A "categories" leaf\'s match is "any" or "all".', { match: value.match });
            }

            checkStrings(value.values, 'A "categories" leaf\'s values are a list of strings.', {
                values: value.values,
            });

            return;
        case "degree":
            known(["min", "max", "direction"]);
            checkBounds(value);

            if (value.direction !== undefined && !DIRECTIONS.has(value.direction as string)) {
                throw bad('A "degree" leaf\'s direction is "in", "out" or "all".', { direction: value.direction });
            }

            return;
        case "component":
            known(["id"]);

            if (!Number.isInteger(value.id) || (value.id as number) < 0) {
                throw bad('A "component" leaf\'s id is a component number, counting from 0.', { id: value.id });
            }

            return;
        case "neighborhood":
            known(["seeds", "depth"]);
            checkIds(value.seeds, 'A "neighborhood" leaf\'s seeds');

            if (!Number.isInteger(value.depth) || (value.depth as number) < 0) {
                throw bad('A "neighborhood" leaf\'s depth is a whole number of hops, from 0.', { depth: value.depth });
            }

            return;
        case "isolated":
        case "self-loop":
        case "repeated-edge":
            known([]);

            return;
        case "source":
            known(["sources", "side"]);
            checkSide(value);

            checkStrings(value.sources, 'A "source" leaf\'s sources are a list of load keys.', {
                sources: value.sources,
            });

            return;
        case "member":
            known(["of"]);
            checkScope(value.of, walker);

            return;
        case "item":
            known(["item"]);
            checkItem(value.item, walker);

            return;
        case "threshold":
            checkThreshold(value, walker);

            return;
        case "text":
            known(["reads", "mode", "text", "caseSensitive", "nodes"]);
            checkTextLeaf(value, walker);

            return;
        case "union":
            known(["side", "within", "branches"]);
            checkUnion(value, walker);

            return;
        case "hops":
            known(["of", "max", "direction"]);
            checkStepLeaf(value, walker);
            checkReference(value.of, walker);

            if (value.max !== undefined && (!Number.isInteger(value.max) || (value.max as number) < 0)) {
                throw bad('A "hops" leaf\'s max is a whole number of hops, from 0.', { max: value.max });
            }

            if (value.direction !== undefined && !DIRECTIONS.has(value.direction as string)) {
                throw bad('A "hops" leaf\'s direction is "in", "out" or "all".', { direction: value.direction });
            }

            return;
        case "touching":
            known(["of", "ends"]);
            checkStepLeaf(value, walker);
            checkReference(value.of, walker);

            if (value.ends !== "either" && value.ends !== "both" && value.ends !== "one") {
                throw bad('A "touching" leaf\'s ends are "either", "both" or "one".', { ends: value.ends });
            }

            return;
        case "nonempty":
            known(["of"]);
            checkStepLeaf(value, walker);
            checkReference(value.of, walker);

            return;
        case "same-value":
            known(["path", "as"]);
            checkStepLeaf(value, walker);
            checkValuePath(value.path, kind);
            checkReference(value.as, walker);

            return;
        case "by-size":
            known(["path", "min", "max", "top", "from", "ties"]);
            checkValuePath(value.path, kind);
            checkBySize(value);

            return;
        case "measure":
            known(["algorithm", "params", "bind", "field", "test"]);
            checkStepLeaf(value, walker);
            checkMeasure(value, walker);

            return;
        case "all":
        case "any":
            known(["of"]);

            if (!Array.isArray(value.of)) {
                throw bad(`An "${kind}" node's operands are a list.`, { of: value.of });
            }

            for (const operand of value.of) {
                checkTree(operand, walker);
            }

            return;
        case "not":
            known(["of"]);
            checkTree(value.of, walker);

            return;
        default:
            walker.unknown(kind, "The rule leaf kind");
    }
}

/**
 * How a scope reads, as far as the scope itself says: `"visible"` is clipped, an inline definition
 * reads as it is stored (a path `listed`), and every other form is node-induced. A `{ set }` names
 * a set this module cannot see: `referent` answers for it, and without one it reads induced.
 * @param scope - A validated scope.
 * @param referent - The reading of the set an id names, when the caller can look it up.
 * @returns The reading.
 */
export function readingOfScope(scope: unknown, referent?: (id: string) => string | undefined): string {
    if (scope === "visible") {
        return "clipped";
    }

    if (!isObject(scope)) {
        return "induced";
    }

    if (isObject(scope.define)) {
        if (scope.define.kind === "path") {
            return "listed";
        }

        return typeof scope.define.reading === "string" ? scope.define.reading : "induced";
    }

    return typeof scope.set === "string" ? (referent?.(scope.set) ?? "induced") : "induced";
}

/**
 * Whether a rule tree holds a leaf that speaks about edges: an `edges` leaf, a `member` leaf whose
 * set is read `listed` or `clipped`, or an `item` or `threshold` leaf over a field edges carry.
 * @param node - A validated tree node, or a query.
 * @param referent - The reading of the set an id names, when the caller can look it up.
 * @param fieldKinds - Which halves carry a value path (`results.<run>.<field>` or `data.<field>`),
 * when the caller can look it up; without it an `item` or `threshold` leaf is not known to.
 * @returns True when some leaf speaks the edge half.
 */
export function speaksEdges(
    node: unknown,
    referent?: (id: string) => string | undefined,
    fieldKinds?: (path: string) => readonly string[],
): boolean {
    if (!isObject(node)) {
        return false;
    }

    switch (node.kind) {
        case "edges":
        case "self-loop":
        case "repeated-edge":
            return true;
        case "source":
            return node.side !== "nodes";
        case "member":
            return readingOfScope(node.of, referent) !== "induced";
        case "item": {
            const item = isObject(node.item) ? node.item : {};
            const key = isObject(item.key) ? item.key : {};
            const run = runIdOfRef(item.result);

            return (
                typeof run === "string" &&
                typeof key.field === "string" &&
                fieldKinds?.(`results.${run}.${key.field}`).includes("edge") === true
            );
        }
        case "threshold":
            return typeof node.path === "string" && fieldKinds?.(node.path).includes("edge") === true;
        case "all":
        case "any":
            return Array.isArray(node.of) && node.of.some((operand) => speaksEdges(operand, referent, fieldKinds));
        case "not":
            return speaksEdges(node.of, referent, fieldKinds);
        default:
            return false;
    }
}

/**
 * The refusal of a rule read `induced` that holds an edge-speaking leaf.
 * @returns The error to throw.
 */
export function inducedEdgeLeaf(): GraphtyError {
    return bad(
        "An induced set derives its edges from its nodes, so this rule's edge-speaking leaf would be " +
            'ignored. Read it "clipped" or "listed" instead.',
        { reason: "induced-edge-leaf" },
    );
}

/**
 * Check one scope, all the way down.
 * @param value - The candidate scope.
 * @param walker - The pass.
 */
function checkScope(value: unknown, walker: Walker): void {
    if (typeof value === "string") {
        if (!KEYWORDS.has(value)) {
            walker.unknown(value, "The scope keyword");
        }

        return;
    }

    if (!isObject(value)) {
        throw bad(
            'A scope is "visible", "graph", "selection", "largest-component", { set }, { where }, { nodes } or { define }.',
            {
                scope: value,
            },
        );
    }

    if (value.set !== undefined) {
        walker.fields(value, "set", ["set"]);

        if (typeof value.set !== "string" || value.set === "") {
            throw bad("A { set } scope names a set by its id.", { scope: value });
        }
    } else if (value.where !== undefined) {
        walker.fields(value, "where", ["where"]);
        checkQuery(value.where, "A { where } scope");
    } else if (value.nodes !== undefined) {
        walker.fields(value, "nodes", ["nodes"]);
        checkIds(value.nodes, "A { nodes } scope");
    } else if (value.define !== undefined) {
        walker.fields(value, "define", ["define"]);
        checkDefinition(value.define, walker);
    } else {
        walker.unknown(Object.keys(value).sort()[0] ?? "{}", "The scope form");
    }
}

/**
 * Check a reading.
 * @param value - The candidate reading.
 */
function checkReading(value: unknown): void {
    if (!(EDGE_READINGS as readonly unknown[]).includes(value)) {
        throw bad(`A set's reading is "induced", "listed", "clipped" or "incident".`, { reading: value });
    }
}

/**
 * Validate a definition in one mode.
 * @param value - The candidate.
 * @param mode - Door or load.
 * @returns The walker, holding the first unknown name met.
 */
function check(value: unknown, mode: Mode): Walker {
    const walker = new Walker(mode);
    checkDefinition(value, walker);

    return walker;
}

/**
 * Check one definition, all the way down.
 * @param value - The candidate.
 * @param walker - The pass.
 */
function checkDefinition(value: unknown, walker: Walker): void {
    if (!isObject(value) || typeof value.kind !== "string") {
        throw bad('A set definition is an object whose kind is "fixed", "rule" or "path".', { definition: value });
    }

    switch (value.kind) {
        case "fixed":
            checkFixed(value, walker);
            break;
        case "rule":
            checkRule(value, walker);
            break;
        case "path":
            checkPath(value, walker);
            break;
        default:
            walker.unknown(value.kind, "The set definition kind");
    }
}

/**
 * Check a fixed definition.
 * @param value - The candidate, whose kind is "fixed".
 * @param walker - The pass.
 */
function checkFixed(value: Loose, walker: Walker): void {
    walker.fields(value, "fixed", DEFINITION_FIELDS.fixed);
    checkIds(value.nodes, "A fixed set's nodes");
    checkReading(value.reading);
    if (value.reading === "incident") {
        throw bad('"incident" reads a rule\'s node half; a fixed set is read "induced" or "listed".', {
            reading: value.reading,
        });
    }

    if (value.edges === undefined) {
        return;
    }

    if (!Array.isArray(value.edges)) {
        throw bad("A fixed set's edges are a list of edge members.", { edges: value.edges });
    }

    for (const member of value.edges) {
        checkEdgeMember(member, walker);
    }
}

/**
 * Check a rule definition.
 * @param value - The candidate, whose kind is "rule".
 * @param walker - The pass.
 */
function checkRule(value: Loose, walker: Walker): void {
    walker.fields(value, "rule", DEFINITION_FIELDS.rule);
    checkReading(value.reading);

    if (typeof value.where === "string") {
        checkQuery(value.where, "A rule");
    } else {
        checkTree(value.where, walker);
    }

    // Load mode keeps this form: a stored one reads invalid instead of failing the load.
    if (walker.mode === "door" && value.reading === "induced" && speaksEdges(value.where)) {
        throw inducedEdgeLeaf();
    }
}

/**
 * Check a path definition.
 * @param value - The candidate, whose kind is "path".
 * @param walker - The pass.
 */
function checkPath(value: Loose, walker: Walker): void {
    walker.fields(value, "path", DEFINITION_FIELDS.path);
    checkIds(value.nodes, "A path's nodes");

    const nodes = value.nodes as readonly unknown[];
    if (nodes.length === 0) {
        throw bad("A path has at least one node; one node is a path of length zero.");
    }

    if (value.directed !== undefined && typeof value.directed !== "boolean") {
        throw bad("A path's directed is true or false.", { directed: value.directed });
    }

    if (value.edges === undefined) {
        return;
    }

    if (!Array.isArray(value.edges) || value.edges.length !== nodes.length - 1) {
        throw bad(`A path of ${nodes.length} nodes names ${nodes.length - 1} steps' edges, one per step.`, {
            edges: value.edges,
        });
    }

    (value.edges as readonly unknown[]).forEach((step, i) => {
        checkPathStep(step, nodes[i], nodes[i + 1], i, walker);
    });
}

/**
 * Check one path step's edge group: null, one edge member, or a non-empty list of them, each
 * joining the step's two nodes.
 * @param step - The step's edges.
 * @param from - The step's first node.
 * @param to - The step's second node.
 * @param index - The step's index.
 * @param walker - The pass.
 */
function checkPathStep(step: unknown, from: unknown, to: unknown, index: number, walker: Walker): void {
    if (step === null) {
        return;
    }

    if (Array.isArray(step) && step.length === 0) {
        throw bad("A path step's edge group names at least one edge; null means every edge of the pair.");
    }

    for (const member of Array.isArray(step) ? step : [step]) {
        checkEdgeMember(member, walker);
        checkStepEnds(member as EdgeMember, from, to, index, walker);
    }
}

/**
 * Refuse a path step edge that does not join the step's two nodes, in either order (a `directed`
 * path walks only the forward one, and the resolver reads a backward one as missing). Door mode
 * only: a stored path keeps what it holds.
 * @param member - A checked edge member.
 * @param from - The step's first node.
 * @param to - The step's second node.
 * @param step - The step's index.
 * @param walker - The walk, for its mode.
 * @throws `E_BAD_COMMAND` for an edge joining another pair.
 */
function checkStepEnds(member: EdgeMember, from: unknown, to: unknown, step: number, walker: Walker): void {
    const joins = (member.source === from && member.target === to) || (member.source === to && member.target === from);
    if (walker.mode === "door" && !joins) {
        throw bad(
            `A path's step ${step} names an edge from "${String(member.source)}" to "${String(member.target)}", which does not join its nodes.`,
            {
                step,
                edge: member,
                nodes: [from, to],
            },
        );
    }
}

/**
 * Check a set definition and return its canonical form.
 *
 * Door mode: anything malformed, and any kind or field this element does not know or has only
 * reserved, is refused. Edge members must be in stable form; a write door that accepts a session
 * edge id converts it before calling this.
 * @param value - The candidate definition, from any source.
 * @returns The canonical definition.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND`. `details.reason` is `"induced-edge-leaf"`
 * for a rule read `induced` that holds an edge leaf; a reserved field is named in `details.field`.
 */
export function parseSetDefinition(value: unknown): SetDefinition {
    check(value, "door");

    return canonicalSetDefinition(value as SetDefinition);
}

/**
 * Check a stored set definition, keeping what this element does not know.
 *
 * Internal: the loader's mode. A malformed node of a known kind is still refused.
 * @param value - The stored definition.
 * @returns The canonical definition, and when it holds anything unknown or reserved, the first
 * such kind or field (`<node>.<field>` for a field).
 * @throws A `GraphtyError` with code `E_BAD_COMMAND` for a malformed known node.
 */
export function loadSetDefinition(value: unknown): { definition: SetDefinition; opaque?: { first: string } } {
    const { first } = check(value, "load");
    const definition = canonicalSetDefinition(value as SetDefinition);

    return first === undefined ? { definition } : { definition, opaque: { first } };
}

/**
 * Check a rule tree in door mode, as the visibility filter's door does for the leaves it shares
 * with rule sets. Internal.
 * @param value - The candidate tree.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND`.
 */
export function assertRuleTree(value: unknown): void {
    checkTree(value, new Walker("door"));
}

/**
 * Check a scope and return its canonical form: an inline definition canonical, every other form
 * as given.
 *
 * Door mode: anything malformed, unknown or reserved (the keyword `"search"`) is refused. Edge
 * members inside `{ define }` must be in stable form; a write door that accepts session edge ids
 * converts them first.
 * @param value - The candidate scope, from any source.
 * @returns The scope.
 * @throws A `GraphtyError` with code `E_BAD_COMMAND`, with `details.reason` as
 * {@link parseSetDefinition} gives it for an inline definition.
 */
export function parseScope(value: unknown): Scope {
    checkScope(value, new Walker("door"));

    return isObject(value) && value.define !== undefined
        ? Object.freeze({ define: canonicalSetDefinition(value.define as SetDefinition) })
        : (value as Scope);
}

/**
 * A write door's value with every edge reference inside an inline definition passed through
 * `stable` (a session edge id becomes its stable member; an object member is handed over as
 * given, for the door to canonicalise), at any depth: a scope's `{ define }`, a fixed or path definition's edges, a
 * rule's tree, the `member` leaves of a rule tree and a `{ match: "member" }` selector. Everything
 * else is returned as given for the validator to judge, and a value `stable` changes nothing in is
 * returned unchanged (the same object).
 * @param value - A scope, a set definition, a rule tree or a selector, as given.
 * @param stable - The stable member of a session edge id or an object member; throws for an edge
 * the graph lacks.
 * @returns The value, stable.
 */
export function stabiliseEdgeRefs<T>(value: T, stable: (ref: string) => unknown): T {
    const walk = (node: unknown): unknown => {
        if (!isObject(node)) {
            return node;
        }

        const swap = (field: string, next: unknown): unknown =>
            next === node[field] ? node : { ...node, [field]: next };
        const each = (list: unknown, step: (item: unknown) => unknown): unknown => {
            if (!Array.isArray(list)) {
                return list;
            }

            const next = list.map(step);
            return next.every((item, i) => item === list[i]) ? list : next;
        };
        // Object members go through `stable` too, so a write door puts their ends in canonical order.
        const ref = (item: unknown): unknown =>
            typeof item === "string" || isObject(item) ? stable(item as string) : item;

        if (node.define !== undefined) {
            return swap("define", walk(node.define));
        }

        if (node.match === "member") {
            return swap("of", walk(node.of));
        }

        switch (node.kind) {
            case "fixed":
            case "path":
                return swap(
                    "edges",
                    each(node.edges, (step) => (Array.isArray(step) ? each(step, ref) : ref(step))),
                );
            case "rule":
                return swap("where", walk(node.where));
            case "member":
                return swap("of", walk(node.of));
            case "all":
            case "any":
                return swap("of", each(node.of, walk));
            case "not":
                return swap("of", walk(node.of));
            default:
                return node;
        }
    };

    return walk(value) as T;
}
