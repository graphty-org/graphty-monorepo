// The root config, plus globals for the dry-run script: it runs in Node and drives a browser
// through Playwright, so its page.evaluate callbacks run in the page.
import globals from "globals";

import root from "../eslint.config.js";

export default [
    ...root,
    {
        files: ["dryrun/**/*.mjs"],
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
        rules: {
            "jsdoc/require-param": "off",
            "jsdoc/require-returns": "off",
        },
    },
];
