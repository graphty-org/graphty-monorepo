import {
    ActionRow,
    CompoundRow,
    InfoCircle,
    PANEL_GRID,
    PANEL_INK,
    ProseBlock,
    UiGlyph,
} from "@graphty/compact-mantine";
import { Box, Button, Tooltip } from "@mantine/core";
import React, { type RefObject, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { GraphtyHandle } from "../../Graphty";
import { RunAlgorithmModal } from "../../RunAlgorithmModal";
import {
    COMING_TAG_FONT_SIZE,
    COMING_TAG_FONT_WEIGHT,
    COMING_TAG_HEIGHT,
    COMING_TAG_PADDING_X,
    COMING_TAG_RADIUS,
} from "../ComingTag";
import { TOOLTIP_DELAY_MS } from "../constants";
import { SWATCH_RADIUS } from "../inspector/inspectorConstants";
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

/**
 * The one state chip this build can honestly draw, and the only one.
 *
 * Spec 2207-2209 closes the set: "A Done state chip is not drawn: state chips are for
 * Running, Queued, Failed and Stale." Of those four, Running is the only state this
 * shell measures -- there is no queue, a failed run clears the in-flight state without
 * recording itself, and staleness needs a scope-change watch nothing keeps. So the card
 * draws Running or nothing at all, and a completed result carries NO chip. The failure
 * mode that rule exists to prevent is a column of green Done chips that says the same
 * thing about every row and therefore says nothing about any of them, which is also
 * what makes a single Running chip readable when one appears.
 */
const RUNNING_CHIP_LABEL = "Running";

/**
 * The applied card's cross-panel verb (spec 2233-2236: "the resident state swatch, the
 * layer name, and 'Change encoding', which opens Style with that layer selected").
 *
 * The same words the inspector's own result surface uses (`ResultInspector`'s
 * `changeEncoding` action), because 6.8 gives one act one verb wherever it is drawn.
 */
const CHANGE_ENCODING_LABEL = "Change encoding";

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

/**
 * The empty result list, hoisted to module scope.
 *
 * A `[]` written as a default in the destructuring is a NEW array on every render, which
 * would make it an unstable dependency of every hook that reads it. One frozen empty
 * array cannot do that.
 */
const EMPTY_RESULTS: readonly AnalyzeResultCard[] = [];

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
 *
 * KNOWN DEAD CONTROL, deliberately left alone: the chosen view is remembered (6.5) and
 * read by nothing -- the Results list below draws one row shape in both modes. It is a
 * separate defect from the dead Results tab this unit fixed, and fixing it means
 * DESIGNING what Cards and List differ by, which no board or spec line settles. Left as
 * it is rather than half-wired to a difference nobody specified.
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
 * One row of the Results tab: a run that has completed, or one that is in flight.
 *
 * This is the COLLAPSED card of spec 2200-2204 and nothing more -- "A result open in
 * the inspector renders its Results-list card collapsed to title, state and headline
 * plus the primary action". The expanded body (the reading, the caveats line, the
 * one-line run record, the shape body and the distribution) is the inspector's, and
 * spec 2203-2204 says why it may not be drawn twice: "One result body renders on
 * screen at a time ... Reading, caveats line, run record and shape body each render
 * exactly once on screen." A Results list that re-drew the body would put two copies of
 * the same reading on one screen and give the reader no way to tell which one is live.
 *
 * The four optional fields are deliberately NOT independent of each other. `layerName`
 * is what says this run painted, exactly as it is on `ResultInspector` (see its
 * `applied` derivation), and `stateSwatch` and `onChangeEncoding` are passed with it or
 * not at all. A card that named a layer it had not painted sent `Change encoding` to
 * Style for an encoding that does not exist -- the same defect `ResultInspector`'s own
 * doc records, and the reason the un-applied form here draws no encoding verb rather
 * than one that does nothing.
 * @public
 */
