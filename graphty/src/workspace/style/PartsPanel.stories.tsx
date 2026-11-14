// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import { setDefaultFeatures } from "@graphty/graphty-element/extend";
import { fileStyleOf, type Layer } from "@graphty/graphty-element/session";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { loadSiteConfig, resetSiteConfig } from "../../siteConfig";
import { freshStore, storeOf } from "../../stories/freshStore";
import { siteFeatures } from "../../test/siteFeatures";
import type { WorkspaceStore } from "../state/store";
import { Workspace } from "../Workspace";
import { CYTOSCAPE_CX2, GRAPHVIZ_DOT, YED_GRAPHML } from "./__fixtures__/file-styles";
import ring from "./__fixtures__/ring.json";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Style panel by part",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // The file-styles experiment on, as a site whose site.json names it; put back afterwards.
    beforeEach: async () => {
        setDefaultFeatures(["file-styles"]);
        await siteFeatures(["file-styles"]);
        return async () => {
            setDefaultFeatures([]);
            resetSiteConfig();
            await loadSiteConfig();
        };
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** One of the three styled files. */
type FileKind = "graphml" | "cx2" | "dot";

/** Each file's text and name. */
const FILES: Readonly<Record<FileKind, { data: string; name: string }>> = {
    graphml: { data: YED_GRAPHML, name: "workflow.graphml" },
    cx2: { data: CYTOSCAPE_CX2, name: "network.cx2" },
    dot: { data: GRAPHVIZ_DOT, name: "shapes.gv" },
};

/**
 * The story's element, once it is defined, laid out flat and fixed.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function elementOf(canvasElement: HTMLElement): Promise<GraphtyElement> {
    await customElements.whenDefined("graphty-element");
    const element = await waitFor(() => {
        const found = canvasElement.querySelector("graphty-element");
        expect(found).not.toBeNull();
        return found as GraphtyElement;
    });
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("fixed");
    return element;
}

/** The Style tab's queries. */
const tab = (canvasElement: HTMLElement): ReturnType<typeof within> =>
    within(within(canvasElement).getByTestId("style-tab"));

/** The body, where pop-overs render. */
const body = (): ReturnType<typeof within> => within(document.body);

/**
 * Shows one row's Style tab on one kind's tab, by real clicks.
 * @param canvasElement - the story's root.
 * @param store - the story's store.
 * @param inspected - the row to show.
 * @param kind - nodes or edges.
 */
async function showStyle(
    canvasElement: HTMLElement,
    store: WorkspaceStore,
    inspected: { kind: string; id?: string },
    kind: "node" | "edge",
): Promise<void> {
    store.set({ inspected });
    const inspector = within(canvasElement).getByRole("complementary", { name: "Inspector" });
    await userEvent.click(await within(inspector).findByRole("tab", { name: "Style" }));
    await tab(canvasElement).findByRole("searchbox", { name: "Find a setting" });
    // A row that draws one kind has no kind tabs.
    const list = tab(canvasElement).queryByRole("tablist", { name: "Style for" });
    if (list !== null) {
        await userEvent.click(within(list).getByRole("tab", { name: kind === "node" ? /^Node/ : /^Edge/ }));
    }
}

/**
 * A story that loads one styled file with its styles and shows the first layer the file made for
 * one kind.
 * @param file - which file.
 * @param kind - nodes or edges.
 * @param play - what the reader does then.
 * @returns the story.
 */
function fileStory(
    file: FileKind,
    kind: "node" | "edge",
    play: (canvasElement: HTMLElement, element: GraphtyElement) => Promise<void>,
): Story {
    return {
        ...freshStore({ project: { name: "From a file", id: 1 } }),
        play: async (context) => {
            const { canvasElement } = context;
            const store = storeOf(context);
            const element = await elementOf(canvasElement);
            await element.session.data.import(
                { type: file, name: FILES[file].name, config: { data: FILES[file].data } },
                { styles: "file" },
            );
            await element.session.styles.settled();
            const layer = element.session.styles
                .list()
                .find((each: Layer) => each.target === kind && fileStyleOf(each) !== null);
            if (layer === undefined) {
                throw new Error(`the ${file} file made no ${kind} layer`);
            }
            await showStyle(canvasElement, store, { kind: "layer-row", id: layer.row ?? layer.id }, kind);
            await element.waitForStableFrame();
            await play(canvasElement, element);
        },
    };
}

/**
 * Opens a value list by its field.
 * @param canvasElement - the story's root.
 * @param channel - the field's property.
 * @returns the list's search box.
 */
async function openList(canvasElement: HTMLElement, channel: string): Promise<HTMLElement> {
    const button = await waitFor(() => {
        const found = within(canvasElement)
            .getByTestId("style-tab")
            .querySelector<HTMLElement>(`[data-value-listbox="${channel}"]`);
        expect(found).not.toBeNull();
        return found as HTMLElement;
    });
    await userEvent.click(button);
    return body().findByPlaceholderText(/^Search \d+ /);
}

/** A graph loaded without file styles: the Everything row, only the parts it sets open. */
export const PlainGraph: Story = {
    ...freshStore({ project: { name: "Ring", id: 1 } }),
    play: async (context) => {
        const { canvasElement } = context;
        const element = await elementOf(canvasElement);
        await element.session.data.addNodes(ring.nodes);
        await element.session.data.addEdges(ring.edges);
        await element.session.config.set({ startingRows: true, editableBase: true });
        await showStyle(canvasElement, storeOf(context), { kind: "everything-row" }, "node");
        await element.waitForStableFrame();
        await waitFor(() => {
            expect(
                within(canvasElement).getByTestId("style-tab").querySelector('[data-section="node-effects"] .ws-row'),
            ).toBeNull();
        });
    },
};

/** A yEd file's node layer: every value it sets in its part, the shape list open with the graph's shapes first. */
export const YedNodeLayer: Story = fileStory("graphml", "node", async (canvasElement) => {
    const search = await openList(canvasElement, "node.shape");
    await expect(search).toHaveAttribute("placeholder", expect.stringMatching(/^Search \d+ shapes$/));
});

/** The same yEd file's edge layer: both ends shown, the target end's list open. */
export const YedEdgeLayer: Story = fileStory("graphml", "edge", async (canvasElement) => {
    const ends = within(canvasElement)
        .getByTestId("style-tab")
        .querySelector<HTMLElement>('[data-section="edge-ends"]');
    await waitFor(() => {
        expect(ends?.querySelector('[data-line="edge.arrowTail"]')).not.toBeNull();
    });
    await openList(canvasElement, "edge.arrowHead");
});

/** A Cytoscape file's edge layer: the line pattern list open, Double among the graph's patterns. */
export const CytoscapeLinePattern: Story = fileStory("cx2", "edge", async (canvasElement) => {
    await openList(canvasElement, "edge.style");
    await body().findByRole("option", { name: /^Double/ });
});

/** A Graphviz file's node layer: the Text settings page open on Place. */
export const GraphvizLabelPages: Story = fileStory("dot", "node", async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("button", { name: "Node text settings" }));
    const page = await body().findByRole("dialog", { name: "Node text" });
    await userEvent.click(within(page).getByText("Place"));
    await waitFor(() => {
        expect(
            page.querySelector('[data-line="node.labelOffsetX"], [data-unset-line="node.labelOffsetX"]'),
        ).not.toBeNull();
    });
});

/** Find a setting: "shadow" typed, the matching settings by part, and the other layers that set them. */
export const FindASetting: Story = fileStory("graphml", "node", async (canvasElement) => {
    await userEvent.click(tab(canvasElement).getByRole("searchbox", { name: "Find a setting" }));
    await userEvent.keyboard("shadow");
    await waitFor(() => {
        expect(
            within(canvasElement).getByTestId("style-tab").querySelector('[data-result="node.shadowColor"]'),
        ).not.toBeNull();
    });
});
