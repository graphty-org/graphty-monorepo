/**
 * Filters (design/data/filter-cards.md section 5, design/ui/selection-groups/spec.md section 3.3):
 * the Data place's Filters section, a flat list of condition cards, and the header chip. Each card
 * is one of graphty-element's filter conditions (`visibility.conditions`), and says what stays: its
 * body is the selection editor, starting with All nodes and narrowed by Keep and Except. One card
 * is open at a time; every other card is one row: its on box, its name and its count. Order never
 * matters. The app holds only a card not yet written.
 */

import { ControlSection, EntityChip, focusWithRing, InlineRename, SegmentedControl } from "@graphty/compact-mantine";
import type {
    FilterCondition,
    FilterConditionCount,
    GraphSession,
    HistoryStepId,
    SourceKey,
    UnionLeaf,
} from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Button,
    Checkbox,
    CloseButton,
    Group,
    Menu,
    Stack,
    Text,
    Tooltip,
    UnstyledButton,
    VisuallyHidden,
} from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { selectionWorkspaceOn } from "../features";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { FilterSelection } from "../selection/FilterSelection";
import { addStep, editBranch, newSelection } from "../selection/model";
import { type SelectionMenuItem, SelectionMenuItems } from "../selection/SelectionMenu";
import { useSteps } from "../selection/useSteps";
import { filterSelection, type PickSection, ruleOfField, sideOf } from "../selection/values";
import { cardsWords, rowTest, rowWords, shownWords, stepWords, VERB_WORDS } from "../selection/words";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type CardField, cardFields, type Side } from "../style/cards";
import { panelsInView, reportTimeError, timelineOn, unitOf } from "../time/timeActions";
import { windowWords } from "../time/timeWords";
import {
    conditionWords,
    keepChange,
    newConditionId,
    openTimeCard,
    PLUS,
    shapeOf,
    takeDraftOpener,
    TIME_ROW,
    writeCondition,
} from "./filterCards";
import { chipName, chipWords, statusWords } from "./filterWords";
import { useVisibilityVersion } from "./useVisibilityVersion";

/** The name of the time window, in the "+" list, its card and the inspector. */
const TIME_WINDOW = "Time window";

/** Where focus goes once the Filters section draws next: a card (or its on box), or `PLUS` for "+". */
let pendingFocus: { readonly target: string; readonly onBox?: boolean } | null = null;

/** While a new card is taken back, its removal is no filter change to say: "Filter not added" says it. */
let takingBack = 0;

/** The controls that open a new filter card and stay on screen: the canvas toolbar's Filters, "+". */
const OPENS_FILTERS = '[data-command="filters.open"], [data-filters-plus] [data-add]';

/** A card's on box, inside the card. */
const ON_BOX = ".dp-filter-on input[type=checkbox]";

/**
 * Focuses a card in the Filters section, its on box, or the section's "+".
 * @param target - a card's id, or `PLUS`.
 * @param onBox - the card's on box rather than the card.
 * @returns whether that control is on the page.
 */
function focusCard(target: string, onBox = false): boolean {
    const card = `[role=list][aria-label="Filters"] [data-id="${CSS.escape(target)}"]`;
    let selector = card;
    if (target === PLUS) {
        selector = "[data-filters-plus] [data-add]";
    } else if (onBox) {
        selector = `${card} ${ON_BOX}`;
    }
    const control = document.querySelector<HTMLElement>(selector);
    control?.focus();
    return control !== null;
}

/**
 * A card not yet written: the id it is written with, its side, and the field it opened on (an
 * attribute's Filter to...).
 */
interface Draft {
    readonly id: string;
    readonly side: Side;
    readonly field?: CardField;
}

/**
 * A new card's selection over the full graph: one group starting with All (a card says what
 * stays), with a Keep step on a field when the card opened on one (an attribute's Filter to...).
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @param field - the field, if any.
 * @param source - the load it is made for, if any.
 * @returns the selection.
 */
function newFilterSelection(session: GraphSession, side: Side, field?: CardField, source?: SourceKey): UnionLeaf {
    const fresh = newSelection(side === "node" ? "nodes" : "edges", "graph");
    // A load's filter starts from that load's elements, so its counts read "N of that load's".
    const made = source === undefined ? fresh : { ...fresh, sources: [source] };
    const all = editBranch(made, made.branches[0].id ?? "", { start: "all" });
    const branch = all.branches[0].id ?? "";
    return field === undefined ? all : addStep(all, branch, "keep", ruleOfField(session, field)).rule;
}

/**
 * Whether a condition hides anything when it is on: keep and exclude do, select does not.
 * @param condition - the condition.
 * @returns true when it hides.
 */
const hides = (condition: FilterCondition): boolean => condition.effect !== "select";

