import { focusWithRing, useNumberParser } from "@graphty/compact-mantine";
import type { GraphSession, HistoryStepId, Layer, LayerPatch, RuleTree } from "@graphty/graphty-element/session";
import {
    Autocomplete,
    Badge,
    Button,
    Checkbox,
    CloseButton,
    Combobox,
    Group,
    RangeSlider,
    Select,
    Stack,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
    useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { sourceName } from "../data-place/words";
import { GLYPHS, VALUE_GLYPHS } from "../glyphs";
import { findTreeRow } from "../graph-place/rows";
import { useAsyncValue, useSessionVersion } from "../inspector/hooks";
import { formatNumber } from "../inspector/words";
import { hasPendingEdit, isPanelEscape, isTypingTarget } from "../keys/keys";
import { useAnnounceChange } from "../state/useAnnounceChange";
import { useWorkspace } from "../state/WorkspaceContext";
import {
    type Card,
    type CardField,
    cardFields,
    cardsName,
    cardWords,
    DEFAULT_NAME_KEY,
    edgeCards,
    isFinished,
    isPicked,
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
import { FIND_ATTRIBUTE, LAYER_SPOKEN, LAYER_TOKEN, NATURAL, prefixFirst, valueName } from "./words";

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
            // A bulk edit never renames; one layer still named by its cards, or still holding the
            // name it was given by default, takes the new name, which stays its default: what its
            // cards now say, or with none left, that it styles every element of the kind.
            const old = coverName(session, row.cards, side);
            const given = row.layer.userData?.[DEFAULT_NAME_KEY];
            const renamed = rows.length === 1 && (row.layer.name === old || row.layer.name === given);
            const name = renamed ? coverName(session, cards, side) : undefined;
            const named = (layer: Layer): LayerPatch["patch"] =>
                name === undefined || name === layer.name
                    ? {}
                    : {
                          name,
                          ...(given === undefined ? {} : { userData: { ...layer.userData, [DEFAULT_NAME_KEY]: name } }),
                      };
            patches.push({ id: row.layer.id, patch: { selector, ...named(row.layer) } });
            const reading = endsOf(row);
            if (side === "node" && row.edge !== undefined && reading !== undefined) {
                // The edge part's own cards, and the Ends card it had when the picker opened: a
                // node card cleared for a moment leaves the edges on every edge, and they follow
                // the node cards again once there are some.
                const own = edgeCards(session, row.edge.selector, edgeFields).filter((c) => c.type !== "ends");
                const leaves = cards.flatMap((card) => leafOf(card) ?? []);
                const edge = selectorOf([{ type: "ends", key: "ends", reading }, ...own], leaves);
                patches.push({ id: row.edge.id, patch: { selector: edge, ...named(row.edge) } });
            }
        }
        return patches;
    });
}

/**
 * What a layer named by its cards is called: the cards' name, or with no card "All nodes".
 * @param session - the element's session.
 * @param cards - the cards.
 * @param side - nodes or edges.
 * @returns the name.
 */
function coverName(session: GraphSession, cards: readonly Card[], side: Side): string {
    return cardsName(session, cards) ?? `All ${NOUN[side].many}`;
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
 * The leaves some cards make, ANDed: null for none.
 * @param cards - the cards; unfinished ones make no leaf.
 * @returns the rule.
 */
function allOf(cards: readonly Card[]): RuleTree | null {
    const leaves = cards.flatMap((card) => leafOf(card) ?? []);
    if (leaves.length === 0) {
        return null;
    }
    return leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves };
}

/**
 * The rows' total as the Which row and the open cards both say it: "11 of 77 nodes", for one layer
 * as for several (the union), as a folder's count says it; for held cards, what they keep together.
 * @param session - the element's session.
 * @param rows - the rows.
 * @param side - nodes or edges.
 * @param held - the cards a caller holds instead of a layer's.
 * @returns the words.
 */
function useHead(session: GraphSession, rows: readonly PickRow[], side: Side, held?: readonly Card[]): string {
    const stats = session.data.statistics();
    const total = side === "node" ? stats.nodeCount : stats.edgeCount;
    const heldRule = held === undefined ? null : allOf(held);
    const union = held === undefined && rows.length > 1 ? unionRule(rows) : heldRule;
    const unionCount = useLeafCount(session, union, side);
    let matched: number | undefined;
    if (held !== undefined) {
        matched = heldRule === null ? total : unionCount;
    } else if (rows.length === 1) {
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
        // How many layers is the panel's header's to say; a total it cannot count is left unsaid.
        return matched === undefined ? "" : `${String(matched)} of ${String(total)} ${NOUN[side].many}`;
    }
    const of = `of ${String(total)} ${NOUN[side].many}`;
    return matched === undefined ? of : `${String(matched)} ${of}`;
}

/** How long typing pauses before the count it changed is spoken. */
const SPEAK_AFTER_MS = 500;

/** A card's value box: the first text or number box its body draws (not its match menu). */
const VALUE_BOX = "input:not([type=hidden]):not([type=checkbox]):not([readonly])";

/**
 * Cards a caller holds instead of a layer's (a filter step's rule): drawn and edited as a layer's
 * are, and handed back on every change instead of written.
 */
export interface HeldCards {
    readonly cards: readonly Card[];
    readonly onChange: (cards: readonly Card[]) => void;
}

/**
 * Held cards as the picker draws them.
 * @param cards - the cards.
 * @returns them, each shared.
 */
const heldShown = (cards: readonly Card[]): Shown[] =>
    cards.map((card) => ({ key: card.key, card, per: [], shared: true }));

