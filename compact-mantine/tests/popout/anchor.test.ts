import { describe, expect, it } from "vitest";

import {
    findPanelElement,
    type PopoutAnchorElements,
    resolveAnchorElement,
} from "../../src/components/popout/utils/anchor";

/**
 * Build a set of anchor candidates, with only the ones a test names present.
 */
function candidates(present: Partial<PopoutAnchorElements>): PopoutAnchorElements {
    return {
        trigger: null,
        parent: null,
        panel: null,
        ...present,
    };
}

const trigger = document.createElement("button");
const parent = document.createElement("div");
const panel = document.createElement("aside");
const named = document.createElement("p");

describe("resolveAnchorElement", () => {
    describe("with no target named", () => {
        it("puts the horizontal axis on the panel a nested pop-out opened from", () => {
            // The nesting case: a pop-out inside an anchored sidebar has to step
            // out from its parent panel, not collapse back onto the sidebar.
            const elements = candidates({ trigger, parent, panel });

            expect(resolveAnchorElement(undefined, "x", elements)).toBe(parent);
        });

        it("puts the horizontal axis on the container anchor when there is no parent panel", () => {
            const elements = candidates({ trigger, panel });

            expect(resolveAnchorElement(undefined, "x", elements)).toBe(panel);
        });

        it("falls back to the trigger for the horizontal axis when there is nothing else", () => {
            expect(resolveAnchorElement(undefined, "x", candidates({ trigger }))).toBe(trigger);
        });

        it("puts the vertical axis on the trigger even when a container anchor exists", () => {
            // This is what makes a panel open level with the row that opened it
            // while still meeting the sidebar edge.
            const elements = candidates({ trigger, parent, panel });

            expect(resolveAnchorElement(undefined, "y", elements)).toBe(trigger);
        });

        it("falls back to the parent panel for the vertical axis when there is no trigger", () => {
            expect(resolveAnchorElement(undefined, "y", candidates({ parent, panel }))).toBe(parent);
        });
    });

    describe("with a target named", () => {
        it("resolves a ref to the element it holds", () => {
            const elements = candidates({ trigger, parent, panel });

            expect(resolveAnchorElement({ current: named }, "x", elements)).toBe(named);
        });

        it("resolves a ref that holds nothing to nothing", () => {
            const elements = candidates({ trigger, parent, panel });

            expect(resolveAnchorElement({ current: null }, "x", elements)).toBeNull();
        });

        it("resolves \"parent\" to the panel the pop-out opened from", () => {
            expect(resolveAnchorElement("parent", "x", candidates({ trigger, parent, panel })))
                .toBe(parent);
        });

        it("resolves \"parent\" to the container anchor when the pop-out is not nested", () => {
            expect(resolveAnchorElement("parent", "x", candidates({ trigger, panel }))).toBe(panel);
        });

        it("resolves \"panel\" to the container anchor even for a nested pop-out", () => {
            expect(resolveAnchorElement("panel", "x", candidates({ trigger, parent, panel })))
                .toBe(panel);
        });

        it("resolves \"trigger\" to the trigger, ignoring both the parent and the container", () => {
            expect(resolveAnchorElement("trigger", "x", candidates({ trigger, parent, panel })))
                .toBe(trigger);
        });
    });
});

describe("findPanelElement", () => {
    it("finds an open panel by its pop-out id", () => {
        const root = document.createElement("div");
        const openPanel = document.createElement("div");
        openPanel.setAttribute("data-popout-id", ":r7:");
        root.append(openPanel);

        expect(findPanelElement(":r7:", root)).toBe(openPanel);
    });

    it("finds nothing for a pop-out that is not open", () => {
        expect(findPanelElement(":r9:", document.createElement("div"))).toBeNull();
    });

    it("finds nothing when there is no parent to look for", () => {
        expect(findPanelElement(null)).toBeNull();
    });
});
