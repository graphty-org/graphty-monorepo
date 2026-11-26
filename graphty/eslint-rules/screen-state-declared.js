// @ts-check
/**
 * @file screen-state-declared: every piece of React component state says what a reload does to it.
 *
 * The workspace store's reload table (ON_RELOAD in src/workspace/state/store.ts) sees only store
 * fields. State a component holds in `useState` or `useReducer` is invisible to it, and a reload
 * (Safari ends a background tab and loads it again) drops all of it: the data selection workspace
 * was lost that way (issue #9655). So every `useState`, `useReducer`, `useSyncExternalStore` and
 * Mantine `useDisclosure` call (by any local name it is imported under), a class component's
 * `state`, and every uncontrolled input (`defaultValue`, `defaultChecked`: the reader's text is held
 * in the page), needs a comment just before it:
 *
 *     // on reload: fresh: <kind>: <why>     a kind from src/workspace/state/fresh-kinds.json
 *     // on reload: gap #<issue>: <why>      reader-made state that should come back, tracked by that issue
 *
 * "kept" is refused: component state cannot be kept. Move it to the workspace store and classify
 * it in ON_RELOAD, or to graphty-element if it is graph data.
 *
 * State declared before this rule is excused by name in `graphty/screen-state-baseline.json` (the
 * name a hook's value is held under, or `<Component>.defaultValue`), so a new undeclared call is
 * reported even where an old one was removed; issue #9702 tracks sorting them.
 * eslint-rules/__tests__/screen-state-declared.test.ts runs the rule over graphty/src with inline
 * comments off, so an eslint-disable hides nothing, fails when a baseline name is no longer found,
 * and pins the number of `gap #` declarations so it only goes down.
 *
 * The rule checks that each declaration is there and well formed, not that it is true: a reload
 * test (graphty/src/test/reload.tsx) is what checks what comes back.
 *
 * ponytail: `useRef` is not covered: a ref never redraws, so what a reader sees is held in state
 * or the page. Add it when a ref is found holding what the reader made.
 */

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BASELINE_FILE = fileURLToPath(new URL("../screen-state-baseline.json", import.meta.url));
const KINDS_FILE = fileURLToPath(new URL("../src/workspace/state/fresh-kinds.json", import.meta.url));

/** The hooks that hold component state, by the name their module exports them under. */
const HOOKS = new Set(["useState", "useReducer", "useSyncExternalStore", "useDisclosure"]);

/** The props that leave an input's value to the page (an uncontrolled input). */
const UNCONTROLLED = new Set(["defaultValue", "defaultChecked"]);

