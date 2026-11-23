// gazetteer ESLint configuration: the root config, plus the six strict type rules (#2345) for this package.
// They live here, not in the root's per-package list, so adding a package leaves the root config -- a lint
// input of every project and part of CI's ESLint cache key -- unchanged.
import root from "../eslint.config.js";

export default [
    ...root,
    {
        files: ["src/**/*.ts", "test/**/*.ts"],
        rules: {
            "@typescript-eslint/no-unnecessary-condition": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-return": "error",
        },
    },
];
