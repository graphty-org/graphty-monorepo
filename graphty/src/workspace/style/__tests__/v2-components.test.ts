/**
 * Style panel v2 draws each repeating pattern through one shared component (owner, 2026-11-18: "make sure we are
 * using a common component for '+' sections and other repeating design patterns and not reinventing them every
 * time"): every section or group with a "+" is a `PlusList`, every "+" is an `AddButton`, every row's settings
 * open from `RowSettings`' "...", and every list a thing holds is edited by `ItemListEditor`. Read from the
 * panel's own sources.
 */

import { assert, describe, it } from "vitest";

/** Every v2 source, by file name, and Graph settings v2's. */
const SOURCES: Readonly<Record<string, string>> = Object.fromEntries(
    Object.entries({
        ...import.meta.glob<string>("../v2/*.{ts,tsx}", { query: "?raw", import: "default", eager: true }),
        ...import.meta.glob<string>("../../inspector/GraphSettingsV2.tsx", {
            query: "?raw",
            import: "default",
            eager: true,
        }),
    }).map(([path, text]) => [path.split("/").at(-1) ?? path, text]),
);

/**
 * The files whose source matches a pattern.
 * @param pattern - the pattern.
 * @param except - files allowed to match.
 * @returns the other files that match.
 */
function using(pattern: RegExp, except: readonly string[] = []): string[] {
    return Object.entries(SOURCES)
        .filter(([file, text]) => !except.includes(file) && pattern.test(text))
        .map(([file]) => file);
}

describe("Style panel v2's shared components", () => {
    it("reads the panel's sources", () => {
        assert.isAbove(Object.keys(SOURCES).length, 15);
        assert.property(SOURCES, "PlusList.tsx");
        assert.property(SOURCES, "GraphSettingsV2.tsx");
    });

    it("no v2 file draws a section or a group but PlusList", () => {
        // Graph settings v2's sections hold no "+": they stay plain sections. A color list's ControlGroup is the
        // legend naming one line's two inputs (chip, then number), not a section.
        const imports = /import \{[^}]*\bControl(Section|Group)\b[^}]*\} from "@graphty\/compact-mantine"/;
        assert.deepEqual(using(imports, ["PlusList.tsx", "GraphSettingsV2.tsx", "ListItems.tsx"]), []);
    });

    it("no v2 file draws a '+' glyph of its own: every '+' is an AddButton", () => {
        assert.deepEqual(using(/GLYPHS\.add\b/), []);
    });

    it("every row's settings open from RowSettings' '...', and nothing uses the sliders glyph", () => {
        assert.deepEqual(using(/\bSettingsPopout\b/, ["ThingLine.tsx"]), []);
        assert.deepEqual(using(/\bsliders\b/i), []);
        assert.match(SOURCES["ThingLine.tsx"], /GLYPHS\.more\b/);
    });

    it("a pie's or stripes' items and a polygon's points or a table's cells are edited by ItemListEditor", () => {
        // The items' lines are built in one place each and drawn only by ItemListEditor.
        assert.deepEqual(using(/\bcolorItems\(/, ["ItemListEditor.tsx", "colorItems.tsx"]), []);
        assert.deepEqual(using(/\bITEM_KINDS\b/, ["ItemListEditor.tsx", "ItemList.tsx"]), []);
        assert.match(SOURCES["ItemListEditor.tsx"], /colorItems\(/);
        assert.match(SOURCES["ItemListEditor.tsx"], /ITEM_KINDS\[/);
        // A thing's pop-over hands both kinds of list to it.
        assert.match(SOURCES["ThingRow.tsx"], /<ItemListEditor[^>]*list=\{listed\}/);
        assert.match(SOURCES["ThingRow.tsx"], /const listed = list \?\? items;/);
    });

    it("a family row switches from its MemberMenu, and no pop-over draws a Switch to strip", () => {
        assert.notProperty(SOURCES, "SwitchTo.tsx");
        assert.match(SOURCES["ThingRow.tsx"], /<MemberMenu\b/);
        assert.deepEqual(using(/data-switch-to/), []);
    });

    it("decides nothing by view itself: which styles draw in 2D or 3D comes from graphty-element (drawn.ts)", () => {
        const panel = Object.fromEntries(Object.entries(SOURCES).filter(([file]) => file !== "GraphSettingsV2.tsx"));
        const named = Object.entries(panel)
            .filter(([file, text]) => file !== "drawn.ts" && /"[23][dD]"/.test(text))
            .map(([file]) => file);
        assert.deepEqual(named, [], "a view named outside drawn.ts is a hand-made view list");
    });
});
