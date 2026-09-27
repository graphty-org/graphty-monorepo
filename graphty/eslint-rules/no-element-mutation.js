// @ts-check
/**
 * @file no-element-mutation: app code changes graphty-element only through session commands.
 *
 * Everything a project file saves is undoable because every change to it goes through the
 * session's dispatcher, which records the step. A public member of the element that changes the
 * graph by itself (`element.addNodes`, `element.layout = ...`) also dispatches today, but the
 * app reaching for it instead of `session.*` or a transaction's `tx.*` splits one gesture into
 * several steps and keeps the app coupled to the renderer. This rule reports:
 *
 * - a member of a renderer-side element type (`Graphty`, `Graph`, `Node`, the managers) that the
 *   element's door list marks as changing project state: a method read in any way (called,
 *   passed on, `.call`ed, bound or destructured), a property assigned; a computed access with a
 *   literal key (`element["addNodes"]`) counts the same;
 * - any access to a manager (`getDataManager()`, `dataManager`, `operationQueue`, ...), and a
 *   read of the element's internal `graph`;
 * - a local type or interface named after an element type (`ElementGraph`, `ElementNodeLike`),
 *   which is a duck-typed copy of the element's own type.
 *
 * The member test is type-aware: it asks the TypeScript checker where the accessed member is
 * declared, so a door is found through a renamed variable, an alias or a `Pick` of the element's
 * type, and an unrelated object's `pin()` is left alone.
 *
 * The door list is `graphty-element/build/doors.json`, written by the element's build from
 * `graphty-element/src/session/commands/doors.ts`.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import ts from "typescript";

/**
 * @typedef {{ kind: string }} DoorEntry
 * @typedef {{ name: string, half: string, doors?: Record<string, DoorEntry>, whole?: DoorEntry }} DoorRootEntry
 * @typedef {{ roots: ReadonlyArray<DoorRootEntry> }} DoorsDocument
 * @typedef {Parameters<NonNullable<import("eslint").Rule.RuleListener["MemberExpression"]>>[0]} MemberNode
 */

const DOORS_FILE = fileURLToPath(new URL("../../graphty-element/build/doors.json", import.meta.url));

/** Door kinds that change project state. */
const MUTATING = new Set(["dispatches", "partial", "knownGap"]);

/** The members that hand out a manager, which a consumer never needs. */
const MANAGERS = new Set([
    "getDataManager",
    "getStyles",
    "getLayoutManager",
    "getUpdateManager",
    "dataManager",
    "layoutManager",
    "operationQueue",
    "layoutEngine",
]);

/** Members that hand out the element's internal graph, which the app never holds. */
const INTERNALS = new Set(["graph"]);

/** Declarations under this path are graphty-element's, whether read from source or from dist. */
const ELEMENT_PATH = /[\\/]graphty-element[\\/]/;

/** Names an app might give the element's class, and the root each one is. */
const ALIASES = { GraphtyElement: "Graphty" };

/** An ambient module declaration of the element's own package. */
const ELEMENT_MODULE = /^@graphty\/graphty-element(\/|$)/;

/**
 * Reads the door list the element's build writes.
 * @returns {DoorsDocument} The list.
 */
function readDoorsFile() {
    try {
        return JSON.parse(readFileSync(DOORS_FILE, "utf8"));
    } catch (cause) {
        throw new Error(
            `no-element-mutation cannot read ${DOORS_FILE}. Build graphty-element first ` +
                "(pnpm exec nx run graphty-element:build).",
            { cause },
        );
    }
}

/**
 * The names a local type re-declaring an element type might carry for `name`.
 * @param {string} name - The local type's name.
 * @returns {string[]} The name, and the name without an `Element` prefix and a `Like` or `Type` suffix.
 */
function candidateRoots(name) {
    const bare = name.replace(/^Element(?=[A-Z])/, "").replace(/(Like|Type)$/, "");
    return [name, bare, name.replace(/(Like|Type)$/, "")];
}

/**
 * Builds the rule over a door list.
 * @param {() => DoorsDocument} loadDoors - Reads the door list; called once, on first use.
 * @returns {import("eslint").Rule.RuleModule} The rule.
 */
