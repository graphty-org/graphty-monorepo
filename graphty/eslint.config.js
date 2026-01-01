// graphty (React app) ESLint configuration
// Extends root config, adds React-specific rules

import rootConfig from "../eslint.config.js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import storybookPlugin from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";

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
        },
    },
);
