import type { GraphSession, HistoryStepId, Layer, LayerPatch, RuleTree } from "@graphty/graphty-element/session";
import {
    Button,
    Checkbox,
    CloseButton,
    Combobox,
    Group,
    NumberInput,
    RangeSlider,
    Select,
    Stack,
    Text,
    TextInput,
    UnstyledButton,
    useCombobox,
} from "@mantine/core";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { findTreeRow } from "../graph-place/rows";
import { useAsyncValue } from "../inspector/hooks";
import { isPanelEscape } from "../keys/keys";
import { useWorkspace } from "../state/WorkspaceContext";
import {
    type Card,
    type CardField,
    cardFields,
    cardsName,
    cardWords,
    edgeCards,
    isFinished,
    keyOf,
    leafOf,
    newCard,
    nodeCards,
    nodeLeaves,
    sameSelector,
    selectorOf,
    type Side,
    TEXT_WORDS,
    type TextMode,
} from "./cards";
import { keystrokeTarget } from "./useFocusLine";
import { LAYER_TOKEN, valueName } from "./words";

/** One tree row a picker writes: its part of this kind and, on the Node tab, its edge part. */
interface PickRow {
    /** The tree row's id. */
    readonly id: string;
    readonly name: string;
    /** Its layer of this kind. */
    readonly layer: Layer;
    /** Its cards of this kind, as the layer holds them. */
    readonly cards: readonly Card[];
    /** Its node part's leaves, which an Ends card copies (the Edge tab); null when it has none to copy. */
    readonly nodes: readonly RuleTree[] | null;
    /** Its edge part, on the Node tab. */
    readonly edge?: Layer;
    /** How its edge part follows the node cards, when it has an Ends card. */
    readonly ends?: "clipped" | "incident";
}

/** A card as the picker draws it: one every row shares, or one whose values differ by layer. */
interface Shown {
    readonly key: string;
    /** The card every row holds, or the first row's for one that differs. */
    readonly card: Card;
    /** Each row's own card for this key, in row order; undefined where a row has none. */
    readonly per: readonly (Card | undefined)[];
    /** Every row holds the same card. */
    readonly shared: boolean;
}

/** The words a kind goes by. */
const NOUN: Readonly<Record<Side, { one: string; many: string }>> = {
    node: { one: "node", many: "nodes" },
    edge: { one: "edge", many: "edges" },
};

/**
 * "11 nodes", "1 edge".
 * @param n - how many.
 * @param side - nodes or edges.
 * @returns the words.
 */
const many = (n: number, side: Side): string => `${String(n)} ${n === 1 ? NOUN[side].one : NOUN[side].many}`;

/**
 * The rows a picker over some tree rows writes, read from the element.
 * @param session - the element's session.
 * @param ids - the tree rows (layer rows only; locked ones left out by the caller).
 * @param side - nodes or edges.
 * @returns the rows that style this kind.
 */
function pickRows(session: GraphSession, ids: readonly string[], side: Side): PickRow[] {
    const nodeFields = cardFields(session, "node");
    const edgeFields = cardFields(session, "edge");
    const tree = session.styles.tree();
    return ids.flatMap((id) => {
        const parts = session.styles.parts(id);
        const nodeLayer = parts?.node === undefined ? undefined : session.styles.get(parts.node);
        const edgeLayer = parts?.edge === undefined ? undefined : session.styles.get(parts.edge);
        const layer = side === "node" ? nodeLayer : edgeLayer;
        if (layer === undefined) {
            return [];
        }
        const name = findTreeRow(tree, id)?.row.name ?? layer.name;
        const cards =
            side === "node"
                ? nodeCards(session, layer.selector, nodeFields)
                : edgeCards(session, layer.selector, edgeFields);
        const endsCard =
            edgeLayer === undefined
                ? undefined
                : edgeCards(session, edgeLayer.selector, edgeFields).find((c) => c.type === "ends");
        return [
            {
                id,
                name,
                layer,
                cards,
                nodes: nodeLayer === undefined ? [] : nodeLeaves(session, nodeLayer.selector),
                ...(side === "node" && edgeLayer !== undefined ? { edge: edgeLayer } : {}),
                ...(endsCard?.type === "ends" ? { ends: endsCard.reading } : {}),
            },
        ];
    });
}

/**
 * The cards of several rows as one list: a key every row holds alike is shared; any other is drawn
 * once, with each row's own (a card whose value is what makes each group a group).
 * @param rows - the rows.
 * @returns the cards, in the order the first row holding each lists it.
 */
function shownOf(rows: readonly PickRow[]): Shown[] {
    const keys: string[] = [];
    for (const row of rows) {
        for (const card of row.cards) {
            if (!keys.includes(card.key)) {
                keys.push(card.key);
            }
        }
    }
    return keys.map((key) => {
        const per = rows.map((row) => row.cards.find((card) => card.key === key));
        const first = per.find((card): card is Card => card !== undefined);
        const shared = per.every((card) => card !== undefined && JSON.stringify(card) === JSON.stringify(first));
        return { key, card: first as Card, per, shared };
    });
}

/**
 * The patches that write some rows' cards: each row's layer of this kind its selector, its edge part
 * the node cards again through its Ends card, and a layer still named by its cards the new name.
 * @param session - the element's session.
 * @param rows - the rows.
 * @param shown - the cards as edited.
 * @param side - nodes or edges.
 * @param endsOf - how a row's edges followed its node cards when the picker opened.
 * @returns the patches; none when nothing changes.
 */
