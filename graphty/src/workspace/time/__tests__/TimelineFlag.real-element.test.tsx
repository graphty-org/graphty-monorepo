/**
 * The timeline behind its experiment, on the real element: with it off a reader finds no trace of
 * it over a graph with a column of dates, and the same clicks find it with it on.
 */

import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { siteFeatures } from "../../../test/siteFeatures";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Every edge carries its `sent` date. */
const OFFICE_EMAIL = `${import.meta.env.BASE_URL}samples/office-email.json`;

/**
 * Renders the workspace on the Data place and loads the sample.
 * @returns the session.
 */
async function open(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Timeline", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ config: { url: OFFICE_EMAIL }, name: "Sample" });
    return session;
}

/**
 * The Data place.
 * @returns queries inside it.
 */
function dataPlace(): ReturnType<typeof within> {
    return within(screen.getByRole("region", { name: "Data place" }));
}

describe("the timeline's switch in the app", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("shows no timeline with the experiment off, and the data stays", async () => {
        await siteFeatures([]);
        const session = await open();
        assert.deepEqual(session.features.enabled, []);
        await waitFor(() => {
            assert.isAbove(session.data.statistics().edgeCount, 0);
        });

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add to node fields" }));
        const offered = (await screen.findAllByRole("menuitem")).map((item) => item.textContent);
        assert.include(offered, "City");
        assert.notInclude(offered, "Time", "no Time in Fields");
        await userEvent.keyboard("{Escape}");

        assert.isNull(screen.queryByRole("button", { name: "Set as time" }), "no Set as time");
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }), "no dock");
        assert.isNull(screen.queryByRole("button", { name: "Timeline" }), "no toolbar button");
        assert.isNull(screen.queryByRole("button", { name: /^Time: / }), "no header chip");

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add filter" }));
        assert.isNull(screen.queryByRole("menuitem", { name: "Time window" }), "no Filters entry");
        await userEvent.keyboard("{Escape}");

        // The timeline's key does nothing.
        await userEvent.keyboard("t");
        assert.isNull(screen.queryByRole("region", { name: "Timeline" }));
        assert.include(
            session.data.attributes().map((each) => each.name),
            "sent",
        );
    });

    it("offers the same reader the timeline with the experiment on", async () => {
        await siteFeatures(["timeline"]);
        const session = await open();
        assert.deepEqual(session.features.enabled, ["timeline"]);

        await userEvent.click(await dataPlace().findByRole("button", { name: "Add to edge fields" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Time" }));
        await userEvent.click(await screen.findByRole("option", { name: "sent" }));

        await screen.findByRole("region", { name: "Timeline" });
        assert.deepEqual(session.time.field, { edges: { start: "sent" } });
        await screen.findByRole("button", { name: "Timeline" });
    });
});
