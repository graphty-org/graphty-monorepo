/**
 * @file The column commands on the rendered element: a type change, a rename that a style layer
 * and the filter follow, and hidden columns through a project round trip, each one undo step.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

let mounted: Graphty | null = null;

/**
 * Mount an empty element and wait for it to settle.
 * @returns the element
 */
async function mount(): Promise<Graphty> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    container.innerHTML = `<graphty-element style="width:100%;height:100%;display:block"></graphty-element>`;
    document.body.appendChild(container);
    const element = container.querySelector("graphty-element") as Graphty;
    mounted = element;
    await element.updateComplete;
    await element.waitForSettled();
    return element;
}

afterEach(() => {
    mounted?.parentElement?.remove();
    mounted = null;
});

describe("column commands on the element", () => {
    test("converts, renames and hides, each one undo step, and the hidden set survives a reopen", async () => {
        const element = await mount();
        const { session } = element;
        await session.data.addNodes([
            { id: "a", amount: "12" },
            { id: "b", amount: "N/A" },
            { id: "c", amount: "3" },
        ]);
        const amounts = (name: string): unknown[] => session.data.nodes().map((node) => node[name]);

        assert.strictEqual(session.data.previewType({ kind: "node", name: "amount" }, "number").fails, 1);
        const steps = session.history.steps.length;
        await session.data.setType({ kind: "node", name: "amount" }, "number");
        assert.deepStrictEqual(amounts("amount"), [12, null, 3]);
        assert.strictEqual(session.history.steps.length, steps + 1);

        const layer = await session.styles.add({
            name: "Big",
            target: "node",
            selector: { match: "expression", where: "data.amount > `5`" },
            set: { "node.color": "#ff0000" },
        });
        await session.visibility.set({ kind: "range", attribute: "data.amount", min: 5 });
        await session.data.renameColumn({ kind: "node", name: "amount" }, "total");
        assert.deepStrictEqual(amounts("total"), [12, null, 3]);
        const painted = ["a", "b", "c"].filter((id) =>
            session.styles.explain({ node: id }).contributions.some((each) => each.layerId === layer.id),
        );
        assert.deepStrictEqual(painted, ["a"], "the layer still selects by the renamed column");
        assert.strictEqual(session.visibility.summary.visibleNodes, 1, "the filter still keeps one node");

        await session.data.setHidden([{ kind: "node", name: "total" }], true);
        const { text } = await session.project.save();
        await session.undo();
        assert.isFalse(session.data.attributes().some((each) => each.hidden === true));

        await session.project.open(text, { discard: true });
        assert.deepStrictEqual(
            session.data
                .attributes()
                .filter((each) => each.hidden === true)
                .map((each) => each.name),
            ["total"],
        );
    });
});
