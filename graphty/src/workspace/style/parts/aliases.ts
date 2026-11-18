/**
 * Other words a reader may type into Find a setting for a style channel: the words drawing
 * programs use for the same thing ("stroke" for a border). Data only, keyed by the element's
 * channel ids; no word names a program.
 */

import type { Channel } from "@graphty/graphty-element/catalog";

/** Extra search words, by channel. */
export const SEARCH_ALIASES: Readonly<Partial<Record<Channel, readonly string[]>>> = {
    "node.color": ["paint", "background", "fill color"],
    "edge.color": ["stroke", "line color", "paint"],
    "node.borderColor": ["stroke", "line color", "outline color"],
    "node.borderWidth": ["stroke width", "pen width", "line width"],
    "edge.width": ["stroke width", "pen width", "line width"],
    "node.borderStyle": ["stroke style", "dash"],
    "edge.style": ["stroke style", "dash", "line pattern"],
    "node.labelFont": ["typeface", "font family"],
    "edge.labelFont": ["typeface", "font family"],
    "node.labelSize": ["font size", "text size"],
    "edge.labelSize": ["font size", "text size"],
    "node.shadowColor": ["drop shadow"],
    "node.shadowBlur": ["drop shadow", "blur"],
    "node.zIndex": ["z-index", "z order", "layer order"],
    "node.drawOrder": ["z-index", "z order", "paint order"],
    "edge.bends": ["waypoints", "control points"],
    "edge.arrowHead": ["marker", "arrow", "end marker"],
    "edge.arrowTail": ["marker", "arrow", "start marker"],
    "node.image": ["icon", "picture", "background image"],
    "node.texture": ["picture", "icon"],
    "node.opacity": ["transparency", "alpha"],
    "edge.opacity": ["transparency", "alpha"],
    "node.visible": ["hide", "display"],
    "edge.visible": ["hide", "display"],
    "node.gradientColors": ["gradient stops"],
};
