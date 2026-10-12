// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import lesMiserables from "../../../public/samples/les-miserables.gml?raw";
import { fixWallClock } from "../../test/fixedWallClock";
import { createWorkspaceStore, type WorkspaceStore } from "../state/store";
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

/**
 * Loads Les Miserables (77 characters) into the story's element on a circle, so every capture
 * draws the same picture, and builds the panel's rows the way a reader would have by now: the
 * starting rows (Everything, Selected, Hovered); an Annotations folder holding Key people; a route
 * from Myriel to Marius on top; Louvain with community 3 given its own color; Edge betweenness;
 * Degree.
 * Each story then reaches its own state by real input.
 * @param canvasElement - the story's root.
 * @returns the scene.
 */
async function loadScene(canvasElement: HTMLElement): Promise<Scene> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    const { session } = element;
    await session.layout.setDimension("2d");
    await session.layout.set("circular");
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true });
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

/** The page: the story's own root and the popovers Mantine renders in the body. */
const page = (): ReturnType<typeof within> => within(document.body);

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
    return page().findByTestId("style-tab");
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
 * A story on a fresh store with the Les Miserables scene loaded.
 * @param play - what the reader does once the scene is built.
 * @returns the story.
 */
function sceneStory(play: (scene: Scene, store: WorkspaceStore) => Promise<void>): Story {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    return {
        args: { store },
        play: async ({ canvasElement }) => {
            store.set({ inspected: null });
            const scene = await loadScene(canvasElement);
            await play(scene, store);
            await scene.element.waitForStableFrame();
        },
    };
}

// Checkpoint 1: the tree, the Style tab, Clear, a folder's Selection colors, several rows.

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

/**
 * Key people's size typed over, then the minus hovered: its tooltip says what Clear gives back
 * and from which layer, before the reader clears it.
 */
export const ClearTooltip: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    const size = await within(tab).findByRole("combobox", { name: /^Node size, set here, / });
    await userEvent.tripleClick(size);
    await userEvent.keyboard("3{Enter}");
    await within(tab).findByRole("combobox", { name: "Node size, set here, 3" });
    const minus = within(tab).getByRole("button", { name: "Clear Node size" });
    await userEvent.hover(minus);
    const tip = document.getElementById(minus.getAttribute("aria-describedby") ?? "")?.textContent ?? "";
    await waitFor(
        () => {
            const shown = page()
                .queryAllByRole("tooltip", { hidden: true })
                .find((t: HTMLElement) => t.textContent === tip);
            expect(shown).toBeVisible();
        },
        // The theme opens a tooltip after a second's hover.
        { timeout: 5000 },
    );
});

/** After Clear: the field is empty again and shows the value beneath as its placeholder. */
export const Cleared: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Clear Node size" }));
    const size = await within(tab).findByRole("combobox", { name: /^Node size, not set/ });
    await waitFor(() => {
        expect(size.getAttribute("placeholder")).not.toBe("");
    });
});

/** The Annotations folder: its rows in paint order and its Selection colors open. */
export const FolderSelectionColors: Story = sceneStory(async () => {
    await clickRow("Annotations");
    await page().findByRole("list", { name: "In Annotations" });
    await userEvent.click(page().getByRole("button", { name: /^Show \d+ selection colors?$/ }));
    await page().findByRole("group", { name: /^#E8590C, from Key people/i });
});

/** Key people and Degree selected together: one panel for both, "Mixed" where they differ. */
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

/** A draft from Add layer, its kind chosen: nothing is added until a property is set. */
export const Draft: Story = sceneStory(async () => {
    await userEvent.click(page().getByRole("button", { name: "Add a layer or a folder" }));
    await userEvent.click(await page().findByRole("menuitem", { name: "Add layer" }));
    await page().findByText("Nothing is added until a property is set");
    const nodes = page().getByRole("radio", { name: "Nodes" });
    await userEvent.click(document.querySelector<HTMLElement>(`label[for="${nodes.id}"]`) ?? nodes);
    await page().findByTestId("style-tab");
});

// Checkpoint 2: pickers, popovers with category rows and New layer for a value, labels, effects.

/** Key people's Size by a value: the value picker open from the vary glyph. */
export const VaryBy: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    const field = within(tab).getByRole("combobox", { name: /^Node size, / });
    // The glyph shows while the field holds focus (a story's pointer events move no CSS hover).
    await userEvent.click(field);
    const box = field.closest<HTMLElement>(".ws-field");
    if (box === null) {
        throw new Error("no Node size field");
    }
    await userEvent.click(await within(box).findByRole("button", { name: "Node size by attribute" }));
    await page().findByRole("dialog", { name: "From data" });
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
    await userEvent.click(within(popover).getByRole("button", { name: "3 menu" }));
    await within(popover).findByRole("menuitem", { name: "New layer for 3" });
});

/** Edge betweenness: an edge layer's Style tab. */
export const EdgeBetweenness: Story = sceneStory(async ({ runs }) => {
    await openStyle(runs["edge-betweenness"]);
});

/** Key people's Text "+": the kinds of text a node can carry. */
export const LabelsMenu: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to Text" }));
    await page().findByRole("menuitem", { name: /^Label/ });
});

/** A label entry on Key people reading the name. */
export const LabelEntry: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to Text" }));
    await userEvent.click(await page().findByRole("menuitem", { name: /^Label/ }));
    await userEvent.click(await page().findByRole("option", { name: "name" }));
    await within(tab).findByRole("button", { name: /^Label source: / });
});

/** Key people's Effects "+": the effects the layer does not draw yet. */
export const EffectsMenu: Story = sceneStory(async () => {
    const tab = await openStyle("Key people");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node effects" }));
    await page().findAllByRole("menuitem");
});

// Checkpoint 3: the Values tab and Graph settings.

/** Degree's Values: its histogram with minimum, median and maximum. */
export const DegreeValues: Story = sceneStory(async ({ runs }) => {
    await clickRow(runs.degree);
    await clickTab("Values");
    await page().findByTestId("values-spread");
});

/** Louvain's Values: its groups, largest first. */
export const LouvainValues: Story = sceneStory(async ({ runs }) => {
    await clickRow(runs.louvain);
    await clickTab("Values");
    await page().findByText("Groups, largest first");
});

/** The route's Values: its nodes in order. */
export const RouteValues: Story = sceneStory(async ({ runs }) => {
    await clickRow(runs["shortest-path"]);
    await clickTab("Values");
    await page().findByRole("group", { name: "Nodes in order" });
});

/** Graph settings: lighting, label rules and the highlight color. */
export const GraphSettings: Story = sceneStory(async (_scene, store) => {
    store.set({ inspected: { kind: "graph" } });
    await clickTab("Style");
    await page().findByRole("combobox", { name: "Lighting" });
});