export interface AnalyzeResultCard {
    /**
     * The result's own id, stable for as long as the result is on the list.
     *
     * It is what {@link AnalyzePanelProps.onOpenResult} is called with and what
     * {@link AnalyzePanelProps.activeResultId} is compared against, so it must be the
     * shell's identity for the run and never a rendering index: an index changes when a
     * second run lands and the route back would then open whichever result had moved
     * into that slot.
     */
    readonly id: string;
    /**
     * The run's name -- "Groups", "Most connected" -- which is the plain half of the 6.3
     * pair and the SAME string the style layer, the legend block title and the History
     * row already carry (floor item 6: "the run name, or the typed name once renamed").
     * One run must not be called three things on three surfaces.
     */
    readonly title: string;
    /**
     * The one-line headline: "6 groups, modularity 0.447", "Most connected: 34 (17)".
     *
     * Built by `communityHeadline` or `nodeMetricHeadline` beside the reading templates
     * they belong to, never assembled at the call site, so the collapsed line and the
     * expanded reading cannot come to disagree about what the run found.
     */
    readonly headline: string;
    /**
     * The state chip, when there is one. See {@link RUNNING_CHIP_LABEL}: "running" is
     * the only value this build can honestly carry and a completed run carries none.
     */
    readonly state?: "running";
    /** A colour the layer this run applied really paints. Passed with `layerName` or not at all. */
    readonly stateSwatch?: string;
    /** The name of the style layer this run applied. Its presence is what makes the card applied. */
    readonly layerName?: string;
    /** Opens Style with that layer selected. Passed with `layerName` or not at all. */
    readonly onChangeEncoding?: () => void;
}

/**
 * Props of {@link ResultRow}.
 */
interface ResultRowProps {
    /** The result to draw. */
    readonly card: AnalyzeResultCard;
    /** Whether this is the result the inspector is drawing. */
    readonly active: boolean;
    /** Opens this result in the inspector. */
    readonly onOpen?: (id: string) => void;
}

/**
 * The Running chip: the shared `Coming` pill's geometry, with the run's state in it.
 *
 * It reads the five exported `COMING_TAG_*` numbers rather than restating them, so the
 * shell has ONE compact pill shape (spec 03 section 1.5, VOCAB section 3 "pill
 * (compact)") however many words end up riding in it. Those constants are exported for
 * exactly this reason -- `ComingTag` itself cannot be reused, because its word is fixed
 * at "Coming" and this pill reports a state rather than an unshipped capability.
 *
 * No `role` and no live region, for the reason `ComingTag` gives: the word IS the
 * status, and the row it sits on is announced by its own reading. The chip is drawn
 * inside the row's reading rather than in `residentActions` because spec 2200-2202
 * orders the collapsed card "title, state and headline", and because
 * `residentActions` on this row is reserved for the applied form's swatch, layer name
 * and verb -- a chip there would sit after the headline and read as a control.
 * @returns the Running pill.
 */
function RunningChip(): React.JSX.Element {
    return (
        <Box
            component="span"
            data-testid="analyze-result-running"
            style={{
                flex: "0 0 auto",
                display: "inline-flex",
                alignItems: "center",
                height: COMING_TAG_HEIGHT,
                paddingInline: COMING_TAG_PADDING_X,
                borderRadius: COMING_TAG_RADIUS,
                background: PANEL_INK.RAISED,
                color: PANEL_INK.CHROME,
                fontSize: COMING_TAG_FONT_SIZE,
                fontWeight: COMING_TAG_FONT_WEIGHT,
                lineHeight: 1,
                boxSizing: "border-box",
                whiteSpace: "nowrap",
            }}
        >
            {RUNNING_CHIP_LABEL}
        </Box>
    );
}

/**
 * One collapsed result card, drawn as an `ActionRow`.
 *
 * It is an `ActionRow` and not a bespoke card for the reason the Suggested rows above
 * are: the 6.3 pair layout -- a name at the value ink followed by a dimmer second
 * string -- is the row type this panel already uses for every capability it lists, and
 * a result row that looked different from a suggested row would read as a different
 * kind of thing. The row's own activation (`onClick`) is the route back to the
 * inspector, which is what spec 2200-2202's "plus the primary action" means for a
 * collapsed card: opening the result IS the act.
 *
 * TWO FORMS, and the difference between them is one fact:
 *
 * - APPLIED (`layerName` present): the resident state swatch, the layer name and
 *   `Change encoding` (spec 2233-2236). Resident rather than hover-revealed because a
 *   swatch and a layer name REPORT a state, and `ActionRow`'s whole split is that a
 *   state which only appears on hover is a state nobody can scan a column for.
 * - UN-APPLIED: NOTHING in the trailing slot. Spec 2234 gives that form an "Encode as
 *   style" button, and this build has no such act anywhere -- `ResultInspector`'s doc
 *   records the same refusal for the same surface. A drawn verb that does nothing is
 *   worse than an absent one, because the reader spends a click finding out.
 *
 * NO Done chip is drawn in either form (spec 2207-2209). See {@link RUNNING_CHIP_LABEL}.
 * @param props - the card, whether it is the open one, and the route back.
 * @returns the collapsed result row.
 */
