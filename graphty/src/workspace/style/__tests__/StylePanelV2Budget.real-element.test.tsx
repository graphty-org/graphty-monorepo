/**
 * Style panel v2's mark budget on the REAL graphty-element (design/ui/style-panel-v2/design.md,
 * section 3 and acceptance checks 4 and 10): the default Everything node tab draws at most 26 hit
 * targets and at most one caret a section, an empty layer at most 8, the minus is the far-right slot
 * on every set line, and hovering a row draws nothing new on the graph (design 2.4: hover keeps
 * today's highlight).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { openProject, openStyle } from "./v2Harness";

/**
 * The panel's sections, below the Find a setting box.
 * @param tab - the Style tab.
 * @returns the sections.
 */
function sectionsIn(tab: HTMLElement): HTMLElement[] {
    return [...tab.querySelectorAll<HTMLElement>("[data-style-panel-v2] [data-section]")];
}

/**
 * A select's caret: a field that opens a list of choices (a select, or today's value list).
 * @param root - where to look.
 * @returns the carets.
 */
function caretsIn(root: HTMLElement): Element[] {
    return [...root.querySelectorAll('[role="combobox"], [data-value-listbox], select')];
}

/**
 * Every hit target of the sections (design 3): buttons ("+", settings, minus, swatches, toggles and
 * segments) and carets. A plain number or text field is no mark.
 * @param tab - the Style tab.
 * @returns how many.
 */
function marksIn(tab: HTMLElement): number {
    return sectionsIn(tab).reduce(
        (sum, section) =>
            sum +
            new Set([
                ...section.querySelectorAll('button, [role="button"], [role="radio"], input[type="checkbox"]'),
                ...caretsIn(section),
            ]).size,
        0,
    );
}

describe("Style panel v2's budget", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("the default Everything node tab stays within 26 marks and one caret a section", async () => {
        const { session } = await openProject();
        await session.config.set({ startingRows: true, editableBase: true });
        await session.styles.settled();
        const tab = await openStyle("Everything");
        await waitFor(() => {
            assert.isAbove(sectionsIn(tab).length, 0);
        });
        const marks = marksIn(tab);
        assert.isAtMost(marks, 26, `the Everything node tab draws ${String(marks)} marks`);
        const shape = tab.querySelector<HTMLElement>('[data-section="node-shape"]');
        assert.lengthOf(shape === null ? [] : caretsIn(shape), 1, "the shape list is Shape's one caret");
        for (const section of sectionsIn(tab)) {
            assert.isAtMost(caretsIn(section).length, 1, `${String(section.dataset.section)} has one caret at most`);
        }
    });

    it("an empty layer draws its 6 sections and at most 8 marks (ia-design 2)", async () => {
        const { session } = await openProject();
        await session.styles.add({ name: "Blank", target: "node", selector: { match: "everything" }, set: {} });
        await session.styles.settled();
        const tab = await openStyle("Blank");
        await waitFor(() => {
            assert.lengthOf(sectionsIn(tab), 6);
        });
        assert.isAtMost(marksIn(tab), 8);
    });

    it("the minus is the far-right slot of every set line, but for a row's settings '...' after it (E550)", async () => {
        const { session, id } = await openProject();
        await session.styles.update(id, {
            set: { "node.color": "#E8590C", "node.shape": "star", "node.size": 2, "node.borderColor": "#111111" },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const lines = await waitFor(() => {
            const found = [...tab.querySelectorAll<HTMLElement>("[data-style-panel-v2] .ws-row[data-set]")];
            assert.isAtLeast(found.length, 4);
            return found;
        });
        for (const line of lines) {
            const buttons = [...line.querySelectorAll<HTMLElement>("button")];
            // A row's main line ends [-] [...] (design 2.4, E550): its settings sit right of its minus.
            const settings = / settings$/.test(buttons.at(-1)?.getAttribute("aria-label") ?? "");
            const last = settings ? buttons.at(-2) : buttons.at(-1);
            assert.match(
                last?.getAttribute("aria-label") ?? "",
                /^Remove /,
                `${String(line.dataset.line)} ends in its minus`,
            );
            const right = Math.max(
                ...[...line.querySelectorAll("*")]
                    .filter((each) => !settings || !buttons.at(-1)?.contains(each))
                    .map((each) => each.getBoundingClientRect().right),
            );
            assert.isAtLeast((last?.getBoundingClientRect().right ?? 0) + 1, right, "nothing sits right of the minus");
        }
    });

    it("hovering a row writes nothing and adds no layer", async () => {
        const { session, id } = await openProject();
        const tab = await openStyle("Key people");
        const before = JSON.stringify(session.styles.list());
        const steps = session.history.position;
        const row = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('[data-style-panel-v2] [data-thing="fill"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.hover(row);
        await userEvent.hover(within(row).getAllByRole("button")[0]);
        await userEvent.unhover(row);
        await session.styles.settled();
        assert.equal(JSON.stringify(session.styles.list()), before);
        assert.equal(session.history.position, steps);
        assert.equal(session.styles.get(id)?.set?.["node.color"], "#E8590C");
        assert.isNull(screen.queryByRole("dialog"));
    });
});
