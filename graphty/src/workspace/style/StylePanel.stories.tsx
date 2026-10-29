// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { freshStore } from "../../stories/freshStore";
import { fixWallClock } from "../../test/fixedWallClock";
import { Workspace } from "../Workspace";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

/** The scene's rows, by the name the tree draws for each. */
interface Scene {
    readonly element: GraphtyElement;
    readonly session: GraphSession;
    /** The layer name of each run's first layer, by algorithm. */
    readonly runs: Readonly<Record<"degree" | "louvain" | "edge-betweenness" | "shortest-path", string>>;
}

/** The people the Key people layer paints. */
const KEY_PEOPLE = ["Valjean", "Javert", "Cosette", "Marius"];

/** The page: the story's own root and the popovers Mantine renders in the body. */
const page = (): ReturnType<typeof within> => within(document.body);

/**
 * Opens Les Miserables (77 characters) from the start screen, as a reader does, so the app gives
 * it the starting rows (Everything, Selected, Hovered) itself. Lays it on a circle, so every
 * capture draws the same picture, and builds the rest of the rows a reader would have by now: an
 * Annotations folder holding Key people; a route from Myriel to Marius on top; Louvain with
 * community 3 given its own color; Edge betweenness; Degree.
 * Each story then reaches its own state by real input.
 * @param canvasElement - the story's root.
 * @returns the scene.
 */
async function loadScene(canvasElement: HTMLElement): Promise<Scene> {
    await userEvent.click(await page().findByRole("button", { name: "Open the Les Miserables sample" }));
    await customElements.whenDefined("graphty-element");
    const element = await waitFor(() => {
        const found = canvasElement.querySelector("graphty-element");
        expect(found).not.toBeNull();
        return found as GraphtyElement;
    });
    const { session } = element;
    // The app loads the sample once the project's element is up, then starts the graph's history
    // (Workspace.tsx); that clear would cancel the switch to 2D below, so the open has to be over.
    await waitFor(() => {
        expect(session.data.statistics().nodeCount).toBe(77);
        expect(session.history.pending.length + session.history.steps.length).toBe(0);
    });
    expect(session.config.startingRows).toBe(true);
    expect(session.config.editableBase).toBe(true);
    await session.layout.setDimension("2d");
    await session.layout.set("circular");
    // A layout change frames the camera on later frames: wait for the framing to land.
    await element.waitForStableFrame();
    const idOf = (name: string): string => {
        const node = session.data.nodes().find((n) => n.name === name);
        if (node === undefined) {
            throw new Error(`Les Miserables has no ${name}`);
        }
        return String(node.id);
    };

    const folder = await session.styles.addFolder("Annotations");
    const key = await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: KEY_PEOPLE.map(idOf) },
        set: { "node.color": "#E8590C", "node.size": 2 },
    });
    await session.styles.moveRow(key.id, { parent: folder.id, index: 0 });

    const run = async (algorithm: keyof Scene["runs"], params: Record<string, unknown> = {}): Promise<string> => {
        const { runId } = await session.runs.start(algorithm, params);
        await session.styles.settled();
        const layer = session.runs
            .bindings(runId)
            .map((id) => session.styles.get(id))
            .find((l) => l !== undefined);
        if (layer === undefined) {
            throw new Error(`${algorithm} painted no layer`);
        }
        return layer.name;
    };
    // Bottom first: Degree's colors under Louvain's, and the route on top of both.
    const degree = await run("degree");
    const betweenness = await run("edge-betweenness");
    const louvain = await run("louvain");
    const louvainLayer = session.styles.list().find((l) => l.name === louvain && l.encode?.["node.color"]);
    const three =
        louvainLayer && session.styles.categories(louvainLayer.id, "node.color").find((c) => String(c.value) === "3");
    if (louvainLayer === undefined || three === undefined) {
        throw new Error("Louvain drew no community 3");
    }
    await session.styles.setValueEntry(
        louvainLayer.id,
        "node.color",
        three.value as string | number | boolean,
        "#00AA00",
    );
    const route = await run("shortest-path", { source: idOf("Myriel"), target: idOf("Marius") });
    await session.styles.settled();
    await element.waitForStableFrame();
    return {
        element,
        session,
        runs: { degree, louvain, "edge-betweenness": betweenness, "shortest-path": route },
    };
}

