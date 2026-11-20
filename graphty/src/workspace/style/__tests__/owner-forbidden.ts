/**
 * Everything the owner ordered out of the Style panel, with the owner ledger entry that ordered it
 * (tmp/style-panel-design/v6/owner-ledger.md). owner-forbidden.real-element.test.tsx walks the v2 Node and
 * Edge Style tabs in 2D and 3D -- every section, "+" menu, row and pop-over -- Settings, and the source under
 * graphty/src/workspace/style/, and fails when any of these comes back. This list only grows.
 */

/** One removal the owner ordered. */
export interface Forbidden {
    /** What it is, in a few words. */
    readonly what: string;
    /** The owner ledger entries that ordered it out. */
    readonly ledger: string;
    /** Visible words of a section title, "+" menu item, row name or pop-over line it shows as. */
    readonly text?: RegExp;
    /** The channels a line writing it names (a line's data-line, a layer's written channel). */
    readonly channel?: RegExp;
    /** The words of a Settings control it shows as. */
    readonly setting?: RegExp;
    /** Source text under graphty/src/workspace/style/ (tests excluded) that would bring it back. */
    readonly source?: RegExp;
    /** A CSS selector in the v2 panel or its pop-overs that would draw it. */
    readonly selector?: string;
}

/** The owner's removals: see the file header. */
export const OWNER_FORBIDDEN: readonly Forbidden[] = [
    {
        what: "a Style row highlights its layer's elements on the graph while pointed at",
        ledger: "E181, E182",
        source: /useRowPeek|selection\.peek\(/,
    },
    {
        what: "a Settings switch for the row hover highlight",
        ledger: "E181",
        setting: /Highlight on hover/i,
    },
    {
        what: "the sliders icon for a row's settings",
        ledger: "E178",
        selector: "svg.lucide-sliders-horizontal",
    },
    {
        what: "Glyph as a style of its own beside Label (it is a kind of the Label row)",
        ledger: "E275, E276",
        text: /^Glyph$/,
        selector: '[data-thing="glyph"]',
    },
    {
        what: "the Order and groups section, and its Order and Group things",
        ledger: "E419, E420, E422",
        text: /^(Order and groups|Order|Group|Stacking)$/,
        selector: '[data-section="node-order"], [data-thing="order"], [data-thing="group"]',
    },
    {
        what: "Group outline, as a '+' item, a row, a shader place, a Group by line or an outline click",
        ledger: "E420, E422",
        text: /^Group outline$/,
        selector: '[data-thing="groupOutline"]',
        source: /node\.groupOutline|groupOutlineShaders|isGroupOutline|GroupOutlinePass|place === "group"|Around the group|GroupByLine|group-outline-click/,
    },
    {
        what: "a panel line for node.zIndex, node.drawOrder or any node.group* channel",
        ledger: "E420, E422",
        channel: /^node\.(zIndex|drawOrder|group[A-Z]\w*)$/,
    },
    {
        what: "custom shaders apart from built-in ones: a Custom shader entry, a place split (Around / Material / Along) or origin chips",
        ledger: "E366, E373, E377, E380, E381, E382",
        text: /^(Custom shader|Custom shader\.\.\.|Around|Material|Along|Built in|This project)$/,
        selector: '[data-filter="origin"]',
        source: /ORIGIN_FILTERS|V2_SHADER_ADDS|includes\("\/"\)/,
    },
    {
        what: "choosing a place when using a shader: a Place line in a shader use's pop-over",
        ledger: "E368",
        channel: /^node\.shaders.*\.place$|^edge\.shaders.*\.place$/,
        source: /writePlace/,
    },
    {
        what: "a reader switch for empty Style sections, and its Add section bar (every section is shown)",
        ledger: "E106, E209",
        setting: /Show empty style sections/i,
        text: /^Add section$/,
        selector: "[data-add-section]",
        source: /styleEmptySections|STYLE_EMPTY_SECTIONS/,
    },
];
