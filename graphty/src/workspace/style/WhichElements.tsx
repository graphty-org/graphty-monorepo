import { ResultRow, SearchInput } from "@graphty/compact-mantine";
import type { FindContainsRow, FindValueRow } from "@graphty/graphty-element";
import type { GraphSession, Layer, LayerId } from "@graphty/graphty-element/session";
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
import { orNotice } from "../graph-place/actions";
import { isPanelEscape } from "../keys/keys";
import { allCompares, type Field, isNumber, type ReadsGroup } from "../rules/conditions";
import { RuleRows } from "../rules/RuleRows";
import { useWorkspace } from "../state/WorkspaceContext";
import {
    countWords,
    DRAFT_NAME,
    fieldsOf,
    type Form,
    formOf,
    type Kind,
    MODES,
    readsNodes,
    type Selector,
    selectorOf,
    type SelectorTarget,
    sentenceOf,
} from "./whichRule";

/** One offer of the find field: a live rule, or the fixed list of what it holds now. */
interface Offer {
    /** What the row says, first line. */
    readonly name: string;
    /** The second line: the count for a rule, the column and test for a fixed list. */
    readonly detail: string;
    /** The selector picking it gives the layer. */
    readonly selector: Selector;
    /** Whether the offer is of nodes or of edges. */
    readonly kind: "node" | "edge";
}

const KINDS: readonly { readonly value: Kind; readonly label: string }[] = [
    { value: "node", label: "Nodes" },
    { value: "edge", label: "Edges" },
    { value: "both", label: "Both" },
];

/**
 * The offers for one find row: the element's rule for it, live, then the elements it holds now.
 * The fixed list says which column and test found it, so two columns finding the same text are
 * told apart, and a single node is named.
 * @param row - a contains row or a value row of `session.find`.
 * @param column - the column's name.
 * @param test - how the rule reads: "contains bob", "is Bob".
 * @param nameOf - a found node's name, by id.
 * @returns the two offers.
 */
function offersOf(
    row: FindContainsRow | FindValueRow,
    column: string,
    test: string,
    nameOf: (id: unknown) => string | undefined,
): Offer[] {
    const kinds = row.kind === "node" ? "Nodes" : "Edges";
    const ids = "nodes" in row.target ? row.target.nodes : undefined;
    const edges = "edges" in row.target ? row.target.edges : undefined;
    const only = row.count === 1 && row.kind === "node" ? nameOf(ids?.[0]) : undefined;
    let these = `These ${countWords(row.count, row.kind)}`;
    if (row.count === 1) {
        these = only === undefined ? `This ${row.kind}` : `This node: ${only}`;
    }
    return [
        {
            name: `${kinds} where ${column} ${test}`,
            detail: countWords(row.count, row.kind),
            selector: { match: "rule", where: row.rule },
            kind: row.kind,
        },
        {
            name: these,
            detail: `${column} ${test}`,
            selector: { match: "ids", nodes: ids ?? [], edges: edges ?? [] },
            kind: row.kind,
        },
    ];
}

/** The props of the rule editor. */
interface RuleEditorProps {
    readonly session: GraphSession;
    readonly attributes: readonly Field[];
    /** What the layer paints; undefined for a draft whose kind is not chosen yet. */
    readonly kind: Kind | undefined;
    readonly onKind: (kind: Kind) => void;
    readonly form: Form;
    readonly onForm: (form: Form) => void;
    /** Takes a find offer's selector and what it is of. */
    readonly onPick: (selector: Selector, kind: "node" | "edge") => void;
    /** The line under the editor: what it matches now. */
    readonly status: React.ReactNode;
    /** Done, for a layer's editor; a draft has none. */
    readonly onDone?: () => void;
}

/**
 * The Which elements editor (tier3 design, section 3.1): the kind, a find field, the rule
 * (conditions shared with Data > Filters, Top N by, Named, Set, Selected, Hovered, Expression)
 * and, for a Both layer on a node rule, which edges go with it. Focus starts on the kind.
 * @param props - Component props
 * @returns The editor
 */
