import { ResultRow, SearchInput } from "@graphty/compact-mantine";
import type { FindContainsRow, FindValueRow } from "@graphty/graphty-element";
import type { AttributeDescriptor, GraphSession, Layer, LayerId, RuleTree } from "@graphty/graphty-element/session";
import {
    Button,
    Group,
    NumberInput,
    SegmentedControl,
    Select,
    Stack,
    TagsInput,
    Text,
    TextInput,
    UnstyledButton,
} from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";
import {
    allCompares,
    attributeOf,
    compareWords,
    type Condition,
    conditionOf,
    conditionRule,
    ID_READS,
    isNumber,
    type ReadsGroup,
} from "../rules/conditions";
import { RuleRows } from "../rules/RuleRows";
import { useWorkspace } from "../state/WorkspaceContext";
import { attributeName } from "./words";

type Selector = Layer["selector"];
type SelectorTarget = Layer["target"];

/** One offer of the find field: a live rule, or the fixed list of what it holds now. */
interface Offer {
    /** What the row says. */
    readonly words: string;
    /** The selector picking it gives the layer. */
    readonly selector: Selector;
}

/** The ways a rule picks elements, as the editor's Rule select offers them. */
type Mode = "every" | "where" | "top" | "named" | "set" | "selected" | "hovered" | "expression" | "other";

/** The editor's state: the way it picks and each way's fields. A whole one is written live. */
interface Form {
    readonly mode: Mode;
    readonly conditions: readonly Condition[];
    /** Top N by: what it ranks by (`<kind>:<path>`) and N. */
    readonly topReads: string;
    readonly topN: number | string;
    readonly named: readonly string[];
    readonly set: string;
    readonly expression: string;
    /** A Both layer on a node rule: the edges touching its nodes, not only those between them. */
    readonly touching: boolean;
}

const BLANK_FORM: Form = {
    mode: "where",
    conditions: [],
    topReads: "",
    topN: 10,
    named: [],
    set: "",
    expression: "",
    touching: false,
};

const MODES: readonly { readonly value: Mode; readonly label: string }[] = [
    { value: "every", label: "Every one" },
    { value: "where", label: "Where a value" },
    { value: "top", label: "Top N by" },
    { value: "named", label: "Named" },
    { value: "set", label: "Members of a set" },
    { value: "selected", label: "Selected" },
    { value: "hovered", label: "Hovered" },
    { value: "expression", label: "Expression" },
];

const KINDS = [
    { value: "node", label: "Nodes" },
    { value: "edge", label: "Edges" },
    { value: "both", label: "Both" },
];

/**
 * Counts elements in words: "3 nodes", "1 edge".
 * @param n - how many.
 * @param kind - nodes or edges.
 * @returns the words.
 */
function countWords(n: number, kind: "node" | "edge"): string {
    return `${String(n)} ${kind}${n === 1 ? "" : "s"}`;
}

/**
 * The offers for one find row: the element's rule for it, live, then the elements it holds now.
 * @param session - the element's session.
 * @param row - a contains row or a value row of `session.find`.
 * @param test - how the rule reads: "contains bob", "is Bob".
 * @returns the two offers.
 */
function offersOf(session: GraphSession, row: FindContainsRow | FindValueRow, test: string): Offer[] {
    const kinds = row.kind === "node" ? "Nodes" : "Edges";
    const ids = "nodes" in row.target ? row.target.nodes : undefined;
    const edges = "edges" in row.target ? row.target.edges : undefined;
    const these = row.count === 1 ? `This ${row.kind}` : `These ${countWords(row.count, row.kind)}`;
    return [
        {
            words: `${kinds} where ${attributeName(session, row.path)} ${test}, ${countWords(row.count, row.kind)}`,
            selector: { match: "rule", where: row.rule },
        },
        { words: these, selector: { match: "ids", nodes: ids ?? [], edges: edges ?? [] } },
    ];
}

/**
 * What a `<kind>:<path>` names, for a rule: the attribute's path, or `id`.
 * @param reads - the choice.
 * @param attributes - the attributes.
 * @returns the path, or undefined for none.
 */
function pathOf(reads: string, attributes: readonly AttributeDescriptor[]): string | undefined {
    return reads === ID_READS ? "id" : attributeOf(reads, attributes)?.path;
}

/**
 * The editor's state for a layer's selector.
 * @param selector - the selector.
 * @param attributes - the attributes.
 * @param prefer - the kind to read a path shared by nodes and edges as.
 * @returns the form; mode `other` for a selector it does not draw.
 */