function patchesOf(
    session: GraphSession,
    rows: readonly PickRow[],
    shown: readonly Shown[],
    side: Side,
    endsOf: (row: PickRow) => "clipped" | "incident" | undefined,
): LayerPatch[] {
    const edgeFields = cardFields(session, "edge");
    return rows.flatMap((row, at) => {
        const cards = shown.flatMap((each) => {
            const card = each.shared ? each.card : each.per[at];
            return card !== undefined && isFinished(card) ? [card] : [];
        });
        const selector = selectorOf(cards, side === "edge" ? (row.nodes ?? []) : []);
        const patches: LayerPatch[] = [];
        if (!sameSelector(selector, row.layer.selector)) {
            // A bulk edit never renames; one layer still named by its cards takes the new name.
            const old = cardsName(session, row.cards);
            const renamed = rows.length === 1 && old !== undefined && row.layer.name === old;
            const name = renamed ? cardsName(session, cards) : undefined;
            patches.push({ id: row.layer.id, patch: { selector, ...(name === undefined ? {} : { name }) } });
            const reading = endsOf(row);
            if (side === "node" && row.edge !== undefined && reading !== undefined) {
                // The edge part's own cards, and the Ends card it had when the picker opened: a
                // node card cleared for a moment leaves the edges on every edge, and they follow
                // the node cards again once there are some.
                const own = edgeCards(session, row.edge.selector, edgeFields).filter((c) => c.type !== "ends");
                const leaves = cards.flatMap((card) => leafOf(card) ?? []);
                const edge = selectorOf([{ type: "ends", key: "ends", reading }, ...own], leaves);
                patches.push({ id: row.edge.id, patch: { selector: edge, ...(name === undefined ? {} : { name }) } });
            }
        }
        return patches;
    });
}

/**
 * The rule several rows pick together, for the union count; null when one picks everything, or
 * stands alone (selected, hovered), so no single rule says it.
 * @param rows - the rows.
 * @returns the rule.
 */
function unionRule(rows: readonly PickRow[]): RuleTree | null {
    const each: RuleTree[] = [];
    for (const row of rows) {
        if (row.cards.some((card) => card.type === "ends" || (card.type === "fixed" && card.leaf === null))) {
            return null;
        }
        const leaves = row.cards.flatMap((card) => leafOf(card) ?? []);
        if (leaves.length === 0) {
            return null;
        }
        each.push(leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves });
    }
    return each.length === 1 ? each[0] : { kind: "any", of: each };
}

/**
 * How many of a kind one leaf keeps, from the element's `scope.count`; undefined until it settles.
 * @param session - the element's session.
 * @param leaf - the leaf.
 * @param side - nodes or edges.
 * @param reading - the edge reading (an Ends card's).
 * @returns the count.
 */
function useLeafCount(
    session: GraphSession,
    leaf: RuleTree | null,
    side: Side,
    reading: "clipped" | "incident" = "clipped",
): number | undefined {
    const key = `${JSON.stringify(leaf)} ${side} ${reading} ${String(session.history.version)}`;
    const counted = useAsyncValue(
        () => (leaf === null ? null : session.scope.count({ define: { kind: "rule", where: leaf, reading } })),
        key,
    );
    if (counted === undefined) {
        return undefined;
    }
    return side === "node" ? counted.nodes : counted.edges;
}

/**
 * The rows' total as the Which row and the open cards both say it: "11 of 77" for one layer,
 * "10 layers, 77 of 77 nodes" (the union) for several.
 * @param session - the element's session.
 * @param rows - the rows.
 * @param side - nodes or edges.
 * @returns the words.
 */
function useHead(session: GraphSession, rows: readonly PickRow[], side: Side): string {
    const stats = session.data.statistics();
    const total = side === "node" ? stats.nodeCount : stats.edgeCount;
    const union = unionRule(rows);
    const unionCount = useLeafCount(session, rows.length > 1 ? union : null, side);
    let matched: number | undefined;
    if (rows.length === 1) {
        const [{ layer }] = rows;
        ({ matched } = session.styles.counts(layer.id));
    } else if (rows.some((row) => row.cards.length === 0)) {
        // A layer with no card picks every element, so together they pick them all.
        matched = total;
    } else {
        matched = unionCount;
    }
    if (rows.length > 1) {
        // No one rule says what several Ends cards keep together (each reads its own layer's
        // nodes), so the union is left unsaid rather than drawn as "of 254 edges".
        return matched === undefined
            ? `${String(rows.length)} layers`
            : `${String(rows.length)} layers, ${String(matched)} of ${String(total)} ${NOUN[side].many}`;
    }
    return matched === undefined ? `of ${String(total)}` : `${String(matched)} of ${String(total)}`;
}

/** Props of a picker. */
interface WhichPickerProps {
    readonly session: GraphSession;
    /** The tree rows it writes: one layer, or every unlocked layer row of a multi-selection or a folder. */
    readonly rows: readonly string[];
    readonly side: Side;
    /** Open on arrival: a new layer, or a kind just turned on with no cards. */
    readonly autoOpen?: boolean;
}

/**
 * Which nodes (or Which edges): a disclosure row naming how many the cards keep, one chip per card
 * with its own count, that opens in place to the cards, "+ Add a condition" and Done (tier3
 * design, "2026-10-16 -- The combined Style panel"). Every edit is written at once; each open and
 * close is one undo step. On several layers a card they share edits all of them, and a card whose
 * values differ reads <<Layer>> and lists each layer's.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rows - the rows it writes
 * @param props.side - nodes or edges
 * @param props.autoOpen - open on arrival when it has no cards
 * @returns The picker
 */
