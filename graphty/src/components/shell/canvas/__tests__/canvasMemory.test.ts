import { beforeEach, describe, expect, it } from "vitest";

import { DATA_DRAWER_DEFAULT_HEIGHT } from "../../constants";
import {
    CANVAS_LAYOUT_STORAGE_KEY,
    DEFAULT_CANVAS_LAYOUT,
    readPersistedCanvasLayout,
    resolveCanvasLayout,
    writePersistedCanvasLayout,
} from "../canvasMemory";

describe("canvasMemory", () => {
    beforeEach(() => {
        window.localStorage.removeItem(CANVAS_LAYOUT_STORAGE_KEY);
    });

    describe("the guarded read", () => {
        it("returns nothing when the key is absent", () => {
            expect(readPersistedCanvasLayout()).toEqual({});
        });

        it("returns nothing when the value is not JSON", () => {
            window.localStorage.setItem(CANVAS_LAYOUT_STORAGE_KEY, "{not json");

            expect(readPersistedCanvasLayout()).toEqual({});
        });

        it("returns nothing when the value is an array", () => {
            window.localStorage.setItem(CANVAS_LAYOUT_STORAGE_KEY, "[1,2,3]");

            expect(readPersistedCanvasLayout()).toEqual({});
        });

        it("keeps the fields it can trust and drops the ones it cannot", () => {
            window.localStorage.setItem(
                CANVAS_LAYOUT_STORAGE_KEY,
                JSON.stringify({ drawerOpen: true, drawerHeight: "tall", legend: "yes", minimap: false }),
            );

            expect(readPersistedCanvasLayout()).toEqual({ drawerOpen: true, minimap: false });
        });

        it("reads nothing that is not on the 6.5 list", () => {
            window.localStorage.setItem(
                CANVAS_LAYOUT_STORAGE_KEY,
                JSON.stringify({ minimap: false, zoom: 2, selection: ["a"] }),
            );

            expect(readPersistedCanvasLayout()).toEqual({ minimap: false });
        });
    });

    describe("the round trip", () => {
        it("writes and reads back every entry the canvas owns", () => {
            const layout = {
                drawerOpen: true,
                drawerHeight: 320,
                minimap: false,
                legend: true,
                toolbar: false,
                timeSlider: true,
                insightsDismissed: true,
            };

            writePersistedCanvasLayout(layout);

            expect(readPersistedCanvasLayout()).toEqual(layout);
        });
    });

    describe("the defaults", () => {
        it("opens with the three baseline overlays shown and both docks closed", () => {
            expect(DEFAULT_CANVAS_LAYOUT).toEqual({
                drawerOpen: false,
                drawerHeight: DATA_DRAWER_DEFAULT_HEIGHT,
                minimap: true,
                legend: true,
                toolbar: true,
                timeSlider: false,
                insightsDismissed: false,
            });
        });

        it("lets a remembered field win over its default", () => {
            expect(resolveCanvasLayout({ minimap: false })).toEqual({ ...DEFAULT_CANVAS_LAYOUT, minimap: false });
        });
    });
});
