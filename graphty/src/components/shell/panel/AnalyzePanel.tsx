import {
    ActionRow,
    CompoundRow,
    InfoCircle,
    PANEL_GRID,
    PANEL_INK,
    UiGlyph,
} from "@graphty/compact-mantine";
import { Box, Button, Tooltip } from "@mantine/core";
import React, { type RefObject, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { GraphtyHandle } from "../../Graphty";
import { type AlgorithmStyleLayer, RunAlgorithmModal } from "../../RunAlgorithmModal";
import { TOOLTIP_DELAY_MS } from "../constants";
import { PanelOutlineButton, PanelQuietButton } from "./panelButtons";
import { usePanelHeaderSlot } from "./panelHeaderSlot";
import { ComingTag, PanelRows, PanelSection, SectionAddButton } from "./PanelSection";

/**
 * Which of the panel's two modes is showing. Remembered per 6.5 ("Analyze Run
 * or Results tab"), which is not one of the four entries the shell store
 * persists, so this panel owns that storage itself.
 */
type AnalyzeTab = "results" | "run";

/** How the Results tab draws its result cards. Remembered per 6.5. */
type AnalyzeCardView = "cards" | "list";

/**
 * The key this panel's own memory is written under. Versioned, so a shape
 * change becomes a missing key rather than a corrupt read -- the same guarded
 * shape `readPersistedShellLayout` uses.
 */
export const ANALYZE_MEMORY_STORAGE_KEY = "graphty.panel.analyze.v1";

/** What this panel remembers. Both entries are on the 6.5 list and nothing else is. */
interface AnalyzeMemory {
    /** 6.5 "Analyze Run or Results tab". */
    readonly tab: AnalyzeTab;
    /** 6.5 "Analyze card view (Cards or List)". */
    readonly view: AnalyzeCardView;
}

/**
 * Reads this panel's memory, surviving an absent key, an unreadable store,
 * malformed JSON and a value of the wrong shape. Each field is validated on its
 * own, so one bad field costs only that field.
 * @returns whatever of the panel's memory could be trusted.
 */
function readAnalyzeMemory(): Partial<AnalyzeMemory> {
    let raw: string | null = null;

    try {
        raw = window.localStorage.getItem(ANALYZE_MEMORY_STORAGE_KEY);
    } catch {
        return {};
    }

    if (raw === null || raw === "") {
        return {};
    }

    let parsed: unknown = null;

    try {
        parsed = JSON.parse(raw);
    } catch {
        return {};
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return {};
    }

    const record = parsed as Record<string, unknown>;
    const result: { tab?: AnalyzeTab; view?: AnalyzeCardView } = {};

    if (record.tab === "run" || record.tab === "results") {
        result.tab = record.tab;
    }

    if (record.view === "cards" || record.view === "list") {
        result.view = record.view;
    }

    return result;
}

/**
 * Writes this panel's memory. A full or unavailable store is not an error the
 * panel can act on: the choice simply does not survive the session.
 * @param memory - the tab and card view to remember.
 */
function writeAnalyzeMemory(memory: AnalyzeMemory): void {
    try {
        window.localStorage.setItem(ANALYZE_MEMORY_STORAGE_KEY, JSON.stringify(memory));
    } catch {
        // Nothing to do: the panel still works, it just forgets.
    }
}

/** The Run tab's name (AnalyzePanel.dc.html:249). */
const RUN_TAB_LABEL = "Run";

/** The Results tab's name. Empty, it is a dimmed name with no count. */
const RESULTS_TAB_LABEL = "Results";

/** What the empty Results tab's tooltip reads (AnalyzePanel.dc.html:250). */
const RESULTS_EMPTY_TITLE = "No results yet";

/** The `+ Analysis` row's word, and its tooltip (AnalyzePanel.dc.html). */
const ADD_ANALYSIS_LABEL = "Analysis";

/** The picker's tooltip, which states what is behind the door before it opens. */
const ADD_ANALYSIS_TITLE = "Add an analysis: 26 methods behind 7 questions";

/** The verb 6.8's never list keeps in words, in every form. */
const RUN_LABEL = "Run";

/**
 * The Recipes library's resident `+`, with the reason it cannot act.
 *
 * The verb is the register's (AnalyzePanel.dc.html:557 `title="Save as recipe..."`) and
 * the reason is 5.8's one word, which is the same clause every other unshipped control
 * in this shell appends. Floor item 4: a disabled control states its reason, and the
 * reason travels in the control's own tooltip.
 */
const SAVE_AS_RECIPE_TITLE = "Save as recipe... Coming";

/**
 * The frozen Suggested list: membership, order and anatomy (AnalyzePanel.dc.html,
 * R2-M04). Each row is the 6.3 pair -- plain name, technical name dimmed -- with
 * its sentence behind the info circle and a RESIDENT Run.
 */
const SUGGESTED_CARDS: readonly {
    readonly id: string;
    readonly name: string;
    readonly technical: string;
    readonly info: string;
}[] = [
    {
        id: "groups",
        name: "Groups",
        technical: "Communities (Louvain)",
        info: "Cluster nodes that interact more with each other than with the rest.",
    },
    {
        id: "most-connected",
        name: "Most connected",
        technical: "Degree centrality",
        info: "Rank nodes by how many links they have.",
    },
    {
        id: "bridges",
        name: "Bridges",
        technical: "Betweenness centrality",
        info: "Nodes that link otherwise separate groups.",
    },
    {
        id: "influence",
        name: "Influence",
        technical: "PageRank",
        info: "Nodes with well-linked neighbors: a node scores high when the nodes pointing at it score high.",
    },
];

/** The tab track's inner padding and the gap between its two buttons. */
const TRACK_PADDING = 1;

/** The gap between the two buttons of the tab track (AnalyzePanel.dc.html:248). */
const TRACK_GAP = 2;

/** One button of the tab track: the 24px track less its padding on both edges. */
const TRACK_BUTTON_HEIGHT = PANEL_GRID.CONTROL_HEIGHT - TRACK_PADDING * 2;

/** The radius of one track button, concentric inside the track's own. */
const TRACK_BUTTON_RADIUS = 3;

/**
 * The Cards view glyph, copied from the artboard (AnalyzePanel.dc.html:210).
 * The closed register has no card or list verb, so the drawing comes from the
 * board that draws it rather than from a new register entry.
 * @returns the two stacked cards.
 */
function CardsGlyph(): React.JSX.Element {
    return (
        <svg
            width={PANEL_GRID.GLYPH}
            height={PANEL_GRID.GLYPH}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            <rect x="2.5" y="2.5" width="11" height="4.5" rx="1" />
            <rect x="2.5" y="9" width="11" height="4.5" rx="1" />
        </svg>
    );
}

/**
 * The List view glyph, copied from the artboard (AnalyzePanel.dc.html:213).
 * @returns the three-line list.
 */
function ListGlyph(): React.JSX.Element {
    return (
        <svg
            width={PANEL_GRID.GLYPH}
            height={PANEL_GRID.GLYPH}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            <line x1="5.5" y1="4" x2="13.5" y2="4" />
            <line x1="5.5" y1="8" x2="13.5" y2="8" />
            <line x1="5.5" y1="12" x2="13.5" y2="12" />
            <circle cx="3" cy="4" r="0.5" />
            <circle cx="3" cy="8" r="0.5" />
            <circle cx="3" cy="12" r="0.5" />
        </svg>
    );
}

/** One tile of the header's card view track (AnalyzePanel.dc.html:209). */
const CARD_VIEW_TILE_WIDTH = PANEL_GRID.CONTROL_HEIGHT;

/** The gap between the header track's two tiles, which is tighter than the tab track's. */
const CARD_VIEW_TRACK_GAP = 1;

/**
 * The two modes the header track offers, in the order the artboard draws them.
 */
const CARD_VIEWS: readonly { readonly value: AnalyzeCardView; readonly label: string }[] = [
    { value: "cards", label: "Cards" },
    { value: "list", label: "List" },
];

/**
 * Props of {@link CardViewToggle}.
 */
interface CardViewToggleProps {
    /** Which mode the result cards are drawn in. */
    readonly value: AnalyzeCardView;
    /** Chooses a mode. */
    readonly onChange: (value: AnalyzeCardView) => void;
}

/**
 * The Cards / List track the panel header draws, between the panel name and the
 * close X (AnalyzePanel.dc.html:206-216).
 *
 * It is drawn here rather than with `IconGroupRow` because that component is a
 * ROW -- a leading label, the 224px band, a trailing slot -- and this control sits
 * in a 36px title row with no band to lay. What it keeps from `IconGroupRow` is the
 * part that matters: the same `SELECTED` / `ON_SELECTED` pair on the chosen tile,
 * so the panel's two mode tracks cannot drift apart. See the tab track below for
 * why those tokens and not the artboard's own hex.
 *
 * It is a radio group, not a tab list: choosing a card view does not change which
 * surface is showing, it changes how one surface draws.
 * @param props - the chosen mode and the chooser.
 * @returns the two-tile track.
 */
function CardViewToggle(props: CardViewToggleProps): React.JSX.Element {
    const { value, onChange } = props;

    return (
        <Box
            role="radiogroup"
            aria-label="Result card view"
            data-testid="analyze-card-view"
            style={{
                display: "flex",
                gap: CARD_VIEW_TRACK_GAP,
                height: PANEL_GRID.CONTROL_HEIGHT,
                padding: TRACK_PADDING,
                borderRadius: "var(--mantine-radius-sm)",
                background: PANEL_INK.SURFACE,
                boxSizing: "border-box",
            }}
        >
            {CARD_VIEWS.map((mode) => {
                const chosen = mode.value === value;

                return (
                    <Tooltip key={mode.value} label={mode.label} openDelay={TOOLTIP_DELAY_MS} withinPortal>
                        <button
                            type="button"
                            role="radio"
                            aria-checked={chosen}
                            aria-label={mode.label}
                            data-testid={`analyze-card-view-${mode.value}`}
                            onClick={() => {
                                onChange(mode.value);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: CARD_VIEW_TILE_WIDTH,
                                height: TRACK_BUTTON_HEIGHT,
                                border: "none",
                                borderRadius: TRACK_BUTTON_RADIUS,
                                background: chosen ? PANEL_INK.SELECTED : "transparent",
                                color: chosen ? PANEL_INK.ON_SELECTED : PANEL_INK.CHROME,
                                cursor: "pointer",
                                boxSizing: "border-box",
                            }}
                        >
                            {mode.value === "cards" ? <CardsGlyph /> : <ListGlyph />}
                        </button>
                    </Tooltip>
                );
            })}
        </Box>
    );
}

/**
 * Props of the Analyze panel body.
 */
export interface AnalyzePanelProps {
    /** The canvas host the re-homed Run algorithm dialog runs against. */
    readonly graphtyRef: RefObject<GraphtyHandle | null>;
    /** Receives the style layers a completed run applies. */
    readonly onAddLayers?: (layers: AlgorithmStyleLayer[]) => void;
    /** How many results have been computed. Zero draws a dimmed tab with no count. */
    readonly resultCount?: number;
    /**
     * The scope every Run below acts on, e.g. "20 nodes", drawn as the Suggested
     * header's resident state (floor item 4).
     */
    readonly scopeLabel?: string;
    /** The scope's full reading, e.g. "Scope: all 20 visible nodes. Change". */
    readonly scopeTitle?: string;
    /**
     * The sticky scope line, drawn ONLY when the scope is not the whole visible
     * graph (spec 03 section 2.3 item 3).
     */
    readonly scopeLine?: string;
    /** Changes the scope, from the scope line's own verb. */
    readonly onChangeScope?: () => void;
    /** The weight attribute. 6.10a keeps this pair resident however rarely it is touched. */
    readonly weightAttribute?: string;
    /** How the weight is treated, e.g. "Strength". */
    readonly weightTreatment?: string;
    /** The weight pair's tooltip, e.g. "Weight: edge attribute value, treated as strength". */
    readonly weightTitle?: string;
    /** Opens the weight pair for editing. */
    readonly onEditWeight?: () => void;
    /** Whether a run can start. While loading it cannot, and Run says why. */
    readonly runnable?: boolean;
    /** Why Run cannot act, e.g. "Available when loading finishes" (floor item 4). */
    readonly runDisabledReason?: string;
    /** Runs one suggested card. */
    readonly onRunSuggested?: (id: string) => void;
    /**
     * Whether this panel's own remembered tab and card view are read and written.
     *
     * It is the shell's `persist` flag, threaded down: `<AppShell persist={false}>`
     * has to stop every store in the shell, not only the two the shell itself owns, or
     * a board rendered with it still writes this panel's key into the real store and
     * leaks it into the next test file.
     * @default true
     */
    readonly persist?: boolean;
}

/**
 * The Analyze panel body: the Run / Results tabs, the card view toggle, the
 * resident weight pair, the scope line when there is one, the frozen Suggested
 * list, the `+ Analysis` picker row, and then the five sections that follow it.
 *
 * Run is resident and drawn on every suggested row in every state; where the
 * list is not yet runnable the Run stays drawn and disabled with its reason in
 * its tooltip, on every row and never on one (floor item 4 and 5.8).
 * @param props - the Analyze panel's props.
 * @returns the Analyze panel body.
 */
export function AnalyzePanel(props: AnalyzePanelProps): React.JSX.Element {
    const {
        graphtyRef,
        onAddLayers,
        resultCount = 0,
        scopeLabel,
        scopeTitle,
        scopeLine,
        onChangeScope,
        weightAttribute,
        weightTreatment,
        weightTitle,
        onEditWeight,
        runnable = true,
        runDisabledReason,
        onRunSuggested,
        persist = true,
    } = props;

    const [remembered] = useState<Partial<AnalyzeMemory>>(() => (persist ? readAnalyzeMemory() : {}));
    const [tab, setTab] = useState<AnalyzeTab>(() => remembered.tab ?? "run");
    const [view, setView] = useState<AnalyzeCardView>(() => remembered.view ?? "cards");
    const [pickerOpen, setPickerOpen] = useState(false);
    const headerSlot = usePanelHeaderSlot();

    useEffect(() => {
        if (!persist) {
            return;
        }

        writeAnalyzeMemory({ tab, view });
    }, [persist, tab, view]);

    const runTooltip =
        runnable || runDisabledReason === undefined ? RUN_LABEL : `${RUN_LABEL}. ${runDisabledReason}`;

    const hasWeight = weightAttribute !== undefined && weightTreatment !== undefined;

    return (
        <>
            {/*
                The card view toggle is drawn in the panel's TITLE ROW, between the
                panel name and the close X (AnalyzePanel.dc.html:206-216), not as a
                row in the content band. It reaches that row through the header slot
                so its state stays where it is remembered -- this panel's own 6.5
                key -- rather than being lifted into the shell to be passed back
                down. Rendered with no panel chrome above it the slot is null and the
                toggle simply is not drawn, exactly as the inspector's footer is not.
            */}
            {headerSlot !== null &&
                createPortal(
                    <CardViewToggle
                        value={view}
                        onChange={(next) => {
                            setView(next);
                        }}
                    />,
                    headerSlot,
                )}

            <PanelRows>
                {/*
                    RT-3 widened to a text track: two modes of one panel, neither
                    drawable, and the unselected mode must still report its state
                    ("No results yet"). 224 track on the 32px pitch, 22px buttons
                    at radius 3 (AnalyzePanel.dc.html:233-251).

                    The selected button takes SELECTED / ON_SELECTED, NOT the
                    artboard's own #374047 on #d5d7da. CONTRAST-DIVERGENCE 4.1
                    names "segmented and tab and icon-group" as one role and
                    licences exactly this departure: #374047 on the #2a3035 track
                    measures 1.26:1, and WCAG 2.2 1.4.11 asks 3:1 of the boundary
                    that draws an operable control's state. SELECTED inverts to
                    clear 5.59:1, which then forces ON_SELECTED, because the
                    primary ink on that ground is only 1.66:1. This track is the
                    same row type as the Cards / List icon group in the header,
                    so the two carry the same pair of tokens.
                */}
                <Box
                    role="tablist"
                    aria-label="Analyze"
                    data-testid="analyze-tabs"
                    style={{
                        display: "flex",
                        gap: TRACK_GAP,
                        width: PANEL_GRID.BODY,
                        height: PANEL_GRID.CONTROL_HEIGHT,
                        marginBlockStart: PANEL_GRID.SECTION_PAD_BOTTOM,
                        padding: TRACK_PADDING,
                        borderRadius: "var(--mantine-radius-sm)",
                        background: PANEL_INK.SURFACE,
                        boxSizing: "border-box",
                    }}
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === "run"}
                        data-testid="analyze-tab-run"
                        onClick={() => {
                            setTab("run");
                        }}
                        style={{
                            flex: 1,
                            height: TRACK_BUTTON_HEIGHT,
                            border: "none",
                            borderRadius: TRACK_BUTTON_RADIUS,
                            background: tab === "run" ? PANEL_INK.SELECTED : "transparent",
                            color: tab === "run" ? PANEL_INK.ON_SELECTED : PANEL_INK.CHROME,
                            fontSize: "var(--mantine-font-size-sm)",
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        {RUN_TAB_LABEL}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === "results"}
                        title={resultCount === 0 ? RESULTS_EMPTY_TITLE : undefined}
                        data-testid="analyze-tab-results"
                        onClick={() => {
                            setTab("results");
                        }}
                        style={{
                            flex: 1,
                            height: TRACK_BUTTON_HEIGHT,
                            border: "none",
                            borderRadius: TRACK_BUTTON_RADIUS,
                            background: tab === "results" ? PANEL_INK.SELECTED : "transparent",
                            color: tab === "results" ? PANEL_INK.ON_SELECTED : PANEL_INK.CHROME,
                            fontSize: "var(--mantine-font-size-sm)",
                            fontWeight: 500,
                            cursor: "pointer",
                        }}
                    >
                        {resultCount === 0 ? RESULTS_TAB_LABEL : `${RESULTS_TAB_LABEL} (${resultCount})`}
                    </button>
                </Box>

                {/*
                    6.10a, the resident-though-rare class: a wrong weight sense
                    silently inverts every path result, so this pair stays
                    resident however rarely it is touched and may never become
                    gear contents.
                */}
                {hasWeight && (
                    <CompoundRow
                        label="Weight"
                        width={PANEL_GRID.BODY}
                        segments={[
                            { value: weightAttribute, grow: true },
                            { value: weightTreatment, fullValue: weightTitle },
                        ]}
                        onClick={onEditWeight}
                    />
                )}

                {/* Drawn only when the scope is not the whole visible graph. */}
                {scopeLine !== undefined && (
                    <ActionRow
                        state={scopeLine}
                        residentActions={
                            <PanelQuietButton onClick={onChangeScope}>Change</PanelQuietButton>
                        }
                    />
                )}
            </PanelRows>

            <PanelSection
                sectionId="analyze.suggested"
                label="Suggested"
                defaultOpen
                actions={
                    scopeLabel === undefined ? undefined : (
                        <Box
                            component="span"
                            title={scopeTitle}
                            data-testid="analyze-scope"
                            style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}
                        >
                            {scopeLabel}
                        </Box>
                    )
                }
            >
                {SUGGESTED_CARDS.map((card) => (
                    <ActionRow
                        key={card.id}
                        state={
                            <>
                                <Box component="span" style={{ color: PANEL_INK.VALUE, fontWeight: 500 }}>
                                    {card.name}
                                </Box>{" "}
                                <Box component="span" style={{ color: PANEL_INK.CHROME }}>
                                    {card.technical}
                                </Box>
                            </>
                        }
                        stateTitle={`${card.name} ${card.technical}`}
                        residentActions={
                            <>
                                <InfoCircle label={card.name}>{card.info}</InfoCircle>
                                <Button
                                    variant="filled"
                                    h={PANEL_GRID.CONTROL_HEIGHT}
                                    px={PANEL_GRID.TRAIL_GAP}
                                    radius="sm"
                                    disabled={!runnable}
                                    title={runTooltip}
                                    aria-label={`${RUN_LABEL} ${card.name}`}
                                    onClick={() => {
                                        onRunSuggested?.(card.id);
                                    }}
                                >
                                    {RUN_LABEL}
                                </Button>
                            </>
                        }
                    />
                ))}
            </PanelSection>

            <PanelRows>
                <Box style={{ display: "flex", alignItems: "center", height: PANEL_GRID.ROW_PITCH }}>
                    {/*
                        The picker door: 224 wide on the content band, outlined, at
                        the secondary ink (AnalyzePanel.dc.html:445). It takes the
                        outlined shape rather than the quiet one because it spans the
                        band like the tab track and the method field above it -- "the
                        three controls stack on one width" -- and a borderless button
                        at that width has no box to stack.
                    */}
                    <PanelOutlineButton
                        w={PANEL_GRID.BODY}
                        c={PANEL_INK.CHROME}
                        title={ADD_ANALYSIS_TITLE}
                        data-testid="analyze-add"
                        leftSection={<UiGlyph name="plus" size={PANEL_GRID.GLYPH} />}
                        onClick={() => {
                            setPickerOpen(true);
                        }}
                    >
                        {ADD_ANALYSIS_LABEL}
                    </PanelOutlineButton>
                </Box>
            </PanelRows>

            <PanelSection
                sectionId="analyze.allStatistics"
                label="All statistics"
                empty
                info="Statistics panel. Instant rows follow the data; computed rows are recomputed on request."
            />

            <PanelSection
                sectionId="analyze.metricHistograms"
                label="Metric histograms"
                empty
                actions={
                    <SectionAddButton
                        tooltip="Add a histogram of links per node (degree)"
                        label="Add a histogram of links per node (degree)"
                    />
                }
            />

            <PanelSection sectionId="analyze.history" label="History" empty />

            <PanelSection
                sectionId="analyze.recipes"
                label="Recipes"
                empty
                info="Analysis recipes: saved in this browser on this computer. Export a file to move it."
                actions={
                    <>
                        {/*
                            Floor item 4: the reason travels with the control. Recipes
                            have not shipped (the section carries 5.8's tag), so the
                            plus says so in the same words every other unshipped control
                            in this shell uses.
                        */}
                        <SectionAddButton
                            tooltip={SAVE_AS_RECIPE_TITLE}
                            label={SAVE_AS_RECIPE_TITLE}
                            disabled
                        />
                        <ComingTag />
                    </>
                }
            />

            <PanelSection sectionId="analyze.more" label="More" empty />

            <RunAlgorithmModal
                opened={pickerOpen}
                graphtyRef={graphtyRef}
                onAddLayers={onAddLayers}
                onClose={() => {
                    setPickerOpen(false);
                }}
            />
        </>
    );
}
