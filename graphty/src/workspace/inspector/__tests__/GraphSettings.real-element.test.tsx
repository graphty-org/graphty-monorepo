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

/**
 * Renders the workspace on Graph settings and waits for the element and a small graph.
 * @returns the element.
 */
async function openGraphSettings(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    const store = createWorkspaceStore({ project: { name: "Pair", id: 1 }, inspected: { kind: "graph" } });
    render(<Workspace store={store} />);
    let found: HTMLElementTagNameMap["graphty-element"] | null = null;
    await waitFor(() => {
        found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
    });
    if (found === null) {
        throw new Error("the element never came up");
    }
    const element: HTMLElementTagNameMap["graphty-element"] = found;
    await element.session.data.addNodes([{ id: "a" }, { id: "b" }]);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    // The graph opens on its Values tab; the settings are on Style.
    await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
    await screen.findByRole("combobox", { name: "Lighting" });
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

    it("turns the declutter rule off and back on, and labels move off nodes until turned off", async () => {
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
        assert.isTrue(element.layoutBehavior?.labels?.avoidNodesAndEdges, "labels move off nodes by default");
        await userEvent.click(screen.getByRole("switch", { name: "Move labels off nodes and edges" }));
        await waitFor(() => {
            assert.isFalse(element.layoutBehavior?.labels?.avoidNodesAndEdges);
        });
    });

    it("writes the background color the reader types, and Reset returns it to the element's default", async () => {
        const element = await openGraphSettings();
        const backgroundNow = (): string | undefined => {
            const now = element.session.config.background;
            return now.backgroundType === "color" ? now.color?.toLowerCase() : now.backgroundType;
        };
        const backgroundDefault = backgroundNow();
        const background = screen.getByRole("textbox", { name: /^Background color(,|$)/ });
        await userEvent.clear(background);
        await userEvent.type(background, "112233{Enter}");
        await waitFor(() => {
            assert.strictEqual(backgroundNow(), "#112233");
        });
        await userEvent.click(screen.getByRole("button", { name: "Reset Background color to default" }));
        await waitFor(() => {
            assert.strictEqual(backgroundNow(), backgroundDefault);
        });
        // No Highlight color row: it changed nothing already drawn and was not saved.
        assert.isNull(screen.queryByRole("textbox", { name: /^Highlight color/ }));
    });

    it("Background + adds a Shader over the Color, offers each kind once, and removing Color draws the default", async () => {
        const element = await openGraphSettings();
        const add = screen.getByRole("button", { name: "Add to background" });
        await userEvent.click(add);
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Shader/ }));
        const gallery = await screen.findByTestId("shader-gallery", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(gallery).getByRole("button", { name: /^Nebula/ }));
        await waitFor(() => {
            assert.strictEqual(element.session.config.background.shader?.id, "nebula");
        });
        // The color the project had is still there, beneath the shader.
        assert.isDefined(element.session.config.background.color);
        assert.isNotNull(screen.queryByRole("textbox", { name: /^Background color(,|$)/ }), "the Color row stays");
        await userEvent.keyboard("{Escape}");

        // Each kind once: Shader is there, so the menu shows it disabled, with its reason.
        await userEvent.click(add);
        const shader = await screen.findByRole("menuitem", { name: /^Shader/ });
        assert.isTrue(
            shader.hasAttribute("data-disabled") || shader.getAttribute("aria-disabled") === "true",
            "Shader is disabled",
        );
        assert.include(shader.textContent ?? "", "Shader is already in the background");
        // The "+" again closes its menu.
        await userEvent.click(add);
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menuitem", { name: /^Shader/ }));
        });

        // Removing Color leaves the element to draw its default color, which the section names.
        await userEvent.click(screen.getByRole("button", { name: "Remove background color" }));
        await waitFor(() => {
            assert.isUndefined(element.session.config.background.color);
        });
        const drawn = element.session.config.backgroundColor;
        assert.strictEqual(drawn, "#F5F5F5", "the element draws its default");
        assert.strictEqual(element.session.config.background.shader?.id, "nebula", "the shader stays");
        assert.isNull(screen.queryByRole("textbox", { name: /^Background color(,|$)/ }), "no Color row");
        await waitFor(() => {
            assert.include(document.querySelector("[data-background-caption]")?.textContent ?? "", drawn);
        });
    });

    it("writes Outline width to the element's layout behavior", async () => {
        const element = await openGraphSettings();
        const width = screen.getByRole("spinbutton", { name: /^Outline width/ });
        await userEvent.clear(width);
        await userEvent.type(width, "3{Enter}");
        await waitFor(() => {
            assert.strictEqual(element.layoutBehavior?.node?.outlineWidth, 3);
        });
        assert.isNotNull(screen.getByText(/use Halo/));
    });

    it("hides Lighting and Same size at any depth in 2D, moves focus on, and the Values tab counts them", async () => {
        const element = await openGraphSettings();
        // Focus on Same size at any depth, then 5, the toolbar View's key for 2D.
        await userEvent.click(screen.getByRole("switch", { name: "Same size at any depth" }));
        await userEvent.click(screen.getByRole("switch", { name: "Same size at any depth" }));
        await userEvent.keyboard("5");
        await waitFor(() => {
            assert.strictEqual(element.session.layout.dimension, "2d");
            assert.isNull(screen.queryByRole("combobox", { name: "Lighting" }));
            assert.isNull(screen.queryByRole("switch", { name: "Same size at any depth" }));
        });
        assert.isFalse(element.session.config.inEffect("lighting").inEffect);
        // The hidden row held focus: it moves to the next row still shown.
        await waitFor(() => {
            assert.strictEqual(document.activeElement, screen.getByRole("spinbutton", { name: /^Outline width/ }));
        });
        await userEvent.click(screen.getByRole("tab", { name: "Values" }));
        const note = await screen.findByTestId("settings-other-view");
        assert.strictEqual(note.textContent, "2 graph settings apply only in another view");
    });

    it("draws no View switch and no Layout section: the toolbar is their one home", async () => {
        await openGraphSettings();
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        const threeD = within(inspector)
            .queryAllByRole("radiogroup")
            .filter((group) => within(group).queryByText("3D") !== null);
        assert.lengthOf(threeD, 0);
        assert.isNull(within(inspector).queryByRole("heading", { name: "Layout" }));
        const scroller = inspector.querySelector<HTMLElement>("[data-inspected]");
        assert.isNotNull(scroller);
        assert.isAtMost(scroller?.scrollWidth ?? 0, scroller?.clientWidth ?? 0, "no sideways scrolling");
        await page.screenshot({
            path: "../../../../../design/ui/studio/tier3/build/key-values-settings/graph-settings-1366x768.png",
        });
    });

    it("shows Direction in one word with its explanation, and Degree one figure per row", async () => {
        await openGraphSettings();
        await userEvent.click(screen.getByRole("tab", { name: "Values" }));
        const direction = await screen.findByRole("group", { name: "Direction" });
        const word = direction.querySelector("[data-testid=data-row-value]")?.textContent;
        assert.oneOf(word, ["Undirected", "Directed", "Mixed", "Not settled"]);
        const spread = await screen.findByTestId("values-spread");
        for (const name of ["Lowest", "Median", "Mean", "Highest"]) {
            assert.isNotNull(within(spread).getByRole("group", { name }), name);
        }
        assert.isNull(screen.queryByRole("group", { name: "Edges per node" }));
    });
});
