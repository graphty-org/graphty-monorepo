// @ts-check
/**
 * @file screen-state-declared: every piece of React component state says what a reload does to it.
 *
 * The workspace store's reload table (ON_RELOAD in src/workspace/state/store.ts) sees only store
 * fields. State a component holds in `useState` or `useReducer` is invisible to it, and a reload
 * (Safari ends a background tab and loads it again) drops all of it: the data selection workspace
 * was lost that way (issue #9655). So every `useState` and `useReducer` call needs a comment on the
 * lines just above it:
 *
 *     // on reload: fresh: <kind>: <why>     a kind from src/workspace/state/fresh-kinds.json
 *     // on reload: gap #<issue>: <why>      reader-made state that should come back, tracked by that issue
 *
 * "kept" is refused: component state cannot be kept. Move it to the workspace store and classify
 * it in ON_RELOAD, or to graphty-element if it is graph data.
 *
 * State declared before this rule is counted per file in `graphty/screen-state-baseline.json`;
 * only calls past a file's count are reported. eslint-rules/__tests__/screen-state-declared.test.ts
 * runs the rule over graphty/src with inline comments off, so an eslint-disable hides nothing, and
 * fails when a file's count drops below its baseline until the baseline is lowered.
 *
 * ponytail: `useRef` holding reader state is not covered; add it when one is found.
 */

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BASELINE_FILE = fileURLToPath(new URL("../screen-state-baseline.json", import.meta.url));
const KINDS_FILE = fileURLToPath(new URL("../src/workspace/state/fresh-kinds.json", import.meta.url));

/** The hooks that hold component state. */
const HOOKS = new Set(["useState", "useReducer"]);

/** A declaration, in the comment text. */
const DECLARED = /on reload:\s*(?:(kept)\b|fresh:\s*([a-z ]+?):\s*\S|gap #\d+:\s*\S)/;

/**
 * The hook a call is, or undefined: `useState(...)` or `React.useState(...)`.
 * @param {any} callee - the call's callee.
 * @returns {string | undefined} the hook's name.
 */
function hookOf(callee) {
    if (callee.type === "Identifier") {
        return HOOKS.has(callee.name) ? callee.name : undefined;
    }
    if (callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier") {
        return HOOKS.has(callee.property.name) ? callee.property.name : undefined;
    }
    return undefined;
}

/**
 * The statement a node sits in, whose leading comments declare it.
 * @param {any} node - the call.
 * @returns {any} the statement (or the node, when none is found).
 */
function statementOf(node) {
    let at = node;
    while (at.parent !== undefined && at.parent !== null) {
        const { type } = at.parent;
        if (type === "BlockStatement" || type === "Program" || type === "StaticBlock") {
            return at;
        }
        at = at.parent;
    }
    return node;
}

/**
 * Builds the rule.
 * @param {() => Readonly<Record<string, number>>} readBaseline - per-file counts of undeclared calls allowed.
 * @param {() => ReadonlyArray<string>} readKinds - the kinds of state allowed to start fresh.
 * @returns {import("eslint").Rule.RuleModule} the rule.
 */
export function createRule(readBaseline, readKinds) {
    /** @type {Readonly<Record<string, number>> | undefined} */
    let baseline;
    /** @type {ReadonlyArray<string> | undefined} */
    let kinds;
    return {
        meta: {
            type: "problem",
            docs: { description: "Require every useState and useReducer to say what a reload does to it" },
            schema: [],
            messages: {
                undeclared:
                    "Say what a reload does to this {{hook}} (issue #9655): add a comment above it, " +
                    '"// on reload: fresh: <kind>: <why>" (a kind from src/workspace/state/fresh-kinds.json) ' +
                    'or "// on reload: gap #<issue>: <why>".',
                kept:
                    "Component state cannot be kept across a reload: move it to the workspace store and classify it " +
                    "in ON_RELOAD, or to graphty-element if it is graph data.",
                kind: 'Unknown kind "{{kind}}": fresh-kinds.json lists {{kinds}}.',
            },
        },
        create(context) {
            /** @type {any[]} */
            const undeclared = [];
            return {
                CallExpression(node) {
                    const hook = hookOf(node.callee);
                    if (hook === undefined) {
                        return;
                    }
                    const text = context.sourceCode
                        .getCommentsBefore(statementOf(node))
                        .map((comment) => comment.value)
                        .join("\n");
                    const found = DECLARED.exec(text);
                    if (found === null) {
                        undeclared.push({ node, hook });
                        return;
                    }
                    if (found[1] !== undefined) {
                        context.report({ node, messageId: "kept" });
                        return;
                    }
                    kinds ??= readKinds();
                    if (found[2] !== undefined && !kinds.includes(found[2])) {
                        context.report({ node, messageId: "kind", data: { kind: found[2], kinds: kinds.join(", ") } });
                    }
                },
                "Program:exit"() {
                    const file = relative(ROOT, context.filename).replaceAll("\\", "/");
                    baseline ??= readBaseline();
                    const allowed = baseline[file] ?? 0;
                    undeclared.slice(allowed).forEach(({ node, hook }) => {
                        context.report({ node, messageId: "undeclared", data: { hook } });
                    });
                },
            };
        },
    };
}

export default createRule(
    () => /** @type {{ files: Record<string, number> }} */ (JSON.parse(readFileSync(BASELINE_FILE, "utf8"))).files,
    () => Object.keys(JSON.parse(readFileSync(KINDS_FILE, "utf8"))),
);
