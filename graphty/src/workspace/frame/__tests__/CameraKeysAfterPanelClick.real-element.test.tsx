/**
 * The camera keys keep working after a click in a panel (issue #10377), on the REAL
 * graphty-element and Les Miserables, by a real click and real key presses: W moves the camera
 * after a click on the Inspector's heading, and stays out of a text field.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

type GraphElement = HTMLElementTagNameMap["graphty-element"];

/**
 * Les Miserables in the workspace, drawn.
 * @returns The element.
 */
async function openGraph(): Promise<GraphElement> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const element = await waitFor(() => {
        const found = document.querySelector<GraphElement>("graphty-element");
        assert.isNotNull(found);
        assert.isDefined(found.session);
        return found;
    });
    await element.session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await element.waitForStableFrame();
    return element;
}

/**
 * The camera's position, to a thousandth, once it has stopped moving.
 * @param element - The element.
 * @returns The position.
 */
async function restingCamera(element: GraphElement): Promise<string> {
    const now = (): string => {
        const { position } = element.getCameraState();
        return JSON.stringify([position?.x, position?.y, position?.z].map((value) => (value ?? 0).toFixed(3)));
    };
    let before: string;
    do {
        before = now();
        await element.waitForStableFrame();
    } while (now() !== before);
    return before;
}

describe("Camera keys after a click in a panel (real element)", () => {
    it("W moves the camera after a click on the Inspector's heading", async () => {
        const element = await openGraph();
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        const [heading] = await within(inspector).findAllByRole("heading");
        await userEvent.click(heading);
        const before = await restingCamera(element);
        await userEvent.keyboard("w");
        assert.notStrictEqual(await restingCamera(element), before, "W after a panel click did not move the camera");
    });

    it("W typed into a text field leaves the camera where it is", async () => {
        const element = await openGraph();
        // Shift+A opens the Analyze list with focus in its filter box.
        await userEvent.keyboard("{Shift>}A{/Shift}");
        const field = await screen.findByRole("combobox", { name: "Filter analyses" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        const before = await restingCamera(element);
        await userEvent.keyboard("w");
        assert.strictEqual((field as HTMLInputElement).value, "w");
        assert.strictEqual(await restingCamera(element), before, "W in a text field moved the camera");
    });
});