/** A declaration, in the comment text. */
const DECLARED = /on reload:\s*(?:(kept)\b|fresh:\s*([a-z ]+?):\s*\S|gap #\d+:\s*\S)/;

/**
 * The hook a call is, or undefined: `useState(...)`, `React.useState(...)`, or a local name an
 * import gave it (`import { useState as useLocal } from "react"`).
 * @param {any} callee - the call's callee.
 * @param {ReadonlyMap<string, string>} aliases - local names of imported hooks.
 * @returns {string | undefined} the hook's name.
 */
function hookOf(callee, aliases) {
    if (callee.type === "Identifier") {
        return aliases.get(callee.name) ?? (HOOKS.has(callee.name) ? callee.name : undefined);
    }
    if (callee.type === "MemberExpression" && !callee.computed && callee.property.type === "Identifier") {
        return HOOKS.has(callee.property.name) ? callee.property.name : undefined;
    }
    return undefined;
}

/**
 * The name a hook's value is held under: the first name of `const [x, setX] = ...` or `const x =
 * ...`, else "?".
 * @param {any} node - the call.
 * @returns {string} the name.
 */
function heldName(node) {
    const { parent } = node;
    if (parent?.type !== "VariableDeclarator") {
        return "?";
    }
    const { id } = parent;
    if (id.type === "Identifier") {
        return id.name;
    }
    const first = id.type === "ArrayPattern" ? id.elements[0] : null;
    return first?.type === "Identifier" ? first.name : "?";
}

/**
 * A JSX element's name as written (`TextInput`, `Tabs.Panel`).
 * @param {any} name - the opening element's name.
 * @returns {string} the name.
 */
function jsxName(name) {
    if (name.type === "JSXMemberExpression") {
        return `${jsxName(name.object)}.${name.property.name}`;
    }
    return name.type === "JSXNamespacedName" ? `${name.namespace.name}:${name.name.name}` : name.name;
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
 * Builds the rule. Its option `{ baseline, kinds }`, when given, replaces both readers: the ESLint
 * config passes the two files' contents that way, so a change to either is a change of config and
 * lints every file again under `eslint --cache`.
 * @param {() => Readonly<Record<string, ReadonlyArray<string>>>} readBaseline - per-file names of undeclared state allowed.
 * @param {() => ReadonlyArray<string>} readKinds - the kinds of state allowed to start fresh.
 * @param {(file: string, name: string) => void} [heard] - told of each undeclared piece of state, excused or not.
 * @returns {import("eslint").Rule.RuleModule} the rule.
 */
export function createRule(readBaseline, readKinds, heard) {
    /** @type {Readonly<Record<string, ReadonlyArray<string>>> | undefined} */
    let baseline;
    /** @type {ReadonlyArray<string> | undefined} */
    let kinds;
    return {
        meta: {
            type: "problem",
            docs: { description: "Require every piece of component state to say what a reload does to it" },
            schema: [
                {
                    type: "object",
                    properties: { baseline: { type: "object" }, kinds: { type: "array", items: { type: "string" } } },
                    additionalProperties: false,
                },
            ],
            messages: {
                undeclared:
                    "Say what a reload does to {{name}} ({{hook}}, issue #9655): add a comment just before it, " +
                    '"// on reload: fresh: <kind>: <why>" (a kind from src/workspace/state/fresh-kinds.json) ' +
                    'or "// on reload: gap #<issue>: <why>".',
                kept:
                    "Component state cannot be kept across a reload: move it to the workspace store and classify it " +
                    "in ON_RELOAD, or to graphty-element if it is graph data.",
                kind: 'Unknown kind "{{kind}}": fresh-kinds.json lists {{kinds}}.',
            },
        },
        create(context) {
            /** @type {{ baseline?: Record<string, string[]>, kinds?: string[] } | undefined} */
            const given = context.options[0];
            /** @type {Map<string, string>} */
            const aliases = new Map();
            /** @type {{ node: any, hook: string, name: string }[]} */
            const undeclared = [];
            /**
             * Checks one piece of state's declaration.
             * @param {any} node - where it is reported.
             * @param {any} declared - the node whose leading comments declare it.
             * @param {string} hook - what holds it.
             * @param {string} name - its name in the baseline.
             */
            const check = (node, declared, hook, name) => {
                const text = context.sourceCode
                    .getCommentsBefore(declared)
                    .map((comment) => comment.value)
                    .join("\n");
                const found = DECLARED.exec(text);
                if (found === null) {
                    undeclared.push({ node, hook, name });
                    return;
                }
                if (found[1] !== undefined) {
                    context.report({ node, messageId: "kept" });
                    return;
                }
                const known = given?.kinds ?? (kinds ??= readKinds());
                if (found[2] !== undefined && !known.includes(found[2])) {
                    context.report({ node, messageId: "kind", data: { kind: found[2], kinds: known.join(", ") } });
                }
            };
            return {
                ImportSpecifier(node) {
                    const imported =
                        node.imported.type === "Identifier" ? node.imported.name : String(node.imported.value);
                    if (HOOKS.has(imported) && node.local.name !== imported) {
                        aliases.set(node.local.name, imported);
                    }
                },
                CallExpression(node) {
                    const hook = hookOf(node.callee, aliases);
                    if (hook !== undefined) {
                        check(node, statementOf(node), hook, heldName(node));
                    }
                },
                // A class component's state (`state = {...}`).
                PropertyDefinition(node) {
                    if (!node.static && node.key.type === "Identifier" && node.key.name === "state") {
                        check(node, node, "class state", "state");
                    }
                },
                /**
                 * An uncontrolled input's prop.
                 * @param {any} node - the attribute (a JSX node, not in ESLint's own node types).
                 */
                JSXAttribute(node) {
                    if (node.name.type === "JSXIdentifier" && UNCONTROLLED.has(node.name.name)) {
                        const element = jsxName(node.parent.name);
                        check(node, node, node.name.name, `${element}.${node.name.name}`);
                    }
                },
                "Program:exit"() {
                    const file = relative(ROOT, context.filename).replaceAll("\\", "/");
                    const excused = given?.baseline ?? (baseline ??= readBaseline());
                    // Each baseline name excuses one undeclared piece of state under that name.
                    const left = [...(excused[file] ?? [])];
                    for (const { node, hook, name } of undeclared) {
                        heard?.(file, name);
                        const at = left.indexOf(name);
                        if (at === -1) {
                            context.report({ node, messageId: "undeclared", data: { hook, name } });
                        } else {
                            left.splice(at, 1);
                        }
                    }
                },
            };
        },
    };
}

/**
 * The baseline's names per file.
 * @returns {Readonly<Record<string, ReadonlyArray<string>>>} the names.
 */
export function readBaselineFile() {
    return /** @type {{ files: Record<string, string[]> }} */ (JSON.parse(readFileSync(BASELINE_FILE, "utf8"))).files;
}

/**
 * The kinds of state allowed to start fresh.
 * @returns {ReadonlyArray<string>} the kinds.
 */
export function readKindsFile() {
    return Object.keys(JSON.parse(readFileSync(KINDS_FILE, "utf8")));
}

export default createRule(readBaselineFile, readKindsFile);