export function RuleEditor(props: Readonly<RuleEditorProps>): React.JSX.Element {
    const { session, attributes, kind, onKind, form, onForm, onPick, status, onDone } = props;
    const kinds = new Set<SelectorTarget>(kind === undefined || kind === "both" ? ["node", "edge"] : [kind]);
    const kindRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const box = kindRef.current;
        (
            box?.querySelector<HTMLInputElement>("input:checked") ?? box?.querySelector<HTMLInputElement>("input")
        )?.focus();
    }, []);

    // Grouped as the vary picker groups them ("Data", then each run); a Both layer says whose.
    const grouped = new Map<string, { value: string; label: string }[]>();
    for (const a of attributes.filter((each) => kinds.has(each.kind))) {
        const heading = a.group ?? "Data";
        const group = kinds.size > 1 ? `${heading}, ${a.kind === "node" ? "nodes" : "edges"}` : heading;
        grouped.set(group, [...(grouped.get(group) ?? []), { value: `${a.kind}:${a.path}`, label: a.plainName }]);
    }
    const choices: ReadsGroup[] = [...grouped].map(([group, items]) => ({ group, items }));
    const numbers = attributes
        .filter((a) => kinds.has(a.kind) && isNumber(a))
        .map((a) => ({ value: `${a.kind}:${a.path}`, label: a.plainName }));

    return (
        <>
            <div ref={kindRef}>
                <SegmentedControl
                    size="xs"
                    fullWidth
                    aria-label="Paints"
                    value={kind ?? ""}
                    data={[...KINDS]}
                    onChange={(value) => {
                        const next = KINDS.find((k) => k.value === value)?.value;
                        if (next !== undefined) {
                            onKind(next);
                        }
                    }}
                />
            </div>
            <FindOffers session={session} kinds={kinds} onPick={onPick} />
            <Select
                size="xs"
                aria-label="Rule"
                data={form.mode === "other" ? [...MODES, { value: "other", label: "A rule set elsewhere" }] : MODES}
                value={form.mode}
                allowDeselect={false}
                onChange={(value) => {
                    const mode = MODES.find((m) => m.value === value)?.value;
                    if (mode !== undefined) {
                        onForm({ ...form, mode });
                    }
                }}
            />
            {form.mode === "where" && (
                <RuleRows
                    conditions={form.conditions}
                    onChange={(conditions) => {
                        onForm({ ...form, conditions });
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
                            onForm({ ...form, topN });
                        }}
                    />
                    <Select
                        size="xs"
                        aria-label="By"
                        data={numbers}
                        value={form.topReads === "" ? null : form.topReads}
                        searchable
                        openOnFocus={false}
                        onChange={(value) => {
                            onForm({ ...form, topReads: value ?? "" });
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
                        onForm({ ...form, named });
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
                        onForm({ ...form, set: value ?? "" });
                    }}
                />
            )}
            {form.mode === "expression" && (
                <TextInput
                    size="xs"
                    aria-label="Expression"
                    value={form.expression}
                    onChange={(event) => {
                        onForm({ ...form, expression: event.currentTarget.value });
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
                            onForm({ ...form, touching: value === "touching" });
                        }}
                    />
                </Group>
            )}
            <Group justify="space-between" wrap="nowrap">
                <Text size="xs" c="dimmed" role="status">
                    {status}
                </Text>
                {onDone !== undefined && (
                    <Button size="compact-xs" onClick={onDone}>
                        Done
                    </Button>
                )}
            </Group>
        </>
    );
}