/**
 * The Filters section: one card per condition, in the element's order, the new cards while they
 * have no value, then the time window's row. "+" adds a card. One card is open at a time; the rest
 * rest as their summary. A load's section lists that load's filters, and "+" there makes one for
 * that load (graphty-element's `FilterCondition.source`): it judges only that load's nodes and
 * edges, and counts "N of that load's". The primary section takes the canvas toolbar's Filters and
 * an attribute's Filter to..., and holds the time window's row.
 * @param props - Component props
 * @param props.source - the load whose filters it lists: those made for it, and, when it is the
 * only load (`primary`), those of no load too
 * @param props.unscoped - with no `source`, list only the filters of no load (beside each load's
 * own section); otherwise every filter
 * @param props.primary - whether it is the section the toolbar and Filter to... open (default true)
 * @param props.headingLevel - its heading's level, under a load's own section
 * @returns the section.
 */
export function FiltersSection({
    source,
    unscoped = false,
    primary = true,
    headingLevel,
}: Readonly<{
    source?: SourceKey;
    unscoped?: boolean;
    primary?: boolean;
    headingLevel?: 2 | 3;
}> = {}): React.JSX.Element {
    const { session, store } = useWorkspace();
    const version = useVisibilityVersion(session);
    const asked = useWorkspaceState((state) => state.filterDraft);
    const [drafts, setDrafts] = useState<readonly Draft[]>([]);
    const [openId, setOpenId] = useState<string | null>(null);
    const keys = new Set(session?.data.sources().map((each) => each.key) ?? []);
    // A filter of a load that is gone is listed with the filters of no load, so it can be removed.
    const ownless = (condition: FilterCondition): boolean =>
        condition.source === undefined || !keys.has(condition.source);
    const listed = (condition: FilterCondition): boolean => {
        if (source !== undefined) {
            return condition.source === source || (primary && ownless(condition));
        }
        return !unscoped || ownless(condition);
    };
    const conditions = (session?.visibility.conditions ?? []).filter(listed);
    // Once written, a draft is one of the element's conditions, drawn by the same card, and is let
    // go: removed later, it must not come back as a draft.
    const waiting = drafts.filter((each) => !conditions.some((c) => c.id === each.id));
    const ids = conditions.map((c) => c.id).join("\n");
    useEffect(() => {
        const held = new Set(ids.split("\n"));
        setDrafts((now) => {
            const left = now.filter((each) => !held.has(each.id));
            return left.length === now.length ? now : left;
        });
    }, [ids]);
    const counts = session?.visibility.conditionCounts() ?? [];

    useEffect(() => {
        if (pendingFocus !== null && focusCard(pendingFocus.target, pendingFocus.onBox)) {
            pendingFocus = null;
        }
    }, [version]);

    // The control that opened the newest card, kept only when it is one that opens filters (the
    // canvas toolbar's Filters, "Add filter"): focus returns to it when the new card goes (Cancel,
    // Escape on its empty picker, Done with no step) and it is still on screen, else to "Add
    // filter". Opened from Quick actions or a menu's Filter to..., what held focus is the page body
    // or a control the closing popup hands focus to, never one that opens filters. The workspace
    // covers the canvas, and its toolbar, until it closes: focus moves once it has.
    const openedFrom = useRef<HTMLElement | null>(null);
    const [goingBack, setGoingBack] = useState<{ readonly to: HTMLElement | null } | null>(null);
    const covered = useWorkspaceState((state) => state.selectionWorkspace !== null);
    useEffect(() => {
        if (goingBack === null || covered) {
            return;
        }
        setGoingBack(null);
        // A control the reader moved to while the workspace was closing keeps focus and its keys.
        const at = document.activeElement;
        if (at !== null && at !== document.body && at.isConnected && at.closest(".sel-ws") === null) {
            return;
        }
        const { to } = goingBack;
        if (to?.isConnected === true && to.checkVisibility()) {
            to.focus();
            return;
        }
        focusCard(PLUS);
    }, [goingBack, covered]);
    const backToOpener = (): void => {
        setGoingBack({ to: openedFrom.current });
        openedFrom.current = null;
    };
    // A new card: its value picker opens at once, or on a field, that field's step card.
    const open = (side: Side, field?: CardField, from: Element | null = document.activeElement): void => {
        openedFrom.current = from instanceof HTMLElement && from.matches(OPENS_FILTERS) ? from : null;
        const id = newConditionId(
            session?.visibility.conditions ?? [],
            drafts.map((each) => each.id),
        );
        setDrafts((now) => [...now, { id, side, ...(field === undefined ? {} : { field }) }]);
        setOpenId(id);
    };
    const openRef = useRef(open);
    openRef.current = open;
    const listedRef = useRef(listed);
    listedRef.current = listed;
    // An attribute's Filter to... opens a card on it; the toolbar's Filters opens "+".
    useEffect(() => {
        if (asked === null || session === null) {
            return;
        }
        // The toolbar's Filters edits the one filter there is, in whichever section lists it, shows
        // two or more where they are listed, and starts one only when there is none.
        const saved = session.visibility.conditions;
        if (asked === PLUS && saved.length === 1 && listedRef.current(saved[0])) {
            setOpenId(saved[0].id);
        }
        if (!primary) {
            return;
        }
        store.set({ filterDraft: null });
        // What held focus when the card was asked for, not whatever holds it a render later.
        const from = takeDraftOpener();
        if (asked === PLUS) {
            if (saved.length === 0) {
                openRef.current("node", undefined, from);
            }
            return;
        }
        const at = asked.indexOf(":");
        const side = asked.slice(0, at);
        const path = asked.slice(at + 1);
        if (side === "node" || side === "edge") {
            const field = cardFields(session, side).find((each) => each.path === path);
            if (field !== undefined) {
                openRef.current(side, field, from);
            }
        }
    }, [asked, session, store, primary]);

    const timeCardAdded = useWorkspaceState((state) => state.timeWindowCard);
    // The Time window card: added from "+" (R5), or a window put on from elsewhere (the dock, a key).
    const timed =
        primary && session !== null && session.time.field !== null && (timeCardAdded || session.time.current !== null);
    const plus =
        session === null ? null : (
            <span data-filters-plus="">
                <Tooltip label="Add filter">
                    <ActionIcon
                        variant="subtle"
                        data-add
                        aria-label="Add filter"
                        onClick={() => {
                            open("node");
                        }}
                    >
                        <GLYPHS.add size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </span>
        );
    // The filter's own picker entry: the Time window, while a time field has no Time window card.
    const timePick = (onPicked: () => void): readonly PickSection[] =>
        !session?.time.field || timed
            ? []
            : [
                  {
                      group: "Time",
                      items: [
                          {
                              key: "time",
                              name: TIME_WINDOW,
                              glyph: GLYPHS.time,
                              onPick: () => {
                                  onPicked();
                                  pendingFocus = { target: TIME_ROW };
                                  store.set({ timeWindowCard: true });
                                  session.time.pause();
                                  session.time.window({}).then(() => {
                                      openTimeCard(store);
                                  }, reportTimeError(store));
                              },
                          },
                      ],
                  },
              ];
    const written = conditions.map((condition) => ({ id: condition.id, condition, draft: undefined }));
    const fresh = waiting.map((each) => ({ id: each.id, condition: undefined, draft: each }));
    // In the selection workspace the newest filter is on top, a new one's row first, as Figma lists
    // layers; it stays there once written.
    const cards =
        session !== null && selectionWorkspaceOn(session)
            ? [...fresh, ...written.toReversed()]
            : [...written, ...fresh];
    const empty = cards.length === 0 && !timed;
    // What the cards together leave, on the header: "Passes none" when they empty the picture.
    // A load's section says what its filters leave of that load.
    let summary = session?.visibility.summary ?? null;
    if (session !== null && source !== undefined) {
        summary = session.visibility.summaryOf(source);
    }
    // Kept while a card's workspace is open: what the cards leave together is another fact than the
    // card's own count in the workspace's header (spec 3.0, ws-polish 3).
    const together =
        // Drawn only when two or more cards are on: one card's own count already says it.
        summary === null || conditions.filter((c) => c.on && hides(c)).length < 2 ? null : (
            <Text size="sm" className="dp-filters-count" data-filters-count="">
                {summary.visibleNodes === 0
                    ? "Passes none"
                    : `${formatNumber(summary.visibleNodes)} of ${formatNumber(summary.totalNodes)}`}
            </Text>
        );

    return (
        <ControlSection
            label="Filters"
            headingLevel={headingLevel}
            actions={
                <Group gap={4} wrap="nowrap">
                    {together}
                    {plus}
                </Group>
            }
            empty={empty}
        >
            {empty || session === null ? null : (
                <Stack
                    component="ul"
                    role="list"
                    aria-label="Filters"
                    gap={selectionWorkspaceOn(session) ? 2 : 6}
                    className="dp-filters"
                >
                    {cards.map((each) => (
                        // One list, keyed by id: a draft written keeps its card (and focus) as the condition.
                        <FilterCard
                            key={each.id}
                            session={session}
                            store={store}
                            id={each.id}
                            condition={each.condition}
                            count={counts.find((c) => c.id === each.id)}
                            draft={each.draft}
                            source={source}
                            timePick={timePick}
                            open={openId === each.id}
                            onOpen={(next) => {
                                setOpenId(next ? each.id : null);
                            }}
                            onDiscard={() => {
                                setDrafts((now) => now.filter((draft) => draft.id !== each.id));
                                backToOpener();
                            }}
                            onDuplicate={(copy) => {
                                setOpenId(copy);
                            }}
                            onRemoved={() => {
                                const at = conditions.findIndex((c) => c.id === each.id);
                                pendingFocus = { target: conditions[at + 1]?.id ?? conditions[at - 1]?.id ?? PLUS };
                            }}
                        />
                    ))}
                    {timed && <TimeRow session={session} store={store} />}
                </Stack>
            )}
        </ControlSection>
    );
}

