/**
 * storybook-docs: a story file meets the standard for user documentation
 * (design/storybook/strategy.md, sections 3 and 4.3).
 *
 * It fails when:
 *   - the meta (the default export) has no `parameters.docs.description`          (check "description")
 *   - the meta's tags say neither "autodocs" nor "!autodocs"                       (check "autodocs")
 *   - a description holds an issue number (#123), a design/ path or "1.x"         (check "description-content")
 *   - a visible story (one without "!dev") has no `parameters.docs.source.code`,
 *     on itself or on the meta                                                    (check "source")
 *   - a visible story's `play` calls `expect`, or `waitFor` around a `toBe...`    (check "play")
 *
 * A visible story's play function may drive the demo; checking results belongs in a hidden twin
 * (`<Name>Interactions`, tags ["regression", "!dev", "!autodocs"]), which the storybook test
 * project still runs and visual-review still captures.
 *
 * What a file cannot show -- a meta or a story built by a function call, a spread, or tags imported
 * from another module -- is taken to pass: the rule reports only what it can see.
 *
 * The stories that broke a rule when it was added are listed in storybook-docs-allowlist.json, by
 * file (relative to the repository root), export ("(meta)" for the default export) and check. That
 * list only shrinks: remove an entry when its story is fixed, and never add one. A new story or a new
 * file must meet every rule at once.
 */

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const BANNED = [
    [/#\d+\b/, "an issue number"],
    [/\bdesign\//, "a design/ path"],
    [/\b1\.x\b/, '"1.x"'],
];
const UNKNOWN = Symbol("unknown");
const MISSING = Symbol("missing");

let allowlist;
/**
 * The allowlist, read once.
 * @returns the files, each export's checks to skip
 */
function allowed() {
    allowlist ??= JSON.parse(readFileSync(new URL("./storybook-docs-allowlist.json", import.meta.url), "utf8")).files;
    return allowlist;
}

/**
 * The expression under TypeScript's `as`, `satisfies`, `<T>` and `!`.
 * @param node - an expression
 * @returns the expression inside them
 */
function strip(node) {
    while (
        node &&
        ["TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression"].includes(node.type)
    ) {
        node = node.expression;
    }
    return node;
}

/**
 * A property's name, when it has a plain one.
 * @param property - an object property
 * @returns its name, or undefined
 */
function keyName(property) {
    if (property.computed) return undefined;
    if (property.key.type === "Identifier") return property.key.name;
    if (property.key.type === "Literal") return String(property.key.value);
    return undefined;
}

/**
 * Every string in an expression (literals and template text), for the description checks.
 * @param node - an expression
 * @param out - where the strings are collected
 * @returns out
 */
function stringsIn(node, out = []) {
    if (!node || typeof node !== "object") return out;
    if (node.type === "Literal" && typeof node.value === "string") out.push(node.value);
    if (node.type === "TemplateElement") out.push(node.value.cooked ?? node.value.raw);
    for (const [key, child] of Object.entries(node)) {
        if (key === "parent") continue;
        if (Array.isArray(child)) child.forEach((c) => stringsIn(c, out));
        else if (child && typeof child.type === "string") stringsIn(child, out);
    }
    return out;
}

/**
 * Whether a node's subtree holds a node `test` accepts.
 * @param node - the subtree
 * @param test - what to look for
 * @returns true when some node passes
 */
function contains(node, test) {
    if (!node || typeof node !== "object") return false;
    if (typeof node.type === "string" && test(node)) return true;
    for (const [key, child] of Object.entries(node)) {
        if (key === "parent") continue;
        if (Array.isArray(child) ? child.some((c) => contains(c, test)) : child?.type && contains(child, test)) {
            return true;
        }
    }
    return false;
}

/**
 * The root identifier of `a.b.c(...)`, or of `a` itself.
 * @param node - a callee
 * @returns its root name, or undefined
 */
function rootName(node) {
    while (node?.type === "MemberExpression") node = node.object;
    while (node?.type === "CallExpression") node = node.callee;
    while (node?.type === "MemberExpression") node = node.object;
    return node?.type === "Identifier" ? node.name : undefined;
}

/**
 * Whether a play function asserts: an `expect(...)`, or a `waitFor` around a `toBe...`.
 * @param fn - the play function
 * @returns true when it asserts
 */
function asserts(fn) {
    return contains(fn.body, (n) => {
        if (n.type !== "CallExpression") return false;
        const callee = n.callee;
        if (callee.type === "Identifier" && callee.name === "expect") return true;
        if (callee.type === "MemberExpression" && rootName(callee) === "expect") return true;
        const name = callee.type === "Identifier" ? callee.name : callee.property?.name;
        return (
            name === "waitFor" &&
            contains({ type: "Args", args: n.arguments }, (m) =>
                [m.name, m.property?.name].some((s) => typeof s === "string" && s.startsWith("toBe")),
            )
        );
    });
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: {
            description: "Hold a story file to the standard for user documentation (design/storybook/strategy.md)",
        },
        schema: [],
        messages: {
            description:
                "{{where}}: the meta has no parameters.docs.description; say what the reader sees and how to get it.",
            autodocs:
                '{{where}}: the meta\'s tags name neither "autodocs" nor "!autodocs"; of the files that share a title or an id exactly one says "autodocs", and a regression or internal file says ["regression" or "internal", "!dev", "!autodocs"].',
            "description-content":
                "{{where}}: a description holds {{what}}; that belongs in a code comment or a regression story, not in reader text.",
            source: "{{where}}: a visible story needs parameters.docs.source.code, the markup or code a consumer would write for this picture.",
            play: '{{where}}: a visible story\'s play function asserts (expect, or waitFor around toBe); keep the demonstration here and move the checks to a hidden twin "{{where}}Interactions" tagged ["regression", "!dev", "!autodocs"].',
        },
    },
    create(context) {
        const file = relative(ROOT, context.filename).split("\\").join("/");
        const skip = allowed()[file] ?? {};
        const consts = new Map(); // module-level const name -> init
        const exportsList = []; // [name, init]
        const assigned = new Map(); // story name -> Map(prop -> value) from `Story.prop = value`
        let metaNode;

        const resolve = (node, depth = 0) => {
            node = strip(node);
            if (node?.type === "Identifier" && consts.has(node.name) && depth < 5) {
                return resolve(consts.get(node.name), depth + 1);
            }
            return node;
        };
        /**
         * One property of an object expression.
         * @param obj - the object
         * @param name - the property
         * @returns its value, MISSING, or UNKNOWN when the object cannot be read
         */
        const prop = (obj, name) => {
            obj = resolve(obj);
            if (obj?.type !== "ObjectExpression") return UNKNOWN;
            for (const p of obj.properties) {
                if (p.type === "Property" && keyName(p) === name) return p.method ? p : p.value;
            }
            return obj.properties.some((p) => p.type === "SpreadElement") ? UNKNOWN : MISSING;
        };
        const path = (obj, names) => {
            let node = obj;
            for (const name of names) {
                node = prop(node, name);
                if (typeof node === "symbol") return node;
            }
            return node;
        };
        /**
         * A tags array's literal values.
         * @param node - the tags expression, or MISSING
         * @returns the tags, UNKNOWN when some are not literals, or [] when there are none
         */
        const tagsOf = (node) => {
            if (node === MISSING) return [];
            const list = resolve(node);
            if (list?.type !== "ArrayExpression") return UNKNOWN;
            const out = [];
            for (const el of list.elements) {
                if (el?.type !== "Literal" || typeof el.value !== "string") return UNKNOWN;
                out.push(el.value);
            }
            return out;
        };
        const report = (node, where, check, data = {}) => {
            if ((skip[where] ?? []).includes(check)) return;
            context.report({ node, messageId: check, data: { where, ...data } });
        };
        const checkDescription = (node, where) => {
            if (typeof node === "symbol") return;
            const text = stringsIn(node).join("\n");
            for (const [pattern, what] of BANNED) {
                if (pattern.test(text)) report(node, where, "description-content", { what });
            }
        };

        return {
            "Program > VariableDeclaration > VariableDeclarator"(node) {
                if (node.id.type === "Identifier" && node.init) consts.set(node.id.name, node.init);
            },
            ExportNamedDeclaration(node) {
                const decl = node.declaration;
                if (decl?.type === "VariableDeclaration") {
                    for (const d of decl.declarations) {
                        if (d.id.type === "Identifier") {
                            exportsList.push([d.id.name, d.init, d]);
                            if (d.init) consts.set(d.id.name, d.init);
                        }
                    }
                } else if (decl?.type === "FunctionDeclaration" && decl.id) {
                    exportsList.push([decl.id.name, decl, decl]);
                }
            },
            ExportDefaultDeclaration(node) {
                metaNode = node.declaration;
            },
            "Program > ExpressionStatement > AssignmentExpression"(node) {
                const left = node.left;
                if (left.type === "MemberExpression" && left.object.type === "Identifier" && !left.computed) {
                    if (!assigned.has(left.object.name)) assigned.set(left.object.name, new Map());
                    assigned.get(left.object.name).set(left.property.name, node.right);
                }
            },
            "Program:exit"() {
                const meta = resolve(metaNode);
                if (meta?.type !== "ObjectExpression") return; // no meta, or one built by a call
                const metaDescription = path(meta, ["parameters", "docs", "description"]);
                if (metaDescription === MISSING) report(metaNode, "(meta)", "description");
                checkDescription(metaDescription, "(meta)");
                const metaTags = tagsOf(prop(meta, "tags"));
                if (metaTags !== UNKNOWN && !metaTags.includes("autodocs") && !metaTags.includes("!autodocs")) {
                    report(metaNode, "(meta)", "autodocs");
                }
                const metaSource = path(meta, ["parameters", "docs", "source", "code"]);

                const exclude = tagsOf(prop(meta, "excludeStories"));
                for (const [name, init, node] of exportsList) {
                    if (name === "__namedExportsOrder" || (exclude !== UNKNOWN && exclude.includes(name))) continue;
                    const story = resolve(init);
                    const own = assigned.get(name);
                    const storyProp = (key) => {
                        if (story?.type === "ObjectExpression") return prop(story, key);
                        return own?.has(key) ? own.get(key) : MISSING;
                    };
                    const storyPath = (names) => {
                        const first = storyProp(names[0]);
                        return typeof first === "symbol" || names.length === 1 ? first : path(first, names.slice(1));
                    };

                    checkDescription(storyPath(["parameters", "docs", "description"]), name);

                    const storyTags = tagsOf(storyProp("tags"));
                    if (metaTags === UNKNOWN || storyTags === UNKNOWN) continue;
                    const all = [...metaTags, ...storyTags];
                    if (all.lastIndexOf("!dev") > all.lastIndexOf("dev")) continue; // hidden from readers

                    const source = storyPath(["parameters", "docs", "source", "code"]);
                    if (source === MISSING && metaSource === MISSING) report(node, name, "source");

                    let play = strip(storyProp("play"));
                    if (play?.type === "Property") play = play.value;
                    if (
                        (play?.type === "ArrowFunctionExpression" || play?.type === "FunctionExpression") &&
                        asserts(play)
                    ) {
                        report(node, name, "play");
                    }
                }
            },
        };
    },
};

export default rule;
