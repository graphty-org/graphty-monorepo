/**
 * The tree package against Figma (design/figma-spec.md section 10 and the RankChip look of 9.8):
 * the layer tree, page rows, inline rename, find results, DataRow / DataRowHeader / RankChip and
 * the DataTable cell grid, light and dark, each state driven with real input.
 *
 * Element values are read from the captures with figmaElement / figmaSpec. Pseudo-element fills
 * (the row pills and bands, the active cell box) come from the captures' `.pseudo.json` files,
 * which the harness does not read; those numbers are quoted with the file they came from.
 */
import { screen, within } from "@testing-library/react";
import { userEvent } from "@vitest/browser/context";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import { DataTable, type DataTableColumn } from "../../src/components/DataTable";
import { DataRow, DataRowHeader, RankChip } from "../../src/components/rows/DataRow";
import { InlineRename, PageList, ResultRow, Tree, type TreeNodeData } from "../../src/components/tree";
import { UiGlyph } from "../../src/icons";
import {
    drive,
    expectMeasured,
    figmaAvailable,
    figmaElement,
    figmaSpec,
    part,
    renderFigma,
    resetHarness,
} from "./harness";

afterEach(resetHarness);

const FONT = ["fontSize", "lineHeight", "fontWeight", "letterSpacing"];

const ITEMS: TreeNodeData[] = [
    {
        id: "frame",
        name: "cross-area-index",
        icon: <UiGlyph name="frame" size={16} />,
        children: [
            { id: "comp", name: "ci-component", tone: "component", icon: <UiGlyph name="component" size={16} /> },
            {
                id: "inner",
                name: "ci-inner-frame",
                icon: <UiGlyph name="frame" size={16} />,
                children: [{ id: "text", name: "ci-text", icon: <UiGlyph name="text" size={16} /> }],
            },
            { id: "rect", name: "ci-rect", icon: <UiGlyph name="rectangle" size={10} /> },
        ],
    },
    { id: "other", name: "other", icon: <UiGlyph name="frame" size={16} />, children: [] },
];

/**
 * A 240px panel around the tree, as in Figma's left sidebar.
 * @param props - Tree props
 * @param scheme - colour scheme
 * @returns the tree element
 */
async function renderTree(
    props: Partial<React.ComponentProps<typeof Tree>>,
    scheme: "light" | "dark" = "light",
): Promise<HTMLElement> {
    await renderFigma(
        <div style={{ width: 240 }}>
            <Tree items={ITEMS} defaultExpanded={["frame", "inner"]} {...props} />
        </div>,
        { scheme },
    );
    return screen.getByRole("tree");
}

const row = (name: string): HTMLElement => screen.getByRole("treeitem", { name });

