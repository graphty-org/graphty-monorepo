/**
 * A file dragged over the start page on the REAL graphty-element: the drop area is outlined and the
 * page under it is left as it was, not washed out (#9282); dropping the file opens it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { server } from "vitest/browser";

import { dragFileOver, dropFileOn } from "../../../test/real-pointer";
import { render, screen, waitFor } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A sample on disk, dragged in as a reader's file: the Florentine families, 15 nodes. */
const FILE = `${server.config.root}/public/samples/florentine.gml`;

describe("start page drop target", () => {
    it("outlines the drop area without dimming the page, then opens the dropped file", async () => {
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        const heading = await screen.findByRole("heading", { level: 1 });

        await dragFileOver(heading, FILE);
        await screen.findByText("Drop to open");
        const target = document.querySelector(".ws-start-drop");
        assert.isNotNull(target);
        const look = getComputedStyle(target);
        assert.equal(look.backgroundColor, "rgba(0, 0, 0, 0)", "nothing is laid over the page");
        assert.equal(look.outlineStyle, "dashed", "the drop area is outlined");
        assert.notEqual(look.outlineWidth, "0px");
        const page = getComputedStyle(document.querySelector(".ws-land") as Element);
        assert.equal(page.opacity, "1");
        assert.equal(page.filter, "none");

        await dropFileOn(heading, FILE);
        await waitFor(() => {
            assert.equal(store.get().project?.name, "florentine");
        });
        await store.get().opened;
        const session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.equal(session?.data.statistics().nodeCount, 15);
        assert.isNull(document.querySelector(".ws-start-drop"), "the outline goes with the drag");
    });
});
