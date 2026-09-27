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
 * - a call of, or an assignment to, a member of a renderer-side element type (`Graphty`, `Graph`,
 *   `Node`, the managers) that the element's door list marks as changing project state;
 * - any access to a manager (`getDataManager()`, `dataManager`, `operationQueue`, ...);
 * - the `<Graphty>` component props that set element state (`layout`, `layoutConfig`, `viewMode`);
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

/** The `<Graphty>` props that set element state instead of dispatching a session command. */
const GRAPHTY_STATE_PROPS = new Set(["layout", "layoutConfig", "viewMode"]);

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
                prop: "The `{{name}}` prop of <Graphty> sets element state outside the session. Dispatch the session command instead.",
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
             * The renderer roots that declare the member a member expression reads.
             * @param {MemberNode} node - The member expression.
             * @returns {DoorRootEntry[]} Each root declaring it; empty for anything that is not the element's.
             */
            function declaringRoots(node) {
                const tsNode = services.esTreeNodeToTSNodeMap.get(node);
                const symbol = tsNode?.name ? checker.getSymbolAtLocation(tsNode.name) : undefined;
                /** @type {DoorRootEntry[]} */
                const found = [];
                for (const declaration of symbol?.declarations ?? []) {
                    const root = ownerRoot(declaration);
                    if (root) {
                        found.push(root);
                    }
                }

                return found;
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

            /**
             * Reports a door called or assigned.
             * @param {MemberNode} node - The member being called or assigned.
             */
            function checkWrite(node) {
                if (node.computed || node.property.type !== "Identifier") {
                    return;
                }
                const name = node.property.name;
                const mutates = declaringRoots(node).some((root) =>
                    MUTATING.has((root.doors?.[name] ?? root.whole)?.kind ?? ""),
                );
                if (mutates) {
                    context.report({ node: node.property, messageId: "door", data: { name } });
                }
            }

            return {
                MemberExpression(node) {
                    if (node.computed || node.property.type !== "Identifier") {
                        return;
                    }
                    const name = node.property.name;
                    if (MANAGERS.has(name)) {
                        if (declaringRoots(node).length > 0) {
                            context.report({ node: node.property, messageId: "manager", data: { name } });
                        }
                        return;
                    }
                    /** @type {Parameters<NonNullable<import("eslint").Rule.RuleListener["CallExpression"]>>[0]["parent"] | undefined} */
                    const p = /** @type {any} */ (node).parent;
                    if (
                        (p?.type === "CallExpression" && p.callee === node) ||
                        (p?.type === "AssignmentExpression" && p.left === node) ||
                        (p?.type === "UpdateExpression" && p.argument === node)
                    ) {
                        checkWrite(node);
                    }
                },
                /**
                 * Reports a state prop on `<Graphty>`.
                 * @param {any} node - A JSX attribute.
                 */
                JSXAttribute(node) {
                    const owner = node.parent?.name;
                    if (
                        owner?.type === "JSXIdentifier" &&
                        owner.name === "Graphty" &&
                        GRAPHTY_STATE_PROPS.has(node.name?.name)
                    ) {
                        context.report({ node, messageId: "prop", data: { name: node.name.name } });
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
