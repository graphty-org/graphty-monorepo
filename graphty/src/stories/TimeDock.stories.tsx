// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import type { Meta, StoryContext, StoryObj } from "@storybook/react";
import { expect, waitFor, within } from "storybook/test";

import { loadSiteConfig, resetSiteConfig } from "../siteConfig";
import { siteFeatures } from "../test/siteFeatures";
import { openTimeCard } from "../workspace/data-place/filterCards";
import type { WorkspaceState } from "../workspace/state/store";
import { Workspace } from "../workspace/Workspace";
import { freshStore, storeOf } from "./freshStore";
import { wheelOver } from "./real-input";

type GraphtyElement = HTMLElementTagNameMap["graphty-element"];

/** Enough simulation steps for the samples' seeded force layout to settle before it is drawn. */
const PRE_STEPS = 1000;
/** The office email sample: 48 people, 2,102 emails, each edge with its `sent` time in 2025. */
const OFFICE_EMAIL = `${import.meta.env.BASE_URL}samples/office-email.json`;
/** The paper citations sample: 159 papers, each with its `year`, 1995 to 2024. */
const PAPERS = `${import.meta.env.BASE_URL}samples/paper-citations.json`;
/** Four emails, the last with no time. */
const BLANK_TIMES = "source,target,sent\nA,B,2025-01-06\nB,C,2025-01-13\nC,D,2025-01-20\nD,A,\n";
/** The product launch week in the office email sample. */
const LAUNCH_WEEK = { from: Date.UTC(2025, 2, 10), to: Date.UTC(2025, 2, 17) };
/** A play that never takes its first step: Pause is drawn and the window holds still. */
const NEVER = 2_000_000_000;

/** The workspace on the graph, with the timeline dock open once a field is set. */
const ON_GRAPH: Partial<WorkspaceState> = {
    project: { name: "Office email", id: 1 },
    place: "graph",
    timelineOpen: true,
};

/**
 * The story's element, once its session is up.
 * @param canvasElement - the story's root.
 * @returns the element.
 */
async function elementOf(canvasElement: HTMLElement): Promise<GraphtyElement> {
    await customElements.whenDefined("graphty-element");
    return waitFor(() => {
        const element = canvasElement.querySelector("graphty-element");
        if (element === null) {
            throw new Error("the story rendered no <graphty-element>");
        }
        return element;
    });
}

/**
 * Loads a sample into the story's element, laid out before its first frame, and designates its time.
 * @param canvasElement - the story's root.
 * @param load - the import and the field it designates.
 * @param load.url - the sample, else `csv`.
 * @param load.csv - CSV text in place of a sample.
 * @param load.field - what `time.setField` takes.
 * @returns the element and its session.
 */
async function timed(
    canvasElement: HTMLElement,
    load: { url?: string; csv?: string; field: Parameters<GraphSession["time"]["setField"]>[0] },
): Promise<{ element: GraphtyElement; session: GraphSession }> {
    const element = await elementOf(canvasElement);
    const { session } = element;
    await session.config.set({ layoutBehavior: { preSteps: PRE_STEPS } });
    await (load.csv === undefined
        ? session.data.import({ config: { url: load.url ?? OFFICE_EMAIL }, name: "Sample" })
        : session.data.import({ type: "csv", config: { data: load.csv } }));
    await session.time.setField(load.field);
    await session.time.ready;
    return { element, session };
}

/**
 * The office email sample, timed by when each email was sent.
 * @param canvasElement - the story's root.
 * @returns the element and its session.
 */
function officeEmail(canvasElement: HTMLElement): Promise<{ element: GraphtyElement; session: GraphSession }> {
    return timed(canvasElement, { field: { edges: { start: "sent" } } });
}

/**
 * Waits for the dock to show and the drawing to settle, so the picture is the state just set.
 * @param canvasElement - the story's root.
 * @param element - the element.
 * @returns queries inside the dock.
 */
async function settled(canvasElement: HTMLElement, element: GraphtyElement): Promise<ReturnType<typeof within>> {
    const dock = within(await within(canvasElement).findByRole("region", { name: "Timeline" }));
    await element.waitForStableFrame();
    return dock;
}

// No story here for the touch dock at 820px wide, the phone row or the phone sheet open: the visual
// capture renders every story at one 1200 x 900 viewport with a fine pointer. The phone dock switches
// on the top window's `matchMedia(PHONE_WIDTH)`, the touch rules on `(pointer: coarse)`, and the
// sheet's Drawer portals into the top document's body, so a narrower frame inside a story reaches
// none of them. They need a capture viewport per story first: graphty-org/graphty-monorepo#6018.
const meta: Meta<typeof Workspace> = {
    title: "Workspace/Time dock",
    component: Workspace,
    parameters: { layout: "fullscreen" },
    // The timeline is an experiment: these stories switch it on, as a site's site.json does, and
    // put the page's own configuration back afterwards.
    beforeEach: async () => {
        await siteFeatures(["timeline"]);
        return async () => {
            resetSiteConfig();
            await loadSiteConfig();
        };
    },
    ...freshStore(ON_GRAPH),
};

export default meta;
type Story = StoryObj<typeof meta>;

/** A time field set and no window: the readout names the whole span, every bar lit. */
export const NoWindow: Story = {
    play: async ({ canvasElement }) => {
        const { element } = await officeEmail(canvasElement);
        const dock = await settled(canvasElement, element);
        await expect(dock.getByRole("button", { name: "Play" })).toBeVisible();
    },
};

