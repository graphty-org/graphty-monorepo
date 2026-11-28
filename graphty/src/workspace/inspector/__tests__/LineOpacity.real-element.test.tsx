/**
 * The inspector's Line section and its settings sheet on the REAL graphty-element (issue #9295),
 * driven by real clicks and keys: an Edge opacity added in the Edge line sheet is listed in the
 * Line section, and opening and closing the sheet leaves the camera where it was.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { showKind } from "../../style/__tests__/kindTab";
import { Workspace } from "../../Workspace";

withFeatures(["file-styles"]);

describe("the Line section and the Edge line sheet", () => {
    it("lists an Edge opacity set in the sheet, and opening and closing the sheet leaves the camera", async () => {
        await page.viewport(1440, 900);
        render(<Workspace store={createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } })} />);
        const element = await waitFor(() => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        });
        const session = element?.session;
        if (element === null || session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.styles.add({
            name: "Lines",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.color": "#ff0000", "edge.width": 2 },
        });
        await session.styles.settled();
        // The camera follows a running layout until it rests; the sheet is opened on a still drawing.
        assert.isTrue(await session.layout.settle(), "the layout came to rest");
        await element.waitForSettled();

        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(page.elementLocator(tree).getByRole("treeitem", { name: /^Lines, / }));
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const style = await within(inspector).findByRole("tab", { name: "Style" });
        if (style.getAttribute("aria-selected") !== "true") {
            await userEvent.click(page.elementLocator(inspector).getByRole("tab", { name: "Style", exact: true }));
        }
        const tab = await screen.findByTestId("style-tab");
        await showKind("edge");
        const line = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('[data-section="edge-line"]');
            assert.isNotNull(found, "the Line section");
            return found;
        });
        if (line === null) {
            throw new Error("no Line section");
        }
        const before = element.getCameraState();

        await userEvent.click(
            page.elementLocator(tab).getByRole("button", { name: "Edge line settings", exact: true }),
        );
        const sheet = await screen.findByRole("dialog", { name: "Edge line" });
        await userEvent.click(
            page.elementLocator(sheet).getByRole("button", { name: "Add edge opacity", exact: true }),
        );
        const field = await waitFor(() => {
            const found = sheet.querySelector<HTMLInputElement>('.ws-row[data-line="edge.opacity"] input');
            assert.isNotNull(found, "the Opacity line, waiting for a value");
            return found;
        });
        if (field === null) {
            throw new Error("no Opacity field");
        }
        await userEvent.tripleClick(field);
        await userEvent.keyboard("40{Enter}");
        await waitFor(() => {
            const lines = session.styles.list().find((layer: Layer) => layer.name === "Lines");
            assert.strictEqual(lines?.set?.["edge.opacity"], 0.4);
        });
        await userEvent.click(page.elementLocator(sheet).getByRole("button", { name: "Close Edge line", exact: true }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Edge line" }));
        });

        // Listed like the other line values: in the color's opacity box where the field is wide
        // enough to draw it, else on its own line.
        await waitFor(() => {
            const shown = [...line.querySelectorAll<HTMLInputElement>("input")].filter(
                (input) => /opacity/i.test(input.getAttribute("aria-label") ?? "") && input.checkVisibility(),
            );
            assert.lengthOf(shown, 1, "one opacity the reader can see");
            assert.match(shown[0]?.value ?? "", /^40/);
        });
        assert.deepEqual(element.getCameraState(), before, "the camera did not move");
    });
});