/**
 * A card's count: a node chip and an edge chip for the halves the element counted ("140 of 900"),
 * or the hidden-column mark when its rule reads a column that is not there.
 * @param props - Component props
 * @param props.count - the element's count, or undefined for a card not yet written
 * @param props.effect - what the card does with what it matches: its count says what stays
 * @returns the chips
 */
function CountChips({
    count,
    effect = "keep",
}: Readonly<{
    count: FilterConditionCount | undefined;
    effect?: FilterCondition["effect"];
}>): React.JSX.Element | null {
    if (count === undefined) {
        return null;
    }
    if (count.unresolved.length > 0) {
        return (
            <Tooltip label="Hidden or removed column">
                <span>
                    <GLYPHS.hide size={14} aria-hidden />
                    <VisuallyHidden>Hidden or removed column</VisuallyHidden>
                </span>
            </Tooltip>
        );
    }
    const halves = [
        ["node", count.nodes],
        ["edge", count.edges],
    ] as const;
    return (
        <>
            {halves.map(([kind, half]) =>
                half === null ? null : (
                    <EntityChip key={kind} kind={kind}>
                        {`${formatNumber(staying(effect, half))} of ${formatNumber(half.total)}${effect === "keep" ? shownWords({ count: half.matched, shown: half.shown }) : ""}`}
                    </EntityChip>
                ),
            )}
        </>
    );
}

