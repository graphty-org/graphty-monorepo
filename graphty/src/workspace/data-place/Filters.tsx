/**
 * Filters (design/data/filter-cards.md section 5): the Data place's Filters section, a flat list of
 * condition cards, and the header chip. Each card is one of graphty-element's filter conditions
 * (`visibility.conditions`): its count is the element's (`conditionCounts`), its Select / Hide
 * toggle writes the condition's effect, its box switches it on and off, and its body is the Which
 * picker's card for its field. Order never matters. The app holds only a card not yet written.
 */

import { ControlSection, EntityChip, SegmentedControl, TargetTooltip } from "@graphty/compact-mantine";
import type { FilterCondition, FilterConditionCount, GraphSession } from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Button,
    Checkbox,
    CloseButton,
    Group,
    Menu,
    Pill,
    Stack,
    Text,
    Tooltip,
    VisuallyHidden,
} from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { isPanelEscape, isTypingTarget } from "../keys/keys";
import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type Card, type CardField, cardFields, newCard, type Side, SOURCE_PATH } from "../style/cards";
import { AddCondition, CardBody } from "../style/WhichPicker";
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

/** Where focus goes once the Filters section draws next: a card's id, or `PLUS` for "+". */
let pendingFocus: string | null = null;

/**
 * Focuses a card in the Filters section, or its "+".
 * @param target - a card's id, or `PLUS`.
 * @returns whether that control is on the page.
 */
function focusCard(target: string): boolean {
    const control = document.querySelector<HTMLElement>(
        target === PLUS ? "[data-filters-plus]" : `[role=list][aria-label="Filters"] [data-id="${CSS.escape(target)}"]`,
    );
    control?.focus();
    return control !== null;
}

/** A card not yet written: the id it is written with, and the field it opened on. */
interface Draft {
    readonly id: string;
    readonly field: CardField;
}

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

/** A card's action word for each effect, read in its name: the toggle shows keep and select. */
const ACTION_WORDS: Record<FilterCondition["effect"], string> = { keep: "Hide", select: "Select", exclude: "Exclude" };

/**
 * The Filters section: one card per condition, in the element's order, a new card while it has no
 * value, then the time window's row. "+" adds a card.
 * @returns the section.
 */