export function WhichPicker({
    session,
    rows: ids,
    side,
    autoOpen = false,
}: WhichPickerProps): React.JSX.Element | null {
    const rows = pickRows(session, ids, side);
    const shown = shownOf(rows);
    const [open, setOpen] = useState(autoOpen && shown.length === 0);
    const [focusKey, setFocusKey] = useState<string | null>(open ? "add" : null);
    const rowButton = useRef<HTMLButtonElement>(null);
    const regionId = useId();
    if (rows.length === 0) {
        return null;
    }
    const close = (): void => {
        setOpen(false);
        requestAnimationFrame(() => rowButton.current?.focus());
    };
    return (
        <div className="ws-which" data-testid="which-picker" data-side={side}>
            {open ? (
                <Cards
                    session={session}
                    rows={rows}
                    side={side}
                    initial={shown}
                    focusKey={focusKey}
                    regionId={regionId}
                    onClose={close}
                />
            ) : (
                <WhichRow
                    session={session}
                    rows={rows}
                    shown={shown}
                    side={side}
                    buttonRef={rowButton}
                    regionId={regionId}
                    onOpen={(key) => {
                        setFocusKey(key ?? (shown.length === 0 ? "add" : (shown[0]?.key ?? "add")));
                        setOpen(true);
                    }}
                />
            )}
        </div>
    );
}

/**
 * The collapsed row: "Which nodes, 11 of 77" and a chip per card. A chip is a pointer shortcut to
 * its card; nothing inside the button takes focus.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rows - the rows it writes
 * @param props.shown - the cards as drawn
 * @param props.side - nodes or edges
 * @param props.buttonRef - the row button, which focus returns to
 * @param props.regionId - the open cards' id, which the row controls
 * @param props.onOpen - opens the cards, on a chip's card when one was clicked
 * @returns The row
 */
function WhichRow({
    session,
    rows,
    shown,
    side,
    buttonRef,
    regionId,
    onOpen,
}: Readonly<{
    session: GraphSession;
    rows: readonly PickRow[];
    shown: readonly Shown[];
    side: Side;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
    regionId: string;
    onOpen: (key?: string) => void;
}>): React.JSX.Element {
    const stats = session.data.statistics();
    const total = side === "node" ? stats.nodeCount : stats.edgeCount;
    const head = useHead(session, rows, side);
    const descId = useId();
    const words = shown.map((each) => chipWords(session, each, rows.length));
    return (
        <UnstyledButton
            ref={buttonRef}
            className="ws-which-row"
            aria-expanded={false}
            aria-controls={regionId}
            aria-label={`Which ${NOUN[side].many}, ${head}`}
            aria-describedby={descId}
            onClick={(event) => {
                const chip = (event.target as Element).closest<HTMLElement>("[data-chip]");
                onOpen(chip?.dataset.chip);
            }}
        >
            <Group gap={4} wrap="nowrap" className="ws-which-head">
                <GLYPHS.expand size={12} aria-hidden style={{ transform: "rotate(-90deg)" }} />
                <Text size="xs" fw={600} span>
                    Which {NOUN[side].many}
                </Text>
                <Text size="xs" c="dimmed" span ml="auto">
                    {head}
                </Text>
            </Group>
            <span className="ws-which-chips" id={descId}>
                {shown.length === 0 ? (
                    <span className="ws-chip" data-warn>
                        All {many(total, side)}: add a condition to narrow
                    </span>
                ) : (
                    shown.map((each, at) => (
                        <Chip key={each.key} session={session} shown={each} side={side} words={words[at]} />
                    ))
                )}
            </span>
        </UnstyledButton>
    );
}

/**
 * What a card is named by in its header and its messages: its field, "Ends", or "The rule".
 * @param card - the card.
 * @returns the name.
 */
function cardName(card: Card): string {
    if (card.type === "ends") {
        return "Ends";
    }
    return card.type === "fixed" ? "The rule" : card.field.name;
}

/**
 * A card's words as its chip says them; a card whose values differ by layer reads <<Layer>>.
 * @param session - the element's session.
 * @param shown - the card.
 * @param rows - how many rows the picker writes.
 * @returns the words.
 */
function chipWords(session: GraphSession, shown: Shown, rows: number): string {
    if (shown.shared) {
        return cardWords(session, shown.card);
    }
    const holding = shown.per.filter((each) => each !== undefined).length;
    const layers = holding < rows ? `${String(holding)} of ${String(rows)} layers` : `${String(rows)} layers`;
    return `${cardName(shown.card)}: ${LAYER_TOKEN}, ${layers}`;
}

/**
 * One chip: the card's words and, for a shared card, how many it keeps alone.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.shown - the cards as drawn
 * @param props.side - nodes or edges
 * @param props.words - the chip's words
 * @returns The chip
 */
function Chip({
    session,
    shown,
    side,
    words,
}: Readonly<{ session: GraphSession; shown: Shown; side: Side; words: string }>): React.JSX.Element {
    const { card } = shown;
    const count = useLeafCount(session, shown.shared ? leafOf(card) : null, side);
    const finished = isFinished(card);
    return (
        <span className="ws-chip" data-chip={shown.key} data-todo={finished ? undefined : ""}>
            {words}
            {count === undefined ? "" : `, ${String(count)}`}
        </span>
    );
}

/** What a card editor hands back: the card as edited. */
type OnCard = (next: Card) => void;

/**
 * The open picker: "Elements that pass every card", the cards, "+ Add a condition", the total and
 * Done. Holds the cards as edited, so typing is never undone by a write still on its way; every
 * finished change is written at once, merged into one undo step for the open.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rows - the rows it writes
 * @param props.side - nodes or edges
 * @param props.initial - the cards when it opened
 * @param props.focusKey - the card (or "add") to focus first
 * @param props.regionId - the open cards' id, which the row controls
 * @param props.onClose - closes the cards
 * @returns The region
 */
