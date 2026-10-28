/**
 * ShortcutSheet layout in a real browser: a tab wider than the sheet can be scrolled to its start.
 */
import { afterEach, describe, expect, it } from "vitest";

import { ShortcutSheet, type ShortcutSheetTab } from "../../../src";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const WIDE: ShortcutSheetTab[] = [
    {
        value: "wide",
        label: "Wide",
        groups: Array.from({ length: 6 }, (_, g) => ({
            title: `Group ${g + 1}`,
            shortcuts: [{ label: `Command ${g + 1}`, keys: ["Ctrl", String(g + 1)] }],
        })),
    },
];

describe("ShortcutSheet layout", () => {
    it("lets an over-wide tab scroll to its first column", async () => {
        const { container } = await renderThemed(
            <div style={{ width: 600, height: 300, display: "flex", flexDirection: "column" }}>
                <ShortcutSheet tabs={WIDE} />
            </div>,
        );
        const body = container.querySelector<HTMLElement>(".cm-sheet-body")!;
        expect(body.scrollWidth).toBeGreaterThan(body.clientWidth);
        body.scrollLeft = 0;
        const first = container.querySelector<HTMLElement>(".cm-sheet-column")!;
        expect(first.getBoundingClientRect().left).toBeGreaterThanOrEqual(body.getBoundingClientRect().left - 0.5);
    });
});
