/**
 * Graph settings (the right panel with no row selected) on the REAL graphty-element, driven by
 * real input: each control is clicked or typed into, and the assertion reads the element back --
 * its lighting, its label behavior, its background and the color a highlight paints.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { DEFAULT_BACKGROUND_COLOR } from "@graphty/graphty-element/schema";
import type { NodeRecordInput } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * Renders the workspace on Graph settings and waits for the element and a small graph.
 * @param nodes - the graph's two nodes.
 * @returns the element.
 */
async function openGraphSettings(
    nodes: readonly NodeRecordInput[] = [{ id: "a" }, { id: "b" }],
): Promise<HTMLElementTagNameMap["graphty-element"]> {
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
    await element.session.data.addNodes(nodes);
    await element.session.data.addEdges([{ source: "a", target: "b" }]);
    // The graph opens on its Values tab; the settings are on Style.
    await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
    await screen.findByRole("combobox", { name: "Lighting" });
    return element;
}

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answers the next file picker with this file (graphty/vitest.config.ts). */
        chooseNextFile: (name: string, mimeType: string, text: string) => Promise<void>;
    }
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

    it("turns the declutter rule on and back off, and labels move off nodes until turned off", async () => {
        const element = await openGraphSettings();
        assert.isFalse(element.layoutBehavior?.labels?.declutter, "every label is drawn by default");
        await userEvent.click(screen.getByRole("switch", { name: "Hide overlapping labels" }));
        await waitFor(() => {
            assert.isTrue(element.layoutBehavior?.labels?.declutter);
        });
        await userEvent.click(screen.getByRole("switch", { name: "Hide overlapping labels" }));
        await waitFor(() => {
            assert.isFalse(element.layoutBehavior?.labels?.declutter);
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

    it("keeps a flat picture flat when the reader changes the background color", async () => {
        const element = await openGraphSettings();
        const picture =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";
        await element.session.config.set({
            background: { backgroundType: "skybox", data: picture, projection: "flat", color: "#ffffff" },
        });
        const color = await screen.findByRole("textbox", { name: /^Background color(,|$)/ });
        await userEvent.clear(color);
        await userEvent.type(color, "112233{Enter}");
        await waitFor(() => {
            assert.strictEqual(element.session.config.background.color?.toLowerCase(), "#112233");
        });
        assert.deepInclude(element.session.config.background, { backgroundType: "skybox", projection: "flat" });
    });

    it("Background + adds a Shader over the Color, offers each kind once, and removing Color draws the default", async () => {
        const element = await openGraphSettings();
        const add = screen.getByRole("button", { name: "Add to background" });
        await userEvent.click(add);
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Shader/ }));
        const gallery = await screen.findByTestId("shader-gallery", {});
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

    it("an image the browser cannot decode is a failure notice; one it can is drawn as the background", async () => {
        const element = await openGraphSettings();
        await userEvent.click(screen.getByRole("button", { name: "Add to background" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Image/ }));

        // Bytes no browser here decodes, named as an iPad camera roll hands over a HEIC photo.
        await commands.chooseNextFile("IMG_0001.HEIC", "image/heic", "\u0000\u0000\u0000\u0018ftypheic");
        await userEvent.click(await screen.findByRole("button", { name: "Upload image" }));
        const alert = await screen.findByRole("alert");
        assert.include(alert.textContent ?? "", "IMG_0001.HEIC is HEIC, which this browser cannot draw.");
        assert.notStrictEqual(element.session.config.background.backgroundType, "skybox", "nothing was written");

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="32" height="16" fill="#369"/></svg>`;
        await commands.chooseNextFile("sky.svg", "image/svg+xml", svg);
        await userEvent.click(screen.getByRole("button", { name: "Upload image" }));
        await waitFor(() => {
            assert.strictEqual(element.session.config.background.backgroundType, "skybox");
        });
        const { background } = element.session.config;
        assert.strictEqual(background.backgroundType, "skybox");
        assert.match(background.backgroundType === "skybox" ? background.data : "", /^data:image\/png;base64,/);
    });

    it("offers no Outline width: each style layer sets its own", async () => {
        await openGraphSettings();
        assert.isNotNull(screen.getByRole("combobox", { name: "Lighting" }), "the panel is open");
        assert.isNull(screen.queryByText(/Outline width/));
        assert.isNull(document.querySelector('[data-setting="node.outlineWidth"]'));
    });

    it("hides Lighting and Same size at any depth in 2D, moves focus on, and the Values tab counts them", async () => {
        const element = await openGraphSettings();
        // Focus on Same size at any depth, then 5, the Mode menu's key for 2D.
        await userEvent.click(screen.getByRole("switch", { name: "Same size at any depth" }));
        await userEvent.click(screen.getByRole("switch", { name: "Same size at any depth" }));
        await userEvent.keyboard("5");
        await waitFor(() => {
            assert.strictEqual(element.session.layout.dimension, "2d");
            assert.isNull(screen.queryByRole("combobox", { name: "Lighting" }));
            assert.isNull(screen.queryByRole("switch", { name: "Same size at any depth" }));
        });
        assert.isFalse(element.session.config.inEffect("lighting").inEffect);
        // The hidden row held focus: it moves to the next row still shown, in Labels (Canvas has none left).
        await waitFor(() => {
            assert.strictEqual(document.activeElement, screen.getByRole("switch", { name: "Hide overlapping labels" }));
        });
        await userEvent.click(screen.getByRole("tab", { name: "Values" }));
        const note = await screen.findByTestId("settings-other-view");
        assert.strictEqual(note.textContent, "2 graph settings apply only in another view");
    });

    it("draws no Mode switch and no Layout section: the toolbar is their one home", async () => {
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

    it("an Image row removed before any image writes nothing, and a removed Color comes back from +", async () => {
        const element = await openGraphSettings();
        const add = screen.getByRole("button", { name: "Add to background" });
        await userEvent.click(add);
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Image/ }));
        await screen.findByRole("button", { name: "Upload image" });
        await userEvent.click(screen.getByRole("button", { name: "Remove background image" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("button", { name: "Upload image" }), "the Image row is gone");
        });
        assert.strictEqual(element.session.config.background.backgroundType, "color", "no image was written");

        await userEvent.click(screen.getByRole("button", { name: "Remove background color" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("textbox", { name: /^Background color(,|$)/ }));
        });
        const drawn = element.session.config.backgroundColor;
        await userEvent.click(add);
        const color = await screen.findByRole("menuitem", { name: /^Color/ });
        assert.isFalse(color.hasAttribute("data-disabled"), "Color can be added again");
        await userEvent.click(color);
        await screen.findByRole("textbox", { name: /^Background color(,|$)/ });
        assert.strictEqual(element.session.config.background.color, drawn, "the color it was drawn in");
        assert.isNull(document.querySelector("[data-background-caption]"), "no caption while a color is set");
    });

    it("Reset under a shader writes the default color and keeps the shader", async () => {
        const element = await openGraphSettings();
        await userEvent.click(screen.getByRole("button", { name: "Add to background" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Shader/ }));
        const gallery = await screen.findByTestId("shader-gallery", {});
        await userEvent.click(within(gallery).getByRole("button", { name: /^Nebula/ }));
        await waitFor(() => {
            assert.strictEqual(element.session.config.background.shader?.id, "nebula");
        });
        await userEvent.keyboard("{Escape}");
        const color = screen.getByRole("textbox", { name: /^Background color(,|$)/ });
        await userEvent.clear(color);
        await userEvent.type(color, "112233{Enter}");
        await waitFor(() => {
            assert.strictEqual(element.session.config.background.color?.toLowerCase(), "#112233");
        });
        await userEvent.click(screen.getByRole("button", { name: "Reset Background color to default" }));
        await waitFor(() => {
            assert.strictEqual(element.session.config.background.color, DEFAULT_BACKGROUND_COLOR);
        });
        assert.strictEqual(element.session.config.background.shader?.id, "nebula", "the shader stays");
    });

    it("Same size at any depth says it is on while node size follows data, until the reader sets it", async () => {
        const element = await openGraphSettings([
            { id: "a", weight: 1 },
            { id: "b", weight: 5 },
        ]);
        await element.session.styles.add({
            name: "By weight",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.size": { by: "data.weight", range: [1, 3] } },
        });
        // The description is part of the label, so the name starts with the setting's words.
        const same = await screen.findByRole("switch", { name: /^Same size at any depth/ });
        await waitFor(() => {
            assert.include(same.closest("[data-setting]")?.textContent ?? "", "On while node size follows data");
        });
        assert.isTrue((same as HTMLInputElement).checked, "on while size follows data");
        await userEvent.click(same);
        await waitFor(() => {
            assert.isFalse((same as HTMLInputElement).checked);
            assert.notInclude(same.closest("[data-setting]")?.textContent ?? "", "On while node size follows data");
        });
    });

    it("focus on Lighting moves to the last row shown when 2D hides Lighting and the row after it", async () => {
        const element = await openGraphSettings();
        const lighting = screen.getByRole("combobox", { name: "Lighting" });
        await userEvent.click(lighting);
        await userEvent.keyboard("{Escape}");
        assert.strictEqual(document.activeElement, lighting);
        await userEvent.click(screen.getByRole("button", { name: /^Mode/ }));
        await userEvent.click(await screen.findByRole("menuitemradio", { name: /^2D/ }));
        await waitFor(() => {
            assert.strictEqual(element.session.layout.dimension, "2d");
            assert.strictEqual(
                document.activeElement,
                screen.getByRole("switch", { name: "Move labels off nodes and edges" }),
            );
        });
        await screen.findByText("Lighting applies only in another view");
    });

    it("Show in Style on a background shader added from the Main menu focuses the Background +", async () => {
        const element = await openGraphSettings();
        await userEvent.click(screen.getByRole("tab", { name: "Values" }));
        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Add Shader..." }));
        const dialog = await screen.findByRole("dialog", { name: /^(New|Edit) shader$/ });
        await waitFor(() => {
            assert.isNotNull(dialog.querySelector('[data-editor="ready"]'), "the code editor has loaded");
        });
        await userEvent.click(within(dialog).getByText("Background"));
        const addToProject = within(dialog).getByRole("button", { name: "Add to project" });
        await waitFor(() => {
            assert.isNull(addToProject.getAttribute("aria-disabled"), "Add to project is enabled");
        });
        await userEvent.click(addToProject);
        await waitFor(() => {
            assert.lengthOf(element.session.shaders.list(), 1);
        });
        await userEvent.click(await screen.findByRole("button", { name: "Show in Style" }));
        await waitFor(() => {
            assert.strictEqual(document.activeElement?.getAttribute("aria-label"), "Add to background");
        });
    });
});
