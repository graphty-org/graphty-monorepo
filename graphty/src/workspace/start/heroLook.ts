/**
 * The start page's look, shared by its graph (`HeroGraph.tsx`) and the style tree's Hover highlight
 * template, which rebuilds the page's hover layers from selections.
 */

import { defaultEdgeStyle } from "@graphty/graphty-element/schema";

/** How solid the highlight around the focused node is. */
export const HIGHLIGHT_OPACITY = 0.5;

/** The page's colors the graph is drawn in, per color scheme (start.css holds the same tokens). */
export const LOOK = {
    light: {
        ring: "#97c800",
        path: "#588300",
        edge: "#2a3045",
        edgeOpacity: 0.45,
        hot: "#14161f",
        node: "#6b7286",
        surface: "#ffffff",
        text: "#14161f",
    },
    dark: {
        ring: "#c4f23a",
        path: "#c4f23a",
        edge: "#9aa3b8",
        edgeOpacity: 0.65,
        hot: "#f2f3f7",
        node: "#9aa3b8",
        surface: "#1a1c24",
        text: "#f2f3f7",
    },
} as const;

/** The edge width graphty-element draws when no layer sets one. */
export const EDGE_WIDTH = defaultEdgeStyle.line?.width ?? 1;
