import { ActionRow, AdvancedButton, FieldRow, PANEL_GRID, PanelField, ToggleRow } from "@graphty/compact-mantine";
import { Box, Button } from "@mantine/core";
import React from "react";

import { PanelOutlineButton } from "./panelButtons";
import { COMING_GROUP_SENTENCE, ComingTag, PanelSection } from "./PanelSection";

/** The image export's own gear (spec 03 section 2.5 item 1). */
const IMAGE_OPTIONS_LABEL = "Image options";

/** The data export's own gear (spec 03 section 2.5 item 2). */
const DATA_OPTIONS_LABEL = "Data options";

/**
 * The image formats. SVG and PDF have not shipped (5.8), and a select option
 * cannot carry a pill, so each keeps its NAME -- floor item 6 -- and prints the
 * register's own status word beside it.
 */
const IMAGE_FORMATS: readonly { readonly value: string; readonly label: string; readonly disabled?: boolean }[] = [
    { value: "png", label: "PNG" },
    { value: "jpeg", label: "JPEG" },
    { value: "webp", label: "WebP" },
    { value: "svg", label: "SVG (Coming)", disabled: true },
    { value: "pdf", label: "PDF (Coming)", disabled: true },
];

/** The one scope every graph can be exported at, and the default (spec 03 section 2.5). */
const DEFAULT_DATA_SCOPE = "whole-graph";

/** The data formats spec 03 section 2.5 item 2 lists. */
const DATA_FORMATS: readonly { readonly value: string; readonly label: string }[] = [
    { value: "json", label: "JSON" },
    { value: "csv", label: "CSV" },
    { value: "graphml", label: "GraphML" },
    { value: "gexf", label: "GEXF" },
    { value: "cx2", label: "CX2" },
];

/**
 * Items 4 to 8 of spec 03 section 2.5, in that order. Five contiguous rows share
 * the unshipped status, so 5.8's GROUP form applies: one tag on the group
 * header, one sentence behind its info circle, and the rows dimmed and disabled
 * rather than tagged one by one.
 */
const UNSHIPPED_REPORT_ROWS: readonly string[] = [
    "Report sections",
    "Generate report",
    "Export evidence bundle",
    "Export recipe (JSON)",
    "Export selection...",
];

/**
 * Props of the Present panel body.
 */
export interface PresentPanelProps {
    /** The chosen image format. */
    readonly imageFormat?: string;
    /** Image format change. */
    readonly onImageFormatChange?: (format: string) => void;
    /**
     * What the image export will cover, in words. Spec 03 section 2.5 fixes it
     * at the current view, and floor item 4 keeps it on screen.
     */
    readonly imageScopeLabel?: string;
    /** The image's estimated size, e.g. "1664 x 1672, about 420 KB". */
    readonly imageEstimate?: string;
    /** Copies the image to the clipboard. */
    readonly onCopyImage?: () => void;
    /** Exports the image. */
    readonly onExportImage?: () => void;
    /** Opens the 280 Image options pop-over. */
    readonly onOpenImageOptions?: () => void;
    /** The chosen data format. */
    readonly dataFormat?: string;
    /** Data format change. */
    readonly onDataFormatChange?: (format: string) => void;
    /**
     * The export scope. 6.10a keeps this select resident however rarely it is
     * touched: a wrong scope is invisible until the file is opened.
     */
    readonly dataScope?: string;
    /** The scopes on offer, e.g. Whole graph, Visible (N), Selection (N). */
    readonly dataScopeOptions?: readonly { readonly value: string; readonly label: string }[];
    /** Data scope change. */
    readonly onDataScopeChange?: (scope: string) => void;
    /** Whether notes travel with the export. */
    readonly includeNotes?: boolean;
    /** Include notes change. */
    readonly onIncludeNotesChange?: (include: boolean) => void;
    /** The estimated size of the data export, e.g. "about 6 KB" (floor item 4). */
    readonly dataEstimate?: string;
    /** Copies the node ids of the current scope. */
    readonly onCopyNodeIds?: () => void;
    /** Exports the data. */
    readonly onExportData?: () => void;
    /** Opens the 280 Data options pop-over. */
    readonly onOpenDataOptions?: () => void;
}

/**
 * The Present panel body, in the order spec 03 section 2.5 freezes: Export
 * image, Export data with `Copy node ids` beside it, and then the five report
 * and bundle rows that have not shipped.
 *
 * Every estimate is resident: floor item 4 puts the cost of a control beside
 * the control, and a door may not separate them.
 * @param props - the Present panel's props.
 * @returns the Present panel body.
 */
