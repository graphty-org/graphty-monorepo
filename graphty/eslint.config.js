// graphty (React app) ESLint configuration
// Extends root config, adds React-specific rules

import rootConfig from "../eslint.config.js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import storybookPlugin from "eslint-plugin-storybook";
import globals from "globals";
import tseslint from "typescript-eslint";

import noElementMutation from "./eslint-rules/no-element-mutation.js";

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
    // A warning while the app migrates onto the session; an error once it has.
    {
        files: ["src/**/*.ts", "src/**/*.tsx"],
        // Stories are linted without type information (root eslint.config.js), and the rule needs it.
        ignores: ["**/*.stories.ts", "**/*.stories.tsx", "**/stories/**/*.ts"],
        plugins: { graphty: { rules: { "no-element-mutation": noElementMutation } } },
        rules: { "graphty/no-element-mutation": "warn" },
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
        },
    },
);
