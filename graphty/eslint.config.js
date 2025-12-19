import {defineConfig} from "@eslint/config-helpers";
import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import storybookPlugin from "eslint-plugin-storybook";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    ... storybookPlugin.configs["flat/recommended"],
    {
        ignores: [
            "dist",
            "storybook-static",
            "coverage",
            "node_modules",
            ".worktrees",
        ],
    },
    {
        languageOptions: {
            parserOptions: {
                sourceType: "module",
                globals: {
                    ... globals.browser,
                    ... globals.es2022,
                },
                tsconfigRootDir: import.meta.dirname,
                projectService: {
                    allowDefaultProject: ["*.js", "*.mjs", ".storybook/*.ts", ".storybook/*.tsx"],
                },
            },
        },
    },
    {
        plugins: {
            "@stylistic": stylistic,
            "simple-import-sort": simpleImportSort,
            "react": reactPlugin,
            "react-hooks": reactHooksPlugin,
            "react-refresh": reactRefreshPlugin,
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            /* *********************
             * REACT RULES
             **********************/
            "react/jsx-uses-react": "off",
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react-refresh/only-export-components": [
                "warn",
                {allowConstantExport: true},
            ],

            /* *********************
             * MIGRATION
             **********************/
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-non-null-assertion": "error",

            /* *********************
             * BASIC STYLE
             **********************/
            "camelcase": ["error", {properties: "always"}],
            "curly": ["error", "all"],
            "no-warning-comments": ["warn", {terms: ["TODO", "FIXME"]}],
            "one-var": ["error", "never"],
            "sort-vars": "error",
            "prefer-template": "error",
            "no-var": "error",
            "no-console": ["warn", {allow: ["warn", "error"]}],
            "@stylistic/array-bracket-newline": ["error", "consistent"],
            "@stylistic/array-element-newline": ["error", "consistent"],
            "@stylistic/brace-style": ["error", "1tbs"],
            "@stylistic/comma-dangle": ["error", "always-multiline"],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/function-call-argument-newline": ["error", "consistent"],
            "@stylistic/indent": ["error", 4],
            "@stylistic/linebreak-style": ["error", "unix"],
            "@stylistic/no-multiple-empty-lines": ["error", {max: 1, maxBOF: 0, maxEOF: 1}],
            "@stylistic/no-tabs": "error",
            "@stylistic/nonblock-statement-body-position": ["error", "below"],
            "@stylistic/operator-linebreak": ["error", "after"],
            "@stylistic/padded-blocks": ["error", "never"],
            "@stylistic/quotes": ["error", "double"],
            "@stylistic/semi": ["error", "always"],
            "@stylistic/member-delimiter-style": ["error", {
                multiline: {delimiter: "semi", requireLast: true},
                singleline: {delimiter: "comma", requireLast: false},
            }],
            "@typescript-eslint/explicit-function-return-type": ["error", {allowIIFEs: true, allowExpressions: true}],

            /* *********************
             * SPACING STYLE
             **********************/
            "@stylistic/array-bracket-spacing": ["error", "never"],
            "@stylistic/comma-spacing": ["error", {before: false, after: true}],
            "@stylistic/func-call-spacing": ["error", "never"],
            "@stylistic/key-spacing": ["error", {afterColon: true, beforeColon: false, mode: "strict"}],
            "@stylistic/keyword-spacing": ["error", {before: true, after: true}],
            "@stylistic/no-multi-spaces": "error",
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/no-whitespace-before-property": "error",
            "@stylistic/object-curly-spacing": ["error", "never"],
            "@stylistic/semi-spacing": ["error", {before: false}],
            "@stylistic/space-before-function-paren": ["error", "never"],
            "@stylistic/space-in-parens": ["error", "never"],
            "@stylistic/space-infix-ops": ["error", {int32Hint: false}],
            "@stylistic/space-unary-ops": ["error", {words: true, nonwords: false}],
            "@stylistic/spaced-comment": ["error", "always"],
            "@stylistic/switch-colon-spacing": ["error", {after: true, before: false}],
            "@stylistic/template-curly-spacing": ["error", "never"],
            "@stylistic/rest-spread-spacing": ["error", "always"],

            /* *********************
             * ESOTERIC STYLE
             **********************/
            "default-case": "error",
            "default-param-last": "error",
            "dot-notation": "error",
            "no-else-return": "error",
            "no-nested-ternary": "error",
            "no-template-curly-in-string": "error",
            "no-unneeded-ternary": "error",
            "prefer-destructuring": ["error", {object: true, array: false}],
            "prefer-rest-params": "error",
            "prefer-spread": "error",
            "yoda": ["error", "never"],
            "@stylistic/comma-style": ["error", "last"],
            "@stylistic/dot-location": ["error", "property"],
            "@stylistic/new-parens": ["error", "always"],
            "@stylistic/quote-props": ["error", "consistent-as-needed"],
            "@stylistic/semi-style": ["error", "last"],
            "@stylistic/padding-line-between-statements": [
                "error",
                {blankLine: "always", prev: "*", next: "class"},
                {blankLine: "always", prev: "class", next: "*"},
                {blankLine: "always", prev: "if", next: "*"},
            ],
            "@stylistic/arrow-parens": ["error", "always"],
            "no-useless-rename": "error",
            "no-useless-constructor": "error",
            "no-useless-computed-key": "error",

            /* *********************
             * IMPORTS
             **********************/
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "no-duplicate-imports": "error",

            /* *********************
             * SAFETY
             **********************/
            "eqeqeq": "error",
            "consistent-return": "error",
            "@stylistic/wrap-iife": ["error", "inside"],
            "@stylistic/no-mixed-operators": ["error", {allowSamePrecedence: true}],
        },
    },
    {
        files: ["**/*.js", "**/*.mjs"],
        rules: {
            "@typescript-eslint/explicit-function-return-type": "off",
        },
    },
);
