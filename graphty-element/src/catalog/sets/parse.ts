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
 * dropped a rule's `within` or an item key's `op` would resolve silently wrong members, and would
 * lose the field on the next save. The whole definition is the opaque unit
 * (design/sets/sets-design.md section 12.5): it round-trips value-identical, resolves to nothing
 * and reads `unresolvable`.
 *
 * One walker serves both modes, so the two can never disagree about what a known node is.
 *
 * Reserved fields -- names a later release will give a meaning, refused at the doors until then:
 * `weights` on a fixed set, `within` on a rule, `key` and `dataSource` on an edge member, `graph` on
 * `{ set }`, `percentile`, `z` and `population` on a threshold, `op` on an item key. Reserved kinds:
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
    "rule.within",
    "edgeMember.key",
    "edgeMember.dataSource",
    "set.graph",
    "search",
    "threshold.percentile",
    "threshold.z",
    "threshold.population",
    "itemKey.op",
    "itemKey.smallestNode",
    "itemKey.edges",
    "itemKey.binds",
]);

/** The scope keywords this element defines. */
const KEYWORDS = ["visible", "graph", "selection", "largest-component"];

/** Every edge reading this element knows. */
export const EDGE_READINGS: readonly EdgeReading[] = ["induced", "listed", "clipped"];
const DIRECTIONS = ["in", "out", "all"];

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
            throw bad(`${where} holds ${String(id)}, which is not a node id: an id is a string or a finite number.`, { id });
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

        if (!Number.isInteger(among) || (among as number) < 1 || !Number.isInteger(ordinal) || (ordinal as number) < 0 || (ordinal as number) >= (among as number)) {
            throw bad("An edge member's ordinal counts from 0 and is below among, a whole number from 1.", { member: value });
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
 * Check a result item: a run, a key, and optionally the execution it holds. At a door the run may
 * be a `Run` or `RunResult` handle, which the canonical form replaces by its id.
 * @param value - The candidate item.
 * @param walker - The pass.
 */
function checkItem(value: unknown, walker: Walker): void {
    if (!isObject(value)) {
        throw bad("An item leaf's item is an object with a run and a key.", { item: value });
    }

    walker.fields(value, "resultItem", ["run", "key", "execution"]);

    const run = walker.mode === "door" ? runIdOfRef(value.run) : value.run;
    if (typeof run !== "string" || run === "") {
        throw bad("An item names its run by the run's id.", { run: value.run });
    }

    if (value.execution !== undefined && (typeof value.execution !== "string" || value.execution === "")) {
        throw bad("An item's execution is the token of the execution it holds.", { execution: value.execution });
    }

    const { key } = value;
    if (!isObject(key)) {
        throw bad("An item's key is an object, such as { field: \"group\", value: 3 }.", { key });
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
    walker.fields(value, "threshold", ["kind", "path", "top", "above"]);

    if (!isValuePath(value.path)) {
        throw bad('A "threshold" leaf\'s path is "data.<field>" or "results.<run>.<field>".', { path: value.path });
    }

    // A reserved cut kept opaque on load counts as the leaf's cut.
    const reservedCut = walker.mode === "load" && (value.percentile !== undefined || value.z !== undefined);
    const cuts = [value.top, value.above].filter((cut) => cut !== undefined).length;
    if (cuts !== 1 && !(reservedCut && cuts === 0)) {
        throw bad('A "threshold" leaf has exactly one cut: top or above.', { top: value.top, above: value.above });
    }

    if (value.top !== undefined && (!Number.isInteger(value.top) || (value.top as number) < 0)) {
        throw bad('A "threshold" leaf\'s top is a whole number of elements.', { top: value.top });
    }

    if (value.above !== undefined && !isFiniteNumber(value.above)) {
        throw bad('A "threshold" leaf\'s above is a finite number.', { above: value.above });
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
            known(["attribute", "min", "max"]);
            checkQuery(value.attribute, 'A "range" leaf\'s attribute');
            checkBounds(value);

            return;
        case "categories":
            known(["attribute", "values"]);
            checkQuery(value.attribute, 'A "categories" leaf\'s attribute');

            if (!Array.isArray(value.values) || !value.values.every((entry) => typeof entry === "string")) {
                throw bad('A "categories" leaf\'s values are a list of strings.', { values: value.values });
            }

            return;
        case "degree":
            known(["min", "max", "direction"]);
            checkBounds(value);

            if (value.direction !== undefined && !DIRECTIONS.includes(value.direction as string)) {
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
        case "scope":
            known(["scope"]);
            checkScope(value.scope, walker);

            return;
        case "item":
            known(["item"]);
            checkItem(value.item, walker);

            return;
        case "threshold":
            checkThreshold(value, walker);

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
 * Whether a rule tree holds a leaf that speaks about edges: an `edges` leaf, a `scope` leaf whose
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
            return true;
        case "scope":
            return readingOfScope(node.scope, referent) !== "induced";
        case "item": {
            const item = isObject(node.item) ? node.item : {};
            const key = isObject(item.key) ? item.key : {};
            const run = runIdOfRef(item.run);

            return typeof run === "string" && typeof key.field === "string" && fieldKinds?.(`results.${run}.${key.field}`).includes("edge") === true;
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
        if (!KEYWORDS.includes(value)) {
            walker.unknown(value, "The scope keyword");
        }

        return;
    }

    if (!isObject(value)) {
        throw bad('A scope is "visible", "graph", "selection", "largest-component", { set }, { where }, { nodes } or { define }.', {
            scope: value,
        });
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
        throw bad(`A set's reading is "induced", "listed" or "clipped".`, { reading: value });
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
            walker.fields(value, "fixed", DEFINITION_FIELDS.fixed);
            checkIds(value.nodes, "A fixed set's nodes");
            checkReading(value.reading);

            if (value.edges !== undefined) {
                if (!Array.isArray(value.edges)) {
                    throw bad("A fixed set's edges are a list of edge members.", { edges: value.edges });
                }

                for (const member of value.edges) {
                    checkEdgeMember(member, walker);
                }
            }

            break;
        case "rule":
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

            break;
        case "path": {
            walker.fields(value, "path", DEFINITION_FIELDS.path);
            checkIds(value.nodes, "A path's nodes");

            const nodes = value.nodes as readonly unknown[];
            if (nodes.length === 0) {
                throw bad("A path has at least one node; one node is a path of length zero.");
            }

            if (value.directed !== undefined && typeof value.directed !== "boolean") {
                throw bad("A path's directed is true or false.", { directed: value.directed });
            }

            if (value.edges !== undefined) {
                if (!Array.isArray(value.edges) || value.edges.length !== nodes.length - 1) {
                    throw bad(`A path of ${nodes.length} nodes names ${nodes.length - 1} steps' edges, one per step.`, {
                        edges: value.edges,
                    });
                }

                (value.edges as readonly unknown[]).forEach((step, i) => {
                    if (step === null) {
                        return;
                    }

                    if (Array.isArray(step) && step.length === 0) {
                        throw bad("A path step's edge group names at least one edge; null means every edge of the pair.");
                    }

                    for (const member of Array.isArray(step) ? step : [step]) {
                        checkEdgeMember(member, walker);
                        checkStepEnds(member as EdgeMember, nodes[i], nodes[i + 1], i, walker);
                    }
                });
            }

            break;
        }
        default:
            walker.unknown(value.kind, "The set definition kind");
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
        throw bad(`A path's step ${step} names an edge from "${String(member.source)}" to "${String(member.target)}", which does not join its nodes.`, {
            step,
            edge: member,
            nodes: [from, to],
        });
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
 * rule's tree, the `scope` leaves of a rule tree and a `{ match: "scope" }` selector. Everything
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

        const swap = (field: string, next: unknown): unknown => (next === node[field] ? node : { ...node, [field]: next });
        const each = (list: unknown, step: (item: unknown) => unknown): unknown => {
            if (!Array.isArray(list)) {
                return list;
            }

            const next = list.map(step);
            return next.every((item, i) => item === list[i]) ? list : next;
        };
        // Object members go through `stable` too, so a write door puts their ends in canonical order.
        const ref = (item: unknown): unknown => (typeof item === "string" || isObject(item) ? stable(item as string) : item);

        if (node.define !== undefined) {
            return swap("define", walk(node.define));
        }

        if (node.match === "scope") {
            return swap("scope", walk(node.scope));
        }

        switch (node.kind) {
            case "fixed":
            case "path":
                return swap("edges", each(node.edges, (step) => (Array.isArray(step) ? each(step, ref) : ref(step))));
            case "rule":
                return swap("where", walk(node.where));
            case "scope":
                return swap("scope", walk(node.scope));
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