export function PresentPanel(props: PresentPanelProps): React.JSX.Element {
    const {
        imageFormat = "png",
        onImageFormatChange,
        imageScopeLabel = "Current view",
        imageEstimate,
        onCopyImage,
        onExportImage,
        onOpenImageOptions,
        dataFormat = "json",
        onDataFormatChange,
        dataScope = DEFAULT_DATA_SCOPE,
        dataScopeOptions = [{ value: DEFAULT_DATA_SCOPE, label: "Whole graph" }],
        onDataScopeChange,
        includeNotes = false,
        onIncludeNotesChange,
        dataEstimate,
        onCopyNodeIds,
        onExportData,
        onOpenDataOptions,
    } = props;

    return (
        <>
            <PanelSection
                sectionId="present.image"
                label="Export image"
                defaultOpen
                actions={
                    <AdvancedButton
                        label={IMAGE_OPTIONS_LABEL}
                        title={IMAGE_OPTIONS_LABEL}
                        onClick={onOpenImageOptions}
                    />
                }
            >
                <FieldRow groupLabel="Image export">
                    <PanelField
                        label="Image format"
                        kind="select"
                        value={imageFormat}
                        data={IMAGE_FORMATS.map((format) => ({ ...format }))}
                        onChange={(value) => {
                            onImageFormatChange?.(String(value));
                        }}
                    />
                    <PanelField label="Image scope" kind="text" readOnly value={imageScopeLabel} />
                </FieldRow>

                {imageEstimate !== undefined && <ActionRow state={imageEstimate} />}

                <Box
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: PANEL_GRID.TRIPLE_GAP,
                        height: PANEL_GRID.ROW_PITCH,
                    }}
                >
                    <PanelOutlineButton onClick={onCopyImage}>Copy to clipboard</PanelOutlineButton>
                    <Button
                        variant="filled"
                        h={PANEL_GRID.CONTROL_HEIGHT}
                        px={PANEL_GRID.TRAIL_GAP}
                        radius="sm"
                        onClick={onExportImage}
                    >
                        Export image
                    </Button>
                </Box>
            </PanelSection>

            <PanelSection
                sectionId="present.data"
                label="Export data"
                actions={
                    <>
                        <ComingTag />
                        <AdvancedButton
                            label={DATA_OPTIONS_LABEL}
                            title={DATA_OPTIONS_LABEL}
                            onClick={onOpenDataOptions}
                        />
                    </>
                }
            >
                <FieldRow groupLabel="Data export">
                    <PanelField
                        label="Data format"
                        kind="select"
                        value={dataFormat}
                        data={DATA_FORMATS.map((format) => ({ ...format }))}
                        onChange={(value) => {
                            onDataFormatChange?.(String(value));
                        }}
                    />
                    {/*
                        6.10a, the resident-though-rare class: the export Scope
                        select stays resident however rarely it is touched.
                    */}
                    <PanelField
                        label="Scope"
                        kind="select"
                        value={dataScope}
                        data={dataScopeOptions.map((option) => ({ ...option }))}
                        onChange={(value) => {
                            onDataScopeChange?.(String(value));
                        }}
                    />
                </FieldRow>

                <ToggleRow
                    label="Include notes"
                    control="checkbox"
                    checked={includeNotes}
                    onChange={(checked) => {
                        onIncludeNotesChange?.(checked);
                    }}
                />

                {dataEstimate !== undefined && <ActionRow state={dataEstimate} />}

                <Box
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: PANEL_GRID.TRIPLE_GAP,
                        height: PANEL_GRID.ROW_PITCH,
                    }}
                >
                    <PanelOutlineButton onClick={onCopyNodeIds}>Copy node ids</PanelOutlineButton>
                    <Button
                        variant="filled"
                        h={PANEL_GRID.CONTROL_HEIGHT}
                        px={PANEL_GRID.TRAIL_GAP}
                        radius="sm"
                        onClick={onExportData}
                    >
                        Export data
                    </Button>
                </Box>
            </PanelSection>

            <PanelSection
                sectionId="present.reports"
                label="Reports"
                info={COMING_GROUP_SENTENCE}
                actions={<ComingTag />}
            >
                {/*
                    5.8's group form is two halves: the tag rises once to the header,
                    AND the rows it covers are "dimmed and disabled instead of tagged
                    individually". Only the first half was applied here, so five
                    unshipped rows were drawn at the ordinary muted ink -- which is a
                    different token from the unshipped one -- and answered a pointer
                    like any other row.
                */}
                {UNSHIPPED_REPORT_ROWS.map((row) => (
                    <ActionRow key={row} state={row} disabled />
                ))}
            </PanelSection>
        </>
    );
}
