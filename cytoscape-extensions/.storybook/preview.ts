import type { Preview } from "@storybook/html-vite";

// A deploy renames the lazily loaded chunks (each dataset is one), so a page loaded before it asks for chunks that are
// gone. Vite reports the failed import as vite:preloadError: reload once to get the new chunk names, and only once per
// page, so a chunk that is really missing still shows its error. The once-per-page marker lives in sessionStorage;
// when storage is blocked nothing would remember the reload and the page would reload forever, so it does not reload.
globalThis.addEventListener("vite:preloadError", (event) => {
    const key = "graphty-chunk-reload";
    try {
        if (sessionStorage.getItem(key) === location.href) {
            return;
        }
        sessionStorage.setItem(key, location.href);
    } catch {
        // storage blocked: let the error show
        return;
    }
    event.preventDefault();
    location.reload();
});

const preview: Preview = {
    parameters: {
        layout: "fullscreen",
        controls: {
            expanded: true,
        },
        options: {
            // the gallery first, then the large graphs; within a page, the Overview and then its tiles in catalog order
            // (the export order)
            storySort: {
                order: [
                    "Gallery",
                    [
                        "Layouts",
                        "Centrality",
                        "Communities",
                        "Traversal",
                        "Paths And Trees",
                        "Structure",
                        "Flows And Cuts",
                        "Link Prediction",
                        "Generators",
                        "Datasets",
                        "Formats",
                        "Large graphs",
                    ],
                ],
            },
        },
    },
};

export default preview;
