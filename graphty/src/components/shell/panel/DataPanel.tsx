import {
    ActionRow,
    AdvancedButton,
    CompoundRow,
    type CompoundSegment,
    DataRow,
    PANEL_GRID,
    PANEL_INK,
} from "@graphty/compact-mantine";
import { Box, Button, Switch } from "@mantine/core";
import React, { useState } from "react";

import { LoadDataModal, type LoadDataRequest } from "../../LoadDataModal";
import { keyChipFor } from "../bindings";
import type { ShellStateAxis } from "../types";
import { PanelQuietButton } from "./panelButtons";
import { ComingTag, PanelSection } from "./PanelSection";

/**
 * What the drop zone reads, behind the section's info circle.
 *
 * The sentence is the artboards' own (TableJoin.dc.html:263); the dashed border
 * IS the drop target, so the sentence that used to restate it was deleted by
 * Rule 8 and what is left is the list of formats, which is not on any row.
 */
const ACCEPTED_FORMATS =
    "Reads JSON, CSV or TSV, GraphML, GEXF, GML, DOT, Pajek, SIF and CX2. Drop a file anywhere on this panel.";

/** The Open file section's name in the Empty state (spec 03 section 2.1). */
const OPEN_FILE_LABEL = "Open file";

/** The same section's name once data is loaded (spec 03 section 2.1 item 1). */
const ADD_DATA_LABEL = "Add data";

/** The drop zone's tooltip, kept from the artboard (DataPanelLoaded.dc.html:262). */
const DROP_ZONE_TITLE = "Drop a file here";

/**
 * The three verbs 6.8's never list keeps in words: they are on the list by
 * name, so no density turns any of them into a glyph.
 */
const OPEN_FROM_URL_LABEL = "Open from URL";

/**
 * The third open verb, drawn short. Only the Loaded panel shortens it
 * (DataPanelLoaded.dc.html:264 draws `Paste` with `title="Paste data"`), because by
 * then the row has a fourth verb to fit beside.
 */
const PASTE_LABEL = "Paste";

/**
 * The paste verb's full name, from 6.8's never list ("these keep their text however
 * often they repeat: ... Open File, Open from URL, Paste data"). It is what the Empty
 * state draws, which is the state this button first appears in
 * (Welcome.dc.html:222 draws the full `Paste data`).
 */
const PASTE_TITLE = "Paste data";

/** The unshipped recipe runner (5.8: recipes are new work, app). */
const RUN_A_RECIPE_LABEL = "Run a recipe...";

/** The unshipped table join, with its 6.3 technical half in its tooltip. */
const TABLE_JOIN_LABEL = "Add attributes from a table";

/** The table join's tooltip: the pair, then the 5.8 reason. */
const TABLE_JOIN_TITLE = "Add attributes from a table... (Table join). Coming";

/** The Data table section's name, with its technical half in its tooltip. */
const DATA_TABLE_LABEL = "Data table";

/**
 * The Data table section's tooltip: the 6.3 pair. This section is the one place the
 * artboard deliberately keeps the pair in the header's TITLE rather than drawing the
 * technical half beside the name (DataPanelLoaded.dc.html:443 puts it on the header
 * row, whose drawn name is `Data table` alone), so it stays a title here.
 */
const DATA_TABLE_TITLE = "Data table (Node and edge table)";

/**
 * The switch's own name. Spec 03 section 2.1 item 6 makes this control the path to the
 * Data table drawer, and in THIS build the drawer has shipped: `toggleDataDrawer` is a
 * shipped binding, the status bar's counts slot opens the drawer, and the command
 * palette carries a row for it. So the switch acts, and neither it nor its tooltip
 * carries 5.8's `Coming` any more -- a tag beside a working control, on a row whose
 * tooltip also prints the Shift+T chip, is the shell contradicting itself twice.
 */
const SHOW_DATA_TABLE_LABEL = "Show data table";

