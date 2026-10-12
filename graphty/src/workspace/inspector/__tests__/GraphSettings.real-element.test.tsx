/**
 * Graph settings (the right panel with no row selected) on the REAL graphty-element, driven by
 * real input: each control is clicked or typed into, and the assertion reads the element back --
 * its lighting, its label behavior, its background and the color a highlight paints.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Renders the workspace on Graph settings and waits for the element and a small graph.
 * @returns the element.
 */
async function openGraphSettings(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    const store = createWorkspaceStore({ project: { name: "Pair", id: 1 }, inspected: { kind: "graph" } });
    render(<Workspace store={store} />);
    let found: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(
        () => {
            found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (found === null) {
        throw new Error("the element never came up");
    }
    const element: HTMLElementTagNameMap["graphty-element"] = found;
    await element.session.data.addNodes([{ id: "a" }, { id: "b" }]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    // The graph opens on its Values tab; the settings are on Style.
    await userEvent.click(await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS }));
    await screen.findByRole("combobox", { name: "Lighting" }, { timeout: TIMEOUT_MS });
    return element;
}

describe("Graph settings", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("sets the lighting to Matte on the element", async () => {
        const element = await openGraphSettings();
        assert.strictEqual(element.lighting, "studio");
        await userEvent.click(screen.getByRole("combobox", { name: "Lighting" }));
        await userEvent.click(await screen.findByRole("option", { name: "Matte" }));
        await waitFor(() => {
            assert.strictEqual(element.lighting, "matte");
        });
    });

    it("turns the declutter rule off and back on, and moves labels off nodes", async () => {
        const element = await openGraphSettings();
        assert.isTrue(element.layoutBehavior?.labels?.declutter);
        await userEvent.click(screen.getByRole("switch", { name: "Hide overlapping labels" }));
        await waitFor(() => {
            assert.isFalse(element.layoutBehavior?.labels?.declutter);
        });
        await userEvent.click(screen.getByRole("switch", { name: "Hide overlapping labels" }));
        await waitFor(() => {
            assert.isTrue(element.layoutBehavior?.labels?.declutter);
        });
        await userEvent.click(screen.getByRole("switch", { name: "Move labels off nodes and edges" }));
        await waitFor(() => {
            assert.isTrue(element.layoutBehavior?.labels?.avoidNodesAndEdges);
        });
    });

    it("writes the background color and the highlight color the reader types", async () => {
        const element = await openGraphSettings();
        const background = screen.getByRole("textbox", { name: "Background color" });
        await userEvent.clear(background);
        await userEvent.type(background, "112233{Enter}");
        await waitFor(() => {
            const now = element.session.config.background;
            assert.strictEqual(
                now.backgroundType === "color" ? now.color?.toLowerCase() : now.backgroundType,
                "#112233",
            );
        });

        const highlight = screen.getByRole("textbox", { name: "Highlight color" });
        await userEvent.clear(highlight);
        await userEvent.type(highlight, "AA0011{Enter}");
        await waitFor(() => {
            const color = element.session.styles.highlightStyle("node")["node.color"];
            assert.strictEqual(typeof color === "string" ? color.toLowerCase() : color, "#aa0011");
        });
    });

    it("draws the view in 2D after a click on 2D", async () => {
        const element = await openGraphSettings();
        // The layout form below draws its own 3D and 2D (the layout's shape); View is the camera.
        await userEvent.click(within(screen.getByRole("radiogroup", { name: "View" })).getByText("2D"));
        await waitFor(() => {
            assert.strictEqual(element.session.layout.dimension, "2d");
        });
    });
});
