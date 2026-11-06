/**
 * The two-column dialog (Settings, Keyboard shortcuts, Export) in a short window, as at 400% zoom:
 * the chosen page is never clipped to a sliver, so the modal scrolls to every control and a
 * pointer reaches it (WCAG 1.4.10). In a tall window each keeps its one fixed height.
 */
import { afterEach, assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, within } from "../../../test/test-utils";
import { ACCELERATION } from "../../settings/preferences";
import type { WorkspaceState } from "../../state/store";
import { Workspace } from "../../Workspace";

const PROJECT: Partial<WorkspaceState> = { project: { name: "Ring", id: 1 } };

/** The three dialogs on the layout, each with the box that holds its chosen page. */
const DIALOGS = [
    { dialog: "settings:performance", name: "Settings", page: ".ws-dialog-page" },
    { dialog: "shortcuts", name: "Keyboard shortcuts", page: ".ws-dialog-page" },
    { dialog: "export", name: "Export", page: ".ws-export-main" },
] as const;

/**
 * Opens the workspace with one dialog showing.
 * @param dialog - the workspace dialog to open.
 * @param name - the dialog's name.
 * @returns the dialog.
 */
async function openDialog(dialog: string, name: string): Promise<HTMLElement> {
    ({ unmount } = render(<Workspace initialState={{ ...PROJECT, dialog }} />));
    return screen.findByRole("dialog", { name });
}

let unmount: (() => void) | undefined;

afterEach(() => {
    unmount?.();
    unmount = undefined;
    localStorage.removeItem(ACCELERATION.key);
});

describe("the two-column dialog", () => {
    for (const [width, height] of [
        [320, 256],
        [640, 256],
        [1280, 256],
    ] as const) {
        for (const { dialog, name, page: pageBox } of DIALOGS) {
            it(`shows all of ${name}'s page at ${width} x ${height}`, async () => {
                await page.viewport(width, height);
                const opened = await openDialog(dialog, name);
                const box = opened.querySelector<HTMLElement>(pageBox);
                assert.isNotNull(box);
                assert.isAtLeast(box?.clientHeight ?? 0, box?.scrollHeight ?? 1, "the page is not clipped");
            });
        }
    }

    it("lets a pointer reach the last control of Settings' last section at 320 x 256", async () => {
        await page.viewport(320, 256);
        const opened = await openDialog("settings:performance", "Settings");
        await userEvent.click(within(opened).getByText("Off"));
        assert.equal(localStorage.getItem(ACCELERATION.key), "off");
    });

    for (const { dialog, name } of DIALOGS) {
        it(`keeps ${name} at its fixed height at 900 x 700`, async () => {
            await page.viewport(900, 700);
            const opened = await openDialog(dialog, name);
            const columns = opened.querySelector<HTMLElement>(".ws-dialog-columns");
            // Export is min(600px, 100dvh - 120px), the others min(536px, 100dvh - 184px).
            assert.equal(columns?.offsetHeight, dialog === "export" ? 580 : 516);
        });
    }
});