/** What the RT-2 compound is the name of: one thing, in three values. */
const LOADED_SUMMARY_LABEL = "What the file is";

/** The gear on the Loaded data header (DataPanelLoaded.dc.html:280). */
const IMPORT_OPTIONS_LABEL = "Import options";

/**
 * The compound's segments, in the artboard's own order: format, size, direction. A
 * value the application has not got is dropped rather than faked -- a pasted graph has
 * no file size -- because a compound of two values is still one thing and an invented
 * number is not.
 * @param summary - what the loaded file is.
 * @returns the segments, format first.
 */
function loadedSummarySegments(summary: LoadedDataSummary): CompoundSegment[] {
    const segments: CompoundSegment[] = [{ value: summary.format, grow: true }];

    if (summary.size !== undefined) {
        segments.push({ value: summary.size });
    }

    if (summary.direction !== undefined) {
        segments.push({ value: summary.direction });
    }

    return segments;
}

/**
 * The text of a control's tooltip: the verb, then the key chip when the action
 * has shipped, then any reason it cannot act.
 * @param text - the verb, in the register's own words.
 * @param chip - the chip, or null when the action has no chord or has not shipped.
 * @param reason - the reason the control cannot act, or undefined when it can.
 * @returns the tooltip text.
 */
function withChip(text: string, chip: string | null, reason?: string): string {
    const head = chip === null ? text : `${text} (${chip})`;

    return reason === undefined ? head : `${head}. ${reason}`;
}

/**
 * One sample dataset offered in the Data panel.
 *
 * Built by the caller and handed in through {@link DataPanelProps.samples}.
 * @public
 */
export interface DataSample {
    /** Stable id. */
    readonly id: string;
    /** The dataset's own name -- the user's data, floor item 7. */
    readonly name: string;
    /** Its tags, e.g. Directed, Timed, Types, Weighted. */
    readonly tags?: readonly string[];
    /** Who it came from, credited beside it. */
    readonly source?: string;
    /** Loads it. */
    readonly onOpen: () => void;
}

/**
 * One recently opened file.
 *
 * Built by the caller and handed in through {@link DataPanelProps.recentFiles}.
 * @public
 */
export interface RecentFile {
    /** Stable id. */
    readonly id: string;
    /** The file's own name -- the user's data, floor item 7. */
    readonly name: string;
    /** When it was last opened, in relative words. */
    readonly openedAt?: string;
    /** Re-opens it. */
    readonly onOpen: () => void;
}

/**
 * What the loaded file IS: its format, its size and its direction, which spec 01
 * section 8 leaves to this section and which the artboard draws as ONE RT-2 compound
 * row, "because format, size and direction are one thing -- what the file is"
 * (DataPanelLoaded.dc.html:295).
 *
 * The node and edge counts are NOT here: the status bar owns them, and spec 01 section
 * 8 names "the Loaded data header" as a place they are not repeated.
 */
export interface LoadedDataSummary {
    /** The format in words, e.g. "JSON node-link". */
    readonly format: string;
    /** The file's size, e.g. "84 KB". Absent where the shell never saw a file. */
    readonly size?: string;
    /**
     * "directed" or "undirected". Absent until something has MEASURED it: the
     * compound draws the values it is given and none that it is not, because a
     * direction nobody read off the data is a guess the legend and every algorithm
     * would inherit.
     */
    readonly direction?: string;
    /** The compound's full reading, e.g. "JSON node-link, 84 KB, directed". */
    readonly title?: string;
}

/**
 * One fact about the loaded data, drawn as an RT-6 row.
 *
 * Built by the caller and handed in through {@link DataPanelProps.loadedFacts}.
 * @public
 */
export interface LoadedDataFact {
    /** Stable id. */
    readonly id: string;
    /** What the fact is called. */
    readonly name: string;
    /** What it reads. */
    readonly value: string;
    /** The complete reading, where the drawing is shorter than the meaning. */
    readonly title?: string;
}

