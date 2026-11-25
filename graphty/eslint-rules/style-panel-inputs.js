// @ts-check
/**
 * @file style-panel-inputs: the Style panel's inputs are compact-mantine components.
 *
 * The owner's rule (2026-11-24): "The style panel may only use components from compact-mantine". In the files
 * eslint.config.js switches the rule on for, it reports an input control imported from any module but
 * `@graphty/compact-mantine`, and a native `<input>`, `<select>`, `<textarea>` or `<button>` drawn by hand.
 * A namespace import (`import * as MC from "@mantine/core"`) is checked where an input is read from it (`<MC.Select>`).
 * Layout that takes no input (`Group`, `Stack`, `Box`, `Text`, `Tooltip`, `VisuallyHidden`, `Divider`) is not an
 * input and is left alone. An app component that wraps compact-mantine inputs (a font or picture field wired to the
 * session) is checked in its own file, so it may be imported.
 *
 * The rule's `gaps` option names the Mantine inputs compact-mantine has no component for yet, each with why: they
 * are reported to the owner, never replaced by a control the app builds. Angle, font and image channels are picked
 * with compact-mantine's AnglePicker, FontPicker and ImagePicker; which control a channel gets is decided at run
 * time, so `StylePanelV2InputRules.real-element.test.tsx` checks that part.
 */

/** Input controls, by the name a UI library exports them under. */
const INPUTS = new Set([
    "ActionIcon",
    "Autocomplete",
    "Button",
    "Checkbox",
    "Chip",
    "ColorInput",
    "ColorPicker",
    "Combobox",
    "FileButton",
    "FileInput",
    "Menu",
    "MultiSelect",
    "NativeSelect",
    "NumberInput",
    "PasswordInput",
    "PillsInput",
    "PinInput",
    "Popover",
    "Radio",
    "RangeSlider",
    "Rating",
    "SegmentedControl",
    "Select",
    "Slider",
    "Switch",
    "TagsInput",
    "Textarea",
    "TextInput",
    "UnstyledButton",
]);

/** Native elements that take input. */
const NATIVE = new Set(["input", "select", "textarea", "button"]);

const COMPACT = "@graphty/compact-mantine";

/** @type {import("eslint").Rule.RuleModule} */
export default {
    meta: {
        type: "problem",
        docs: { description: "The Style panel's inputs are compact-mantine components (owner, 2026-11-24)." },
        schema: [
            {
                type: "object",
                properties: { gaps: { type: "object", additionalProperties: { type: "string" } } },
                additionalProperties: false,
            },
        ],
        messages: {
            imported:
                "`{{name}}` from {{from}} is an input that is not compact-mantine's. The style panel may only use components from compact-mantine (owner, 2026-11-24): use the compact-mantine component; where it has none, report the gap to the owner, never build one.",
            native: "A hand-drawn <{{name}}> is an input that is not compact-mantine's. The style panel may only use components from compact-mantine (owner, 2026-11-24).",
        },
    },
    create(context) {
        /** @type {Record<string, string>} */
        const gaps = context.options[0]?.gaps ?? {};
        /** Namespace imports from modules other than compact-mantine, by local name, to the module. */
        /** @type {Map<string, string>} */
        const namespaces = new Map();
        /**
         * Reports `name` read from `from` when it is an input that is not a named gap.
         * @param {import("eslint").Rule.Node | import("estree").Node} node - where to report
         * @param {string} name - the export read
         * @param {string} from - the module
         */
        const check = (node, name, from) => {
            if (INPUTS.has(name) && !(from === "@mantine/core" && name in gaps)) {
                context.report({ node, messageId: "imported", data: { name, from } });
            }
        };
        /**
         * Checks `ns.name` when `ns` is a namespace import.
         * @param {import("eslint").Rule.Node} node - the member read
         * @param {string} ns - the object's name
         * @param {string} name - the property's name
         */
        const checkMember = (node, ns, name) => {
            const from = namespaces.get(ns);
            if (from !== undefined) {
                check(node, name, from);
            }
        };
        return {
            ImportDeclaration(node) {
                const from = String(node.source.value);
                // typescript-eslint's nodes carry `importKind`; ESLint's estree types do not.
                if (from === COMPACT || /** @type {any} */ (node).importKind === "type") {
                    return;
                }
                for (const spec of node.specifiers) {
                    if (spec.type === "ImportNamespaceSpecifier") {
                        namespaces.set(spec.local.name, from);
                        continue;
                    }
                    if (spec.type !== "ImportSpecifier" || /** @type {any} */ (spec).importKind === "type") {
                        continue;
                    }
                    const name = spec.imported.type === "Identifier" ? spec.imported.name : String(spec.imported.value);
                    check(spec, name, from);
                }
            },
            MemberExpression(node) {
                if (node.object.type === "Identifier" && node.property.type === "Identifier" && !node.computed) {
                    checkMember(node, node.object.name, node.property.name);
                }
            },
            /**
             * Checks `ns.Name` when `ns` is a namespace import.
             * @param {any} node - the JSX member name (no estree type).
             */
            JSXMemberExpression(node) {
                if (node.object.type === "JSXIdentifier") {
                    checkMember(node, node.object.name, node.property.name);
                }
            },
            /**
             * Reports a hand-drawn native input.
             * @param {any} node - the JSX opening element (no estree type).
             */
            JSXOpeningElement(node) {
                if (node.name.type === "JSXIdentifier" && NATIVE.has(node.name.name)) {
                    context.report({ node, messageId: "native", data: { name: node.name.name } });
                }
            },
        };
    },
};
