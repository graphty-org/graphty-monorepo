import React from "react";

/** The stroke the start page's own glyphs are drawn with, matching lucide's. */
const STROKE = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
} as const;

/**
 * Three linked dots: communities, and the algorithms count.
 * @returns The glyph
 */
export function Groups(): React.JSX.Element {
    return (
        <svg {...STROKE}>
            <circle cx="7" cy="8" r="3" />
            <circle cx="17" cy="8" r="3" />
            <circle cx="12" cy="17" r="3" />
            <path d="M9 10l2 5M15 10l-2 5" />
        </svg>
    );
}

/**
 * A hub and its spokes: key players.
 * @returns The glyph
 */
export function Star(): React.JSX.Element {
    return (
        <svg {...STROKE}>
            <circle cx="12" cy="12" r="3.5" />
            <circle cx="4" cy="5" r="1.5" />
            <circle cx="20" cy="5" r="1.5" />
            <circle cx="4" cy="19" r="1.5" />
            <circle cx="20" cy="19" r="1.5" />
            <path d="M9.5 9.5 5 6M14.5 9.5 19 6M9.5 14.5 5 18M14.5 14.5 19 18" />
        </svg>
    );
}

/**
 * Two ends joined by a winding route: shortest path.
 * @returns The glyph
 */
export function Path(): React.JSX.Element {
    return (
        <svg {...STROKE}>
            <circle cx="5" cy="18" r="2" />
            <circle cx="19" cy="6" r="2" />
            <path d="M7 18h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6" />
        </svg>
    );
}
