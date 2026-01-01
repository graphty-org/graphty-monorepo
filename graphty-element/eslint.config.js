// graphty-element ESLint configuration
// Extends root config with package-specific rules

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
