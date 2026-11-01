/**
 * The property pane of a selected step (design/ui/selection-groups/spec.md, section 3.2): the verb
 * segment, the running count and the "..." menu; the value field, which opens the value picker; the
 * test its value's kind takes (the approved card body, the reference picker, or Run); and Advanced,
 * collapsed, holding Computed on, Edge ends and Not measured. Everything it shows is read from
 * graphty-element; every edit goes to the host as a new rule.
 */

import { SegmentedControl, TargetTooltip } from "@graphty/compact-mantine";
import type {
    GraphSession,
    RuleTree,
    StepReading,
    UnionBranch,
    UnionLeaf,
    UnionStep,
} from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Button,
    Checkbox,
    Collapse,
    Group,
    Menu,
    NumberInput,
    Stack,
    Text,
    Tooltip,
    UnstyledButton,
} from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { isTypingTarget } from "../keys/keys";
import type { Card, Side } from "../style/cards";
import { AddCondition, CardBody } from "../style/WhichPicker";
import { type Verb, VERBS } from "./model";
import { ReferencePicker } from "./ReferencePicker";
import { SelectionMenuItems } from "./SelectionMenu";
import {
    type Host,
    isRelative,
    pickerFields,
    type PickSection,
    pickSections,
    referenceOf,
    type RelativeRule,
    ruleOfCard,
    ruleOfField,
    sideOf,
    stepCard,
    usedPaths,
    withReference,
} from "./values";
import { NOUNS, reasonWords, rowWords, VERB_WORDS } from "./words";

/** What a step pane asks its editor to do. */
export interface StepActions {
    readonly onStep: (patch: Partial<UnionStep>) => void;
    readonly onToggle: () => void;
    readonly onMove: (by: -1 | 1) => void;
    readonly onDuplicate: () => void;
    readonly onRemove: () => void;
}

/** The verbs in the segment's order: Figma's Union, Intersect, Subtract. */
const SEGMENT_VERBS: readonly Verb[] = ["add", "keep", "except"];

/**
 * The verb segment: Add, Keep, Except, Figma's name in each tooltip.
 * @param props - Component props
 * @param props.verb - the step's verb
 * @param props.onVerb - takes the new verb
 * @returns The segment
 */
function VerbSegment({ verb, onVerb }: Readonly<{ verb: Verb; onVerb: (verb: Verb) => void }>): React.JSX.Element {
    return (
        <SegmentedControl
            label="Verb"
            data={SEGMENT_VERBS.map((each) => ({
                value: each,
                label: (
                    <Tooltip label={VERB_WORDS[each].figma}>
                        <span>{VERB_WORDS[each].word}</span>
                    </Tooltip>
                ),
            }))}
            value={verb}
            onChange={(next) => {
                if (VERBS.includes(next as Verb)) {
                    onVerb(next as Verb);
                }
            }}
        />
    );
}

/**
 * A Relative to step's test: the reference, and the form's own setting (hops, ends).
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the step's rule
 * @param props.host - where the selection is edited
 * @param props.firstStep - the step is its group's first
 * @param props.onRule - takes the rule as edited
 * @returns The controls
 */
function RelativeBody({
    session,
    rule,
    host,
    firstStep,
    onRule,
}: Readonly<{
    session: GraphSession;
    rule: RelativeRule;
    host: Host;
    firstStep: boolean;
    onRule: (rule: RuleTree) => void;
}>): React.JSX.Element {
    return (
        <Group gap={4} wrap="nowrap" align="flex-end">
            <ReferencePicker
                session={session}
                host={host}
                reference={referenceOf(rule)}
                firstStep={firstStep}
                onReference={(reference) => {
                    onRule(withReference(rule, reference));
                }}
            />
            {rule.kind === "hops" && rule.max !== undefined && rule.max > 0 && rule.direction === undefined && (
                <Tooltip label="Hops">
                    <NumberInput
                        size="xs"
                        w={56}
                        min={1}
                        max={9}
                        aria-label="Hops"
                        value={rule.max}
                        onChange={(next) => {
                            if (typeof next === "number" && Number.isInteger(next) && next >= 1) {
                                onRule({ ...rule, max: next });
                            }
                        }}
                    />
                </Tooltip>
            )}
        </Group>
    );
}

