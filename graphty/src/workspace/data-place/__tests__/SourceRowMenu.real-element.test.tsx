/**
 * A Sources row's menu on the REAL graphty-element, driven by real clicks: Select nodes selects the
 * nodes that load supplies, and Remove takes the load away, naming a joined table that went with it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, LoadedSource } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import football from "../../../../public/samples/football.gml?raw";
import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { sourceName } from "../words";

withFeatures([]);

/**
 * The workspace on the Data place.
 * @returns the session.
 */
async function openWorkspace(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Rows", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * Runs one item of a Sources row's menu.
 * @param load - the row's load.
 * @param item - the menu item.
 */
async function rowVerb(load: LoadedSource, item: string): Promise<void> {
    const name = sourceName(load);
    const place = await screen.findByRole("region", { name: "Data place" });
    const list = within(place).getByRole("list", { name: "Data sources" });
    const row = await within(list).findByRole("listitem", { name });
    await userEvent.click(within(row).getByRole("button", { name: `${name} menu` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: item }));
}

describe("a Sources row's menu", () => {
    beforeAll(async () => {
        await page.viewport(1440, 1000);
    });

    it("Select nodes selects that load's nodes, and Remove takes one load away", async () => {
        const session = await openWorkspace();
        await session.data.import({ type: "gml", name: "football.gml", config: { data: football } });
        await session.data.import(
            { type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } },
            { mode: "merge" },
        );
        const [first, second] = session.data.sources();

        await rowVerb(second, "Select nodes");
        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, second.counts.nodes);
        });

        await rowVerb(first, "Remove");
        await waitFor(() => {
            assert.deepEqual(
                session.data.sources().map((each) => each.key),
                [second.key],
            );
        });
        assert.isNull(screen.queryByText(/^Also removed/), "nothing was joined to it");
    });

    it("Remove names the joined table that went with the load", async () => {
        const session = await openWorkspace();
        await session.data.import({
            config: { file: new File(["id,name\nAna,Ana A\nBo,Bo B\nCy,Cy C"], "people.csv") },
            name: "people.csv",
        });
        const draft = await session.data.prepare(
            { config: { file: new File(["id,age\nAna,30\nBo,40"], "ages.csv") }, name: "ages.csv" },
            { onto: "graph" },
        );
        await draft.load({ join: { shape: "node-values", keys: [{ file: "id", graph: "id" }] } });
        const [people] = session.data.sources();

        await rowVerb(people, "Remove");
        await screen.findByText("Also removed what was joined to it: ages.csv");
        assert.lengthOf(session.data.sources(), 0);
    });
});