/** A week's window: the brush over it, the bars outside dimmed, Show all time at the end. */
export const Window: Story = {
    play: async ({ canvasElement }) => {
        const { element, session } = await officeEmail(canvasElement);
        await session.time.window(LAUNCH_WEEK);
        const dock = await settled(canvasElement, element);
        await expect(await dock.findByRole("button", { name: "Show all time" })).toBeVisible();
    },
};

/** The window at the start of the data: Step back is off. */
export const AtStart: Story = {
    play: async ({ canvasElement }) => {
        const { element, session } = await officeEmail(canvasElement);
        await session.time.window({ from: Date.UTC(2025, 0, 1), to: Date.UTC(2025, 0, 8) });
        const dock = await settled(canvasElement, element);
        await expect(session.time.atStart).toBe(true);
        await waitFor(() => expect(dock.getByRole("button", { name: "Step back" })).toBeDisabled());
    },
};

/** The window at the end of the data: Step forward is off. */
export const AtEnd: Story = {
    play: async ({ canvasElement }) => {
        const { element, session } = await officeEmail(canvasElement);
        await session.time.window({ from: Date.UTC(2025, 5, 24), to: Date.UTC(2025, 6, 1) });
        const dock = await settled(canvasElement, element);
        await expect(session.time.atEnd).toBe(true);
        await waitFor(() => expect(dock.getByRole("button", { name: "Step forward" })).toBeDisabled());
    },
};

/**
 * Playing: Pause is drawn and lit. The play steps a whole step at a time with a step that never
 * comes, so the picture holds still.
 */
export const Playing: Story = {
    play: async ({ canvasElement }) => {
        const { element, session } = await officeEmail(canvasElement);
        await session.time.window({ ...LAUNCH_WEEK, step: "week" });
        // Bound first: storybook's lint reads any `x.play(...)` as a call to another story's play.
        const startPlaying = session.time.play.bind(session.time);
        startPlaying({ motion: "steps", interval: NEVER });
        const dock = await settled(canvasElement, element);
        await expect(await dock.findByRole("button", { name: "Pause" })).toBeVisible();
    },
};

/** A person selected: their emails over time as a line over the bars, and Jump to selection. */
export const SelectionLine: Story = {
    play: async ({ canvasElement }) => {
        const { element, session } = await officeEmail(canvasElement);
        await session.selection.apply({ nodes: ["p01"] });
        const dock = await settled(canvasElement, element);
        await expect(await dock.findByRole("button", { name: "Jump to selection" })).toBeVisible();
    },
};

/** A filter on: the bars count what it keeps, over ghosts of what it hides. */
export const FilterOn: Story = {
    play: async ({ canvasElement }) => {
        const { element, session } = await officeEmail(canvasElement);
        await session.visibility.addCondition({
            effect: "keep",
            rule: { kind: "text", reads: "data.team", mode: "substring", text: "Engineering" },
        });
        await settled(canvasElement, element);
        await expect(session.visibility.summary.visibleEdges).toBeLessThan(2102);
    },
};

/** The axis zoomed by the wheel over the bars, with Show whole timeline to go back. */
export const Zoomed: Story = {
    play: async ({ canvasElement, parameters }) => {
        const { element, session } = await officeEmail(canvasElement);
        await session.time.window(LAUNCH_WEEK);
        const dock = await settled(canvasElement, element);
        await wheelOver(parameters, dock.getByTestId("histogram-plot"), -300);
        await expect(await dock.findByRole("button", { name: "Show whole timeline" })).toBeVisible();
    },
};

/** A field of years: the readout and the axis in whole years. */
export const YearUnit: Story = {
    play: async ({ canvasElement }) => {
        const { element } = await timed(canvasElement, {
            url: PAPERS,
            field: { nodes: { start: "year", unit: "year" } },
        });
        await settled(canvasElement, element);
    },
};

/** The same years read as plain numbers. */
export const OrdinalUnit: Story = {
    play: async ({ canvasElement }) => {
        const { element } = await timed(canvasElement, {
            url: PAPERS,
            field: { nodes: { start: "year", unit: "ordinal" } },
        });
        await settled(canvasElement, element);
    },
};

/**
 * Opens the Time card in the inspector, beside the dock.
 * @param context - the story's play context.
 */
async function timeCardOpen(context: Pick<StoryContext, "canvasElement" | "loaded">): Promise<void> {
    openTimeCard(storeOf(context));
    await within(context.canvasElement).findByTestId("time-card");
}

/** A file with an email that has no time: the Time card's Untimed control. */
export const UntimedControl: Story = {
    play: async (context) => {
        const { element, session } = await timed(context.canvasElement, {
            csv: BLANK_TIMES,
            field: { edges: { start: "sent" } },
        });
        await session.time.window({ from: Date.UTC(2025, 0, 6), to: Date.UTC(2025, 0, 13) });
        await timeCardOpen(context);
        await expect(await within(context.canvasElement).findByRole("radiogroup", { name: "Untimed" })).toBeVisible();
        await settled(context.canvasElement, element);
    },
};

/** Outside: Ghost: what the window leaves out is drawn faint rather than hidden. */
export const OutsideGhost: Story = {
    play: async (context) => {
        const { element, session } = await officeEmail(context.canvasElement);
        await session.time.window(LAUNCH_WEEK);
        await session.time.setSettings({ outside: "ghost" });
        await timeCardOpen(context);
        await settled(context.canvasElement, element);
        await expect(session.time.settings.outside).toBe("ghost");
    },
};
