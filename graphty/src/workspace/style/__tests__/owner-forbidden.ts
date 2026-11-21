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
    /** A section "+" menu item it shows as (not a kind in a row's Switch to). */
    readonly plusItem?: RegExp;
    /** A "+" menu item or Switch to kind it shows as on the Node tab only (the edge tab keeps a look of that name). */
    readonly nodePlusItem?: RegExp;
    /** A "+" menu item or Switch to kind it shows as in one section only (data-section, e.g. "node-border"). */
    readonly sectionItem?: { readonly section: string; readonly item: RegExp };
    /** The channels a line writing it names (a line's data-line, a layer's written channel). */
    readonly channel?: RegExp;
    /** The words of a Settings control it shows as. */
    readonly setting?: RegExp;
    /** Source text under graphty/src/workspace/style/ (tests excluded) that would bring it back. */
    readonly source?: RegExp;
    /** A CSS selector in the v2 panel or its pop-overs that would draw it. */
    readonly selector?: string;
    /**
     * A real-input check the walk runs for it: "approved-controls", every element of the sidebar is an approved
     * control (approvedControls.ts); "only-plus-adds", a section's title and bar add nothing and only its "+" adds.
     */
    readonly check?: "approved-controls" | "only-plus-adds";
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
        // Only a "+" menu item: Glyph is rightly a kind in the Label row's Switch to, and names a row of that kind.
        plusItem: /^Glyph$/,
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
    {
        what: "information in the Style sidebar: a pill, chip, badge, caption, description or warning",
        ledger: "E174, E175",
        check: "approved-controls",
    },
    {
        what: "a '+' section whose title or bar is a button: only its '+' adds",
        ledger: "E210",
        check: "only-plus-adds",
    },
    {
        what: "the node outline: an Outline item in a Node '+' menu or Switch to, a node.outline* line or source",
        ledger: "E309, E310",
        nodePlusItem: /^Outline$/,
        channel: /^node\.outline/,
        source: /node\.outline/,
    },
    {
        what: "the halo (it is a Ring): a Halo item, row or line, or a node.halo* line or source",
        ledger: "E305, E496",
        text: /^Halo$/,
        plusItem: /^Halo$/,
        channel: /^node\.halo/,
        source: /node\.halo/,
    },
    {
        what: "a line under a row drawing an icon the other lines lack: a number's scrub slot is a letter, never a per-field icon",
        ledger: "E674, E183",
        selector: ".cm-scrub-slot[data-scrub] svg",
    },
    {
        what: "a toggle icon beside a label's Weight (the 'I'): Italic is a line of its own",
        ledger: "E674",
        selector: '.ws-row[data-line$="labelStyle.weight"] [data-testid="toggle-icon-button"]',
    },
    {
        what: "a Shaders section of its own: every shader is Effects' Shader item (or a Shape kind)",
        ledger: "E668, E675",
        selector: '[data-section$="-shaders"]',
    },
    {
        what: "one '+' item per arrow end or per end caption: each is one item whose row picks the end",
        ledger: "E495, E675",
        plusItem: /^(Target|Source|Middle target|Middle source) (end|caption)$/,
    },
    {
        what: "a Rings kind under Border: the ring is Effects' Ring item, and Border is the stroke on the node's own edge",
        ledger: "E675, E676",
        // Scoped to the Border section: Effects rightly offers "Ring", so a tab-wide /^Rings?$/ would flag it.
        sectionItem: { section: "node-border", item: /^Rings?$/ },
        selector: '[data-section="node-border"] [data-thing="rings"]',
    },
];
