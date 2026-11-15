/**
 * The legend overlay `<graphty-element legend>` draws (issue #292), from the legend model to HTML:
 * categorical blocks become a list of chips, continuous ones a ramp with its ends, and no binding
 * at all hides it.
 */
import { assert, describe, test } from "vitest";

import type { LegendBlock } from "../../../src/session/styles/legend";
import { LegendOverlay } from "../../../src/ui/Legend";

/** A categorical color block over `group`. */
const CATEGORICAL = {
    channel: "node.color",
    layerId: "l1",
    kind: "categorical",
    field: { plainName: "Group", technicalName: "group", path: "group" },
    swatches: [
        { label: "a", value: "a", color: "#ff0000" },
        { label: "b", value: "b", color: "#0000ff", name: "Bees" },
    ],
    overflow: { hidden: 3 },
    facts: [],
    departures: [],
} as unknown as LegendBlock;

/** A sequential color block over `degree`, 1 to 4. */
const SEQUENTIAL = {
    channel: "node.color",
    layerId: "l2",
    kind: "sequential",
    field: { plainName: "Degree", technicalName: "degree", path: "degree" },
    domain: { min: 1, max: 4 },
    swatches: [
        { label: "1", value: 1, color: "#440154" },
        { label: "4", value: 4, color: "#fde725" },
    ],
    facts: [],
    departures: [],
} as unknown as LegendBlock;

/**
 * Connects an overlay over a model that can be swapped, and the trigger that redraws it.
 * @param blocks - The first model.
 * @returns The overlay, a setter for the model and a function that fires `project:derived`.
 */
function overlay(blocks: readonly LegendBlock[]): {
    view: LegendOverlay;
    set: (next: readonly LegendBlock[]) => void;
    derive: () => void;
} {
    let model = blocks;
    let listener: (() => void) | undefined;
    const view = new LegendOverlay({
        legend: () => model,
        onDerived: (fn) => {
            listener = fn;
            return () => {
                listener = undefined;
            };
        },
    });
    view.connect(document.createElement("div"));
    return {
        view,
        set: (next) => {
            model = next;
        },
        derive: () => listener?.(),
    };
}

describe("LegendOverlay", () => {
    test("a categorical block is a named group with a chip and the data's words per row", () => {
        const { view } = overlay([CATEGORICAL]);
        const el = view.element;

        assert.isFalse(el.hidden);
        assert.strictEqual(el.getAttribute("part"), "legend");
        assert.strictEqual(el.getAttribute("role"), "group");
        assert.strictEqual(el.getAttribute("aria-label"), "legend");
        const group = el.querySelector("[role=group]");
        assert.exists(group);
        const titleId = group?.getAttribute("aria-labelledby") ?? "";
        assert.strictEqual(el.querySelector(`#${titleId}`)?.textContent, "group");
        const rows = [...el.querySelectorAll("li")];
        assert.deepEqual(
            rows.map((row) => row.textContent),
            ["a", "Bees"],
        );
        const chip = rows[0].querySelector<HTMLElement>(".chip");
        assert.strictEqual(chip?.getAttribute("aria-hidden"), "true");
        assert.strictEqual(chip?.style.background, "rgb(255, 0, 0)");
        assert.strictEqual(el.querySelector(".note")?.textContent, "+3");
    });

    test("a sequential block is a gradient ramp with its domain's ends as text", () => {
        const { view } = overlay([SEQUENTIAL]);
        const ramp = view.element.querySelector<HTMLElement>(".ramp");

        assert.exists(ramp);
        assert.strictEqual(ramp?.getAttribute("aria-hidden"), "true");
        assert.include(ramp?.style.background ?? "", "linear-gradient");
        assert.deepEqual(
            [...view.element.querySelectorAll(".ends span")].map((end) => end.textContent),
            ["1", "4"],
        );
        assert.isNull(view.element.querySelector("li"));
    });

    test("it follows the model on project:derived and hides with no block", () => {
        const { view, set, derive } = overlay([]);
        assert.isTrue(view.element.hidden, "no block, no legend");

        set([CATEGORICAL, SEQUENTIAL]);
        derive();
        assert.isFalse(view.element.hidden);
        assert.strictEqual(view.element.querySelectorAll(".section").length, 2);

        set([]);
        derive();
        assert.isTrue(view.element.hidden);
        assert.strictEqual(view.element.childElementCount, 0);
    });

    test("position and label are the consumer's; disconnect stops following", () => {
        const { view, set, derive } = overlay([CATEGORICAL]);
        view.setPosition("bottom-right");
        view.setLabel("Leyenda");
        assert.strictEqual(view.element.dataset.position, "bottom-right");
        assert.strictEqual(view.element.getAttribute("aria-label"), "Leyenda");

        view.disconnect();
        assert.isNull(view.element.parentNode);
        set([]);
        derive();
        assert.isFalse(view.element.hidden, "a disconnected overlay does not redraw");
    });
});
