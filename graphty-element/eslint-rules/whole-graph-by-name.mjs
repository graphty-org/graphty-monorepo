/**
 * whole-graph-by-name: the whole graph, hidden nodes included, is read only by name, and only where
 * the owner's agreed cases allow it (design/working-graph/design.md section 9, "Fences").
 *
 * Every reader reads the working graph: what the filters leave shown. A reader that must see
 * everything -- saving the project file, export All, a filter's own conditions, a "Full graph"
 * choice, a search allowed to find hidden items -- names the whole graph with `wholeGraph()`
 * (src/session/working/graphs.ts), in a function `working-graph-whole-readers.json` lists under
 * `accessors` with its case and reason. This rule reports, outside the files that own the store:
 *
 * - a call of `wholeGraph()` (or any other use of the name) in a function the list does not name;
 * - a call of `asWorkingSnapshot()`, which marks a snapshot as what a reader reads, outside the
 *   files that build the working graph (`mints`);
 * - a call of `<x>.getSnapshot()` with no arguments, the store's own accessor (a receiver whose
 *   name says stats or status is another class's snapshot and is not matched);
 * - a call of `<x>.data.snapshot()` or `data.snapshot()`, the session's public whole-graph reader.
 *
 * `wholeGraph` and `asWorkingSnapshot` are matched as imported from `working/graphs`, whatever a
 * file names them locally. A call is placed by the class member it is in (`StaticLayoutEngine.#load`),
 * else by the top-level function or variable that holds it; `<module>` outside any.
 */

/** A receiver whose name says it is another kind of snapshot: the stats or the AI status. */
const OTHER_SNAPSHOTS = /stats|status/i;

/**
 * The name of a property or method key.
 * @param key - The key.
 * @returns The name.
 */
function keyName(key) {
    if (key.type === "Identifier") {
        return key.name;
    }
    if (key.type === "PrivateIdentifier") {
        return `#${key.name}`;
    }
    return key.type === "Literal" ? String(key.value) : undefined;
}

/**
 * Where a node sits, as the allowlist spells it: its class member, or its top-level function.
 * @param node - The node.
 * @returns The name.
 */
export function enclosingName(node) {
    let outer = "<module>";
    for (let p = node.parent; p; p = p.parent) {
        if (p.type === "MethodDefinition" || p.type === "PropertyDefinition") {
            const owner = p.parent?.parent;
            const member = keyName(p.key) ?? "<computed>";
            return owner?.id?.name ? `${owner.id.name}.${member}` : member;
        }
        const top = p.parent?.type === "Program" || p.parent?.type === "ExportNamedDeclaration";
        if (p.type === "FunctionDeclaration" && p.id && (top || p.parent?.parent?.type === "Program")) {
            outer = p.id.name;
        } else if (p.type === "VariableDeclaration" && top && p.declarations[0]?.id.type === "Identifier") {
            outer = p.declarations[0].id.name;
        }
    }
    return outer;
}

/**
 * The name of the class a node sits in.
 * @param node - The node.
 * @returns The name, or "".
 */
function className(node) {
    for (let p = node.parent; p; p = p.parent) {
        if (p.type === "ClassDeclaration" || p.type === "ClassExpression") {
            return p.id?.name ?? "";
        }
    }
    return "";
}

/**
 * The source text a receiver ends with, for the stats and status exclusion.
 * @param node - The receiver.
 * @returns Its last name, or "".
 */
function lastName(node) {
    if (node.type === "ThisExpression") {
        return className(node);
    }
    if (node.type === "Identifier") {
        return node.name;
    }
    if (node.type === "MemberExpression" && !node.computed) {
        return keyName(node.property) ?? "";
    }
    if (node.type === "CallExpression") {
        return lastName(node.callee);
    }
    if (node.type === "ChainExpression" || node.type === "TSNonNullExpression") {
        return lastName(node.expression);
    }
    return "";
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: { description: "Read the working graph; name the whole graph only where an agreed case allows it" },
        schema: [
            {
                type: "object",
                properties: {
                    accessors: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: { file: { type: "string" }, function: { type: "string" } },
                            required: ["file", "function"],
                        },
                    },
                    owners: { type: "array", items: { type: "string" } },
                    mints: { type: "array", items: { type: "string" } },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            whole: "{{what}} reads the whole graph, hidden nodes included, in {{where}}. Read the working graph (what the filters show); a reader in one of the agreed cases names it with wholeGraph() and is listed under accessors in graphty-element/working-graph-whole-readers.json.",
            mint: "asWorkingSnapshot() marks a snapshot as what a reader reads; only the working graph and a run's scoped input make one ({{where}} is not one of them).",
        },
    },
    create(context) {
        const options = context.options[0] ?? {};
        const file = context.filename.replaceAll("\\", "/");
        const inFile = (path) => file.endsWith(`/${path}`) || file === path;
        if ((options.owners ?? []).some(inFile)) {
            return {};
        }

        const allowed = new Set(
            (options.accessors ?? []).filter((entry) => inFile(entry.file)).map((entry) => entry.function),
        );
        const mints = (options.mints ?? []).some(inFile);
        const report = (node, what) => {
            const where = enclosingName(node);
            if (!allowed.has(where)) {
                context.report({ node, messageId: "whole", data: { what, where } });
            }
        };

        // The local names this file imports the two from `working/graphs` under.
        const names = new Map();

        return {
            ImportDeclaration(node) {
                if (!/\/working\/graphs(\.[cm]?[jt]s)?$/.test(String(node.source.value))) {
                    return;
                }
                for (const specifier of node.specifiers) {
                    if (specifier.type === "ImportSpecifier") {
                        names.set(specifier.local.name, keyName(specifier.imported));
                    }
                }
            },
            Identifier(node) {
                const { parent } = node;
                const imported = names.get(node.name);
                if (imported === undefined || parent.type === "ImportSpecifier") {
                    return;
                }
                if (parent.type === "MemberExpression" && parent.property === node && !parent.computed) {
                    return;
                }
                if (parent.type === "Property" && parent.key === node && !parent.computed && !parent.shorthand) {
                    return;
                }
                if (imported === "wholeGraph") {
                    report(node, "wholeGraph()");
                } else if (imported === "asWorkingSnapshot" && !mints) {
                    context.report({ node, messageId: "mint", data: { where: enclosingName(node) } });
                }
            },
            CallExpression(node) {
                const { callee } = node;
                if (callee.type !== "MemberExpression" || callee.computed || node.arguments.length > 0) {
                    return;
                }
                const name = keyName(callee.property);
                if (name === "getSnapshot" && !OTHER_SNAPSHOTS.test(lastName(callee.object))) {
                    report(node, "getSnapshot()");
                } else if (name === "snapshot" && lastName(callee.object) === "data") {
                    report(node, "data.snapshot()");
                }
            },
        };
    },
};

export default rule;
