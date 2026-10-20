/**
 * The condition cards (carried over from design/studio-tier3, cut to this branch): one card per
 * condition, each with its own "X of Y" count, its value editor and a remove button, and "+" to add
 * one on a field. `WhichPicker` puts them on a style layer's targets; the Data place's Filters
 * section puts the same cards on filter steps. Every count is graphty-element's (`scope.count`).
 */

import { SegmentedControl } from "@graphty/compact-mantine";
import type { GraphSession, Layer, LayerSpec } from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Badge,
    CloseButton,
    Group,
    Menu,
    MultiSelect,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from "@mantine/core";
import { Circle, Minus, Plus } from "lucide-react";
import React, { useState } from "react";

import { useAsyncValue, useSessionVersion } from "../inspector/hooks";
import { formatNumber } from "../inspector/words";
import { useWorkspace } from "../state/WorkspaceContext";
import {
    type Card,
    type CardField,
    cardFields,
    cardsOf,
    keyOf,
    leafOf,
    newCard,
    selectorOf,
    selectorRule,
    type Side,
    sideOf,
} from "./cards";

/** The element's count of what one leaf holds, on one side, and how many there are. */
interface Count {
    readonly matched: number;
    readonly total: number;
}

/**
 * How many elements of its side one card holds, as graphty-element counts its leaf.
 * @param session - the element's session.
 * @param card - the card.
 * @returns the count, or undefined while unfinished or counting.
 */
function useCardCount(session: GraphSession, card: Card): Count | undefined {
    const version = useSessionVersion(session);
    const leaf = leafOf(card);
    const side = sideOf(card);
    return useAsyncValue<Count>(
        () =>
            leaf === null
                ? null
                : session.scope.count({ define: { kind: "rule", where: leaf, reading: "clipped" } }).then((c) => {
                      const stats = session.data.statistics();
                      return side === "node"
                          ? { matched: c.nodes, total: stats.nodeCount }
                          : { matched: c.edges, total: stats.edgeCount };
                  }),
        `${String(version)}:${JSON.stringify(leaf)}`,
    );
}

/**
 * "140 of 900" with the node or edge icon.
 * @param props - Component props
 * @param props.side - nodes or edges
 * @param props.count - the count, or undefined
 * @returns the chip
 */
export function CountChip({ side, count }: Readonly<{ side: Side; count: Count | undefined }>): React.JSX.Element {
    const icon =
        side === "node" ? <Circle size={10} fill="currentColor" aria-hidden /> : <Minus size={10} aria-hidden />;
    const words = count === undefined ? "--" : `${formatNumber(count.matched)} of ${formatNumber(count.total)}`;
    return (
        <Badge
            size="xs"
            variant="light"
            color={side === "node" ? "blue" : "orange"}
            leftSection={icon}
            data-testid="card-count"
            aria-label={`${words} ${side === "node" ? "nodes" : "edges"}`}
        >
            {words}
        </Badge>
    );
}

/**
 * Text that commits on Enter or when it loses focus, so a keystroke is not a write.
 * @param props - Component props
 * @param props.label - its accessible name
 * @param props.value - the committed text
 * @param props.onCommit - takes the new text
 * @returns the input
 */
function CommitText({
    label,
    value,
    onCommit,
}: Readonly<{ label: string; value: string; onCommit: (text: string) => void }>): React.JSX.Element {
    const [text, setText] = useState(value);
    return (
        <TextInput
            size="xs"
            aria-label={label}
            value={text}
            onChange={(event) => {
                setText(event.currentTarget.value);
            }}
            onBlur={() => {
                onCommit(text.trim());
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    onCommit(text.trim());
                }
            }}
        />
    );
}

/**
 * A number that commits on Enter or blur; empty is no bound.
 * @param props - Component props
 * @param props.label - its accessible name and placeholder
 * @param props.value - the committed number
 * @param props.onCommit - takes the new number, or undefined
 * @returns the input
 */