export function FiltersSection(): React.JSX.Element {
    const { session, store } = useWorkspace();
    const version = useVisibilityVersion(session);
    const asked = useWorkspaceState((state) => state.filterDraft);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [adding, setAdding] = useState(false);
    const conditions = session?.visibility.conditions ?? [];
    // Once written, the draft is one of the element's conditions, drawn by the same card, and is
    // let go: removed later, it must not come back as a draft.
    const written = draft !== null && conditions.some((c) => c.id === draft.id);
    const drafting = draft !== null && !written;
    useEffect(() => {
        if (written) {
            setDraft(null);
        }
    }, [written]);
    const counts = session?.visibility.conditionCounts() ?? [];

    useEffect(() => {
        if (pendingFocus !== null && focusCard(pendingFocus)) {
            pendingFocus = null;
        }
    }, [version]);

    const open = (field: CardField): void => {
        setDraft({ id: newConditionId(session?.visibility.conditions ?? []), field });
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
                openRef.current(field);
            }
        }
    }, [asked, session, store]);

    const timed = session !== null && session.time.field !== null;
    const plus =
        session === null ? null : (
            <AddMenu
                session={session}
                store={store}
                opened={adding}
                onOpened={setAdding}
                onField={open}
                taken={draft?.id}
            />
        );
    const cards = [
        ...conditions.map((condition) => ({ id: condition.id, condition, field: undefined })),
        ...(drafting ? [{ id: draft.id, condition: undefined, field: draft.field }] : []),
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
                            onDiscard={() => {
                                setDraft(null);
                                focusCard(PLUS);
                            }}
                            onRemoved={() => {
                                const at = conditions.findIndex((c) => c.id === each.id);
                                pendingFocus = conditions[at + 1]?.id ?? conditions[at - 1]?.id ?? PLUS;
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
 * The section's "+": the node and edge fields, then the cards that are not a field's (Data source
 * with two or more loads, Largest component, Neighbors of selection with nodes selected, Time window
 * with a time field and the window off).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.opened - whether the list is open
 * @param props.onOpened - opens or closes it
 * @param props.onField - opens a new card on a field
 * @param props.taken - a draft's id, which a new card must not take
 * @returns the menu
 */
function AddMenu({
    session,
    store,
    opened,
    onOpened,
    onField,
    taken,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    opened: boolean;
    onOpened: (opened: boolean) => void;
    onField: (field: CardField) => void;
    taken: string | undefined;
}>): React.JSX.Element {
    const add = (rule: FilterCondition["rule"]): void => {
        const id = newConditionId(session.visibility.conditions, taken === undefined ? [] : [taken]);
        pendingFocus = id;
        void writeCondition(store, () => session.visibility.addCondition({ id, effect: "keep", rule }));
    };
    const selected = session.selection.nodes;
    const source = cardFields(session, "node").find((field) => field.path === SOURCE_PATH);
    const fieldItems = (side: Side): React.JSX.Element[] =>
        valueFields(session, side).map((field) => (
            <Menu.Item
                key={`${side}:${field.path}`}
                onClick={() => {
                    onField(field);
                }}
            >
                {field.name}
            </Menu.Item>
        ));
    const nodes = fieldItems("node");
    const edges = fieldItems("edge");
    return (
        // Focus goes to the card an item adds, not back to "+".
        <Menu opened={opened} onChange={onOpened} position="bottom-end" withinPortal returnFocus={false}>
            <Menu.Target>
                <TargetTooltip label="Add filter">
                    <ActionIcon data-filters-plus="" variant="subtle" aria-label="Add filter">
                        <GLYPHS.add size={14} aria-hidden />
                    </ActionIcon>
                </TargetTooltip>
            </Menu.Target>
            <Menu.Dropdown mah={360} style={{ overflowY: "auto" }}>
                {nodes.length > 0 && <Menu.Label>Nodes</Menu.Label>}
                {nodes}
                {edges.length > 0 && <Menu.Label>Edges</Menu.Label>}
                {edges}
                <Menu.Divider />
                {source !== undefined && (
                    <Menu.Item
                        onClick={() => {
                            onField(source);
                        }}
                    >
                        Data source
                    </Menu.Item>
                )}
                <Menu.Item
                    onClick={() => {
                        add({ kind: "member", of: "largest-component" });
                    }}
                >
                    Largest component
                </Menu.Item>
                {selected.length > 0 && (
                    <Menu.Item
                        onClick={() => {
                            add({ kind: "neighborhood", seeds: selected, depth: 1 });
                        }}
                    >
                        Neighbors of selection
                    </Menu.Item>
                )}
                {session.time.field !== null && session.time.current === null && (
                    <Menu.Item
                        onClick={() => {
                            session.time.pause();
                            session.time.window({}).then(() => {
                                openTimeCard(store);
                            }, reportTimeError(store));
                        }}
                    >
                        Time window
                    </Menu.Item>
                )}
            </Menu.Dropdown>
        </Menu>
    );
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

/**
 * One filter card: its count, Select / Hide, its box and its remove button over its body. A card
 * not yet written (`condition` undefined) is written by its first value; Escape, or leaving it
 * with none, discards it.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.id - the condition's id (a draft's is the id it is written with)
 * @param props.condition - the condition, or undefined for a draft
 * @param props.count - the element's count of it
 * @param props.field - a draft's field
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
    onDiscard,
    onRemoved,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    id: string;
    condition: FilterCondition | undefined;
    count: FilterConditionCount | undefined;
    field: CardField | undefined;
    onDiscard: () => void;
    onRemoved: () => void;
}>): React.JSX.Element {
    const box = useRef<HTMLLIElement>(null);
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
    const draft = condition === undefined;

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

    const save = (next: readonly Card[]): void => {
        const made = ruleOfCards(next);
        if (made === null) {
            return;
        }
        const rule = condition === undefined ? made : keepReadings(made, condition.rule);
        if (condition === undefined) {
            written.current = JSON.stringify(rule);
            void writeCondition(store, () => session.visibility.addCondition({ id, effect: "keep", rule }));
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
            return;
        }
        pending.current = null;
        save(next);
    };
    const flush = (): boolean => {
        const held = pending.current;
        pending.current = null;
        if (held !== null) {
            save(held);
        }
        return held !== null && ruleOfCards(held) !== null;
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
    const select = condition?.effect === "select";
    const on = condition?.on ?? true;
    // Only keep and select swap with the toggle; any other effect (exclude) is named as it is and
    // keeps it, since writing keep or select would change what the condition does.
    const toggles = condition?.effect === "keep" || select;
    const action = ACTION_WORDS[condition?.effect ?? "keep"];

    return (
        <li // NOSONAR(S6847): the card listens for keys its own controls send up (Enter commits, Escape drops a draft)
            ref={box}
            data-id={id}
            tabIndex={-1}
            aria-label={draft ? name : `${name}, ${action}`}
            className="ws-card dp-filter"
            data-off={on ? undefined : ""}
            // Escape drops a new card wherever focus is in it, before a box takes the key to keep its
            // text; an open list still takes its own Escape.
            onKeyDownCapture={(event) => {
                if (draft && isPanelEscape(event.nativeEvent)) {
                    event.preventDefault();
                    event.stopPropagation();
                    pending.current = null;
                    onDiscard();
                }
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    flush();
                }
            }}
            onBlur={(event) => {
                const to = event.relatedTarget;
                // No target: focus went to something that cannot take it (blank space, the canvas),
                // which leaves the card too -- unless the whole window lost focus.
                const stays =
                    to === null ? !document.hasFocus() : !(to instanceof Element) || box.current?.contains(to) === true;
                if (stays) {
                    return;
                }
                const written = flush();
                // A list the card opened (a match menu, Add a condition) is drawn in a portal.
                if (draft && !written && !(to instanceof Element && to.closest("[data-portal]") !== null)) {
                    onDiscard();
                }
            }}
        >
            {/* The count is the card's fact and is never cut: when it and the controls do not fit on
                one line, the controls move to the next, still at the right. */}
            <Group gap={4}>
                <Group gap={4} style={{ flex: "1 0 auto" }}>
                    <CountChips count={count} />
                </Group>
                <Group gap={4} wrap="nowrap" ml="auto">
                    {condition !== undefined && toggles && (
                        <SegmentedControl
                            size="xs"
                            label={`${name} action`}
                            data={[
                                { value: "select", label: "Select" },
                                { value: "hide", label: "Hide" },
                            ]}
                            value={select ? "select" : "hide"}
                            onChange={(value) => {
                                void writeCondition(store, () =>
                                    session.visibility.updateCondition(id, {
                                        effect: value === "select" ? "select" : "keep",
                                    }),
                                );
                            }}
                        />
                    )}
                    {condition !== undefined && (
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
                    )}
                    <Tooltip label={`Remove ${name}`}>
                        <CloseButton size="xs" aria-label={`Remove ${name}`} onClick={remove} />
                    </Tooltip>
                </Group>
            </Group>
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
            <Group gap={4} wrap="nowrap">
                <Text size="xs" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
                    {name}
                </Text>
                {removable && (
                    <Tooltip label={`Remove ${name}`}>
                        <CloseButton size="xs" aria-label={`Remove ${name}`} onClick={onRemove} />
                    </Tooltip>
                )}
            </Group>
            <CardBody session={session} card={card} side={side} blank={blank} onChange={onChange} />
        </Stack>
    );
}

/**
 * The time window's row, while a time field is designated: the same element state the dock moves.
 * Its button opens the window's card; its box turns the window on and off.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @returns the row
 */
function TimeRow({ session, store }: Readonly<{ session: GraphSession; store: WorkspaceStore }>): React.JSX.Element {
    const window = session.time.current;
    const name = window === null ? "Time" : `Time ${windowWords(window, unitOf(session))}`;
    return (
        <li
            data-id={TIME_ROW}
            tabIndex={-1}
            aria-label={name}
            className="ws-card dp-filter"
            data-off={window === null ? "" : undefined}
        >
            <Group gap={4} wrap="nowrap">
                <Button
                    variant="subtle"
                    size="compact-xs"
                    leftSection={<GLYPHS.time size={12} aria-hidden />}
                    style={{ flex: 1, minWidth: 0 }}
                    justify="flex-start"
                    onClick={() => {
                        openTimeCard(store);
                    }}
                >
                    {name}
                </Button>
                <Tooltip label="Apply the time window">
                    <Checkbox
                        size="xs"
                        aria-label="Apply the time window"
                        checked={window !== null}
                        onChange={(event) => {
                            session.time.pause();
                            session.time
                                .window(event.currentTarget.checked ? {} : null)
                                .then(() => undefined, reportTimeError(store));
                        }}
                    />
                </Tooltip>
            </Group>
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
    const edges = hiding.some((c) => (counts.find((each) => each.id === c.id)?.edges ?? null) !== null);
    const words = chipWords(session.visibility.summary, edges);
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
