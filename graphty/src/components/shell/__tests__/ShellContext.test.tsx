import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { readPersistedShellLayout, SHELL_LAYOUT_STORAGE_KEY, ShellProvider, useShell } from "../ShellContext";

function makeWrapper(shellWidth: number, persist = false) {
    return function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
        return (
            <ShellProvider initialShellWidth={shellWidth} measureViewport={false} persist={persist}>
                {children}
            </ShellProvider>
        );
    };
}

function renderShell(shellWidth = 1440, persist = false) {
    return renderHook(() => useShell(), { wrapper: makeWrapper(shellWidth, persist) });
}

describe("ShellContext", () => {
    beforeEach(() => {
        window.localStorage.removeItem(SHELL_LAYOUT_STORAGE_KEY);
    });

    describe("the hook", () => {
        it("throws outside a provider", () => {
            expect(() => renderHook(() => useShell())).toThrow(/ShellProvider/);
        });

        it("opens with no activity, a collapsed inspector and the Empty state", () => {
            const { result } = renderShell();

            expect(result.current.activeActivity).toBeNull();
            expect(result.current.inspectorOpen).toBe(false);
            expect(result.current.stateAxis).toBe("empty");
            expect(result.current.breakpoint).toBe("desktop");
        });
    });

    describe("close-on-active-click", () => {
        it("opens the clicked activity", () => {
            const { result } = renderShell();

            act(() => {
                result.current.selectActivity("data");
            });

            expect(result.current.activeActivity).toBe("data");
        });

        it("closes the panel when the already-active icon is clicked", () => {
            const { result } = renderShell();

            act(() => {
                result.current.selectActivity("data");
            });
            act(() => {
                result.current.selectActivity("data");
            });

            expect(result.current.activeActivity).toBeNull();
        });

        it("switches activities without closing", () => {
            const { result } = renderShell();

            act(() => {
                result.current.selectActivity("data");
            });
            act(() => {
                result.current.selectActivity("explore");
            });

            expect(result.current.activeActivity).toBe("explore");
        });

        it("does not toggle when the first-load rule opens an activity directly", () => {
            const { result } = renderShell();

            act(() => {
                result.current.openActivity("explore");
            });
            act(() => {
                result.current.openActivity("explore");
            });

            expect(result.current.activeActivity).toBe("explore");
        });
    });

    describe("width clamps", () => {
        it("stops a panel drag where the canvas would fall below 520", () => {
            const { result } = renderShell(1280);

            act(() => {
                result.current.setInspectorOpen(true);
            });
            act(() => {
                result.current.setPanelWidth(900);
            });

            expect(result.current.panelWidth).toBe(432);
        });

        it("never exposes a panel narrower than the grid identity", () => {
            const { result } = renderShell(1440);

            act(() => {
                result.current.setPanelWidth(120);
            });

            expect(result.current.panelWidth).toBe(280);
        });

        it("keeps the requested width so it returns on a wider viewport", () => {
            const narrow = renderShell(1024);

            act(() => {
                narrow.result.current.setPanelWidth(400);
            });

            expect(narrow.result.current.panelWidth).toBe(280);
        });

        it("clamps the inspector on the same canvas minimum", () => {
            const { result } = renderShell(1280);

            act(() => {
                result.current.selectActivity("data");
            });
            act(() => {
                result.current.setInspectorWidth(900);
            });

            expect(result.current.inspectorWidth).toBe(432);
        });
    });

    describe("the narrow one-overlay rule", () => {
        it("closes the inspector overlay when the panel opens", () => {
            const { result } = renderShell(1024);

            act(() => {
                result.current.setInspectorOpen(true);
            });

            expect(result.current.narrowOverlay).toBe("inspector");

            act(() => {
                result.current.selectActivity("explore");
            });

            expect(result.current.inspectorOpen).toBe(false);
            expect(result.current.narrowOverlay).toBe("panel");
        });

        it("closes the panel overlay when the inspector opens", () => {
            const { result } = renderShell(1024);

            act(() => {
                result.current.selectActivity("explore");
            });
            act(() => {
                result.current.setInspectorOpen(true);
            });

            expect(result.current.activeActivity).toBeNull();
            expect(result.current.narrowOverlay).toBe("inspector");
        });

        it("leaves a latched inspector open when the panel opens over it", () => {
            const { result } = renderShell(1024);

            act(() => {
                result.current.setInspectorOpen(true);
            });
            act(() => {
                result.current.setInspectorKeptOpen(true);
            });
            act(() => {
                result.current.selectActivity("explore");
            });

            expect(result.current.inspectorOpen).toBe(true);
            expect(result.current.activeActivity).toBe("explore");
            // The un-latched surface is the only one a tap may dismiss, so it holds the
            // overlay slot.
            expect(result.current.narrowOverlay).toBe("panel");
        });

        it("leaves a latched panel open when the inspector opens over it", () => {
            const { result } = renderShell(1024);

            act(() => {
                result.current.selectActivity("explore");
            });
            act(() => {
                result.current.setPanelKeptOpen(true);
            });
            act(() => {
                result.current.setInspectorOpen(true);
            });

            expect(result.current.activeActivity).toBe("explore");
            expect(result.current.inspectorOpen).toBe(true);
            expect(result.current.narrowOverlay).toBe("inspector");
        });

        it("latches at most one surface below 1280, so latching one releases the other", () => {
            const { result } = renderShell(1024);

            act(() => {
                result.current.setPanelKeptOpen(true);
            });
            act(() => {
                result.current.setInspectorKeptOpen(true);
            });

            expect(result.current.inspectorKeptOpen).toBe(true);
            expect(result.current.panelKeptOpen).toBe(false);
        });

        it("latches both surfaces on desktop, where neither is an overlay", () => {
            const { result } = renderShell(1440);

            act(() => {
                result.current.setPanelKeptOpen(true);
            });
            act(() => {
                result.current.setInspectorKeptOpen(true);
            });

            expect(result.current.panelKeptOpen).toBe(true);
            expect(result.current.inspectorKeptOpen).toBe(true);
        });

        it("refuses to close a latched overlay, so the Escape ladder falls through", () => {
            const { result } = renderShell(1024);
            let closed = true;

            act(() => {
                result.current.selectActivity("explore");
            });
            act(() => {
                result.current.setPanelKeptOpen(true);
            });
            act(() => {
                closed = result.current.closeNarrowOverlay();
            });

            expect(closed).toBe(false);
            expect(result.current.activeActivity).toBe("explore");
        });

        it("closes a latched panel from the user's own close control", () => {
            const { result } = renderShell(1024);

            act(() => {
                result.current.selectActivity("explore");
            });
            act(() => {
                result.current.setPanelKeptOpen(true);
            });
            act(() => {
                result.current.closePanel();
            });

            expect(result.current.activeActivity).toBeNull();
        });

        it("keeps both regions on desktop, where neither is an overlay", () => {
            const { result } = renderShell(1440);

            act(() => {
                result.current.selectActivity("explore");
            });
            act(() => {
                result.current.setInspectorOpen(true);
            });

            expect(result.current.activeActivity).toBe("explore");
            expect(result.current.inspectorOpen).toBe(true);
            expect(result.current.narrowOverlay).toBe("none");
        });

        it("reports whether Escape rung 3 had anything to close", () => {
            const desktop = renderShell(1440);
            let desktopClosed = true;

            act(() => {
                desktopClosed = desktop.result.current.closeNarrowOverlay();
            });

            expect(desktopClosed).toBe(false);

            const narrow = renderShell(1024);
            let narrowClosed = false;

            act(() => {
                narrow.result.current.selectActivity("explore");
            });
            act(() => {
                narrowClosed = narrow.result.current.closeNarrowOverlay();
            });

            expect(narrowClosed).toBe(true);
            expect(narrow.result.current.activeActivity).toBeNull();
            expect(narrow.result.current.narrowOverlay).toBe("none");
        });
    });

    describe("section open states", () => {
        it("falls back to the section's own default", () => {
            const { result } = renderShell();

            expect(result.current.isSectionOpen("inspector.counts")).toBe(false);
            expect(result.current.isSectionOpen("inspector.schema", true)).toBe(true);
        });

        it("remembers a section that was opened", () => {
            const { result } = renderShell();

            act(() => {
                result.current.setSectionOpen("inspector.counts", true);
            });

            expect(result.current.isSectionOpen("inspector.counts")).toBe(true);
        });

        it("toggles against the section's default", () => {
            const { result } = renderShell();

            act(() => {
                result.current.toggleSection("inspector.schema", true);
            });

            expect(result.current.isSectionOpen("inspector.schema", true)).toBe(false);
        });

        it("stores Expand all as the individual section states it sets", () => {
            const { result } = renderShell();

            act(() => {
                result.current.setSectionsOpen(["explore.filters", "explore.sets", "explore.views"], true);
            });

            expect(result.current.sectionOpen).toEqual({
                "explore.filters": true,
                "explore.sets": true,
                "explore.views": true,
            });
        });
    });

    describe("persistence", () => {
        it("writes exactly the layout entries the memory rule allows and nothing else", () => {
            const { result } = renderShell(1440, true);

            act(() => {
                result.current.selectActivity("explore");
            });
            act(() => {
                result.current.setPanelWidth(360);
                result.current.setInspectorOpen(true);
                result.current.setSectionOpen("inspector.counts", true);
            });

            const raw = window.localStorage.getItem(SHELL_LAYOUT_STORAGE_KEY) ?? "{}";
            const stored: unknown = JSON.parse(raw);

            expect(Object.keys(stored as Record<string, unknown>).sort()).toEqual([
                "activeActivity",
                "inspectorKeptOpen",
                "inspectorOpen",
                "inspectorWidth",
                "panelKeptOpen",
                "panelWidth",
                "sectionOpen",
            ]);
            expect(stored).toMatchObject({
                activeActivity: "explore",
                panelWidth: 360,
                inspectorOpen: true,
                sectionOpen: { "inspector.counts": true },
            });
        });

        it("restores a written layout on the next mount", () => {
            const first = renderShell(1440, true);

            act(() => {
                first.result.current.selectActivity("style");
                first.result.current.setPanelWidth(360);
            });

            first.unmount();

            const second = renderShell(1440, true);

            expect(second.result.current.activeActivity).toBe("style");
            expect(second.result.current.panelWidth).toBe(360);
        });

        it("survives an absent value", () => {
            expect(readPersistedShellLayout()).toEqual({});
        });

        it("survives a corrupt value", () => {
            window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, "{not json");

            expect(readPersistedShellLayout()).toEqual({});
        });

        it("survives a value of the wrong shape", () => {
            window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, "[]");

            expect(readPersistedShellLayout()).toEqual({});
        });

        it("keeps the fields it can trust and drops the ones it cannot", () => {
            window.localStorage.setItem(
                SHELL_LAYOUT_STORAGE_KEY,
                JSON.stringify({
                    activeActivity: "nonsense",
                    panelWidth: "wide",
                    inspectorWidth: 320,
                    inspectorOpen: true,
                    sectionOpen: { good: true, bad: "open" },
                    panelKeptOpen: "yes",
                    inspectorKeptOpen: true,
                }),
            );

            expect(readPersistedShellLayout()).toEqual({
                inspectorWidth: 320,
                inspectorOpen: true,
                inspectorKeptOpen: true,
            });
        });

        it("reads a record written before the latches existed, without a new key", () => {
            window.localStorage.setItem(
                SHELL_LAYOUT_STORAGE_KEY,
                JSON.stringify({ activeActivity: "style", panelWidth: 360 }),
            );

            const restored = readPersistedShellLayout();

            expect(restored).toEqual({ activeActivity: "style", panelWidth: 360 });

            const { result } = renderShell(1440, true);

            expect(result.current.panelKeptOpen).toBe(false);
            expect(result.current.inspectorKeptOpen).toBe(false);
        });

        it("remembers a latch across a mount, because it describes the reader and not the graph", () => {
            const first = renderShell(1440, true);

            act(() => {
                first.result.current.setInspectorKeptOpen(true);
            });

            first.unmount();

            const second = renderShell(1440, true);

            expect(second.result.current.inspectorKeptOpen).toBe(true);
        });

        it("never restores Settings or Help as a resting panel", () => {
            window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify({ activeActivity: "settings" }));

            expect(readPersistedShellLayout()).toEqual({});

            const { result } = renderShell(1440, true);

            expect(result.current.activeActivity).toBeNull();
        });

        it("starts clean when persistence is off", () => {
            window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify({ activeActivity: "style" }));

            const { result } = renderShell(1440, false);

            expect(result.current.activeActivity).toBeNull();
        });
    });

    describe("the state axis", () => {
        it("moves along the 6.1 axis", () => {
            const { result } = renderShell();

            act(() => {
                result.current.setStateAxis("loaded");
            });

            expect(result.current.stateAxis).toBe("loaded");
        });
    });
});