function CommitNumber({
    label,
    value,
    onCommit,
}: Readonly<{
    label: string;
    value: number | undefined;
    onCommit: (n: number | undefined) => void;
}>): React.JSX.Element {
    const [n, setN] = useState<string | number>(value ?? "");
    const commit = (): void => {
        onCommit(n === "" ? undefined : Number(n));
    };
    return (
        <NumberInput
            size="xs"
            aria-label={label}
            placeholder={label}
            value={n}
            onChange={setN}
            onBlur={commit}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    commit();
                }
            }}
        />
    );
}

/**
 * A card's value editor, typed by its field: Min and Max, the values to keep, contains / is and
 * the text, or Yes / No. A fixed card has none.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.onChange - takes the edited card
 * @returns the editor
 */
export function CardBody({
    session,
    card,
    onChange,
}: Readonly<{ session: GraphSession; card: Card; onChange: (card: Card) => void }>): React.JSX.Element | null {
    switch (card.type) {
        case "number":
            return (
                <Group gap={4} grow wrap="nowrap">
                    <CommitNumber
                        label="Min"
                        value={card.min}
                        onCommit={(min) => {
                            onChange({ ...card, min });
                        }}
                    />
                    <CommitNumber
                        label="Max"
                        value={card.max}
                        onCommit={(max) => {
                            onChange({ ...card, max });
                        }}
                    />
                </Group>
            );
        case "category": {
            const counts = session.data.valueCounts(card.field.path, { kind: card.field.on });
            const names = session.data.valueLabels(card.field.path);
            const data = counts.values.map(({ value, count }) => ({
                value: String(value),
                label: `${names.get(String(value)) ?? String(value)} (${formatNumber(count)})`,
            }));
            return (
                <MultiSelect
                    size="xs"
                    aria-label="Values"
                    placeholder="Values"
                    data={data}
                    value={[...card.values]}
                    searchable
                    onChange={(values) => {
                        onChange({ ...card, values });
                    }}
                />
            );
        }
        case "text":
            return (
                <Group gap={4} wrap="nowrap">
                    <Select
                        size="xs"
                        w={92}
                        aria-label="Match"
                        allowDeselect={false}
                        data={[
                            { value: "contains", label: "contains" },
                            { value: "is", label: "is" },
                        ]}
                        value={card.mode}
                        onChange={(mode) => {
                            onChange({ ...card, mode: mode === "is" ? "is" : "contains" });
                        }}
                    />
                    <CommitText
                        label="Text"
                        value={card.text}
                        onCommit={(text) => {
                            onChange({ ...card, text });
                        }}
                    />
                </Group>
            );
        case "yes-no":
            return (
                <SegmentedControl
                    size="xs"
                    aria-label="Value"
                    value={card.yes ? "yes" : "no"}
                    data={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                    ]}
                    onChange={(value) => {
                        onChange({ ...card, yes: value === "yes" });
                    }}
                />
            );
        default:
            return null;
    }
}

/**
 * One condition card: its field, its own count, any extra control (the Filters' Select / Hide),
 * remove, and its value editor.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.card - the card
 * @param props.extra - a control beside the count
 * @param props.onChange - takes the edited card
 * @param props.onRemove - removes it
 * @returns the card
 */
export function ConditionCard({
    session,
    card,
    extra,
    onChange,
    onRemove,
}: Readonly<{
    session: GraphSession;
    card: Card;
    extra?: React.ReactNode;
    onChange: (card: Card) => void;
    onRemove: () => void;
}>): React.JSX.Element {
    const count = useCardCount(session, card);
    const name = card.type === "fixed" ? "Rule" : card.field.name;
    return (
        <Stack gap={4} className="ws-card" data-testid="condition-card" role="group" aria-label={name}>
            <Group gap={4} wrap="nowrap" justify="space-between">
                <Text size="xs" fw={600} truncate>
                    {name}
                </Text>
                <Group gap={4} wrap="nowrap">
                    <CountChip side={sideOf(card)} count={count} />
                    {extra}
                    <CloseButton size="xs" aria-label={`Remove ${name}`} onClick={onRemove} />
                </Group>
            </Group>
            <CardBody session={session} card={card} onChange={onChange} />
        </Stack>
    );
}

