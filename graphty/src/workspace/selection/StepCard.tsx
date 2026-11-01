/**
 * One selection step's card, open inline under its row (design/ui/selection-groups/spec.md,
 * sections 3 to 7): its verb, value, count and remove in the header, its "..." menu, and the test
 * its value's kind takes -- the approved condition card's body for a data column or a run's value,
 * the reference picker for Relative to, Run and Cancel for a run that waits. Everything it shows
 * is read from graphty-element; every edit goes to the host as a new rule.
 */

import { MenuShortcut, SegmentedControl } from "@graphty/compact-mantine";
import type {
    GraphSession,
    RuleTree,
    StepReading,
    StepReference,
    UnionLeaf,
    UnionStep,
} from "@graphty/graphty-element/session";
import { ActionIcon, Button, CloseButton, Group, Menu, NumberInput, Select, Text, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { formatKey, isTypingTarget } from "../keys/keys";
import type { Card, Side } from "../style/cards";
import { CardBody } from "../style/WhichPicker";
import { type Verb, VERBS } from "./model";
import { type Host, isRelative, referenceOf, type RelativeRule, ruleOfCard, stepCard, withReference } from "./values";
import { NOUNS, reasonWords, referenceWords, stepWords, VERB_WORDS } from "./words";

/** What a step card asks its editor to do. */
interface StepActions {
    readonly onStep: (patch: Partial<UnionStep>) => void;
    readonly onMove: (by: -1 | 1) => void;
    readonly onDuplicate: () => void;
    readonly onRemove: () => void;
}

/**
 * The verb menu: Figma's boolean order, glyph and word, Figma's name in each tooltip.
 * @param props - Component props
 * @param props.verb - the step's verb
 * @param props.onVerb - takes the new verb
 * @param props.tabbable - in the Tab order (the open card's), or reached by pointer only (a row's)
 * @returns The menu button
 */
export function VerbMenu({
    verb,
    onVerb,
    tabbable = true,
}: Readonly<{ verb: Verb; onVerb: (verb: Verb) => void; tabbable?: boolean }>): React.JSX.Element {
    const words = VERB_WORDS[verb];
    return (
        <Menu position="bottom-start" withinPortal>
            <Menu.Target>
                <Tooltip label={`${words.word} (${words.figma})`}>
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        aria-label={`Verb: ${words.word}`}
                        tabIndex={tabbable ? 0 : -1}
                        data-verb={verb}
                    >
                        <words.glyph size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Menu.Target>
            <Menu.Dropdown data-portal="">
                {VERBS.map((each) => {
                    const item = VERB_WORDS[each];
                    return (
                        <Menu.Item
                            key={each}
                            leftSection={<item.glyph size={14} aria-hidden />}
                            aria-label={`${item.word} (${item.figma})`}
                            onClick={() => {
                                onVerb(each);
                            }}
                        >
                            {item.word}
                        </Menu.Item>
                    );
                })}
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * The references a step can test against, as the picker lists them: Hovered or selected (style
 * only), Selected (N), So far, each set, then the nodes by name.
 * @param session - the element's session.
 * @param host - where the selection is edited.
 * @returns the options, grouped.
 */
function referenceOptions(
    session: GraphSession,
    host: Host,
): { group: string; items: { value: string; label: string }[] }[] {
    const live = [
        ...(host === "selector" ? [{ value: "hovered-or-selected", label: "Hovered or selected" }] : []),
        { value: "selection", label: `Selected (${String(session.selection.nodes.length)})` },
        { value: "so-far", label: "So far" },
    ];
    const sets = session.sets.list().map((each) => ({ value: `set:${each.id}`, label: each.name }));
    const nodes = session.data.nodes().map((each) => ({
        value: `node:${String(each.id)}`,
        label: session.data.name(each.id) ?? String(each.id),
    }));
    return [
        { group: "Live", items: live },
        { group: "Sets", items: sets },
        { group: "Nodes", items: nodes },
    ].filter((each) => each.items.length > 0);
}

/**
 * A reference as the picker's value.
 * @param reference - the reference.
 * @returns the value, or null while none is chosen.
 */
function referenceValue(reference: StepReference | undefined): string | null {
    if (reference === undefined) {
        return null;
    }
    if (typeof reference === "string") {
        return reference;
    }
    if ("set" in reference) {
        return `set:${reference.set}`;
    }
    if ("nodes" in reference && reference.nodes.length === 1) {
        return `node:${String(reference.nodes[0])}`;
    }
    return null;
}

/**
 * The picker's value as a reference.
 * @param value - the value.
 * @returns the reference.
 */
function referenceOfValue(value: string): StepReference {
    if (value.startsWith("set:")) {
        return { set: value.slice(4) };
    }
    if (value.startsWith("node:")) {
        return { nodes: [value.slice(5)] };
    }
    return value as StepReference;
}

/**
 * A Relative to step's test: the reference, searchable, and the form's own setting (hops, ends).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the step's rule
 * @param props.host - where the selection is edited
 * @param props.onRule - takes the rule as edited
 * @returns The controls
 */
function RelativeBody({
    session,
    rule,
    host,
    onRule,
}: Readonly<{
    session: GraphSession;
    rule: RelativeRule;
    host: Host;
    onRule: (rule: RuleTree) => void;
}>): React.JSX.Element {
    const reference = referenceOf(rule);
    const value = referenceValue(reference);
    const options = referenceOptions(session, host);
    // A reference no option names (several frozen nodes) is kept and shown by its words.
    const data =
        value === null && reference !== undefined
            ? [{ group: "Now", items: [{ value: "held", label: referenceWords(session, reference) }] }, ...options]
            : options;
    return (
        <Group gap={4} wrap="nowrap" align="flex-end">
            <Select
                size="xs"
                aria-label="Reference"
                placeholder="Choose a reference"
                searchable
                limit={50}
                data={data}
                value={value ?? (reference === undefined ? null : "held")}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
                style={{ flex: 1, minWidth: 0 }}
                onChange={(next) => {
                    if (next !== null && next !== "held") {
                        onRule(withReference(rule, referenceOfValue(next)));
                    }
                }}
            />
            {rule.kind === "hops" && rule.max !== undefined && rule.direction === undefined && (
                <Tooltip label="Hops">
                    <NumberInput
                        size="xs"
                        w={56}
                        min={0}
                        max={9}
                        aria-label="Hops"
                        value={rule.max}
                        onChange={(next) => {
                            if (typeof next === "number" && Number.isInteger(next) && next >= 0) {
                                onRule({ ...rule, max: next });
                            }
                        }}
                    />
                </Tooltip>
            )}
            {rule.kind === "touching" && (
                <SegmentedControl
                    size="xs"
                    label="Ends"
                    data={[
                        { value: "either", label: "Either" },
                        { value: "both", label: "Both" },
                        { value: "one", label: "One" },
                    ]}
                    value={rule.ends}
                    onChange={(next) => {
                        onRule({ ...rule, ends: next as typeof rule.ends });
                    }}
                />
            )}
        </Group>
    );
}

/**
 * A measure step waiting on its run: the short word, and Run (the reader's consent, held by the
 * element until the step changes) or Cancel while it computes.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.step - the step
 * @param props.reading - its reading
 * @returns The line
 */
function RunLine({
    session,
    rule,
    step,
    reading,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    step: UnionStep;
    reading: StepReading | undefined;
}>): React.JSX.Element {
    const code = reading?.reason?.code;
    const words = reasonWords(reading?.reason ?? null);
    const id = step.id ?? "";
    return (
        <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                {code === undefined ? "Computing" : words.long}
            </Text>
            {(code === "run-needed" || code === "stale" || code === "run-failed") && (
                <Button
                    size="compact-xs"
                    onClick={() => {
                        session.scope.allowRun(rule, id);
                    }}
                >
                    {code === "run-failed" ? "Run again" : words.short}
                </Button>
            )}
            {code === "computing" && (
                <Button
                    size="compact-xs"
                    variant="default"
                    onClick={() => {
                        session.scope.cancelRun(rule, id);
                    }}
                >
                    Cancel
                </Button>
            )}
        </Group>
    );
}

/** The leaf kinds whose test can include the elements with no value. */
const MISSING_KINDS = new Set(["range", "categories", "threshold"]);

/**
 * Whether a step's test can take "Include not measured", and whether it does.
 * @param rule - the step's rule.
 * @returns undefined when it cannot, else whether it includes them.
 */
function missingOf(rule: RuleTree): boolean | undefined {
    const test = rule.kind === "measure" ? rule.test : rule;
    if (test === undefined || !MISSING_KINDS.has(test.kind)) {
        return undefined;
    }
    return (test as { missing?: string }).missing === "include";
}

/**
 * The rule with its test's not-measured choice set.
 * @param rule - the step's rule.
 * @param include - whether the elements with no value pass.
 * @returns the rule.
 */
function withMissing(rule: RuleTree, include: boolean): RuleTree {
    const missing = include ? ({ missing: "include" } as const) : {};
    const strip = <T extends object>(test: T): T => {
        const { missing: _old, ...rest } = test as T & { missing?: unknown };
        return { ...rest, ...missing } as T;
    };
    if (rule.kind === "measure") {
        return rule.test === undefined ? rule : { ...rule, test: strip(rule.test) };
    }
    return strip(rule);
}

/** Props of a step card. */
interface StepCardProps extends StepActions {
    readonly session: GraphSession;
    readonly rule: UnionLeaf;
    readonly step: UnionStep;
    readonly reading: StepReading | undefined;
    readonly host: Host;
    readonly of: number;
    /** Keys the card's "..." items take, as the editor's rows take them. */
    readonly first: boolean;
    readonly last: boolean;
}

/**
 * The open step card.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.step - the step
 * @param props.reading - its reading
 * @param props.host - where the selection is edited
 * @param props.of - the base's size
 * @param props.first - it is its group's first step
 * @param props.last - it is its group's last step
 * @param props.onStep - takes a change to the step
 * @param props.onMove - moves it up or down its group
 * @param props.onDuplicate - copies it under itself
 * @param props.onRemove - removes it
 * @returns The card
 */
export function StepCard({
    session,
    rule,
    step,
    reading,
    host,
    of,
    first,
    last,
    onStep,
    onMove,
    onDuplicate,
    onRemove,
}: StepCardProps): React.JSX.Element {
    const side: Side = rule.side === "nodes" ? "node" : "edge";
    const { value } = stepWords(session, step, side, reading);
    // Typing in a box is held and written when committed (Enter, leaving the box): one undo step.
    const [draft, setDraft] = useState<Card | null>(null);
    const read = stepCard(session, step, reading, side);
    const card = draft ?? read.card;
    const commit = (next: Card | null = draft): void => {
        setDraft(null);
        if (next !== null) {
            onStep({ rule: ruleOfCard(step, next) });
        }
    };
    const onCard = (next: Card): void => {
        // A text card hands over every keystroke; a number or date card hands over only what its
        // boxes committed, so that is written at once.
        const active = document.activeElement;
        if (
            next.type === "text" &&
            isTypingTarget(active) &&
            !(active instanceof HTMLInputElement && active.readOnly)
        ) {
            setDraft(next);
            return;
        }
        commit(next);
    };
    const count = reading?.count;
    const label = [
        `${VERB_WORDS[step.op].word}, ${value}`,
        count === undefined ? "" : `${String(count)} of ${String(of)} ${NOUNS[side].many} so far`,
    ]
        .filter((each) => each !== "")
        .join(", ");
    const missing = missingOf(step.rule);
    const canSoFar =
        step.op !== "add" &&
        step.rule.kind === "measure" &&
        session.catalog.algorithms().find((each) => each.key === (step.rule as { algorithm: string }).algorithm)
            ?.scopeInput === "subgraph";
    const pending = reading?.state === "pending" || (step.rule.kind === "measure" && card === null);
    return (
        <div // NOSONAR(S6819): an ARIA group naming one step's controls; a fieldset draws its own border and legend
            role="group"
            aria-label={label}
            className="ws-card sel-card"
            data-step-card={step.id}
            onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing && draft !== null) {
                    commit();
                }
            }}
            onBlur={(event) => {
                const to = event.relatedTarget;
                if (
                    to instanceof Element &&
                    (event.currentTarget.contains(to) || to.closest("[data-portal]") !== null)
                ) {
                    return;
                }
                if (draft !== null) {
                    commit();
                }
            }}
        >
            <Group gap={4} wrap="nowrap" className="sel-card-head">
                <VerbMenu
                    verb={step.op}
                    onVerb={(op) => {
                        onStep({ op });
                    }}
                />
                <Text size="xs" fw={600} truncate style={{ flex: 1, minWidth: 0 }}>
                    {value}
                </Text>
                {count !== undefined && (
                    <Tooltip label={`${String(count)} of ${String(of)} ${NOUNS[side].many} so far`}>
                        <Text size="xs" c="dimmed">
                            {count}
                        </Text>
                    </Tooltip>
                )}
                <Menu position="bottom-end" withinPortal>
                    <Menu.Target>
                        <Tooltip label="More">
                            <ActionIcon variant="subtle" size="sm" aria-label={`More for ${value}`}>
                                <GLYPHS.more size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    </Menu.Target>
                    <Menu.Dropdown data-portal="">
                        {canSoFar && (
                            <Menu.Item
                                onClick={() => {
                                    onStep({ computedOn: step.computedOn === "so-far" ? "base" : "so-far" });
                                }}
                            >
                                {step.computedOn === "so-far"
                                    ? `Computed on: ${host === "filter" ? "Full graph" : "Filtered graph"}`
                                    : "Computed on: So far"}
                            </Menu.Item>
                        )}
                        {missing !== undefined && (
                            <Menu.Item
                                onClick={() => {
                                    onStep({ rule: withMissing(step.rule, !missing) });
                                }}
                            >
                                {missing ? "Leave out not measured" : "Include not measured"}
                            </Menu.Item>
                        )}
                        <Menu.Item
                            disabled={first}
                            rightSection={<MenuShortcut>{formatKey("Mod+[")}</MenuShortcut>}
                            onClick={() => {
                                onMove(-1);
                            }}
                        >
                            Move up
                        </Menu.Item>
                        <Menu.Item
                            disabled={last}
                            rightSection={<MenuShortcut>{formatKey("Mod+]")}</MenuShortcut>}
                            onClick={() => {
                                onMove(1);
                            }}
                        >
                            Move down
                        </Menu.Item>
                        <Menu.Item
                            rightSection={<MenuShortcut>{formatKey("Mod+D")}</MenuShortcut>}
                            onClick={onDuplicate}
                        >
                            Duplicate
                        </Menu.Item>
                        <Menu.Item rightSection={<MenuShortcut>Delete</MenuShortcut>} onClick={onRemove}>
                            Delete
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
                <Tooltip label={`Remove ${value}`}>
                    <CloseButton size="xs" aria-label={`Remove ${value}`} onClick={onRemove} />
                </Tooltip>
            </Group>
            {isRelative(step.rule) ? (
                <RelativeBody
                    session={session}
                    rule={step.rule}
                    host={host}
                    onRule={(next) => {
                        onStep({ rule: next });
                    }}
                />
            ) : (
                <>
                    {pending && <RunLine session={session} rule={rule} step={step} reading={reading} />}
                    {card !== null && (
                        <CardBody
                            session={session}
                            card={card}
                            side={"field" in card ? card.field.on : side}
                            onChange={onCard}
                        />
                    )}
                </>
            )}
        </div>
    );
}
