// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";

import { Workspace } from "../Workspace";

/** Eight nodes on a ring with two chords, laid out on a flat circle, which places them the same way every time. */
const NODES = Array.from({ length: 8 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = [
    ...NODES.map((node, i) => ({ source: node.id, target: NODES[(i + 1) % NODES.length].id })),
    { source: "n0", target: "n4" },
    { source: "n2", target: "n6" },
];

const OPEN = { project: { name: "Ring", id: 1 } } as const;

/**
 * Loads the ring into the story's element and waits for a stable frame.
 * @param canvasElement - the story's root.
 */
async function loadRing(canvasElement: HTMLElement): Promise<void> {
    await customElements.whenDefined("graphty-element");
    const element = canvasElement.querySelector("graphty-element");
    if (element === null) {
        throw new Error("the story rendered no <graphty-element>");
    }
    await element.session.layout.setDimension("2d");
    await element.session.layout.set("circular", { options: { scale: 0.2 } });
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.waitForStableFrame();
}

/**
 * Clicks the control with this accessible name.
 * @param canvasElement - the story's root.
 * @param name - the control's aria-label.
 */
function click(canvasElement: HTMLElement, name: string): void {
    const control = canvasElement.querySelector<HTMLElement>(`[aria-label="${name}"]`);
    if (control === null) {
        throw new Error(`no control named "${name}"`);
    }
    control.click();
}

const meta: Meta<typeof Workspace> = {
    title: "Workspace/Frame",
    tags: ["autodocs"],
    component: Workspace,
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "The window around every place: the main menu and the project name at the top left with undo and redo beside them, the rail that switches between the Graph and Data places, the inspector on the right and the toolbar at the canvas's foot. Help opens About and the keyboard shortcuts (press ?).",
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A small graph just loaded, nothing run (the mock's `#/graph-place/karate`). */
export const AtRest: Story = {
    name: "At rest",
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRing(canvasElement);
    },
};

/** The rail's Data place lit. */
export const DataPlace: Story = {
    name: "Data place lit",
    args: { initialState: { ...OPEN, place: "data" } },
    play: async ({ canvasElement }) => {
        await loadRing(canvasElement);
    },
};

/** The main menu open (the mock's `#/main-menu/open`): only built commands are drawn. */
export const MainMenuOpen: Story = {
    name: "Main menu open",
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRing(canvasElement);
        click(canvasElement, "Main menu");
    },
};

/** The project-name menu open (the mock's `#/project-menu/open`). */
export const ProjectMenuOpen: Story = {
    name: "Project menu open",
    args: { initialState: OPEN },
    play: async ({ canvasElement }) => {
        await loadRing(canvasElement);
        click(canvasElement, "Project: Ring");
    },
};

/** Renaming the project in place (double-click or F2). */
export const Renaming: Story = {
    args: { initialState: { ...OPEN, renaming: true } },
    play: async ({ canvasElement }) => {
        await loadRing(canvasElement);
    },
};

/** The table dock open along the canvas's foot. */
export const TableOpen: Story = {
    name: "Table open",
    args: { initialState: { ...OPEN, dockOpen: true } },
    play: async ({ canvasElement }) => {
        await loadRing(canvasElement);
    },
};

/** The Data page taking the area right of the rail, Data lit. */
export const DataPage: Story = {
    name: "Data page open",
    args: { initialState: { ...OPEN, page: "data-page" } },
};

/**
 * Help > About. A built Storybook carries the real build stamp, which changes with every commit
 * and release, so the story writes a fixed one (the unit test's) and its picture stays the same.
 */
export const About: Story = {
    args: { initialState: { ...OPEN, dialog: "about" } },
    decorators: [
        (Story) => {
            let meta = document.querySelector<HTMLMetaElement>('meta[name="graphty-build"]');
            if (meta === null) {
                meta = document.createElement("meta");
                meta.name = "graphty-build";
                document.head.append(meta);
            }
            meta.content = "0123456789ab graphty@0.8.35";
            return <Story />;
        },
    ],
};

/** Keyboard shortcuts, listing every built command's key. */
export const KeyboardShortcuts: Story = {
    name: "Keyboard shortcuts",
    args: { initialState: { ...OPEN, dialog: "shortcuts" } },
    play: async ({ canvasElement }) => {
        await loadRing(canvasElement);
    },
};

/**
 * No project open: the start screen (a stub until the Start screen package lands).
 *
 * A regression story: the same picture as Start screen / First run, which readers see instead.
 */
export const StartScreen: Story = { tags: ["regression", "!dev", "!autodocs"] };

/**
 * A new project, nothing loaded: every region.
 *
 * A regression story: the same picture as Graph place / Empty, which readers see instead.
 */
export const EmptyProject: Story = { tags: ["regression", "!dev", "!autodocs"], args: { initialState: OPEN } };