/**
 * Clicks a row of the style tree, as the reader picks it.
 * @param name - the row's name.
 */
async function clickRow(name: string): Promise<void> {
    const tree = await page().findByRole("tree", { name: "Style layers" });
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${escaped}, `) }));
}

/**
 * Opens the Annotations folder in the tree, by a click on it and ArrowRight, so Key people shows.
 */
async function openAnnotations(): Promise<void> {
    const tree = await page().findByRole("tree", { name: "Style layers" });
    const folder = await within(tree).findByRole("treeitem", { name: /^Annotations, / });
    await userEvent.click(folder);
    if (folder.getAttribute("aria-expanded") !== "true") {
        await userEvent.keyboard("{ArrowRight}");
    }
    await within(tree).findByRole("treeitem", { name: /^Key people, / });
}

/**
 * Clicks one of the inspector's tabs.
 * @param name - "Style" or "Values".
 */
async function clickTab(name: "Style" | "Values"): Promise<void> {
    const inspector = page().getByRole("complementary", { name: "Inspector" });
    await userEvent.click(await within(inspector).findByRole("tab", { name }));
}

/**
 * Opens a row's Style tab by a click on the row, and on the tab when the row opened on Values.
 * @param name - the row's name.
 * @returns the Style tab.
 */
async function openStyle(name: string): Promise<HTMLElement> {
    if (name === "Key people") {
        await openAnnotations();
    }
    await clickRow(name);
    const inspector = page().getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    return page().findByTestId("style-tab", {});
}

/**
 * Opens the color binding popover of the open Style tab, by a click on the bound value's pill.
 * @param tab - the Style tab.
 * @returns the popover.
 */
async function openColorBinding(tab: HTMLElement): Promise<HTMLElement> {
    const pill = await waitFor(() => {
        const found = tab.querySelector<HTMLElement>(".cm-var-fill-button");
        expect(found).not.toBeNull();
        return found as HTMLElement;
    });
    await userEvent.click(pill);
    return page().findByRole("group", { name: "Color binding" });
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Style panel review",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // A run row's header shows when the run started, to the second: start runs on a fixed clock.
    beforeEach: fixWallClock,
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A story on a fresh store, opening on the start screen, with the Les Miserables scene loaded.
 * @param play - what the reader does once the scene is built.
 * @returns the story.
 */
function sceneStory(play: (scene: Scene) => Promise<void>): Story {
    return {
        ...freshStore(),
        play: async ({ canvasElement }) => {
            const scene = await loadScene(canvasElement);
            await play(scene);
            // The key's node shapes arrive as pictures graphty-element draws after the frame.
            await waitFor(() => {
                expect(canvasElement.ownerDocument.querySelector("[data-node-picture-pending]")).toBeNull();
            });
            await scene.element.waitForStableFrame();
        },
    };
}

// Checkpoint 1: the tree, the Style tab, Clear, a folder's panel, several rows.

/** The tree with both row kinds, and Everything's Style tab. */
export const Tree: Story = sceneStory(async () => {
    await openStyle("Everything");
});

/** Selected at rest: the selection look as a halo and a band. */
export const SelectedAtRest: Story = sceneStory(async () => {
    await openStyle("Selected");
});

/** The route layer at rest. */
export const RouteAtRest: Story = sceneStory(async ({ runs }) => {
    await openStyle(runs["shortest-path"]);
});

/** Key people at rest: a hand-made layer of four named people inside the Annotations folder. */
export const KeyPeopleAtRest: Story = sceneStory(async () => {
    await openStyle("Key people");
});

/** Hovered at rest: it writes nothing, so every section is its dimmed title and "+". */
export const HoveredAtRest: Story = sceneStory(async () => {
    await openStyle("Hovered");
});

/** Key people's Shape "+", then Shape: its line is added, waiting for a value. */
export const AddToShape: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
    await userEvent.click(await page().findByRole("menuitem", { name: "Shape" }));
    await waitFor(() => {
        expect(tab.querySelector('[data-section="node-shape"] .ws-row[data-line="node.shape"]')).not.toBeNull();
    });
});

/** Key people's size removed with its minus: Shape is its dimmed title and "+" again. */
export const SizeRemoved: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Remove node size" }));
    await waitFor(() => {
        expect(tab.querySelector('[data-section="node-shape"] .ws-row')).toBeNull();
    });
});

/** Everything hidden by its eye: only what another shown row paints is still drawn. */
export const EverythingHidden: Story = sceneStory(async () => {
    const tree = page().getByRole("tree", { name: "Style layers" });
    const everything = within(tree).getByRole("treeitem", { name: /^Everything, / });
    await userEvent.click(within(everything).getByRole("button", { name: "Hide Everything" }));
    await within(everything).findByRole("button", { name: "Show Everything" });
    await openStyle("Everything");
});

/** The Annotations folder: the Style panel acting on its rows, under its scope line. */
export const FolderPanel: Story = sceneStory(async () => {
    await clickRow("Annotations");
    await page().findByText(/ in Annotations\b/, {});
});

/** Key people and Degree selected together: one panel for both, Mixed with who sets it where one sets a property. */
export const TwoRows: Story = sceneStory(async ({ runs }) => {
    const user = userEvent.setup();
    await openAnnotations();
    await clickRow("Key people");
    await user.keyboard("{Control>}");
    const tree = page().getByRole("tree", { name: "Style layers" });
    await user.click(within(tree).getByRole("treeitem", { name: new RegExp(`^${runs.degree}, `) }));
    await user.keyboard("{/Control}");
    await page().findByRole("heading", { level: 2, name: "2 layers" });
});

/**
 * Runs Leiden from Analyze, as a reader does, and selects the folder of group layers it makes: the
 * Style panel then acts on every group layer, under its scope line, with Fill showing each one's color.
 * @returns the Style tab.
 */
async function openLeidenFolder(): Promise<HTMLElement> {
    const toolbar = page().getByRole("toolbar", { name: "Canvas tools" });
    await userEvent.click(within(toolbar).getByRole("button", { name: "Analyze" }));
    await userEvent.type(await page().findByRole("combobox", { name: "Filter analyses" }), "Leiden");
    await userEvent.click(await page().findByRole("option", { name: /^Leiden/ }));
    await userEvent.click(await page().findByRole("button", { name: /^Run\b/ }));
    const tree = await page().findByRole("tree", { name: "Style layers" });
    const folder = await within(tree).findByRole("treeitem", { name: /^Leiden, folder, / });
    await userEvent.click(folder);
    await page().findByText(/ layers in Leiden\b/, {});
    return page().findByTestId("style-tab", {});
}

/**
 * The Fill row of a Style tab.
 * @param tab - the Style tab.
 * @returns the row.
 */
async function fillRow(tab: HTMLElement): Promise<HTMLElement> {
    return waitFor(() => {
        const found = tab.querySelector<HTMLElement>('.ws-row[data-line="node.color"]');
        expect(found).not.toBeNull();
        return found as HTMLElement;
    });
}

/** Leiden's folder of group layers selected: the scope line, and Fill showing each group layer's own color in list order. */
export const BulkFolder: Story = sceneStory(async () => {
    const tab = await openLeidenFolder();
    const fill = await fillRow(tab);
    await within(fill).findByRole("button", { name: /^Node color: / });
});

/** "One value for all", then a color typed into the Fill of Leiden's folder: every group layer takes it, and the receipt says so. */
export const BulkReceipt: Story = sceneStory(async () => {
    const tab = await openLeidenFolder();
    const fill = await fillRow(tab);
    await userEvent.hover(fill);
    await userEvent.click(within(fill).getByRole("button", { name: /^Give all \d+ layers one node color$/ }));
    await userEvent.click(await within(fill).findByRole("textbox", { name: /^Node color/ }));
    await userEvent.keyboard("0072B2{Enter}");
    await waitFor(() => {
        const found = fill.querySelector<HTMLElement>("[data-receipt]");
        expect(found).not.toBeNull();
        return found as HTMLElement;
    });
});

/** Fill > Change source > the run's group on Leiden's folder: the binding popover one layer gets for that value, held until it closes and copies the rule into each layer. */
export const BulkVaryByData: Story = sceneStory(async () => {
    const tab = await openLeidenFolder();
    const fill = await fillRow(tab);
    // Each layer on its own color: the pill opens the popover by Layer, and Change source picks the value.
    await userEvent.click(within(fill).getByRole("button", { name: /^Node color: from each layer, / }));
    const byLayer = await page().findByRole("dialog", { name: "Color from each layer" });
    await userEvent.click(within(byLayer).getByRole("button", { name: "Change source" }));
    const options = await page().findAllByRole("option", { name: /^Leiden/ });
    await userEvent.click(options[0]);
    const popover = await page().findByRole("dialog", { name: /^Color by / });
    await within(popover).findByRole("grid", { name: / groups$/ });
});

/** Fill from each layer on Leiden's folder: the pill opens the binding popover with Layer as its source, Louvain's group rows with one row per layer in list order, each starting on its layer's own color, before it closes and writes. */
export const BulkVaryByLayer: Story = sceneStory(async () => {
    const tab = await openLeidenFolder();
    const fill = await fillRow(tab);
    await userEvent.click(within(fill).getByRole("button", { name: /^Node color: from each layer, / }));
    const popover = await page().findByRole("dialog", { name: "Color from each layer" });
    await within(popover).findByRole("grid", { name: "Layer groups" });
});

/** "+" > Layer: a real "Layer 1" on nodes and edges, its name ready to type, writing nothing yet. */
export const NewLayer: Story = sceneStory(async () => {
    await userEvent.click(page().getByRole("button", { name: "Add a layer or a folder" }));
    await userEvent.click(await page().findByRole("menuitem", { name: "Layer" }));
    await page().findByRole("textbox", { name: "Layer name" });
    await page().findByTestId("style-tab", {});
});

// Checkpoint 2: pickers, popovers with category rows and New layer for a value, labels, shaders.

/** Key people's Size by a value: the value picker open from the vary glyph. */
export const VaryBy: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    const field = within(tab).getByRole("spinbutton", { name: /^Node size/ });
    // The glyph shows while the field holds focus (a story's pointer events move no CSS hover).
    await userEvent.click(field);
    const box = field.closest<HTMLElement>(".ws-row");
    if (box === null) {
        throw new Error("no Node size field");
    }
    await userEvent.click(await within(box).findByRole("button", { name: "Node size by attribute" }));
    await page().findByRole("combobox", { name: "Find an attribute" });
});

/** Degree's color ramp. */
export const DegreeRamp: Story = sceneStory(async ({ runs }) => {
    const tab = await openStyle(runs.degree);
    await openColorBinding(tab);
});

/** Louvain's category rows with community 3 recolored, and its menu open on "New layer for 3". */
export const LouvainCategories: Story = sceneStory(async ({ runs }) => {
    const tab = await openStyle(runs.louvain);
    const popover = await openColorBinding(tab);
    await userEvent.click(within(popover).getByRole("button", { name: /Group 3 actions$/ }));
    await within(popover).findByRole("menuitem", { name: "New layer for Group 3" });
});

/**
 * A Louvain group's detail, opened by a click on its row: Name, its color, and a shape set for it
 * alone through "+ Set another property" (any property per group, not only color).
 */
export const LouvainGroupDetail: Story = sceneStory(async ({ runs }) => {
    const tab = await openStyle(runs.louvain);
    const popover = await openColorBinding(tab);
    const name = popover.querySelector<HTMLElement>("[data-group-name]");
    if (name === null) {
        throw new Error("no group rows");
    }
    const group = name.firstChild?.textContent ?? "";
    await userEvent.click(name);
    const detail = await page().findByRole("group", { name: `${group} properties` });
    await userEvent.click(within(detail).getByRole("button", { name: `Set another property for ${group}` }));
    await userEvent.click(await page().findByRole("menuitem", { name: "Shape" }));
    const shape = await within(detail).findByRole("combobox", { name: new RegExp(`^${group} shape`) });
    await userEvent.click(shape);
    await userEvent.click(await page().findByRole("option", { name: /^Box/ }));
    await waitFor(() => {
        expect(within(detail).getByRole("combobox", { name: new RegExp(`^${group} shape`) })).toHaveValue("Box");
    });
});

/**
 * Louvain's Shape row after one group was given a box: the one shape every other group keeps,
 * and a second line naming the group that differs.
 */
export const LouvainShapeForOneGroup: Story = sceneStory(async ({ runs, session }) => {
    const tab = await openStyle(runs.louvain);
    const popover = await openColorBinding(tab);
    const name = popover.querySelector<HTMLElement>("[data-group-name]");
    if (name === null) {
        throw new Error("no group rows");
    }
    const group = name.firstChild?.textContent ?? "";
    await userEvent.click(name);
    const detail = await page().findByRole("group", { name: `${group} properties` });
    await userEvent.click(within(detail).getByRole("button", { name: `Set another property for ${group}` }));
    await userEvent.click(await page().findByRole("menuitem", { name: "Shape" }));
    const shape = await within(detail).findByRole("combobox", { name: new RegExp(`^${group} shape`) });
    await userEvent.click(shape);
    await userEvent.click(await page().findByRole("option", { name: /^Box/ }));
    await userEvent.keyboard("{Escape}");
    await userEvent.keyboard("{Escape}");
    await within(tab).findByRole("button", { name: /^Node shape: Box for 1 group by / });
    await session.styles.settled();
});

/** Edge betweenness: an edge layer's Style tab. */
export const EdgeBetweenness: Story = sceneStory(async ({ runs }) => {
    await openStyle(runs["edge-betweenness"]);
});

/** Key people's Text "+": the kinds of text a node can carry. */
export const LabelsMenu: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node text" }));
    await page().findByRole("menuitem", { name: /^Label/ });
});

/** A label entry on Key people reading the name. */
export const LabelEntry: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node text" }));
    await userEvent.click(await page().findByRole("menuitem", { name: /^Label/ }));
    await userEvent.click(await page().findByRole("option", { name: /^name(,|$)/ }));
    await within(tab).findByRole("button", { name: /^Label source: / });
});

/** Label settings open on Key people's name label: font, size, look and placement in one popover. */
export const LabelSettings: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node text" }));
    await userEvent.click(await page().findByRole("menuitem", { name: /^Label/ }));
    await userEvent.click(await page().findByRole("option", { name: /^name(,|$)/ }));
    await userEvent.click(await within(tab).findByRole("button", { name: "Node label settings" }));
    await page().findByRole("dialog", { name: "Label settings" });
});

/** Key people's Shape "+": the options the layer does not set yet, Wireframe, Outline, Glow and Halo among them. */
export const ShapeMenu: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
    await page().findAllByRole("menuitem", {});
});

/** Key people's Shaders "+": the one gallery, its search, the place and origin filters and the tiles. */
export const ShadersGallery: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node shaders" }));
    await page().findByTestId("shader-gallery", {});
});

// Checkpoint 3: the Values tab and Graph settings.

/** Degree's Values: its histogram with minimum, median and maximum. */
export const DegreeValues: Story = sceneStory(async ({ runs }) => {
    await clickRow(runs.degree);
    await clickTab("Values");
    await page().findByTestId("values-spread", {});
});

/** Louvain's Values: its groups, largest first. */
export const LouvainValues: Story = sceneStory(async ({ runs }) => {
    await clickRow(runs.louvain);
    await clickTab("Values");
    await page().findByText("Groups, largest first", {});
});

/** The route's Values: its nodes in order. */
export const RouteValues: Story = sceneStory(async ({ runs }) => {
    await clickRow(runs["shortest-path"]);
    await clickTab("Values");
    await page().findByRole("group", { name: "Nodes in order" });
});

/** Graph settings: lighting, label rules and the highlight color. */
export const GraphSettings: Story = sceneStory(async () => {
    await userEvent.click(page().getByRole("button", { name: "Graph settings" }));
    // Lighting shows only in 3D; Outline width shows in every view.
    await page().findByRole("spinbutton", { name: /^Outline width/ });
});

// College football: a number column that names groups, painted one color per value.

/**
 * Opens College football (115 teams; `value` is each team's conference, coded 0 to 11) from the
 * start screen, on a circle so every capture draws the same picture.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function loadFootball(canvasElement: HTMLElement): Promise<GraphtyElement> {
    await userEvent.click(await page().findByRole("button", { name: "Open the College football sample" }));
    await customElements.whenDefined("graphty-element");
    const element = await waitFor(() => {
        const found = canvasElement.querySelector("graphty-element");
        expect(found).not.toBeNull();
        return found as GraphtyElement;
    });
    // The open is finished when the workspace has started the graph's history (Workspace.tsx clears
    // it once the sample is read): before that, the clear would cancel the switch to 2D below.
    await waitFor(() => {
        const { history } = element.session;
        expect(element.session.data.statistics().nodeCount).toBe(115);
        expect(history.pending.length + history.steps.length).toBe(0);
    });
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular");
    await element.session.styles.settled();
    // A layout change frames the camera on later frames: wait for the framing to land.
    await element.waitForStableFrame();
    return element;
}

/**
 * A new layer named Conference, its node color varying by the conference code with one color per
 * value, all through the panel: "+" > Layer named Conference, the color's vary glyph, the value, the pill's
 * "One color per value". The binding popover is left open.
 */
export const FootballConference: Story = {
    ...freshStore(),
    play: async ({ canvasElement }) => {
        const element = await loadFootball(canvasElement);
        const { session } = element;
        const before = new Set(session.styles.list().map((l) => l.id));
        await userEvent.click(page().getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await page().findByRole("menuitem", { name: "Layer" }));
        await page().findByRole("textbox", { name: "Layer name" });
        await userEvent.keyboard("{Control>}a{/Control}Conference{Enter}");
        const tab: HTMLElement = await page().findByTestId("style-tab", {});
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node fill" }));
        const box: HTMLElement = await waitFor(() => {
            const found: HTMLElement | null = (page().getByTestId("style-tab") as HTMLElement).querySelector(
                '.ws-row[data-line="node.color"]',
            );
            expect(found).not.toBeNull();
            return found as HTMLElement;
        });
        // The glyph shows while the field holds focus (a story's pointer events move no CSS hover).
        (box.querySelector("input") as HTMLElement | null)?.focus();
        await userEvent.click(await within(box).findByRole("button", { name: "Node color by attribute" }));
        // The picker names each attribute with one fact about it ("value, 0 to 11").
        const search = await page().findByRole("combobox", { name: "Find an attribute" });
        const picker = (search as HTMLElement).closest<HTMLElement>(".cm-quick-actions") ?? document.body;
        await userEvent.click(await within(picker).findByRole("option", { name: /^value, / }));
        const made = await waitFor(() => {
            const layer = session.styles
                .list()
                .find((l) => !before.has(l.id) && l.encode?.["node.color"] !== undefined);
            expect(layer).toBeDefined();
            return layer as NonNullable<typeof layer>;
        });
        await within(page().getByRole("tree", { name: "Style layers" })).findByRole("treeitem", {
            name: /^Conference, /,
        });

        const styleTab = await openStyle("Conference");
        const popover = await openColorBinding(styleTab);
        await userEvent.click(within(popover).getByRole("button", { name: "One color per value" }));
        await waitFor(() => {
            const binding = session.styles.get(made.id)?.encode?.["node.color"];
            expect(binding !== undefined && "by" in binding ? binding.scale : undefined).toBe("ordinal");
        });
        await within(popover).findByRole("combobox", { name: /^Palette/ });
        await element.waitForStableFrame();
    },
};
