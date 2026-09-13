import { ActionRow, FieldRow, InfoCircle, PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { ActionIcon, Box, Menu, Pill, Switch } from "@mantine/core";
import React from "react";

import { keyChipFor } from "../bindings";
import { COMING_GROUP_SENTENCE, ComingTag, PanelRows, PanelSection, SectionAddButton } from "./PanelSection";

/**
 * Which set the Explore search runs over. The scope is what the field contains
 * (Rule 6), so it is a token inside the search box rather than a row above it.
 *
 * Named in {@link ExplorePanelProps.scope}, so the caller that owns the scope can name its two
 * values.
 * @public
 */
export type ExploreSearchScope = "all" | "visible";

/** The two scope names, in the words spec 03 section 2.2 prints. */
const SCOPE_LABELS: Readonly<Record<ExploreSearchScope, string>> = {
    all: "All",
    visible: "Visible nodes",
};

/** The search field's placeholder and accessible name (Main.dc.html:341). */
const SEARCH_LABEL = "Search nodes and edges";

/** The syntax sentence the search row's info circle carries (Main.dc.html:347). */
const SEARCH_SYNTAX = "Prefix with id:, type:, exact: or regex:, or start with = for an expression.";

/**
 * The scope sentence the field's own tooltip carries (Main.dc.html:334), after the
 * verb and its chip.
 */
const SEARCH_SCOPE_SENTENCE = "Scope: All nodes; the other scope is Visible nodes.";

/**
 * The field's tooltip: the verb, its chip when the binding has shipped, then the scope
 * sentence. The chip comes from `keyChipFor` rather than being typed here, so an
 * unshipped binding takes its chip off this tooltip too (spec 04 section 10.3: "an
 * unshipped row carries no key chip anywhere").
 */
const SEARCH_TITLE = `${withChip(SEARCH_LABEL, keyChipFor("focusExploreSearch"))}. ${SEARCH_SCOPE_SENTENCE}`;

/** The name of the second tier 1 action row (Main.dc.html:372). */
const SELECT_LABEL = "Select";

/** The name of the first tier 1 action row (Main.dc.html:360). */
const SELECT_ALL_VISIBLE_LABEL = "Select all visible";

/**
 * The scope token's horizontal padding inside the search box, and the 2px gap
 * between its word and its chevron (Main.dc.html:344). Neither is a grid cell:
 * they are the inside of one control, as compact-mantine's own rows name theirs.
 */
const SCOPE_PAD_X = 6;

/** The gap between the scope word and its chevron. */
const SCOPE_GAP = 2;

/**
 * The Select split button's menu, in the order spec 03 section 2.2 item 4 lists
 * it. None of these has shipped: multi-select and edge selection are new work in
 * graphty-element (5.8), so the menu takes 5.8's GROUP form -- one statement at
 * the top, every row dimmed and disabled, and no per-row tag.
 */
const SELECT_MENU_ROWS: readonly string[] = [
    "Invert",
    "Neighbors of selection",
    "Same group as selection",
    "From list",
    "By expression",
    "Select matching filter",
    "Select edges between selected",
    "Select largest connected part",
    "Save selection as set...",
];

/** The destination sentence of each of the three Explore libraries (Main.dc.html). */
const FILTERS_INFO = "Saved filters: saved in this browser on this computer. Export a file to move it.";

/** The Sets library's destination sentence (Main.dc.html:509). */
const SETS_INFO = "Selection sets: saved in this browser on this computer. Export a file to move it.";

/** The Views library's destination sentence (Main.dc.html:530). */
const VIEWS_INFO = "View bookmarks: saved in this browser on this computer. Export a file to move it.";

/** The unbuilt pattern search, with its 6.3 technical half and its 5.8 reason. */
const FIND_A_PATTERN_TITLE = "Find a pattern (subgraph search). Coming";

/** The unbuilt expansion door, whose 5.8 reason rides in its title (spec 03 section 2.2). */
const NEIGHBORHOOD_TITLE = "Neighborhood expansion. Coming";

/**
 * The text of a control's tooltip: the verb, then the key chip when the action
 * has shipped. An unshipped action carries no chip anywhere (10.3).
 * @param text - the verb, in the register's own words.
 * @param chip - the chip, or null when the action has no chord or has not shipped.
 * @returns the tooltip text.
 */
function withChip(text: string, chip: string | null): string {
    return chip === null ? text : `${text} (${chip})`;
}

/**
 * One active filter chip.
 *
 * Built by the caller and handed in through {@link ExplorePanelProps.filterChips}.
 * @public
 */
export interface ExploreFilterChip {
    /** Stable id, unique in the strip. */
    readonly id: string;
    /** The chip's text, which is the user's own filter in words. */
    readonly label: string;
    /** Removes this filter. */
    readonly onRemove: () => void;
}

/**
 * Props of the Explore panel body.
 */
export interface ExplorePanelProps {
    /** The search query. */
    readonly query?: string;
    /** Search query change. */
    readonly onQueryChange?: (query: string) => void;
    /** Which set the search runs over. */
    readonly scope?: ExploreSearchScope;
    /** Scope change. */
    readonly onScopeChange?: (scope: ExploreSearchScope) => void;
    /**
     * The scope `Select all visible` will act on, e.g. "20 nodes". Floor item 4:
     * the row states what it acts on before it acts, so the count is resident.
     */
    readonly visibleScopeLabel?: string;
    /** Selects every visible node. */
    readonly onSelectAllVisible?: () => void;
    /** The active filter chips. No chip is drawn while none is active. */
    readonly filterChips?: readonly ExploreFilterChip[];
    /** Clears every filter. Drawn from two chips (spec 03 section 2.2 item 2). */
    readonly onClearAllFilters?: () => void;
    /** Whether a filter rule exists, which is what the Filters `+` needs. */
    readonly hasFilterRule?: boolean;
    /** Whether anything is selected, which is what the Sets and Notes `+` need. */
    readonly hasSelection?: boolean;
    /**
     * Whether the data carries a Time role. Without one, `Step through time`
     * does not render at all -- Rule 7c, a section the data cannot support.
     */
    readonly hasTimeRole?: boolean;
    /** Whether the time slider overlay is on. */
    readonly timeSliderOn?: boolean;
    /** Turns the time slider overlay on or off. */
    readonly onTimeSliderChange?: (on: boolean) => void;
    /** Adds the first filter rule. */
    readonly onAddFilterRule?: () => void;
    /** Saves the current filter. */
    readonly onSaveFilter?: () => void;
    /** Saves the current selection as a set. */
    readonly onSaveSet?: () => void;
    /** Saves the current view as a bookmark. */
    readonly onSaveView?: () => void;
    /** Adds a note to the selection. */
    readonly onAddNote?: () => void;
}

/**
 * The Explore panel body: one RT-2 search row, the active filter chips, two
 * RT-7 action rows, and then the eight sections in the order spec 03 section
 * 2.2 freezes.
 *
 * The order is drawn whether or not a member is built (Rule 7c), which is why
 * `Find a pattern` and `Neighborhood expansion` sit between the three libraries
 * and `Notes` rather than in a block at the foot. `Step through time` is the one
 * section the order may lose: without a Time role the data cannot support it, so
 * it does not render at all.
 * @param props - the Explore panel's props.
 * @returns the Explore panel body.
 */
export function ExplorePanel(props: ExplorePanelProps): React.JSX.Element {
    const {
        query = "",
        onQueryChange,
        scope = "all",
        onScopeChange,
        visibleScopeLabel,
        onSelectAllVisible,
        filterChips = [],
        onClearAllFilters,
        hasFilterRule = false,
        hasSelection = false,
        hasTimeRole = false,
        timeSliderOn = false,
        onTimeSliderChange,
        onAddFilterRule,
        onSaveFilter,
        onSaveSet,
        onSaveView,
        onAddNote,
    } = props;

    const selectAllTooltip = withChip(SELECT_ALL_VISIBLE_LABEL, keyChipFor("selectAllVisible"));
    const noteTooltip = withChip("Note", keyChipFor("addNote"));

    return (
        <>
            <PanelRows>
                {/*
                    RT-2. The query and the set it searches are one thing, so
                    they share one 224px box divided by a 1px hairline of panel
                    background; the trailing 24px slot carries the syntax
                    sentence. compact-mantine's CompoundRow draws values rather
                    than an editable field, so the box is composed here out of
                    the same tokens it uses.
                */}
                <FieldRow
                    groupLabel={SEARCH_LABEL}
                    trailing={<InfoCircle label={SEARCH_LABEL}>{SEARCH_SYNTAX}</InfoCircle>}
                    // The content region's own top pad is 0 (spec 03 section
                    // 1.5); the first row carries the 8 (Main.dc.html:333).
                    style={{ marginBlockStart: PANEL_GRID.SECTION_PAD_BOTTOM }}
                >
                    <Box
                        title={SEARCH_TITLE}
                        data-testid="explore-search"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            width: "100%",
                            height: PANEL_GRID.CONTROL_HEIGHT,
                            background: PANEL_INK.SURFACE,
                            borderRadius: "var(--mantine-radius-sm)",
                            boxSizing: "border-box",
                            overflow: "hidden",
                        }}
                    >
                        <input
                            type="text"
                            value={query}
                            aria-label={SEARCH_LABEL}
                            // The `/` binding's receiver: the dispatcher owns the key
                            // and focuses this field through the one hook it can find
                            // after the panel has mounted (spec 04 section 10).
                            data-testid="explore-search-input"
                            placeholder={SEARCH_LABEL}
                            onChange={(event) => {
                                onQueryChange?.(event.currentTarget.value);
                            }}
                            style={{
                                flex: "1 1 0",
                                minWidth: 0,
                                height: PANEL_GRID.CONTROL_HEIGHT,
                                paddingInline: PANEL_GRID.TRAIL_GAP,
                                border: "none",
                                outlineOffset: -2,
                                background: "transparent",
                                color: PANEL_INK.VALUE,
                                fontSize: "var(--mantine-font-size-sm)",
                            }}
                        />
                        <Box
                            aria-hidden="true"
                            style={{
                                flex: "0 0 auto",
                                width: 1,
                                height: PANEL_GRID.CONTROL_HEIGHT,
                                background: PANEL_INK.PANEL,
                            }}
                        />
                        <Menu position="bottom-end" withinPortal shadow="md">
                            <Menu.Target>
                                <button
                                    type="button"
                                    aria-label={`Search scope: ${SCOPE_LABELS[scope]}`}
                                    data-testid="explore-search-scope"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: SCOPE_GAP,
                                        flex: "0 0 auto",
                                        height: PANEL_GRID.CONTROL_HEIGHT,
                                        paddingInline: SCOPE_PAD_X,
                                        border: "none",
                                        background: "transparent",
                                        color: PANEL_INK.VALUE,
                                        fontSize: "var(--mantine-font-size-sm)",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {SCOPE_LABELS[scope]}
                                    <UiGlyph name="chevronDown" size={PANEL_GRID.CHEVRON} />
                                </button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item
                                    onClick={() => {
                                        onScopeChange?.("all");
                                    }}
                                >
                                    {SCOPE_LABELS.all}
                                </Menu.Item>
                                <Menu.Item
                                    onClick={() => {
                                        onScopeChange?.("visible");
                                    }}
                                >
                                    {SCOPE_LABELS.visible}
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Box>
                </FieldRow>

                {/* Zero chips is not a row: a strip whose content is "nothing
                    here" is not rendered (spec 04 section 5.2). */}
                {filterChips.length > 0 && (
                    <Box
                        data-testid="explore-filter-chips"
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: PANEL_GRID.TRIPLE_GAP,
                            paddingBlock: PANEL_GRID.TRIPLE_GAP,
                        }}
                    >
                        {filterChips.map((chip) => (
                            <Pill key={chip.id} withRemoveButton size="sm" onRemove={chip.onRemove}>
                                {chip.label}
                            </Pill>
                        ))}
                        {filterChips.length > 1 && (
                            <button
                                type="button"
                                onClick={onClearAllFilters}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    color: PANEL_INK.CHROME,
                                    fontSize: "var(--mantine-font-size-sm)",
                                    cursor: "pointer",
                                }}
                            >
                                Clear all
                            </button>
                        )}
                    </Box>
                )}

                <ActionRow
                    state={SELECT_ALL_VISIBLE_LABEL}
                    stateTitle={selectAllTooltip}
                    residentActions={
                        visibleScopeLabel === undefined ? undefined : (
                            <Box
                                component="span"
                                data-testid="explore-select-all-scope"
                                style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}
                            >
                                {visibleScopeLabel}
                            </Box>
                        )
                    }
                    onClick={() => {
                        onSelectAllVisible?.();
                    }}
                />

                <ActionRow
                    state={SELECT_LABEL}
                    residentActions={
                        <Menu position="bottom-end" withinPortal shadow="md">
                            <Menu.Target>
                                <ActionIcon
                                    type="button"
                                    variant="subtle"
                                    size={PANEL_GRID.CONTROL_HEIGHT}
                                    radius="sm"
                                    c={PANEL_INK.CHROME}
                                    aria-label={SELECT_LABEL}
                                    data-testid="explore-select-menu"
                                >
                                    <UiGlyph name="chevronDown" size={PANEL_GRID.CHEVRON} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>{COMING_GROUP_SENTENCE}</Menu.Label>
                                {SELECT_MENU_ROWS.map((row) => (
                                    <Menu.Item key={row} disabled>
                                        {row}
                                    </Menu.Item>
                                ))}
                            </Menu.Dropdown>
                        </Menu>
                    }
                />
            </PanelRows>

            <PanelSection
                sectionId="explore.filterBuilder"
                label="Filter builder"
                empty
                actions={
                    <SectionAddButton
                        tooltip="Add a rule"
                        label="Add a rule"
                        onClick={onAddFilterRule}
                    />
                }
            />

            <PanelSection
                sectionId="explore.filters"
                label="Filters"
                empty
                info={FILTERS_INFO}
                actions={
                    <SectionAddButton
                        tooltip={hasFilterRule ? "Save as filter..." : "Save as filter... Build a filter first"}
                        label={hasFilterRule ? "Save as filter..." : "Save as filter... Build a filter first"}
                        disabled={!hasFilterRule}
                        onClick={onSaveFilter}
                    />
                }
            />

            <PanelSection
                sectionId="explore.sets"
                label="Sets"
                empty
                info={SETS_INFO}
                actions={
                    <SectionAddButton
                        tooltip={
                            hasSelection
                                ? "Save selection as set..."
                                : "Save selection as set... Select something first"
                        }
                        label={
                            hasSelection
                                ? "Save selection as set..."
                                : "Save selection as set... Select something first"
                        }
                        disabled={!hasSelection}
                        onClick={onSaveSet}
                    />
                }
            />

            <PanelSection
                sectionId="explore.views"
                label="Views"
                empty
                info={VIEWS_INFO}
                actions={<SectionAddButton tooltip="Save as view..." label="Save as view..." onClick={onSaveView} />}
            />

            {/* An isolated unshipped row, and a run of two, keeps the per-row
                tag (5.8). Find a pattern has the room for it on screen. */}
            <Box title={FIND_A_PATTERN_TITLE} data-testid="explore-find-a-pattern">
                <PanelSection sectionId="explore.findPattern" label="Find a pattern" empty actions={<ComingTag />} />
            </Box>

            {/* The same run's second row. Measured at 256, its name and the
                state mark behind the door leave no room for the pill, so the
                5.8 reason rides in the row's title instead (spec 03 section
                2.2 item 10). */}
            <Box title={NEIGHBORHOOD_TITLE} data-testid="explore-neighborhood-expansion">
                <PanelSection sectionId="explore.neighborhood" label="Neighborhood expansion" empty />
            </Box>

            {hasTimeRole && (
                <PanelSection
                    sectionId="explore.time"
                    label="Step through time"
                    empty
                    actions={
                        <Switch
                            size="xs"
                            checked={timeSliderOn}
                            aria-label={withChip("Step through time", keyChipFor("toggleTimeSlider"))}
                            data-testid="explore-time-switch"
                            onChange={(event) => {
                                onTimeSliderChange?.(event.currentTarget.checked);
                            }}
                        />
                    }
                />
            )}

            <PanelSection
                sectionId="explore.notes"
                label="Notes"
                empty
                actions={
                    <SectionAddButton
                        tooltip={hasSelection ? noteTooltip : `${noteTooltip}. Select something first`}
                        label={hasSelection ? "Note" : "Note. Select something first"}
                        disabled={!hasSelection}
                        onClick={onAddNote}
                    />
                }
            />
        </>
    );
}