function Cards({
    session,
    rows,
    side,
    initial,
    focusKey,
    regionId,
    onClose,
}: Readonly<{
    session: GraphSession;
    rows: readonly PickRow[];
    side: Side;
    initial: readonly Shown[];
    focusKey: string | null;
    regionId: string;
    onClose: () => void;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const [list, setList] = useState<readonly Shown[]>(initial);
    // How each row's edges followed its node cards when the picker opened.
    const endsAt = useRef(new Map(rows.map((row) => [row.id, row.ends])));
    const [focus, setFocus] = useState<string | null>(focusKey);
    const box = useRef<HTMLDivElement>(null);
    const writer = useStepWriter(session, `Which ${NOUN[side].many}`);
    const fields = useMemo(() => cardFields(session, side), [session, side]);
    const bulk = rows.length > 1;

    useEffect(() => {
        if (focus === null) {
            return;
        }
        const root = box.current;
        // A card's keystroke goes to its value, not the remove button in its header: its text box
        // where it has one (a text card's words, not its match menu), else its first value control.
        const controls =
            focus === "add"
                ? []
                : [
                      ...(root?.querySelectorAll<HTMLElement>(
                          `[data-card="${CSS.escape(focus)}"] :is(input:not([type=hidden]), button, [tabindex="0"])`,
                      ) ?? []),
                  ];
        const target =
            focus === "add"
                ? root?.querySelector<HTMLElement>("[data-add]")
                : (keystrokeTarget(controls.filter((each) => each.closest(".ws-card-head") === null)) ?? controls[0]);
        target?.focus();
        setFocus(null);
    }, [focus]);

    const commit = (next: readonly Shown[]): void => {
        setList(next);
        const patches = patchesOf(session, rows, next, side, (row) => endsAt.current.get(row.id));
        if (patches.length > 0) {
            writer.write(patches);
        }
    };
    const edit = (key: string, card: Card): void => {
        commit(
            list.map((each) => (each.key === key ? { ...each, card, shared: true, per: rows.map(() => card) } : each)),
        );
    };
    const remove = (key: string): void => {
        const at = list.findIndex((each) => each.key === key);
        const next = list.filter((each) => each.key !== key);
        commit(next);
        setFocus(next[at]?.key ?? next[at - 1]?.key ?? "add");
    };
    const add = (field: CardField): void => {
        const key = keyOf(field);
        if (list.some((each) => each.key === key)) {
            setFocus(key);
            return;
        }
        const card = newCard(field);
        const next = [...list, { key, card, shared: true, per: rows.map(() => card) }];
        commit(next);
        setFocus(key);
        if (bulk && isFinished(card)) {
            void announceEmpty(session, rows, next, side).then((words) => {
                if (words !== undefined) {
                    store.set({ announcement: words });
                }
            });
        }
    };

    const head = useHead(session, rows, side);
    const matched = rows.length === 1 ? session.styles.counts(rows[0].layer.id).matched : undefined;
    let why: string | undefined;
    if (matched === 0 && list.length > 0) {
        why = list.length === 1 ? `${cardName(list[0].card)} leaves none` : "Each card leaves some; together none";
    }
    const standsAlone = list.some((each) => each.card.type === "fixed" && each.card.leaf === null);

    return (
        <Stack
            ref={box}
            gap={6}
            id={regionId}
            role="group"
            aria-label={`Which ${NOUN[side].many}`}
            className="ws-which-open"
            onKeyDown={(event) => {
                if (isPanelEscape(event.nativeEvent)) {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                }
            }}
        >
            <Group gap={4} wrap="nowrap">
                <Text size="xs" fw={600}>
                    Which {NOUN[side].many}
                </Text>
                <Text size="xs" c="dimmed" ml="auto" role="status" aria-live="polite">
                    {head}
                </Text>
            </Group>
            <Text size="xs" c="dimmed">
                {NOUN[side].many.charAt(0).toUpperCase() + NOUN[side].many.slice(1)} that pass every card
            </Text>
            {list.map((each) =>
                each.shared ? (
                    <CardEditor
                        key={each.key}
                        session={session}
                        card={each.card}
                        side={side}
                        ends={rows[0]?.nodes}
                        onChange={(card) => {
                            edit(each.key, card);
                        }}
                        onRemove={() => {
                            remove(each.key);
                        }}
                    />
                ) : (
                    <LayerCard
                        key={each.key}
                        session={session}
                        shown={each}
                        rows={rows}
                        side={side}
                        onRemove={() => {
                            remove(each.key);
                        }}
                    />
                ),
            )}
            {why !== undefined && (
                <Text size="xs" c="var(--cm-text-danger)">
                    {why}
                </Text>
            )}
            {!standsAlone && <AddCondition fields={fields} used={list.map((each) => each.key)} onAdd={add} />}
            <Group justify="flex-end">
                <Button size="compact-xs" onClick={onClose}>
                    Done
                </Button>
            </Group>
        </Stack>
    );
}

/**
 * Writes several layers as one undo step per open picker: the first write records the step, each
 * later one merges into it (`TransactionOptions.after`) while it is still the newest. Writes go one
 * at a time, and a write waiting behind another is replaced by a newer one.
 * @param session - the element's session.
 * @param label - the step's label.
 * @returns the writer.
 */
function useStepWriter(session: GraphSession, label: string): { write: (patches: readonly LayerPatch[]) => void } {
    const { store } = useWorkspace();
    const step = useRef<HistoryStepId | undefined>(undefined);
    const chain = useRef<Promise<void>>(Promise.resolve());
    const waiting = useRef<readonly LayerPatch[] | null>(null);
    return {
        write: (patches) => {
            const queued = waiting.current !== null;
            waiting.current = patches;
            if (queued) {
                return;
            }
            chain.current = chain.current
                .then(async () => {
                    const next = waiting.current;
                    waiting.current = null;
                    if (next === null) {
                        return;
                    }
                    await session.transaction(
                        label,
                        (tx) => tx.styles.updateMany(next),
                        step.current === undefined ? {} : { after: step.current },
                    );
                    step.current ??= session.history.steps[session.history.position - 1]?.id;
                })
                .catch(() => {
                    store.set({ notice: { message: "That rule could not be used for this layer", error: true } });
                });
        },
    };
}

/**
 * After a card is added to several layers: the layers it leaves with nothing, in words.
 * @param session - the element's session.
 * @param rows - the rows.
 * @param shown - the cards.
 * @param side - nodes or edges.
 * @returns "2 layers now match nothing: Group 5, Group 6", or undefined.
 */
async function announceEmpty(
    session: GraphSession,
    rows: readonly PickRow[],
    shown: readonly Shown[],
    side: Side,
): Promise<string | undefined> {
    const empty: string[] = [];
    for (const [at, row] of rows.entries()) {
        const leaves = shown.flatMap((each) => {
            const card = each.shared ? each.card : each.per[at];
            return card === undefined ? [] : (leafOf(card) ?? []);
        });
        if (leaves.length === 0) {
            continue;
        }
        const where: RuleTree = leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves };
        const counted = await session.scope.count({ define: { kind: "rule", where, reading: "clipped" } });
        if ((side === "node" ? counted.nodes : counted.edges) === 0) {
            empty.push(row.name);
        }
    }
    return empty.length === 0
        ? undefined
        : `${String(empty.length)} ${empty.length === 1 ? "layer now matches" : "layers now match"} nothing: ${empty.join(", ")}`;
}

