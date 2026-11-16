/**
 * no-source-program: graphty-element and the graphty app never know which program wrote a loaded file.
 *
 * The owner's rule (2026-11-15): a file from another program is translated into graphty's generic style channels and
 * ordinary style layers by graph-io, and after the load nothing can tell what the source of the data was. All
 * per-program knowledge sits in graph-io. graph-io still reports the program it read (`ExtractedStyles.styles.source`)
 * for its own use and the fidelity harness, and that report is not for graphty-element or the app to read (#8259).
 * This rule reports, in the files it is switched on for:
 *
 * - a read of a source's program: `x.source.tool`, `source.tool`, `x.source?.tool`, and destructuring `tool` out of
 *   a source (`const { tool } = x.source`, `const { source: { tool } } = x`);
 * - an import of graph-io's per-program names (`toolDefaults`, `StyleTool`, `ToolArrowhead`) from `@graphty/graph-io`
 *   or one of its subpaths, as a value, a type, a re-export or an `import("...")` type;
 * - a name of the removed traces of a file's origin: `fileStyleOf`, `FileStyleOrigin`, `fileStyleWords`;
 * - a `file:` template prefix: a string or template literal that starts with `file:`. Option `filePrefix: false`
 *   leaves this one check off, for the reader that rewrites older saved projects that still carry such a template.
 *
 * Test code and the fidelity harnesses may name programs; eslint.config.js switches the rule on for source only.
 */

const PROGRAM_IMPORTS = new Set(["toolDefaults", "StyleTool", "ToolArrowhead"]);
const ORIGIN_NAMES = new Set(["fileStyleOf", "FileStyleOrigin", "fileStyleWords"]);

/**
 * The name a member expression or a property key names, or null when it is computed from a non-literal.
 * @param key - The key.
 * @param computed - Whether it is written in brackets.
 * @returns The name.
 */
function keyName(key, computed) {
    if (!computed && key.type === "Identifier") return key.name;
    if (key.type === "Literal" && typeof key.value === "string") return key.value;
    return null;
}

/**
 * Whether an expression is a program source: an identifier named `source` or a member access of `.source`.
 * @param node - The expression.
 * @returns Whether it is.
 */
function isSource(node) {
    if (node.type === "ChainExpression") return isSource(node.expression);
    if (node.type === "Identifier") return node.name === "source";
    return node.type === "MemberExpression" && keyName(node.property, node.computed) === "source";
}

/**
 * Whether a module specifier is graph-io or one of its subpaths.
 * @param value - The specifier.
 * @returns Whether it is.
 */
function isGraphIo(value) {
    return typeof value === "string" && (value === "@graphty/graph-io" || value.startsWith("@graphty/graph-io/"));
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
    meta: {
        type: "problem",
        docs: { description: "graphty-element and the graphty app never read or name the program that wrote a file" },
        schema: [
            {
                type: "object",
                properties: { filePrefix: { type: "boolean" } },
                additionalProperties: false,
            },
        ],
        messages: {
            tool: "Do not read the program a file came from (`source.tool`): graph-io settles every program's look before the styles leave it, and its source is report-only (#8259).",
            programImport:
                "Do not import `{{name}}` from graph-io: per-program knowledge stays in graph-io, which hands over neutral style values (#8259).",
            origin: "`{{name}}` names where a layer or value came from; after a load nothing may tell which file or program produced it (#8259).",
            filePrefix:
                "A `file:` template marks a layer as made by a load; loaded layers are ordinary layers placed with an ordinary template (#8259).",
        },
    },
    create(context) {
        const checkFilePrefix = context.options[0]?.filePrefix !== false;

        /**
         * Report every `tool` key an object pattern destructures from a source.
         * @param pattern - The pattern.
         */
        const toolsIn = (pattern) => {
            for (const property of pattern.properties) {
                if (property.type === "Property" && keyName(property.key, property.computed) === "tool") {
                    context.report({ node: property, messageId: "tool" });
                }
            }
        };

        const programImport = (node, name) => {
            if (PROGRAM_IMPORTS.has(name)) context.report({ node, messageId: "programImport", data: { name } });
        };

        return {
            MemberExpression(node) {
                if (keyName(node.property, node.computed) === "tool" && isSource(node.object)) {
                    context.report({ node, messageId: "tool" });
                }
            },
            VariableDeclarator(node) {
                if (node.id.type === "ObjectPattern" && node.init && isSource(node.init)) toolsIn(node.id);
            },
            AssignmentPattern(node) {
                if (node.left.type === "ObjectPattern" && isSource(node.right)) toolsIn(node.left);
            },
            Property(node) {
                if (
                    node.parent.type === "ObjectPattern" &&
                    keyName(node.key, node.computed) === "source" &&
                    node.value.type === "ObjectPattern"
                ) {
                    toolsIn(node.value);
                }
            },
            ImportDeclaration(node) {
                if (!isGraphIo(node.source.value)) return;
                for (const specifier of node.specifiers) {
                    if (specifier.type === "ImportSpecifier") {
                        programImport(specifier, keyName(specifier.imported, false));
                    }
                }
            },
            ExportNamedDeclaration(node) {
                if (!node.source || !isGraphIo(node.source.value)) return;
                for (const specifier of node.specifiers) programImport(specifier, keyName(specifier.local, false));
            },
            TSImportType(node) {
                const argument = node.argument.type === "TSLiteralType" ? node.argument.literal : node.argument;
                if (argument.type === "Literal" && isGraphIo(argument.value) && node.qualifier?.type === "Identifier") {
                    programImport(node, node.qualifier.name);
                }
            },
            Identifier(node) {
                if (ORIGIN_NAMES.has(node.name)) {
                    context.report({ node, messageId: "origin", data: { name: node.name } });
                }
            },
            Literal(node) {
                if (checkFilePrefix && typeof node.value === "string" && node.value.startsWith("file:")) {
                    context.report({ node, messageId: "filePrefix" });
                }
            },
            TemplateLiteral(node) {
                if (checkFilePrefix && node.quasis[0].value.cooked?.startsWith("file:")) {
                    context.report({ node, messageId: "filePrefix" });
                }
            },
        };
    },
};
