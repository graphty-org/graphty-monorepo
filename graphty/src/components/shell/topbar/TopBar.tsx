/**
 * The shell's top bar (build spec 02 section 2).
 *
 * 40 px tall, `padding: 0 12px`, three slot groups 8 px apart. Left: the dataset
 * name, which this region OWNS and the Data panel therefore never repeats. Centre:
 * the Undo split button, Redo, and the command palette pill. Right: Export, Share, a
 * rule, the Compare toggle, the panel toggle and the inspector toggle.
 *
 * There is NO saved / unsaved indicator -- there is no project save in this pass --
 * and there is no hamburger menu (spec section 5.1 removes it): file actions live in
 * the Data panel, view toggles on the canvas toolbar, AI settings in Settings.
 *
 * The bar spans the FULL shell width, above the activity rail, and is the frame's first
 * row. Spec 02 section 1.1 put it to the right of the rail instead; the product owner
 * reversed that on 2026-09-12 and the amendment is recorded at design 5.1.
 *
 * The two region switches are a PAIR and are drawn as one: same box, same pressed and
 * active treatment, panel then inspector, left to right in the order the regions sit on
 * screen. The panel's switch was added on 2026-09-12 at the product owner's direction;
 * before it, the panel could be closed from its own header X and reopened only from the
 * rail, whose icons choose an activity rather than show or hide the column.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import { Button, Menu, Tooltip } from "@mantine/core";
import React, { useCallback, useRef, useState } from "react";

import { TOOLTIP_DELAY_MS, TOP_BAR_HEIGHT } from "../constants";
import { MenuCaret } from "../MenuCaret";
import type { TopBarProps } from "../types";
import { CommandPalettePill } from "./CommandPalettePill";
import { HistoryPopover } from "./HistoryPopover";
import { TopBarIconButton } from "./topBarControls";
import {
    DATASET_NAME_FONT_SIZE,
    DATASET_NAME_FONT_WEIGHT,
    EXPORT_TRIGGER_GAP,
    EXPORT_TRIGGER_HEIGHT,
    EXPORT_TRIGGER_PADDING_X,
    EXPORT_TRIGGER_RADIUS,
    RIGHT_GROUP_DIVIDER_HEIGHT,
    RIGHT_GROUP_DIVIDER_WIDTH,
    TOP_BAR_BORDER_WIDTH,
    TOP_BAR_CENTRE_GROUP_GAP,
    TOP_BAR_FONT_SIZE,
    TOP_BAR_GROUP_GAP,
    TOP_BAR_LABEL_FONT_WEIGHT,
    TOP_BAR_LINE_HEIGHT,
    TOP_BAR_PADDING_X,
    TOP_BAR_RIGHT_GROUP_GAP,
    TOP_BAR_SMALL_GLYPH_SIZE,
} from "./topBarGeometry";
import { TopBarGlyph } from "./topBarGlyphs";
import {
    compareTitle,
    EXPORT_LABEL,
    EXPORT_MENU_DATA,
    EXPORT_MENU_IMAGE,
    exportTitle,
    INSPECTOR_TOGGLE_VERB,
    inspectorToggleTitle,
    PANEL_TOGGLE_VERB,
    panelToggleTitle,
    redoAccessibleName,
    redoTitle,
    SHARE_MENU_COPY_IMAGE,
    SHARE_MENU_EXPORT_DATA,
    shareTitle,
} from "./topBarStrings";
import { UndoSplitButton } from "./UndoSplitButton";
import type { HistoryEntry, HistoryRow } from "./undoStore";

/**
 * What the top bar needs from the one history store to draw the History pop-out.
 *
 * It is a separate object because `TopBarProps` is the frozen shell-wide contract and
 * carries only the three callbacks: the store itself is application state the
 * integration agent owns. With it absent the pop-out still opens and reads
 * "0 entries, 0 undone", which is honest rather than silent.
 *
 * Handed in through {@link TopBarOwnProps.history}: the store is the integration's, so its
 * shape is named here.
 * @public
 */
