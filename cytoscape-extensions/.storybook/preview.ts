import type { Preview } from "@storybook/html-vite";

// A deploy renames the lazily loaded chunks (each dataset is one), so a page loaded before it asks for chunks that are
// gone. Vite reports the failed import as vite:preloadError: reload once to get the new chunk names, and only once per
// page, so a chunk that is really missing still shows its error.
globalThis.addEventListener("vite:preloadError", (event) => {
    const key = "graphty-chunk-reload";
    let reloaded: string | null = null;
    try {
        reloaded = sessionStorage.getItem(key);
    } catch {
        // storage blocked: reload anyway, at worst once more
    }
    if (reloaded === location.href) {
        return;
    }
    try {
        sessionStorage.setItem(key, location.href);
    } catch {
        // storage blocked
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
