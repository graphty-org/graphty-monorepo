import type { Meta, StoryObj } from "@storybook/react-vite";
import React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { storyWaitOptions } from "../../../stories/wait";
import type { GraphtyHandle } from "../../Graphty";
import { ShellProvider } from "../ShellContext";
import { ActivityPanel } from "./ActivityPanel";
import { AnalyzePanel, type AnalyzePanelProps, type AnalyzeResultCard } from "./AnalyzePanel";

/** Three finished runs: one whose encoding was applied, two without a layer. */
const RESULTS: readonly AnalyzeResultCard[] = [
    {
        id: "groups-1",
        title: "Groups",
        headline: "6 groups, modularity 0.447",
        stateSwatch: "#4c6ef5",
        layerName: "Groups colour",
    },
    { id: "degree-1", title: "Most connected", headline: "Most connected: 34 (17)" },
    { id: "bridges-1", title: "Bridges", headline: "Main bridge: 1 (231.07)" },
];

/**
 * The Analyze panel in its docked panel chrome, which is where its Cards / List toggle is
 * drawn. Nothing is remembered between stories.
 * @param props - the panel's props.
 * @returns the docked panel.
 */
function DockedAnalyzePanel(props: Partial<AnalyzePanelProps>): React.JSX.Element {
    const graphtyRef = React.useRef<GraphtyHandle>(null);

    return (
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <div style={{ display: "flex", height: 760 }}>
                <ActivityPanel activity="analyze" width={280} presentation="docked" title="Analyze">
                    <AnalyzePanel graphtyRef={graphtyRef} persist={false} {...props} />
                </ActivityPanel>
            </div>
        </ShellProvider>
    );
}

const meta: Meta<typeof DockedAnalyzePanel> = {
    title: "Components/Old shell/Analyze panel",
    // The old title's component id, so every story id (and its approved image) stays the same.
    id: "shell-analyze-panel",
    tags: ["regression", "!dev", "!autodocs"],
    component: DockedAnalyzePanel,
};

export default meta;
type Story = StoryObj<typeof meta>;

/** The Run tab with no results yet: the Results tab is disabled, its reason in its title. */
export const RunNoResults: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole("tab", { name: "Run" })).toHaveAttribute("aria-selected", "true");
        await expect(canvas.getByRole("tab", { name: "Results" })).toBeDisabled();
        await expect(canvas.getByRole("tab", { name: "Results" })).toHaveAttribute("title", "No results yet");
    },
};

/** The Run tab with three results waiting under Results. */
export const RunWithResults: Story = {
    args: { results: RESULTS },
};

/** The Results tab, chosen by clicking it. */
export const Results: Story = {
    args: { results: RESULTS },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("tab", { name: "Results (3)" }));
        await expect(canvas.getByRole("tab", { name: "Results (3)" })).toHaveAttribute("aria-selected", "true");
        await expect(canvas.getByRole("list", { name: "Results" })).toBeVisible();
    },
};

/** The Results tab reached from Run with the Right arrow: the focus ring is on the tab. */
export const ResultsByKeyboard: Story = {
    args: { results: RESULTS },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("tab", { name: "Run" }));
        await userEvent.keyboard("{ArrowRight}");
        const results = canvas.getByRole("tab", { name: "Results (3)" });
        await expect(results).toHaveFocus();
        await expect(results).toHaveAttribute("aria-selected", "true");
    },
};

/** The results as a List, chosen on the title row's Cards / List toggle. */
export const ResultsAsList: Story = {
    args: { results: RESULTS },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("tab", { name: "Results (3)" }));
        const list = canvas.getByRole("radio", { name: "List" });
        const label = canvasElement.querySelector(`label[for="${list.id}"]`) ?? list;
        await userEvent.click(label);
        await expect(list).toBeChecked();
        // The toggle's tooltip opened under the pointer; move away so it is not drawn.
        await userEvent.unhover(label);
        await waitFor(async () => {
            await expect(within(document.body).queryByRole("tooltip")).toBeNull();
        }, storyWaitOptions(1000));
    },
};