describe.skipIf(!(await figmaAvailable()))("Tree rows against Figma", () => {
    it("top-level row: 32 x 240, glyph at x 16, name at x 40, 11/32 600, primary glyph", async () => {
        await renderTree({});
        const top = row("cross-area-index");
        const fig = "ii/layer-row-parent-selected";
        const figRow = await figmaElement(fig, { index: 30 });
        const figIcon = await figmaElement(fig, { index: 33 });
        const figName = await figmaElement(fig, { index: 38 });
        expectMeasured(top, figmaSpec(figRow, ["width", "height"]));
        expectMeasured(part(top, ".cm-tree-icon"), { ...figmaSpec(figIcon, ["width", "height", "color"]), x: 16 }, { origin: top });
        expectMeasured(part(top, ".cm-tree-name"), { ...figmaSpec(figName, ["height", "color", ...FONT]), x: 40 }, { origin: top });
    });

    it("a top-level container with no children is still 600 with a primary glyph; a top-level leaf is 400, tertiary", async () => {
        // ii/layer-row-parent-selected: the empty top-level frame is 600 with a #000000e5 glyph; the
        // layers-scrolled-bottom survey draws top-level leaves at 400 with #0000004d.
        await renderFigma(
            <div style={{ width: 240 }}>
                <Tree
                    items={[
                        { id: "empty", name: "estimated rather than measured", icon: <UiGlyph name="frame" size={16} />, children: [] },
                        { id: "leaf", name: "Line", icon: <UiGlyph name="text" size={16} /> },
                    ]}
                />
            </div>,
        );
        const fig = "ii/layer-row-parent-selected";
        const empty = row("estimated rather than measured");
        expectMeasured(part(empty, ".cm-tree-icon"), figmaSpec(await figmaElement(fig, { index: 33 }), ["color"]));
        expectMeasured(part(empty, ".cm-tree-name"), figmaSpec(await figmaElement(fig, { index: 38 }), FONT));
        const leaf = row("Line");
        expectMeasured(part(leaf, ".cm-tree-icon"), { color: "#0000004d" });
        expectMeasured(part(leaf, ".cm-tree-name"), { fontWeight: "400" });
    });

    it("nested rows: glyph 24px deeper per level, tertiary glyph, 400 name", async () => {
        await renderTree({});
        const fig = "ii/layer-row-parent-selected";
        const inner = row("ci-inner-frame");
        const text = row("ci-text");
        expectMeasured(
            part(inner, ".cm-tree-icon"),
            { ...figmaSpec(await figmaElement(fig, { index: 65 }), ["color"]), x: 40 },
            { origin: inner },
        );
        expectMeasured(
            part(text, ".cm-tree-icon"),
            { ...figmaSpec(await figmaElement(fig, { index: 90 }), ["color"]), x: 64 },
            { origin: text },
        );
        expectMeasured(
            part(text, ".cm-tree-name"),
            { ...figmaSpec(await figmaElement(fig, { index: 95 }), ["color", ...FONT]), x: 88 },
            { origin: text },
        );
    });

    it("component rows: purple name, pale purple glyph; selected, a purple glyph", async () => {
        await renderTree({});
        const comp = row("ci-component");
        const fig = "ii/layer-row-parent-selected";
        expectMeasured(part(comp, ".cm-tree-name"), figmaSpec(await figmaElement(fig, { index: 58 }), ["color"]));
        expectMeasured(part(comp, ".cm-tree-icon"), figmaSpec(await figmaElement(fig, { index: 53 }), ["color"]));
        await resetHarness();
        await renderTree({ defaultSelected: ["comp"] });
        const selected = row("ci-component");
        expectMeasured(
            part(selected, ".cm-tree-icon"),
            figmaSpec(await figmaElement("ii/layer-row-component-selected", { index: 42 }), ["color"]),
        );
    });

    it("selected: a 24 pill inset 4 8 4 12, #e5f4ff, radius 5; the glyph turns primary", async () => {
        // ii/layer-row-selected.pseudo.json: ::after inset 4px 8px 4px 12px, height 24, rgb(229,244,255), 5px
        await renderTree({ defaultSelected: ["rect"] });
        const rect = row("ci-rect");
        expectMeasured(
            rect,
            { top: 4, left: 12, right: 8, blockSize: "24px", backgroundColor: "#e5f4ff", borderRadius: "5px", zIndex: "-1" },
            { pseudo: "::after" },
        );
        expectMeasured(part(rect, ".cm-tree-icon"), figmaSpec(await figmaElement("ii/layer-row-selected", { index: 42 }), ["color"]));
    });

    it("hover: the same pill in #f5f5f5, drawn in one frame", async () => {
        // ii/layer-row-hover.pseudo.json: ::after inset 4px 8px 0px 12px, height 24, rgb(245,245,245)
        await renderTree({});
        const rect = row("ci-rect");
        expectMeasured(rect, { backgroundColor: "#00000000" }, { pseudo: "::after" });
        await drive(rect, "hover");
        expectMeasured(
            rect,
            { top: 4, left: 12, blockSize: "24px", backgroundColor: "#f5f5f5", transitionDuration: "0s" },
            { pseudo: "::after" },
        );
    });

    it("selected parent: pill with a 4px #f2f9ff band below; its descendants banded; hover on a child #bde3ff", async () => {
        // ii/layer-row-parent-selected.pseudo.json and cr/light-layer-row-parent-selected.pseudo.json
        await renderTree({ defaultSelected: ["frame"] });
        const parent = row("cross-area-index");
        expectMeasured(
            parent,
            {
                top: 4,
                blockSize: "24px",
                backgroundColor: "#e5f4ff",
                borderBottomWidth: "4px",
                borderBottomColor: "#f2f9ff",
                borderRadius: "5px 5px 0px 0px",
            },
            { pseudo: "::after" },
        );
        const middle = row("ci-inner-frame");
        expectMeasured(middle, { top: 0, blockSize: "32px", left: 12, right: 8, backgroundColor: "#f2f9ff", borderRadius: "0px" }, { pseudo: "::before" });
        const last = row("ci-rect");
        expectMeasured(last, { top: 0, blockSize: "28px", backgroundColor: "#f2f9ff", borderRadius: "0px 0px 5px 5px" }, { pseudo: "::before" });
        await drive(middle, "hover");
        expectMeasured(middle, { top: 4, blockSize: "24px", backgroundColor: "#bde3ff" }, { pseudo: "::after" });
    });

    it("a run of selected rows is one block: first 4/28, middle 0/32, last 0/28", async () => {
        await renderTree({ defaultExpanded: [], defaultSelected: ["frame", "other"], items: [...ITEMS, { id: "z", name: "z" }] });
        expectMeasured(row("cross-area-index"), { top: 4, blockSize: "28px", borderRadius: "5px 5px 0px 0px" }, { pseudo: "::after" });
        expectMeasured(row("other"), { top: 0, blockSize: "28px", borderRadius: "0px 0px 5px 5px" }, { pseudo: "::after" });
    });

    it("keyboard focus: a 1px ring on the pill area", async () => {
        await renderTree({});
        const top = row("cross-area-index");
        const ring = part(top, ".cm-tree-ring");
        expectMeasured(ring, { outlineColor: "#00000000" });
        await drive(top, "focus");
        expectMeasured(ring, { x: 12, y: 4, width: 220, height: 24, outline: "#0d99ff solid 1px", borderRadius: "5px" }, { origin: top });
    });

    it("hidden layer: name and glyph in the tertiary colour", async () => {
        await renderTree({ items: [{ id: "h", name: "hidden", dimmed: true, icon: <UiGlyph name="rectangle" size={10} /> }] });
        expectMeasured(part(row("hidden"), ".cm-tree-name"), { color: "#0000004d" });
        expectMeasured(part(row("hidden"), ".cm-tree-icon"), { color: "#0000004d" });
    });

    it("toggles: 24px targets at x 188 and 208, hidden until hover, a toggle that is on stays", async () => {
        const figLock = await figmaElement("ii/layer-row-hover", { index: 40 });
        const items: TreeNodeData[] = [
            {
                id: "a",
                name: "a",
                actions: (
                    <>
                        <button type="button" aria-label="Lock" aria-pressed="true" style={{ width: 24, height: 24 }} />
                        <button type="button" aria-label="Hide" aria-pressed="false" style={{ width: 24, height: 24 }} />
                    </>
                ),
            },
        ];
        await renderTree({ items });
        const a = row("a");
        const lock = screen.getByRole("button", { name: "Lock" });
        const hide = screen.getByRole("button", { name: "Hide" });
        expectMeasured(lock, { x: figLock.box[0] - 57, y: 4, width: 24, height: 24, opacity: "1" }, { origin: a });
        expectMeasured(hide, { x: figLock.box[0] - 57 + 20, opacity: "0" }, { origin: a });
        await drive(a, "hover");
        await new Promise((resolve) => setTimeout(resolve, 150));
        expectMeasured(hide, { opacity: "1" });
    });

    it("drag: a 1px #0d99ff box around the target container, no radius", async () => {
        const figBox = await figmaElement("ls/drag-01-drop-into-frame-indicator", { index: 164 });
        const tree = await renderTree({ onMove: () => undefined, defaultExpanded: [] });
        const source = row("other");
        const target = row("cross-area-index");
        const data = new DataTransfer();
        source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: data }));
        const box = target.getBoundingClientRect();
        target.dispatchEvent(
            new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: data, clientY: box.top + 16, clientX: box.left + 50 }),
        );
        const drop = await within(tree).findByTestId("tree-drop-box");
        expectMeasured(drop, {
            ...figmaSpec(figBox, ["height", "borderTopWidth", "borderTopColor", "borderStyle", "borderRadius"]),
            width: 240,
        });
    });

    it("drag: a 2px primary line at the insertion depth's glyph x", async () => {
        const figLine = await figmaElement("ls/drag-03-reorder-between-indicator", { index: 166 });
        const tree = await renderTree({ onMove: () => undefined });
        const source = row("other");
        const target = row("ci-inner-frame");
        const data = new DataTransfer();
        source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: data }));
        const box = target.getBoundingClientRect();
        target.dispatchEvent(
            new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: data, clientY: box.top + 2, clientX: box.left + 50 }),
        );
        const line = await within(tree).findByTestId("tree-drop-line");
        expectMeasured(
            line,
            { ...figmaSpec(figLine, ["height", "backgroundColor"]), x: figLine.box[0] - 57, y: box.top - tree.getBoundingClientRect().top - 1 },
            { origin: tree },
        );
    });

    it("dark: #2c2c2c panel text white, nested glyph #ffffff66, selected #394360, band #32394d, child hover #4a5878", async () => {
        // cr/dark-layer-row-parent-selected.pseudo.json and cr/dark-layer-row-child-of-selected-hover.pseudo.json
        await renderTree({ defaultSelected: ["inner"] }, "dark");
        const fig = "cr/dark-layer-row-parent-selected";
        const inner = row("ci-inner-frame");
        expectMeasured(part(inner, ".cm-tree-name"), figmaSpec(await figmaElement(fig, { index: 85 }), ["color", ...FONT]));
        expectMeasured(part(row("ci-rect"), ".cm-tree-icon"), figmaSpec(await figmaElement(fig, { index: 93 }), ["color"]));
        expectMeasured(inner, { backgroundColor: "#394360", borderBottomColor: "#32394d" }, { pseudo: "::after" });
        const text = row("ci-text");
        expectMeasured(text, { backgroundColor: "#32394d", blockSize: "28px" }, { pseudo: "::before" });
        await drive(text, "hover");
        expectMeasured(text, { backgroundColor: "#4a5878" }, { pseudo: "::after" });
    });
});

