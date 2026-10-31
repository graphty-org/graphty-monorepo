/**
 * Filters (design/data/filter-cards.md section 5): the Data place's Filters section, a flat list of
 * condition cards, and the header chip. Each card is one of graphty-element's filter conditions
 * (`visibility.conditions`): its count is the element's (`conditionCounts`), its Select / Filter to / Filter out
 * toggle writes the condition's effect, its box switches it on and off, and its body is the Which
 * picker's card for its field. Order never matters. The app holds only a card not yet written.
 */

import { ControlSection, EntityChip, SegmentedControl } from "@graphty/compact-mantine";
import type { FilterCondition, FilterConditionCount, GraphSession, RuleTree } from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Button,
    Checkbox,
    CloseButton,
    Group,
    Pill,
    Stack,
    Text,
    Tooltip,
    UnstyledButton,
    VisuallyHidden,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { isPanelEscape, isTypingTarget } from "../keys/keys";
import type { WorkspaceStore } from "../state/store";
import { useAnnounceChange } from "../state/useAnnounceChange";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type Card, type CardField, cardFields, newCard, type Side, SOURCE_PATH } from "../style/cards";
import { AddCondition, CardBody, type ExtraItem } from "../style/WhichPicker";
import { reportTimeError, unitOf } from "../time/timeActions";
import { windowWords } from "../time/timeWords";
import {
    conditionWords,
    keepReadings,
    newConditionId,
    openTimeCard,
    PLUS,
    ruleOfCards,
    sameRule,
    shapeOf,
    TIME_ROW,
    writeCondition,
} from "./filterCards";
import { chipTip, chipWords, statusWords } from "./filterWords";
import { useVisibilityVersion } from "./useVisibilityVersion";

/** The name of the time window, in the "+" list, its card and the inspector. */
const TIME_WINDOW = "Time window";

/** Where focus goes once the Filters section draws next: a card (or its on box), or `PLUS` for "+". */
let pendingFocus: { readonly target: string; readonly onBox?: boolean } | null = null;

/** A card's on box, inside the card. */
const ON_BOX = ".dp-filter-switches input[type=checkbox]";

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

/** A card not yet written: the id it is written with, the field it opened on, and its effect. */
interface Draft {
    readonly id: string;
    readonly field: CardField;
    readonly effect: StartEffect;
}

/**
 * The effect a new card is written with. A card from "+" starts on Select, which takes nothing out
 * of the picture (tier 4 round 1: 5 of 5 participants who made a card to mark lost part of the
 * picture first); an attribute's "Filter to..." starts on Filter to, as its words say.
 */
type StartEffect = { readonly effect: "select"; readonly within: "picture" } | { readonly effect: "keep" };

/** The effect that removes nothing. */
const SELECT: StartEffect = { effect: "select", within: "picture" };

/**
 * The fields a card can test on one kind. The Data source speaks of nodes and edges at once, so it
 * is offered once, apart.
 * @param session - the element's session.
 * @param side - nodes or edges.
 * @returns the fields.
 */
const valueFields = (session: GraphSession, side: Side): CardField[] =>
    cardFields(session, side).filter((field) => field.kind !== "source");

/**
 * Whether a condition hides anything when it is on: keep and exclude do, select does not.
 * @param condition - the condition.
 * @returns true when it hides.
 */
const hides = (condition: FilterCondition): boolean => condition.effect !== "select";

/** A card's action word for each effect, read in its name and on its toggle (glossary: filter step outcomes). */
const ACTION_WORDS: Record<FilterCondition["effect"], string> = {
    keep: "Filter to",
    select: "Select",
    exclude: "Filter out",
};

/**
 * The Filters section: one card per condition, in the element's order, the new cards while they
 * have no value, then the time window's row. "+" adds a card. One card is open at a time; the rest
 * rest as their summary.
 * @returns the section.
 */
