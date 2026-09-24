// graphty-element ESLint configuration
// Extends root config with package-specific rules
//
// WHY THIS FILE IS SHORT, AND MUST STAY SHORT. It inherits the root configuration by importing
// it. In September 2026 this file was overwritten with a byte-for-byte copy of an older root
// config, which cost three things at once and failed no gate: the package-specific rules below
// (the layers-mutation guard among them), the package-specific ignores, and -- because the copy
// carried the root's old global `**/stories/**` ignore -- the root's own fix that makes story
// files lintable at all. `pnpm -r run lint` and `nx run-many -t lint` both run ESLint from THIS
// directory with THIS config, so a stale copy here silently disables whatever the root gained.
// Never inline the root config; import it.

import rootConfig from "../eslint.config.js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    // Inherit all rules from root config (includes JSDoc)
    ...rootConfig,

    // ============================================
    // PACKAGE-SPECIFIC IGNORES
    // ============================================
    {
        ignores: [
            "index.d.ts",
            "index.js",
            "test/helpers/scripts/**/*.js",
            "test/fast-check-experiment/**",
            "examples/**/*.js",
            "bin/**",
            ".storybook/webllm-stub.js",
            "docs/.vitepress/**",
            "scripts/**",
        ],
    },

    // ============================================
    // PACKAGE-SPECIFIC RULES
    // ============================================
    {
        files: ["**/*.ts", "**/*.tsx"],
        rules: {
            // Prevent architectural violations - don't mutate layers directly
            "no-restricted-syntax": [
                "error",
                {
                    selector:
                        'MemberExpression[property.name="layers"] CallExpression[callee.property.name=/^(push|splice|unshift|pop|shift)$/]',
                    message: "Do not mutate layers directly. Use StyleManager.addLayer() or StyleManager.insertLayer().",
                },
            ],
        },
    },

    // ============================================
    // ALGORITHM FILES - RELAXED REQUIRE-AWAIT
    // ============================================
    {
        files: ["src/algorithms/**/*.ts"],
        rules: {
            "@typescript-eslint/require-await": "off",
        },
    },

    // ============================================
    // TEST FILES - ALLOW TS-EXPECT-ERROR
    // ============================================
    {
        files: ["**/*.test.ts", "test/**/*.ts", "test/**/*.js"],
        rules: {
            // Allow ts-expect-error in tests
            "@typescript-eslint/ban-ts-comment": [
                "error",
                {
                    "ts-nocheck": false,
                    "ts-ignore": true,
                    "ts-expect-error": false,
                    minimumDescriptionLength: 5,
                },
            ],
        },
    },
);
