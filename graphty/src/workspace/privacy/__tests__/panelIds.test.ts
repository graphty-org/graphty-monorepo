/**
 * The panel allowlist `panel_opened` sends from (usage-analytics.md section 4.2): every dialog id
 * the app sets in the store, by its own constant where it has one, maps to itself, and anything else
 * is "other".
 */
import { assert, describe, it } from "vitest";

import { DISCARD_DIALOG, KEEP_ASSETS_DIALOG, SAVE_AS_DIALOG } from "../../project/actions";
import { EXPAND_DIALOG, SERVER_DIALOG } from "../../server/commands";
import { NETWORK_DIALOG } from "../../start/NetworkDataDialog";
import { panelId } from "../useUsageEvents";

describe("panel ids", () => {
    it("sends every dialog the app opens by its own id, and settings tabs as settings", () => {
        const dialogs = [
            "about",
            "analyze",
            "custom-model",
            "export",
            "generators",
            "path",
            "quick-actions",
            "report",
            "samples",
            "score",
            "settings",
            "shader-editor",
            "shortcuts",
            "view",
            NETWORK_DIALOG,
            SERVER_DIALOG,
            EXPAND_DIALOG,
            SAVE_AS_DIALOG,
            DISCARD_DIALOG,
            KEEP_ASSETS_DIALOG,
        ];
        for (const id of [...dialogs, "graph", "data", "assistant", "notes", "panels", "data-page"]) {
            assert.equal(panelId(id), id);
        }
        assert.equal(panelId("settings:privacy"), "settings");
        assert.equal(panelId("SECRET project"), "other");
    });
});