function formOf(selector: Selector, attributes: readonly AttributeDescriptor[], prefer: SelectorTarget): Form {
    switch (selector.match) {
        case "everything":
            return { ...BLANK_FORM, mode: "every" };
        case "state":
            return { ...BLANK_FORM, mode: selector.state };
        case "ids":
            return {
                ...BLANK_FORM,
                mode: "named",
                named: ((prefer === "edge" ? selector.edges : selector.nodes) ?? []).map(String),
            };
        case "member":
            return typeof selector.of === "object" && "set" in selector.of
                ? { ...BLANK_FORM, mode: "set", set: selector.of.set }
                : { ...BLANK_FORM, mode: "other" };
        case "expression":
            return { ...BLANK_FORM, mode: "expression", expression: selector.where };
        case "rule":
            return { ...ruleForm(selector.where, attributes, prefer), touching: selector.edges === "incident" };
        default:
            return { ...BLANK_FORM, mode: "other" };
    }
}

/**
 * The editor's state for a rule tree.
 * @param rule - the rule.
 * @param attributes - the attributes.
 * @param prefer - the kind to read a shared path as.
 * @returns the form.
 */
function ruleForm(rule: RuleTree, attributes: readonly AttributeDescriptor[], prefer: SelectorTarget): Form {
    if (rule.kind === "threshold" && rule.top !== undefined && rule.above === undefined) {
        const kinds = attributes.filter((a) => a.path === rule.path).map((a) => a.kind);
        const kind = kinds.includes(prefer) ? prefer : (kinds[0] ?? prefer);
        return { ...BLANK_FORM, mode: "top", topReads: `${kind}:${rule.path}`, topN: rule.top };
    }
    if (rule.kind === "expression") {
        return { ...BLANK_FORM, mode: "expression", expression: rule.where };
    }
    const leaves = rule.kind === "all" ? rule.of : [rule];
    const conditions = leaves.map((leaf) => conditionOf(leaf, attributes, prefer));
    return conditions.every((c): c is Condition => c !== null)
        ? { ...BLANK_FORM, mode: "where", conditions }
        : { ...BLANK_FORM, mode: "other" };
}

/**
 * The selector a whole form makes, or null while it is incomplete.
 * @param form - the form.
 * @param attributes - the attributes.
 * @param nodes - whether the layer paints nodes (Named names nodes, else edges).
 * @returns the selector.
 */
function selectorOf(form: Form, attributes: readonly AttributeDescriptor[], nodes: boolean): Selector | null {
    const edges = form.touching ? { edges: "incident" as const } : {};
    switch (form.mode) {
        case "every":
            return { match: "everything" };
        case "selected":
        case "hovered":
            return { match: "state", state: form.mode };
        case "named":
            if (form.named.length === 0) {
                return null;
            }
            return nodes ? { match: "ids", nodes: form.named } : { match: "ids", edges: form.named };
        case "set":
            return form.set === "" ? null : { match: "member", of: { set: form.set } };
        case "expression":
            return form.expression.trim() === "" ? null : { match: "expression", where: form.expression.trim() };
        case "top": {
            const path = pathOf(form.topReads, attributes);
            return path === undefined || typeof form.topN !== "number" || form.topN < 1
                ? null
                : { match: "rule", where: { kind: "threshold", path, top: form.topN }, ...edges };
        }
        case "where": {
            const rules = form.conditions.map((c) => conditionRule(c, attributes));
            if (rules.length === 0 || rules.some((r) => r === null)) {
                return null;
            }
            const leaves = rules as RuleTree[];
            return { match: "rule", where: leaves.length === 1 ? leaves[0] : { kind: "all", of: leaves }, ...edges };
        }
        default:
            return null;
    }
}

/**
 * Whether a form's rule reads only node values, so a Both layer chooses which edges go with it.
 * @param form - the form.
 * @returns true for a node rule.
 */
function readsNodes(form: Form): boolean {
    if (form.mode === "top") {
        return form.topReads.startsWith("node:");
    }
    return (
        form.mode === "where" && form.conditions.length > 0 && form.conditions.every((c) => c.reads.startsWith("node:"))
    );
}

/**
 * One condition in words: "id matches pattern [13579]$".
 * @param condition - the condition.
 * @param attributes - the attributes.
 * @returns the words.
 */
