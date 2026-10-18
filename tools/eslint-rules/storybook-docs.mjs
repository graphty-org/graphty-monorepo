/**
 * storybook-docs: a story file meets the standard for user documentation
 * (design/storybook/strategy.md, sections 3 and 4.3).
 *
 * It fails when:
 *   - the meta (the default export) has no `parameters.docs.description`          (check "description")
 *   - the meta's tags say neither "autodocs" nor "!autodocs"                       (check "autodocs")
 *   - a description holds an issue number (#123), a design/ path or "1.x"         (check "description-content")
 *   - a visible story (one without "!dev") has no `parameters.docs.source.code` (or
 *     `source.transform`, which builds the code from the story's args), on itself or on the meta (check "source")
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
 * file must meet every rule at once. storybook-docs-allowlist.test.mjs fails an entry whose file is gone
 * or whose story no longer breaks that check, so a fixed story cannot keep its exemption.
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
    // storybook-docs-allowlist.test.mjs turns it off to see every violation, so it can fail a stale entry.
    if (process.env.STORYBOOK_DOCS_ALLOWLIST === "off") return {};
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

        const SOURCE_PATHS = [
            ["parameters", "docs", "source", "code"],
            ["parameters", "docs", "source", "transform"],
        ];
        /**
         * The meta's own checks.
         * @param meta - the meta object
         * @returns its tags, or UNKNOWN
         */
        const checkMeta = (meta) => {
            const metaDescription = path(meta, ["parameters", "docs", "description"]);
            if (metaDescription === MISSING) report(metaNode, "(meta)", "description");
            checkDescription(metaDescription, "(meta)");
            const metaTags = tagsOf(prop(meta, "tags"));
            if (metaTags !== UNKNOWN && !metaTags.includes("autodocs") && !metaTags.includes("!autodocs")) {
                report(metaNode, "(meta)", "autodocs");
            }
            return metaTags;
        };
        /**
         * A story's property reader. A story built by a helper call cannot be read, so its properties are
         * UNKNOWN and it passes; `Template.bind({})` is the CSF 2 form, whose properties are the
         * `Story.prop = value` assignments below it.
         * @param name - the export's name
         * @param init - the export's initializer
         * @returns (key) => the property's value, MISSING or UNKNOWN
         */
        const storyReader = (name, init) => {
            const story = resolve(init);
            const own = assigned.get(name);
            const isCall = story?.type === "CallExpression";
            const bound = isCall && story.callee.type === "MemberExpression" && story.callee.property?.name === "bind";
            return (key) => {
                if (story?.type === "ObjectExpression") return prop(story, key);
                if (own?.has(key)) return own.get(key);
                return isCall && !bound ? UNKNOWN : MISSING;
            };
        };
        /**
         * One exported story's checks.
         * @param name - the export's name
         * @param init - the export's initializer
         * @param node - where to report
         * @param meta - the meta object
         * @param metaTags - the meta's tags
         */
        const checkStory = (name, init, node, meta, metaTags) => {
            const storyProp = storyReader(name, init);
            const storyPath = (names) => {
                const first = storyProp(names[0]);
                return typeof first === "symbol" || names.length === 1 ? first : path(first, names.slice(1));
            };
            checkDescription(storyPath(["parameters", "docs", "description"]), name);

            const storyTags = tagsOf(storyProp("tags"));
            if (metaTags === UNKNOWN || storyTags === UNKNOWN) return;
            const all = [...metaTags, ...storyTags];
            if (all.lastIndexOf("!dev") > all.lastIndexOf("dev")) return; // hidden from readers

            // The code is written out (source.code) or built from the story's args (source.transform).
            const found = [...SOURCE_PATHS.map(storyPath), ...SOURCE_PATHS.map((p) => path(meta, p))];
            if (found.every((s) => s === MISSING)) report(node, name, "source");

            let play = strip(storyProp("play"));
            if (play?.type === "Property") play = play.value;
            const isFunction = play?.type === "ArrowFunctionExpression" || play?.type === "FunctionExpression";
            if (isFunction && asserts(play)) report(node, name, "play");
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
                const metaTags = checkMeta(meta);
                const exclude = tagsOf(prop(meta, "excludeStories"));
                for (const [name, init, node] of exportsList) {
                    if (name === "__namedExportsOrder" || (exclude !== UNKNOWN && exclude.includes(name))) continue;
                    checkStory(name, init, node, meta, metaTags);
                }
            },
        };
    },
};

export default rule;
