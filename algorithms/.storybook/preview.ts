import type { Preview } from "@storybook/html";
import DocumentationTemplate from "./DocumentationTemplate.mdx";
import { configure } from "@storybook/test";

import { WAIT_GUARD_MS } from "../../tools/test-wait-guard.mjs";

// A play function's waitFor and findBy* wait until the monorepo's one hang guard, not Testing
// Library's 1000 ms: a deadline on a wait fails a story whenever the machine is busy
// (tools/test-wait-guard.mjs).
configure({ asyncUtilTimeout: WAIT_GUARD_MS });

const preview: Preview = {
    parameters: {
        controls: {
            expanded: true,
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        docs: {
            page: DocumentationTemplate,
        },
        options: {
            storySort: {
                method: "alphabetical",
            },
        },
        // Visual capture settings (visual-review reads them)
        chromatic: {
            // Delay for graph layout to settle
            delay: 300,
        },
    },
};

export default preview;