/** Props of a picker. */
interface WhichPickerProps {
    readonly session: GraphSession;
    /**
     * The tree rows it writes: one layer, or every unlocked layer row of a multi-selection or a
     * folder; none with `held`.
     */
    readonly rows: readonly string[];
    /** Cards it edits instead of a layer's. */
    readonly held?: HeldCards;
    readonly side: Side;
    /** Open on arrival: a new layer, or a kind just turned on with no cards. */
    readonly autoOpen?: boolean;
    /**
     * The base layer (Everything holding the base look): it styles every element, so it is never
     * narrowed. It reads "All 24 nodes", with no condition to add; a card it already holds can
     * still be removed.
     */
    readonly base?: boolean;
    /** A field to open on with a card on it (the other kind's tab sent the reader here for it). */
    readonly adding?: string;
    /** Goes to the other kind's tab with a card on a field it carries. */
    readonly onElsewhere?: (field: CardField) => void;
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
 * @param props.base - the base layer, which is never narrowed
 * @param props.adding - a field to open on with a card on it
 * @param props.onElsewhere - goes to the other kind's tab with a card on a field it carries
 * @param props.held - cards it edits instead of a layer's
 * @returns The picker
 */
export function WhichPicker({
    session,
    rows: ids,
    held,
    side,
    autoOpen = false,
    base = false,
    adding,
    onElsewhere,
}: WhichPickerProps): React.JSX.Element | null {
    const rows = held === undefined ? pickRows(session, ids, side) : [];
    const shown = held === undefined ? shownOf(rows) : heldShown(held.cards);
    const [open, setOpen] = useState((autoOpen && !base && shown.length === 0) || (adding !== undefined && !base));
    // Opened on arrival, it starts on Add a condition -- unless the reader is moving between the
    // Node and Edge tabs with the arrow keys: focus stays on the tabs, which the arrows act on.
    const [focusKey, setFocusKey] = useState<string | null>(() =>
        open && document.activeElement?.getAttribute("role") !== "tab" ? "add" : null,
    );
    const rowButton = useRef<HTMLButtonElement>(null);
    const regionId = useId();
    // A card that changes the count says so -- also when the key that changed it (Enter in a
    // number box) closed the cards. The count the picker opens with is not news, nor is a count
    // still being worked out ("of 24 nodes", ""). The screen follows each keystroke; the count is
    // spoken once, when typing pauses.
    const head = useHead(session, rows, side, held?.cards);
    const [settled] = useDebouncedValue(head, SPEAK_AFTER_MS);
    useAnnounceChange(/\d of \d/.test(settled) ? settled : null);
    if (rows.length === 0 && held === undefined) {
        return null;
    }
    if (base && shown.length === 0 && !open) {
        return <BaseRow session={session} rows={rows} side={side} />;
    }
    // Done, Enter or Escape: focus goes back to the Which row it opened from -- the one drawn now,
    // when the panel was drawn again for the row the cards changed (a new layer's first edit).
    const close = (): void => {
        setOpen(false);
        requestAnimationFrame(() => {
            const row = rowButton.current?.isConnected
                ? rowButton.current
                : document.querySelector<HTMLElement>(`.ws-which[data-side="${side}"] button`);
            row?.focus();
        });
    };
    return (
        <div className="ws-which" data-testid="which-picker" data-side={side}>
            {open ? (
                <Cards
                    session={session}
                    rows={rows}
                    held={held}
                    side={side}
                    initial={shown}
                    focusKey={focusKey}
                    regionId={regionId}
                    base={base}
                    adding={adding}
                    onElsewhere={onElsewhere}
                    onClose={close}
                    onLeave={() => {
                        setOpen(false);
                    }}
                />
            ) : (
                <WhichRow
                    session={session}
                    rows={rows}
                    held={held?.cards}
                    shown={shown}
                    side={side}
                    buttonRef={rowButton}
                    regionId={regionId}
                    onOpen={(key) => {
                        // With no card, focus lands on Add a condition, whose list opens on a
                        // press: open already, the press would close it.
                        setFocusKey(key ?? shown[0]?.key ?? "add");
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
 * @param props.held - the cards a caller holds instead of a layer's
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
    held,
    shown,
    side,
    buttonRef,
    regionId,
    onOpen,
}: Readonly<{
    session: GraphSession;
    rows: readonly PickRow[];
    held?: readonly Card[];
    shown: readonly Shown[];
    side: Side;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
    regionId: string;
    onOpen: (key?: string) => void;
}>): React.JSX.Element {
    const stats = session.data.statistics();
    const total = side === "node" ? stats.nodeCount : stats.edgeCount;
    const head = useHead(session, rows, side, held);
    const words = shown.map((each) => chipWords(session, each, rows.length));
    // Each chip's own count, as it draws it, so the row's name says it too (after Done as before).
    const [counts, setCounts] = useState<Readonly<Record<string, number | undefined>>>({});
    const spoken = shown.map((each, at) => {
        const count = counts[each.key];
        const countWords = count === undefined ? "" : `, ${many(count, side)}`;
        return `${words[at].replace(LAYER_TOKEN, LAYER_SPOKEN)}${countWords}`;
    });
    const empty = `All ${many(total, side)}: add a condition to narrow`;
    const hint = `All ${many(total, side)}`;
    // A layer whose conditions leave nothing is flagged on its count, or on a chip that leaves none.
    const none =
        held === undefined &&
        rows.length === 1 &&
        shown.length > 0 &&
        session.styles.counts(rows[0].layer.id).matched === 0;
    const together = none && !Object.values(counts).includes(0);
    // A heading at the level of the sections around it, holding its disclosure button (the
    // accordion pattern), so a heading walk lands on it as on "Shape" or "Fill".
    return (
        <div // NOSONAR(S6819): an undrawn heading around the disclosure button (the accordion pattern); an h3 would restyle the button's text
            role="heading"
            aria-level={3}
            style={{ display: "contents" }}
        >
            <UnstyledButton
                ref={buttonRef}
                className="ws-which-row"
                aria-expanded={false}
                aria-controls={regionId}
                // The rule is in the name, so it is heard while the cards are folded: "Which nodes, 10 of 24, kind: agency, company".
                aria-label={[
                    `Which ${NOUN[side].many}`,
                    head,
                    none ? `no ${NOUN[side].one} matches` : "",
                    ...(shown.length === 0 ? [empty] : spoken),
                ]
                    .filter((part) => part !== "")
                    .join(", ")}
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
                    {together && <NoneBadge side={side} />}
                </Group>
                <span className="ws-which-chips">
                    {shown.length === 0 ? (
                        // Read with the panel, not a warning: every element is a fine answer.
                        <Text size="xs" c="dimmed" span className="ws-which-hint">
                            {hint}: add a condition to narrow
                        </Text>
                    ) : (
                        shown.map((each, at) => (
                            <Chip
                                key={each.key}
                                session={session}
                                shown={each}
                                side={side}
                                words={words[at]}
                                onCount={(count) => {
                                    setCounts((now) => (now[each.key] === count ? now : { ...now, [each.key]: count }));
                                }}
                            />
                        ))
                    )}
                </span>
            </UnstyledButton>
        </div>
    );
}

/**
 * The base layer's Which row: one line of plain text saying it styles every element and why,
 * never a control.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rows - the rows it reads
 * @param props.side - nodes or edges
 * @returns The line
 */
function BaseRow({
    session,
    rows,
    side,
}: Readonly<{ session: GraphSession; rows: readonly PickRow[]; side: Side }>): React.JSX.Element {
    const stats = session.data.statistics();
    const total = side === "node" ? stats.nodeCount : stats.edgeCount;
    return (
        <div className="ws-which" data-testid="which-picker" data-side={side} data-base="">
            <Text size="xs" className="ws-which-base">
                {rows[0]?.name ?? "This layer"} styles all {many(total, side)}: it is the base layer, under every other
                layer.
            </Text>
        </div>
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
    // Every layer holding it needs no count: the panel's header says how many layers there are.
    const layers = holding < rows ? `, ${String(holding)} of ${String(rows)} layers` : "";
    return `${cardName(shown.card)}: ${LAYER_TOKEN}${layers}`;
}

/**
 * One chip: the card's words and, for a shared card, how many it keeps alone.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.shown - the cards as drawn
 * @param props.side - nodes or edges
 * @param props.words - the chip's words
 * @param props.onCount - takes the count it draws, for the row's name
 * @returns The chip
 */
function Chip({
    session,
    shown,
    side,
    words,
    onCount,
}: Readonly<{
    session: GraphSession;
    shown: Shown;
    side: Side;
    words: string;
    onCount: (count: number | undefined) => void;
}>): React.JSX.Element {
    const { card } = shown;
    // A card picked by hand says its count in its words.
    const count = useLeafCount(session, shown.shared && !isPicked(card) ? leafOf(card) : null, side);
    useEffect(() => {
        onCount(count);
    }, [count, onCount]);
    const finished = isFinished(card);
    return (
        <Tooltip label={`Edit this condition in Which ${NOUN[side].many}`}>
            <span className="ws-chip" data-chip={shown.key} data-todo={finished ? undefined : ""}>
                {words}
                {/* Named, so a count never reads as a second copy of a number in the words; kept on one line. */}
                {count === undefined || count === 0 ? "" : `, ${many(count, side).replace(" ", "\u00a0")}`}
                {count === 0 && <NoneBadge side={side} />}
            </span>
        </Tooltip>
    );
}

/**
 * The warning a condition, or a layer's conditions together, leave when nothing matches: a 0 badge.
 * @param props - Component props
 * @param props.side - nodes or edges
 * @returns The badge
 */
function NoneBadge({ side }: Readonly<{ side: Side }>): React.JSX.Element {
    return (
        <Badge component="span" color="yellow" variant="light" aria-label={`No ${NOUN[side].one} matches`} ml={4}>
            0
        </Badge>
    );
}

/** What a card editor hands back: the card as edited. */
type OnCard = (next: Card) => void;

/**
 * The open picker: "Elements that pass every condition", the cards, "+ Add a condition", the total and
 * Done. Holds the cards as edited, so typing is never undone by a write still on its way; every
 * finished change is written at once, as its own undo step.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rows - the rows it writes
 * @param props.held - cards it edits instead of the rows'
 * @param props.side - nodes or edges
 * @param props.initial - the cards when it opened
 * @param props.focusKey - the card (or "add") to focus first
 * @param props.regionId - the open cards' id, which the row controls
 * @param props.base - the base layer: no condition is added to it
 * @param props.adding - a field to add a card on when the cards open
 * @param props.onElsewhere - goes to the other kind's tab with a card on a field it carries
 * @param props.onClose - closes the cards, handing focus back to the Which row
 * @param props.onLeave - closes the cards where focus has already gone elsewhere
 * @returns The region
 */
function Cards({
    session,
    rows,
    held: holder,
    side,
    initial,
    focusKey,
    regionId,
    base,
    adding,
    onElsewhere,
    onClose,
    onLeave,
}: Readonly<{
    session: GraphSession;
    rows: readonly PickRow[];
    held?: HeldCards;
    side: Side;
    initial: readonly Shown[];
    focusKey: string | null;
    regionId: string;
    base: boolean;
    adding?: string;
    onElsewhere?: (field: CardField) => void;
    onClose: () => void;
    onLeave: () => void;
}>): React.JSX.Element {
    const { store } = useWorkspace();
    // Focus that left the cards for another control closes them, as every pop-out does; the
    // cards stay as edited. A move into one of the cards' own lists (drawn in a portal) comes back
    // into this tree as a focus event before the frame ends, and keeps them open.
    const leaving = useRef(0);
    useEffect(
        () => () => {
            cancelAnimationFrame(leaving.current);
        },
        [],
    );
    const [list, setList] = useState<readonly Shown[]>(initial);
    // How each row's edges followed its node cards when the picker opened.
    const endsAt = useRef(new Map(rows.map((row) => [row.id, row.ends])));
    const [focus, setFocus] = useState<string | null>(focusKey);
    const box = useRef<HTMLDivElement>(null);
    // Each row's selector as the layer held it after this open's last write landed: a layer that
    // holds another while no write is on its way was changed by another hand (Undo, Redo), and the
    // cards show what it holds now.
    const held = useRef(new Map(rows.map((row) => [row.layer.id, row.layer.selector])));
    // The rows as last drawn: a write from a notice's Undo compares with what the layers hold now.
    const drawn = useRef(rows);
    drawn.current = rows;
    // Named for the act, as other style steps are ("changing node size on Hubs"), so Undo reads
    // "Undid changing the conditions on Group 1."
    const changed = rows.length === 1 ? rows[0].name : `${String(rows.length)} layers`;
    const writer = useStepWriter(session, `changing the conditions on ${changed}`, () => {
        for (const row of drawn.current) {
            const now = session.styles.get(row.layer.id);
            if (now !== undefined) {
                held.current.set(row.layer.id, now.selector);
            }
        }
    });
    // A held rule (a filter step) speaks both kinds at once, so it lists Data source once, with the nodes.
    const sourceTwice = holder !== undefined && side === "edge";
    // The columns follow the data: one that arrives while the picker is open is listed, so they
    // are read on every change the element reports, never kept from the first render.
    useSessionVersion(session);
    const fields = cardFields(session, side).filter((field) => !sourceTwice || field.kind !== "source");
    const elsewhere = cardFields(session, side === "node" ? "edge" : "node");
    const bulk = rows.length > 1;
    const stats = session.data.statistics();
    const total = side === "node" ? stats.nodeCount : stats.edgeCount;

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
                : (keystrokeTarget(
                      controls.filter((each) => each.closest(".ws-card-head, .ws-card-remove") === null),
                  ) ?? controls[0]);
        // Drawn with its ring even after a click (a chip, the row), so the reader sees where keys go.
        if (target instanceof HTMLElement) {
            focusWithRing(target);
        }
        setFocus(null);
    }, [focus]);

    // The cards as last edited, for the notices that outlive a render (Undo, a drop on close).
    const latest = useRef(list);
    useEffect(() => {
        if (writer.busy()) {
            return;
        }
        const moved = rows.some((row) => {
            const was = held.current.get(row.layer.id);
            return was !== undefined && !sameSelector(was, row.layer.selector);
        });
        if (moved) {
            for (const row of rows) {
                held.current.set(row.layer.id, row.layer.selector);
            }
            const now = shownOf(rows);
            latest.current = now;
            setList(now);
        }
    }, [rows, writer]);
    // `names` puts back the names the layers had (a notice's Undo), not the ones the cards give.
    const commit = (next: readonly Shown[], names?: ReadonlyMap<string, Pick<Layer, "name" | "userData">>): void => {
        latest.current = next;
        setList(next);
        if (holder !== undefined) {
            holder.onChange(next.map((each) => each.card));
            return;
        }
        const patches = patchesOf(session, drawn.current, next, side, (row) => endsAt.current.get(row.id)).map(
            (each) => {
                const was = names?.get(each.id);
                return was === undefined ? each : { ...each, patch: { ...each.patch, ...was } };
            },
        );
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
        // The last condition gone, the layer styles every element of the kind: said, with Undo.
        const narrows = (cards: readonly Shown[]): boolean =>
            cards.some((each) => each.card.type !== "ends" && isFinished(each.card));
        const removed = list[at];
        if (holder === undefined && !bulk && !base && removed !== undefined && narrows(list) && !narrows(next)) {
            // Undo gives the layer back its cards and the name it had with them.
            const row = rows[0];
            const names = new Map(
                [row.layer, row.edge].flatMap((layer) =>
                    layer === undefined
                        ? []
                        : [[layer.id, { name: layer.name, ...(layer.userData ? { userData: layer.userData } : {}) }]],
                ),
            );
            store.set({
                notice: {
                    message: `${row.name} now styles all ${many(total, side)}: no condition is left`,
                    action: {
                        label: "Undo",
                        run: () => {
                            const now = latest.current;
                            if (!now.some((each) => each.key === removed.key)) {
                                commit([...now.slice(0, at), removed, ...now.slice(at)], names);
                            }
                        },
                    },
                },
            });
        }
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

    // Sent here from the other kind's tab for a field: its card, once, as Add a condition adds it.
    const addOnce = useRef(adding);
    const adder = useRef(add);
    adder.current = add;
    useEffect(() => {
        const path = addOnce.current;
        addOnce.current = undefined;
        const field = path === undefined ? undefined : fields.find((each) => each.path === path);
        const alone = initial.some((each) => each.card.type === "fixed" && each.card.leaf === null);
        if (field !== undefined && !base && !alone) {
            adder.current(field);
        }
    }, [fields, initial, base]);

    // A card with no value yet is not written: closing the cards (Done, Enter, Escape, a click
    // elsewhere) drops it, and says so. Held cards stay as the caller holds them.
    const holding = holder !== undefined;
    useEffect(
        () => () => {
            const dropped = holding ? [] : latest.current.filter((each) => !isFinished(each.card));
            if (dropped.length > 0) {
                store.set({
                    notice: {
                        message:
                            dropped.length === 1
                                ? `Dropped the ${cardName(dropped[0].card)} condition: it was not finished`
                                : `Dropped ${String(dropped.length)} conditions that were not finished`,
                    },
                });
            }
        },
        [store, holding],
    );
    const head = useHead(session, rows, side, holder === undefined ? undefined : list.map((each) => each.card));
    const matched = rows.length === 1 ? session.styles.counts(rows[0].layer.id).matched : undefined;
    let why: string | undefined;
    if (matched === 0 && list.length > 0) {
        why = list.length === 1 ? `${cardName(list[0].card)} leaves none` : "Each condition leaves some; together none";
    }
    const standsAlone = list.some((each) => each.card.type === "fixed" && each.card.leaf === null);

    return (
        <Stack
            ref={box}
            gap={6}
            id={regionId}
            role="group"
            aria-labelledby={`${regionId}-name`}
            className="ws-which-open"
            onFocus={() => {
                cancelAnimationFrame(leaving.current);
            }}
            onBlur={(event) => {
                // Focus with nowhere to go (the window lost it) is not a move to another control.
                if (!(event.relatedTarget instanceof HTMLElement)) {
                    return;
                }
                // Nor is a move to the style tree, where the layer itself is: a new layer opens its
                // cards, and then the tree takes focus to its row and its name box.
                if (event.relatedTarget.closest('[role="tree"][aria-label="Style layers"]') !== null) {
                    return;
                }
                cancelAnimationFrame(leaving.current);
                leaving.current = requestAnimationFrame(onLeave);
            }}
            // Escape on a button in the cards (a card's remove button too) closes them: caught on
            // the way down, since a button's focus tooltip takes the Escape that bubbles. A text
            // box or an open list keeps its own Escape and closes the cards as it bubbles.
            onKeyDownCapture={(event) => {
                const target = event.target as HTMLElement;
                const ownEscape = target.matches("input, textarea, [contenteditable='true'], [aria-expanded='true']");
                if (!ownEscape && isPanelEscape(event.nativeEvent)) {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                }
            }}
            onKeyDown={(event) => {
                // Held cards leave their Enter to the caller too (a filter step's form adds the
                // step), closing after it: closed now, the box would be gone before the form saw it.
                if (holding && isDoneKey(event)) {
                    requestAnimationFrame(onClose);
                } else if (isPanelEscape(event.nativeEvent) || isDoneKey(event)) {
                    event.preventDefault();
                    event.stopPropagation();
                    onClose();
                }
            }}
        >
            <Group gap={4} wrap="nowrap">
                {/* The group's name, and a heading at the level of the sections around it, as the
                    folded row is, so a heading walk still lands here while the cards are open. */}
                <Text size="xs" fw={600} id={`${regionId}-name`} role="heading" aria-level={3}>
                    Which {NOUN[side].many}
                </Text>
                <Text size="xs" c="dimmed" ml="auto">
                    {head}
                </Text>
            </Group>
            <Text size="xs" c="dimmed">
                {NOUN[side].many.charAt(0).toUpperCase() + NOUN[side].many.slice(1)} that pass every condition
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
            {!standsAlone && !base && (
                <AddCondition
                    fields={fields}
                    elsewhere={elsewhere}
                    used={list.map((each) => each.key)}
                    onAdd={add}
                    onElsewhere={onElsewhere}
                />
            )}
            {/* Done stays with no card left, so removing the last one never strands the reader. */}
            <Group justify="flex-end">
                <Button size="compact-xs" onClick={onClose}>
                    Done
                </Button>
            </Group>
        </Stack>
    );
}

/**
 * Whether a key finishes the open cards as Done does: Enter in a card's text or number box that
 * holds what it takes (a refused number stays, with its reason).
 * @param event - the key.
 * @returns true for that Enter.
 */
function isDoneKey(event: React.KeyboardEvent): boolean {
    return (
        event.key === "Enter" &&
        !event.nativeEvent.isComposing &&
        // Enter on a value listed under a text box takes the value; the next Enter is Done.
        !event.defaultPrevented &&
        event.target instanceof HTMLElement &&
        event.target.matches("[data-enter-done]:not([aria-invalid=true])")
    );
}

/**
 * Enter on an unticked value ticks it, as a pick does, and keeps the cards open; Enter on a ticked
 * value is Done (`isDoneKey`). A check box takes no Enter of its own, so without this the first
 * Enter closed the cards with nothing ticked.
 * @param event - the key, on the value's check box.
 */
function tickOnEnter(event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Enter" && !event.nativeEvent.isComposing && !event.currentTarget.checked) {
        event.preventDefault();
        event.currentTarget.click();
    }
}

/** The notice a layer's refused rule leaves. */
const RULE_REFUSED = "That rule could not be used for this layer";

/**
 * Writes several layers, one undo step per finished change: a number typed and committed, a handle
 * dragged, a match picked. Typing that writes as it goes (a text card's words) is one step while
 * focus stays in that box: each keystroke merges into the step its first one recorded
 * (`TransactionOptions.after`) while it is still the newest. Writes go one at a time, and a write
 * waiting behind another is replaced by a newer one.
 * @param session - the element's session.
 * @param label - the step's label.
 * @param landed - called after each write has landed (or been refused).
 * @returns the writer, and whether a write is on its way.
 */
function useStepWriter(
    session: GraphSession,
    label: string,
    landed: () => void,
): { write: (patches: readonly LayerPatch[]) => void; busy: () => boolean } {
    const { store } = useWorkspace();
    const step = useRef<HistoryStepId | undefined>(undefined);
    const chain = useRef<Promise<void>>(Promise.resolve());
    const waiting = useRef<{ patches: readonly LayerPatch[]; merge: boolean } | null>(null);
    const pending = useRef(0);
    // The box whose typing the last step holds: typing on in it merges, anything else starts a step.
    const typingIn = useRef<Element | null>(null);
    return {
        busy: () => pending.current > 0,
        write: (patches) => {
            const active = document.activeElement;
            const typing = isTypingTarget(active) && hasPendingEdit(active) ? active : null;
            const merge = typing !== null && typing === typingIn.current;
            typingIn.current = typing;
            const queued = waiting.current;
            // A write that replaces a queued one starts a step when either would have.
            waiting.current = { patches, merge: merge && (queued?.merge ?? true) };
            if (queued !== null) {
                return;
            }
            pending.current += 1;
            chain.current = chain.current
                .then(async () => {
                    const next = waiting.current;
                    waiting.current = null;
                    if (next === null) {
                        return;
                    }
                    const after = next.merge ? step.current : undefined;
                    await session.transaction(
                        label,
                        (tx) => tx.styles.updateMany(next.patches),
                        after === undefined ? {} : { after },
                    );
                    step.current = after ?? session.history.steps[session.history.position - 1]?.id;
                })
                .then(() => {
                    // A rule the layer took clears the notice a refused one left.
                    if (store.get().notice?.message === RULE_REFUSED) {
                        store.set({ notice: null });
                    }
                })
                .catch(() => {
                    store.set({ notice: { message: RULE_REFUSED, error: true } });
                })
                .finally(() => {
                    landed();
                    pending.current -= 1;
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
    if (empty.length === 0) {
        return undefined;
    }
    const verb = empty.length === 1 ? "layer now matches" : "layers now match";
    return `${String(empty.length)} ${verb} nothing: ${empty.join(", ")}`;
}

/**
 * "+ Add a condition": a searchable list of every field of the kind, grouped Data, Results and
 * Structure; a field that is already a condition is marked, and picking it goes to that card.
 * @param props - Component props
 * @param props.fields - the fields of the kind
 * @param props.elsewhere - the other kind's fields, named when a search finds none of this kind's
 * @param props.used - the card keys already drawn
 * @param props.onAdd - adds a card on a field
 * @param props.onElsewhere - goes to the other kind's tab with a card on its field
 * @returns The control
 */
export function AddCondition({
    fields,
    elsewhere = [],
    used,
    onAdd,
    onElsewhere,
}: Readonly<{
    fields: readonly CardField[];
    elsewhere?: readonly CardField[];
    used: readonly string[];
    onAdd: (field: CardField) => void;
    onElsewhere?: (field: CardField) => void;
}>): React.JSX.Element {
    const [search, setSearch] = useState("");
    // The option Enter takes, which the search names as its active descendant.
    const [active, setActive] = useState<string | null>(null);
    const [width, setWidth] = useState(220);
    const listId = useId();
    const button = useRef<HTMLButtonElement>(null);
    const combobox = useCombobox({
        onDropdownClose: () => {
            combobox.resetSelectedOption();
            setSearch("");
            setActive(null);
        },
        onDropdownOpen: () => {
            // As wide as the cards it adds to, so the list stays inside the inspector.
            const column = button.current?.closest(".ws-which-open");
            if (column instanceof HTMLElement && column.clientWidth > 0) {
                setWidth(column.clientWidth);
            }
            combobox.focusSearchInput();
        },
    });
    const typed = search.trim().toLowerCase();
    const found = (each: CardField): boolean => typed === "" || each.name.toLowerCase().includes(typed);
    // A name that starts with the typed text first, in its group, and its group first.
    const groups = prefixFirst(
        (["Data", "Results", "Structure"] as const).flatMap((group) => {
            const items = prefixFirst(
                fields.filter((f) => f.group === group && found(f)),
                (each) => each.name,
                search,
            );
            return items.length === 0 ? [] : [{ group, items }];
        }),
        ({ items }) => items[0].name,
        search,
    );
    const count = groups.reduce((sum, { items }) => sum + items.length, 0);
    // Typed on one kind's tab, a value the other kind carries is pointed to its tab.
    const other = typed === "" ? undefined : prefixFirst(elsewhere.filter(found), (each) => each.name, search)[0];
    const otherTab = other?.on === "edge" ? "Edge" : "Node";
    const otherKind = other?.on === "edge" ? "an edge" : "a node";
    const nothingWords =
        other === undefined ? "Nothing found" : `${other.name} is ${otherKind} attribute; it is on the ${otherTab} tab`;
    // The other kind's field is one step away: its tab, with a card on it.
    const goElsewhere =
        other === undefined || onElsewhere === undefined
            ? undefined
            : (): void => {
                  combobox.closeDropdown();
                  onElsewhere(other);
              };
    const { dropdownOpened, selectFirstOption, resetSelectedOption } = combobox;
    // "Nothing found" sits in the list, which a screen reader does not read while focus is in the
    // search: the status line says it each time typing empties the list.
    const { store } = useWorkspace();
    const nothing = dropdownOpened && count === 0;
    const spoken =
        goElsewhere === undefined || other === undefined
            ? nothingWords
            : `${nothingWords}. Enter adds ${other.name} on the ${otherTab} tab`;
    useEffect(() => {
        if (nothing) {
            store.set({ announcement: spoken });
        }
    }, [nothing, spoken, store]);
    // After typing, the first match is the active option, so Enter takes it with no arrow key.
    useEffect(() => {
        if (!dropdownOpened) {
            return;
        }
        if (typed === "") {
            resetSelectedOption();
            setActive(null);
            return;
        }
        setActive(selectFirstOption());
    }, [typed, dropdownOpened, selectFirstOption, resetSelectedOption]);
    const keys = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.nativeEvent.isComposing) {
            return;
        }
        switch (event.key) {
            case "ArrowDown":
            case "ArrowUp":
                event.preventDefault();
                setActive(event.key === "ArrowDown" ? combobox.selectNextOption() : combobox.selectPreviousOption());
                break;
            case "Enter":
                if (combobox.getSelectedOptionIndex() !== -1) {
                    event.preventDefault();
                    combobox.clickSelectedOption();
                } else if (count === 0 && goElsewhere !== undefined) {
                    event.preventDefault();
                    goElsewhere();
                }
                break;
            case "Escape":
                // Escape closes the list only, not the picker it opened from.
                event.preventDefault();
                combobox.closeDropdown();
                button.current?.focus();
                break;
            case "Tab":
                // With letters typed, Tab takes the attribute they highlight and moves on into its
                // card, as a select's type-ahead does.
                if (!event.shiftKey && typed !== "" && combobox.getSelectedOptionIndex() !== -1) {
                    event.preventDefault();
                    combobox.clickSelectedOption();
                    break;
                }
                // Else Tab leaves the list closed: Shift+Tab lands on Add a condition, Tab moves on
                // from it, never into the list.
                combobox.closeDropdown();
                if (event.shiftKey) {
                    event.preventDefault();
                }
                button.current?.focus();
                break;
            default:
                break;
        }
    };
    return (
        <Combobox
            store={combobox}
            width={width}
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
                    aria-expanded={dropdownOpened}
                    onClick={() => {
                        combobox.toggleDropdown();
                    }}
                    onKeyDown={(event) => {
                        // An open list takes Escape; the picker around it stays open.
                        if (event.key === "Escape" && dropdownOpened) {
                            event.preventDefault();
                            combobox.closeDropdown();
                        }
                    }}
                    style={{ alignSelf: "flex-start" }}
                >
                    Add a condition
                </Button>
            </Combobox.Target>
            <Combobox.Dropdown>
                <Combobox.Search // NOSONAR(S6811): aria-description is a global ARIA 1.3 attribute, valid on a combobox
                    value={search}
                    onChange={(event) => {
                        setSearch(event.currentTarget.value);
                    }}
                    placeholder={FIND_ATTRIBUTE}
                    aria-label={FIND_ATTRIBUTE}
                    // A combobox over the list below: what it controls, the option Enter takes,
                    // and how many it holds.
                    role="combobox"
                    aria-expanded={dropdownOpened}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={active ?? undefined}
                    aria-description={count === 1 ? "1 option" : `${String(count)} options`}
                    withKeyboardNavigation={false}
                    onKeyDown={keys}
                />
                <Combobox.Options
                    id={listId}
                    // The list is reached from the search with the arrows, never by Tab.
                    tabIndex={-1}
                    mah={240}
                    style={{ overflowY: "auto" }}
                    aria-label="Attributes"
                >
                    {groups.length === 0 ? (
                        <Combobox.Empty>
                            {nothingWords}
                            {goElsewhere !== undefined && other !== undefined && (
                                <Button
                                    size="compact-xs"
                                    variant="subtle"
                                    mt={4}
                                    // A long attribute name wraps inside the list's width, never
                                    // scrolling the list sideways.
                                    h="auto"
                                    maw="100%"
                                    styles={{ label: { whiteSpace: "normal", textAlign: "start" } }}
                                    // A press in the list must not take focus from the search first.
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                    }}
                                    onClick={goElsewhere}
                                >
                                    Add {other.name} on the {otherTab} tab
                                </Button>
                            )}
                        </Combobox.Empty>
                    ) : (
                        groups.map(({ group, items }) => (
                            <Combobox.Group key={group} label={group}>
                                {items.map((field) => {
                                    const key = keyOf(field);
                                    const inUse = used.includes(key);
                                    // The icon the Vary by list draws for the same value; the node id reads as text.
                                    const Glyph = glyphOf(field.kind);
                                    return (
                                        <Combobox.Option
                                            key={key}
                                            value={key}
                                            // Its fact and whether it is a condition already are part of
                                            // what it is: "Degree, 1 to 36", as in the Vary by list.
                                            aria-label={[
                                                field.name,
                                                ...(field.fact === undefined ? [] : [field.fact]),
                                                ...(inUse ? ["already a condition"] : []),
                                            ].join(", ")}
                                        >
                                            <Group gap={8} wrap="nowrap" justify="space-between">
                                                <Group gap={8} wrap="nowrap">
                                                    <Glyph size={14} aria-hidden style={{ flexShrink: 0 }} />
                                                    <span>
                                                        {field.name}
                                                        {inUse ? " (already a condition)" : ""}
                                                    </span>
                                                </Group>
                                                {field.fact !== undefined && (
                                                    <Text size="xs" c="dimmed" span>
                                                        {field.fact}
                                                    </Text>
                                                )}
                                            </Group>
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

/**
 * The icon a field is listed with: the one the Vary by list draws for the same value, text for the
 * node id, a file for the Data source.
 * @param kind - the field's kind.
 * @returns the icon.
 */
function glyphOf(kind: CardField["kind"]): (typeof VALUE_GLYPHS)[keyof typeof VALUE_GLYPHS] {
    if (kind === "source") {
        return GLYPHS.file;
    }
    return VALUE_GLYPHS[kind === "name" ? "text" : kind];
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
    // A card picked by hand says its count in its words.
    let counted: RuleTree | null = isPicked(card) ? null : leafOf(card);
    if (card.type === "ends") {
        counted = endsLeaf;
    }
    // An unfinished card keeps nothing yet, so it shows no count until it has a value.
    const count = useLeafCount(session, counted, side, reading);
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
                        {many(count, side)}
                    </Text>
                )}
            </Group>
            {/* Drawn in the header's corner, and first in Tab order there, as it is drawn. */}
            <Tooltip label={`Remove ${name}`}>
                <CloseButton
                    size="xs"
                    className="ws-card-remove"
                    aria-label={`Remove ${name}`}
                    onClick={onRemove}
                    onKeyDown={(event) => {
                        if (event.key === "Delete") {
                            onRemove();
                        }
                    }}
                />
            </Tooltip>
            <CardBody session={session} card={card} side={side} onChange={onChange} />
        </div>
    );
}

/**
 * The body of a card, by its type: a layer's card and a filter card draw the same one.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.side - nodes or edges
 * @param props.onChange - takes the card as edited
 * @param props.blank - a new card with no value picked yet: a yes-or-no card shows no choice
 * @returns The body
 */
export function CardBody({
    session,
    card,
    side,
    onChange,
    blank = false,
}: Readonly<{
    session: GraphSession;
    card: Card;
    side: Side;
    onChange: OnCard;
    blank?: boolean;
}>): React.JSX.Element | null {
    switch (card.type) {
        case "number":
            return <NumberCard session={session} card={card} side={side} onChange={onChange} />;
        case "category":
            return <CategoryCard session={session} card={card} side={side} onChange={onChange} />;
        case "text":
            return <TextCard session={session} card={card} onChange={onChange} />;
        case "source":
            return <SourceCard session={session} card={card} side={side} onChange={onChange} />;
        case "yes-no":
            return (
                <MatchSelect
                    name={card.field.name}
                    value={blank ? null : card.match}
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
                    {fixedText(card.leaf)}
                </Text>
            );
    }
}

/**
 * A fixed card's leaf as its body says it: the ids picked by hand, an expression as it was typed,
 * any other leaf as the element holds it.
 * @param leaf - the leaf.
 * @returns the text.
 */
function fixedText(leaf: RuleTree): string {
    if (leaf.kind === "member" && typeof leaf.of === "object" && "nodes" in leaf.of) {
        const ids = leaf.of.nodes.map(String);
        return ids.length > 5 ? `${ids.slice(0, 5).join(", ")}, +${String(ids.length - 5)}` : ids.join(", ");
    }
    return leaf.kind === "expression" ? leaf.where : JSON.stringify(leaf);
}

/**
 * A card's Match select.
 * @param props - Component props
 * @param props.name - the field's name
 * @param props.value - the chosen value, or null while none is
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
    value: string | null;
    data: readonly { value: string; label: string }[];
    onChange: (value: string) => void;
}>): React.JSX.Element {
    // A match picked hands focus to the card's value box, where the next keystroke belongs, once
    // the card draws it with that match; a match with no box (Has a value, Yes) keeps focus here.
    const input = useRef<HTMLInputElement>(null);
    const [picked, setPicked] = useState<string | null>(null);
    useEffect(() => {
        if (picked !== null && picked === value) {
            setPicked(null);
            input.current?.closest("[data-card-body]")?.querySelector<HTMLElement>(VALUE_BOX)?.focus();
        }
    }, [picked, value]);
    return (
        <Select
            ref={input}
            size="xs"
            // Named for what it chooses beside the card's column; the select says its own value.
            aria-label={`${name}: how to match`}
            allowDeselect={false}
            data={[...data]}
            value={value}
            onChange={(next) => {
                if (next !== null) {
                    setPicked(next);
                    onChange(next);
                }
            }}
        />
    );
}

/**
 * What a number box holds as typed: the number, nothing (an empty box), or text that is no
 * number. Grouping separators are read ("10,000" is 10000); anything else that is not part of a
 * number ("$10,000", "10 km") is refused rather than read as part of it.
 * @param text - the box's text.
 * @param parse - reads one number in the reader's locale.
 * @returns the number, undefined for an empty box, or null when the text is no number.
 */
function readTyped(text: string, parse: (text: string) => number): number | undefined | null {
    if (text.trim() === "") {
        return undefined;
    }
    if (!/^[\p{Nd}\p{Zs}.,'+\-\u2212]+$/u.test(text)) {
        return null;
    }
    const n = parse(text);
    return Number.isFinite(n) ? n : null;
}

/**
 * A digit typed after a starting 0 replaces it ("05" is "5"), as it would in a box whose 0 was
 * selected; "0.5" keeps its 0.
 * @param text - the box's text.
 * @returns the text.
 */
const dropLeadingZeros = (text: string): string => text.replace(/^(-?)0+(?=\p{Nd})/u, "$1");

/**
 * A number card's box: holds what the reader types until a commit (Enter, leaving the box), so a
 * keystroke is never lost or turned into another number, and selects its value whenever focus
 * comes in (a click, a Tab, focus put there after a choice), so typing replaces it. Escape in a
 * box that holds text keeps it (commits it) and keeps the picker open; an empty box's Escape goes
 * on to the card.
 * @param props - Component props
 * @param props.label - the box's accessible name
 * @param props.text - what the box shows
 * @param props.invalid - whether the last commit refused what it holds
 * @param props.describedBy - the id of the message that says why
 * @param props.onText - takes the text as typed
 * @param props.onCommit - called on Enter, and with true when focus leaves
 * @returns The box
 */
function NumberBox({
    label,
    text,
    invalid,
    describedBy,
    onText,
    onCommit,
}: Readonly<{
    label: string;
    text: string;
    invalid: boolean;
    describedBy: string | undefined;
    onText: (text: string) => void;
    onCommit: (leaving?: boolean) => void;
}>): React.JSX.Element {
    const justFocused = useRef(false);
    return (
        <TextInput
            size="xs"
            inputMode="decimal"
            data-enter-done
            aria-label={label}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? describedBy : undefined}
            error={invalid}
            value={text}
            onChange={(event) => {
                onText(dropLeadingZeros(event.currentTarget.value));
            }}
            onFocus={(event) => {
                justFocused.current = true;
                event.currentTarget.select();
            }}
            onMouseUp={(event) => {
                if (justFocused.current) {
                    event.preventDefault();
                    event.currentTarget.select();
                }
                justFocused.current = false;
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    // Committed before the key reaches the card, so a refused box is marked by
                    // then and Enter closes the card only when the box held what it takes.
                    flushSync(() => {
                        onCommit();
                    });
                } else if (event.key === "Escape" && event.currentTarget.value !== "") {
                    event.preventDefault();
                    event.stopPropagation();
                    onCommit();
                }
            }}
            onBlur={() => {
                justFocused.current = false;
                onCommit(true);
            }}
        />
    );
}

/** Why a number card's boxes are refused: no number, from above to, no whole count, more than there are. */
type Refusal = "number" | "order" | "whole" | "count";

/** A number card's typed text per box, while it differs from what the card holds. */
interface Drafts {
    readonly min?: string;
    readonly max?: string;
    readonly top?: string;
}

/**
 * What is wrong with a number card's boxes as typed, or nothing; and the numbers they hold.
 * @param drafts - the typed text.
 * @param card - the card.
 * @param parse - reads one number.
 * @param example - a number from the column's own range, to show what the box takes.
 * @param total - the elements a count can keep.
 * @param total.count - how many there are, the most a count can keep.
 * @param total.side - nodes or edges, for their noun.
 * @returns the numbers, the boxes that refuse them, what to do about it (`why`), and the reason
 * alone (`gist`) for words said after the card has gone.
 */
function checkDrafts(
    drafts: Drafts,
    card: Extract<Card, { type: "number" }>,
    parse: (text: string) => number,
    example: string,
    total: { readonly count: number; readonly side: Side },
): {
    min?: number;
    max?: number;
    top?: number;
    bad: readonly (keyof Drafts)[];
    why?: string;
    gist?: string;
    reason?: Refusal;
} {
    const read = (key: keyof Drafts, held: number | undefined): number | undefined | null =>
        drafts[key] === undefined ? held : readTyped(drafts[key], parse);
    const min = read("min", card.min);
    const max = read("max", card.max);
    const top = read("top", card.top);
    const notNumber = (["min", "max", "top"] as const).filter(
        (key) => ({ min, max, top })[key] === null && drafts[key] !== undefined,
    );
    const values = {
        ...(min === null || min === undefined ? {} : { min }),
        ...(max === null || max === undefined ? {} : { max }),
        ...(top === null || top === undefined ? {} : { top }),
    };
    if (notNumber.length > 0) {
        const typed = drafts[notNumber[0]] ?? "";
        return {
            ...values,
            bad: notNumber,
            why: `"${typed.trim()}" is not a number. Type a number, like ${example}.`,
            gist: `"${typed.trim()}" is not a number`,
            reason: "number",
        };
    }
    if (card.match === "range" && values.min !== undefined && values.max !== undefined && values.min > values.max) {
        const typed: (keyof Drafts)[] = drafts.max === undefined ? ["min"] : ["max"];
        return {
            ...values,
            bad: typed,
            why: `From is above to: ${String(values.min)} is more than ${String(values.max)}.`,
            gist: `from is above to (${String(values.min)} is more than ${String(values.max)})`,
            reason: "order",
        };
    }
    if (card.match === "top" && values.top !== undefined && (!Number.isInteger(values.top) || values.top < 1)) {
        return {
            ...values,
            bad: ["top"],
            why: "Type a whole number of 1 or more.",
            gist: "a count is a whole number of 1 or more",
            reason: "whole",
        };
    }
    if (card.match === "top" && values.top !== undefined && drafts.top !== undefined && values.top > total.count) {
        const all = many(total.count, total.side);
        return {
            ...values,
            bad: ["top"],
            why: `There are only ${all}. Type ${String(total.count)} to keep all ${String(total.count)}, or fewer.`,
            gist: `there are only ${all}`,
            reason: "count",
        };
    }
    return { ...values, bad: [] };
}

/**
 * A number card: between two values (a range slider and two boxes, unclamped), or the highest N of
 * all the elements, or has / has no value. A box holds what is typed until the card can take it: a
 * text that is no number, or a from above its to, says why under the boxes and writes nothing.
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
    const stats = session.data.statistics();
    const total = side === "node" ? stats.nodeCount : stats.edgeCount;
    const parse = useNumberParser();
    const { store } = useWorkspace();
    const [drafts, setDrafts] = useState<Drafts>({});
    // What the last commit refused. It changes only on a commit, so typing raises no message.
    const [refused, setRefused] = useState<{
        bad: readonly (keyof Drafts)[];
        why: string;
        reason?: Refusal;
    } | null>(null);
    const messageId = useId();
    const low = range?.min ?? 0;
    const high = range?.max ?? 1;
    const step = Number.isInteger(low) && Number.isInteger(high) ? 1 : (high - low) / 100 || 1;
    // A bound's example is a value from the column's range; a count's, a count there is room for.
    const example =
        card.match === "top"
            ? String(Math.max(1, Math.min(10, total)))
            : formatNumber(Number(((low + high) / 2).toPrecision(2)));
    // What the count and the drawing still use while a box holds what the card cannot take.
    const held =
        card.match === "top"
            ? `the highest ${String(card.top ?? 10)}`
            : `${String(card.min ?? low)} to ${String(card.max ?? high)}`;
    // Typing still held when the card goes (the picker closed, the card removed) is said, not lost.
    const leaving = useRef<string | null>(null);
    const count = { count: total, side };
    const check = checkDrafts(drafts, card, parse, example, count);
    leaving.current = check.bad.length > 0 ? `${name}: ${check.gist ?? ""}, so it went back to ${held}.` : null;
    useEffect(
        () => () => {
            if (leaving.current !== null) {
                store.set({ notice: { message: leaving.current, error: false } });
            }
        },
        [store],
    );
    // A press that took focus out of a box (on Done, on another card) lands where it was aimed:
    // a refusal drawn at once would push the controls below it down under the pointer.
    const pressing = useRef(false);
    useEffect(() => {
        const down = (): void => {
            pressing.current = true;
        };
        const up = (): void => {
            pressing.current = false;
        };
        globalThis.addEventListener("pointerdown", down, true);
        globalThis.addEventListener("pointerup", up, true);
        return () => {
            globalThis.removeEventListener("pointerdown", down, true);
            globalThis.removeEventListener("pointerup", up, true);
        };
    }, []);
    const commit = (leaving = false): void => {
        const now = checkDrafts(drafts, card, parse, example, count);
        if (now.bad.length > 0) {
            const refusal = {
                bad: now.bad,
                why: `${now.why ?? ""} The count and drawing still use ${held}.`,
                reason: now.reason,
            };
            if (leaving && pressing.current) {
                // After the press's click, which a pointerup's task dispatches before a timeout.
                globalThis.addEventListener(
                    "pointerup",
                    () => {
                        setTimeout(() => {
                            setRefused(refusal);
                        });
                    },
                    { once: true },
                );
            } else {
                setRefused(refusal);
            }
            return;
        }
        setRefused(null);
        setDrafts({});
        const edited = { ...card, min: now.min, max: now.max, top: now.top };
        if (edited.min !== card.min || edited.max !== card.max || edited.top !== card.top) {
            onChange(edited);
        }
    };
    const clear = (): void => {
        setDrafts({});
        setRefused(null);
    };
    const shown = (key: keyof Drafts): string => drafts[key] ?? (card[key] === undefined ? "" : String(card[key]));
    const box = (key: keyof Drafts, label: string): React.JSX.Element => (
        <NumberBox
            label={label}
            text={shown(key)}
            invalid={refused?.bad.includes(key) ?? false}
            describedBy={messageId}
            onText={(text) => {
                const next = { ...drafts, [key]: text };
                setDrafts(next);
                // A refusal goes as soon as the text it named is taken; a new one waits for a commit.
                if (refused !== null) {
                    const still = checkDrafts(next, card, parse, example, count);
                    const bad = refused.bad.filter((each) => still.bad.includes(each));
                    // Text refused for another reason now is not said until it is committed.
                    setRefused(bad.length === 0 || still.reason !== refused.reason ? null : { ...refused, bad });
                }
            }}
            onCommit={commit}
        />
    );
    return (
        <Stack gap={4} data-card-body>
            <MatchSelect
                name={name}
                value={card.match}
                data={[{ value: "range", label: "Between" }, { value: "top", label: "Highest" }, ...PRESENCE]}
                onChange={(match) => {
                    clear();
                    onChange({
                        ...card,
                        match: match as typeof card.match,
                        ...(match === "top" && card.top === undefined ? { top: Math.max(1, Math.min(10, total)) } : {}),
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
                        thumbFromLabel={`${name} range start`}
                        thumbToLabel={`${name} range end`}
                        value={[Math.max(low, card.min ?? low), Math.min(high, card.max ?? high)]}
                        onChangeEnd={([min, max]) => {
                            clear();
                            onChange({ ...card, min, max });
                        }}
                    />
                    <Group gap={4} wrap="nowrap">
                        {box("min", `${name} from, number`)}
                        <Text size="xs">to</Text>
                        {box("max", `${name} to, number`)}
                    </Group>
                </>
            )}
            {card.match === "top" && (
                <Group gap={4} wrap="nowrap">
                    {box("top", `${name}: how many`)}
                    <Text size="xs" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                        of all {NOUN[side].many}
                    </Text>
                </Group>
            )}
            {refused !== null && (
                <Text id={messageId} size="xs" c="var(--cm-text-danger)" role="alert">
                    {refused.why}
                </Text>
            )}
            {refused === null && card.match === "top" && (card.top ?? 0) > total && (
                <Text size="xs" c="dimmed">
                    There are only {many(total, side)}, so this keeps all of them.
                </Text>
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
    const named = counts.values
        .map((each) => ({
            value: String(each.value),
            label: valueName(session, path, each.value),
            count: each.count,
        }))
        // Largest first, then GAL1, GAL2 ... GAL10, as a reader counts.
        .sort((a, b) => b.count - a.count || NATURAL.compare(a.label, b.label));
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
                                data-enter-done
                                onKeyDown={tickOnEnter}
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
                                data-enter-done
                                onKeyDown={tickOnEnter}
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
 * A Data source card: a checklist of the loads, each with how many elements of the kind it
 * supplied, ticked ones being alternatives (a `source` leaf).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.side - nodes or edges
 * @param props.onChange - takes the card as edited
 * @returns The body
 */
function SourceCard({
    session,
    card,
    side,
    onChange,
}: Readonly<{
    session: GraphSession;
    card: Extract<Card, { type: "source" }>;
    side: Side;
    onChange: OnCard;
}>): React.JSX.Element {
    const { name } = card.field;
    return (
        <Stack gap={2} role="group" aria-label={`${name} values`}>
            {session.data.sources().map((load) => (
                <Checkbox
                    key={load.key}
                    size="xs"
                    label={`${sourceName(load)}, ${many(side === "node" ? load.counts.nodes : load.counts.edges, side)}`}
                    data-enter-done
                    onKeyDown={tickOnEnter}
                    checked={card.sources.includes(load.key)}
                    onChange={(event) => {
                        const on = event.currentTarget.checked;
                        const sources = on
                            ? [...card.sources, load.key]
                            : card.sources.filter((key) => key !== load.key);
                        onChange({ ...card, sources });
                    }}
                />
            ))}
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
    // The menu is in sentence case like every other Match menu; a chip keeps the words lower case.
    const modes = (Object.keys(TEXT_WORDS) as TextMode[]).map((mode) => ({
        value: mode,
        label: TEXT_WORDS[mode].charAt(0).toUpperCase() + TEXT_WORDS[mode].slice(1),
    }));
    const data = [
        ...modes,
        ...(isName ? [] : PRESENCE),
        ...(card.match === "list" ? [{ value: "list", label: "Is one of these" }] : []),
    ];
    const selected = session.selection.nodes;
    // The column's values that hold the typed text, those that start with it first, in natural order.
    const [opened, setOpened] = useState(false);
    const values = useMemo(
        () =>
            isName
                ? []
                : [
                      ...new Set(
                          session.data
                              .valueCounts(card.field.path, { kind: card.field.on })
                              .values.map((each) => String(each.value)),
                      ),
                  ].sort(NATURAL.compare),
        [session, isName, card.field.path, card.field.on],
    );
    const typed = card.text.trim().toLowerCase();
    const listed = prefixFirst(
        values.filter((value) => value.toLowerCase().includes(typed)),
        (value) => value,
        typed,
    );
    return (
        <Stack gap={4} data-card-body>
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
                        <Autocomplete
                            size="xs"
                            aria-label={`${name}: text to match`}
                            data-enter-done
                            placeholder="Type the text to match"
                            data={listed}
                            filter={({ options }) => options}
                            // Focus put here (the card opening, Undo, a card removed) never opens
                            // the list: typing or ArrowDown does, so a stray Enter cannot take a
                            // suggestion over the text the rule holds.
                            openOnFocus={false}
                            // ArrowDown on a closed list only opens it, with nothing highlighted, so
                            // the Enter after it is Done, not a suggestion; the next ArrowDown walks.
                            // Escape with the list shut keeps the text and the picker open; an
                            // open list's Escape closes the list only, and an empty box's goes on.
                            onKeyDownCapture={(event) => {
                                const shut = !("expanded" in event.currentTarget.dataset);
                                if (
                                    (event.key === "ArrowDown" && !opened) ||
                                    (event.key === "Escape" && shut && card.text !== "")
                                ) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (event.key === "ArrowDown") {
                                        setOpened(true);
                                    }
                                }
                            }}
                            // Listed once something is typed: an empty box opens on nothing.
                            dropdownOpened={opened && typed !== "" && listed.length > 0}
                            onDropdownOpen={() => {
                                setOpened(true);
                            }}
                            onDropdownClose={() => {
                                setOpened(false);
                            }}
                            value={card.text}
                            onChange={(text) => {
                                onChange({ ...card, text });
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
            </Group>
            {/* Drawn in the header's corner, and first in Tab order there, as it is drawn. */}
            <Tooltip label={`Remove ${name} from every layer`}>
                <CloseButton
                    size="xs"
                    className="ws-card-remove"
                    aria-label={`Remove ${name} from every layer`}
                    onClick={onRemove}
                />
            </Tooltip>
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
        <div // NOSONAR(S6819): a list item of an ARIA list drawn as a stack; an li would draw a bullet and indent
            role="listitem"
        >
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
