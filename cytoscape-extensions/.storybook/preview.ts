import type { Preview } from "@storybook/html-vite";

const preview: Preview = {
    parameters: {
        layout: "fullscreen",
        controls: {
            expanded: true,
        },
        options: {
            // the gallery first; within a page, the Overview and then its tiles in catalog order (the export order)
            storySort: {
                order: [
                    "Gallery",
                    [
                        "Layouts",
                        "Centrality",
                        "Communities",
                        "Paths And Trees",
                        "Structure",
                        "Flows And Cuts",
                        "Link Prediction",
                        "Generators",
                        "Datasets",
                        "Formats",
                    ],
                    "Demo",
                ],
            },
        },
    },
};

export default preview;
