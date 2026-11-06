// @ts-check
/**
 * @file no-special-layers: code never branches on which style layer it holds.
 *
 * The owner's rule (2026-11-05): "hover is just a style on a calculated value. select is just a
 * style on a calculated value. pin is just a style on a calculated value. any layer may be deleted
 * or modified in any way. there are NO SPECIAL LAYER." This rule reports what gives such a branch
 * away:
 *
 * - `layer-name`: a comparison with "Everything", "Hovered", "Selected" or "Pinned", directly, in a
 *   `switch`, through an `.includes()`, or through a `const` holding the word;
 * - `template-id`: a read of `templateId`, or a literal starting row id ("graphty:starting-...");
 * - `kind-base`: `kind === "base"`, a `case "base"` on a kind, or an object saying `kind: "base"`;
 * - `source-by`: a comparison of a layer source's `by` with "element" or "template";
 * - `named`: any use of a name for a base, starting or protected layer (`isBaseRow`,
 *   `startingEverything`, `editableBase`, a `base` prop).
 *
 * It reads syntax only, so it cannot see a layer singled out by its position, by `locked` used to
 * mean "the element's own", or by a table of ids. `graphty-element/test/contracts/layer-equality.test.ts`
 * and the app's panel parity test exist for those.
 *
 * What exists today is listed, with a count per file, in the `lint` section of
 * `graphty/special-layers-baseline.json`; only occurrences past that count are reported. An
 * `eslint-disable` does not help: `tools/check-special-layers.mjs` runs this rule with an empty
 * baseline and inline comments off, and fails on anything the baseline does not list.
 */

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {{ file: string, rule: string, detail: string, count: number }} LintBaselineRow
 * @typedef {() => ReadonlyArray<LintBaselineRow>} ReadBaseline
 * @typedef {import("eslint").Rule.Node} Node
 * @typedef {import("eslint").Rule.RuleContext} RuleContext
 */

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BASELINE_FILE = fileURLToPath(new URL("../special-layers-baseline.json", import.meta.url));

/** The names the starting rows are given. */
const LAYER_NAMES = new Set(["Everything", "Hovered", "Selected", "Pinned"]);

/** A name for a base, starting or protected layer, at a word start of a camelCase identifier. */
const SPECIAL_NAME =
    /(?:^(?:[bB]ase|[sS]tarting|[pP]rotected|[bB]uilt[iI]n|[sS]ystem)|(?<=[a-z])(?:Base|Starting|Protected|Built[iI]n|System))(?:Rows?|Layers?|Everything)(?![a-z])|^editableBase$/;

/** A literal id of a starting row or the timeline's Ghost row. */
const TEMPLATE_LITERAL = /^graphty:(?:starting-|timeline-ghost)/;

/** The sources that mark a layer as somebody's. */
const SOURCE_BY = new Set(["element", "template"]);

/**
 * The string an expression is known to hold: a literal, a template with no holes, `x as const`, or
 * a `const` in reach holding one of those.
 * @param {RuleContext} context - the rule's context.
 * @param {any} node - the expression.
 * @returns {string | undefined} the string, or undefined.
 */
function stringOf(context, node) {
    if (node?.type === "TSAsExpression" || node?.type === "TSSatisfiesExpression") {
        return stringOf(context, node.expression);
    }
    if (node?.type === "Literal" && typeof node.value === "string") {
        return node.value;
    }
    if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
        return node.quasis[0].value.cooked;
    }
    if (node?.type !== "Identifier") {
        return undefined;
    }
    /** @type {import("eslint").Scope.Scope | null} */
    let scope = context.sourceCode.getScope(node);
    for (; scope !== null; scope = scope.upper) {
        const definition = scope.set.get(node.name)?.defs[0];
        if (definition !== undefined) {
            const { type, node: declarator, parent } = definition;
            const constant = type === "Variable" && parent?.type === "VariableDeclaration" && parent.kind === "const";
            return constant ? stringOf(context, declarator.init) : undefined;
        }
    }
    return undefined;
}

/**
 * The name a member access or plain identifier ends in.
 * @param {any} node - the expression.
 * @returns {string | undefined} the name (`kind` for both `kind` and `row.kind`).
 */
function lastName(node) {
    const inner = node?.type === "ChainExpression" ? node.expression : node;
    if (inner?.type === "Identifier") {
        return inner.name;
    }
    return inner?.type === "MemberExpression" && !inner.computed ? inner.property.name : undefined;
}

/**
 * Builds the rule.
 * @param {ReadBaseline} readBaseline - the listed exceptions, read on first use.
 * @returns {import("eslint").Rule.RuleModule} the rule.
 */
