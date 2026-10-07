// graphty (React app) ESLint configuration
// Extends root config, adds React-specific rules

import { readFileSync } from "node:fs";

import rootConfig from "../eslint.config.js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import storybookPlugin from "eslint-plugin-storybook";
import globals from "globals";
import tseslint from "typescript-eslint";

import { MANTINE_REPLACEMENTS } from "../compact-mantine/eslint/mantine-replacements.js";
import noElementMutation from "./eslint-rules/no-element-mutation.js";

// The graphty app is only HTML around graphty-element (CLAUDE.md, "Architectural Principles"):
// it reaches graph functionality through graphty-element's published entry points and nothing
// else. The allowed subpaths are read from graphty-element's exports map, so publishing a new
// entry point there allows it here without an edit.
const ELEMENT_EXPORTS = Object.keys(
    JSON.parse(readFileSync(new URL("../graphty-element/package.json", import.meta.url), "utf8")).exports,
)
    .filter((key) => key !== ".")
    .map((key) => key.slice(2).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const RULE = "The graphty app consumes graphty-element and nothing else (CLAUDE.md, Architectural Principles).";
const RESTRICTED_IMPORT_PATTERNS = [
    {
        regex: "^@graphty/(algorithms|layout|webgpu-graph-algorithms|graph-format|graph-io)(/|$)",
        message: `${RULE} Use the capability through graphty-element; if it is missing there, fix graphty-element.`,
    },
    {
        regex: "^@babylonjs/",
        message: `${RULE} Rendering belongs to graphty-element; @babylonjs/core is installed only as its peer.`,
    },
    {
        regex: `^@graphty/graphty-element/(?!(${ELEMENT_EXPORTS.join("|")})$)`,
        message: `${RULE} Import only the entry points in graphty-element's package.json exports.`,
    },
    {
        regex: "^@graphty/[^/]+/src(/|$)",
        message: `${RULE} Import a package's published entry points, never its source.`,
    },
    {
        regex: "^\\.{1,2}/(.*/)?graphty-element(/|$)",
        message: `${RULE} Import @graphty/graphty-element by package name, never by a relative path.`,
    },
];

// The app's own bans, beside compact-mantine's list. Not in that shared list, because
// compact-mantine builds Popout on Mantine's Popover.
const APP_REPLACEMENTS = [
    ...MANTINE_REPLACEMENTS,
    {
        name: "@graphty/compact-mantine",
        importNames: ["ColorPickerPanel"],
        message: "Use CompactColorInput: it carries the paint field and opens the picker in a Popout.",
    },
    {
        name: "@mantine/core",
        importNames: ["Popover"],
        message: "Use Popout from @graphty/compact-mantine: a titled pop-out with a close button a finger can reach.",
    },
];

// The files that may still use Mantine's Popover, each with its reason.
const POPOVER_EXCEPTIONS = [
    // A toolbar dropdown, toggled by its trigger and closed by an outside tap, as Figma's toolbar
    // menus are; the Layout and Analyze menus open in it.
    "src/workspace/toolbar/WorkspaceToolbar.tsx",
    // Temporary: the Style tab's shape, bind, bound value and label popovers move to Popout next.
    "src/workspace/style/SetLine.tsx",
    "src/workspace/style/LabelSection.tsx",
];
const WITHOUT_POPOVER_BAN = APP_REPLACEMENTS.filter((entry) => !entry.importNames.includes("Popover"));
const NO_LUCIDE = { name: "lucide-react", message: "Use GLYPHS from src/workspace/glyphs.ts: one icon per concept." };

export default tseslint.config(
    // Inherit all rules from root config
    ...rootConfig,

    // Storybook recommended rules
    ...storybookPlugin.configs["flat/recommended"],

    // The rule's test fixtures are code under test, parsed by the test itself.
    { ignores: ["eslint-rules/__tests__/fixtures/**"] },

    // The lint rules are Node modules in plain JavaScript, type-checked with checkJs
    // (`tsc -p eslint-rules`), so their JSDoc carries the types.
    {
        files: ["eslint-rules/**/*.js"],
        languageOptions: { globals: globals.node },
        rules: { "jsdoc/no-types": "off" },
    },

    // ============================================
    // THE APP CHANGES THE ELEMENT ONLY THROUGH SESSION COMMANDS
    // ============================================
    {
        files: ["src/**/*.ts", "src/**/*.tsx"],
        // Stories are linted without type information (root eslint.config.js), and the rule needs it.
        ignores: ["**/*.stories.ts", "**/*.stories.tsx", "**/stories/**/*.ts"],
        plugins: { graphty: { rules: { "no-element-mutation": noElementMutation } } },
        rules: { "graphty/no-element-mutation": "error" },
    },

    // ============================================
    // REACT-SPECIFIC RULES
    // ============================================
    {
        files: ["**/*.ts", "**/*.tsx"],
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
            "react-refresh": reactRefreshPlugin,
        },
        settings: {
            react: { version: "detect" },
        },
        rules: {
            // React 17+ doesn't need React in scope
            "react/jsx-uses-react": "off",
            "react/react-in-jsx-scope": "off",
            // TypeScript handles prop types
            "react/prop-types": "off",
            // Hooks rules
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            // Fast refresh support
            "react-refresh/only-export-components": [
                "warn",
                {
                    allowConstantExport: true,
                },
            ],
            // compact-mantine's replacements for stock Mantine components: see the list's own file.
            "@typescript-eslint/no-restricted-imports": [
                "error",
                { patterns: RESTRICTED_IMPORT_PATTERNS, paths: APP_REPLACEMENTS },
            ],
        },
    },

    // The workspace draws every icon from one map, src/workspace/glyphs.ts, so each concept keeps
    // one icon everywhere it appears. The block repeats the rule's options because a later block
    // replaces a rule's options rather than adding to them.
    {
        files: ["src/workspace/**/*.{ts,tsx}"],
        ignores: ["src/workspace/glyphs.ts"],
        rules: {
            "@typescript-eslint/no-restricted-imports": [
                "error",
                {
                    patterns: RESTRICTED_IMPORT_PATTERNS,
                    paths: [...APP_REPLACEMENTS, NO_LUCIDE],
                },
            ],
        },
    },

    // The Popover exceptions above: the same bans without Popover's.
    {
        files: POPOVER_EXCEPTIONS,
        rules: {
            "@typescript-eslint/no-restricted-imports": [
                "error",
                { patterns: RESTRICTED_IMPORT_PATTERNS, paths: [...WITHOUT_POPOVER_BAN, NO_LUCIDE] },
            ],
        },
    },

    // The app's own lint rules are tooling, not app code: their tests read graphty-element's door
    // list at its source, which is the list the rule enforces against. The build scripts are
    // tooling too: scripts/write-sample-gml.ts writes the sample files with graph-io at build time,
    // and nothing it imports reaches the app.
    {
        files: ["eslint-rules/**/*.ts", "scripts/**/*.ts"],
        rules: { "@typescript-eslint/no-restricted-imports": "off" },
    },
);
