import type { Preview } from "@storybook/html-vite";
import { configure } from "storybook/test";

import { WAIT_GUARD_MS } from "../../tools/test-wait-guard.mjs";

// A play function's waitFor and findBy* wait until the monorepo's one hang guard, not Testing
// Library's 1000 ms: a deadline on a wait fails a story whenever the machine is busy
// (tools/test-wait-guard.mjs).
configure({ asyncUtilTimeout: WAIT_GUARD_MS });

const preview: Preview = {
    parameters: {
        controls: {
            expanded: true,
        },
        options: {
            storySort: {
                method: "alphabetical",
            },
        },
    },
};

export default preview;