/**
 * What stays of a half under a card: what it matches, the rest for a card that removes, all of it
 * for a Select card, which hides nothing.
 * @param effect - the card's effect.
 * @param half - the element's count of one half.
 * @param half.matched - how many match.
 * @param half.total - how many there are.
 * @returns how many stay.
 */
function staying(effect: FilterCondition["effect"], half: { matched: number; total: number }): number {
    if (effect === "exclude") {
        return half.total - half.matched;
    }
    return effect === "select" ? half.total : half.matched;
}

/** A selection with nothing in it: what a card with no editable selection reads (it counts nothing). */
const NO_SELECTION: UnionLeaf = { kind: "union", side: "nodes", within: "graph", branches: [] };

/**
 * One filter card (design/ui/selection-groups/spec.md, section 3.3). Open, it is the selection
 * editor: its title row holds the on box, the card's name and its count, and the title pane holds
 * Select N, Duplicate and Delete. Closed, it is one row: on box, name, count. A card has no effect
 * word: its selection is what stays. A card not yet written (`condition` undefined) offers Nodes |
 * Edges in its title pane and is written by its first step. A rule the editor cannot read keeps
 * its own words, read-only.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.id - the condition's id (a draft's is the id it is written with)
 * @param props.condition - the condition, or undefined for a draft
 * @param props.count - the element's count of it
 * @param props.draft - a card not yet written: its side and field
 * @param props.source - the load a new card is made for, or undefined for every load
 * @param props.timePick - the filter's own picker entries, given what to do once one is picked
 * @param props.open - whether its body is shown
 * @param props.onOpen - opens or closes it
 * @param props.onDiscard - drops a draft
 * @param props.onRemoved - called as the card is removed, so focus can move on
 * @param props.onDuplicate - called with the copy's id
 * @returns the card
 */