/**
 * "+ Add a condition": a searchable list of every field of the kind, grouped Data, Results and
 * Structure; a field that already has a card is marked, and picking it goes to that card.
 * @param props - Component props
 * @param props.fields - the fields of the kind
 * @param props.used - the card keys already drawn
 * @param props.onAdd - adds a card on a field
 * @returns The control
 */
function AddCondition({
    fields,
    used,
    onAdd,
}: Readonly<{
    fields: readonly CardField[];
    used: readonly string[];
    onAdd: (field: CardField) => void;
}>): React.JSX.Element {
    const combobox = useCombobox({
        onDropdownClose: () => {
            combobox.resetSelectedOption();
            setSearch("");
        },
        onDropdownOpen: () => {
            combobox.focusSearchInput();
        },
    });
    const [search, setSearch] = useState("");
    const button = useRef<HTMLButtonElement>(null);
    const typed = search.trim().toLowerCase();
    const groups = (["Data", "Results", "Structure"] as const).flatMap((group) => {
        const items = fields.filter((f) => f.group === group && (typed === "" || f.name.toLowerCase().includes(typed)));
        return items.length === 0 ? [] : [{ group, items }];
    });
    return (
        <Combobox
            store={combobox}
            width={220}
            position="bottom-start"
            withinPortal
            onOptionSubmit={(value) => {
                const field = fields.find((f) => keyOf(f) === value);
                combobox.closeDropdown();
                if (field !== undefined) {
                    onAdd(field);
                }
            }}
        >
            <Combobox.Target withAriaAttributes={false}>
                <Button
                    ref={button}
                    size="compact-xs"
                    variant="subtle"
                    leftSection={<GLYPHS.add size={12} aria-hidden />}
                    data-add
                    aria-haspopup="listbox"
                    aria-expanded={combobox.dropdownOpened}
                    onClick={() => {
                        combobox.toggleDropdown();
                    }}
                    style={{ alignSelf: "flex-start" }}
                >
                    Add a condition
                </Button>
            </Combobox.Target>
            <Combobox.Dropdown>
                <Combobox.Search
                    value={search}
                    onChange={(event) => {
                        setSearch(event.currentTarget.value);
                    }}
                    placeholder="Search values"
                    aria-label="Search values"
                    onKeyDown={(event) => {
                        // Escape closes the list only, not the picker it opened from.
                        if (event.key === "Escape") {
                            event.preventDefault();
                            combobox.closeDropdown();
                            button.current?.focus();
                        }
                    }}
                />
                <Combobox.Options mah={240} style={{ overflowY: "auto" }}>
                    {groups.length === 0 ? (
                        <Combobox.Empty>Nothing found</Combobox.Empty>
                    ) : (
                        groups.map(({ group, items }) => (
                            <Combobox.Group key={group} label={group}>
                                {items.map((field) => {
                                    const key = keyOf(field);
                                    const inUse = used.includes(key);
                                    return (
                                        <Combobox.Option
                                            key={key}
                                            value={key}
                                            aria-label={inUse ? `${field.name}, has a card` : field.name}
                                        >
                                            {field.name}
                                            {inUse ? " (has a card)" : ""}
                                        </Combobox.Option>
                                    );
                                })}
                            </Combobox.Group>
                        ))
                    )}
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    );
}

/** The two choices every value card's Match select ends with. */
const PRESENCE = [
    { value: "present", label: "Has a value" },
    { value: "absent", label: "Has no value" },
] as const;

/**
 * One card a layer (or every layer edited) holds alike: its header (name, count, x), its Match
 * select, and the editor its field's kind takes.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.side - nodes or edges
 * @param props.ends - the node leaves an Ends card follows
 * @param props.onChange - takes the card as edited
 * @param props.onRemove - removes the card
 * @returns The card
 */
