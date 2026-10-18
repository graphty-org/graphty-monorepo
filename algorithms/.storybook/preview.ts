import type { Preview } from "@storybook/html";
import DocumentationTemplate from "./DocumentationTemplate.mdx";

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
            // Show each story's consumer code (parameters.docs.source.code) beside its canvas
            codePanel: true,
        },
        // Report accessibility violations in the Accessibility panel and the test run, without failing yet
        a11y: {
            test: "todo",
        },
        options: {
            storySort: {
                // Sections in reading order. Within a section, entries keep the order of the stories
                // list in main.ts.
                // ponytail: section list kept here until tools/storybook-taxonomy.json exists to import it from
                order: [
                    "Introduction",
                    "Centrality",
                    "Communities",
                    "Connected components",
                    "Paths",
                    "Spanning trees",
                    "Flow",
                    "Matching",
                    "Link prediction",
                ],
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
