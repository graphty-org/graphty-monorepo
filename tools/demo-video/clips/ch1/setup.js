// Chapter 1 setup steps (not a clip: the recorder loads only .mjs files as clips). They run before
// recording, through the app's own UI only.

/**
 * Where a dropped file is let go: the left half of the start page's "Drop to open" card, which the
 * app centers on the screen while a file is dragged over it. The file chip sits right of the cursor,
 * so cursor and chip land on the card together.
 */
export const DROP = { x: 880, y: 515, width: 90, height: 50 };

/** Where the hand rests after a drop: the empty right margin of the canvas, off the graph. */
export const REST = { x: 1440, y: 600, width: 80, height: 60 };

/**
 * Turns the canvas legend off (setup only). The Legend button's pressed state shows the legend only
 * when it has entries, so a press may first switch it on; press until it reads off. The choice is
 * kept for the next project opened in this tab.
 * @param page - the page
 */
export async function legendOff(page) {
    const legend = (pressed) => page.getByRole("button", { name: "Legend", exact: true, pressed });
    for (let i = 0; i < 2; i++) {
        const was = (await legend().getAttribute("aria-pressed")) === "true";
        await legend().click();
        await legend(!was).waitFor();
        if (was) return;
    }
}

/**
 * The start page's Open a file button, then the browser's file chooser picks `file`; waits until the
 * graph is in.
 * @param h - the hand
 * @param file - the file's path
 */
export async function openFile(h, file) {
    const chooser = h.page.waitForEvent("filechooser");
    await h.page.getByRole("button", { name: /^Open a file/ }).click();
    await (await chooser).setFiles(file);
    await h.app.opened();
    await h.app.closeToast();
}

/**
 * Closes the "The file's styles are drawn..." notice a styled file leaves at the bottom, if shown.
 * @param page - the page
 */
export async function closeStyleNotice(page) {
    const note = page.getByText(/^The file's styles are drawn/).first();
    if (await note.isVisible()) {
        await page.getByRole("button", { name: "Close", exact: true }).last().click();
        await note.waitFor({ state: "hidden" });
    }
}

/**
 * Main menu, Back to start (setup only); waits for the start page.
 * @param page - the page
 */
export async function backToStart(page) {
    await page.getByRole("button", { name: "Main menu" }).click();
    await page.getByRole("menuitem", { name: "Back to start" }).click();
    await page.getByRole("button", { name: /^Open a file/ }).waitFor();
}