function CardEditor({
    session,
    card,
    side,
    ends,
    onChange,
    onRemove,
}: Readonly<{
    session: GraphSession;
    card: Card;
    side: Side;
    ends?: readonly RuleTree[] | null;
    onChange: OnCard;
    onRemove: () => void;
}>): React.JSX.Element {
    const reading = card.type === "ends" ? card.reading : "clipped";
    // The Ends card keeps the edges its node cards reach.
    let endsLeaf: RuleTree | null = null;
    if (ends !== undefined && ends !== null && ends.length > 0) {
        endsLeaf = ends.length === 1 ? ends[0] : { kind: "all", of: ends };
    }
    const count = useLeafCount(session, card.type === "ends" ? endsLeaf : leafOf(card), side, reading);
    const name = card.type === "fixed" ? cardWords(session, card) : cardName(card);
    const label = count === undefined ? name : `${name}, ${many(count, side)}`;
    return (
        <div // NOSONAR(S6819): an ARIA group naming one card's controls; a fieldset draws its own border and legend
            role="group"
            aria-label={label}
            className="ws-card"
            data-card={card.key}
        >
            <Group gap={4} wrap="nowrap" className="ws-card-head">
                <Text size="xs" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
                    {name}
                </Text>
                {count !== undefined && (
                    <Text size="xs" c="dimmed">
                        {String(count)}
                    </Text>
                )}
                <CloseButton
                    size="xs"
                    aria-label={`Remove ${name}`}
                    onClick={onRemove}
                    onKeyDown={(event) => {
                        if (event.key === "Delete") {
                            onRemove();
                        }
                    }}
                />
            </Group>
            <CardBody session={session} card={card} side={side} onChange={onChange} />
        </div>
    );
}

/**
 * The body of a card, by its type.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.side - nodes or edges
 * @param props.onChange - takes the card as edited
 * @returns The body
 */
function CardBody({
    session,
    card,
    side,
    onChange,
}: Readonly<{ session: GraphSession; card: Card; side: Side; onChange: OnCard }>): React.JSX.Element | null {
    switch (card.type) {
        case "number":
            return <NumberCard session={session} card={card} side={side} onChange={onChange} />;
        case "category":
            return <CategoryCard session={session} card={card} side={side} onChange={onChange} />;
        case "text":
            return <TextCard session={session} card={card} onChange={onChange} />;
        case "yes-no":
            return (
                <MatchSelect
                    name={card.field.name}
                    value={card.match}
                    data={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, ...PRESENCE]}
                    onChange={(match) => {
                        onChange({ ...card, match: match as typeof card.match });
                    }}
                />
            );
        case "ends":
            return (
                <Select
                    size="xs"
                    aria-label="Ends"
                    allowDeselect={false}
                    data={[
                        { value: "clipped", label: "Both ends in this layer's nodes" },
                        { value: "incident", label: "Either end in this layer's nodes" },
                    ]}
                    value={card.reading}
                    onChange={(value) => {
                        onChange({ ...card, reading: value === "incident" ? "incident" : "clipped" });
                    }}
                />
            );
        default:
            // The rule's own text: an expression as it was typed, any other leaf as the element holds it.
            return card.leaf === null ? null : (
                <Text size="xs" c="dimmed" style={{ overflowWrap: "anywhere" }}>
                    {card.leaf.kind === "expression" ? card.leaf.where : JSON.stringify(card.leaf)}
                </Text>
            );
    }
}

/**
 * A card's Match select.
 * @param props - Component props
 * @param props.name - the field's name
 * @param props.value - the chosen value
 * @param props.data - the choices
 * @param props.onChange - takes the card as edited
 * @returns The select
 */
function MatchSelect({
    name,
    value,
    data,
    onChange,
}: Readonly<{
    name: string;
    value: string;
    data: readonly { value: string; label: string }[];
    onChange: (value: string) => void;
}>): React.JSX.Element {
    return (
        <Select
            size="xs"
            aria-label={`${name}: match`}
            allowDeselect={false}
            data={[...data]}
            value={value}
            onChange={(next) => {
                if (next !== null) {
                    onChange(next);
                }
            }}
        />
    );
}

/**
 * A number card: between two values (a range slider and two boxes, unclamped), or the highest N of
 * all the elements, or has / has no value.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.side - nodes or edges
 * @param props.onChange - takes the card as edited
 * @returns The body
 */
function NumberCard({
    session,
    card,
    side,
    onChange,
}: Readonly<{
    session: GraphSession;
    card: Extract<Card, { type: "number" }>;
    side: Side;
    onChange: OnCard;
}>): React.JSX.Element {
    const { name, path, range } = card.field;
    const missing = useMemo(() => session.data.valueCounts(path, { kind: side }).missing, [session, path, side]);
    const low = range?.min ?? 0;
    const high = range?.max ?? 1;
    const step = Number.isInteger(low) && Number.isInteger(high) ? 1 : (high - low) / 100 || 1;
    return (
        <Stack gap={4}>
            <MatchSelect
                name={name}
                value={card.match}
                data={[{ value: "range", label: "Between" }, { value: "top", label: "Highest" }, ...PRESENCE]}
                onChange={(match) => {
                    onChange({
                        ...card,
                        match: match as typeof card.match,
                        ...(match === "top" && card.top === undefined ? { top: 10 } : {}),
                        ...(match === "range" && card.min === undefined && card.max === undefined
                            ? { min: low, max: high }
                            : {}),
                    });
                }}
            />
            {card.match === "range" && (
                <>
                    <RangeSlider
                        size="xs"
                        min={low}
                        max={high}
                        step={step}
                        minRange={0}
                        label={null}
                        thumbFromLabel={`${name} from`}
                        thumbToLabel={`${name} to`}
                        value={[Math.max(low, card.min ?? low), Math.min(high, card.max ?? high)]}
                        onChangeEnd={([min, max]) => {
                            onChange({ ...card, min, max });
                        }}
                    />
                    <Group gap={4} wrap="nowrap">
                        <NumberInput
                            size="xs"
                            aria-label={`${name} from, number`}
                            value={card.min ?? ""}
                            onChange={(value) => {
                                onChange({ ...card, min: typeof value === "number" ? value : undefined });
                            }}
                        />
                        <Text size="xs">to</Text>
                        <NumberInput
                            size="xs"
                            aria-label={`${name} to, number`}
                            value={card.max ?? ""}
                            onChange={(value) => {
                                onChange({ ...card, max: typeof value === "number" ? value : undefined });
                            }}
                        />
                    </Group>
                </>
            )}
            {card.match === "top" && (
                <Group gap={4} wrap="nowrap">
                    <NumberInput
                        size="xs"
                        aria-label={`${name}: how many`}
                        min={1}
                        allowDecimal={false}
                        value={card.top ?? ""}
                        onChange={(value) => {
                            onChange({ ...card, top: typeof value === "number" ? value : undefined });
                        }}
                    />
                    <Text size="xs">of all {NOUN[side].many}</Text>
                </Group>
            )}
            {card.match !== "absent" && card.match !== "present" && missing > 0 && (
                <Text size="xs" c="dimmed">
                    {many(missing, side)} {missing === 1 ? "has" : "have"} no value and {missing === 1 ? "is" : "are"}{" "}
                    left out.
                </Text>
            )}
        </Stack>
    );
}

