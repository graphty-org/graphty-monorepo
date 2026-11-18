// @ts-check
/**
 * @file style-sidebar-controls: the Style sidebar draws only approved controls.
 *
 * The owner's rule (2026-11-17, #8739): the Style sidebar is not a place for descriptions, warnings or other
 * ancillary information. It holds controls -- color pickers, menus, selects, buttons and the compact-mantine field
 * controls they sit in -- and nothing else: no pill, chip, badge, caption, sentence or warning. Information a reader
 * needs goes in a tooltip on a control, in a dialog or pop-over, or nowhere.
 *
 * The approved components are listed in `src/workspace/style/approved-controls.json`, the one list this rule and the
 * rendered-sidebar test (`src/workspace/style/__tests__/SidebarControls.real-element.test.tsx`) share. In the files
 * eslint.config.js switches the rule on for, it reports a JSX element whose component comes from a UI library
 * (`@mantine/*`, `@graphty/compact-mantine`) and is not on that list, unless it sits inside a component the list
 * names as `elsewhere` (a pop-over's panel, a menu's list, a dialog) or in a prop of one it names as
 * `elsewhereProps` (a tooltip's label): those are not in the sidebar. Approving a component approves its parts (`Menu` approves `Menu.Item`).
 */

import { readFileSync } from "node:fs";

/**
 * @typedef {{ name: string, from: string }} Entry
 * @typedef {{ controls: Entry[], containers: Entry[], elsewhere: string[], elsewhereProps: string[] }} ApprovedList
 */

/** @type {ApprovedList} */
const LIST = JSON.parse(
    readFileSync(new URL("../src/workspace/style/approved-controls.json", import.meta.url), "utf8"),
);

/** Each UI library's approved names. */
const APPROVED = new Map();
for (const entry of [...LIST.controls, ...LIST.containers]) {
    APPROVED.set(entry.from, (APPROVED.get(entry.from) ?? new Set()).add(entry.name));
}
const ELSEWHERE = new Set(LIST.elsewhere);
const ELSEWHERE_PROPS = new Set([...LIST.elsewhere, ...LIST.elsewhereProps]);

/**
 * Whether a module is a UI library whose components the list governs.
 * @param {unknown} source - the module specifier.
 * @returns {boolean} whether it is.
 */
function isUiLibrary(source) {
    return typeof source === "string" && (source.startsWith("@mantine/") || source === "@graphty/compact-mantine");
}

/**
 * A JSX element name as written: `Text`, `Menu.Item`; undefined for a namespaced name.
 * @param {any} name - the JSX name node.
 * @returns {string | undefined} the name.
 */
function nameOf(name) {
    if (name.type === "JSXIdentifier") {
        return name.name;
    }
    if (name.type === "JSXMemberExpression") {
        const object = nameOf(name.object);
        return object === undefined ? undefined : `${object}.${name.property.name}`;
    }
    return undefined;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
    meta: {
        type: "problem",
        docs: {
            description: "the Style sidebar draws only the controls src/workspace/style/approved-controls.json lists",
        },
        schema: [],
        messages: {
            unapproved:
                "`{{name}}` is not an approved Style sidebar control (#8739): the sidebar holds controls only, never a pill, chip, badge, caption, sentence or warning. Put the information in a control's tooltip, a dialog or nowhere; a new control is approved by adding it to src/workspace/style/approved-controls.json.",
        },
    },
    create(context) {
        /** Local name -> { imported, from } for every UI library import. */
        const imports = new Map();

        /**
         * The library name a written JSX name stands for: `Popout.Panel` for `Popout.Panel`, with an alias undone.
         * @param {string} written - the name as written.
         * @returns {{ full: string, root: string, from: string } | undefined} it, or undefined when not a library's.
         */
        const resolve = (written) => {
            const [local, ...rest] = written.split(".");
            const found = imports.get(local);
            return found === undefined ? undefined : { ...found, full: [found.root, ...rest].join(".") };
        };

        /**
         * The library name of the component a node names, and whether the node is one of its props: a JSX element
         * names its own component, a prop names the element it is on.
         * @param {any} at - a node.
         * @returns {{ full: string, inProp: boolean } | undefined} it, or undefined for any other node.
         */
        const componentAt = (at) => {
            const inProp = at.type === "JSXAttribute";
            if (!inProp && at.type !== "JSXElement") {
                return undefined;
            }
            const written = nameOf(inProp ? at.parent.name : at.openingElement.name);
            const resolved = written === undefined ? undefined : resolve(written);
            return resolved === undefined ? undefined : { full: resolved.full, inProp };
        };

        /**
         * Whether a node sits inside (or is) an `elsewhere` component, or in a prop of an `elsewhereProps` one.
         * @param {any} node - the JSX element.
         * @returns {boolean} whether it does.
         */
        const isElsewhere = (node) => {
            for (let at = node; at !== null && at !== undefined; at = at.parent) {
                const found = componentAt(at);
                if (found !== undefined && (found.inProp ? ELSEWHERE_PROPS : ELSEWHERE).has(found.full)) {
                    return true;
                }
            }
            return false;
        };

        return {
            ImportDeclaration(node) {
                // typescript-eslint's nodes carry `importKind`; ESLint's estree types do not.
                if (!isUiLibrary(node.source.value) || /** @type {any} */ (node).importKind === "type") {
                    return;
                }
                for (const specifier of node.specifiers) {
                    if (specifier.type === "ImportSpecifier" && /** @type {any} */ (specifier).importKind !== "type") {
                        const root =
                            specifier.imported.type === "Identifier"
                                ? specifier.imported.name
                                : String(specifier.imported.value);
                        imports.set(specifier.local.name, { root, from: node.source.value });
                    }
                }
            },
            /**
             * Reports a library component the list does not approve, outside a pop-over, menu, dialog or tooltip label.
             * @param {any} node - the JSX opening element (no estree type).
             */
            JSXOpeningElement(node) {
                const written = nameOf(node.name);
                const resolved = written === undefined ? undefined : resolve(written);
                if (resolved === undefined || APPROVED.get(resolved.from)?.has(resolved.root) === true) {
                    return;
                }
                if (!isElsewhere(node.parent)) {
                    context.report({ node, messageId: "unapproved", data: { name: resolved.full } });
                }
            },
        };
    },
};

export default rule;