function conditionWords(condition: Condition, attributes: readonly AttributeDescriptor[]): string {
    const name =
        condition.reads === ID_READS ? "id" : (attributeOf(condition.reads, attributes)?.plainName ?? "a value");
    const compare = compareWords(condition.compare);
    switch (condition.compare) {
        case "has-value":
            return `${name} ${compare}`;
        case "between":
            return `${name} is between ${String(condition.low)} and ${String(condition.high)}`;
        case "at-least":
        case "at-most":
            return `${name} is ${compare} ${String(condition.low)}`;
        default: {
            const numeric = isNumber(attributeOf(condition.reads, attributes));
            return `${name} ${compare} ${numeric ? String(condition.low) : condition.text}`;
        }
    }
}

/**
 * The rule as one sentence: "Nodes where id matches pattern [13579]$, and the edges between them".
 * @param session - the element's session.
 * @param form - the rule's form.
 * @param kind - what the layer paints.
 * @returns the sentence.
 */
function sentenceOf(session: GraphSession, form: Form, kind: "node" | "edge" | "both"): string {
    const attributes = session.data.attributes();
    const who = { node: "Nodes", edge: "Edges", both: "Nodes and edges" }[kind];
    const edgeTail =
        kind === "both" && readsNodes(form) ? `, and the edges ${form.touching ? "touching" : "between"} them` : "";
    const lead = kind === "both" && readsNodes(form) ? "Nodes" : who;
    switch (form.mode) {
        case "every":
            return `Every ${kind === "both" ? "node and edge" : kind}`;
        case "selected":
            return `${who} that are selected`;
        case "hovered":
            return `${who} under the pointer`;
        case "named":
            return `Named: ${form.named.join(", ")}`;
        case "set":
            return `Members of ${session.sets.get(form.set)?.name ?? "a set"}`;
        case "expression":
            return `${who} where ${form.expression}`;
        case "top": {
            const by = attributeOf(form.topReads, attributes)?.plainName ?? "a value";
            return `Top ${String(form.topN)} ${lead.toLowerCase()} by ${by}${edgeTail}`;
        }
        case "where":
            return form.conditions.length === 0
                ? `${who}: no rule yet`
                : `${lead} where ${form.conditions.map((c) => conditionWords(c, attributes)).join(" and ")}${edgeTail}`;
        default:
            return `${who} chosen by a rule`;
    }
}

/**
 * The Which elements section of a reader's own layer (tier3 design, section 3.1). At rest it is
 * the rule as a sentence and how many it paints; a click opens the editor in place: the kind, a
 * find field, the rule (conditions shared with Data > Filters, Top N by, Named, Set, Selected,
 * Hovered, Expression) and, for a Both layer on a node rule, which edges go with it. Every edit
 * that makes a whole rule is written to the layer at once, so the count and the canvas are the
 * element's; Done keeps it, Escape restores the rule the editor opened on.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.layer - the layer, any part of its row
 * @returns The section
 */
