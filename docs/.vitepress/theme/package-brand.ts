// The packages whose docs carry their own brand. Their lockups are docs/public/brand/graphty-<package>-lockup-*.svg;
// a package listed in FAVICON_PACKAGES also has docs/public/brand/<package>/favicon.{svg,ico}.
export const LOCKUP_PACKAGES = ["graphty-element", "algorithms", "layout", "cytoscape-extensions", "graph-io"];
export const FAVICON_PACKAGES = ["graphty-element", "algorithms", "layout", "graph-io"];

/**
 * The branded package a page belongs to, from its path relative to the docs root (`algorithms/guide/flow.md`).
 * @param relativePath - the page's path relative to the docs root
 * @returns the package name, or undefined for a page about graphty as a whole
 */
export function packageOf(relativePath: string): string | undefined {
    const first = relativePath.split("/")[0];
    return LOCKUP_PACKAGES.includes(first) ? first : undefined;
}