/**
 * Props of the Data panel body.
 * @public
 */
export interface DataPanelProps {
    /** The 6.1 state axis. The Loaded sections render from "loaded" on. */
    readonly stateAxis: ShellStateAxis;
    /** Loads data, from the re-homed Load data dialog. */
    readonly onLoad: (request: LoadDataRequest) => void;
    /** The sample datasets on offer. */
    readonly samples?: readonly DataSample[];
    /** The recently opened files. */
    readonly recentFiles?: readonly RecentFile[];
    /**
     * What the loaded file is: format, size and direction, as one RT-2 compound.
     */
    readonly loadedSummary?: LoadedDataSummary;
    /**
     * The remaining Loaded data rows -- the joined files and the applied import
     * policies, which are the user's own strings (RT-6). The node and edge counts are
     * not among them: the status bar owns that fact (spec 01 section 8).
     */
    readonly loadedFacts?: readonly LoadedDataFact[];
    /** Opens the Import options dialog from the Loaded data gear. */
    readonly onOpenImportOptions?: () => void;
    /** Whether an import option has been moved off its default (6.11's stub ink). */
    readonly importOptionsChanged?: boolean;
    /** Whether the data table drawer is open. */
    readonly dataTableOpen?: boolean;
    /** Opens or closes the data table drawer. */
    readonly onDataTableOpenChange?: (open: boolean) => void;
}

/**
 * The Data panel body, in the order spec 03 section 2.1 freezes: Open file, its
 * secondary verbs, Sample datasets, Recent files, then -- from the Loaded state
 * on -- Loaded data and the Data table row.
 *
 * `Close dataset` is not here: rev 1.8 moved it to the panel header's overflow,
 * which the shell supplies through `ActivityPanelProps.overflowItems`.
 *
 * The three open verbs are the re-homed `LoadDataModal`: the dialog is the
 * commit the canvas must wait on (tier 3b), and this panel is its door.
 * @param props - the Data panel's props.
 * @returns the Data panel body.
 */