function FilterCard({
    session,
    store,
    id,
    condition,
    count,
    draft: fresh,
    source,
    timePick,
    open,
    onOpen,
    onDiscard,
    onRemoved,
    onDuplicate,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    id: string;
    condition: FilterCondition | undefined;
    count: FilterConditionCount | undefined;
    draft: Draft | undefined;
    source: SourceKey | undefined;
    timePick: (onPicked: () => void) => readonly PickSection[];
    open: boolean;
    onOpen: (open: boolean) => void;
    onDiscard: () => void;
    onRemoved: () => void;
    onDuplicate: (id: string) => void;
}>): React.JSX.Element {
    const box = useRef<HTMLDivElement>(null);
    // A card opened from its row takes focus on its title row once the editor draws, so the next
    // Space switches its on box rather than landing on "Add filter".
    const focusOnOpen = useRef(false);
    // Opened from its row while another selection's workspace is open: the workspace switches to
    // this card (selection spec 3.0).
    const switchIn = useRef(false);
    useEffect(() => {
        if (!open || !focusOnOpen.current) {
            return;
        }
        focusOnOpen.current = false;
        const title = box.current?.querySelector<HTMLElement>('[data-row="title"]');
        if (title !== null && title !== undefined) {
            focusWithRing(title);
        }
    }, [open]);
    // A new card's selection: one group starting with All, and a Keep step on its field when it has one.
    const [draftRule, setDraftRule] = useState(() =>
        newFilterSelection(session, fresh?.side ?? "node", fresh?.field, source),
    );
    const draft = condition === undefined;
    // Added in this card's life: Cancel in the workspace it opened takes it away again, written or not.
    const born = useRef(draft);
    // The newest step before a new card was asked for: taking the card away goes back to it.
    const before = useRef(draft ? (session.history.steps[session.history.position - 1]?.id ?? null) : null);
    if (!open) {
        born.current = false;
    }
    let side: Side = sideOf(draftRule);
    if (condition !== undefined) {
        // The side its rule reads, whatever its effect: a Filter out card on an edge value is on edges.
        const shape = shapeOf(session, { rule: condition.rule, effect: "keep" });
        side = shape.kind === "fields" ? shape.side : "node";
        if (condition.rule.kind === "union") {
            side = sideOf(condition.rule);
        }
    }
    // The card's selection is what stays; a Filter out card is read as All + Except.
    // A saved Select card hides nothing: it is shown read-only in its own words, counting what stays
    // (all of it), until graphty-element reads it as a card that stays (owner-decisions 2026-11-01).
    let selection: UnionLeaf | null = draftRule;
    if (!draft) {
        selection =
            condition.effect === "select" ? null : filterSelection(session, condition.rule, side, condition.effect);
    }
    const reading = useSteps(session, selection ?? NO_SELECTION);
    const stepless = draftRule.branches.every((branch) => branch.steps.length === 0);
    // The picker opens by itself only on arrival: after a side switch the reader uses "Keep...".
    const [switched, setSwitched] = useState(false);
    const remove = (): void => {
        if (draft) {
            onDiscard();
            return;
        }
        onRemoved();
        void writeCondition(store, () => session.visibility.removeCondition(id));
    };
    // Drawn: the values the card reads; said: the card's rule in words, as the filter chip says it.
    // In the selection workspace a card is named by what the reader typed, else by all its cards'
    // summary ("Louvain: Group 3 + Degree 8 to 36"), never only its first value.
    const cards = selectionWorkspaceOn(session);
    const [draftName, setDraftName] = useState<string | undefined>(undefined);
    const given = condition === undefined ? draftName : condition.name;
    const summary =
        selection === null || selection.branches.every((branch) => branch.steps.length === 0)
            ? undefined
            : cardsWords(session, selection, reading);
    const title = cards
        ? (given ?? summary ?? cardName(session, condition, selection, side, fresh?.field?.name))
        : cardName(session, condition, selection, side, fresh?.field?.name);
    const rename = (next: string | undefined): void => {
        if (condition === undefined) {
            setDraftName(next);
            return;
        }
        // One undo step, through the session: an empty name goes back to the cards' summary.
        void writeCondition(store, () => session.visibility.updateCondition(id, { name: next }));
    };
    const [renaming, setRenaming] = useState(false);
    const renameProps = cards ? { name: draftName, onRename: rename } : {};
    // A selection is said as its title says it; a rule no editor reads, in its own words.
    const name = title;
    // The box says what the element holds: a saved Select card that is on still selects, so it
    // reads on until the reader turns it off (its first edit writes it as a card that stays, off).
    const on = condition === undefined ? true : condition.on;
    const setOn = (next: boolean): void => {
        if (condition === undefined) {
            return;
        }
        const change =
            selection === null || condition.effect === "keep"
                ? { on: next }
                : { ...keepChange(selection, condition.effect), on: next };
        void writeCondition(store, () => session.visibility.updateCondition(id, change));
    };
    // The on box, named as the group eye is ("Use A"). In the open card it takes no Tab stop of its
    // own: Space on the title row switches it, and the title row says when it is off. On a resting
    // row in the selection workspace the row's group says the filter once, so its controls go by
    // short names (Use, Edit, More).
    const short = cards && !open;
    const onBox = (inEditor: boolean): React.ReactNode =>
        draft ? null : (
            <Tooltip label={inEditor ? `Use ${title} (Space)` : `Use ${title}`}>
                <Checkbox
                    size="xs"
                    className="dp-filter-on"
                    aria-label={short && !inEditor ? "Use" : `Use ${title}`}
                    tabIndex={inEditor ? -1 : undefined}
                    checked={on}
                    onChange={(event) => {
                        setOn(event.currentTarget.checked);
                    }}
                />
            </Tooltip>
        );
    const things = side === "node" ? "nodes" : "edges";
    const matched = reading.total.count;
    const menu: SelectionMenuItem[] = [
        {
            id: "select",
            label: `Select ${formatNumber(matched)}`,
            icon: "selection",
            group: "edit",
            reason: matched === 0 ? `No ${things} match` : null,
            onRun: () => {
                void session.selection.apply({ scope: reading.result }).then(() => {
                    store.set({ announcement: `Selected ${formatNumber(matched)} ${things}` });
                });
            },
        },
        ...(condition === undefined
            ? []
            : [
                  {
                      id: "duplicate",
                      label: "Duplicate",
                      icon: "duplicate" as const,
                      group: "edit" as const,
                      key: "Mod+D",
                      onRun: () => {
                          const copy = newConditionId(session.visibility.conditions);
                          const { id: _id, ...rest } = condition;
                          void writeCondition(store, () => session.visibility.addCondition({ ...rest, id: copy })).then(
                              () => {
                                  onDuplicate(copy);
                              },
                          );
                      },
                  },
              ]),
        { id: "delete", label: "Delete", icon: "delete", group: "remove", key: "Delete", onRun: remove },
    ];
    // A card that removes its matches shows none of them; only the others say how many are shown.
    const shownSuffix = condition?.effect === "exclude" ? "" : shownWords(reading.total);
    const ofAll = `${formatNumber(matched)} of ${formatNumber(reading.total.of)}`;
    const total = selection === null ? undefined : `${ofAll}${shownSuffix}`;
    // Spoken, the kind of thing counted follows the count, before what is shown: "12 of 77 nodes, 0 shown".
    const spoken = selection === null ? undefined : `${ofAll} ${things}${shownSuffix}`;
    // While a card's workspace is open the other cards keep their rows but drop their counts.
    const editing = useWorkspaceState((state) => state.selectionWorkspace?.host === "filter");

    return (
        <li>
            <div // NOSONAR(S6819): a condition card, drawn like every Filters card; a fieldset brings its own border and legend
                ref={box}
                role="group"
                data-id={id}
                tabIndex={-1}
                aria-label={spoken === undefined ? name : `${name}, ${spoken}`}
                className="ws-card dp-filter"
                data-off={on ? undefined : ""}
                data-open={open ? "" : undefined}
            >
                {open && selection !== null ? (
                    <FilterSelection
                        // A new card's side switch starts a new editor; writing it keeps this one.
                        key={side}
                        session={session}
                        store={store}
                        id={id}
                        source={source}
                        rule={selection}
                        effect={condition?.effect}
                        title={title}
                        lead={onBox(true)}
                        onTitleToggle={
                            draft
                                ? undefined
                                : () => {
                                      setOn(!on);
                                  }
                        }
                        titleOff={!on}
                        titleMenu={menu}
                        {...renameProps}
                        titleExtra={
                            draft ? (
                                // A new card's side; switching starts its selection again on the other side.
                                <SegmentedControl
                                    label="Filter on"
                                    fullWidth
                                    data={[
                                        { value: "node", label: "Nodes" },
                                        { value: "edge", label: "Edges" },
                                    ]}
                                    value={side}
                                    onChange={(value) => {
                                        setSwitched(true);
                                        setDraftRule(
                                            newFilterSelection(
                                                session,
                                                value === "edge" ? "edge" : "node",
                                                undefined,
                                                source,
                                            ),
                                        );
                                    }}
                                />
                            ) : undefined
                        }
                        openFirst={draft && !stepless}
                        // Only on arrival: a side switch keeps focus on Nodes | Edges, the picker shut
                        // and nothing said, so the arrows go on switching (WCAG 3.2.2, ws-polish 3).
                        openPicker={draft && stepless && !switched}
                        // A saved filter opened from its row or its Edit opens the workspace on it at once.
                        openTitle={(draft && switched) || switchIn.current || (cards && !draft)}
                        switchedSide={draft && switched}
                        hostPicks={timePick(() => {
                            if (draft) {
                                onDiscard();
                            }
                        })}
                        onDraft={setDraftRule}
                        onEmptyCancel={
                            draft || born.current
                                ? () => {
                                      born.current = false;
                                      if (!draft) {
                                          // The card's tick and edits go with it, and none can be redone.
                                          takingBack += 1;
                                          void writeCondition(store, () =>
                                              takeBack(session, id, before.current),
                                          ).finally(() => {
                                              takingBack -= 1;
                                          });
                                      }
                                      onDiscard();
                                  }
                                : undefined
                        }
                        onDone={() => {
                            if (draft && stepless) {
                                onDiscard();
                                return;
                            }
                            onOpen(false);
                            requestAnimationFrame(() => {
                                box.current?.querySelector<HTMLElement>(".dp-filter-name")?.focus();
                            });
                        }}
                    />
                ) : (
                    <div className="sel-row dp-filter-row">
                        {onBox(false)}
                        {cards && renaming && (
                            <InlineRename
                                value={title}
                                label={`Rename ${title}`}
                                onCommit={(typed) => {
                                    const text = typed.trim();
                                    if (text !== title) {
                                        rename(text === "" ? undefined : text);
                                    }
                                    setRenaming(false);
                                }}
                                onCancel={() => {
                                    setRenaming(false);
                                }}
                            />
                        )}
                        {/* The whole row opens the card, as Figma's collapsed layer rows do; the on box stays its own. */}
                        {!(cards && renaming) && (
                            <UnstyledButton
                                className="dp-filter-name"
                                aria-label={
                                    short
                                        ? ["Edit", ...(on ? [] : ["off"])].join(", ")
                                        : [
                                              title,
                                              ...(spoken === undefined ? [] : [spoken]),
                                              ...(on ? [] : ["off"]),
                                          ].join(", ")
                                }
                                aria-expanded={open}
                                onClick={() => {
                                    focusOnOpen.current = !open;
                                    switchIn.current = !open && store.get().selectionWorkspace !== null;
                                    onOpen(!open);
                                }}
                            >
                                {/* A long description wraps to two lines, then is cut short; its tooltip says it whole. */}
                                <Tooltip label={title} openDelay={500} multiline maw={280}>
                                    <Text
                                        size="sm"
                                        fw={cards ? undefined : 600}
                                        truncate={cards ? undefined : true}
                                        lineClamp={cards ? 2 : undefined}
                                        span
                                        className="dp-filter-title"
                                    >
                                        {title}
                                    </Text>
                                </Tooltip>
                                <span className="sel-spacer" />
                                {!editing && total === undefined && (
                                    <CountChips count={count} effect={condition?.effect} />
                                )}
                                {!editing && total !== undefined && (
                                    <Text size="sm" c="dimmed" span className="sel-count">
                                        {total}
                                    </Text>
                                )}
                            </UnstyledButton>
                        )}
                        {cards && !renaming && (
                            // The card's commands, Rename first (Figma's layer row menu).
                            <Menu position="bottom-end" withinPortal>
                                <Menu.Target>
                                    <ActionIcon variant="subtle" size="sm" className="dp-filter-more" aria-label="More">
                                        <GLYPHS.more size={14} aria-hidden />
                                    </ActionIcon>
                                </Menu.Target>
                                <Menu.Dropdown>
                                    <SelectionMenuItems
                                        items={[
                                            {
                                                id: "edit",
                                                label: "Edit",
                                                icon: "filter",
                                                group: "edit",
                                                key: "Enter",
                                                onRun: () => {
                                                    onOpen(true);
                                                },
                                            },
                                            {
                                                id: "rename",
                                                label: "Rename",
                                                icon: "rename",
                                                group: "edit",
                                                key: "F2",
                                                onRun: () => {
                                                    setRenaming(true);
                                                },
                                            },
                                            ...menu,
                                        ]}
                                    />
                                </Menu.Dropdown>
                            </Menu>
                        )}
                    </div>
                )}
                {open && selection === null && (
                    // A rule the editor cannot read: kept, read-only, in its words.
                    <Stack gap={4} className="dp-filter-body">
                        <Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>
                            {condition === undefined ? "" : conditionWords(session, condition.rule)}
                        </Text>
                        <Button size="compact-xs" variant="subtle" style={{ alignSelf: "flex-start" }} onClick={remove}>
                            Delete
                        </Button>
                    </Stack>
                )}
            </div>
        </li>
    );
}

