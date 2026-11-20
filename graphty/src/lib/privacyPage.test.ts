/**
 * The privacy page promises to list every event and every property the app sends: each event name
 * analytics.ts can send, each key it lets through, and the `internal` mark must appear on it.
 */
import { assert, describe, it } from "vitest";

import page from "../../public/privacy.html?raw";
import { COUNTED_NAMES, EVENT_KEYS } from "./analytics";

describe("privacy.html", () => {
    it("names every event and every property", () => {
        const names = new Set([...Object.keys(EVENT_KEYS), ...COUNTED_NAMES].filter((name) => !name.startsWith("$")));
        // Not vacuous: the lists were read.
        assert.include([...names], "style_changed");
        for (const name of names) {
            assert.include(page, `<code>${name}</code>`, name);
        }
        const keys = new Set([...Object.values(EVENT_KEYS).flatMap((keys) => keys ?? []), "internal"]);
        for (const key of keys) {
            assert.match(page, new RegExp(`\\b${key}\\b`), key);
        }
    });
});
