// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { onSiteWith } from "../../test/siteFeatures";
import { EDGES, NODES } from "../graph-place/twoRings.fixture";
import { Workspace } from "../Workspace";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

/** A project open on the Views place, its left panel at 240px. */
const OPEN = { project: { name: "Two rings", id: 1 }, page: "panels", place: "views", leftWidth: 240 } as const;

/** The five starting cameras, as the app writes them into every new project. */
const STARTING = ["Top", "Bottom", "Front", "Side", "Isometric"];

/**
 * Loads the two rings into the story's element, in 3D or 2D, once its starting cameras are written.
 * @param canvasElement - the story's root.
 * @param dimension - the drawing mode.
 * @returns the element.
 */
async function loadRings(canvasElement: HTMLElement, dimension: "2d" | "3d" = "3d"): Promise<GraphtyElement> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await waitFor(() => {
        expect([...element.session.views.keys()]).toEqual(STARTING);
    });
    await element.session.layout.setDimension(dimension);
    await element.session.layout.set("fixed");
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForStableFrame();
    return element;
}

/**
 * The Views place.
 * @param canvasElement - the story's root.
 * @returns the place.
 */
async function place(canvasElement: HTMLElement): Promise<HTMLElement> {
    return within(canvasElement).findByRole("region", { name: "Views place" });
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Views place",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // The Views place is the camera-views experiment's.
    beforeEach: onSiteWith(["camera-views"]),
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A new project: the five starting cameras as ordinary cards, and no tours. */
export const NewProject: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement);
        const views = await place(canvasElement);
        await within(views).findByText("No tours");
    },
};

/** A 2D project: Bottom, Front, Side and Isometric dimmed with "3D only"; Top works. */
export const TwoD: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRings(canvasElement, "2d");
        const views = await place(canvasElement);
        await waitFor(async () => {
            await expect(within(views).getByRole("button", { name: "Go to Side" })).toHaveAttribute(
                "aria-description",
                "3D only",
            );
        });
    },
};

/** A camera unfolded: its Kind, Mode, values, Key and Update to current camera. */
export const CameraUnfolded: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.session.views.save([{ name: "Hub cluster", key: "2" }]);
        const views = await place(canvasElement);
        await userEvent.click(await within(views).findByRole("button", { name: /^Expand Hub cluster/ }));
        await within(views).findByRole("group", { name: "Position" });
    },
};

/** A tour unfolded: camera stops, a pause and a stop whose camera is gone, Play disabled. */
export const TourUnfolded: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        await element.session.tours.save([
            {
                name: "Supply walk",
                tour: {
                    stops: [
                        { view: "Top", duration: 0, hold: 2000 },
                        { view: "Isometric", duration: 2000, hold: 2000 },
                        { pause: 1500 },
                        { view: "Gone", duration: 2000, hold: 3000 },
                    ],
                },
            },
        ]);
        const views = await place(canvasElement);
        await userEvent.click(await within(views).findByRole("button", { name: /^Expand Supply walk/ }));
        await expect(within(views).getByRole("button", { name: "Play Supply walk" })).toHaveAttribute(
            "aria-disabled",
            "true",
        );
    },
};

/** A tour playing: its second stop marked, and Stop in place of Play. */
export const TourPlaying: Story = {
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        const element = await loadRings(canvasElement);
        // Long holds, so the picture is taken while the second stop holds.
        await element.session.tours.save([
            {
                name: "Walk",
                tour: {
                    stops: [
                        { view: "Top", duration: 0, hold: 0 },
                        { view: "Isometric", duration: 0, hold: 600_000 },
                    ],
                },
            },
        ]);
        const views = await place(canvasElement);
        await userEvent.click(await within(views).findByRole("button", { name: /^Expand Walk/ }));
        await userEvent.click(within(views).getByRole("button", { name: "Play Walk" }));
        await within(views).findByRole("button", { name: "Stop tour" });
        await waitFor(async () => {
            await expect(
                within(views).getByRole("list", { name: "Stops of Walk" }).querySelector('[aria-current="step"]'),
            ).toHaveTextContent("2");
        });
        await element.waitForStableFrame();
    },
};
