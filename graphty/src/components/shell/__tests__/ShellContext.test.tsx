import { act, renderHook } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { NARROW_BREAKPOINT } from "../constants";
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
        window.localStorage.clear();
    });

    describe("the hook", () => {
        it("throws outside a provider", () => {
            expect(() => renderHook(() => useShell())).toThrow(/ShellProvider/);
        });

        /* REWRITTEN 2026-09-14 from "opens with no activity, a collapsed inspector and the
           Empty state". Under the one-button model there is no "no activity" and no
           independent inspector state: the store always holds an activity, and one boolean
           says whether both sidebars are drawn. */
        it("opens with Data, both sidebars shown and the Empty state", () => {
            const { result } = renderShell();

            expect(result.current.activeActivity).toBe("data");
            expect(result.current.sidebarsHidden).toBe(false);
            expect(result.current.stateAxis).toBe("empty");
            expect(result.current.breakpoint).toBe("desktop");
        });
    });

    /* REPLACED the "close-on-active-click" describe. Spec:153's rule was struck on
       2026-09-14: the rail is a pure activity chooser, and the top bar's one control is
       the only thing that hides a sidebar. */
    describe("the rail as a pure activity chooser", () => {
        it("draws the clicked activity", () => {
            const { result } = renderShell();

            act(() => {
                result.current.selectActivity("explore");
            });

            expect(result.current.activeActivity).toBe("explore");
        });

        it("does nothing when the already-active icon is clicked", () => {
            const { result } = renderShell();

            act(() => {
                result.current.selectActivity("data");
            });
            act(() => {
                result.current.selectActivity("data");
            });

            expect(result.current.activeActivity).toBe("data");
            expect(result.current.sidebarsHidden).toBe(false);
        });

        it("switches activities without hiding anything", () => {
            const { result } = renderShell();

            act(() => {
                result.current.selectActivity("data");
            });
            act(() => {
                result.current.selectActivity("style");
            });

            expect(result.current.activeActivity).toBe("style");
            expect(result.current.sidebarsHidden).toBe(false);
        });

        it("reveals hidden sidebars, because a rail click is the reader asking to see that panel", () => {
            const { result } = renderShell();

            act(() => {
                result.current.setSidebarsHidden(true);
            });
            act(() => {
                result.current.selectActivity("analyze");
            });

            expect(result.current.sidebarsHidden).toBe(false);
            expect(result.current.activeActivity).toBe("analyze");
        });

        it("leaves hidden sidebars hidden when the programmatic route changes the activity", () => {
            const { result } = renderShell();

            act(() => {
                result.current.setSidebarsHidden(true);
            });
            act(() => {
                result.current.openActivity("explore");
            });

            /* `openActivity` is the first-load rule, a run function opening its own panel,
               a failure surface pointing at Data. A reader who hid the sidebars asked for
               the canvas; a background completion pulling them back is the kind of
               shell-performed layout change the 2026-09-14 model abolishes. */
            expect(result.current.sidebarsHidden).toBe(true);
            expect(result.current.activeActivity).toBe("explore");
        });
    });

    describe("the one sidebars boolean", () => {
        it("hides and shows both sidebars together", () => {
            const { result } = renderShell();

            act(() => {
                result.current.toggleSidebars();
            });

            expect(result.current.sidebarsHidden).toBe(true);

            act(() => {
                result.current.toggleSidebars();
            });

            expect(result.current.sidebarsHidden).toBe(false);
        });

        it("keeps both widths while they are hidden, so showing them restores what the reader chose", () => {
            const { result } = renderShell(1440);

            act(() => {
                result.current.setPanelWidth(360);
                result.current.setInspectorWidth(320);
            });
            act(() => {
                result.current.setSidebarsHidden(true);
            });
            act(() => {
                result.current.setSidebarsHidden(false);
            });

            expect(result.current.panelWidth).toBe(360);
            expect(result.current.inspectorWidth).toBe(320);
        });

        it("publishes no latch, no narrow overlay and no independent inspector axis", () => {
            const { result } = renderShell();
            const keys = Object.keys(result.current);

            /* The five mechanisms deleted on 2026-09-14, asserted by their absence so the
               next reader cannot reintroduce one and find the suite still green. */
            expect(keys).not.toContain("panelKeptOpen");
            expect(keys).not.toContain("inspectorKeptOpen");
            expect(keys).not.toContain("setPanelKeptOpen");
            expect(keys).not.toContain("setInspectorKeptOpen");
            expect(keys).not.toContain("inspectorOpen");
            expect(keys).not.toContain("setInspectorOpen");
            expect(keys).not.toContain("toggleInspector");
            expect(keys).not.toContain("closePanel");
            expect(keys).not.toContain("narrowOverlay");
            expect(keys).not.toContain("closeNarrowOverlay");
        });
    });

    describe("width clamps", () => {
        it("stops a panel drag where the canvas would fall below 520", () => {
            const { result } = renderShell(1280);

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
                result.current.setInspectorWidth(900);
            });

            expect(result.current.inspectorWidth).toBe(432);
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
        it("uses the v3 key, because a v2 record would deliver the OLD default", () => {
            expect(SHELL_LAYOUT_STORAGE_KEY).toBe("graphty.shell.layout.v3");
        });

        it("writes exactly the layout entries the memory rule allows and nothing else", () => {
            const { result } = renderShell(1440, true);

            act(() => {
                result.current.selectActivity("explore");
            });
            act(() => {
                result.current.setPanelWidth(360);
                result.current.setSectionOpen("inspector.counts", true);
            });

            const raw = window.localStorage.getItem(SHELL_LAYOUT_STORAGE_KEY) ?? "{}";
            const stored: unknown = JSON.parse(raw);

            /* FIVE keys, and no latch among them. The record used to carry `inspectorOpen`
               plus two optional latch fields, and the optionality was load-bearing
               machinery: an unchosen `false` was indistinguishable from a deliberate
               unlatch on the next visit. One boolean whose default is false is not
               ambiguous, so it is written unconditionally. */
            expect(Object.keys(stored as Record<string, unknown>).sort()).toEqual([
                "activeActivity",
                "inspectorWidth",
                "panelWidth",
                "sectionOpen",
                "sidebarsHidden",
            ]);
            expect(stored).toMatchObject({
                activeActivity: "explore",
                panelWidth: 360,
                sidebarsHidden: false,
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

        it("remembers hidden sidebars across a mount", () => {
            const first = renderShell(1440, true);

            act(() => {
                first.result.current.setSidebarsHidden(true);
            });

            first.unmount();

            const second = renderShell(1440, true);

            expect(second.result.current.sidebarsHidden).toBe(true);
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
                    sidebarsHidden: true,
                    sectionOpen: { good: true, bad: "open" },
                }),
            );

            expect(readPersistedShellLayout()).toEqual({
                inspectorWidth: 320,
                sidebarsHidden: true,
            });
        });

        it("reads no latch field, because the model that needed one is gone", () => {
            window.localStorage.setItem(
                SHELL_LAYOUT_STORAGE_KEY,
                JSON.stringify({ panelKeptOpen: true, inspectorKeptOpen: true, inspectorOpen: false }),
            );

            expect(readPersistedShellLayout()).toEqual({});
        });

        it("resolves a stored null activity to Data, which a v2 record could carry", () => {
            window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify({ activeActivity: null }));

            expect(readPersistedShellLayout()).toEqual({});

            const { result } = renderShell(1440, true);

            /* Under the old model null meant "no panel is open", and honouring it would
               deliver exactly the state the product owner complained about. There is no
               such state now, so there is no value that expresses it. */
            expect(result.current.activeActivity).toBe("data");
            expect(result.current.sidebarsHidden).toBe(false);
        });

        it("never restores Settings or Help as a resting panel", () => {
            window.localStorage.setItem(SHELL_LAYOUT_STORAGE_KEY, JSON.stringify({ activeActivity: "settings" }));

            expect(readPersistedShellLayout()).toEqual({});

            const { result } = renderShell(1440, true);

            expect(result.current.activeActivity).toBe("data");
        });

        /* REWRITTEN 2026-09-14 from "starts clean when persistence is off", which asserted
           a null activity. A store with persistence off is a store with no memory of the
           reader, and a store with nothing remembered is the same thing: both take the
           defaults, because the defaults are no longer a width-aware layout computed from
           a first visit. */
        it("ignores a stored record entirely when persistence is off", () => {
            window.localStorage.setItem(
                SHELL_LAYOUT_STORAGE_KEY,
                JSON.stringify({ activeActivity: "style", sidebarsHidden: true }),
            );

            const { result } = renderShell(1440, false);

            expect(result.current.activeActivity).toBe("data");
            expect(result.current.sidebarsHidden).toBe(false);
        });

        it("writes nothing at all when persistence is off", () => {
            const { result } = renderShell(1440, false);

            act(() => {
                result.current.toggleSidebars();
            });

            expect(window.localStorage.getItem(SHELL_LAYOUT_STORAGE_KEY)).toBeNull();
        });
    });

    describe("the breakpoint", () => {
        /* The store still PUBLISHES the breakpoint -- the frame reads it to draw the
           "screen too small" state instead of a layout, and the canvas region reads it for
           its chip-versus-card form -- but no BEHAVIOUR hangs off it any more. */
        it("reports narrow below the minimum width and desktop at it", () => {
            expect(renderShell(NARROW_BREAKPOINT - 1).result.current.breakpoint).toBe("narrow");
            expect(renderShell(NARROW_BREAKPOINT).result.current.breakpoint).toBe("desktop");
        });

        it("shows both sidebars by default at every width, because width no longer decides", () => {
            expect(renderShell(375, true).result.current.sidebarsHidden).toBe(false);
            window.localStorage.clear();
            expect(renderShell(1024, true).result.current.sidebarsHidden).toBe(false);
            window.localStorage.clear();
            expect(renderShell(1440, true).result.current.sidebarsHidden).toBe(false);
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