describe.skipIf(!(await figmaAvailable()))("Page rows against Figma", () => {
    const PAGES = [
        { id: "p1", name: "Page 1" },
        { id: "p2", name: "LS second page" },
        { id: "d", name: "---", divider: true },
        { id: "p3", name: "LS third page" },
    ];

    const renderPages = async (): Promise<HTMLElement[]> => {
        await renderFigma(
            <div style={{ width: 240 }}>
                <PageList items={PAGES} defaultCurrent="p1" />
            </div>,
        );
        return screen.getAllByRole("gridcell");
    };

    // Figma draws page names in #000000 while its token --color-text is #000000e5; we use the
    // token so the row reads correctly in dark, and compare everything else.
    const BUTTON = ["width", "height", "backgroundColor", "borderRadius", "fontSize", "lineHeight", "fontWeight"];

    it("rest: a 224 x 24 pill in a 240 x 32 cell, white, 11/24 400", async () => {
        const cells = await renderPages();
        const fig = await figmaElement("bc/page-row--default", { index: 41 });
        expectMeasured(cells[1], { width: 240, height: 32, paddingTop: "4px", paddingLeft: "8px" });
        expectMeasured(part(cells[1], ".cm-page-button"), { ...figmaSpec(fig, BUTTON), x: 8, y: 4 }, { origin: cells[1] });
    });

    it("hover: #f5f5f5", async () => {
        const cells = await renderPages();
        await drive(cells[1], "hover");
        expectMeasured(part(cells[1], ".cm-page-button"), figmaSpec(await figmaElement("bc/page-row--hover", { index: 41 }), BUTTON));
    });

    it("current page: #f5f5f5 and weight 550", async () => {
        const cells = await renderPages();
        const fig = await figmaElement("ls/scratch-pages-list", { index: 54 });
        expectMeasured(part(cells[0], ".cm-page-button"), figmaSpec(fig, ["backgroundColor", "fontWeight", "letterSpacing"]));
    });

    it("keyboard focus: 1px #0d99ff on the whole cell, radius 5, offset 0", async () => {
        const cells = await renderPages();
        await drive(cells[0], "focus");
        const fig = await figmaElement("ls/scratch-pages-focus", { index: 51 });
        expectMeasured(cells[0], figmaSpec(fig, ["width", "height", "outline", "outlineOffset", "borderRadius"]));
    });

    it("divider: a 208 x 1 border line, 16px in, centred", async () => {
        const cells = await renderPages();
        const fig = await figmaElement("ls/scratch-pages-list", { index: 71 });
        const line = part(cells[2], ".cm-page-divider");
        expectMeasured(line, { ...figmaSpec(fig, ["width", "height", "backgroundColor"]), x: 16, y: 15.5 }, { origin: cells[2] });
    });
});

