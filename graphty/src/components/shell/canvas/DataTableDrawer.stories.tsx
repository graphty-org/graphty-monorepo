import { type DataTableColumn, PANEL_INK } from "@graphty/compact-mantine";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { DATA_DRAWER_DEFAULT_HEIGHT } from "../constants";
import { type CanvasSurface, type DataDrawerTab, DataTableDrawer, GraphTableSegment } from "./DataTableDrawer";

interface Row {
    id: string;
    degree: number;
    group: string;
}

const NODE_ROWS: Row[] = Array.from({ length: 12 }, (_, i) => ({
    id: `n${String(i)}`,
    degree: 2 + (i % 3),
    group: i < 6 ? "Ring A" : "Ring B",
}));

const EDGE_ROWS: Row[] = Array.from({ length: 12 }, (_, i) => ({
    id: `n${String(i)} - n${String(i < 6 ? (i + 1) % 6 : 6 + ((i + 1) % 6))}`,
    degree: 1,
    group: i < 6 ? "Ring A" : "Ring B",
}));

const COLUMNS: DataTableColumn<Row>[] = [
    { id: "id", header: "id", value: (row) => row.id },
    { id: "degree", header: "degree", value: (row) => row.degree, align: "end" },
    { id: "group", header: "group", value: (row) => row.group },
];

/** The canvas element's height in these stories. */
const CANVAS_HEIGHT = 600;

/**
 * A canvas-sized frame with the drawer docked at its foot and the Graph / Table control at
 * its top centre, holding the tab and the surface itself so a click on either changes what
 * the frame draws.
 * @param props - where the story starts.
 * @param props.tab - the half of the dataset showing first.
 * @param props.onTabChange - told of every tab change.
 * @returns the frame.
 */
function DrawerOnCanvas(props: { tab: DataDrawerTab; onTabChange: (tab: DataDrawerTab) => void }): React.JSX.Element {
    const [tab, setTab] = useState(props.tab);
    const [surface, setSurface] = useState<CanvasSurface>("graph");

    return (
        <div style={{ position: "relative", width: 960, height: CANVAS_HEIGHT, background: PANEL_INK.SURFACE }}>
            <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)" }}>
                <GraphTableSegment value={surface} onChange={setSurface} />
            </div>
            <DataTableDrawer
                open
                height={DATA_DRAWER_DEFAULT_HEIGHT}
                maximised={surface === "table"}
                canvasHeight={CANVAS_HEIGHT}
                tab={tab}
                onTabChange={(next) => {
                    setTab(next);
                    props.onTabChange(next);
                }}
                rows={tab === "nodes" ? NODE_ROWS : EDGE_ROWS}
                columns={COLUMNS}
                getRowId={(row) => row.id}
                showLabel="All rows"
                showCount="12"
                showTotal="of 12"
                onHeightChange={fn()}
                onClose={fn()}
            />
        </div>
    );
}

const meta: Meta<typeof DrawerOnCanvas> = {
    title: "Shell/Data table drawer",
    component: DrawerOnCanvas,
    args: { tab: "nodes", onTabChange: fn() },
};

export default meta;
type Story = StoryObj<typeof meta>;

/** Docked at its default height on Nodes, with Graph showing. */
export const Nodes: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByRole("radio", { name: "Nodes" })).toBeChecked();
        await expect(canvas.getByRole("radio", { name: "Graph" })).toBeChecked();
    },
};

/** Edges, chosen by clicking it on the drawer's Nodes / Edges control. */
export const Edges: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByText("Edges"));
        await expect(canvas.getByRole("radio", { name: "Edges" })).toBeChecked();
        await expect(args.onTabChange).toHaveBeenCalledWith("edges");
    },
};

/** Table, chosen by clicking it: the drawer takes the whole canvas height. */
export const Table: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByText("Table"));
        await expect(canvas.getByRole("radio", { name: "Table" })).toBeChecked();
        await expect(canvasElement.querySelector("[data-maximised='true']")).not.toBeNull();
    },
};
