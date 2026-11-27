/**
 * A node file whose key repeats, on the REAL graphty-element with the source-steps experiment on:
 * the first row of each key stands, and the source's entry in the Data place counts the rows left
 * out, so a reader can tell that rows were dropped.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { drop, emptyProject } from "./sourceSteps";

withFeatures(["source-steps"]);

/** Proteins keyed by an id that two rows repeat with another name. */
const PROTEINS = [
    "protein_id,symbol",
    ...Array.from({ length: 38 }, (_, i) => `P-${String(i)},S${String(i)}`),
    "P-0,p53",
    "P-3,p16INK4a",
].join("\n");

describe("a node file that repeats its key", () => {
    it("keeps the first row and counts the rows left out on its entry", async () => {
        await page.viewport(1280, 900);
        const { session } = await emptyProject();
        drop("proteins.csv", PROTEINS);
        const entry = await screen.findByRole("listitem", { name: "proteins.csv" });
        await waitFor(() => {
            assert.strictEqual(session.data.nodes().find((node) => node.id === "P-0")?.symbol, "S0");
        });
        await within(entry).findByText("Repeated ids");
        assert.include(entry.textContent, "Repeated ids2", "the count follows its label");
    });
});
