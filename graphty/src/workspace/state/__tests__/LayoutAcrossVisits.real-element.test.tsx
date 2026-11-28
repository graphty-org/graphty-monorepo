/**
 * The next visit opens the workspace as the reader arranged it: the left panel and inspector
 * widths, the table dock's height and whether it is open, and the legend switch. Real element,
 * real autosave, real input; a visit is a new tab, with no kept work and no session storage.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { dragTo } from "../../../test/real-pointer";
import { forgetAutosave, openAutosaved } from "../../../test/reload";
import { screen, waitFor } from "../../../test/test-utils";
import { WORKSPACE_LAYOUT } from "../../settings/preferences";

/** A new tab: no autosaved work, nothing in session storage. */
async function newTab(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
}

/** Starts with nothing kept, the arrangement included. */
async function forget(): Promise<void> {
    await newTab();
    localStorage.removeItem(WORKSPACE_LAYOUT.key);
}

/**
 * The width of a part of the frame.
 * @param selector - the part.
 * @returns its width in CSS pixels.
 */
function widthOf(selector: string): number {
    return document.querySelector(selector)?.getBoundingClientRect().width ?? 0;
}

/**
 * The table dock's height.
 * @returns its height in CSS pixels.
 */
function dockHeight(): number {
    return screen.getByRole("region", { name: "Table" }).getBoundingClientRect().height;
}

describe("the workspace's arrangement across visits", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });
    beforeEach(forget);
    afterEach(forget);

    it("opens the next visit with the panel widths, the table dock and the legend as left", async () => {
        const first = await openAutosaved("Les Miserables");
        assert.strictEqual(widthOf(".ws-left"), 240);
        assert.strictEqual(widthOf(".ws-right"), 240);

        const left = screen.getByRole("separator", { name: "Resize left panel" });
        const leftBox = left.getBoundingClientRect();
        await dragTo(left, { x: leftBox.left + leftBox.width / 2 + 80, y: leftBox.top + leftBox.height / 2 });
        const right = screen.getByRole("separator", { name: "Resize inspector" });
        const rightBox = right.getBoundingClientRect();
        await dragTo(right, { x: rightBox.left + rightBox.width / 2 - 60, y: rightBox.top + rightBox.height / 2 });

        await userEvent.click(page.getByRole("button", { name: "Table", exact: true }));
        await screen.findByRole("region", { name: "Table" });
        const opened = dockHeight();
        const top = screen.getByRole("separator", { name: "Resize table" });
        const topBox = top.getBoundingClientRect();
        await dragTo(top, { x: topBox.left + topBox.width / 2, y: topBox.top + topBox.height / 2 - 50 });

        const legend = screen.getByRole("button", { name: "Legend" });
        const legendWas = legend.getAttribute("aria-pressed");
        await userEvent.click(page.getByRole("button", { name: "Legend", exact: true }));

        let leftWidth = 0;
        let rightWidth = 0;
        let height = 0;
        let legendNow: string | null = null;
        await waitFor(() => {
            leftWidth = widthOf(".ws-left");
            rightWidth = widthOf(".ws-right");
            height = dockHeight();
            legendNow = screen.getByRole("button", { name: "Legend" }).getAttribute("aria-pressed");
            assert.isAbove(leftWidth, 240);
            assert.isAbove(rightWidth, 240);
            assert.isAbove(height, opened);
            assert.notStrictEqual(legendNow, legendWas);
        });
        first.view.unmount();

        await newTab();
        const next = await openAutosaved("Florentine families");
        await screen.findByRole("region", { name: "Table" });
        await waitFor(() => {
            assert.strictEqual(widthOf(".ws-left"), leftWidth);
            assert.strictEqual(widthOf(".ws-right"), rightWidth);
            assert.strictEqual(dockHeight(), height);
            assert.strictEqual(screen.getByRole("button", { name: "Legend" }).getAttribute("aria-pressed"), legendNow);
        });
        next.view.unmount();
    });
});