export function WhichElements({
    session,
    layer,
}: Readonly<{ session: GraphSession; layer: LayerId }>): React.JSX.Element {
    const { store } = useWorkspace();
    const parts = session.styles.parts(layer);
    const ids = [parts?.node, parts?.edge].filter((id): id is LayerId => id !== undefined);
    const layers = ids.map((id) => session.styles.get(id)).filter((l): l is Layer => l !== undefined);
    const kinds = new Set(layers.map((l) => l.target));
    const kind = kinds.size > 1 ? "both" : (layers[0]?.target ?? "node");
    const attributes = session.data.attributes();
    const selector = layers[0]?.selector ?? { match: "everything" };
    const prefer: SelectorTarget = kinds.has("node") ? "node" : "edge";

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Form>(() => formOf(selector, attributes, prefer));
    // The selector of each part when the editor opened, which Escape writes back.
    const opened = useRef<ReadonlyMap<LayerId, Selector>>(new Map());
    const sentence = useRef<HTMLButtonElement>(null);
    const kindRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (open) {
            kindRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
        }
    }, [open]);

    const stats = session.data.statistics();
    const painted = layers
        .map((l) => {
            const total = l.target === "node" ? stats.nodeCount : stats.edgeCount;
            return `${String(session.styles.counts(l.id).matched)} of ${countWords(total, l.target)}`;
        })
        .join(", ");
    // At rest the sentence reads the layer as it is; open, the rule being edited.
    const words = sentenceOf(session, open ? form : formOf(selector, attributes, prefer), kind);

    const write = async (next: Selector): Promise<boolean> => {
        try {
            await session.transaction("Which elements", async (tx) => {
                for (const l of layers) {
                    await tx.styles.update(l.id, { selector: next });
                }
            });
            return true;
        } catch {
            return false;
        }
    };
    // Each edit that makes a whole, new rule is written at once; an incomplete one waits.
    const edit = (next: Form): void => {
        setForm(next);
        const made = selectorOf(next, attributes, kinds.has("node"));
        if (made !== null && JSON.stringify(made) !== JSON.stringify(selector)) {
            void write(made);
        }
    };
    const close = (): void => {
        setOpen(false);
        // Focus returns to the sentence once it is drawn again.
        requestAnimationFrame(() => sentence.current?.focus());
    };

    if (!open) {
        return (
            <Stack gap={2} data-testid="which-elements">
                <Text size="xs" fw={600}>
                    Which elements
                </Text>
                <UnstyledButton
                    ref={sentence}
                    aria-label={`Which elements: ${words}. Edit`}
                    onClick={() => {
                        opened.current = new Map(layers.map((l) => [l.id, l.selector]));
                        setForm(formOf(selector, attributes, prefer));
                        setOpen(true);
                    }}
                >
                    <Text size="xs">{words}</Text>
                </UnstyledButton>
                <Text size="xs" c="dimmed" role="status">
                    {painted}
                </Text>
            </Stack>
        );
    }

    const choices: ReadsGroup[] = (["node", "edge"] as const)
        .filter((k) => kinds.has(k))
        .map((k) => ({
            group: k === "node" ? "Nodes" : "Edges",
            items: [
                ...(k === "node" && !attributes.some((a) => a.kind === "node" && a.path === "id")
                    ? [{ value: ID_READS, label: "Id" }]
                    : []),
                ...attributes
                    .filter((a) => a.kind === k)
                    .map((a) => ({ value: `${a.kind}:${a.path}`, label: a.plainName })),
            ],
        }));
    const numbers = attributes
        .filter((a) => kinds.has(a.kind) && isNumber(a))
        .map((a) => ({ value: `${a.kind}:${a.path}`, label: a.plainName }));

    return (
        <Stack
            gap={6}
            data-testid="which-elements"
            onKeyDown={(event) => {
                if (isPanelEscape(event.nativeEvent)) {
                    event.preventDefault();
                    event.stopPropagation();
                    const before = opened.current;
                    // Restores the rule the editor opened on, if an edit changed it.
                    if (layers.some((l) => JSON.stringify(before.get(l.id)) !== JSON.stringify(l.selector))) {
                        void session
                            .transaction("Which elements", async (tx) => {
                                for (const [id, was] of before) {
                                    await tx.styles.update(id, { selector: was });
                                }
                            })
                            .catch(() => undefined);
                    }
                    close();
                }
            }}
        >
            <Text size="xs" fw={600}>
                Which elements
            </Text>
            <div ref={kindRef}>
                {/* The kind of an existing layer is its own: changing it waits on graphty-element. */}
                <SegmentedControl
                    size="xs"
                    fullWidth
                    aria-label="Paints"
                    value={kind}
                    data={KINDS.map((k) => ({ ...k, disabled: k.value !== kind }))}
                />
            </div>
            <FindOffers
                session={session}
                kinds={kinds}
                onPick={(picked) => {
                    setForm(formOf(picked, attributes, prefer));
                    void write(picked).then((ok) => {
                        if (!ok) {
                            store.set({ notice: { message: "That rule could not be used for this layer" } });
                        }
                    });
                }}
            />
            <Select
                size="xs"
                aria-label="Rule"
                data={form.mode === "other" ? [...MODES, { value: "other", label: "A rule set elsewhere" }] : MODES}
                value={form.mode}
                allowDeselect={false}
                onChange={(value) => {
                    const mode = MODES.find((m) => m.value === value)?.value;
                    if (mode !== undefined) {
                        edit({ ...form, mode });
                    }
                }}
            />
            {form.mode === "where" && (
                <RuleRows
                    conditions={form.conditions}
                    onChange={(conditions) => {
                        edit({ ...form, conditions });
                    }}
                    choices={choices}
                    compares={allCompares}
                    attributes={attributes}
                />
            )}
            {form.mode === "top" && (
                <Group gap={4} wrap="nowrap">
                    <NumberInput
                        size="xs"
                        aria-label="How many"
                        min={1}
                        value={form.topN}
                        onChange={(topN) => {
                            edit({ ...form, topN });
                        }}
                    />
                    <Select
                        size="xs"
                        aria-label="By"
                        data={numbers}
                        value={form.topReads === "" ? null : form.topReads}
                        searchable
                        onChange={(value) => {
                            edit({ ...form, topReads: value ?? "" });
                        }}
                    />
                </Group>
            )}
            {form.mode === "named" && (
                <TagsInput
                    size="xs"
                    aria-label={kinds.has("node") ? "Node ids" : "Edge ids"}
                    value={[...form.named]}
                    onChange={(named) => {
                        edit({ ...form, named });
                    }}
                />
            )}
            {form.mode === "set" && (
                <Select
                    size="xs"
                    aria-label="Set"
                    data={session.sets.list().map((s) => ({ value: s.id, label: s.name }))}
                    value={form.set === "" ? null : form.set}
                    onChange={(value) => {
                        edit({ ...form, set: value ?? "" });
                    }}
                />
            )}
            {form.mode === "expression" && (
                <TextInput
                    size="xs"
                    aria-label="Expression"
                    value={form.expression}
                    onChange={(event) => {
                        edit({ ...form, expression: event.currentTarget.value });
                    }}
                />
            )}
            {kind === "both" && readsNodes(form) && (
                <Group gap={4} wrap="nowrap">
                    <Text size="xs">Edges</Text>
                    <SegmentedControl
                        size="xs"
                        aria-label="Which edges"
                        value={form.touching ? "touching" : "between"}
                        data={[
                            { value: "between", label: "between them" },
                            { value: "touching", label: "touching them" },
                        ]}
                        onChange={(value) => {
                            edit({ ...form, touching: value === "touching" });
                        }}
                    />
                </Group>
            )}
            <Group justify="space-between" wrap="nowrap">
                <Text size="xs" c="dimmed" role="status">
                    {painted}
                </Text>
                <Button size="compact-xs" onClick={close}>
                    Done
                </Button>
            </Group>
        </Stack>
    );
}