describe.skipIf(!(await figmaAvailable()))("Inline rename against Figma", () => {
    const FIELD = ["height", "backgroundColor", "color", "borderTopWidth", "borderTopColor", "borderRadius", "paddingLeft", "paddingRight", ...FONT];

    it("in the layer tree: 176 x 24 from the name x - 8", async () => {
        await renderTree({ onRename: () => undefined });
        await userEvent.click(row("ci-rect"));
        await userEvent.keyboard("{F2}");
        const input = screen.getByRole("textbox", { name: "Layer name" });
        const fig = await figmaElement("ls/scratch-layers-rename-field", { index: 52 });
        expectMeasured(input, { ...figmaSpec(fig, ["width", ...FIELD]), x: 56 }, { origin: row("ci-rect") });
    });

    it("in the page list: 224 x 24", async () => {
        await renderFigma(
            <div style={{ width: 224 }}>
                <InlineRename value="Page 1" onCommit={() => undefined} label="Page name" />
            </div>,
        );
        const fig = await figmaElement("ls/scratch-pages-rename-field", { index: 62 });
        expectMeasured(screen.getByRole("textbox", { name: "Page name" }), figmaSpec(fig, ["width", ...FIELD]));
    });

    it("dark: the field is #2c2c2c with white text", async () => {
        await renderFigma(<InlineRename value="Page 1" onCommit={() => undefined} />, { scheme: "dark" });
        expectMeasured(screen.getByRole("textbox"), { backgroundColor: "#2c2c2c", color: "#ffffff", borderTopColor: "#0c8ce9" });
    });
});