/**
 * A measure step waiting on its run: Run (the reader's consent, held by the element until the
 * step changes) or Cancel while it computes, the short word in the button.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.step - the step
 * @param props.reading - its reading
 * @returns The button, or nothing
 */
function RunButton({
    session,
    rule,
    step,
    reading,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    step: UnionStep;
    reading: StepReading | undefined;
}>): React.JSX.Element | null {
    const code = reading?.reason?.code;
    const words = reasonWords(reading?.reason ?? null);
    const id = step.id ?? "";
    if (code === "computing") {
        return (
            <Tooltip label={words.long}>
                <Button
                    size="compact-xs"
                    variant="default"
                    onClick={() => {
                        session.scope.cancelRun(rule, id);
                    }}
                >
                    Cancel
                </Button>
            </Tooltip>
        );
    }
    if (code !== "run-needed" && code !== "stale" && code !== "run-failed") {
        return null;
    }
    return (
        <Tooltip label={words.long}>
            <Button
                size="compact-xs"
                style={{ alignSelf: "flex-start" }}
                onClick={() => {
                    session.scope.allowRun(rule, id);
                }}
            >
                {code === "run-failed" ? "Run again" : words.short}
            </Button>
        </Tooltip>
    );
}

/** The leaf kinds whose test can include the elements with no value. */
const MISSING_KINDS = new Set(["range", "categories", "threshold"]);

/**
 * Whether a step's test can take "Not measured", and whether it includes them.
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

/**
 * The value field: the step's value, opening the value picker; a pick replaces the step's value
 * and keeps its verb.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.branch - the step's group
 * @param props.value - the value's name
 * @param props.hostPicks - the host's own picker entries
 * @param props.onRule - takes the new value's rule
 * @returns The field
 */
function ValueField({
    session,
    rule,
    branch,
    value,
    hostPicks,
    onRule,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    branch: UnionBranch;
    value: string;
    hostPicks: readonly PickSection[];
    onRule: (stepRule: RuleTree) => void;
}>): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const choose = (stepRule: RuleTree): void => {
        setOpen(false);
        onRule(stepRule);
    };
    return (
        <AddCondition
            fields={pickerFields(session, sideOf(rule), rule.within)}
            used={usedPaths(rule, branch)}
            placeholder="Find attributes, results"
            sections={[...hostPicks, ...pickSections(session, rule, choose)]}
            opened={open}
            onAdd={(field) => {
                choose(ruleOfField(session, field));
            }}
            onOpened={(next) => {
                if (!next) {
                    setOpen(false);
                }
            }}
            anchor={
                <Button
                    size="compact-xs"
                    variant="default"
                    fullWidth
                    justify="space-between"
                    aria-label={`Value: ${value}`}
                    aria-haspopup="listbox"
                    rightSection={<GLYPHS.expand size={12} aria-hidden />}
                    onClick={() => {
                        setOpen(true);
                    }}
                >
                    {value}
                </Button>
            }
        />
    );
}

/** Props of a step pane. */
interface StepPaneProps extends StepActions {
    readonly session: GraphSession;
    readonly rule: UnionLeaf;
    readonly branch: UnionBranch;
    readonly step: UnionStep;
    readonly reading: StepReading | undefined;
    readonly host: Host;
    readonly of: number;
    readonly first: boolean;
    readonly last: boolean;
    readonly hostPicks: readonly PickSection[];
}

/**
 * The pane of the selected step.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.rule - the selection
 * @param props.branch - the step's group
 * @param props.step - the step
 * @param props.reading - its reading
 * @param props.host - where the selection is edited
 * @param props.of - the base's size
 * @param props.first - it is its group's first step
 * @param props.last - it is its group's last step
 * @param props.hostPicks - the host's own value picker entries
 * @param props.onStep - takes a change to the step
 * @param props.onToggle - switches the step on or off
 * @param props.onMove - moves it up or down its group
 * @param props.onDuplicate - copies it under itself
 * @param props.onRemove - removes it
 * @returns The pane
 */