function ResultRow(props: ResultRowProps): React.JSX.Element {
    const { card, active, onOpen } = props;
    const running = card.state === "running";

    /* The layer name is what says this run painted, and it is passed with the swatch and
       the verb or none of them is -- the same derivation `ResultInspector` makes, stated
       the same way, so one result cannot be applied on one surface and un-applied on the
       other. */
    const applied = card.layerName !== undefined;

    /* `ActionRow` falls back to the drawn text for its tooltip and its accessible name
       only when the reading is a plain string; this one is markup, so the complete
       reading is assembled here. Without it the row's button would be named by nothing
       and a column of results would be a column of unnamed buttons (WCAG 4.1.2). */
    const stateTitle = running
        ? `${card.title} ${RUNNING_CHIP_LABEL} ${card.headline}`
        : `${card.title} ${card.headline}`;

    return (
        <Box
            data-testid={`analyze-result-${card.id}`}
            /* Which result the inspector is drawing (spec 2200-2202). It rides on the
               wrapper rather than on the row because `ActionRow` publishes no selected
               state and inventing one here would be a second, divergent spelling of a
               thing the row type may one day grow. `aria-current` is the honest report:
               this is the one of several rows the reader is on. */
            aria-current={active ? "true" : undefined}
            data-active={active ? "true" : undefined}
        >
            <ActionRow
                state={
                    <>
                        <Box component="span" style={{ color: PANEL_INK.VALUE, fontWeight: 500 }}>
                            {card.title}
                        </Box>{" "}
                        {running && (
                            <>
                                <RunningChip />{" "}
                            </>
                        )}
                        <Box component="span" style={{ color: PANEL_INK.CHROME }}>
                            {card.headline}
                        </Box>
                    </>
                }
                stateTitle={stateTitle}
                /* The reading arrives late on a running card, so the row is a live region
                   for its whole life rather than only while the run is out -- a region
                   that gains the prop at the same moment it gains its text announces
                   nothing. See `ActionRow`'s own note on `busy`. */
                busy={running}
                onClick={() => {
                    onOpen?.(card.id);
                }}
                {...(applied
                    ? {
                          residentActions: (
                              <>
                                  {card.stateSwatch !== undefined && (
                                      <Box
                                          aria-hidden
                                          data-testid="analyze-result-swatch"
                                          style={{
                                              flex: "0 0 auto",
                                              width: PANEL_GRID.GLYPH,
                                              height: PANEL_GRID.GLYPH,
                                              borderRadius: SWATCH_RADIUS,
                                              border: `1px solid ${PANEL_INK.BORDER}`,
                                              background: card.stateSwatch,
                                          }}
                                      />
                                  )}
                                  {/*
                                      THE LAYER NAME IS NOT DRAWN AS A THIRD VISIBLE ITEM,
                                      and this is a correction made on 2026-09-14, the day
                                      the row was first driven by the shell rather than by
                                      a board's own props.

                                      MEASURED, live, at 1440x900 with Karate loaded and
                                      Groups run: the row is 255 px inside the 280 px panel.
                                      `ActionRow` gives its affordance cluster `flex: 0 0
                                      auto`, so that cluster NEVER shrinks and the state
                                      half absorbs every overflow. With a visible layer
                                      name the cluster measured 287 px -- swatch 14, name
                                      155, verb 110, gaps 8 -- so the state half was given
                                      ZERO pixels and the row read "(swatch) Groups
                                      (Communities, Louvain)  Change enco...". The one
                                      thing the Results tab exists to show, the 6.3 pair
                                      "Groups / 6 groups, modularity 0.451", was not on
                                      screen at all.

                                      Spec 2200-2202 says what a collapsed card carries:
                                      "title, state and headline, plus the primary action".
                                      The layer name is not on that list; the swatch and
                                      the verb are the primary action's own parts. So the
                                      name moves into the verb's tooltip, where it is still
                                      hoverable and still announced, and the pair gets the
                                      119 px it needs to read. Do not put it back as a span
                                      without first widening the panel or shrinking the
                                      verb -- the arithmetic above is the whole argument.
                                  */}
                                  <PanelQuietButton
                                      title={`${CHANGE_ENCODING_LABEL}: ${card.layerName ?? ""}`}
                                      onClick={card.onChangeEncoding}
                                  >
                                      {CHANGE_ENCODING_LABEL}
                                  </PanelQuietButton>
                              </>
                          ),
                      }
                    : {})}
            />
        </Box>
    );
}

