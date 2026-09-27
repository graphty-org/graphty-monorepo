// graphty (React app) ESLint configuration
// Extends root config, adds React-specific rules

import { readFileSync } from "node:fs";

import rootConfig from "../eslint.config.js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import storybookPlugin from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";

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

export default tseslint.config(
    // Inherit all rules from root config
    ...rootConfig,

    // Storybook recommended rules
    ...storybookPlugin.configs["flat/recommended"],

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
            "@typescript-eslint/no-restricted-imports": ["error", { patterns: RESTRICTED_IMPORT_PATTERNS }],
        },
    },
);
