/**
 * With the source-steps experiment off, a project saved with a staged source (made while it was
 * on) opens on the REAL graphty-element and the Data place lists the source as an ordinary row, as
 * it did before staged sections existed, rather than failing to draw the panel. No Join control
 * shows anywhere: not in the Sources header, nor in a node's inspector.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { createGraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { withFeatures } from "../../../test/features";
import { screen, within } from "../../../test/test-utils";
import { emptyProject } from "./sourceSteps";

withFeatures([]);

const PEOPLE = "badge,name\nB1,Ann\nB2,Bo";
const BUILDINGS = "door,building\nD1,North\nD2,South";

/**
 * A saved project holding people.csv and a staged buildings.csv, made with the experiment on.
 * @returns the project file's text.
 */
async function savedWithStaged(): Promise<string> {
    const maker = createGraphSession({ features: ["source-steps"] });
    await maker.data.import({ type: "csv", config: { data: PEOPLE }, name: "people.csv" }, { key: "badge" });
    await maker.data.stage({ type: "csv", config: { data: BUILDINGS }, name: "buildings.csv" }, { key: "door" });
    const { text } = await maker.project.save();
    maker.dispose();
    return text;
}

describe("a staged source with the source-steps experiment off", () => {
    it("opens and lists it as an ordinary Sources row; the Data place draws", async () => {
        const text = await savedWithStaged();
        const { session } = await emptyProject();
        await session.project.open(text, { discard: true });

        const list = await screen.findByRole("list", { name: "Data sources" });
        await within(list).findByRole("listitem", { name: "buildings.csv" });
        assert.isNotNull(within(list).getByRole("listitem", { name: "people.csv" }));
        assert.isNull(screen.queryByText("This panel could not be shown"));
        assert.isNull(screen.queryByRole("region", { name: "buildings.csv" }), "no staged section");
        assert.isNull(screen.queryByRole("button", { name: /^Join/ }), "no Join with two sources");
        await session.selection.apply({ nodes: ["B1"] });
        await screen.findByRole("button", { name: /^Copy id/ });
        assert.isNull(screen.queryByRole("button", { name: /^Join/ }), "no Join in the inspector");
    });
});