export function DataPanel(props: DataPanelProps): React.JSX.Element {
    const {
        stateAxis,
        onLoad,
        samples = [],
        recentFiles = [],
        loadedSummary,
        loadedFacts = [],
        onOpenImportOptions,
        importOptionsChanged = false,
        dataTableOpen = false,
        onDataTableOpenChange,
    } = props;

    const [loadOpen, setLoadOpen] = useState(false);
    const loaded = stateAxis !== "empty" && stateAxis !== "loading";
    const dataTableTooltip = withChip(SHOW_DATA_TABLE_LABEL, keyChipFor("toggleDataDrawer"));

    const openLoadDialog = (): void => {
        setLoadOpen(true);
    };

    const closeLoadDialog = (): void => {
        setLoadOpen(false);
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();

        const { files } = event.dataTransfer;

        if (files.length === 0) {
            return;
        }

        const [file] = files;

        onLoad({ inputMethod: "file", format: "auto", file, replaceExisting: !loaded });
    };

    return (
        <>
            <PanelSection
                sectionId="data.open"
                label={loaded ? ADD_DATA_LABEL : OPEN_FILE_LABEL}
                defaultOpen
                info={ACCEPTED_FORMATS}
            >
                {/*
                    RT-7. The dashed border is the drop target, so the row IS
                    the drop zone and the sentence that said so is deleted.
                */}
                <Box
                    title={DROP_ZONE_TITLE}
                    data-testid="data-drop-zone"
                    onDragOver={(event) => {
                        event.preventDefault();
                    }}
                    onDrop={handleDrop}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: PANEL_GRID.TRIPLE_GAP,
                        height: PANEL_GRID.ROW_PITCH,
                        paddingInline: PANEL_GRID.TRIPLE_GAP,
                        border: `1px dashed ${PANEL_INK.BORDER}`,
                        borderRadius: "var(--mantine-radius-sm)",
                        boxSizing: "border-box",
                    }}
                >
                    <Button
                        variant="filled"
                        h={PANEL_GRID.CONTROL_HEIGHT}
                        px={PANEL_GRID.TRAIL_GAP}
                        radius="sm"
                        onClick={openLoadDialog}
                    >
                        {OPEN_FILE_LABEL}
                    </Button>
                    <PanelQuietButton onClick={openLoadDialog}>{OPEN_FROM_URL_LABEL}</PanelQuietButton>
                    <PanelQuietButton title={PASTE_TITLE} aria-label={PASTE_TITLE} onClick={openLoadDialog}>
                        {loaded ? PASTE_LABEL : PASTE_TITLE}
                    </PanelQuietButton>
                </Box>

                {/* An isolated unshipped row keeps its own tag (5.8). */}
                <ActionRow state={RUN_A_RECIPE_LABEL} residentActions={<ComingTag />} />

                {loaded && (
                    <Box title={TABLE_JOIN_TITLE} data-testid="data-table-join">
                        <ActionRow state={TABLE_JOIN_LABEL} residentActions={<ComingTag />} />
                    </Box>
                )}
            </PanelSection>

            <PanelSection sectionId="data.samples" label="Sample datasets" empty={samples.length === 0}>
                {samples.map((sample) => (
                    <Box key={sample.id} title={sample.source}>
                        <DataRow
                            name={sample.name}
                            value={sample.tags === undefined ? undefined : sample.tags.join(", ")}
                            onClick={() => {
                                sample.onOpen();
                            }}
                        />
                    </Box>
                ))}
            </PanelSection>

            <PanelSection sectionId="data.recent" label="Recent files" empty={recentFiles.length === 0}>
                {recentFiles.map((file) => (
                    <DataRow
                        key={file.id}
                        name={file.name}
                        value={file.openedAt}
                        onClick={() => {
                            file.onOpen();
                        }}
                    />
                ))}
            </PanelSection>

            {loaded && (
                <PanelSection
                    sectionId="data.loaded"
                    label="Loaded data"
                    defaultOpen
                    empty={loadedSummary === undefined && loadedFacts.length === 0}
                    actions={
                        <AdvancedButton
                            label={IMPORT_OPTIONS_LABEL}
                            title={IMPORT_OPTIONS_LABEL}
                            changed={importOptionsChanged}
                            onClick={onOpenImportOptions}
                        />
                    }
                >
                    {loadedSummary === undefined ? null : (
                        <CompoundRow
                            label={loadedSummary.title ?? LOADED_SUMMARY_LABEL}
                            segments={loadedSummarySegments(loadedSummary)}
                            width={PANEL_GRID.BODY}
                        />
                    )}

                    {loadedFacts.map((fact) => (
                        <Box key={fact.id} title={fact.title}>
                            <DataRow name={fact.name} value={fact.value} />
                        </Box>
                    ))}
                </PanelSection>
            )}

            {loaded && (
                <Box title={DATA_TABLE_TITLE} data-testid="data-table-section">
                    <PanelSection
                        sectionId="data.table"
                        label={DATA_TABLE_LABEL}
                        empty
                        actions={
                            <Box
                                title={dataTableTooltip}
                                data-testid="data-table-switch-reason"
                                style={{ display: "flex", alignItems: "center" }}
                            >
                                <Switch
                                    size="xs"
                                    checked={dataTableOpen}
                                    aria-label={SHOW_DATA_TABLE_LABEL}
                                    data-testid="data-table-switch"
                                    onChange={(event) => {
                                        onDataTableOpenChange?.(event.currentTarget.checked);
                                    }}
                                />
                            </Box>
                        }
                    />
                </Box>
            )}

            <LoadDataModal opened={loadOpen} onClose={closeLoadDialog} onLoad={onLoad} />
        </>
    );
}
