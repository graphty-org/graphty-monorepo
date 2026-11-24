/**
 * The panel allowlist `panel_opened` sends from (usage-analytics.md section 4.2): every dialog id
 * the app sets in the store maps to itself, a settings tab to "settings", and anything else to
 * "other". The ids are read from the app's own source and constants, not copied here, so an id the
 * store gains that the allowlist lacks fails this test.
 */
import { assert, describe, it } from "vitest";

import { DISCARD_DIALOG, KEEP_ASSETS_DIALOG, SAVE_AS_DIALOG } from "../../project/actions";
import { OPEN_V2_DIALOG, REPORT_V2_DIALOG } from "../../project/saveV2";
import { EXPAND_DIALOG, SERVER_DIALOG } from "../../server/commands";
import { NETWORK_DIALOG } from "../../start/NetworkDataDialog";
import { ON_RELOAD } from "../../state/store";
import { TOOLBAR_POPOVERS } from "../../toolbar/popover";
import { panelId } from "../useUsageEvents";

/** The app's source files, as text, tests and stories left out. */
const sources = import.meta.glob<string>(["../../**/*.{ts,tsx}", "!../../**/__tests__/**", "!../../**/*.stories.tsx"], {
    query: "?raw",
    import: "default",
    eager: true,
});

/**
 * Every literal dialog id the app writes into the store's `dialog` slot.
 * @returns the ids.
 */
function literalDialogIds(): Set<string> {
    const ids = new Set<string>();
    for (const text of Object.values(sources)) {
        for (const match of text.matchAll(/\bdialog: "([a-z][a-z0-9:-]*)"/g)) {
            // The store's reload record (`dialog: "kept"`) says what a reload does, not a dialog.
            if (match[1] !== ON_RELOAD.dialog) {
                ids.add(match[1]);
            }
        }
    }
    return ids;
}

describe("panel ids", () => {
    it("sends every dialog the app opens by its own id, and settings tabs as settings", () => {
        const literals = literalDialogIds();
        // Not vacuous: the scan found the store writes.
        assert.include([...literals], "about");
        assert.include([...literals], "settings:privacy");
        const dialogs = [
            ...literals,
            ...TOOLBAR_POPOVERS,
            NETWORK_DIALOG,
            SERVER_DIALOG,
            EXPAND_DIALOG,
            SAVE_AS_DIALOG,
            DISCARD_DIALOG,
            KEEP_ASSETS_DIALOG,
            OPEN_V2_DIALOG,
            REPORT_V2_DIALOG,
        ];
        for (const id of dialogs) {
            assert.equal(panelId(id), id.split(":")[0], id);
        }
        for (const id of [
            "graph",
            "data",
            "views",
            "assistant",
            "notes",
            "panels",
            "data-page",
            "open-v2",
            "report-v2",
        ]) {
            assert.equal(panelId(id), id);
        }
        assert.equal(panelId("SECRET project"), "other");
    });
});