/** How many values a category card lists before it offers a search and "Show all". */
const SHOWN_VALUES = 8;

/**
 * A category card: a checklist of the values by count, ticked ones being alternatives; over 8 a
 * search, the top 8 and "Show all N"; "(no value)" when some elements have none.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.side - nodes or edges
 * @param props.onChange - takes the card as edited
 * @returns The body
 */
function CategoryCard({
    session,
    card,
    side,
    onChange,
}: Readonly<{
    session: GraphSession;
    card: Extract<Card, { type: "category" }>;
    side: Side;
    onChange: OnCard;
}>): React.JSX.Element {
    const { name, path } = card.field;
    const counts = useMemo(() => session.data.valueCounts(path, { kind: side }), [session, path, side]);
    const [search, setSearch] = useState("");
    const [all, setAll] = useState(false);
    const typed = search.trim().toLowerCase();
    const named = counts.values.map((each) => ({
        value: String(each.value),
        label: valueName(session, path, each.value),
        count: each.count,
    }));
    const found = named.filter((each) => typed === "" || each.label.toLowerCase().includes(typed));
    const listed = all || typed !== "" ? found : found.slice(0, SHOWN_VALUES);
    const toggle = (value: string, on: boolean): void => {
        const values = on ? [...card.values, value] : card.values.filter((v) => v !== value);
        onChange({ ...card, match: "values", values });
    };
    return (
        <Stack gap={4}>
            <MatchSelect
                name={name}
                value={card.match}
                data={[{ value: "values", label: "Is any of" }, ...PRESENCE]}
                onChange={(match) => {
                    onChange({ ...card, match: match as typeof card.match });
                }}
            />
            {card.match === "values" && (
                <>
                    {named.length > SHOWN_VALUES && (
                        <TextInput
                            size="xs"
                            aria-label={`Search ${name}`}
                            placeholder="Search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.currentTarget.value);
                            }}
                        />
                    )}
                    <Stack gap={2} role="group" aria-label={`${name} values`}>
                        {listed.map((each) => (
                            <Checkbox
                                key={each.value}
                                size="xs"
                                label={`${each.label}, ${many(each.count, side)}`}
                                checked={card.values.includes(each.value)}
                                onChange={(event) => {
                                    toggle(each.value, event.currentTarget.checked);
                                }}
                            />
                        ))}
                        {counts.missing > 0 && (
                            <Checkbox
                                size="xs"
                                label={`(no value), ${many(counts.missing, side)}`}
                                checked={card.gaps}
                                onChange={(event) => {
                                    onChange({ ...card, gaps: event.currentTarget.checked });
                                }}
                            />
                        )}
                    </Stack>
                    {!all && typed === "" && named.length > SHOWN_VALUES && (
                        <Button
                            size="compact-xs"
                            variant="subtle"
                            style={{ alignSelf: "flex-start" }}
                            onClick={() => {
                                setAll(true);
                            }}
                        >
                            Show all {String(named.length)}
                        </Button>
                    )}
                </>
            )}
        </Stack>
    );
}

/**
 * A text card (and the Name card on the node id): contains, starts with, ends with or is exactly
 * some text, with Match case; a name card can instead hold the selected nodes.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.onChange - takes the card as edited
 * @returns The body
 */
function TextCard({
    session,
    card,
    onChange,
}: Readonly<{ session: GraphSession; card: Extract<Card, { type: "text" }>; onChange: OnCard }>): React.JSX.Element {
    const { name } = card.field;
    const isName = card.field.kind === "name";
    const modes = (Object.keys(TEXT_WORDS) as TextMode[]).map((mode) => ({ value: mode, label: TEXT_WORDS[mode] }));
    const data = [
        ...modes,
        ...(isName ? [] : PRESENCE),
        ...(card.match === "list" ? [{ value: "list", label: "Is one of these" }] : []),
    ];
    const selected = session.selection.nodes;
    return (
        <Stack gap={4}>
            <MatchSelect
                name={name}
                value={card.match}
                data={data}
                onChange={(match) => {
                    onChange({ ...card, match: match as typeof card.match });
                }}
            />
            {card.match === "list" ? (
                <Text size="xs">
                    {(card.ids ?? []).length} {(card.ids ?? []).length === 1 ? "node" : "nodes"}:{" "}
                    {(card.ids ?? []).slice(0, 5).join(", ")}
                    {(card.ids ?? []).length > 5 ? ", ..." : ""}
                </Text>
            ) : (
                card.match !== "present" &&
                card.match !== "absent" && (
                    <>
                        <TextInput
                            size="xs"
                            aria-label={`${name}: text`}
                            placeholder="Type the text to match"
                            value={card.text}
                            onChange={(event) => {
                                onChange({ ...card, text: event.currentTarget.value });
                            }}
                        />
                        <Checkbox
                            size="xs"
                            label="Match case"
                            checked={card.caseSensitive}
                            onChange={(event) => {
                                onChange({ ...card, caseSensitive: event.currentTarget.checked });
                            }}
                        />
                    </>
                )
            )}
            {isName && (
                <Button
                    size="compact-xs"
                    variant="default"
                    style={{ alignSelf: "flex-start" }}
                    disabled={selected.length === 0}
                    onClick={() => {
                        onChange({ ...card, match: "list", ids: selected.map(String) });
                    }}
                >
                    Use the selected nodes
                </Button>
            )}
            {isName && selected.length === 0 && (
                <Text size="xs" c="dimmed">
                    Select nodes on the canvas to use them here
                </Text>
            )}
        </Stack>
    );
}

