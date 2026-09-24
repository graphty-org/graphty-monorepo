// Root ESLint configuration for the graphty-monorepo
// This config focuses on ERROR PREVENTION, not stylistic rules
// Formatting is handled by Prettier (.prettierrc)

import eslint from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import jsxA11y from "eslint-plugin-jsx-a11y";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    // ============================================
    // IGNORE PATTERNS
    // ============================================
    {
        ignores: [
            "**/dist/**",
            "**/node_modules/**",
            "**/coverage/**",
            "**/storybook-static/**",
            "**/gh-pages/**",
            "**/tmp/**",
            "**/.worktrees/**",
            // Config files are typically JS and don't need strict type checking
            "**/*.config.js",
            "**/*.config.ts",
            "**/vite.config.ts",
            "**/vitest.config.ts",
            "**/commitlint.config.js",
            // Benchmark and Storybook files not included in tsconfig
            "**/benchmarks/**",
            "**/.storybook/**",
            // Example files are for demonstration, not production. Anchored one level deep so
            // this means "the package's examples directory" -- algorithms/examples and
            // graphty-element/examples -- and not any directory named "examples" anywhere. The
            // unanchored glob also swallowed compact-mantine/src/components/popout/examples,
            // which is inside the compiled source tree and is imported by a story, so a file
            // that runs in Storybook and in the storybook test project was linted by nothing.
            "*/examples/**",
            "*/examples-legacy/**",
            // Build scripts are Node.js tools, not source code
            "**/scripts/**",
            // Vite plugins are build tools
            "**/vite-plugin-*.js",
            // The webgpu-graph-algorithms browser demo belongs to no tsconfig on purpose --
            // webgpu-graph-algorithms/eslint.config.js has ignored it since it was written, with
            // the note that it is type-checked by hand with the DOM lib. A per-package run honours
            // that ignore; a run started from the repo root reads this file alone and does not, so
            // without this line `npx eslint .` reports three "not found by the project service"
            // parsing errors that the package's own lint gate has never reported.
            "webgpu-graph-algorithms/demo/**",
            // VitePress cache and generated files
            "**/.vitepress/cache/**",
            "**/.vitepress/dist/**",
            // Docs directory (VitePress content)
            "docs/**",
            "**/docs/**",
            // Algorithms tests have pre-existing TypeScript issues; they work with vitest
            // but fail tsc --noEmit. Ignoring until tests can be refactored.
            "algorithms/test/**",
            // Layout tests are not in tsconfig and have parsing issues
            "layout/test/**",
            // Remote-logger tests are not in main tsconfig (see tsconfig.eslint.json)
            "remote-logger/test/**",
        ],
    },

    // ============================================
    // BASE JAVASCRIPT RULES
    // ============================================
    eslint.configs.recommended,

    // ============================================
    // JSDOC RULES FOR PUBLIC API DOCUMENTATION
    // ============================================
    jsdoc.configs["flat/recommended-typescript-error"],
    {
        plugins: {
            jsdoc,
        },
        rules: {
            // Enforce documentation quality for public APIs
            "jsdoc/require-description": "error",
            "jsdoc/require-param-description": "error",
            "jsdoc/require-returns-description": "error",
            "jsdoc/no-types": "error", // TypeScript handles types
            "jsdoc/check-tag-names": [
                "error",
                {
                    definedTags: ["since", "internal", "remarks"],
                },
            ],
            "jsdoc/require-jsdoc": [
                "error",
                {
                    publicOnly: true,
                    require: {
                        FunctionDeclaration: true,
                        MethodDefinition: true,
                        ClassDeclaration: true,
                    },
                },
            ],
        },
    },

    // ============================================
    // TYPESCRIPT STRICT RULES (for .ts/.tsx files)
    // ============================================
    {
        files: ["**/*.ts", "**/*.tsx"],
        extends: [...tseslint.configs.strictTypeChecked],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                ...globals.browser,
                ...globals.es2022,
            },
        },
        plugins: {
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            // ==========================================
            // ERROR PREVENTION - Type Safety
            // ==========================================
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/explicit-function-return-type": [
                "error",
                {
                    allowExpressions: true,
                    allowIIFEs: true,
                },
            ],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/no-unnecessary-type-assertion": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            // Keep non-null assertion as error (important for safety)
            "@typescript-eslint/no-non-null-assertion": "error",
            // TODO: Re-enable these rules and fix issues incrementally
            // These rules have many violations from strictTypeChecked
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            // Allow numbers and booleans in template literals (common logging pattern)
            "@typescript-eslint/restrict-template-expressions": [
                "error",
                {
                    allowNumber: true,
                    allowBoolean: true,
                    allowAny: false,
                    allowNullish: false,
                },
            ],

            // ==========================================
            // ERROR PREVENTION - Logic Safety
            // ==========================================
            eqeqeq: ["error", "always"],
            curly: "error",
            "no-var": "error",
            "prefer-const": "error",
            "consistent-return": "error",
            "no-template-curly-in-string": "error",
            "no-else-return": "error",
            "no-nested-ternary": "error",
            "no-unneeded-ternary": "error",
            "prefer-template": "error",
            "dot-notation": "error",
            "default-case": "error",
            "default-param-last": "error",
            yoda: ["error", "never"],

            // ==========================================
            // CODE QUALITY
            // ==========================================
            "no-console": ["error", { allow: ["warn", "error"] }],
            "no-duplicate-imports": "error",
            "no-useless-constructor": "error",
            "no-useless-rename": "error",
            "no-useless-computed-key": "error",
            "prefer-destructuring": ["error", { object: true, array: false }],
            "prefer-rest-params": "error",
            "prefer-spread": "error",
            camelcase: ["error", { properties: "always" }],

            // ==========================================
            // IMPORT SORTING (the only "stylistic" rules we keep)
            // ==========================================
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
        },
    },

    // ============================================
    // ACCESSIBILITY RULES FOR compact-mantine JSX
    // ============================================
    // Scoped to compact-mantine, which publishes React components that have to
    // meet WCAG 2.2 AA. The other packages are unaffected: graphty's JSX is an
    // application, and algorithms, layout and graphty-element ship no JSX.
    {
        files: ["compact-mantine/**/*.tsx"],
        plugins: {
            "jsx-a11y": jsxA11y,
        },
        rules: {
            ...jsxA11y.flatConfigs.recommended.rules,
        },
    },

    // ============================================
    // RELAXED RULES FOR TEST FILES
    // ============================================
    {
        files: [
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/*.spec.ts",
            "**/*.spec.tsx",
            "**/test/**/*.ts",
            "**/test/**/*.tsx",
            // compact-mantine spells the directory "tests"; without this glob its setup and
            // helper files (tests/setup.ts, tests/setup.browser.ts) are the only test files in
            // the monorepo held to production rules.
            "**/tests/**/*.ts",
            "**/tests/**/*.tsx",
            "**/__tests__/**/*.ts",
            "**/__tests__/**/*.tsx",
        ],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/unbound-method": "off",
            // Disable template expression checks in tests - tests often log various types
            "@typescript-eslint/restrict-template-expressions": "off",
            // Tests often need to call deprecated functions to verify their behavior
            "@typescript-eslint/no-deprecated": "off",
            // Tests often have void expressions in arrow functions for assertions
            "@typescript-eslint/no-confusing-void-expression": "off",
            // Allow undefined in arithmetic in tests (often testing edge cases)
            "@typescript-eslint/restrict-plus-operands": "off",
            // Allow redundant type constituents in tests (often testing type edge cases)
            "@typescript-eslint/no-redundant-type-constituents": "off",
            "no-console": "off",
            // Disable JSDoc rules for test files
            "jsdoc/require-jsdoc": "off",
            "jsdoc/require-description": "off",
            "jsdoc/require-param": "off",
            "jsdoc/require-param-description": "off",
            "jsdoc/require-returns": "off",
            "jsdoc/require-returns-description": "off",
            "jsdoc/check-param-names": "off",
            "jsdoc/check-tag-names": "off",
            "jsdoc/tag-lines": "off",
        },
    },

    // ============================================
    // RELAXED JSDOC FOR STORIES
    // ============================================
    // These rules were unreachable until 2026-09-21. The story glob sat in the global
    // `ignores` above, under a comment claiming stories were "linted separately with relaxed
    // rules" -- which is this block. A top-level `ignores` wins over any later `files` entry,
    // so stories were not linted at all and this block had no effect on anything.
    //
    // That matters now that stories are not decorative: a story's `play` function is a real
    // test that the storybook project executes, and tens of kilobytes of assertions were
    // being written into files no linter had ever read. Do not re-add the global ignore --
    // relax a rule here instead.
    {
        files: ["**/*.stories.ts", "**/*.stories.tsx", "**/stories/**/*.ts"],
        // No type information for stories, and that is what makes linting them possible at all.
        // The root TypeScript block above turns on `projectService`, which needs every file it
        // lints to belong to a tsconfig. Story files belong to none -- they are excluded from the
        // package tsconfig -- so a type-aware pass reports "was not found by the project service"
        // on all 30 of them and nothing else. Disabling the service here trades the type-aware
        // rules for the syntactic ones, which still catch real defects: turning this on for the
        // first time found a nested ternary in a story.
        //
        // The type-aware half is not lost, merely elsewhere: `.storybook/**/*.ts` IS in the
        // tsconfig and imports these files, so `tsc --noEmit` does typecheck them.
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: false,
            },
        },
        rules: {
            ...tseslint.configs.disableTypeChecked.rules,
            // A story's exported const name is a USER-FACING IDENTIFIER, not an internal one:
            // Storybook derives both the displayed story name and the story id from it, so
            // `CsvAdjacencyList` becomes the id `data--csv-adjacency-list`. Renaming an export to
            // satisfy a naming rule renames the story and changes its id, which orphans its
            // visual-regression baseline. Story exports follow Storybook's convention instead.
            camelcase: "off",
            "jsdoc/require-jsdoc": "off",
            "jsdoc/require-description": "off",
            "jsdoc/require-param": "off",
            "jsdoc/require-param-description": "off",
            "jsdoc/require-returns": "off",
            "jsdoc/require-returns-description": "off",
            "jsdoc/check-param-names": "off",
            "jsdoc/check-tag-names": "off",
            "jsdoc/tag-lines": "off",
        },
    },

    // ============================================
    // compact-mantine/tests: SYNTACTIC RULES ONLY, AND WHY
    // ============================================
    // compact-mantine/tsconfig.json includes only src/, so none of the 96 files under
    // compact-mantine/tests/ belongs to a TypeScript project. A type-aware pass reports
    // "was not found by the project service" on every one of them and nothing else, which is
    // how the package ended up linting src/ alone. Turning the service off here buys the
    // syntactic rules -- unused variables, duplicate imports, import order, the a11y rules --
    // over files no linter had read.
    //
    // What this does NOT buy is a typecheck, and those files have never had one: a probe with
    // src/ and tests/ in one project on 2026-09-22 reported 22 errors, including a mock whose
    // handler signature no longer matches ActivationHandler and an "@ts-expect-error" that no
    // longer suppresses anything. Giving tests/ a tsconfig of its own and clearing those 22 is
    // the fix; this block is the interim, and it is not a licence to write untyped tests.
    {
        files: ["compact-mantine/tests/**/*.ts", "compact-mantine/tests/**/*.tsx"],
        languageOptions: {
            parserOptions: {
                projectService: false,
                project: false,
            },
        },
        rules: {
            ...tseslint.configs.disableTypeChecked.rules,
        },
    },

    // ============================================
    // RELAXED RULES FOR JAVASCRIPT FILES
    // ============================================
    {
        files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
        rules: {
            "@typescript-eslint/explicit-function-return-type": "off",
        },
    },

    // ============================================
    // REPO TOOLING RUNS IN NODE, NOT IN A BROWSER
    // ============================================
    // tools/ holds scripts the package scripts invoke with `node` (docs:content, docs:api). They
    // are reached by a run started from the repo root and by no package lint gate, and the base
    // config declares browser globals only, so `console` and `process` read as undeclared and
    // `no-undef` fires on every line that uses them. Declaring the environment they actually run
    // in is the fix; switching `no-undef` off would stop it catching a real typo here.
    {
        files: ["tools/**/*.js", "tools/**/*.mjs", "tools/**/*.cjs"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
);
