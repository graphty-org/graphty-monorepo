import {
    focusWithRing,
    HistogramRow,
    LISTBOX_CLASS_NAMES,
    RangeSlider,
    useNumberParser,
} from "@graphty/compact-mantine";
import {
    fileStyleOf,
    type GraphSession,
    type Layer,
    type LayerPatch,
    type RuleTree,
    type Scope,
} from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Autocomplete,
    Badge,
    Button,
    Checkbox,
    CloseButton,
    Combobox,
    Group,
    ScrollArea,
    Select,
    Stack,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
    useCombobox,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import React, { useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { sourceName } from "../data-place/words";
import { selectionWorkspaceOn } from "../features";
import { GLYPHS, VALUE_GLYPHS } from "../glyphs";
import { findTreeRow } from "../graph-place/rows";
import { useAsyncValue, useSessionVersion } from "../inspector/hooks";
import { formatNumber } from "../inspector/words";
import { isPanelEscape } from "../keys/keys";
import { StyleSelection } from "../selection/StyleSelection";
import { layerSelection } from "../selection/values";
import { formatCount } from "../settings/numberFormat";
import { useAnnounceChange } from "../state/useAnnounceChange";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { barHeights } from "./barHeights";
import {
    type Card,
    type CardField,
    cardFields,
    cardsName,
    cardWords,
    checklistRows,
    dayWords,
    DEFAULT_NAME_KEY,
    edgeCards,
    endWords,
    isFinished,
    isPicked,
    keyOf,
    leafOf,
    newCard,
    nodeCards,
    nodeLeaves,
    sameSelector,
    selectorOf,
    SHOWN_VALUES,
    type Side,
    spanOf,
    startWords,
    TEXT_WORDS,
    type TextMode,
} from "./cards";
import { DrawnSwatches } from "./drawnSwatches";
import { keystrokeTarget } from "./useFocusLine";
import { useStepWriter } from "./useStepWriter";
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
                nodes: nodeLayer === undefined ? [] : nodeLeaves(nodeLayer.selector),
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
 * stands alone (edges picked by hand), so no single rule says it.
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
    const rule = `${JSON.stringify(leaf)} ${side} ${reading}`;
    // Each count carries the rule it was counted for: on the render after the rule changes, the
    // read still holds the old rule's count, which must not pass for the new one.
    const counted = useAsyncValue(
        () =>
            leaf === null
                ? null
                : session.scope
                      .count({ define: { kind: "rule", where: leaf, reading } })
                      .then((each) => ({ rule, value: side === "node" ? each.nodes : each.edges })),
        `${rule} ${String(session.history.version)}`,
    );
    // The history moves for changes the count does not read (the layout settling, a color), and
    // each one counts again: the same rule keeps saying its last count until the new one lands,
    // rather than blinking out of the card's header and name (#6331).
    const [kept, setKept] = useState(counted);
    if (counted !== undefined && counted !== kept) {
        setKept(counted);
    }
    const shown = counted ?? kept;
    return leaf !== null && shown?.rule === rule ? shown.value : undefined;
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
    // A layer paints only what is showing, and its row counts over that (4 of 15 under a filter):
    // said over the same base, never the whole graph's.
    const { summary } = session.visibility;
    const showing = side === "node" ? summary.visibleNodes : summary.visibleEdges;
    const whole = side === "node" ? stats.nodeCount : stats.edgeCount;
    const total = held === undefined ? showing : whole;
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
        return matched === undefined ? "" : `${formatCount(matched)} of ${formatCount(total)} ${NOUN[side].many}`;
    }
    const of = `of ${formatCount(total)} ${NOUN[side].many}`;
    return matched === undefined ? of : `${formatCount(matched)} ${of}`;
}

/** How long typing pauses before the count it changed is spoken. */
const SPEAK_AFTER_MS = 500;

/** A card's value box: the first text or number box its body draws (not its match menu). */
const VALUE_BOX = "input:not([type=hidden]):not([type=checkbox]):not([readonly])";

/**
 * Cards a caller holds instead of a layer's (a filter step's rule): drawn and edited as a layer's
 * are, and handed back on every change instead of written.
 */