/**
 * Takes a new card away again: back to the step before it was asked for, with nothing to redo, when
 * every step since is a filter step (its tick and edits); else (that step is gone from the history,
 * or other work came after it) by removing the card as one step.
 * @param session - the element's session.
 * @param id - the card's condition id.
 * @param before - the newest step before the card, or null when there was none.
 * @returns once taken away.
 */
function takeBack(session: GraphSession, id: string, before: HistoryStepId | null): PromiseLike<unknown> {
    const { steps, position } = session.history;
    const from = before === null ? 0 : steps.findIndex((step) => step.id === before) + 1;
    const since = steps.slice(from, position);
    if ((before === null || from > 0) && since.every((step) => step.slices.every((slice) => slice === "visibility"))) {
        return session.history.restoreTo(before, { redo: "drop" });
    }
    return session.visibility.removeCondition(id);
}

/**
 * A card's name: its first step as the step's row says it ("Degree min 10"), following its edits;
 * else its field, else its words.
 * @param session - the element's session.
 * @param condition - the condition, or undefined for a draft.
 * @param selection - its selection, or null.
 * @param side - nodes or edges.
 * @param field - a draft's field name.
 * @returns the name.
 */
function cardName(
    session: GraphSession,
    condition: FilterCondition | undefined,
    selection: UnionLeaf | null,
    side: Side,
    field: string | undefined,
): string {
    const first = selection?.branches.flatMap((branch) => branch.steps)[0];
    // A step no value names ("Rule": a tier 4 neighborhood, say) leaves the name to the rule's words.
    if (first !== undefined && (condition === undefined || stepWords(session, first, side).value !== "Rule")) {
        const words = rowWords(session, first, side);
        const test = rowTest(words);
        // A card says what stays: a first step that removes keeps its verb ("Except role volunteer").
        const verb = first.op === "except" ? [VERB_WORDS.except.word] : [];
        return [...verb, words.value, test].filter((each) => each !== "").join(" ");
    }
    if (condition === undefined) {
        return field ?? "New filter";
    }
    const words = conditionWords(session, condition.rule);
    if (condition.effect === "select") {
        return `Select ${words}`;
    }
    return condition.effect === "exclude" ? `${VERB_WORDS.except.word} ${words}` : words;
}

