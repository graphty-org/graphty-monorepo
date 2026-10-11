/**
 * Cytoscape.js 3.34's own defaults for the properties graph-io carries, read from a headless core
 * (`cy.style().getDefaultProperty(name).strValue` and the first `cy.style().defaultLength` entries of its
 * stylesheet).
 *
 * Two tables, because Cytoscape.js uses two kinds of default:
 * - the property defaults: the value a property has when no rule sets it, and the value a `data()` or `mapData()`
 *   that fails (a missing field, a value the property refuses) RESETS the property to, whatever the rules beneath say.
 *   An edge's width resets to 30px there, not to the 3px edges are drawn with.
 * - the default stylesheet: rules Cytoscape.js puts beneath every stylesheet (edges 3px wide, compound parents drawn
 *   as gray rectangles, loops curved, selected elements blue).
 */

/** The property defaults, by Cytoscape.js property name, as Cytoscape.js writes them. */
export const CYJS_PROPERTY_DEFAULTS: ReadonlyMap<string, string> = new Map([
    ["background-color", "rgb(153,153,153)"],
    ["background-opacity", "1"],
    ["opacity", "1"],
    ["border-color", "rgb(0,0,0)"],
    ["border-width", "0px"],
    ["border-style", "solid"],
    ["shape", "ellipse"],
    ["width", "30px"],
    ["height", "30px"],
    ["label", ""],
    ["color", "rgb(0,0,0)"],
    ["font-size", "16px"],
    ["font-family", "Helvetica Neue, Helvetica, sans-serif"],
    ["font-weight", "normal"],
    ["font-style", "normal"],
    ["visibility", "visible"],
    ["display", "element"],
    ["text-valign", "top"],
    ["text-halign", "center"],
    ["line-color", "rgb(153,153,153)"],
    ["line-style", "solid"],
    ["target-arrow-shape", "none"],
    ["source-arrow-shape", "none"],
    ["target-arrow-color", "rgb(153,153,153)"],
    ["source-arrow-color", "rgb(153,153,153)"],
    ["curve-style", "haystack"],
    ["arrow-scale", "1"],
    ["source-label", ""],
    ["target-label", ""],
]);

/**
 * The rules of Cytoscape.js's default stylesheet that set a property graph-io carries, in its order. They sit
 * beneath every stylesheet a file gives.
 */
export const CYJS_DEFAULT_STYLESHEET: readonly {
    readonly selector: string;
    readonly style: Readonly<Record<string, string>>;
}[] = [
    {
        selector: ":parent",
        style: {
            shape: "rectangle",
            "background-color": "rgb(238,238,238)",
            "border-color": "rgb(204,204,204)",
            "border-width": "1px",
        },
    },
    { selector: "edge", style: { width: "3px" } },
    { selector: ":loop", style: { "curve-style": "bezier" } },
    { selector: "edge:compound", style: { "curve-style": "bezier" } },
    {
        selector: ":selected",
        style: {
            "background-color": "rgb(1,105,217)",
            "line-color": "rgb(1,105,217)",
            "source-arrow-color": "rgb(1,105,217)",
            "target-arrow-color": "rgb(1,105,217)",
        },
    },
    {
        selector: ":parent:selected",
        style: { "background-color": "rgb(204,225,249)", "border-color": "rgb(174,200,229)" },
    },
];