/**
 * A card's words without its field's name, for a list under a header that already says it.
 * @param words - the card's words ("Louvain: Group 1").
 * @param name - the field's name.
 * @returns the rest ("Group 1").
 */
function withoutField(words: string, name: string): string {
    const head = [`${name}: `, `${name} `].find((each) => words.startsWith(each));
    return head === undefined ? words : words.slice(head.length);
}

/**
 * A card whose values differ by layer, on several layers: <<Layer>> where its value goes, and one
 * row per layer with that layer's own card and count; a row selects that layer. Read-only: a card's
 * value is what makes each group a group. Its x removes the field's card from every layer.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.shown - the cards as drawn
 * @param props.rows - the rows it writes
 * @param props.side - nodes or edges
 * @param props.onRemove - removes the card
 * @returns The card
 */
function LayerCard({
    session,
    shown,
    rows,
    side,
    onRemove,
}: Readonly<{
    session: GraphSession;
    shown: Shown;
    rows: readonly PickRow[];
    side: Side;
    onRemove: () => void;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    const [open, setOpen] = useState(false);
    const { card } = shown;
    const name = cardName(card);
    const holding = shown.per.filter((each) => each !== undefined).length;
    const layers =
        holding < rows.length ? `${String(holding)} of ${String(rows.length)} layers` : `${String(holding)} layers`;
    // The rows come bottom first (paint order); the tree lists them top first, and so does this card.
    const topFirst = rows.map((row, at) => ({ row, card: shown.per[at] })).reverse();
    const words = topFirst.flatMap(({ card: each }) =>
        each === undefined ? [] : [withoutField(cardWords(session, each), name)],
    );
    const line = words.length > 3 ? `${words.slice(0, 3).join(", ")}, +${String(words.length - 3)}` : words.join(", ");
    return (
        <div // NOSONAR(S6819): an ARIA group naming one card's controls; a fieldset draws its own border and legend
            role="group"
            aria-label={`${name}, from each layer, ${layers}`}
            className="ws-card"
            data-card={shown.key}
            data-by-layer
        >
            <Group gap={4} wrap="nowrap" className="ws-card-head">
                <Text size="xs" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
                    {name}
                </Text>
                <CloseButton size="xs" aria-label={`Remove ${name} from every layer`} onClick={onRemove} />
            </Group>
            <UnstyledButton
                className="ws-card-layer"
                aria-expanded={open}
                aria-label={`${name}: from each layer, ${layers}. ${line}`}
                onClick={() => {
                    setOpen(!open);
                }}
            >
                <Text size="xs" span fw={600} c="var(--cm-text-component)" data-layer-source>
                    <span aria-hidden>{LAYER_TOKEN.slice(0, 1)}</span>
                    {LAYER_TOKEN.slice(1, -1)}
                    <span aria-hidden>{LAYER_TOKEN.slice(-1)}</span>
                </Text>
                <Text size="xs" span c="dimmed">
                    {" "}
                    {layers}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                    {line}
                </Text>
            </UnstyledButton>
            {open && (
                <Stack gap={2} role="list" aria-label={`${name} in each layer`}>
                    {topFirst.map(({ row, card: each }) => (
                        <LayerLine
                            key={row.id}
                            session={session}
                            row={row}
                            card={each}
                            field={name}
                            side={side}
                            onPick={() => {
                                store.set({ inspected: { kind: "layer-row", id: row.id } });
                            }}
                        />
                    ))}
                </Stack>
            )}
        </div>
    );
}

/**
 * One layer's own card in a <<Layer>> card's list: its name, the card's words and the count; a
 * click selects the layer.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.row - the row
 * @param props.card - the card
 * @param props.field - the card's field name, which the card's header already says
 * @param props.side - nodes or edges
 * @param props.onPick - selects the layer
 * @returns The line
 */
function LayerLine({
    session,
    row,
    card,
    field,
    side,
    onPick,
}: Readonly<{
    session: GraphSession;
    row: PickRow;
    card: Card | undefined;
    field: string;
    side: Side;
    onPick: () => void;
}>): React.JSX.Element {
    const count = useLeafCount(session, card === undefined ? null : leafOf(card), side);
    const words = card === undefined ? "no card" : withoutField(cardWords(session, card), field);
    return (
        <div role="listitem">
            <UnstyledButton className="ws-card-layer-line" onClick={onPick}>
                <Text size="xs" span fw={600}>
                    {row.name}
                </Text>
                <Text size="xs" span>
                    {": "}
                    {words}
                    {count === undefined ? "" : `, ${String(count)}`}
                </Text>
            </UnstyledButton>
        </div>
    );
}