/**
 * The Time window card, once added from "+" or while a window is on: the condition card's header
 * (its count, an on box, remove) with no effect toggle, since the window has no effect to choose,
 * and a button that opens its settings in the inspector. It is the element state the dock moves.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @returns the card
 */
function TimeRow({ session, store }: Readonly<{ session: GraphSession; store: WorkspaceStore }>): React.JSX.Element {
    const { time } = session;
    const window = time.current;
    const words = window === null ? null : windowWords(window, unitOf(session), session.time.timeZone);
    const side = time.field?.edges === undefined ? "nodes" : "edges";
    const extent = time.extent();
    // The element's own counts: the window's one bin, of every timed element on the field's side.
    const inside =
        window === null || extent === null
            ? undefined
            : time.bins({ count: 1, from: Number(window.from), to: Number(window.to), scope: "all" })?.[0]?.[side];
    const name = words === null ? TIME_WINDOW : `${TIME_WINDOW} ${words}`;
    const apply = (on: boolean): void => {
        time.pause();
        time.window(on ? {} : null).then(() => undefined, reportTimeError(store));
    };
    // The condition card's header and on box, as every Filters card draws them; the title opens
    // the window's settings in the inspector, and the summary says where the window is.
    return (
        <li>
            <div // NOSONAR(S6819): a condition card, drawn like every Filters and Style card; a fieldset brings its own border and legend
                role="group"
                data-id={TIME_ROW}
                tabIndex={-1}
                aria-label={name}
                className="ws-card dp-filter"
                data-off={window === null ? "" : undefined}
            >
                <Group gap={4} wrap="nowrap">
                    <UnstyledButton
                        className="dp-filter-name"
                        onClick={() => {
                            openTimeCard(store);
                        }}
                    >
                        <Text size="xs" fw={600} truncate span>
                            {TIME_WINDOW}
                        </Text>
                    </UnstyledButton>
                    <Group gap={4} wrap="nowrap">
                        {inside === undefined || extent === null ? null : (
                            <EntityChip kind={side === "nodes" ? "node" : "edge"}>
                                {`${formatNumber(inside)} of ${formatNumber(extent[side].timed)}`}
                            </EntityChip>
                        )}
                    </Group>
                    <Tooltip label={`Remove ${TIME_WINDOW}`}>
                        <CloseButton
                            size="xs"
                            aria-label={`Remove ${TIME_WINDOW}`}
                            onClick={() => {
                                store.set({ timeWindowCard: false });
                                if (window !== null) {
                                    apply(false);
                                }
                                focusCard(PLUS);
                            }}
                        />
                    </Tooltip>
                </Group>
                <Group gap={4} wrap="nowrap" justify="flex-end" className="dp-filter-switches">
                    <Tooltip label={`Apply ${TIME_WINDOW}`}>
                        <Checkbox
                            size="xs"
                            aria-label={`Apply ${TIME_WINDOW}`}
                            checked={window !== null}
                            onChange={(event) => {
                                apply(event.currentTarget.checked);
                            }}
                        />
                    </Tooltip>
                </Group>
                {words === null ? null : (
                    <Text size="xs" c="dimmed" className="dp-filter-summary">
                        {words}
                    </Text>
                )}
            </div>
        </li>
    );
}