/**
 * "+": a menu of the fields a card can test, by kind, those already carded left out.
 * @param props - Component props
 * @param props.fields - the fields offered
 * @param props.taken - the keys already carded
 * @param props.label - the button's name
 * @param props.onAdd - takes the picked field
 * @returns the menu, or nothing when no field is left
 */
export function AddCardMenu({
    fields,
    taken,
    label,
    onAdd,
}: Readonly<{
    fields: readonly CardField[];
    taken: ReadonlySet<string>;
    label: string;
    onAdd: (field: CardField) => void;
}>): React.JSX.Element | null {
    const open = fields.filter((f) => !taken.has(keyOf(f)));
    if (open.length === 0) {
        return null;
    }
    const sides: Side[] = ["node", "edge"];
    return (
        <Menu position="bottom-end">
            <Menu.Target>
                <Tooltip label={label}>
                    <ActionIcon variant="subtle" size="sm" aria-label={label}>
                        <Plus size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
                {sides.map((side) => {
                    const mine = open.filter((f) => f.on === side);
                    return mine.length === 0 ? null : (
                        <React.Fragment key={side}>
                            <Menu.Label>{side === "node" ? "Nodes" : "Edges"}</Menu.Label>
                            {mine.map((f) => (
                                <Menu.Item
                                    key={keyOf(f)}
                                    onClick={() => {
                                        onAdd(f);
                                    }}
                                >
                                    {f.name}
                                </Menu.Item>
                            ))}
                        </React.Fragment>
                    );
                })}
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * Which nodes (or Which edges) one style layer paints, as condition cards ANDed together. Every
 * edit is written at once to the layer's selector, one undo step; a card still unfinished (no
 * value picked, no text typed) waits here until it makes a rule.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.layer - the layer
 * @returns the picker, or nothing for a selector the cards cannot draw
 */
export function WhichPicker({
    session,
    layer,
}: Readonly<{ session: GraphSession; layer: Layer }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const side: Side = layer.target === "edge" ? "edge" : "node";
    const fields = cardFields(session, side);
    const rule = selectorRule(layer.selector);
    const [drafts, setDrafts] = useState<readonly Card[]>([]);
    if (rule === undefined) {
        return null;
    }
    const written = cardsOf(rule, fields);
    const cards = [...written.filter((c) => !drafts.some((d) => d.key === c.key)), ...drafts];
    const write = (next: readonly Card[]): void => {
        const selector = selectorOf(next) as LayerSpec["selector"];
        if (JSON.stringify(selector) === JSON.stringify(layer.selector)) {
            return;
        }
        session.styles.update(layer.id, { selector }).then(
            () => undefined,
            () => {
                store.set({ notice: { message: "Targets not changed" } });
            },
        );
    };
    const change = (card: Card): void => {
        const next = cards.map((c) => (c.key === card.key ? card : c));
        setDrafts((now) => [...now.filter((d) => d.key !== card.key), ...(leafOf(card) === null ? [card] : [])]);
        write(next);
    };
    const remove = (card: Card): void => {
        setDrafts((now) => now.filter((d) => d.key !== card.key));
        write(cards.filter((c) => c.key !== card.key));
    };
    const noun = side === "node" ? "nodes" : "edges";
    return (
        <Stack gap={4} data-testid="which-picker" data-side={side} role="group" aria-label={`Which ${noun}`}>
            <Group gap={4} h={24} wrap="nowrap" justify="space-between">
                <Text size="xs" fw={600} pl={4}>
                    Which {noun}
                </Text>
                <AddCardMenu
                    fields={fields}
                    taken={new Set(cards.map((c) => c.key))}
                    label="Add condition"
                    onAdd={(field) => {
                        setDrafts((now) => [...now, newCard(field)]);
                    }}
                />
            </Group>
            {cards.map((card) => (
                <ConditionCard
                    key={card.key}
                    session={session}
                    card={card}
                    onChange={change}
                    onRemove={() => {
                        remove(card);
                    }}
                />
            ))}
        </Stack>
    );
}