/**
 * Props of the Analyze panel body.
 */
export interface AnalyzePanelProps {
    /** The canvas host the re-homed Run algorithm dialog runs against. */
    readonly graphtyRef: RefObject<GraphtyHandle | null>;
    /**
     * Every result on the Results tab, in the order they are drawn.
     *
     * This replaced a bare `resultCount: number`, and the replacement is the whole point
     * rather than a tidy-up. The count and the list were two facts with one meaning and
     * only one of them reached the body: the tab read "Results (1)" while the panel had
     * no list to show at all, so selecting the tab repainted two buttons and left the Run
     * tab's Suggested cards on screen. A badge derived from `results.length` cannot
     * disagree with the rows beneath it, because there is only one fact left.
     *
     * Empty is the ordinary state before the session's first run, and it draws NO body
     * sentence -- see the Results button for Rule 7a (spec:1684).
     * @default []
     */
    readonly results?: readonly AnalyzeResultCard[];
    /**
     * Which result the inspector is currently drawing, if any.
     *
     * Spec 2200-2202: "A result open in the inspector renders its Results-list card
     * collapsed". This panel only ever draws the collapsed form, so what the id buys is
     * the report of WHICH row the reader is looking at elsewhere -- without it, a list of
     * two results gives no signal about which of them the inspector holds.
     */
    readonly activeResultId?: string;
    /**
     * Opens a result in the inspector. Called with {@link AnalyzeResultCard.id}.
     *
     * The shell's implementation clears the node selection and the style-layer selection
     * first, because both outrank a result on the inspector surface; that precedence is
     * the spec's and the run functions already carry the same clause.
     */
    readonly onOpenResult?: (id: string) => void;
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
     * Per-card Run label, e.g. "Run (about 4 min)", keyed by {@link SUGGESTED_CARDS} id.
     *
     * Floor item 4: Run keeps its full text (spec 4954-4956). A cost the reader is about
     * to pay is part of the verb, so it is drawn IN the label rather than as a glyph, a
     * truncation or a badge -- a Run that silently costs four minutes and a Run that
     * costs none are two different controls and must not look alike.
     */
    readonly runLabels?: Readonly<Record<string, string>>;
    /** Per-card Run tooltip, appended after the label as the existing run tooltip does. */
    readonly runTitles?: Readonly<Record<string, string>>;
    /**
     * Per-card cost warning, drawn as a departure ProseBlock under that card's row.
     *
     * Spec 1969-1973's sentence ("About 3 h at this size. Filter to a part, and run it
     * there."). It is REPORTED text about what this graph will cost, so it may not go
     * behind an info circle (spec 4670-4684): a warning a reader has to open a door to
     * read is a warning they will not read.
     */
    readonly runWarnings?: Readonly<Record<string, string>>;
    /** The card whose run is in flight, if any. Its Run is disabled with the reason in its tooltip. */
    readonly runningId?: string;
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
 * resident weight pair, the scope line when there is one, then EITHER the Run
 * tab's frozen Suggested list and `+ Analysis` picker row OR the Results tab's
 * result list, and then the five panel-level sections that follow both.
 *
 * Run is resident and drawn on every suggested row in every state; where the
 * list is not yet runnable the Run stays drawn and disabled with its reason in
 * its tooltip, on every row and never on one (floor item 4 and 5.8).
 *
 * THE DEFECT THIS BODY USED TO CARRY, recorded because the shape of it is easy to
 * rebuild: the tab track was complete -- two `role="tab"` buttons, `tab` state,
 * `aria-selected`, a remembered choice -- and the JSX after it was UNCONDITIONAL.
 * Selecting Results changed which button was lit and nothing else, so the panel
 * reported "Results (1)" over the Run tab's Suggested cards. A tab track is a
 * promise about what the body will do; the body is what has to keep it, which is
 * why `tab` is now read in three places rather than two, and why the count in the
 * badge is `results.length` rather than a second, independently-passed number.
 * @param props - the Analyze panel's props.
 * @returns the Analyze panel body.
 */
export function AnalyzePanel(props: AnalyzePanelProps): React.JSX.Element {
    const {
        graphtyRef,
        results = EMPTY_RESULTS,
        activeResultId,
        onOpenResult,
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
        runLabels,
        runTitles,
        runWarnings,
        runningId,
        persist = true,
    } = props;

    const hasResults = results.length > 0;

    const [remembered] = useState<Partial<AnalyzeMemory>>(() => (persist ? readAnalyzeMemory() : {}));
    /*
        THE REMEMBERED TAB IS GUARDED ON READ, not merely restored.

        6.5 remembers "Analyze Run or Results tab", and a reader who left the panel on
        Results comes back to an EMPTY list across a dataset boundary, a "Remove result"
        or a fresh session -- the results do not survive any of the three, and the
        remembered tab does. Restored unguarded, that lands the reader on a tab with
        nothing in it and no body sentence to explain the emptiness (Rule 7a forbids one,
        spec:1684), which is the same dead surface this unit exists to remove, one step
        removed. So a remembered "results" is honoured only while there is something to
        show, and the effect below walks the tab back if the list empties underneath it.
    */
    const [tab, setTab] = useState<AnalyzeTab>(() =>
        remembered.tab === "results" && results.length > 0 ? "results" : "run",
    );
    const [view, setView] = useState<AnalyzeCardView>(() => remembered.view ?? "cards");
    const [pickerOpen, setPickerOpen] = useState(false);
    const headerSlot = usePanelHeaderSlot();

    useEffect(() => {
        if (!hasResults && tab === "results") {
            setTab("run");
        }
    }, [hasResults, tab]);

    useEffect(() => {
        if (!persist) {
            return;
        }

        writeAnalyzeMemory({ tab, view });
    }, [persist, tab, view]);

    const runTooltip = runnable || runDisabledReason === undefined ? RUN_LABEL : `${RUN_LABEL}. ${runDisabledReason}`;

    const hasWeight = weightAttribute !== undefined && weightTreatment !== undefined;

    /* Three inks, one per state, hoisted out of the JSX because the selected colour and
       the empty colour are answers to two different questions and nesting them reads as
       one. Rule 7a's "dimmed tab name" is the DISABLED token, which is allowed to be
       dimmer than the ordinary muted one precisely so a dimmed control is unmistakable. */
    let resultsTabInk: string = PANEL_INK.DISABLED;
    if (hasResults) {
        resultsTabInk = tab === "results" ? PANEL_INK.ON_SELECTED : PANEL_INK.CHROME;
    }

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
                    {/*
                        RULE 7a, spec:1684: "an empty Results tab is a dimmed tab name
                        with no count and no 'No results yet' sentence". All three halves
                        of that are here and the third is the one that is easy to lose:
                        the reason lives in the button's TOOLTIP (floor item 4 -- the
                        reason travels with the control) and NEVER as a sentence in the
                        body, because a body sentence is a surface drawn to say that
                        there is no surface.

                        Disabled as well as dimmed: before this the empty tab was fully
                        operable, so pressing it selected a tab whose body did not exist.
                        A control that can be pressed and changes nothing is the defect;
                        a control that says why it cannot be pressed is the fix.
                    */}
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === "results"}
                        disabled={!hasResults}
                        title={hasResults ? undefined : RESULTS_EMPTY_TITLE}
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
                            color: resultsTabInk,
                            fontSize: "var(--mantine-font-size-sm)",
                            fontWeight: 500,
                            cursor: hasResults ? "pointer" : "default",
                        }}
                    >
                        {hasResults ? `${RESULTS_TAB_LABEL} (${results.length})` : RESULTS_TAB_LABEL}
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
                        residentActions={<PanelQuietButton onClick={onChangeScope}>Change</PanelQuietButton>}
                    />
                )}
            </PanelRows>

            {/*
                THE BODY BRANCHES HERE, and before this unit it did not.

                The tab track above was a real `role="tablist"` with real state and real
                `aria-selected`, and `tab` was read by nothing else in this file except
                the two background expressions and the persistence effect. Selecting
                Results repainted two buttons, wrote "results" into this panel's memory,
                and left the Run tab's Suggested cards on screen -- which is the owner's
                report, "clicking on the 'Results' tab under 'Analysis' doesn't show
                anything", exactly.

                WHAT BRANCHES AND WHAT DOES NOT is the part worth stating, because getting
                it wrong is how a panel loses a control nobody notices is gone. Only the
                Run tab's own contents move: the Suggested list and the `+ Analysis`
                picker row. Everything the spec calls PANEL-LEVEL stays resident under
                both tabs -- the tab track itself, the weight CompoundRow (6.10a, resident
                however rarely it is touched, because a wrong weight sense silently
                inverts every path result), the scope ActionRow, and the five tier-2
                sections below, which spec:1699 lists as "Panel-level settings shared by
                every card" rather than as members of Run.
            */}
            {tab === "run" && (
                <>
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
                        {SUGGESTED_CARDS.map((card) => {
                            /*
                        Every disabled path keeps its reason in the tooltip, in full text
                        (floor item 4). The three paths are: nothing can run at all, this
                        card's own run is in flight, and another card's run is in flight
                        -- and the last of the three is the one that used to disable a
                        control while saying nothing at all about why.
                     */
                            const runLabel = runLabels?.[card.id] ?? RUN_LABEL;
                            let runTitle = runTitles?.[card.id] ?? runTooltip;

                            if (!runnable && runDisabledReason !== undefined) {
                                runTitle = `${runLabel}. ${runDisabledReason}`;
                            } else if (runningId !== undefined) {
                                runTitle = `${runLabel}. A run is already in progress.`;
                            }

                            const warning = runWarnings?.[card.id];

                            return (
                                <React.Fragment key={card.id}>
                                    <ActionRow
                                        state={
                                            <>
                                                <Box
                                                    component="span"
                                                    style={{ color: PANEL_INK.VALUE, fontWeight: 500 }}
                                                >
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
                                                    disabled={!runnable || runningId !== undefined}
                                                    title={runTitle}
                                                    aria-label={`${RUN_LABEL} ${card.name}`}
                                                    onClick={() => {
                                                        onRunSuggested?.(card.id);
                                                    }}
                                                >
                                                    {runLabel}
                                                </Button>
                                            </>
                                        }
                                    />
                                    {/*
                                Spec 1969-1973's cost line, on the screen and under the
                                row it is about. It is the same sentence the confirm
                                dialog draws, built once by the estimate module, so the
                                card and the dialog cannot come to disagree.
                            */}
                                    {warning !== undefined && <ProseBlock variant="departure">{warning}</ProseBlock>}
                                </React.Fragment>
                            );
                        })}
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
                </>
            )}

            {/*
                The Results tab, IN THE RUN TAB'S PLACE -- the same slot on the band, so
                the two modes of one panel exchange their contents rather than stacking.

                There is no empty form here and that is deliberate: when the list is empty
                the Results button is disabled and this branch is unreachable, so Rule 7a's
                "no 'No results yet' sentence" (spec:1684) holds by construction rather
                than by remembering not to write one.
            */}
            {tab === "results" && (
                <PanelRows>
                    <Box role="list" aria-label="Results" data-testid="analyze-results">
                        {results.map((card) => (
                            <Box role="listitem" key={card.id}>
                                <ResultRow
                                    card={card}
                                    active={card.id === activeResultId}
                                    {...(onOpenResult === undefined ? {} : { onOpen: onOpenResult })}
                                />
                            </Box>
                        ))}
                    </Box>
                </PanelRows>
            )}

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
                        <SectionAddButton tooltip={SAVE_AS_RECIPE_TITLE} label={SAVE_AS_RECIPE_TITLE} disabled />
                        <ComingTag />
                    </>
                }
            />

            <PanelSection sectionId="analyze.more" label="More" empty />

            <RunAlgorithmModal
                opened={pickerOpen}
                graphtyRef={graphtyRef}
                onClose={() => {
                    setPickerOpen(false);
                }}
            />
        </>
    );
}