export function StepPane({
    session,
    rule,
    branch,
    step,
    reading,
    host,
    of,
    first,
    last,
    hostPicks,
    onStep,
    onToggle,
    onMove,
    onDuplicate,
    onRemove,
}: StepPaneProps): React.JSX.Element {
    const side: Side = sideOf(rule);
    const { value } = rowWords(session, step, side, reading);
    // Typing in a box is held and written when committed (Enter, leaving the box): one undo step.
    const [draft, setDraft] = useState<Card | null>(null);
    const [advanced, setAdvanced] = useState(false);
    const read = stepCard(session, step, reading, side, rule.within);
    const card = draft ?? read.card;
    const commit = (next: Card | null = draft): void => {
        setDraft(null);
        if (next !== null) {
            onStep({ rule: ruleOfCard(step, next) });
        }
    };
    const onCard = (next: Card): void => {
        // A text card hands over every keystroke; any other card hands over what it committed.
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
    // A step that waits on a run shows no count: the number would be what comes into it.
    const count = reading === undefined || reading.waiting ? undefined : reading.count;
    const missing = missingOf(step.rule);
    const canSoFar =
        step.op !== "add" &&
        step.rule.kind === "measure" &&
        session.catalog.algorithms().find((each) => each.key === (step.rule as { algorithm: string }).algorithm)
            ?.scopeInput === "subgraph";
    const pending = reading?.state === "pending";
    // An edge step reading a node value says whether both ends must pass, or either.
    const readsEnds = side === "edge" && card !== null && "field" in card && card.field.on === "node";
    const changed = [
        ...(step.computedOn === "so-far" ? ["So far"] : []),
        ...(step.ends === "either" ? ["Either end"] : []),
        ...(missing === true ? ["Not measured"] : []),
    ];
    const hasAdvanced = canSoFar || readsEnds || missing !== undefined || step.rule.kind === "touching";
    const base = host === "filter" ? "Full graph" : "Filtered graph";
    return (
        <div // NOSONAR(S6819): an ARIA group naming one step's controls; a fieldset draws its own border and legend
            role="group"
            aria-label={`${VERB_WORDS[step.op].word}, ${value}`}
            className="sel-pane"
            data-step-pane={step.id}
            data-pending={pending ? "" : undefined}
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
            <Stack gap={6}>
                <Group gap={4} wrap="nowrap">
                    <VerbSegment
                        verb={step.op}
                        onVerb={(op) => {
                            onStep({ op });
                        }}
                    />
                    {count !== undefined && (
                        <Tooltip label={`${formatNumber(count)} of ${formatNumber(of)} ${NOUNS[side].many} so far`}>
                            <Text size="xs" c="dimmed" className="sel-count" ml="auto">
                                {formatNumber(count)}
                            </Text>
                        </Tooltip>
                    )}
                    <StepMenu
                        name={value}
                        on={step.on !== false}
                        first={first}
                        last={last}
                        onToggle={onToggle}
                        onMove={onMove}
                        onDuplicate={onDuplicate}
                        onRemove={onRemove}
                    />
                </Group>
                <ValueField
                    session={session}
                    rule={rule}
                    branch={branch}
                    value={value}
                    hostPicks={hostPicks}
                    onRule={(stepRule) => {
                        setDraft(null);
                        onStep({ rule: stepRule });
                    }}
                />
                {isRelative(step.rule) ? (
                    <RelativeBody
                        session={session}
                        rule={step.rule}
                        host={host}
                        firstStep={first}
                        onRule={(next) => {
                            onStep({ rule: next });
                        }}
                    />
                ) : (
                    <>
                        {pending && <RunButton session={session} rule={rule} step={step} reading={reading} />}
                        {card !== null && (
                            <CardBody
                                session={session}
                                card={card}
                                side={"field" in card ? card.field.on : side}
                                onChange={onCard}
                                variant="step"
                            />
                        )}
                    </>
                )}
                {hasAdvanced && (
                    <>
                        <UnstyledButton
                            className="sel-advanced"
                            aria-expanded={advanced}
                            onClick={() => {
                                setAdvanced(!advanced);
                            }}
                        >
                            <GLYPHS.expand
                                size={12}
                                aria-hidden
                                style={{ transform: advanced ? undefined : "rotate(-90deg)" }}
                            />
                            <Text size="xs" span>
                                Advanced
                            </Text>
                            {changed.length > 0 && (
                                <Text size="xs" c="dimmed" span ml="auto">
                                    {changed.join(", ")}
                                </Text>
                            )}
                        </UnstyledButton>
                        <Collapse in={advanced}>
                            <Stack gap={6}>
                                {canSoFar && (
                                    <SegmentedControl
                                        label="Computed on"
                                        data={[
                                            { value: "base", label: base },
                                            { value: "so-far", label: "So far" },
                                        ]}
                                        value={step.computedOn === "so-far" ? "so-far" : "base"}
                                        onChange={(next) => {
                                            onStep({ computedOn: next === "so-far" ? "so-far" : "base" });
                                        }}
                                    />
                                )}
                                {readsEnds && (
                                    <SegmentedControl
                                        label="Edge ends"
                                        data={[
                                            { value: "both", label: "Both" },
                                            { value: "either", label: "Either" },
                                        ]}
                                        value={step.ends ?? "both"}
                                        onChange={(next) => {
                                            onStep({ ends: next === "either" ? "either" : "both" });
                                        }}
                                    />
                                )}
                                {step.rule.kind === "touching" && (
                                    <SegmentedControl
                                        label="Edge ends"
                                        data={[
                                            { value: "either", label: "Either" },
                                            { value: "both", label: "Both" },
                                            { value: "one", label: "One" },
                                        ]}
                                        value={step.rule.ends}
                                        onChange={(next) => {
                                            onStep({
                                                rule: { ...step.rule, ends: next } as RuleTree,
                                            });
                                        }}
                                    />
                                )}
                                {missing !== undefined && (
                                    <Checkbox
                                        size="xs"
                                        label="Include not measured"
                                        checked={missing}
                                        onChange={(event) => {
                                            onStep({ rule: withMissing(step.rule, event.currentTarget.checked) });
                                        }}
                                    />
                                )}
                            </Stack>
                        </Collapse>
                    </>
                )}
            </Stack>
        </div>
    );
}

/**
 * A step's "..." menu: Turn off, Duplicate, Move up, Move down | Delete, each with its key.
 * @param props - Component props
 * @param props.name - the step's value
 * @param props.on - whether it is on
 * @param props.first - it is its group's first step
 * @param props.last - it is its group's last step
 * @param props.onToggle - switches it on or off
 * @param props.onMove - moves it up or down
 * @param props.onDuplicate - copies it
 * @param props.onRemove - removes it
 * @returns The menu
 */
function StepMenu({
    name,
    on,
    first,
    last,
    onToggle,
    onMove,
    onDuplicate,
    onRemove,
}: Readonly<{
    name: string;
    on: boolean;
    first: boolean;
    last: boolean;
    onToggle: () => void;
    onMove: (by: -1 | 1) => void;
    onDuplicate: () => void;
    onRemove: () => void;
}>): React.JSX.Element {
    return (
        <Menu position="bottom-end" withinPortal>
            <Menu.Target>
                <TargetTooltip label="More">
                    <ActionIcon variant="subtle" size="sm" aria-label={`More for ${name}`}>
                        <GLYPHS.more size={14} aria-hidden />
                    </ActionIcon>
                </TargetTooltip>
            </Menu.Target>
            <Menu.Dropdown data-portal="">
                <SelectionMenuItems
                    items={[
                        {
                            id: "hide",
                            label: on ? "Turn off" : "Turn on",
                            icon: on ? "hide" : "show",
                            group: "edit",
                            key: "Shift+Mod+H",
                            onRun: onToggle,
                        },
                        {
                            id: "duplicate",
                            label: "Duplicate",
                            icon: "duplicate",
                            group: "edit",
                            key: "Mod+D",
                            onRun: onDuplicate,
                        },
                        {
                            id: "up",
                            label: "Move up",
                            icon: "moveUp",
                            group: "edit",
                            key: "Mod+]",
                            reason: first ? "Already the first step" : null,
                            onRun: () => {
                                onMove(-1);
                            },
                        },
                        {
                            id: "down",
                            label: "Move down",
                            icon: "moveDown",
                            group: "edit",
                            key: "Mod+[",
                            reason: last ? "Already the last step" : null,
                            onRun: () => {
                                onMove(1);
                            },
                        },
                        {
                            id: "delete",
                            label: "Delete",
                            icon: "delete",
                            group: "remove",
                            key: "Delete",
                            onRun: onRemove,
                        },
                    ]}
                />
            </Menu.Dropdown>
        </Menu>
    );
}
