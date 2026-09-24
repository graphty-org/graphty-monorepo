import type { OperationCategory } from "../managers/OperationQueueManager";

interface ObsolescenceRule {
    /**
     * Categories that this operation obsoletes
     */
    obsoletes: OperationCategory[];

    /**
     * Whether to respect progress (don't cancel >90% complete)
     */
    respectProgress?: boolean;

    /**
     * Only obsolete queued operations, not running ones
     */
    skipRunning?: boolean;
}

/**
 * Default obsolescence rules for operation categories
 * These rules define which operations make others obsolete
 */
export const OBSOLESCENCE_RULES: Partial<Record<OperationCategory, ObsolescenceRule>> = {
    // Data operations obsolete dependent calculations.
    //
    // WHAT `algorithm-run` MEANS HERE, because the rule below is only correct for one reading of
    // it: a computation OVER the graph, whose answer describes the data it read. Arriving data
    // makes such an answer wrong, so a load cancels one that has not finished -- and that is what
    // keeps a graph arriving in ten chunks from running its on-load algorithms ten times.
    //
    // A STYLE WRITE IS NOT ONE OF THOSE, which is why `style-edit` exists and why no rule here
    // obsoletes it. A layer is a standing instruction about how to paint whatever the graph
    // holds, so arriving data cannot make it stale; and the only order a render function can use
    // is "issue the edits, then set the data", because it is called synchronously and cannot
    // await a run. While style writes shared this category that order aborted every edit before
    // its body ran -- neither a commit nor a refusal, so the promise a consumer is told it may
    // forget never settled, nothing reached `problems()`, and the layer was simply gone.
    "data-add": {
        obsoletes: ["layout-update", "algorithm-run"],
        respectProgress: true,
    },

    "data-remove": {
        obsoletes: ["layout-update", "algorithm-run", "render-update"],
        respectProgress: true,
    },

    "data-update": {
        obsoletes: ["algorithm-run", "render-update"],
        respectProgress: true,
        skipRunning: false,
    },

    // Style changes obsolete renders
    // Note: style-init does NOT obsolete layout-set to support stateless design
    // where layout can be set before or after style template
    "style-init": {
        obsoletes: ["style-init", "style-apply", "render-update"],
        respectProgress: false, // Style init is critical
    },

    "style-apply": {
        obsoletes: ["render-update"],
        respectProgress: true,
    },

    // Layout changes obsolete dependent operations
    "layout-set": {
        obsoletes: ["layout-set", "layout-update", "camera-update"],
        respectProgress: false, // New layout engine is important
    },

    "layout-update": {
        obsoletes: ["layout-update", "render-update"],
        respectProgress: true,
    },

    // Camera changes obsolete renders and other camera operations
    "camera-update": {
        obsoletes: ["camera-update", "render-update"],
        respectProgress: false, // New camera state should interrupt old animations
        skipRunning: false, // Allow interrupting running camera animations
    },

    // A VIEW-MODE SWITCH IS CANCELLED BY NOTHING BUT A LATER VIEW-MODE SWITCH, which is why it is
    // not a `camera-update`. Where the viewer stands is a question about the positions in front of
    // them, so a new layout rightly cancels a pending zoom-to-fit; which of the four views is
    // being drawn is not. Arriving data, a new layout engine and a restyle all leave it correct.
    //
    // The defect this closes reached a consumer through the most ordinary two lines anybody would
    // write -- `element.viewMode = "2d"` followed by `element.layout = "circular"`. The layout
    // cancelled the pending switch, the element's own `viewMode` getter went on answering "2d",
    // and the graph was drawn through a perspective camera. Measured 2026-09-22 against a page
    // importing only the published entry points: set together, `graph.getViewMode()` answered
    // "3d" and the active camera was a perspective `UniversalCamera`; set three seconds apart,
    // "2d" and an orthographic `FreeCamera`.
    "view-mode": {
        obsoletes: ["view-mode"],
        respectProgress: false, // The latest view the consumer asked for is the one to draw
    },
};