/**
 * Switches every card that hides off, and the time window, as one undo step. Select cards stay.
 * @param session - the element's session.
 * @param store - the chrome store.
 */
function clearFilters(session: GraphSession, store: WorkspaceStore): void {
    session
        .transaction("Clear filters", async (tx) => {
            for (const c of tx.visibility.conditions) {
                if (c.on && hides(c)) {
                    await tx.visibility.updateCondition(c.id, { on: false });
                }
            }
            if (timelineOn(session)) {
                if (tx.time.current !== null) {
                    await tx.time.window(null);
                }
            } else if (tx.visibility.window !== null) {
                await tx.visibility.setWindow(null);
            }
        })
        .catch(() => {
            store.set({ notice: { message: "The filter could not be changed.", error: true } });
        });
}

/**
 * The header's filter chip, "9 of 22 nodes", drawn while a card that hides is on, or a saved time
 * window applies with the timeline off and so no other control shows it; its name and tooltip name
 * what is on and it opens the Data place, where the Filters section is; its x switches them off. It
 * also puts each change on the status line.
 * @returns the chip, or nothing.
 */
export function FilterChip(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useVisibilityVersion(session);

    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        let { conditions } = session.visibility;
        return session.on("visibility:changed", () => {
            const now = session.visibility.conditions;
            if (now !== conditions) {
                conditions = now;
                // A card being edited says its own count; the filter's line waits for Done.
                if (store.get().editingSelection !== null || takingBack > 0) {
                    return;
                }
                store.set({
                    announcement: statusWords(
                        now.some((c) => c.on && hides(c)),
                        session.visibility.summary,
                    ),
                });
            }
        });
    }, [session, store]);

    const hiding = session?.visibility.conditions.filter((c) => c.on && hides(c)) ?? [];
    const savedWindow = session !== null && !timelineOn(session) && session.visibility.window !== null;
    if (session === null || (hiding.length === 0 && !savedWindow)) {
        return null;
    }
    const counts = session.visibility.conditionCounts();
    const { summary } = session.visibility;
    // Edges are counted when a card speaks of them, or when the filter left any out (a node card
    // hides the edges at the nodes it hides).
    const edges =
        savedWindow ||
        summary.visibleEdges < summary.totalEdges ||
        hiding.some((c) => (counts.find((each) => each.id === c.id)?.edges ?? null) !== null);
    const words = chipWords(summary, edges);
    // The time window is one of the filters in force, as the Filters list shows it.
    const window = session.time.field === null ? null : session.time.current;
    const on = [
        ...hiding.map((c) => conditionWords(session, c.rule)),
        ...(window === null ? [] : [`Time ${windowWords(window, unitOf(session), session.time.timeZone)}`]),
        ...(savedWindow ? ["Time window"] : []),
    ];
    const name = chipName(words, on);
    return (
        <Group gap={0} wrap="nowrap">
            <Tooltip label={name} multiline maw={280}>
                <Button
                    variant="subtle"
                    size="compact-xs"
                    aria-label={name}
                    leftSection={<GLYPHS.filter size={12} aria-hidden />}
                    onClick={() => {
                        store.set({ page: "panels", place: "data", ...panelsInView() });
                    }}
                >
                    {words}
                </Button>
            </Tooltip>
            <Tooltip label="Clear filters">
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label="Clear filters"
                    onClick={() => {
                        clearFilters(session, store);
                    }}
                >
                    <GLYPHS.close size={12} aria-hidden />
                </ActionIcon>
            </Tooltip>
        </Group>
    );
}