export function createRule(loadDoors) {
    /** @type {{ renderer: Map<string, DoorRootEntry>, typeNames: Set<string> } | undefined} */
    let index;

    /**
     * The door list, indexed.
     * @returns {{ renderer: Map<string, DoorRootEntry>, typeNames: Set<string> }} Renderer roots by name, and every element type name.
     */
    function doors() {
        if (!index) {
            const { roots } = loadDoors();
            index = {
                renderer: new Map(roots.filter((r) => r.half === "renderer").map((r) => [r.name, r])),
                typeNames: new Set([...roots.map((r) => r.name), "GraphtyElement"]),
            };
        }

        return index;
    }

    return {
        meta: {
            type: "problem",
            docs: {
                description:
                    "Change graphty-element only through session commands, so every change is one undoable step.",
            },
            schema: [],
            messages: {
                door: "`{{name}}` changes the graph outside the session. Use the session command (session.* or a transaction's tx.*) so it is one undoable step.",
                manager:
                    "`{{name}}` reaches one of graphty-element's managers. Use the session or a public element member instead.",
                internal:
                    "`{{name}}` hands out graphty-element's internal graph. Use the element's public members or its session instead.",
                redeclared:
                    "`{{name}}` re-declares graphty-element's `{{root}}` type. Import the element's own type instead.",
            },
        },
        create(context) {
            const services = context.sourceCode.parserServices;
            if (!services?.program || !services.esTreeNodeToTSNodeMap) {
                throw new Error("no-element-mutation needs type information (parserOptions.projectService).");
            }
            const checker = services.program.getTypeChecker();

            /**
             * The declarations of the member a member expression reads: through its name, or
             * through the object's type for a computed access with a literal key.
             * @param {MemberNode} node - The member expression.
             * @returns {any[]} The declarations; empty when there is no member to resolve.
             */
            function memberDeclarations(node) {
                const tsNode = /** @type {any} */ (services.esTreeNodeToTSNodeMap.get(node));
                if (!node.computed) {
                    const symbol = tsNode?.name ? checker.getSymbolAtLocation(tsNode.name) : undefined;
                    return symbol?.declarations ?? [];
                }

                const name = memberName(node);
                return name === null || !tsNode?.expression ? [] : propertyDeclarations(tsNode.expression, name);
            }

            /**
             * The declarations of a named property of an expression's type.
             * @param {any} expression - A TypeScript expression.
             * @param {string} name - The property.
             * @returns {any[]} The declarations; empty when the type has no such property.
             */
            function propertyDeclarations(expression, name) {
                const type = checker.getNonNullableType(checker.getTypeAtLocation(expression));
                return checker.getPropertyOfType(type, name)?.declarations ?? [];
            }

            /**
             * The renderer roots that own a member's declarations.
             * @param {any[]} declarations - The member's declarations.
             * @returns {DoorRootEntry[]} Each root declaring it; empty for anything that is not the element's.
             */
            function rootsOf(declarations) {
                /** @type {DoorRootEntry[]} */
                const found = [];
                for (const declaration of declarations) {
                    const root = ownerRoot(declaration);
                    if (root) {
                        found.push(root);
                    }
                }

                return found;
            }

            /**
             * Whether a door by this name, declared so, changes project state when read in the given
             * way: a method whenever it is read, since reading it is how it gets called; anything
             * else only when it is written.
             * @param {any[]} declarations - The member's declarations.
             * @param {string} name - The member.
             * @param {boolean} written - Whether it is written (assigned, updated) or called.
             * @returns {boolean} True when it should be reported.
             */
            function mutates(declarations, name, written) {
                const isMethod = declarations.some(
                    (each) => ts.isMethodDeclaration(each) || ts.isMethodSignature(each),
                );
                return (
                    (written || isMethod) &&
                    rootsOf(declarations).some((root) => MUTATING.has((root.doors?.[name] ?? root.whole)?.kind ?? ""))
                );
            }

            /**
             * The renderer root a member declaration belongs to. A member of the element's own
             * type belongs to it; so does a member of an app-local copy of an element type
             * (`ElementGraph`, reported on its own), because calling it reaches the element.
             * @param {any} declaration - A TypeScript declaration of the member.
             * @returns {DoorRootEntry | undefined} The root, or undefined for anything that is not the element's.
             */
            function ownerRoot(declaration) {
                const owner = declaration.parent?.name?.text;
                const file = declaration.getSourceFile();
                if (typeof owner !== "string") {
                    return undefined;
                }
                if (ELEMENT_PATH.test(file.fileName)) {
                    return doors().renderer.get(owner);
                }
                if (file.isDeclarationFile) {
                    return undefined;
                }
                const aliases = /** @type {Record<string, string>} */ (ALIASES);
                for (const name of candidateRoots(owner)) {
                    const root = doors().renderer.get(aliases[name] ?? name);
                    if (root) {
                        return root;
                    }
                }

                return undefined;
            }

            return {
                MemberExpression(node) {
                    const name = memberName(node);
                    if (name === null) {
                        return;
                    }
                    const declarations = memberDeclarations(node);
                    if (MANAGERS.has(name) || INTERNALS.has(name)) {
                        if (rootsOf(declarations).length > 0) {
                            const messageId = MANAGERS.has(name) ? "manager" : "internal";
                            context.report({ node: node.property, messageId, data: { name } });
                        }
                        return;
                    }
                    const p = /** @type {any} */ (node).parent;
                    const written =
                        (p?.type === "CallExpression" && p.callee === node) ||
                        (p?.type === "AssignmentExpression" && p.left === node) ||
                        (p?.type === "UpdateExpression" && p.argument === node);
                    if (mutates(declarations, name, written)) {
                        context.report({ node: node.property, messageId: "door", data: { name } });
                    }
                },
                /**
                 * Reports a door method destructured out of an element: `const { addNodes } = element`.
                 * @param {any} node - A variable declarator.
                 */
                VariableDeclarator(node) {
                    if (node.id.type !== "ObjectPattern" || node.init === null) {
                        return;
                    }
                    const init = services.esTreeNodeToTSNodeMap.get(node.init);
                    for (const property of node.id.properties) {
                        const key = property.type === "Property" ? property.key : null;
                        const name =
                            key?.type === "Identifier" && !property.computed
                                ? key.name
                                : key?.type === "Literal" && typeof key.value === "string"
                                  ? key.value
                                  : null;
                        if (name !== null && mutates(propertyDeclarations(init, name), name, false)) {
                            context.report({ node: key, messageId: "door", data: { name } });
                        }
                    }
                },
                /**
                 * Reports an interface named after an element type.
                 * @param {any} node - A local interface.
                 */
                TSInterfaceDeclaration(node) {
                    checkName(node);
                },
                /**
                 * Reports a type alias named after an element type.
                 * @param {any} node - A local type alias.
                 */
                TSTypeAliasDeclaration(node) {
                    checkName(node);
                },
            };

            /**
             * The member a member expression names: its identifier, or a computed literal string.
             * @param {MemberNode} node - The member expression.
             * @returns {string | null} The name, or null for a key only known at run time.
             */
            function memberName(node) {
                if (!node.computed) {
                    return node.property.type === "Identifier" ? node.property.name : null;
                }
                const key = /** @type {any} */ (node.property);
                if (key.type === "Literal" && typeof key.value === "string") {
                    return key.value;
                }
                if (key.type === "TemplateLiteral" && key.expressions.length === 0) {
                    return key.quasis[0].value.cooked;
                }
                return null;
            }

            /**
             * Reports a local type named after an element type. A type inside an ambient
             * `declare module "other-package"` block describes that package, not the element.
             * @param {any} node - The interface or type alias.
             */
            function checkName(node) {
                for (let up = node.parent; up; up = up.parent) {
                    if (
                        up.type === "TSModuleDeclaration" &&
                        up.id.type === "Literal" &&
                        !ELEMENT_MODULE.test(up.id.value)
                    ) {
                        return;
                    }
                }
                const id = node.id;
                const root = candidateRoots(id.name).find((n) => doors().typeNames.has(n));
                if (root) {
                    context.report({ node: id, messageId: "redeclared", data: { name: id.name, root } });
                }
            }
        },
    };
}

export default createRule(readDoorsFile);