interface HeldCards {
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
    /** A field to open on with a card on it (the other kind's tab sent the reader here for it). */
    readonly adding?: string;
    /** Goes to the other kind's tab with a card on a field it carries. */
    readonly onElsewhere?: (field: CardField) => void;
    /**
     * Given, the folded row reads the cards as this one line instead of a chip per card, unless it
     * has no words for them.
     */
    readonly summary?: (session: GraphSession, cards: readonly Card[], rows: readonly string[], side: Side) => string;
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
 * @param props.adding - a field to open on with a card on it
 * @param props.onElsewhere - goes to the other kind's tab with a card on a field it carries
 * @param props.summary - reads the folded row's cards as one line
 * @param props.held - cards it edits instead of a layer's
 * @returns The picker
 */
export function WhichPicker({
    session,
    rows: ids,
    held,
    side,
    autoOpen = false,
    adding,
    onElsewhere,
    summary,
}: WhichPickerProps): React.JSX.Element | null {
    const rows = held === undefined ? pickRows(session, ids, side) : [];
    const shown = held === undefined ? shownOf(rows) : heldShown(held.cards);
    const [open, setOpen] = useState((autoOpen && shown.length === 0) || adding !== undefined);
    // One layer's own selector is edited as a selection (design/ui/selection-groups/spec.md);
    // several layers at once and held cards keep the cards. Cards opened stay until
    // they close, even when an edit there leaves a selector the selection editor reads (the last
    // card removed): swapping editors mid-edit would drop the cards and their notice's Undo.
    // A layer read from a file selects by a mark the load left, which the selection editor can only
    // spell out raw: with a summary to give, its row reads the rule line instead.
    const fromFile = summary !== undefined && rows.length === 1 && fileStyleOf(rows[0].layer) !== null;
    const editable =
        held === undefined && rows.length === 1 && !fromFile
            ? layerSelection(session, rows[0].layer.selector, side)
            : null;
    const [onCards, setOnCards] = useState(() => open && editable === null);
    const selection = open && onCards ? null : editable;
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
    // Under an open selection workspace only the workspace says its count: this row is covered (or
    // beside it), and its count is often over another base (tier 5 round 1). It stays quiet until its
    // count settles after the workspace closes, so a change made in the workspace is not said twice.
    const covered = useWorkspaceState((state) => state.selectionWorkspace !== null);
    const [wasCovered] = useDebouncedValue(covered, SPEAK_AFTER_MS);
    useAnnounceChange(/\d of \d/.test(settled) ? settled : null, true, covered || wasCovered);
    if (rows.length === 0 && held === undefined) {
        return null;
    }
    // Done, Enter or Escape: focus goes back to the Which row it opened from -- the one drawn now,
    // when the panel was drawn again for the row the cards changed (a new layer's first edit).
    const close = (): void => {
        setOpen(false);
        setOnCards(false);
        requestAnimationFrame(() => {
            const row = rowButton.current?.isConnected
                ? rowButton.current
                : document.querySelector<HTMLElement>(`.ws-which[data-side="${side}"] button`);
            row?.focus();
        });
    };
    return (
        <div className="ws-which" data-testid="which-picker" data-side={side}>
            {selection !== null && (
                // The outline is the layer's recipe at rest: it is always drawn, never folded.
                <StyleSelection session={session} layer={rows[0].layer} name={rows[0].name} side={side} />
            )}
            {selection === null && open && (
                <Cards
                    session={session}
                    rows={rows}
                    held={held}
                    side={side}
                    initial={shown}
                    focusKey={focusKey}
                    regionId={regionId}
                    adding={adding}
                    onElsewhere={onElsewhere}
                    onClose={close}
                    onLeave={() => {
                        setOpen(false);
                        setOnCards(false);
                    }}
                />
            )}
            {!open && selection === null && (
                <WhichRow
                    session={session}
                    rows={rows}
                    held={held?.cards}
                    shown={shown}
                    side={side}
                    buttonRef={rowButton}
                    regionId={regionId}
                    line={
                        summary === undefined
                            ? undefined
                            : summary(
                                  session,
                                  shown.map((each) => each.card),
                                  ids,
                                  side,
                              ) || undefined
                    }
                    onOpen={(key) => {
                        // With no card, focus lands on Add a condition, whose list opens on a
                        // press: open already, the press would close it.
                        setFocusKey(key ?? shown[0]?.key ?? "add");
                        setOnCards(true);
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
 * @param props.line - the cards as one line, drawn in place of the chips
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
    line,
    onOpen,
}: Readonly<{
    session: GraphSession;
    rows: readonly PickRow[];
    held?: readonly Card[];
    shown: readonly Shown[];
    side: Side;
    buttonRef: React.RefObject<HTMLButtonElement | null>;
    regionId: string;
    line?: string;
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
    const hint = `All ${many(total, side)}`;
    // What the folded row reads after its count: every element, the one rule line, or each chip.
    let ruleWords: readonly string[] = line === undefined ? spoken : [line];
    if (shown.length === 0 && line === undefined) {
        ruleWords = [hint];
    }
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
                aria-label={[`Which ${NOUN[side].many}`, head, none ? `no ${NOUN[side].one} matches` : "", ...ruleWords]
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
                    {line !== undefined && (
                        <Text size="xs" span truncate="end" title={line} className="ws-which-line">
                            {line}
                        </Text>
                    )}
                    {line === undefined && shown.length === 0 && (
                        // Read with the panel, not a warning: every element is a fine answer.
                        <Text size="xs" c="dimmed" span className="ws-which-hint">
                            {hint}
                        </Text>
                    )}
                    {line === undefined &&
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
                        ))}
                </span>
            </UnstyledButton>
        </div>
    );
}

/**
 * How many elements of a kind are drawn, the base a layer styles over (`styles.counts(id).visible`):
 * what the filter leaves, the graph's count with no filter on.
 * @param session - the element's session.
 * @param layerId - the layer, if any.
 * @param side - nodes or edges.
 * @returns the count.
 */
function drawnTotal(session: GraphSession, layerId: string | undefined, side: Side): number {
    const of = layerId === undefined ? undefined : session.styles.counts(layerId).visible?.of;
    if (of !== undefined) {
        return of;
    }
    const stats = session.data.statistics();
    return side === "node" ? stats.nodeCount : stats.edgeCount;
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
    // Read in plain words in the workspace: the token is the shared card's own mark.
    return selectionWorkspaceOn(session)
        ? `${cardName(shown.card).replace(/^The rule$/u, "Rule")} by layer${layers}`
        : `${cardName(shown.card)}: ${LAYER_TOKEN}${layers}`;
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
        if (holder === undefined && !bulk && removed !== undefined && narrows(list) && !narrows(next)) {
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
                    message: `${row.name} now styles all ${many(drawnTotal(session, row.layer.id, side), side)}: no condition is left`,
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
        if (field !== undefined && !alone) {
            adder.current(field);
        }
    }, [fields, initial]);

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
            {!standsAlone && (
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

/** A row of the add list that is not a field (Largest component): its name, its icon and what it does. */
export interface ExtraItem {
    readonly key: string;
    readonly name: string;
    readonly glyph: (typeof GLYPHS)[keyof typeof GLYPHS];
    readonly onPick: () => void;
    /** One fact that tells it from its neighbors, drawn dimmed at the right. */
    readonly fact?: string;
    /** Why it cannot be picked here: greyed, with the reason as its tooltip and in its name. */
    readonly unusable?: string;
    /** Plain words for what it is, as its tooltip (selection spec 3.5). */
    readonly tip?: string;
    /** Other words a search finds it by ("links" for Degree). */
    readonly aliases?: readonly string[];
}

/**
 * Whether a typed search finds a picker row: by its name, or by one of its other words.
 * @param typed - the search, trimmed and lower case.
 * @param row - the row's name and other words.
 * @param row.name - its name.
 * @param row.aliases - its other words.
 * @returns true when it is found.
 */
const finds = (typed: string, row: { name: string; aliases?: readonly string[] }): boolean =>
    typed === "" ||
    row.name.toLowerCase().includes(typed) ||
    (row.aliases ?? []).some((alias) => alias.toLowerCase().startsWith(typed)) ||
    everyWord(typed, [row.name, ...(row.aliases ?? [])].join(" "));

/**
 * Whether every word typed is in the text, in any order, a colon read as a space: "label
 * propagation: comm" finds "Label propagation" with its field "community".
 * @param typed - the search, lower case.
 * @param text - the row's name and aliases.
 * @returns true when each word is found.
 */
function everyWord(typed: string, text: string): boolean {
    const words = typed
        .replaceAll(":", " ")
        .split(/\s+/u)
        .filter((each) => each !== "");
    const hay = text.toLowerCase().replaceAll(":", " ");
    return words.length > 1 && words.every((word) => hay.includes(word));
}

/** A heading of rows that are not fields, listed after the field groups. */
interface ExtraSection {
    readonly group: string;
    readonly items: readonly ExtraItem[];
}

/** The option value an extra row is listed under, apart from every field's `<side>:<path>`. */
const EXTRA = "extra:";

/**
 * What a value list says when its search finds nothing: on one kind's tab, where a field of the
 * other kind with that name is.
 * @param other - the other kind's field the search found, if any.
 * @returns the words.
 */
function nothingFoundWords(other: CardField | undefined): string {
    if (other === undefined) {
        return "Nothing found";
    }
    return `${other.name} is ${other.on === "edge" ? "an edge" : "a node"} attribute; it is on the ${tabOf(other)} tab`;
}

/**
 * The tab a field is on: Edge for an edge field, else Node.
 * @param field - the field, if any.
 * @returns the tab's name.
 */
function tabOf(field: CardField | undefined): "Edge" | "Node" {
    return field?.on === "edge" ? "Edge" : "Node";
}

/**
 * Where a value list lies: under a field (an anchor) it is as wide as the field, or as `listWidth`
 * says, and always opens below it, inside its column, never flipped up over the header and Done
 * (ws-polish 2, 3); else as wide as the cards it adds to.
 * @param anchored - the list opens under a field.
 * @param width - the cards' column width.
 * @param listWidth - a width asked for.
 * @returns the combobox's width and middlewares.
 */
function listPlacement(
    anchored: boolean,
    width: number | undefined,
    listWidth: number | undefined,
): { width: number | "target" | undefined; middlewares?: { flip: boolean; shift: boolean } } {
    if (!anchored) {
        return { width: listWidth ?? width };
    }
    return { width: listWidth ?? "target", middlewares: { flip: false, shift: true } };
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
 * @param props.bySide - groups the fields Nodes and Edges
 * @param props.extra - rows that are not fields, listed last under Structure
 * @param props.plus - draws the opener as a "+" icon button with this name
 * @param props.opened - opens the list from outside
 * @param props.onOpened - told when the list closes
 * @param props.sections - headings of rows that are not fields, after the field groups
 * @param props.anchor - drawn in place of the opener button (the list opens under it)
 * @param props.placeholder - the search box's words
 * @param props.seed - typed into the search as the list opens from outside
 * @param props.listWidth - the list's width under an anchor narrower than its rows (a "+ Card" button)
 * @returns The control
 */
export function AddCondition({
    fields,
    elsewhere = [],
    used,
    onAdd,
    onElsewhere,
    bySide = false,
    extra = [],
    plus,
    opened,
    onOpened,
    sections: more = [],
    anchor,
    placeholder = FIND_ATTRIBUTE,
    seed,
    listWidth,
}: Readonly<{
    fields: readonly CardField[];
    elsewhere?: readonly CardField[];
    used: readonly string[];
    onAdd: (field: CardField) => void;
    onElsewhere?: (field: CardField) => void;
    /** Groups the fields Nodes and Edges by the kind they are on (the Filters "+"), not Data, Results, Structure. */
    bySide?: boolean;
    /** Rows that are not a field (Largest component), listed last as Structure. */
    extra?: readonly ExtraItem[];
    /** Draws the opener as a "+" icon button with this name and tooltip, not "Add a condition". */
    plus?: string;
    /** Opens the list from outside (the Filters command). */
    opened?: boolean;
    /** Told when the list closes, so `opened` can be put back. */
    onOpened?: (opened: boolean) => void;
    /** Headings of rows that are not fields (a selection step's Analyze categories, Relative to), after the field groups. */
    sections?: readonly ExtraSection[];
    /** Drawn in place of the opener button: the list opens under it. */
    anchor?: React.ReactElement;
    /** The search box's words. */
    placeholder?: string;
    /** Typed into the search as the list opens from outside (a key pressed on the anchor). */
    seed?: string;
    listWidth?: number;
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
            onOpened?.(false);
        },
        onDropdownOpen: () => {
            // As wide as the cards it adds to, so the list stays inside the inspector (or the Data place).
            const column = (button.current ?? document.activeElement)?.closest(
                ".ws-which-open, .dp, .sel-ws-props, .sel-ws-outline, .sel-editor",
            );
            if (column instanceof HTMLElement && column.clientWidth > 0) {
                // The column's content box: a list as wide as its padding box would run past it.
                const style = getComputedStyle(column);
                const padding =
                    (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
                setWidth(column.clientWidth - padding);
            }
            combobox.focusSearchInput();
        },
    });
    const typed = search.trim().toLowerCase();
    const found = (each: CardField): boolean => finds(typed, each);
    // A name that starts with the typed text first, in its group, and its group first.
    const sections: readonly { group: string; has: (field: CardField) => boolean }[] = bySide
        ? [
              { group: "Nodes", has: (f) => f.on === "node" },
              { group: "Edges", has: (f) => f.on === "edge" },
          ]
        : (["Data", "Results", "Structure"] as const).map((group) => ({ group, has: (f) => f.group === group }));
    const groups = prefixFirst(
        sections.flatMap(({ group, has }) => {
            const items = prefixFirst(
                fields.filter((f) => has(f) && found(f)),
                (each) => each.name,
                search,
            );
            return items.length === 0 ? [] : [{ group, items }];
        }),
        ({ items }) => items[0].name,
        search,
    );
    // The rows that are not fields stay last, under Structure, whatever is typed.
    const extras = prefixFirst(
        extra.filter((each) => finds(typed, each)),
        (each) => each.name,
        search,
    );
    const foundRow = (each: ExtraItem): boolean => finds(typed, each);
    const moreShown = more
        .map(({ group, items }) => ({ group, items: prefixFirst(items.filter(foundRow), (each) => each.name, search) }))
        .filter(({ items }) => items.length > 0);
    const extraRows = [...moreShown.flatMap(({ items }) => items), ...extra];
    const count =
        groups.reduce((sum, { items }) => sum + items.length, 0) +
        moreShown.reduce((sum, { items }) => sum + items.length, 0) +
        extras.length;
    // Typed on one kind's tab, a value the other kind carries is pointed to its tab.
    const other = typed === "" ? undefined : prefixFirst(elsewhere.filter(found), (each) => each.name, search)[0];
    const nothingWords = nothingFoundWords(other);
    const otherTab = tabOf(other);
    // The other kind's field is one step away: its tab, with a card on it.
    const goElsewhere =
        other === undefined || onElsewhere === undefined
            ? undefined
            : (): void => {
                  combobox.closeDropdown();
                  onElsewhere(other);
              };
    const { dropdownOpened, selectFirstOption, selectOption, resetSelectedOption, setListId } = combobox;
    // The store finds its options in the list by this id (Combobox.Options would tell it).
    useEffect(() => {
        setListId(listId);
    }, [setListId, listId]);
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
    // Opened from outside (the Filters command): the list opens, its search focused.
    const { openDropdown, focusSearchInput } = combobox;
    useEffect(() => {
        if (opened === true) {
            openDropdown();
            if (seed !== undefined && seed !== "") {
                setSearch(seed);
                focusSearchInput();
            }
        }
    }, [opened, openDropdown, focusSearchInput, seed]);
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
        // The first match not already a condition is lit, so Enter adds something new.
        const first = selectFirstOption();
        const options = [
            ...(document.getElementById(listId)?.querySelectorAll<HTMLElement>("[data-combobox-option]") ?? []),
        ];
        const unused = options.findIndex((option) => option.dataset.used === undefined);
        if (unused > 0) {
            selectOption(unused);
            setActive(options[unused].id === "" ? first : options[unused].id);
            return;
        }
        setActive(first);
    }, [typed, dropdownOpened, selectFirstOption, selectOption, resetSelectedOption, listId]);
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
            // Its width and how it opens: see listPlacement.
            {...listPlacement(anchor !== undefined, width, listWidth)}
            position="bottom-start"
            withinPortal
            // compact-mantine's listbox look, as every Select's: its lit row keeps the menu's ink
            // (Mantine's bare highlight is white on the brand color, under 3:1).
            classNames={LISTBOX_CLASS_NAMES}
            onOptionSubmit={(value) => {
                const field = fields.find((f) => keyOf(f) === value);
                const other = extraRows.find((each) => `${EXTRA}${each.key}` === value);
                combobox.closeDropdown();
                if (field !== undefined) {
                    onAdd(field);
                }
                other?.onPick();
            }}
        >
            <Combobox.Target withAriaAttributes={false}>
                {anchor ??
                    (plus === undefined ? (
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
                    ) : (
                        <Tooltip label={plus}>
                            <ActionIcon
                                ref={button}
                                variant="subtle"
                                data-add
                                aria-label={plus}
                                aria-haspopup="listbox"
                                aria-expanded={dropdownOpened}
                                onClick={() => {
                                    combobox.toggleDropdown();
                                }}
                            >
                                <GLYPHS.add size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    ))}
            </Combobox.Target>
            <Combobox.Dropdown>
                <Combobox.Search // NOSONAR(S6811): aria-description is a global ARIA 1.3 attribute, valid on a combobox
                    value={search}
                    onChange={(event) => {
                        setSearch(event.currentTarget.value);
                    }}
                    placeholder={placeholder}
                    aria-label={placeholder}
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
                {/* compact-mantine's overlay scrollbar, as every Select's list; never sideways. */}
                <ScrollArea.Autosize
                    mah={240}
                    type="scroll"
                    scrollbars="y"
                    // Mantine lays the content out as a table, which widens to its longest row:
                    // a block keeps every row inside the list, cut short at its tail.
                    classNames={{ content: "ws-list-content" }}
                    // The listbox is what scrolls: the search's popup, whose rows the arrows reach
                    // through aria-activedescendant, never by Tab. A listbox inside a scroller
                    // would leave the scroller a region no key can reach.
                    viewportProps={{
                        id: listId,
                        role: "listbox",
                        "aria-label": "Attributes",
                        tabIndex: -1,
                        onMouseDown: (event) => {
                            event.preventDefault();
                        },
                    }}
                >
                    {count === 0 ? (
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
                                    styles={{
                                        label: {
                                            whiteSpace: "normal",
                                            overflowWrap: "anywhere",
                                            textAlign: "start",
                                        },
                                    }}
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
                        <>
                            {groups.map(({ group, items }) => (
                                <Combobox.Group key={group} label={group} role="group" aria-label={group}>
                                    {items.map((field) => {
                                        const key = keyOf(field);
                                        const inUse = used.includes(key);
                                        // The icon the Vary by list draws for the same value; the node id reads as text.
                                        const Glyph = glyphOf(field.kind);
                                        const fieldOption = (
                                            <Combobox.Option
                                                key={key}
                                                value={key}
                                                data-used={inUse || undefined}
                                                // Its fact and whether it is a condition already are part of
                                                // what it is: "Degree, 1 to 36", as in the Vary by list.
                                                aria-label={[
                                                    field.name,
                                                    ...(field.fact === undefined ? [] : [field.fact]),
                                                    ...(inUse ? ["already a condition"] : []),
                                                ].join(", ")}
                                            >
                                                <OptionLine
                                                    glyph={Glyph}
                                                    name={field.name}
                                                    fact={field.fact}
                                                    used={inUse}
                                                />
                                            </Combobox.Option>
                                        );
                                        // Its plain words, as its tooltip (selection spec 3.5).
                                        return field.tip === undefined ? (
                                            fieldOption
                                        ) : (
                                            <Tooltip key={key} label={field.tip} position="right" openDelay={300}>
                                                <div>{fieldOption}</div>
                                            </Tooltip>
                                        );
                                    })}
                                </Combobox.Group>
                            ))}
                            {moreShown.map(({ group, items }) => (
                                <Combobox.Group key={group} label={group} role="group" aria-label={group}>
                                    {items.map((each) => (
                                        <ExtraOption key={each.key} item={each} />
                                    ))}
                                </Combobox.Group>
                            ))}
                            {extras.length > 0 && (
                                <Combobox.Group label="Structure" role="group" aria-label="Structure">
                                    {extras.map((each) => (
                                        <Combobox.Option
                                            key={each.key}
                                            value={`${EXTRA}${each.key}`}
                                            aria-label={each.name}
                                        >
                                            <OptionLine glyph={each.glyph} name={each.name} />
                                        </Combobox.Option>
                                    ))}
                                </Combobox.Group>
                            )}
                        </>
                    )}
                </ScrollArea.Autosize>
            </Combobox.Dropdown>
        </Combobox>
    );
}

/**
 * One row of the add list that is not a field: its icon, name and fact; greyed with its reason as
 * a tooltip when it cannot be picked here.
 * @param props - Component props
 * @param props.item - the row
 * @returns The option
 */
function ExtraOption({ item }: Readonly<{ item: ExtraItem }>): React.JSX.Element {
    const option = (
        <Combobox.Option
            value={`${EXTRA}${item.key}`}
            disabled={item.unusable !== undefined}
            // Mantine marks a disabled option for its styles only; a screen reader is told too.
            aria-disabled={item.unusable !== undefined || undefined}
            aria-label={[item.name, item.fact, item.unusable].filter((each) => each !== undefined).join(", ")}
        >
            <OptionLine glyph={item.glyph} name={item.name} fact={item.fact} />
        </Combobox.Option>
    );
    // A reason it cannot be picked here, else its plain words (selection spec 3.5), as its tooltip.
    const tip = item.unusable ?? item.tip;
    return tip === undefined ? (
        option
    ) : (
        <Tooltip label={tip} position="right" openDelay={item.unusable === undefined ? 300 : 0}>
            <div>{option}</div>
        </Tooltip>
    );
}

/** How many bins a step's values are cut into (selection spec 4.3). */
const HISTOGRAM_BINS = 32;

/**
 * A step's number test drawn over its values (selection spec 5): the bars of how the values are
 * spread (graphty-element's `scope.histogram`, over the step's base) and a brush on their scale,
 * which writes the Min and Max boxes when a gesture ends.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.path - the value's path
 * @param props.within - the base the values are counted over, if any
 * @param props.name - the value's name
 * @param props.low - the values' lowest
 * @param props.high - the values' highest
 * @param props.step - how far a thumb moves
 * @param props.value - the test's bounds, clamped to the values
 * @param props.onChangeEnd - takes the bounds a gesture ended on
 * @param props.links - a selection step's Links, the edges a degree is counted over
 * @param props.given - the values' spread when no path names them (a step's own computation)
 * @returns The row, or nothing while the values are not numbers
 */
function ValueBrush({
    session,
    path,
    within,
    links,
    given,
    name,
    low,
    high,
    step,
    value,
    onChangeEnd,
}: Readonly<{
    session: GraphSession;
    path: string;
    within: CardField["within"];
    links?: CardField["links"];
    given?: CardField["spread"];
    name: string;
    low: number;
    high: number;
    step: number;
    value: [number, number];
    onChangeEnd: (value: [number, number]) => void;
}>): React.JSX.Element | null {
    const linksKey = links === undefined ? "" : JSON.stringify(links);
    const spread = useMemo(
        () =>
            given ??
            session.scope.histogram(path, {
                // Spec 4.3: 32 bins, so a long tail is not lumped into a few bars.
                bins: HISTOGRAM_BINS,
                ...(within === undefined ? {} : { within }),
                ...(linksKey === "" ? {} : { links: JSON.parse(linksKey) as RuleTree }),
            }),
        [session, path, within, linksKey, given],
    );
    const [moving, setMoving] = useState<[number, number] | null>(null);
    if (spread.kind !== "numeric" || spread.bins.length === 0 || high <= low) {
        return null;
    }
    const shown = moving ?? value;
    // The last bar lit with both thumbs on it belongs to the full-screen workspace (the `selection-workspace` experiment).
    const wide = selectionWorkspaceOn(session);
    const heights = barHeights(
        spread.bins.map((bin) => bin.count),
        spread.suggestedScale === "log",
    );
    return (
        // Inset by a thumb's reach, so the brush's thumbs end at the boxes' edges under it.
        <div style={{ paddingInline: 8 }}>
            <HistogramRow
                label={name}
                bins={spread.bins.map((bin, at) => ({
                    label: `${formatNumber(bin.from)} to ${formatNumber(bin.to)}: ${formatCount(bin.count)}`,
                    // Skewed counts are drawn at log heights and a bin holding anything is never flat,
                    // so a long tail of small bins still shows; the label keeps the count.
                    count: heights[at] ?? 0,
                    // A bin of one value (from = to) is drawn a step wide and whole, ends included.
                    from: bin.from,
                    to: bin.to,
                    // No bound set is the whole range, every bar lit: what the step passes.
                    // A one-value bin at the low bound (from = to = min) is in range too, and so is
                    // the last bin, which holds its upper end, when both thumbs sit on it.
                    highlighted:
                        (bin.to > shown[0] ||
                            bin.from >= shown[0] ||
                            (wide && at === spread.bins.length - 1 && bin.to >= shown[0])) &&
                        bin.from <= shown[1],
                }))}
                minLabel={formatNumber(low)}
                maxLabel={formatNumber(high)}
                valueTable={false}
                brush={{
                    min: low,
                    max: high,
                    step,
                    value: shown,
                    startLabel: `${name} range start`,
                    endLabel: `${name} range end`,
                    bodyLabel: `${name} range`,
                    valueText: (each) => formatNumber(each),
                    rangeText: ([from, to]) => `${formatNumber(from)} to ${formatNumber(to)}`,
                    onChange: setMoving,
                    onChangeEnd: (next) => {
                        setMoving(null);
                        onChangeEnd(next);
                    },
                }}
            />
        </div>
    );
}

/**
 * One row of the add list: its icon, its name cut short with an ellipsis (whole in its tooltip),
 * and its fact, which keeps its width; a value that is already a condition has a dimmed check.
 * @param props - Component props
 * @param props.glyph - the row's icon
 * @param props.name - its name
 * @param props.fact - its fact, if any
 * @param props.used - whether it is already a condition
 * @returns The row's content
 */
function OptionLine({
    glyph: Glyph,
    name,
    fact,
    used = false,
}: Readonly<{
    glyph: ReturnType<typeof glyphOf> | ExtraItem["glyph"];
    name: string;
    fact?: string | undefined;
    used?: boolean;
}>): React.JSX.Element {
    const cut = name.lastIndexOf(":");
    return (
        <Group gap={8} wrap="nowrap" justify="space-between" style={{ minWidth: 0 }}>
            <Group gap={8} wrap="nowrap" style={{ minWidth: 0, flex: "1 1 auto" }}>
                <Glyph size={14} aria-hidden style={{ flexShrink: 0 }} />
                <Tooltip label={name}>
                    {cut === -1 ? (
                        <Text span inherit truncate="end" c={used ? "dimmed" : undefined} style={{ minWidth: 0 }}>
                            {name}
                        </Text>
                    ) : (
                        // "Label propagation: Community size": the algorithm's name gives way, never
                        // the field's, so two fields of one run are told apart (ws-polish 3).
                        <Text
                            span
                            inherit
                            c={used ? "dimmed" : undefined}
                            style={{ minWidth: 0, display: "flex", whiteSpace: "nowrap" }}
                        >
                            <span style={{ minWidth: "3ch", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {name.slice(0, cut + 1)}
                            </span>
                            <span style={{ flex: "none", whiteSpace: "pre" }}>{name.slice(cut + 1)}</span>
                        </Text>
                    )}
                </Tooltip>
                {used && (
                    <Text span c="dimmed" style={{ display: "inline-flex", flex: "none" }}>
                        <GLYPHS.check size={12} aria-hidden />
                    </Text>
                )}
            </Group>
            {fact !== undefined && (
                <Text size="xs" c="dimmed" span style={{ flex: "none" }}>
                    {fact}
                </Text>
            )}
        </Group>
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
    if (kind === "date") {
        return GLYPHS.time;
    }
    return VALUE_GLYPHS[kind === "name" ? "text" : kind];
}

/**
 * Where a card body is drawn: a filter card, or a selection step's pane, where "Has a value" and
 * "Has no value" are not offered (its Advanced holds Not measured) and a checklist has no Match.
 */
export type CardVariant = "filter" | "step";

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
 * @param props.variant - "filter" or "step": a value row reads box, name, then its count dimmed at
 *     the right; "step" offers no presence choices
 * @param props.bare - a number step draws no By value | By position select (a selection
 *     workspace card, which offers it in its settings)
 * @returns The body
 */
export function CardBody({
    session,
    card,
    side,
    onChange,
    blank = false,
    variant,
    bare = false,
}: Readonly<{
    session: GraphSession;
    card: Card;
    side: Side;
    onChange: OnCard;
    blank?: boolean;
    variant?: CardVariant;
    bare?: boolean;
}>): React.JSX.Element | null {
    switch (card.type) {
        case "number":
            return (
                <NumberCard
                    session={session}
                    card={card}
                    side={side}
                    onChange={onChange}
                    variant={variant}
                    bare={bare}
                />
            );
        case "date":
            return <DateCard session={session} card={card} side={side} onChange={onChange} />;
        case "category":
            return <CategoryCard session={session} card={card} side={side} onChange={onChange} variant={variant} />;
        case "text":
            return <TextCard session={session} card={card} onChange={onChange} variant={variant} />;
        case "source":
            return <SourceCard session={session} card={card} side={side} onChange={onChange} variant={variant} />;
        case "yes-no":
            return (
                <MatchSelect
                    // Its choices are the values themselves (Yes, No), so it is named for them.
                    label={`${card.field.name} is`}
                    name={card.field.name}
                    value={blank || card.match === "unset" ? null : card.match}
                    placeholder="Value..."
                    data={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                        ...(variant === "step" ? [] : PRESENCE),
                    ]}
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
    if (leaf.kind === "state") {
        return leaf.state;
    }
    return leaf.kind === "expression" ? leaf.where : JSON.stringify(leaf);
}

/**
 * A card's Match select.
 * @param props - Component props
 * @param props.name - the field's name
 * @param props.label - its accessible name, when it is not "<name>: how to match"
 * @param props.value - the chosen value, or null while none is
 * @param props.placeholder - said while nothing is chosen
 * @param props.data - the choices
 * @param props.onChange - takes the card as edited
 * @returns The select
 */
function MatchSelect({
    name,
    label,
    value,
    placeholder,
    data,
    onChange,
}: Readonly<{
    name: string;
    label?: string;
    value: string | null;
    /** Said while nothing is chosen. */
    placeholder?: string;
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
            // The default size: Figma's 24 px control, as the number boxes beside it (xs was 18 px).
            // Named for what it chooses beside the card's column; the select says its own value.
            aria-label={label ?? `${name}: how to match`}
            allowDeselect={false}
            placeholder={placeholder}
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
 * A number as a box shows it at rest: a fraction as the histogram's scale labels write it, so the
 * box at the scale's end reads what the label there reads (231.1, not 231) and a tiny value is never
 * "1e-9"; a whole number, and text that is not a number, as it is.
 * @param text - the text.
 * @returns the shorter text.
 */
function shortNumber(text: string): string {
    const value = Number(text);
    // A whole number reads as typed: 1000 stays 1000.
    return text.trim() === "" || !Number.isFinite(value) || Number.isInteger(value) ? text : formatNumber(value);
}

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
 * @param props.placeholder - what it shows while it holds nothing (the domain's end)
 * @returns The box
 */
function NumberBox({
    label,
    text,
    invalid,
    describedBy,
    onText,
    onCommit,
    placeholder,
}: Readonly<{
    label: string;
    text: string;
    invalid: boolean;
    describedBy: string | undefined;
    onText: (text: string) => void;
    onCommit: (leaving?: boolean) => void;
    placeholder?: string;
}>): React.JSX.Element {
    const justFocused = useRef(false);
    // At rest a long number shows a few digits; the whole number comes back when the box is focused.
    const [focused, setFocused] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => {
        // The whole number came in with focus: select it, so typing replaces it.
        if (focused && document.activeElement === input.current) {
            input.current?.select();
        }
    }, [focused]);
    return (
        <TextInput
            ref={input}
            inputMode="decimal"
            data-enter-done
            aria-label={label}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? describedBy : undefined}
            error={invalid}
            placeholder={placeholder}
            value={focused ? text : shortNumber(text)}
            onChange={(event) => {
                onText(dropLeadingZeros(event.currentTarget.value));
            }}
            onFocus={(event) => {
                justFocused.current = true;
                setFocused(true);
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
                setFocused(false);
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
 * @param scale - the values' ends, when a box that reads an end as the slider's label writes it is
 *     that end (the label's 231.1 is the scale's 231.0714...).
 * @param scale.low - the lowest value.
 * @param scale.high - the highest value.
 * @returns the numbers, the boxes that refuse them, what to do about it (`why`), and the reason
 * alone (`gist`) for words said after the card has gone.
 */
function checkDrafts(
    drafts: Drafts,
    card: Extract<Card, { type: "number" }>,
    parse: (text: string) => number,
    example: string,
    total: { readonly count: number; readonly side: Side },
    scale?: { readonly low: number; readonly high: number },
): {
    min?: number;
    max?: number;
    top?: number;
    bad: readonly (keyof Drafts)[];
    why?: string;
    gist?: string;
    reason?: Refusal;
} {
    const atEnd = (value: number | undefined | null): number | undefined | null => {
        const end = [scale?.low, scale?.high].find(
            (each) => each !== undefined && value !== null && parse(formatNumber(each)) === value,
        );
        return end ?? value;
    };
    const read = (key: keyof Drafts, held: number | undefined): number | undefined | null =>
        drafts[key] === undefined ? held : atEnd(readTyped(drafts[key], parse));
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
            why: `From is above to: ${formatNumber(values.min)} is more than ${formatNumber(values.max)}.`,
            gist: `from is above to (${formatNumber(values.min)} is more than ${formatNumber(values.max)})`,
            reason: "order",
        };
    }
    if (card.match === "top" && card.percent === true) {
        return values.top !== undefined && (values.top <= 0 || values.top > 100)
            ? {
                  ...values,
                  bad: ["top"],
                  why: "Type a percent above 0, up to 100.",
                  gist: "a percent is above 0, up to 100",
                  reason: "whole",
              }
            : { ...values, bad: [] };
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
 * After the reader picks a card's mode, focus goes on to the mode's first box, so what is typed
 * next is its number or date. Only while focus is in the card: an undo that changes the mode
 * moves no focus.
 * @param body - the card's body.
 * @param match - the card's mode.
 */
function useFocusAfterMode(body: React.RefObject<HTMLDivElement | null>, match: string): void {
    const shown = useRef(match);
    useEffect(() => {
        if (shown.current === match) {
            return;
        }
        shown.current = match;
        const card = body.current;
        if (card?.contains(document.activeElement) === true) {
            card.querySelector<HTMLElement>("input:not([type=hidden]):not([readonly])")?.focus();
        }
    }, [body, match]);
}

/**
 * What a By position card cuts at, in words ("the top 5", "the bottom 10%"), or null while it has
 * no count and so cuts nothing.
 * @param card - the card.
 * @returns the words, or null.
 */
function heldTopWords(card: Extract<Card, { type: "number" }>): string | null {
    if (card.top === undefined) {
        return null;
    }
    const end = card.from === "low" ? "bottom" : "top";
    const unit = card.percent === true ? "%" : "";
    return `the ${end} ${String(card.top)}${unit}`;
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
 * @param props.variant - "step": no presence choices
 * @param props.bare - a step draws no By value | By position select
 * @returns The body
 */
function NumberCard({
    session,
    card,
    side,
    onChange,
    variant,
    bare = false,
}: Readonly<{
    session: GraphSession;
    card: Extract<Card, { type: "number" }>;
    side: Side;
    onChange: OnCard;
    variant?: CardVariant;
    bare?: boolean;
}>): React.JSX.Element {
    // A step's mode is the reader's explicit choice (selection spec 3.5), kept by the step: By
    // position chosen starts untouched, so the step reads No test, and By value chosen again brings
    // back its range.
    const lastRange = useRef<{ min?: number; max?: number }>({});
    const body = useRef<HTMLDivElement>(null);
    useFocusAfterMode(body, card.match);
    const { name, path, range, within, missing: given } = card.field;
    // Counted over the selection's base when the card has one, so a filtered-out node is not.
    const missing = useMemo(
        () =>
            given ??
            (within === undefined
                ? session.data.valueCounts(path, { kind: side }).missing
                : session.scope.histogram(path, { within }).missing),
        [session, path, side, within, given],
    );
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
    // Whole numbers step by 1 when graphty-element types the values so; whole ends alone do not
    // make a column whole (a betweenness of 0 to 10 holds 0.5).
    const step = card.field.integer === true ? 1 : (high - low) / 100 || 1;
    // A bound's example is a value from the column's range; a count's, a count there is room for.
    const example =
        card.match === "top"
            ? String(Math.max(1, Math.min(10, total)))
            : formatNumber(Number(((low + high) / 2).toPrecision(2)));
    // What the count and the drawing still use while a box holds what the card cannot take: a
    // By position with no count yet uses none, so it names none.
    const held =
        card.match === "top"
            ? heldTopWords(card)
            : `${formatNumber(card.min ?? low)} to ${formatNumber(card.max ?? high)}`;
    const heldWords =
        held === null
            ? "The step keeps everything until a count is typed."
            : `The count and drawing still use ${held}.`;
    // Typing still held when the card goes (the picker closed, the card removed) is said, not lost.
    const leaving = useRef<string | null>(null);
    const count = { count: total, side };
    // In the workspace a box takes an end as its label writes it; the outline editor stays as it was.
    const scale = selectionWorkspaceOn(session) && range !== undefined ? { low, high } : undefined;
    const check = checkDrafts(drafts, card, parse, example, count, scale);
    const heldAfter = held === null ? "so it has no count yet" : `so it went back to ${held}`;
    leaving.current = check.bad.length > 0 ? `${name}: ${check.gist ?? ""}, ${heldAfter}.` : null;
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
        const now = checkDrafts(drafts, card, parse, example, count, scale);
        if (now.bad.length > 0) {
            const refusal = {
                bad: now.bad,
                why: `${now.why ?? ""} ${heldWords}`,
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
    const box = (key: keyof Drafts, label: string, placeholder?: number): React.JSX.Element => (
        <NumberBox
            label={label}
            text={shown(key)}
            placeholder={placeholder === undefined ? undefined : shortNumber(String(placeholder))}
            invalid={refused?.bad.includes(key) ?? false}
            describedBy={messageId}
            onText={(text) => {
                const next = { ...drafts, [key]: text };
                setDrafts(next);
                // A refusal goes as soon as the text it named is taken; a new one waits for a commit.
                if (refused !== null) {
                    const still = checkDrafts(next, card, parse, example, count, scale);
                    const bad = refused.bad.filter((each) => still.bad.includes(each));
                    // Text refused for another reason now is not said until it is committed.
                    setRefused(bad.length === 0 || still.reason !== refused.reason ? null : { ...refused, bad });
                }
            }}
            onCommit={commit}
        />
    );
    const pickMatch = (match: string): void => {
        clear();
        if (variant === "step" && (match === "top" || match === "range")) {
            if (match === card.match) {
                return;
            }
            if (match === "top") {
                lastRange.current = { min: card.min, max: card.max };
                onChange({ ...card, match: "top", min: undefined, max: undefined, top: undefined });
                return;
            }
            onChange({ ...card, match: "range", top: undefined, ...lastRange.current });
            return;
        }
        onChange({
            ...card,
            match: match as typeof card.match,
            ...(match === "top" && card.top === undefined ? { top: Math.max(1, Math.min(10, total)) } : {}),
            ...(match === "range" && card.min === undefined && card.max === undefined ? { min: low, max: high } : {}),
        });
    };
    const value: [number, number] = [Math.max(low, card.min ?? low), Math.min(high, card.max ?? high)];
    return (
        <Stack gap={4} data-card-body ref={body}>
            {!bare && variant === "step" && (
                // A step's test (selection spec 5): By value, a brush over the values' bars; By
                // position, the highest N. A select that shows its mode, above the histogram, so a
                // click on the bars never switches it (spec 3.5).
                <MatchSelect
                    name={name}
                    label={`${name} test`}
                    value={card.match === "top" ? "top" : "range"}
                    data={[
                        { value: "range", label: "By value" },
                        { value: "top", label: "By position" },
                    ]}
                    onChange={pickMatch}
                />
            )}
            {variant !== "step" && (
                <MatchSelect
                    name={name}
                    value={card.match}
                    data={[{ value: "range", label: "Between" }, { value: "top", label: "Highest" }, ...PRESENCE]}
                    onChange={pickMatch}
                />
            )}
            {card.match === "range" && variant === "step" && (
                <ValueBrush
                    session={session}
                    path={path}
                    within={within}
                    links={card.field.links}
                    given={card.field.spread}
                    name={name}
                    low={low}
                    high={high}
                    step={step}
                    value={value}
                    onChangeEnd={([min, max]) => {
                        clear();
                        onChange({ ...card, min, max });
                    }}
                />
            )}
            {card.match === "range" && (
                <>
                    {variant !== "step" && (
                        <RangeSlider
                            size="xs"
                            min={low}
                            max={high}
                            step={step}
                            minRange={0}
                            label={null}
                            thumbFromLabel={`${name} range start`}
                            thumbToLabel={`${name} range end`}
                            // Spoken as the boxes show it, never as a raw float.
                            thumbProps={(index) => ({
                                "aria-valuetext": shortNumber(
                                    String(
                                        index === 0 ? Math.max(low, card.min ?? low) : Math.min(high, card.max ?? high),
                                    ),
                                ),
                            })}
                            value={value}
                            onChangeEnd={([min, max]) => {
                                clear();
                                onChange({ ...card, min, max });
                            }}
                        />
                    )}
                    <Group gap={4} wrap="nowrap" className={variant === "step" ? "ws-range-boxes" : undefined}>
                        {box("min", `${name} from, number`, low)}
                        <Text size={variant === "step" ? "sm" : "xs"}>to</Text>
                        {box("max", `${name} to, number`, high)}
                    </Group>
                </>
            )}
            {card.match === "top" && variant === "step" && (
                // By position says which end it counts from and in what (spec 5): Highest 5 nodes.
                <Group gap={4} wrap="nowrap">
                    <Select
                        aria-label={`${name}: which end`}
                        allowDeselect={false}
                        w={84}
                        data={[
                            { value: "high", label: "Top" },
                            { value: "low", label: "Bottom" },
                        ]}
                        value={card.from ?? "high"}
                        onChange={(next) => {
                            clear();
                            onChange({ ...card, from: next === "low" ? "low" : undefined });
                        }}
                    />
                    {box("top", card.percent === true ? `${name}: what percent` : `${name}: how many`)}
                    <Select
                        aria-label={`${name}: count or percent`}
                        allowDeselect={false}
                        w={116}
                        data={[
                            { value: "count", label: NOUN[side].many },
                            { value: "percent", label: `% of ${NOUN[side].many}` },
                        ]}
                        value={card.percent === true ? "percent" : "count"}
                        onChange={(next) => {
                            clear();
                            onChange({ ...card, percent: next === "percent" ? true : undefined });
                        }}
                    />
                </Group>
            )}
            {card.match === "top" && variant !== "step" && (
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
            {refused === null && card.match === "top" && card.percent !== true && (card.top ?? 0) > total && (
                <Text size="xs" c="dimmed">
                    There are only {many(total, side)}, so this keeps all of them.
                </Text>
            )}
            {card.match !== "absent" && card.match !== "present" && <NotMeasured missing={missing} side={side} />}
        </Stack>
    );
}

/**
 * How many a number or date card leaves out for having no value: a fact, not a sentence -- the
 * chip, with what it means in its tooltip. Nothing when every one has a value.
 * @param props - Component props
 * @param props.missing - how many have no value.
 * @param props.side - nodes or edges.
 * @returns the chip, or null.
 */
function NotMeasured({ missing, side }: Readonly<{ missing: number; side: Side }>): React.JSX.Element | null {
    if (missing === 0) {
        return null;
    }
    return (
        <Tooltip
            label={`${many(missing, side)} ${missing === 1 ? "has" : "have"} no value and ${missing === 1 ? "is" : "are"} left out`}
        >
            <Text span className="ws-chip" style={{ alignSelf: "flex-start" }}>
                Not measured: {missing}
            </Text>
        </Tooltip>
    );
}

/** A date card's boxes: the one Before or After takes, or Between's two. */
type DateBox = "before" | "after" | "from" | "to";

/**
 * The bound one date box writes from its text: Before keeps what is before the span the text
 * names, After what is after it, Between from the first span's start to the second's end.
 * @param box - the box.
 * @param span - the span its text names.
 * @param span.start - the span's first instant.
 * @param span.end - the first instant after it.
 * @returns the card's bound it sets, and its value.
 */
function boundOf(box: DateBox, span: { start: number; end: number }): { key: "min" | "max"; value: number } {
    switch (box) {
        case "before":
            return { key: "max", value: span.start - 1 };
        case "after":
            return { key: "min", value: span.end };
        case "from":
            return { key: "min", value: span.start };
        default:
            return { key: "max", value: span.end - 1 };
    }
}

/**
 * A date box's text as the card holds it.
 * @param box - the box.
 * @param card - the card.
 * @returns the text, empty while the box's bound is unset.
 */
function boxText(box: DateBox, card: Extract<Card, { type: "date" }>): string {
    if (box === "before" || box === "to") {
        if (card.max === undefined) {
            return "";
        }
        return box === "before" ? startWords(card.max + 1) : endWords(card.max + 1);
    }
    if (card.min === undefined) {
        return "";
    }
    return box === "after" ? endWords(card.min) : startWords(card.min);
}

/** The boxes each date mode draws. */
const DATE_BOXES: Readonly<Record<string, readonly DateBox[]>> = {
    before: ["before"],
    after: ["after"],
    between: ["from", "to"],
};

/** The box of the other modes that holds the same date: Before's is Between's "to", After's its "from". */
const SAME_DATE: Readonly<Record<DateBox, DateBox>> = { before: "to", to: "before", after: "from", from: "after" };

/**
 * A date card in a new mode, keeping the date already typed: Before and After share one date,
 * Between takes Before's as its "to" and After's as its "from", and Before or After takes
 * Between's "to" or "from". To or from has a value, or has none, the bounds stay as they were.
 * @param session - the element's session, which reads a box's text as a span.
 * @param card - the card.
 * @param match - the new mode.
 * @returns the card.
 */
function dateModeOf(
    session: GraphSession,
    card: Extract<Card, { type: "date" }>,
    match: Extract<Card, { type: "date" }>["match"],
): Extract<Card, { type: "date" }> {
    const from = DATE_BOXES[card.match] ?? [];
    const to = DATE_BOXES[match] ?? [];
    if (from.length === 0 || to.length === 0) {
        return { ...card, match };
    }
    const next: Extract<Card, { type: "date" }> = { ...card, match, min: undefined, max: undefined };
    const bounds: { min?: number; max?: number } = {};
    for (const box of to) {
        // Between's boxes each take only their own date; Before or After the other box's at need.
        const sources = to.length === 1 ? [SAME_DATE[box], ...from] : [SAME_DATE[box]];
        const text = sources
            .filter((each) => from.includes(each))
            .map((each) => boxText(each, card))
            .find((each) => each !== "");
        const span = text === undefined ? null : spanOf(session, text);
        if (span !== null) {
            const { key, value } = boundOf(box, span);
            bounds[key] = value;
        }
    }
    return { ...next, ...bounds };
}

/**
 * A date card: Before, After or Between, with boxes that take a date or a year as the time field
 * reads them ("2005", "2005-03-01", "Mar 1, 2005"), offering the column's dates as the table writes
 * them. The card takes each keystroke that names a date, so its count follows the typing; text
 * that names none is said under the box when it is committed (Enter, leaving the box).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.side - nodes or edges
 * @param props.onChange - takes the card as edited
 * @returns The body
 */
function DateCard({
    session,
    card,
    side,
    onChange,
}: Readonly<{
    session: GraphSession;
    card: Extract<Card, { type: "date" }>;
    side: Side;
    onChange: OnCard;
}>): React.JSX.Element {
    const { name, path, on } = card.field;
    const body = useRef<HTMLDivElement>(null);
    useFocusAfterMode(body, card.match);
    const [drafts, setDrafts] = useState<Partial<Record<DateBox, string>>>({});
    const [refused, setRefused] = useState<DateBox | null>(null);
    const messageId = useId();
    const counts = useMemo(() => session.data.valueCounts(path, { kind: on }), [session, path, on]);
    // The column's dates as the table writes them, each once, in time order.
    const dates = useMemo(() => {
        const days = counts.values
            .map((each) => session.time.parse(String(each.value)))
            .filter((at): at is number => at !== null)
            .sort((a, b) => a - b);
        return [...new Set(days.map(dayWords))];
    }, [session, counts]);
    const edit = (box: DateBox, text: string): void => {
        setDrafts({ ...drafts, [box]: text });
        if (text.trim() === "") {
            setRefused(null);
            const { key } = boundOf(box, { start: 0, end: 0 });
            onChange({ ...card, [key]: undefined });
            return;
        }
        const span = spanOf(session, text);
        if (span === null) {
            return;
        }
        setRefused(null);
        const { key, value } = boundOf(box, span);
        const next = { ...card, [key]: value };
        // A Between whose from is after its to keeps what it held until the boxes agree.
        if (next.min === undefined || next.max === undefined || next.min <= next.max) {
            onChange(next);
        }
    };
    const commit = (box: DateBox): void => {
        const text = drafts[box];
        if (text !== undefined && text.trim() !== "" && spanOf(session, text) === null) {
            setRefused(box);
            return;
        }
        setDrafts((now) => ({ ...now, [box]: undefined }));
    };
    const box = (key: DateBox, label: string): React.JSX.Element => {
        const typed = (drafts[key] ?? "").trim().toLowerCase();
        const listed = dates.filter((each) => each.toLowerCase().includes(typed)).slice(0, 8);
        return (
            <Autocomplete
                size="xs"
                aria-label={label}
                data-enter-done
                placeholder="A date or a year"
                aria-invalid={refused === key || undefined}
                aria-describedby={refused === key ? messageId : undefined}
                error={refused === key}
                value={drafts[key] ?? boxText(key, card)}
                data={listed}
                filter={({ options }) => options}
                // Listed only while the reader types in the box: focus alone, or a committed date,
                // never covers the card with the column's dates.
                dropdownOpened={typed !== "" && listed.length > 0}
                onChange={(text) => {
                    edit(key, text);
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                        flushSync(() => {
                            commit(key);
                        });
                    } else if (event.key === "Escape" && event.currentTarget.value !== "") {
                        event.preventDefault();
                        event.stopPropagation();
                        commit(key);
                    }
                }}
                onBlur={() => {
                    commit(key);
                }}
            />
        );
    };
    return (
        <Stack gap={4} data-card-body ref={body}>
            <MatchSelect
                name={name}
                value={card.match}
                data={[
                    { value: "before", label: "Before" },
                    { value: "after", label: "After" },
                    { value: "between", label: "Between" },
                    ...PRESENCE,
                ]}
                onChange={(match) => {
                    setDrafts({});
                    setRefused(null);
                    onChange(dateModeOf(session, card, match as typeof card.match));
                }}
            />
            {card.match === "before" && box("before", `${name} before, a date or a year`)}
            {card.match === "after" && box("after", `${name} after, a date or a year`)}
            {card.match === "between" && (
                <Group gap={4} wrap="nowrap">
                    {box("from", `${name} from, a date or a year`)}
                    <Text size="xs">to</Text>
                    {box("to", `${name} to, a date or a year`)}
                </Group>
            )}
            {refused !== null && (
                // A field message, not a sentence; the box's placeholder says what it takes.
                <Text id={messageId} size="xs" c="var(--cm-text-danger)" role="alert">
                    Not a date
                </Text>
            )}
            {card.match !== "absent" && card.match !== "present" && (
                <NotMeasured missing={counts.missing} side={side} />
            )}
        </Stack>
    );
}

/**
 * A value row's checkbox label: "Paris, 4 nodes" in a layer's card; in a filter card and a
 * selection step the name and the count dimmed at the right, named as the layer's card says it.
 * @param variant - "filter" or "step", or undefined for a layer's card.
 * @param label - the value's name.
 * @param count - how many carry it.
 * @param side - nodes or edges.
 * @param swatch - the color the graph draws the value in, if it shows one.
 * @returns the checkbox's label props.
 */
function valueRow(
    variant: CardVariant | undefined,
    label: string,
    count: number,
    side: Side,
    swatch?: string,
): Pick<React.ComponentProps<typeof Checkbox>, "label" | "aria-label" | "styles"> {
    const words = `${label}, ${many(count, side)}`;
    if (variant === undefined) {
        return { label: words };
    }
    return {
        "aria-label": words,
        styles: { body: { width: "100%" }, labelWrapper: { flex: 1, minWidth: 0 } },
        label: (
            // A step's checklist rows are the pane's 11/16 type; a filter card's keep its own.
            <Group gap={4} wrap="nowrap" justify="space-between">
                {swatch !== undefined && (
                    <span className="ws-value-swatch" data-swatch={swatch} style={{ background: swatch }} />
                )}
                <Text
                    size={variant === "step" ? "sm" : "xs"}
                    truncate
                    span
                    style={swatch === undefined ? undefined : { flex: 1, minWidth: 0 }}
                >
                    {label}
                </Text>
                <Text size={variant === "step" ? "sm" : "xs"} c="dimmed" span>
                    {formatNumber(count)}
                </Text>
            </Group>
        ),
    };
}

/**
 * A category field's values and their counts, over a base when it has one.
 * @param session - the element's session
 * @param path - the field
 * @param side - nodes or edges
 * @param over - the base the values are counted over, or none for the whole graph
 * @param _version - the session's change count: a new one reads the values again
 * @returns the values and how many elements have none
 */
function categoryCounts(
    session: GraphSession,
    path: string,
    side: Side,
    over: Scope | undefined,
    _version: number,
): { values: readonly { value: unknown; count: number }[]; missing: number } {
    if (over === undefined) {
        return session.data.valueCounts(path, { kind: side });
    }
    // Counted over the selection's base (or a narrowing step's input), so a value only elements
    // outside it hold reads 0.
    const histogram = session.scope.histogram(path, { within: over, as: "categorical" });
    return {
        values: histogram.kind === "categorical" ? histogram.values : [],
        missing: histogram.missing,
    };
}

/** No value pinned to a checklist's top. */
const NO_VALUES: ReadonlySet<string> = new Set();

/**
 * The color the graph draws a value's elements in now, from graphty-element's style agreement over
 * them: one color when every one of them is drawn in it, else none, so a swatch is never a color the
 * graph does not show.
 * @param session - the element's session
 * @param path - the field
 * @param side - nodes or edges
 * @param value - the value, as the card spells it
 * @param _painted - a count of what the graph draws changing: a new one reads the color again
 * @returns the color, or undefined
 */
function drawnColor(
    session: GraphSession,
    path: string,
    side: Side,
    value: string,
    _painted: number,
): string | undefined {
    const where: RuleTree = { kind: "categories", attribute: path, values: [value] };
    const [color] = session.styles.agreement(
        { define: { kind: "rule", where, reading: "listed" } },
        `${side}.color`,
    ).channels;
    if (color?.state !== "agree" || color.unpainted > 0) {
        return undefined;
    }
    // A color reads as its hex, or as { r, g, b, a, hex }.
    const drawn: unknown = color.value;
    const hex = typeof drawn === "object" && drawn !== null && "hex" in drawn ? drawn.hex : drawn;
    return typeof hex === "string" ? hex : undefined;
}

/**
 * A category card: a counted checklist of the values, ticked ones being alternatives, drawing at
 * most 8 rows whatever the column holds; over 8 a search ("Search 5,000"), and while searching
 * "Check N" ticks every match; "(no value)" when some elements have none.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.side - nodes or edges
 * @param props.onChange - takes the card as edited
 * @param props.variant - "filter" or "step": each value's count dimmed at the right; "step" draws no Match select
 * @returns The body
 */
function CategoryCard({
    session,
    card,
    side,
    onChange,
    variant,
}: Readonly<{
    session: GraphSession;
    card: Extract<Card, { type: "category" }>;
    side: Side;
    onChange: OnCard;
    variant?: CardVariant;
}>): React.JSX.Element {
    const { name, path, within, counted, listed } = card.field;
    // A run re-run under the same id (Analyze tuning it, the data moving) keeps this path but not
    // its values, so the groups and counts are read again when a run or the data changes (never on
    // a style change: the card's own edits are style changes, and its values do not move with them).
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const bump = (): void => {
            setVersion((v) => v + 1);
        };
        const offs = (["run:changed", "project:derived"] as const).map((event) => session.on(event, bump));
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session]);
    const counts = useMemo(
        () => listed ?? categoryCounts(session, path, side, counted ?? within, version),
        [session, path, side, within, counted, version, listed],
    );
    // Each value's drawn color, read again when a layer or a run changes what the graph paints.
    const swatches = useContext(DrawnSwatches) && variant === "step";
    const [painted, setPainted] = useState(0);
    useEffect(() => {
        if (!swatches) {
            return undefined;
        }
        const offs = (["project:changed", "run:changed"] as const).map((event) =>
            session.on(event, () => {
                setPainted((v) => v + 1);
            }),
        );
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session, swatches]);
    const [search, setSearch] = useState("");
    const typed = search.trim().toLowerCase();
    const named = useMemo(
        () =>
            counts.values
                .map((each) => ({
                    value: String(each.value),
                    label: valueName(session, path, each.value),
                    count: each.count,
                }))
                // Largest first, then GAL1, GAL2 ... GAL10, as a reader counts.
                .sort((a, b) => b.count - a.count || NATURAL.compare(a.label, b.label)),
        [counts, session, path],
    );
    const checked = useMemo(() => new Set(card.values), [card.values]);
    // The order is set when the list opens and when the search changes, never by a tick: a row
    // ticked under the pointer stays where it is (selection spec 3.5).
    const ordered = useRef({ typed, checked });
    if (ordered.current.typed !== typed) {
        ordered.current = { typed, checked };
    }
    // A workspace list that shows every row keeps its order (largest first) whatever is ticked: a
    // saved card reads as it did. Pinning is for the list cut to 8 rows, where a tick could be cut.
    const whole = variant === "step" && selectionWorkspaceOn(session) && named.length <= SHOWN_VALUES;
    const { rows } = checklistRows(named, whole ? NO_VALUES : ordered.current.checked, typed);
    const shownValues = rows.map((each) => each.value).join("\n");
    const drawn = useMemo(
        () =>
            new Map(
                swatches
                    ? shownValues
                          .split("\n")
                          .map((value) => [value, drawnColor(session, path, side, value, painted)] as const)
                    : [],
            ),
        [swatches, session, path, side, shownValues, painted],
    );
    const { moreChecked, matches, unchecked } = checklistRows(named, checked, typed);
    const toggle = (value: string, on: boolean): void => {
        const values = on ? [...card.values, value] : card.values.filter((v) => v !== value);
        onChange({ ...card, match: "values", values });
    };
    const allMatched = matches.length > 0 && matches.every((each) => checked.has(each.value));
    const checkMatches = (): void => {
        const found = new Set(matches.map((each) => each.value));
        const values = allMatched
            ? card.values.filter((value) => !found.has(value))
            : [...card.values, ...matches.filter((each) => !checked.has(each.value)).map((each) => each.value)];
        onChange({ ...card, match: "values", values });
    };
    const shownUnchecked = rows.filter((each) => !checked.has(each.value)).length;
    return (
        <Stack gap={4}>
            {variant !== "step" && (
                <MatchSelect
                    name={name}
                    value={card.match}
                    data={[{ value: "values", label: "Is any of" }, ...PRESENCE]}
                    onChange={(match) => {
                        onChange({ ...card, match: match as typeof card.match });
                    }}
                />
            )}
            {card.match === "values" && (
                <>
                    {named.length > SHOWN_VALUES && (
                        <Group gap={4} wrap="nowrap">
                            <TextInput
                                size="xs"
                                aria-label={`Search ${name}`}
                                placeholder={`Search ${formatNumber(named.length)}`}
                                value={search}
                                style={{ flex: 1, minWidth: 0 }}
                                onChange={(event) => {
                                    setSearch(event.currentTarget.value);
                                }}
                            />
                            {typed !== "" && matches.length > 0 && (
                                <Button size="compact-xs" variant="default" onClick={checkMatches}>
                                    {`${allMatched ? "Uncheck" : "Check"} ${formatNumber(matches.length)}`}
                                </Button>
                            )}
                        </Group>
                    )}
                    <Stack
                        gap={2}
                        role="group"
                        aria-label={`${name} values`}
                        // A step's list keeps the height of its 8 rows while it is searched, so the
                        // pane under it does not jump.
                        className={variant === "step" && named.length > SHOWN_VALUES ? "ws-checklist-fixed" : undefined}
                    >
                        {rows.map((each) => (
                            <Checkbox
                                key={each.value}
                                size="xs"
                                {...valueRow(variant, each.label, each.count, side, drawn.get(each.value))}
                                data-enter-done
                                onKeyDown={tickOnEnter}
                                checked={checked.has(each.value)}
                                onChange={(event) => {
                                    toggle(each.value, event.currentTarget.checked);
                                }}
                            />
                        ))}
                        {counts.missing > 0 && typed === "" && (
                            <Checkbox
                                size="xs"
                                {...valueRow(variant, "(no value)", counts.missing, side)}
                                data-enter-done
                                onKeyDown={tickOnEnter}
                                checked={card.gaps}
                                onChange={(event) => {
                                    onChange({ ...card, gaps: event.currentTarget.checked });
                                }}
                            />
                        )}
                    </Stack>
                    {moreChecked > 0 && (
                        <Text size="xs" c="dimmed">
                            {`${formatNumber(moreChecked)} more checked`}
                        </Text>
                    )}
                    {/* How many values are not drawn, as "N more checked" says the checked ones (ws-polish 3). */}
                    {typed === "" && unchecked > shownUnchecked && (
                        <Text size="xs" c="dimmed">
                            {`${formatNumber(unchecked - shownUnchecked)} more`}
                        </Text>
                    )}
                    {typed !== "" && matches.length > rows.length && (
                        <Text size="xs" c="dimmed">
                            {`${formatNumber(matches.length - rows.length)} more`}
                        </Text>
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
 * @param props.variant - "filter": each value's count dimmed at the right
 * @returns The body
 */
function SourceCard({
    session,
    card,
    side,
    onChange,
    variant,
}: Readonly<{
    session: GraphSession;
    card: Extract<Card, { type: "source" }>;
    side: Side;
    onChange: OnCard;
    variant?: CardVariant;
}>): React.JSX.Element {
    const { name } = card.field;
    return (
        <Stack gap={2} role="group" aria-label={`${name} values`}>
            {session.data.sources().map((load) => (
                <Checkbox
                    key={load.key}
                    size="xs"
                    {...valueRow(
                        variant,
                        sourceName(load),
                        side === "node" ? load.counts.nodes : load.counts.edges,
                        side,
                    )}
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
 * @param props.variant - a selection step's body keeps Match case in its Advanced (ws-polish 3)
 * @returns The body
 */
function TextCard({
    session,
    card,
    onChange,
    variant,
}: Readonly<{
    session: GraphSession;
    card: Extract<Card, { type: "text" }>;
    onChange: OnCard;
    variant?: CardVariant;
}>): React.JSX.Element {
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
                            aria-label={`${name}: text to match`}
                            data-enter-done
                            placeholder="Text"
                            // Never more than a checklist draws, whatever the column holds (spec 4.3).
                            limit={SHOWN_VALUES}
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
                                // Enter commits the text (or takes the lit suggestion): the list goes
                                // with it, never left over the rows below.
                                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                                    setOpened(false);
                                    return;
                                }
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
                        {variant !== "step" && (
                            <Checkbox
                                size="xs"
                                label="Match case"
                                checked={card.caseSensitive}
                                onChange={(event) => {
                                    onChange({ ...card, caseSensitive: event.currentTarget.checked });
                                }}
                            />
                        )}
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
