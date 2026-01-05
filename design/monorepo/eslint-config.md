# ESLint Configuration Redesign Plan

## Executive Summary

This plan redesigns the ESLint configuration for the graphty-monorepo to:

1. **Minimize stylistic rules** - Let formatters handle formatting, not ESLint
2. **Maximize error prevention** - Focus on catching bugs and preventing errors
3. **Improve Claude Code compatibility** - Less stylistic friction means smoother AI-assisted development
4. **Unify configuration across packages** - Single source of truth for all packages

## Research Findings

### Claude Code and Stylistic Rules

Based on research from [Anthropic's Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices) and community guides:

- Claude Code can provide code reviews "beyond what traditional linting tools detect"
- The recommended approach is to document style expectations in `CLAUDE.md` files
- Stylistic ESLint rules create unnecessary friction with AI-generated code
- AI assistants like Claude focus on semantics and correctness, not formatting minutiae

### ESLint Stylistic vs Formatters

Per [typescript-eslint's recommendation](https://typescript-eslint.io/users/what-about-formatting/) and [Prettier's documentation](https://prettier.io/docs/comparison.html):

- **ESLint should focus on code quality and safety, not formatting**
- Formatters (Prettier, dprint, Biome) are purpose-built for formatting
- Using ESLint for formatting causes issues like incorrect auto-fixes and conflicts
- [ESLint Stylistic](https://eslint.style/) exists but is **not recommended** for general use

### typescript-eslint Configuration Tiers

From [typescript-eslint shared configs](https://typescript-eslint.io/users/configs/):

| Config                     | Description                                          | Stability  |
| -------------------------- | ---------------------------------------------------- | ---------- |
| `recommended`              | Core correctness rules, catches "almost always" bugs | Stable     |
| `recommended-type-checked` | Adds type-aware correctness rules                    | Stable     |
| `strict`                   | More opinionated bug-catching rules                  | May change |
| `strict-type-checked`      | Comprehensive bug prevention with types              | May change |
| `stylistic`                | Best practices without logic impact                  | Stable     |
| `stylistic-type-checked`   | Type-aware stylistic rules                           | Stable     |

**Recommendation**: Use `strict-type-checked` for maximum error prevention (current setup is correct).

## Current State Analysis

### Current Configuration Issues

1. **Excessive stylistic rules** (50+ stylistic rules across packages)
2. **Duplicated configuration** (algorithms, graphty-element, graphty each have ~100 lines of rules)
3. **Inconsistency** (algorithms uses indent: 4, base config uses indent: 2)
4. **Unused base config** (eslint.config.base.js exists but only layout uses it)
5. **Migration rules disabled** (many @typescript-eslint/no-unsafe-\* rules are off)

### Stylistic Rules Currently Enforced

The current configs enforce ~30 `@stylistic/*` rules including:

- Indentation, quotes, semicolons
- Spacing around operators, braces, brackets
- Line breaks, trailing commas
- Arrow function parentheses

**These should all be removed and handled by a formatter.**

### Error Prevention Rules Currently Enabled

Good rules already in place:

- `@typescript-eslint/explicit-function-return-type`
- `@typescript-eslint/no-explicit-any` (error in production)
- `eqeqeq`, `curly`, `no-var`, `prefer-const`
- `consistent-return`, `no-template-curly-in-string`

## Proposed Architecture

### New Configuration Structure

```
graphty-monorepo/
├── eslint.config.js           # Root config - all packages inherit from this
├── algorithms/
│   └── (no eslint.config.js)  # Inherits from root
├── layout/
│   └── (no eslint.config.js)  # Inherits from root
├── graphty-element/
│   └── eslint.config.js       # Extends root + adds JSDoc rules
└── graphty/
    └── eslint.config.js       # Extends root + adds React rules
```

### Root Configuration Philosophy

1. **No stylistic rules** - Remove all `@stylistic/*` rules
2. **Maximum error prevention** - Use `tseslint.configs.strictTypeChecked`
3. **Keep safety rules** - Rules that prevent bugs, not enforce style
4. **Package-specific overrides** - Only where truly necessary (React, JSDoc)

### Recommended Formatter Integration

Since we're removing stylistic ESLint rules, we should use a formatter:

**Option A: Prettier** (most popular)

```bash
npm install --save-dev prettier
```

**Option B: dprint** (faster, used by many TypeScript projects)

```bash
npm install --save-dev dprint
```

**Option C: No formatter** (let developers/AI format as they wish)

- Risk of inconsistent formatting
- But simplest approach if style doesn't matter

**Recommendation**: Start with Option C (no formatter), add Prettier later if formatting inconsistency becomes a problem.

## Proposed Rule Categories

### Category 1: Error Prevention (KEEP)

These rules catch actual bugs:

```javascript
// Type Safety
'@typescript-eslint/no-explicit-any': 'error',
'@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
'@typescript-eslint/no-floating-promises': 'error',
'@typescript-eslint/no-misused-promises': 'error',
'@typescript-eslint/await-thenable': 'error',
'@typescript-eslint/no-unnecessary-type-assertion': 'error',

// Logic Errors
'eqeqeq': 'error',
'no-template-curly-in-string': 'error',
'consistent-return': 'error',
'no-fallthrough': 'error',

// Best Practices
'no-var': 'error',
'prefer-const': 'error',
'curly': 'error',
```

### Category 2: Code Quality (KEEP)

These improve code maintainability:

```javascript
'no-console': ['warn', { allow: ['warn', 'error'] }],
'no-duplicate-imports': 'error',
'no-useless-constructor': 'error',
'prefer-template': 'error',
'dot-notation': 'error',
```

### Category 3: Import Organization (KEEP - minimal)

Only sorting, no style:

```javascript
'simple-import-sort/imports': 'error',
'simple-import-sort/exports': 'error',
```

### Category 4: Stylistic Rules (REMOVE)

All of these should be **removed**:

```javascript
// REMOVE - formatting concerns
'@stylistic/indent': 'error',
'@stylistic/quotes': 'error',
'@stylistic/semi': 'error',
'@stylistic/comma-dangle': 'error',
'@stylistic/brace-style': 'error',
'@stylistic/array-bracket-spacing': 'error',
'@stylistic/object-curly-spacing': 'error',
'@stylistic/space-before-function-paren': 'error',
// ... all other @stylistic/* rules
```

## Proposed Root Configuration

```javascript
// eslint.config.js
import eslint from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default tseslint.config(
    // Ignore patterns
    {
        ignores: [
            "**/dist/**",
            "**/node_modules/**",
            "**/coverage/**",
            "**/storybook-static/**",
            "**/*.config.js",
            "**/*.config.ts",
        ],
    },

    // Base JavaScript rules
    eslint.configs.recommended,

    // TypeScript strict rules for all TS files
    {
        files: ["**/*.ts", "**/*.tsx"],
        extends: [...tseslint.configs.strictTypeChecked],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            // === ERROR PREVENTION ===
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

            // === LOGIC SAFETY ===
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

            // === CODE QUALITY ===
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "no-duplicate-imports": "error",
            "no-useless-constructor": "error",
            "no-useless-rename": "error",
            "no-useless-computed-key": "error",
            "prefer-destructuring": ["error", { object: true, array: false }],
            "prefer-rest-params": "error",
            "prefer-spread": "error",

            // === IMPORT SORTING ===
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
        },
    },

    // Relaxed rules for test files
    {
        files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/unbound-method": "off",
            "no-console": "off",
        },
    },
);
```

## Package-Specific Extensions

### graphty-element/eslint.config.js

```javascript
import rootConfig from "../eslint.config.js";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

export default tseslint.config(
    ...rootConfig,

    // JSDoc rules for public API documentation
    jsdoc.configs["flat/recommended-typescript-error"],
    {
        plugins: { jsdoc },
        rules: {
            "jsdoc/require-description": "error",
            "jsdoc/require-param-description": "error",
            "jsdoc/require-returns-description": "error",
            "jsdoc/no-types": "error",
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

    // Disable JSDoc for tests
    {
        files: ["**/*.test.ts", "**/test/**/*.ts", "**/*.stories.ts"],
        rules: {
            "jsdoc/require-jsdoc": "off",
            "jsdoc/require-description": "off",
            "jsdoc/require-param": "off",
            "jsdoc/require-param-description": "off",
            "jsdoc/require-returns": "off",
            "jsdoc/require-returns-description": "off",
        },
    },
);
```

### graphty/eslint.config.js

```javascript
import rootConfig from "../eslint.config.js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import storybookPlugin from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";

export default tseslint.config(
    ...rootConfig,
    ...storybookPlugin.configs["flat/recommended"],

    {
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
            "react-refresh": reactRefreshPlugin,
        },
        settings: {
            react: { version: "detect" },
        },
        rules: {
            "react/jsx-uses-react": "off",
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "react-refresh/only-export-components": [
                "warn",
                {
                    allowConstantExport: true,
                },
            ],
        },
    },
);
```

## Migration Plan

### Phase 1: Create New Root Config

1. Create new `eslint.config.js` at root with proposed configuration
2. Remove `eslint.config.base.js` (no longer needed)
3. Remove `@stylistic/eslint-plugin` from dependencies

### Phase 2: Update Package Configs

1. **algorithms**: Delete `eslint.config.js`, inherit from root
2. **layout**: Delete `eslint.config.js`, inherit from root
3. **graphty-element**: Simplify to only add JSDoc rules
4. **graphty**: Simplify to only add React rules

### Phase 3: Fix Resulting Linting Errors

Since we're keeping `strictTypeChecked` and removing disabled rules:

1. Run `npm run lint` across all packages
2. Fix type-safety errors (the previously-disabled `@typescript-eslint/no-unsafe-*` rules)
3. This will take effort but improves code quality

### Phase 4: (Optional) Add Formatter

If formatting inconsistency becomes a problem:

1. Add Prettier with minimal config
2. Add `eslint-config-prettier` to disable any remaining conflicts
3. Add format scripts to package.json

## Rules Comparison: Before vs After

| Category                   | Before             | After            |
| -------------------------- | ------------------ | ---------------- |
| Stylistic (`@stylistic/*`) | ~30 rules          | 0 rules          |
| TypeScript type-checking   | Partially disabled | Fully enabled    |
| Error prevention           | ~15 rules          | ~20 rules        |
| Import sorting             | 2 rules            | 2 rules          |
| Total rules                | ~50+ custom rules  | ~25 custom rules |

## Benefits

### For Claude Code / AI Development

1. **Less style friction**: AI can focus on logic, not matching exact spacing
2. **Faster iteration**: No time wasted on stylistic auto-fixes
3. **Cleaner diffs**: Changes reflect actual logic differences
4. **Better reviews**: Claude can focus on what matters (bugs, patterns)

### For Error Prevention

1. **All type-checking enabled**: No more `@typescript-eslint/no-unsafe-*: 'off'`
2. **Stricter rules**: `strictTypeChecked` catches more bugs
3. **Clearer intent**: Rules focus on safety, not aesthetics

### For Maintenance

1. **Single source of truth**: One root config
2. **Less configuration**: ~50% fewer rules
3. **Easier updates**: Update once, applies everywhere

## Decisions Made

### Decision 1: Formatter Integration - ADD PRETTIER

**Decision**: Add Prettier with minimal configuration.

**Rationale**:

- One-time normalization with a single command
- Zero thinking required - neither humans nor Claude need to think about formatting
- Deterministic CI checks (`prettier --check`)
- Claude Code reads `.prettierrc` and follows it automatically
- Prettier is opinionated, removing all debate

**Prettier Configuration** (`.prettierrc`):

```json
{
    "tabWidth": 4,
    "printWidth": 120,
    "trailingComma": "all"
}
```

Minimal config - let Prettier's defaults handle everything else (double quotes is Prettier's default).

### Decision 2: Migration Effort - IMMEDIATE

**Decision**: Enable all strict TypeScript rules immediately and fix all errors.

The currently-disabled unsafe rules will be enabled:

```javascript
'@typescript-eslint/no-unsafe-argument': 'error',
'@typescript-eslint/no-unsafe-assignment': 'error',
'@typescript-eslint/no-unsafe-member-access': 'error',
'@typescript-eslint/no-unsafe-call': 'error',
'@typescript-eslint/no-unsafe-return': 'error',
'@typescript-eslint/restrict-template-expressions': 'error',
```

### Decision 3: Existing Code Formatting - NORMALIZE NOW

**Decision**: Run Prettier on entire codebase immediately to normalize all formatting.

## Sources

- [Claude Code: Best Practices for Agentic Coding](https://www.anthropic.com/engineering/claude-code-best-practices)
- [typescript-eslint Shared Configs](https://typescript-eslint.io/users/configs/)
- [typescript-eslint: What About Formatting?](https://typescript-eslint.io/users/what-about-formatting/)
- [Prettier: Comparison with Linters](https://prettier.io/docs/comparison.html)
- [ESLint v9 Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Modern Linting in 2025: ESLint Flat Config](https://advancedfrontends.com/eslint-flat-config-typescript-javascript/)
- [ESLint, Prettier, and Stylelint in 2025](https://mom-backed-developer.medium.com/eslint-prettier-and-stylelint-in-2025-do-we-still-need-them-in-the-age-of-ai-0aae7e43eb52)

## Next Steps

1. Review this plan and decide on the three decision points above
2. Approve the plan
3. Implement in phases as outlined
4. Test thoroughly with `npm run lint` across all packages
5. Fix any type-safety errors that arise from enabling strict rules