/**
 * The Which elements section of a layer, whoever made it (tier3 design, section 3.1). At rest it
 * is the rule as a sentence and how many it paints; a click opens the editor in place. Every edit
 * that makes a whole rule is written to the layer at once, so the count and the canvas are the
 * element's; a layer still named by its rule is renamed by the new one. The kind changes in place
 * (the element's `writeRow` target). Done keeps it, Escape restores the rule the editor opened on.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.layer - the layer, any part of its row, or the row's id
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
    const kind: Kind = kinds.size > 1 ? "both" : (layers[0]?.target ?? "node");
    const attributes = fieldsOf(session);
    const selector = layers[0]?.selector ?? { match: "everything" };
    const prefer: SelectorTarget = kinds.has("node") ? "node" : "edge";

    const [open, setOpen] = useState(false);
    const [form, setForm] = useState<Form>(() => formOf(selector, attributes, prefer));
    // Each part's selector and name when the editor opened, which Escape writes back.
    const opened = useRef<ReadonlyMap<LayerId, Pick<Layer, "selector" | "name">>>(new Map());
    const sentence = useRef<HTMLButtonElement>(null);

    const stats = session.data.statistics();
    const painted = layers
        .map((l) => {
            const total = l.target === "node" ? stats.nodeCount : stats.edgeCount;
            return `${String(session.styles.counts(l.id).matched)} of ${countWords(total, l.target)}`;
        })
        .join(", ");
    const resting = formOf(selector, attributes, prefer);
    // At rest the sentence reads the layer as it is; open, the rule being edited.
    const words = sentenceOf(session, attributes, open ? form : resting, kind);

    const write = async (next: Selector): Promise<boolean> => {
        const name = layers[0]?.name;
        const named = name === DRAFT_NAME || name === sentenceOf(session, attributes, resting, kind);
        const renamed = sentenceOf(session, attributes, formOf(next, attributes, prefer), kind);
        try {
            await session.transaction("Which elements", async (tx) => {
                for (const l of layers) {
                    await tx.styles.update(l.id, { selector: next, ...(named ? { name: renamed } : {}) });
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
                        opened.current = new Map(layers.map((l) => [l.id, { selector: l.selector, name: l.name }]));
                        setForm(resting);
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

    return (
        <Stack
            gap={6}
            data-testid="which-elements"
            role="group"
            aria-label="Which elements"
            onKeyDown={(event) => {
                if (isPanelEscape(event.nativeEvent)) {
                    event.preventDefault();
                    event.stopPropagation();
                    const before = opened.current;
                    // Restores the rule (and the name it gave) the editor opened on, if an edit changed it.
                    const changed = layers.some((l) => {
                        const was = before.get(l.id);
                        return was !== undefined && JSON.stringify(was.selector) !== JSON.stringify(l.selector);
                    });
                    if (changed) {
                        void session
                            .transaction("Which elements", async (tx) => {
                                for (const [id, was] of before) {
                                    if (session.styles.get(id) !== undefined) {
                                        await tx.styles.update(id, was);
                                    }
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
            <RuleEditor
                session={session}
                attributes={attributes}
                kind={kind}
                onKind={(next) => {
                    if (next !== kind) {
                        void orNotice(
                            store,
                            "change what the layer paints",
                            session.styles.writeRow(parts?.id ?? layer, { target: next }),
                        );
                    }
                }}
                form={form}
                onForm={edit}
                onPick={(picked) => {
                    setForm(formOf(picked, attributes, prefer));
                    void write(picked).then((ok) => {
                        if (!ok) {
                            store.set({ notice: { message: "That rule could not be used for this layer" } });
                        }
                    });
                }}
                status={painted}
                onDone={close}
            />
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
    onPick: (selector: Selector, kind: "node" | "edge") => void;
}>): React.JSX.Element {
    const [text, setText] = useState("");
    const [active, setActive] = useState(0);
    const listId = useId();
    // Asked again each render, so a data change is never stale; find's index is kept per revision.
    const found = text.trim() === "" ? null : session.find(text);
    const attributes = found === null ? [] : fieldsOf(session);
    const column = (path: string): string =>
        path === "id" ? "node id" : (attributes.find((a) => a.path === path)?.plainName ?? path);
    const nameOf = (id: unknown): string | undefined =>
        found?.records.flatMap((hit) => (hit.kind === "node" && hit.id === id && hit.name !== "" ? [hit.name] : []))[0];
    const offers: Offer[] = [
        ...(found?.contains ?? [])
            .filter((row) => kinds.has(row.kind))
            .flatMap((row) => offersOf(row, column(row.path), `contains ${row.text}`, nameOf)),
        ...(found?.values ?? [])
            .filter((row) => kinds.has(row.kind))
            .flatMap((row) => offersOf(row, column(row.path), `is ${String(row.value)}`, nameOf)),
    ];
    const pick = (offer: Offer): void => {
        setText("");
        setActive(0);
        onPick(offer.selector, offer.kind);
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
            {found !== null && offers.length === 0 && (
                <Text size="xs" c="dimmed" role="status">
                    No element matches {text.trim()}
                </Text>
            )}
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
                            // The count (or the column) is its own line, so a long name never hides it.
                            name={offer.name}
                            path={offer.detail}
                            aria-label={`${offer.name}, ${offer.detail}`}
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
