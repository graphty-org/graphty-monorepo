/**
 * Stories of the mock of the version 2 save and open dialogs (issue #8029): static data, no
 * graphty-element. They show the choices and reports the real dialogs will word once
 * graphty-element saves and opens version 2 files.
 */

import type { Meta, StoryObj } from "@storybook/react";

import { REPORT_EVERYTHING_HELD, REPORT_STYLE_ONLY } from "./mockData";
import {
    BindReportMock,
    ColumnMappingMock,
    OpenDialogMock,
    SaveDialogMock,
    SaveReportMock,
    StyleFilePreviewMock,
} from "./SaveV2Mock";

const meta: Meta = {
    title: "Save files v2 (mock)",
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** Save as..., every section chosen; the data sources embedded or referenced. */
export const SaveEverything: Story = { render: () => <SaveDialogMock preset="everything" /> };

/** Save as..., the Share without notes preset. */
export const SaveShareWithoutNotes: Story = { render: () => <SaveDialogMock preset="share" /> };

/** Save as..., the Style only preset: one section, written as a .graphty-style.json section file. */
export const SaveStyleOnly: Story = { render: () => <SaveDialogMock preset="style" /> };

/** Save as..., the Starting kit preset: style, recipe and settings, no data. */
export const SaveStartingKit: Story = { render: () => <SaveDialogMock preset="kit" /> };

/** Save as..., the Record preset: data, recipe, view and results. */
export const SaveRecord: Story = { render: () => <SaveDialogMock preset="record" /> };

/** The report after saving the style alone: the layers that pick nodes are left out. */
export const SaveReportStyleOnly: Story = {
    render: () => <SaveReportMock file="card-fraud-week-46.graphty-style.json" lines={REPORT_STYLE_ONLY} />,
};

/** The report after saving everything while a newer style section is held. */
export const SaveReportHeldSection: Story = {
    render: () => <SaveReportMock file="card-fraud-week-46.graphty.json" lines={REPORT_EVERYTHING_HELD} />,
};

/** Open a full file: the session restored, each run rerun or restored, data replace or add. */
export const OpenFullFile: Story = { render: () => <OpenDialogMock /> };

/** Open a full file whose style section is newer than this release: held, warned before editing. */
export const OpenHeldSection: Story = { render: () => <OpenDialogMock held={["style"]} /> };

/** A starting kit meets new data: expected column to open column, and what waits while unpaired. */
export const OpenColumnMapping: Story = { render: () => <ColumnMappingMock /> };

/** Notes, view and results meet the same data refreshed since the save: runs stale by copy id. */
export const OpenBindReportRefreshed: Story = { render: () => <BindReportMock /> };

/** Notes, view and results meet other data: bound by key only when the reader says so. */
export const OpenBindReportOtherData: Story = { render: () => <BindReportMock other /> };

/** Opening a .graphty-style.json goes straight to its apply preview. */
export const OpenStyleSectionFile: Story = { render: () => <StyleFilePreviewMock /> };