export interface TopBarHistory {
    /** The rows, newest first, from `historyRows`. */
    readonly rows: readonly HistoryRow[];
    /** How many entries the store holds. */
    readonly entryCount: number;
    /** How many of them have been undone. */
    readonly undoneCount: number;
    /** A row click restores that point. */
    readonly onRestore: (entry: HistoryEntry) => void;
    /** A title click opens the panel that owns the step. */
    readonly onOpenOwningPanel: (entry: HistoryEntry) => void;
    /** A row hover previews that point on the canvas, faintly. */
    readonly onPreview?: (entry: HistoryEntry | null) => void;
}

/**
 * Props of the top bar region.
 */
export interface TopBarOwnProps extends TopBarProps {
    /** The one history store, as the History pop-out reads it. */
    readonly history?: TopBarHistory;
}

const EMPTY_HISTORY: TopBarHistory = {
    rows: [],
    entryCount: 0,
    undoneCount: 0,
    onRestore: () => undefined,
    onOpenOwningPanel: () => undefined,
};

/**
 * The top bar.
 * @param props - the bar's props.
 * @returns the bar.
 */
export function TopBar(props: TopBarOwnProps): React.JSX.Element {
    const {
        canRedo,
        canUndo,
        compareActive,
        dataLoaded,
        datasetName,
        history = EMPTY_HISTORY,
        inspectorOpen,
        onExport,
        onOpenCommandPalette,
        onOpenHistory,
        onRedo,
        onShare,
        onToggleCompare,
        onToggleInspector,
        onTogglePanel,
        onUndo,
        panelOpen,
    } = props;

    const barRef = useRef<HTMLElement>(null);
    const splitButtonRef = useRef<HTMLDivElement>(null);
    const caretRef = useRef<HTMLButtonElement>(null);

    const [historyOpen, setHistoryOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [shareOpen, setShareOpen] = useState(false);

    // All three of History's routes -- the caret half, a right-click and a long-press
    // on the main half -- land here, and the caret is what closes it again.
    const toggleHistory = useCallback(() => {
        const next = !historyOpen;

        setHistoryOpen(next);

        if (next) {
            onOpenHistory();
        }
    }, [historyOpen, onOpenHistory]);

    return (
        <header
            ref={barRef}
            style={{
                flex: `0 0 ${TOP_BAR_HEIGHT}px`,
                height: TOP_BAR_HEIGHT,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: TOP_BAR_GROUP_GAP,
                padding: `0 ${TOP_BAR_PADDING_X}px`,
                background: PANEL_INK.PANEL,
                borderBottom: `${TOP_BAR_BORDER_WIDTH}px solid ${PANEL_INK.DIVIDER}`,
                boxSizing: "border-box",
            }}
        >
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "center" }}>
                {datasetName === null ? null : (
                    <span
                        style={{
                            fontSize: DATASET_NAME_FONT_SIZE,
                            fontWeight: DATASET_NAME_FONT_WEIGHT,
                            lineHeight: TOP_BAR_LINE_HEIGHT,
                            color: PANEL_INK.VALUE,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {datasetName}
                    </span>
                )}
            </div>

            <div
                style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    gap: TOP_BAR_CENTRE_GROUP_GAP,
                }}
            >
                <UndoSplitButton
                    canUndo={canUndo}
                    onUndo={onUndo}
                    onOpenHistory={toggleHistory}
                    historyOpen={historyOpen}
                    groupRef={splitButtonRef}
                    caretRef={caretRef}
                />
                <TopBarIconButton
                    title={redoTitle(canRedo)}
                    accessibleName={redoAccessibleName(canRedo)}
                    glyph="redo"
                    disabled={!canRedo}
                    onClick={onRedo}
                />
                <CommandPalettePill onClick={onOpenCommandPalette} />
            </div>

            <div
                style={{
                    flex: "1 1 0",
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: TOP_BAR_RIGHT_GROUP_GAP,
                }}
            >
                <Menu
                    opened={exportOpen && dataLoaded}
                    onChange={(opened) => {
                        setExportOpen(opened && dataLoaded);
                    }}
                    position="bottom-end"
                    withinPortal
                >
                    <Tooltip label={exportTitle(dataLoaded)} openDelay={TOOLTIP_DELAY_MS} withinPortal>
                        <Menu.Target>
                            <Button
                                type="button"
                                variant="subtle"
                                color="gray"
                                h={EXPORT_TRIGGER_HEIGHT}
                                px={EXPORT_TRIGGER_PADDING_X}
                                radius={EXPORT_TRIGGER_RADIUS}
                                aria-label={exportTitle(dataLoaded)}
                                aria-disabled={dataLoaded ? undefined : true}
                                data-disabled={dataLoaded ? undefined : true}
                                styles={{
                                    root: {
                                        background: "transparent",
                                        color: dataLoaded ? PANEL_INK.CHROME : PANEL_INK.DISABLED,
                                        fontSize: TOP_BAR_FONT_SIZE,
                                        fontWeight: TOP_BAR_LABEL_FONT_WEIGHT,
                                    },
                                    label: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: EXPORT_TRIGGER_GAP,
                                    },
                                }}
                            >
                                <TopBarGlyph name="export" size={TOP_BAR_SMALL_GLYPH_SIZE} />
                                <span>{EXPORT_LABEL}</span>
                                {/* REGISTER-1.5: the menu affordance is its own
                                    register entry -- 8 px at stroke 2, a different
                                    polyline from the 12 px disclosure caret. */}
                                <MenuCaret />
                            </Button>
                        </Menu.Target>
                    </Tooltip>
                    <Menu.Dropdown>
                        <Menu.Item
                            onClick={() => {
                                onExport("image");
                            }}
                        >
                            {EXPORT_MENU_IMAGE}
                        </Menu.Item>
                        <Menu.Item
                            onClick={() => {
                                onExport("data");
                            }}
                        >
                            {EXPORT_MENU_DATA}
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>

                {/* 5.1: the Share button is never drawn without this menu. */}
                <Menu
                    opened={shareOpen && dataLoaded}
                    onChange={(opened) => {
                        setShareOpen(opened && dataLoaded);
                    }}
                    position="bottom-end"
                    withinPortal
                >
                    <Menu.Target>
                        <TopBarIconButton
                            title={shareTitle(dataLoaded)}
                            accessibleName={shareTitle(dataLoaded)}
                            glyph="share"
                            disabled={!dataLoaded}
                        />
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Item
                            onClick={() => {
                                onShare("export-data");
                            }}
                        >
                            {SHARE_MENU_EXPORT_DATA}
                        </Menu.Item>
                        <Menu.Item
                            onClick={() => {
                                onShare("copy-image");
                            }}
                        >
                            {SHARE_MENU_COPY_IMAGE}
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>

                <div
                    aria-hidden="true"
                    style={{
                        flex: "0 0 auto",
                        width: RIGHT_GROUP_DIVIDER_WIDTH,
                        height: RIGHT_GROUP_DIVIDER_HEIGHT,
                        background: PANEL_INK.DIVIDER,
                    }}
                />

                <TopBarIconButton
                    title={compareTitle(dataLoaded)}
                    accessibleName={compareTitle(dataLoaded)}
                    glyph="compare"
                    disabled={!dataLoaded}
                    pressed={compareActive}
                    active={compareActive}
                    onClick={onToggleCompare}
                />
                {/* The pair, in screen order: the panel's switch left of the
                    inspector's, each lit while its own region is shown. */}
                <TopBarIconButton
                    title={panelToggleTitle()}
                    accessibleName={PANEL_TOGGLE_VERB}
                    glyph="togglePanel"
                    pressed={panelOpen}
                    active={panelOpen}
                    onClick={onTogglePanel}
                />
                <TopBarIconButton
                    title={inspectorToggleTitle()}
                    accessibleName={INSPECTOR_TOGGLE_VERB}
                    glyph="toggleInspector"
                    pressed={inspectorOpen}
                    active={inspectorOpen}
                    onClick={onToggleInspector}
                />
            </div>

            <HistoryPopover
                opened={historyOpen}
                rows={history.rows}
                entryCount={history.entryCount}
                undoneCount={history.undoneCount}
                anchorRef={splitButtonRef}
                barRef={barRef}
                onOpenChange={setHistoryOpen}
                onRestore={history.onRestore}
                onOpenOwningPanel={history.onOpenOwningPanel}
                onPreview={history.onPreview}
                returnFocusRef={caretRef}
            />
        </header>
    );
}