/**
 * The editor's find field: each thing find matches, offered as a live rule ("Nodes where name
 * contains bob, 3 nodes") or as the fixed list it holds now ("These 3 nodes"). Every rule is the
 * one graphty-element built for that find row; the field only words and arranges them.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.kinds - what the layer paints: only rules of those kinds are offered
 * @param props.onPick - takes the picked offer's selector
 * @returns The field and its list
 */
function FindOffers({
    session,
    kinds,
    onPick,
}: Readonly<{
    session: GraphSession;
    kinds: ReadonlySet<SelectorTarget>;
    onPick: (selector: Selector) => void;
}>): React.JSX.Element {
    const [text, setText] = useState("");
    const [active, setActive] = useState(0);
    const listId = useId();
    // Asked again each render, so a data change is never stale; find's index is kept per revision.
    const found = text.trim() === "" ? null : session.find(text);
    const offers: Offer[] = [
        ...(found?.contains ?? [])
            .filter((row) => kinds.has(row.kind))
            .flatMap((row) => offersOf(session, row, `contains ${row.text}`)),
        ...(found?.values ?? [])
            .filter((row) => kinds.has(row.kind))
            .flatMap((row) => offersOf(session, row, `is ${String(row.value)}`)),
    ];
    const pick = (offer: Offer): void => {
        setText("");
        setActive(0);
        onPick(offer.selector);
    };
    const optionId = (i: number): string => `${listId}-${String(i)}`;
    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (offers.length === 0) {
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive(Math.min(active + 1, offers.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive(Math.max(active - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            pick(offers[Math.min(active, offers.length - 1)]);
        }
    };

    return (
        <>
            <SearchInput
                value={text}
                onChange={(next) => {
                    setText(next);
                    setActive(0);
                }}
                onKeyDown={onKeyDown}
                aria-label="Find elements"
                placeholder="Find elements..."
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={offers.length > 0}
                aria-controls={offers.length > 0 ? listId : undefined}
                aria-activedescendant={offers.length > 0 ? optionId(Math.min(active, offers.length - 1)) : undefined}
            />
            {offers.length > 0 && (
                <div // NOSONAR(S6819): the popup of an ARIA combobox on a text box; a native select cannot be one
                    id={listId}
                    role="listbox"
                    aria-label="Ways to pick elements"
                >
                    {offers.map((offer, i) => (
                        <ResultRow
                            key={optionId(i)}
                            id={optionId(i)}
                            name={offer.words}
                            icon={
                                offer.selector.match === "rule" ? (
                                    <GLYPHS.filter size={14} />
                                ) : (
                                    <GLYPHS.node size={14} />
                                )
                            }
                            current={i === Math.min(active, offers.length - 1)}
                            onClick={() => {
                                pick(offer);
                            }}
                        />
                    ))}
                </div>
            )}
        </>
    );
}