describe.skipIf(!(await figmaAvailable()))("Find result rows against Figma", () => {
    const fig = "ls/scratch-find-results";
    const renderResults = async (scheme: "light" | "dark" = "light"): Promise<HTMLElement[]> => {
        await renderFigma(
            <div role="listbox" aria-label="Results" style={{ width: 240 }}>
                <ResultRow name="Deepest rect" path="left-sidebar" current icon={<UiGlyph name="rectangle" size={10} />} />
                <ResultRow name="Rectangle" match="rect" path="left-sidebar" icon={<UiGlyph name="rectangle" size={10} />} />
                <ResultRow name="Rectangle 3" path="buttons-and-controls" tone="component" icon={<UiGlyph name="component" size={16} />} />
                <ResultRow name="Only a name" />
            </div>,
            { scheme },
        );
        return screen.getAllByRole("option");
    };
    const ROW = ["width", "height", "backgroundColor", "borderTopColor", "borderTopWidth", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft"];

    it("current and rest: 240 x 52, padding 8 8 8 16, a 1px border the colour of the fill", async () => {
        const rows = await renderResults();
        expectMeasured(rows[0], figmaSpec(await figmaElement(fig, { index: 127 }), ROW));
        expectMeasured(rows[1], figmaSpec(await figmaElement(fig, { index: 139 }), ROW));
    });

    it("name at x 41 in 11/16 400, path 10/16 secondary, match at 600", async () => {
        const rows = await renderResults();
        const name = part(rows[1], ".cm-result-name");
        expectMeasured(name, { ...figmaSpec(await figmaElement(fig, { index: 147 }), ["color", "fontSize", "fontWeight", "letterSpacing"]), x: 41, y: 9 }, { origin: rows[1] });
        expectMeasured(
            part(rows[1], ".cm-result-path"),
            { ...figmaSpec(await figmaElement(fig, { index: 149 }), ["color", "fontSize", "lineHeight"]), x: 41, y: 27 },
            { origin: rows[1] },
        );
        expectMeasured(part(rows[1], ".cm-result-match"), { fontWeight: "600" });
        expectMeasured(part(rows[2], ".cm-result-icon"), { ...figmaSpec(await figmaElement(fig, { index: 201 }), ["width", "height", "color"]), x: 17 }, { origin: rows[2] });
    });

    it("component results are purple on both lines; one line is 34 tall; hover #f5f5f5", async () => {
        const rows = await renderResults();
        expectMeasured(part(rows[2], ".cm-result-name"), figmaSpec(await figmaElement(fig, { index: 207 }), ["color"]));
        expectMeasured(part(rows[2], ".cm-result-path"), figmaSpec(await figmaElement(fig, { index: 209 }), ["color"]));
        expectMeasured(rows[3], { height: 34 });
        await drive(rows[1], "hover");
        expectMeasured(rows[1], { backgroundColor: "#f5f5f5", borderTopColor: "#f5f5f5" });
    });

    it("dark: rest #2c2c2c, current #394360, path #ffffffb2", async () => {
        const rows = await renderResults("dark");
        expectMeasured(rows[0], { backgroundColor: "#394360" });
        expectMeasured(rows[1], { backgroundColor: "#2c2c2c" });
        expectMeasured(part(rows[1], ".cm-result-path"), { color: "#ffffffb2" });
    });
});

describe.skipIf(!(await figmaAvailable()))("DataRow, DataRowHeader and RankChip", () => {
    const renderRows = async (scheme: "light" | "dark" = "light"): Promise<HTMLElement[]> => {
        await renderFigma(
            <div style={{ width: 240 }}>
                <DataRowHeader label="Most connected" unit="links" sortDirection="descending" onSortChange={() => undefined} />
                <DataRow name="Mr_Whiskers" value="4" onClick={() => undefined} />
                <DataRow name="Mrs_Henderson" value="3" selected onClick={() => undefined} />
                <DataRow name="Inert" value={<RankChip>#6</RankChip>} />
            </div>,
            { scheme },
        );
        return screen.getAllByTestId("data-row");
    };

    it("row: 32 x 240, name 11/32 450 primary, value secondary (10.5)", async () => {
        const rows = await renderRows();
        expectMeasured(rows[0], { width: 240, height: 32, paddingLeft: "16px", paddingRight: "8px" });
        expectMeasured(part(rows[0], ".cm-data-row-name"), { x: 16, fontSize: "11px", lineHeight: "32px", fontWeight: "450", color: "#000000e5" }, { origin: rows[0] });
        expectMeasured(part(rows[0], ".cm-data-row-value"), { color: "#00000080" });
    });

    it("pill: rest none, hover #f5f5f5, selected #e5f4ff, inset 4 8 4 12, radius 5", async () => {
        const rows = await renderRows();
        expectMeasured(rows[0], { backgroundColor: "#00000000" }, { pseudo: "::after" });
        expectMeasured(rows[1], { top: 4, left: 12, right: 8, blockSize: "24px", backgroundColor: "#e5f4ff", borderRadius: "5px" }, { pseudo: "::after" });
        await drive(rows[0], "hover");
        expectMeasured(rows[0], { backgroundColor: "#f5f5f5" }, { pseudo: "::after" });
        await drive(rows[2], "hover");
        expectMeasured(rows[2], { backgroundColor: "#00000000" }, { pseudo: "::after" });
    });

    it("a selected row keeps its pill under a real pointer (#e5f4ff light, #394360 dark)", async () => {
        // ii/layer-row-selected-hover.pseudo.json: ::after backgroundColor rgb(229, 244, 255)
        let rows = await renderRows();
        await drive(rows[1], "hover");
        expectMeasured(rows[1], { backgroundColor: "#e5f4ff" }, { pseudo: "::after" });
        await resetHarness();
        rows = await renderRows("dark");
        await drive(rows[1], "hover");
        expectMeasured(rows[1], { backgroundColor: "#394360" }, { pseudo: "::after" });
    });

    it("keyboard focus: a 1px ring on the pill", async () => {
        const rows = await renderRows();
        await drive(within(rows[0]).getByRole("button"), "focus");
        expectMeasured(rows[0], { outline: "#0d99ff solid 1px", outlineOffset: "0px", borderRadius: "5px" }, { pseudo: "::before" });
    });

    it("header: 32 tall, 11/16 550 secondary; sorted label primary; 5 x 3 caret", async () => {
        await renderRows();
        const header = screen.getByTestId("data-row-header");
        expectMeasured(header, { height: 32, fontSize: "11px", lineHeight: "16px", fontWeight: "550", color: "#00000080" });
        expectMeasured(screen.getByTestId("data-row-header-label"), { color: "#000000e5" });
        const caret = part(screen.getByTestId("data-row-header-sort-glyph"), "svg path").getBoundingClientRect();
        expect(caret.width).toBeCloseTo(5, 0);
        expect(caret.height).toBeCloseTo(3, 0);
    });

    it("RankChip: Figma's Beta badge (16 tall, radius 5, 1px outline inside, transparent, 11/16 450)", async () => {
        await renderRows();
        const fig = await figmaElement("bt/mode-metronome-full", { index: 296 });
        expectMeasured(
            screen.getByTestId("rank-chip"),
            figmaSpec(fig, ["height", "color", "backgroundColor", "outline", "outlineOffset", "borderRadius", "paddingLeft", "paddingRight", ...FONT]),
        );
    });

    it("dark: name white, value #ffffffb2, selected #394360, chip outline #444444", async () => {
        const rows = await renderRows("dark");
        expectMeasured(part(rows[0], ".cm-data-row-name"), { color: "#ffffff" });
        expectMeasured(part(rows[0], ".cm-data-row-value"), { color: "#ffffffb2" });
        expectMeasured(rows[1], { backgroundColor: "#394360" }, { pseudo: "::after" });
        expectMeasured(screen.getByTestId("rank-chip"), { outline: "#444444 solid 1px", color: "#ffffff" });
    });
});

describe.skipIf(!(await figmaAvailable()))("DataTable against Figma's Variables table", () => {
    interface Cat {
        id: string;
        name: string;
        lives: number;
    }
    const CATS: Cat[] = [
        { id: "a", name: "primary", lives: 9 },
        { id: "b", name: "secondary", lives: 7 },
        { id: "c", name: "tertiary", lives: 3 },
    ];
    const COLUMNS: DataTableColumn<Cat>[] = [
        { id: "name", header: "Name", value: (c) => c.name, width: 200 },
        { id: "lives", header: "Lives", value: (c) => c.lives, width: 280 },
    ];
    const renderTable = async (scheme: "light" | "dark" = "light"): Promise<void> => {
        await renderFigma(
            // 200 + 280 columns, their 1px gaps and the table's 1px padding: no column stretches.
            <div style={{ width: 483 }}>
                <DataTable columns={COLUMNS} data={CATS} getRowId={(c) => c.id} defaultSelectedIds={["a"]} height={300} label="Variables" />
            </div>,
            { scheme },
        );
    };

    it("header cell: 200 x 40, 11/16 600, a 1px #e6e6e6 grid line, padding 0 16", async () => {
        await renderTable();
        const fig = await figmaElement("ls/vars-04-table-two-modes", { index: 230 });
        const header = screen.getAllByRole("columnheader")[0];
        expectMeasured(
            header,
            figmaSpec(fig, ["width", "height", "backgroundColor", "color", "outline", "outlineOffset", "fontSize", "lineHeight", "fontWeight", "letterSpacing"]),
        );
        expectMeasured(part(header, "button"), { paddingLeft: "16px", paddingRight: "16px" });
        // #233: the 'Light' mode label starts 16px into the second column's header too.
        expectMeasured(part(screen.getAllByRole("columnheader")[1], "button"), { paddingLeft: "16px", paddingRight: "16px" });
    });

    it("name cell 11/16 400 untracked; value cells 11/16 450 0.055px, padded 12 / 8", async () => {
        await renderTable();
        const fig = "ls/vars-04-table-two-modes";
        const name = await figmaElement(fig, { index: 258 });
        const valuePad = await figmaElement(fig, { index: 263 });
        const cells = within(screen.getAllByTestId("data-table-row")[1]).getAllByRole("gridcell");
        expectMeasured(cells[0], figmaSpec(name, FONT));
        expectMeasured(cells[1], { ...figmaSpec(valuePad, ["paddingLeft", "paddingRight"]), fontSize: "11px", lineHeight: "16px", fontWeight: "450", letterSpacing: "0.055px" });
    });

    it("body cells: 40 tall, the grid line, rows 41 apart, columns 1px apart", async () => {
        await renderTable();
        const fig = await figmaElement("ls/vars-04-table-two-modes", { index: 251 });
        const rows = screen.getAllByTestId("data-table-row");
        const cells = within(rows[1]).getAllByRole("gridcell");
        expectMeasured(cells[0], figmaSpec(fig, ["width", "height", "outline", "outlineOffset", "backgroundColor"]));
        expect(cells[1].getBoundingClientRect().left - cells[0].getBoundingClientRect().right).toBeCloseTo(1, 1);
        expect(rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top).toBeCloseTo(41, 1);
    });

    it("selected row: every cell #e5f4ff; hover adds no tint", async () => {
        await renderTable();
        const fig = await figmaElement("ls/vars-07-row-selected", { index: 34 });
        const rows = screen.getAllByTestId("data-table-row");
        for (const cell of within(rows[0]).getAllByRole("gridcell")) {
            expectMeasured(cell, figmaSpec(fig, ["backgroundColor"]));
        }
        const other = within(rows[2]).getAllByRole("gridcell")[1];
        await drive(other, "hover");
        expectMeasured(other, { backgroundColor: "#ffffff" });
    });

    it("active cell: a 1px #0d99ff box drawn inside (278 x 38 in 280 x 40); the grid line stays", async () => {
        // ls/vars-14-number-cell-focus.pseudo.json: ::before 278 x 38, border 1px solid rgb(13,153,255)
        await renderTable();
        await drive(screen.getByRole("grid"), "focus");
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowRight}");
        const cell = document.activeElement as HTMLElement;
        expect(cell).toHaveAttribute("role", "gridcell");
        expect(cell).toHaveAttribute("aria-colindex", "2");
        expectMeasured(cell, { width: 280, height: 40, outline: "#e6e6e6 solid 1px" });
        expectMeasured(cell, { inlineSize: "278px", blockSize: "38px", borderTopWidth: "1px", borderTopColor: "#0d99ff", borderRadius: "0px" }, { pseudo: "::before" });
    });

    it("dark: #2c2c2c cells, #444444 grid, white header text, #394360 selection", async () => {
        await renderTable("dark");
        const header = screen.getAllByRole("columnheader")[0];
        expectMeasured(header, { backgroundColor: "#2c2c2c", outline: "#444444 solid 1px", color: "#ffffff" });
        const rows = screen.getAllByTestId("data-table-row");
        expectMeasured(within(rows[0]).getAllByRole("gridcell")[0], { backgroundColor: "#394360" });
    });
});