export function FiltersSection(): React.JSX.Element {
    const { session, store } = useWorkspace();
    const version = useVisibilityVersion(session);
    const asked = useWorkspaceState((state) => state.filterDraft);
    const [drafts, setDrafts] = useState<readonly Draft[]>([]);
    const [adding, setAdding] = useState(false);
    const [openId, setOpenId] = useState<string | null>(null);
    const conditions = session?.visibility.conditions ?? [];
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

    const open = (field: CardField, effect: StartEffect = SELECT): void => {
        const id = newConditionId(
            session?.visibility.conditions ?? [],
            drafts.map((each) => each.id),
        );
        setDrafts((now) => [...now, { id, field, effect }]);
        setOpenId(id);
    };
    const openRef = useRef(open);
    openRef.current = open;
    // An attribute's Filter to... opens a card on it; the toolbar's Filters opens "+".
    useEffect(() => {
        if (asked === null || session === null) {
            return;
        }
        store.set({ filterDraft: null });
        if (asked === PLUS) {
            setAdding(true);
            return;
        }
        const at = asked.indexOf(":");
        const side = asked.slice(0, at);
        const path = asked.slice(at + 1);
        if (side === "node" || side === "edge") {
            const field = cardFields(session, side).find((each) => each.path === path);
            if (field !== undefined) {
                openRef.current(field, { effect: "keep" });
            }
        }
    }, [asked, session, store]);

    const timeCardAdded = useWorkspaceState((state) => state.timeWindowCard);
    // The Time window card: added from "+" (R5), or a window put on from elsewhere (the dock, a key).
    const timed = session !== null && session.time.field !== null && (timeCardAdded || session.time.current !== null);
    const plus =
        session === null ? null : (
            <span data-filters-plus="">
                <AddCondition
                    fields={[...valueFields(session, "node"), ...valueFields(session, "edge")]}
                    used={[]}
                    bySide
                    plus="Add filter"
                    opened={adding}
                    onOpened={setAdding}
                    onAdd={open}
                    extra={structureItems(
                        session,
                        store,
                        open,
                        (id) => {
                            setOpenId(id);
                        },
                        drafts.map((each) => each.id),
                        timed,
                    )}
                />
            </span>
        );
    const cards = [
        ...conditions.map((condition) => ({ id: condition.id, condition, field: undefined, effect: SELECT })),
        ...waiting.map((each) => ({ id: each.id, condition: undefined, field: each.field, effect: each.effect })),
    ];
    const empty = cards.length === 0 && !timed;

    return (
        <ControlSection label="Filters" actions={plus} empty={empty}>
            {empty || session === null ? null : (
                <Stack component="ul" role="list" aria-label="Filters" gap={6} className="dp-filters">
                    {cards.map((each) => (
                        // One list, keyed by id: a draft written keeps its card (and focus) as the condition.
                        <FilterCard
                            key={each.id}
                            session={session}
                            store={store}
                            id={each.id}
                            condition={each.condition}
                            count={counts.find((c) => c.id === each.id)}
                            field={each.field}
                            startEffect={each.effect}
                            open={openId === each.id}
                            onOpen={(next) => {
                                setOpenId(next ? each.id : null);
                            }}
                            onDiscard={() => {
                                setDrafts((now) => now.filter((draft) => draft.id !== each.id));
                                focusCard(PLUS);
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
 * The "+" list's Structure rows: the cards that are not a field's (Data source with two or more
 * loads, Largest component, Neighbors of selection with nodes selected, Time window with a time
 * field and no Time window card yet).
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param onField - opens a new card on a field (the Data source).
 * @param onWritten - opens the card a row wrote.
 * @param taken - the drafts' ids, which a new card must not take.
 * @param timeShown - whether the Time window card is already in the list.
 * @returns the rows.
 */
function structureItems(
    session: GraphSession,
    store: WorkspaceStore,
    onField: (field: CardField) => void,
    onWritten: (id: string) => void,
    taken: readonly string[],
    timeShown: boolean,
): ExtraItem[] {
    const add = (rule: FilterCondition["rule"]): void => {
        const id = newConditionId(session.visibility.conditions, taken);
        pendingFocus = { target: id };
        onWritten(id);
        void writeCondition(store, () => session.visibility.addCondition({ id, ...SELECT, rule }));
    };
    const selected = session.selection.nodes;
    const source = cardFields(session, "node").find((field) => field.path === SOURCE_PATH);
    return [
        ...(source === undefined
            ? []
            : [
                  {
                      key: "source",
                      name: "Data source",
                      glyph: GLYPHS.file,
                      onPick: () => {
                          onField(source);
                      },
                  },
              ]),
        {
            key: "largest",
            name: "Largest component",
            glyph: GLYPHS.graph,
            onPick: () => {
                add({ kind: "member", of: "largest-component" });
            },
        },
        ...(selected.length === 0
            ? []
            : [
                  {
                      key: "neighbors",
                      name: "Neighbors of selection",
                      glyph: GLYPHS.neighborhood,
                      onPick: () => {
                          add({ kind: "neighborhood", seeds: selected, depth: 1 });
                      },
                  },
              ]),
        ...(session.time.field !== null && !timeShown
            ? [
                  {
                      key: "time",
                      name: TIME_WINDOW,
                      glyph: GLYPHS.time,
                      onPick: () => {
                          pendingFocus = { target: TIME_ROW };
                          store.set({ timeWindowCard: true });
                          session.time.pause();
                          session.time.window({}).then(() => {
                              openTimeCard(store);
                          }, reportTimeError(store));
                      },
                  },
              ]
            : []),
    ];
}

/**
 * A card's count: a node chip and an edge chip for the halves the element counted ("140 of 900"),
 * or the hidden-column mark when its rule reads a column that is not there.
 * @param props - Component props
 * @param props.count - the element's count, or undefined for a card not yet written
 * @returns the chips
 */
function CountChips({ count }: Readonly<{ count: FilterConditionCount | undefined }>): React.JSX.Element | null {
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
                        {`${formatNumber(half.matched)} of ${formatNumber(half.total)}`}
                    </EntityChip>
                ),
            )}
        </>
    );
}

/** How long typing pauses before the count it changed is spoken, as the Style cards wait. */
const SPEAK_AFTER_MS = 500;

/**
 * What a rule would match on one kind, read from the element without writing it (`scope.count`):
 * the count a card shows while its text is typed. The last count stays on screen until the next
 * one settles, so it follows the keys without blinking.
 * @param session - the element's session.
 * @param rule - the rule, or null for none.
 * @param side - nodes or edges.
 * @returns the count, or undefined for none.
 */
function usePreviewCount(session: GraphSession, rule: RuleTree | null, side: Side): FilterConditionCount | undefined {
    const key = rule === null ? "" : JSON.stringify(rule);
    const [counted, setCounted] = useState<{ key: string; matched: number } | null>(null);
    const latest = useRef(rule);
    latest.current = rule;
    useEffect(() => {
        const where = latest.current;
        if (where === null) {
            return undefined;
        }
        let live = true;
        session.scope.count({ define: { kind: "rule", where, reading: "clipped" } }).then(
            (each) => {
                if (live) {
                    setCounted({ key, matched: side === "node" ? each.nodes : each.edges });
                }
            },
            () => undefined,
        );
        return () => {
            live = false;
        };
    }, [session, key, side]);
    if (rule === null || counted === null) {
        return undefined;
    }
    const stats = session.data.statistics();
    const half = { matched: counted.matched, total: side === "node" ? stats.nodeCount : stats.edgeCount };
    return { id: "", nodes: side === "node" ? half : null, edges: side === "edge" ? half : null, unresolved: [] };
}

/**
 * One filter card (design/data/filter-cards.md section 5, tier 4 R3 and R4): a header row with
 * its field, its count and its remove button; a row with Select / Filter to / Filter out and its on box; then its
 * body while it is open, else its summary. A card not yet written (`condition` undefined) is
 * written by its first value. Typed text is written when it is committed (Enter, Tab or a click
 * out, Escape), its count following each key meanwhile without a write. Only Escape takes a card
 * back, and only one with no value.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.id - the condition's id (a draft's is the id it is written with)
 * @param props.condition - the condition, or undefined for a draft
 * @param props.count - the element's count of it
 * @param props.field - a draft's field
 * @param props.startEffect - the effect a draft is written with
 * @param props.open - whether its body is shown
 * @param props.onOpen - opens or closes it
 * @param props.onDiscard - drops a draft
 * @param props.onRemoved - called as the card is removed, so focus can move on
 * @returns the card
 */
function FilterCard({
    session,
    store,
    id,
    condition,
    count,
    field,
    startEffect,
    open,
    onOpen,
    onDiscard,
    onRemoved,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    id: string;
    condition: FilterCondition | undefined;
    count: FilterConditionCount | undefined;
    field: CardField | undefined;
    startEffect: StartEffect;
    open: boolean;
    onOpen: (open: boolean) => void;
    onDiscard: () => void;
    onRemoved: () => void;
}>): React.JSX.Element {
    const box = useRef<HTMLDivElement>(null);
    const shape =
        condition === undefined
            ? ({
                  kind: "fields",
                  side: field?.on ?? "node",
                  cards: field === undefined ? [] : [newCard(field)],
              } as const)
            : shapeOf(session, condition);
    const ruleKey = condition === undefined ? "" : JSON.stringify(condition.rule);
    const [cards, setCards] = useState<readonly Card[]>(shape.kind === "fields" ? shape.cards : []);
    // The rule this card last wrote: a rule that differs came from elsewhere (Undo), and is read again.
    const written = useRef(ruleKey);
    const latestShape = useRef(shape);
    latestShape.current = shape;
    useEffect(() => {
        if (ruleKey !== written.current) {
            written.current = ruleKey;
            const now = latestShape.current;
            setCards(now.kind === "fields" ? now.cards : []);
        }
    }, [ruleKey]);
    // Typing in a text box writes when it is committed (Enter, leaving the box): one undo step.
    const pending = useRef<readonly Card[] | null>(null);
    const [typing, setTyping] = useState(false);
    const draft = condition === undefined;
    const side = shape.kind === "fields" ? shape.side : "node";

    // A new card puts focus on its first value.
    useEffect(() => {
        if (draft) {
            const root = box.current;
            const target =
                root?.querySelector<HTMLElement>(`.dp-filter-body input:not([type=hidden]):not([readonly])`) ??
                root?.querySelector<HTMLElement>(".dp-filter-body :is(input:not([type=hidden]), button)");
            target?.focus();
        }
    }, [draft]);

    // While text is typed, the count is the rule's as typed, read without writing it; spoken once
    // typing pauses. A new card shows none until the reader gives it a value.
    const preview = usePreviewCount(session, shape.kind === "fields" && typing ? ruleOfCards(cards) : null, side);
    const shown = preview ?? (typing ? undefined : count);
    const half = side === "node" ? preview?.nodes : preview?.edges;
    const things = side === "node" ? "nodes" : "edges";
    const [settled] = useDebouncedValue(
        half === undefined || half === null
            ? null
            : `${formatNumber(half.matched)} of ${formatNumber(half.total)} ${things}`,
        SPEAK_AFTER_MS,
    );
    useAnnounceChange(typing ? settled : null, false);

    const save = (next: readonly Card[]): void => {
        const made = ruleOfCards(next);
        if (made === null) {
            return;
        }
        const rule = condition === undefined ? made : keepReadings(made, condition.rule);
        if (condition === undefined) {
            written.current = JSON.stringify(rule);
            void writeCondition(store, () => session.visibility.addCondition({ id, ...startEffect, rule }));
        } else if (!sameRule(rule, condition.rule)) {
            written.current = JSON.stringify(rule);
            void writeCondition(store, () => session.visibility.updateCondition(id, { rule }));
        }
    };
    const change = (next: readonly Card[]): void => {
        setCards(next);
        // A select's box is read-only: its choice is written at once.
        const active = document.activeElement;
        if (isTypingTarget(active) && !(active instanceof HTMLInputElement && active.readOnly)) {
            pending.current = next;
            setTyping(true);
            return;
        }
        pending.current = null;
        setTyping(false);
        save(next);
    };
    const flush = (): void => {
        const held = pending.current;
        pending.current = null;
        setTyping(false);
        if (held !== null) {
            save(held);
        }
    };
    const remove = (): void => {
        if (draft) {
            onDiscard();
            return;
        }
        onRemoved();
        void writeCondition(store, () => session.visibility.removeCondition(id));
    };

    const name = condition === undefined ? (field?.name ?? "New filter") : conditionWords(session, condition.rule);
    const on = condition?.on ?? true;
    const action = ACTION_WORDS[condition?.effect ?? startEffect.effect];
    // Each effect's toggle segment, with what it does in its tooltip and its name.
    const effects = [
        { value: "select", label: "Select", says: `Select the ${things} that match; nothing leaves the picture` },
        { value: "keep", label: "Filter to", says: `Keep only the ${things} that match in the picture` },
        { value: "exclude", label: "Filter out", says: `Remove the ${things} that match from the picture` },
    ] as const;
    // The header names the card's field (or its kind); the summary under it says the rule.
    let title = "Rule";
    if (shape.kind === "fields") {
        title = cards.map((each) => ("field" in each ? each.field.name : "Rule")).join(", ") || name;
    } else if (shape.kind === "largest") {
        title = "Largest component";
    } else if (shape.kind === "neighbors") {
        title = "Neighbors";
    }

    return (
        <li>
            <div // NOSONAR(S6847): the card listens for keys its own controls send up (Enter commits, Escape commits or drops a draft)
                ref={box}
                role="group"
                data-id={id}
                tabIndex={-1}
                aria-label={draft ? name : `${name}, ${action}`}
                className="ws-card dp-filter"
                data-off={on ? undefined : ""}
                // Escape commits what the card holds and puts focus on its on box; a new card with
                // no value is taken back. Caught before a box takes the key to keep its text; an
                // open list still takes its own Escape.
                onKeyDownCapture={(event) => {
                    if (!isPanelEscape(event.nativeEvent)) {
                        return;
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    // A new card's only values are typed ones: any other first value wrote it.
                    const held = pending.current;
                    if (draft) {
                        pending.current = null;
                        setTyping(false);
                        if (held === null || ruleOfCards(held) === null) {
                            onDiscard();
                            return;
                        }
                        pendingFocus = { target: id, onBox: true };
                        save(held);
                        return;
                    }
                    flush();
                    box.current?.querySelector<HTMLElement>(ON_BOX)?.focus();
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                        flush();
                    }
                }}
                onBlur={(event) => {
                    const to = event.relatedTarget;
                    // Focus leaving the box that was typed in (for another control in the card or
                    // anywhere else) writes what was typed, unless the whole window lost focus or it
                    // went to a list the box opened (drawn in a portal). A card with no value stays,
                    // for Escape to take back.
                    const away = to === null && !document.hasFocus();
                    if (away || (to instanceof Element && to.closest("[data-portal]") !== null)) {
                        return;
                    }
                    flush();
                }}
            >
                <Group gap={4} wrap="nowrap">
                    <UnstyledButton
                        className="dp-filter-name"
                        aria-expanded={open}
                        onClick={() => {
                            onOpen(!open);
                        }}
                    >
                        <Text size="xs" fw={600} truncate span>
                            {title}
                        </Text>
                    </UnstyledButton>
                    <Group gap={4} wrap="nowrap">
                        <CountChips count={shown} />
                    </Group>
                    <Tooltip label={`Remove ${name}`}>
                        <CloseButton size="xs" aria-label={`Remove ${name}`} onClick={remove} />
                    </Tooltip>
                </Group>
                {condition !== undefined && (
                    <Group gap={4} wrap="nowrap" justify="flex-end" className="dp-filter-switches">
                        <SegmentedControl
                            size="xs"
                            label={`${name} action`}
                            data={effects.map((each) => ({
                                value: each.value,
                                label: (
                                    <Tooltip label={each.says}>
                                        <span>
                                            <span aria-hidden>{each.label}</span>
                                            <VisuallyHidden>{`${each.label}: ${each.says}`}</VisuallyHidden>
                                        </span>
                                    </Tooltip>
                                ),
                            }))}
                            value={condition.effect}
                            onChange={(value) => {
                                void writeCondition(store, () =>
                                    session.visibility.updateCondition(
                                        id,
                                        // A Select card selects only what is in the picture.
                                        value === "select"
                                            ? SELECT
                                            : { effect: value === "exclude" ? "exclude" : "keep" },
                                    ),
                                );
                            }}
                        />
                        <Tooltip label={`Apply ${name}`}>
                            <Checkbox
                                size="xs"
                                aria-label={`Apply ${name}`}
                                checked={on}
                                onChange={(event) => {
                                    const next = event.currentTarget.checked;
                                    void writeCondition(store, () =>
                                        session.visibility.updateCondition(id, { on: next }),
                                    );
                                }}
                            />
                        </Tooltip>
                    </Group>
                )}
                {open ? (
                    <div className="dp-filter-body">
                        <CardContent
                            session={session}
                            store={store}
                            id={id}
                            condition={condition}
                            shape={shape}
                            cards={cards}
                            onCards={change}
                            onRemove={remove}
                        />
                    </div>
                ) : (
                    condition !== undefined && (
                        // The resting card's summary, as a Style card's chip says it; a click opens it, as
                        // its field's name does by keyboard (the one Tab stop for opening).
                        <UnstyledButton
                            tabIndex={-1}
                            aria-hidden
                            className="dp-filter-summary"
                            onClick={() => {
                                onOpen(true);
                            }}
                        >
                            <Text size="xs" c="dimmed" span>
                                {name}
                            </Text>
                        </UnstyledButton>
                    )
                )}
            </div>
        </li>
    );
}

/**
 * A card's body by its shape: the field cards with "Add a condition", the largest component, the
 * neighbors' seeds and depth, or a rule no card edits in its words.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.id - the condition's id
 * @param props.condition - the condition, or undefined for a draft
 * @param props.shape - how it draws
 * @param props.cards - the field cards as edited
 * @param props.onCards - takes the field cards as edited
 * @param props.onRemove - removes the whole card
 * @returns the body
 */
function CardContent({
    session,
    store,
    id,
    condition,
    shape,
    cards,
    onCards,
    onRemove,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    id: string;
    condition: FilterCondition | undefined;
    shape: ReturnType<typeof shapeOf>;
    cards: readonly Card[];
    onCards: (cards: readonly Card[]) => void;
    onRemove: () => void;
}>): React.JSX.Element {
    switch (shape.kind) {
        case "largest":
            return <Text size="xs">Largest component</Text>;
        case "neighbors":
            return (
                <Stack gap={4}>
                    <Group gap={4}>
                        {shape.seeds.map((seed) => (
                            <Pill
                                key={String(seed)}
                                size="xs"
                                withRemoveButton
                                removeButtonProps={{ "aria-label": `Remove ${String(seed)}` }}
                                onRemove={() => {
                                    const seeds = shape.seeds.filter((each) => each !== seed);
                                    if (seeds.length === 0 || condition === undefined) {
                                        onRemove();
                                        return;
                                    }
                                    void writeCondition(store, () =>
                                        session.visibility.updateCondition(id, {
                                            rule: { kind: "neighborhood", seeds, depth: shape.depth },
                                        }),
                                    );
                                }}
                            >
                                {String(seed)}
                            </Pill>
                        ))}
                    </Group>
                    <SegmentedControl
                        size="xs"
                        label="Neighbors depth"
                        data={["1", "2", "3"]}
                        value={String(shape.depth)}
                        onChange={(value) => {
                            void writeCondition(store, () =>
                                session.visibility.updateCondition(id, {
                                    rule: { kind: "neighborhood", seeds: shape.seeds, depth: Number(value) },
                                }),
                            );
                        }}
                    />
                </Stack>
            );
        case "fields":
            return (
                <Stack gap={6}>
                    {cards.map((card) => (
                        <FieldRow
                            key={card.key}
                            session={session}
                            card={card}
                            side={shape.side}
                            blank={condition === undefined}
                            removable={cards.length > 1}
                            onChange={(next) => {
                                onCards(cards.map((each) => (each.key === card.key ? next : each)));
                            }}
                            onRemove={() => {
                                onCards(cards.filter((each) => each.key !== card.key));
                            }}
                        />
                    ))}
                    {condition !== undefined && (
                        <AddCondition
                            fields={valueFields(session, shape.side)}
                            used={cards.map((card) => card.key)}
                            onAdd={(added) => {
                                if (!cards.some((card) => card.key === `${added.on}:${added.path}`)) {
                                    onCards([...cards, newCard(added)]);
                                }
                            }}
                        />
                    )}
                </Stack>
            );
        default:
            // A rule the cards cannot draw (an old Hide step, an expression): kept, read-only, in words.
            return (
                <Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>
                    {condition === undefined ? "" : conditionWords(session, condition.rule)}
                </Text>
            );
    }
}

/**
 * One field's row in a card: its name, its remove button when the card holds several, and the
 * Which picker's body for its kind.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the field's card
 * @param props.side - nodes or edges
 * @param props.blank - a new card: a yes-or-no value shows no choice yet
 * @param props.removable - whether it can be removed alone
 * @param props.onChange - takes the card as edited
 * @param props.onRemove - removes it
 * @returns the row
 */
function FieldRow({
    session,
    card,
    side,
    blank,
    removable,
    onChange,
    onRemove,
}: Readonly<{
    session: GraphSession;
    card: Card;
    side: Side;
    blank: boolean;
    removable: boolean;
    onChange: (card: Card) => void;
    onRemove: () => void;
}>): React.JSX.Element {
    const name = "field" in card ? card.field.name : "Rule";
    return (
        <Stack gap={2} data-card={card.key}>
            {/* One field is named by the card's header; of several, each is named over its body. */}
            {removable && (
                <Group gap={4} wrap="nowrap">
                    <Text size="xs" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
                        {name}
                    </Text>
                    <Tooltip label={`Remove ${name}`}>
                        <CloseButton size="xs" aria-label={`Remove ${name}`} onClick={onRemove} />
                    </Tooltip>
                </Group>
            )}
            <CardBody session={session} card={card} side={side} blank={blank} onChange={onChange} variant="filter" />
        </Stack>
    );
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
    const words = window === null ? null : windowWords(window, unitOf(session));
    const side = time.field?.edges === undefined ? "nodes" : "edges";
    const extent = time.extent();
    // The element's own counts: the window's one bin, of every timed element on the field's side.
    const inside =
        window === null || extent === null
            ? undefined
            : time.bins({ count: 1, from: Number(window.from), to: Number(window.to) })?.[0]?.[side];
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
            if (tx.time.current !== null) {
                await tx.time.window(null);
            }
        })
        .catch(() => {
            store.set({ notice: { message: "The filter could not be changed.", error: true } });
        });
}

/**
 * The header's filter chip, "9 of 22 nodes", drawn while a card that hides is on; its tooltip names
 * the cards that are on and it opens the Data place, where the Filters section is; its x switches
 * them off. It also puts each change on the status line.
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
    if (session === null || hiding.length === 0) {
        return null;
    }
    const counts = session.visibility.conditionCounts();
    const { summary } = session.visibility;
    // Edges are counted when a card speaks of them, or when the filter left any out (a node card
    // hides the edges at the nodes it hides).
    const edges =
        summary.visibleEdges < summary.totalEdges ||
        hiding.some((c) => (counts.find((each) => each.id === c.id)?.edges ?? null) !== null);
    const words = chipWords(summary, edges);
    // The time window is one of the filters in force, as the Filters list shows it.
    const window = session.time.field === null ? null : session.time.current;
    const on = [
        ...hiding.map((c) => conditionWords(session, c.rule)),
        ...(window === null ? [] : [`Time ${windowWords(window, unitOf(session))}`]),
    ];
    return (
        <Group gap={0} wrap="nowrap">
            <Tooltip label={chipTip(on)} multiline maw={280}>
                <Button
                    variant="subtle"
                    size="compact-xs"
                    aria-label={`Filter: ${words}${window === null ? "" : ", time window"}`}
                    leftSection={<GLYPHS.filter size={12} aria-hidden />}
                    onClick={() => {
                        store.set({ page: "panels", place: "data" });
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