export function createRule(readBaseline) {
    /** @type {Map<string, number> | undefined} */
    let allowed;
    /**
     * How many occurrences the baseline lists.
     * @param {string} key - file, rule and detail.
     * @returns {number} the count.
     */
    const allowance = (key) => {
        allowed ??= new Map(readBaseline().map((row) => [`${row.file}|${row.rule}|${row.detail}`, row.count]));
        return allowed.get(key) ?? 0;
    };

    return {
        meta: {
            type: "problem",
            docs: { description: "Forbid code that branches on which style layer it holds" },
            schema: [],
            messages: {
                special:
                    "[{{rule}} {{detail}}] Every style layer is equal (issue #5905): " +
                    "read the layer's selector, set or a property any layer can have, never which layer it is.",
            },
        },
        create(context) {
            /** @type {{ rule: string, detail: string, node: Node }[]} */
            const found = [];
            /**
             * Notes one occurrence.
             * @param {string} rule - which of the rules.
             * @param {string} detail - the name or word it found.
             * @param {any} node - where.
             */
            const note = (rule, detail, node) => {
                found.push({ rule, detail, node });
            };
            /**
             * Judges a comparison of two expressions.
             * @param {any} left - one side.
             * @param {any} right - the other.
             * @param {any} node - where to report it.
             */
            const compared = (left, right, node) => {
                for (const [value, other] of [
                    [left, right],
                    [right, left],
                ]) {
                    const text = stringOf(context, value);
                    if (text !== undefined && LAYER_NAMES.has(text)) {
                        note("layer-name", text, node);
                    } else if (text === "base" && lastName(other) === "kind") {
                        note("kind-base", "kind", node);
                    } else if (text !== undefined && SOURCE_BY.has(text) && lastName(other) === "by") {
                        note("source-by", text, node);
                    }
                }
            };
            /**
             * Judges an identifier wherever it appears; an import alone does nothing.
             * @param {any} node - the identifier.
             */
            const named = (node) => {
                if (SPECIAL_NAME.test(node.name) && !String(node.parent?.type).startsWith("Import")) {
                    note("named", node.name, node);
                }
            };
            return {
                BinaryExpression(node) {
                    if (["===", "!==", "==", "!="].includes(node.operator)) {
                        compared(node.left, node.right, node);
                    }
                },
                SwitchCase(node) {
                    const { parent } = node;
                    if (node.test !== null && parent.type === "SwitchStatement") {
                        compared(parent.discriminant, node.test, node);
                    }
                },
                CallExpression(node) {
                    const { callee } = node;
                    if (callee.type !== "MemberExpression" || lastName(callee) !== "includes") {
                        return;
                    }
                    const words = callee.object.type === "ArrayExpression" ? callee.object.elements : node.arguments;
                    for (const word of words) {
                        const text = stringOf(context, word);
                        if (text !== undefined && LAYER_NAMES.has(text)) {
                            note("layer-name", text, node);
                        }
                    }
                },
                MemberExpression(node) {
                    const key = node.computed ? stringOf(context, node.property) : lastName(node);
                    const parent = /** @type {any} */ (node.parent);
                    const written = parent.type === "AssignmentExpression" && parent.left === node;
                    if (key === "templateId" && !written) {
                        note("template-id", "templateId", node);
                    }
                },
                Property(node) {
                    const parent = /** @type {any} */ (node).parent;
                    const key = lastName(node.key);
                    if (key === "templateId" && parent.type === "ObjectPattern") {
                        note("template-id", "templateId", node);
                    } else if (key === "kind" && parent.type === "ObjectExpression") {
                        if (stringOf(context, node.value) === "base") {
                            note("kind-base", "kind", node);
                        }
                    }
                },
                Literal(node) {
                    if (typeof node.value === "string" && TEMPLATE_LITERAL.test(node.value)) {
                        note("template-id", node.value, node);
                    }
                },
                Identifier: named,
                JSXIdentifier(/** @type {any} */ node) {
                    named(node);
                    if (node.name === "base" && node.parent.type === "JSXAttribute") {
                        note("named", "base", node);
                    }
                },
                "Program:exit"() {
                    const file = relative(ROOT, context.filename).split("\\").join("/");
                    /** @type {Map<string, number>} */
                    const seen = new Map();
                    for (const { rule, detail, node } of found) {
                        const key = `${file}|${rule}|${detail}`;
                        const count = (seen.get(key) ?? 0) + 1;
                        seen.set(key, count);
                        if (count > allowance(key)) {
                            context.report({ node, messageId: "special", data: { rule, detail } });
                        }
                    }
                },
            };
        },
    };
}

export default createRule(
    () => /** @type {{ lint: LintBaselineRow[] }} */ (JSON.parse(readFileSync(BASELINE_FILE, "utf8"))).lint,
);
