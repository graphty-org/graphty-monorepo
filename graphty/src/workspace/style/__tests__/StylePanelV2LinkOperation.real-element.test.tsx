/**
 * Style panel v2's link-a-value dialog on a number, on the REAL graphty-element (owner, 2026-11-23): its first line
 * after the source is the Operation -- Set, Add, Subtract, Multiply, Divide -- Set by default, and a pick writes the
 * binding's `combine`, which graphty-element applies to the value underneath.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { findValuePicker, screen, waitFor, within } from "../../../test/test-utils";
import { openGraph, openStyle } from "./v2Harness";

describe("Style panel v2's link dialog on a number", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("offers Set, Add, Subtract, Multiply and Divide, Set by default, and a pick writes the operation", async () => {
        const { session, nodes } = await openGraph();
        await session.runs.start("degree");
        await session.styles.update(nodes, { set: { "node.borderColor": "#111111", "node.borderWidth": 0.1 } });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        await userEvent.click(await within(tab).findByRole("button", { name: "Node border width by attribute" }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^Degree(,|$)/ }));
        const bound = (): Record<string, unknown> | undefined =>
            session.styles.get(nodes)?.encode?.["node.borderWidth"] as Record<string, unknown> | undefined;
        await waitFor(() => {
            assert.isDefined(bound()?.by, "the width is bound");
        });

        // The bound line reads its column; a click on it opens the dialog.
        const line = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('.ws-row[data-line="node.borderWidth"]');
            assert.isNotNull(found);
            return found;
        });
        if (screen.queryByRole("group", { name: /binding$/ }) === null) {
            await userEvent.click(within(line).getByText("Degree"));
        }
        const dialog = await screen.findByRole("group", { name: /binding$/ });
        const operation = within(dialog).getByRole("radiogroup", { name: "Operation" });
        const radios = within(operation).getAllByRole<HTMLInputElement>("radio");
        assert.deepEqual(
            radios.map((radio) => radio.labels?.[0]?.textContent ?? ""),
            ["Set", "Add", "Subtract", "Multiply", "Divide"],
        );
        assert.isTrue(within(operation).getByRole<HTMLInputElement>("radio", { name: "Set" }).checked, "Set");

        const add = within(operation).getByRole<HTMLInputElement>("radio", { name: "Add" });
        const label = add.labels?.[0];
        assert.isDefined(label);
        await userEvent.click(label ?? add);
        await waitFor(() => {
            assert.strictEqual(bound()?.combine, "add");
        });
        const set = within(operation).getByRole<HTMLInputElement>("radio", { name: "Set" });
        await userEvent.click(set.labels?.[0] ?? set);
        await waitFor(() => {
            assert.isUndefined(bound()?.combine, "Set writes graphty-element's default");
        });
    });
});
