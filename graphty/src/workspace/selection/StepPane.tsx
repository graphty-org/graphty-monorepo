/**
 * The property pane of a selected step (design/ui/selection-groups/spec.md, section 3.2): the verb
 * segment, the running count and the "..." menu; the value field, which opens the value picker; the
 * test its value's kind takes (the approved card body, the reference picker, or Run); and Advanced,
 * collapsed, holding Computed on, Edge ends and Not measured. Everything it shows is read from
 * graphty-element; every edit goes to the host as a new rule.
 */

import { FieldCaret, SegmentedControl, TargetTooltip } from "@graphty/compact-mantine";
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
    InputBase,
    Menu,
    NumberInput,
    Stack,
    Switch,
    Text,
    Tooltip,
    UnstyledButton,
} from "@mantine/core";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { optionWords } from "../analyze/words";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { isTypingTarget, printable } from "../keys/keys";
import { OptionsForm } from "../options/OptionsForm";
import { type Card, cardFields, cardOf, leafOf, type Side } from "../style/cards";
import { AddCondition, CardBody } from "../style/WhichPicker";
import { type Verb, verbsAt } from "./model";
import { ReferencePicker } from "./ReferencePicker";
import { SelectionMenuItems } from "./SelectionMenu";
import {
    type Host,
    isRelative,
    modeOf,
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
    WHILE,
    withReference,
} from "./values";
import { linksSaid, linksTested, NOUNS, reasonWords, rowWords, VERB_WORDS } from "./words";

/** What a step pane asks its editor to do. */
export interface StepActions {
    readonly onStep: (patch: Partial<UnionStep>) => void;
    readonly onToggle: () => void;
    readonly onMove: (by: -1 | 1) => void;
    readonly onDuplicate: () => void;
    readonly onRemove: () => void;
}

/**
 * A pane's row whose control is named by a caption over it (Start with, Computed on, Edges), the
 * caption Figma's labeled rows draw, the control at the column's full width (ws-polish 2).
 * @param props - Component props
 * @param props.children - the control, with its `label`
 * @returns The row
 */
export function CaptionedRow({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
    const label = React.isValidElement<{ label?: string }>(children) ? children.props.label : undefined;
    return (
        <Stack gap={4}>
            {/* The control keeps the word as its own accessible name: the caption is drawn only. */}
            <span aria-hidden="true" className="cm-caption">
                {label}
            </span>
            {children}
        </Stack>
    );
}

/**
 * A step's verb (the owner, ws-polish 2): a narrowing step says no verb, and its one choice is the
 * compact Except switch ("Except Degree min 10"); an Add step says Add. Add and narrowing trade
 * places in the step's "..." menu, since Or... already widens.
 * @param props - Component props
 * @param props.verb - the step's verb
 * @param props.verbs - the verbs that can change the group here
 * @param props.onVerb - takes the new verb
 * @returns The switch, the word Add, or nothing
 */
function ExceptSwitch({
    verb,
    verbs,
    onVerb,
}: Readonly<{ verb: Verb; verbs: readonly Verb[]; onVerb: (verb: Verb) => void }>): React.JSX.Element | null {
    if (verb === "add") {
        // A group's only verb is no choice: nothing is said.
        return verbs.length < 2 ? null : <Text size="sm">{VERB_WORDS.add.word}</Text>;
    }
    if (verb !== "except" && !verbs.includes("except")) {
        return null;
    }
    return (
        <Tooltip label={`${VERB_WORDS.except.word} (${VERB_WORDS.except.figma})`}>
            <Switch
                size="xs"
                label={VERB_WORDS.except.word}
                checked={verb === "except"}
                onChange={(event) => {
                    onVerb(event.currentTarget.checked ? "except" : "keep");
                }}
            />
        </Tooltip>
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
                        w={72}
                        min={1}
                        max={9}
                        aria-label="Hops"
                        rightSection={
                            <Text size="sm" c="dimmed" span aria-hidden>
                                hops
                            </Text>
                        }
                        rightSectionWidth={32}
                        hideControls
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
                    data-cancel=""
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
    // A letter typed on the field opens the picker with it in the search (ws-polish 3).
    const [seed, setSeed] = useState("");
    const choose = (stepRule: RuleTree): void => {
        setOpen(false);
        onRule(stepRule);
    };
    return (
        <AddCondition
            // The lists are read only while the picker is open: on a large graph they are not free.
            fields={open ? pickerFields(session, sideOf(rule), rule.within) : []}
            used={usedPaths(rule, branch)}
            placeholder="Find attributes, results"
            sections={open ? [...hostPicks, ...pickSections(session, rule, choose)] : []}
            opened={open}
            seed={seed}
            onAdd={(field) => {
                choose(ruleOfField(session, field, rule.within));
            }}
            onOpened={(next) => {
                if (!next) {
                    setOpen(false);
                    setSeed("");
                }
            }}
            anchor={
                // The compact Select's trigger, at its default size, with its own chevron.
                <InputBase
                    component="button"
                    size="sm"
                    variant="outlined"
                    rightSection={<FieldCaret />}
                    rightSectionPointerEvents="none"
                    type="button"
                    pointer
                    aria-label={`Value: ${value}`}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    onClick={() => {
                        setOpen(true);
                    }}
                    onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
                        if (printable(event)) {
                            event.preventDefault();
                            setSeed(event.key);
                            setOpen(true);
                        }
                    }}
                >
                    <span className="sel-field-text">{value}</span>
                </InputBase>
            }
        />
    );
}

/** The structure values whose count reads the links (Degree, In and Out), by path. */
const LINK_PATHS = new Set(["graphty.degree", "graphty.inDegree", "graphty.outDegree"]);

/**
 * Whether a step's value is computed from the links, so Links in its Advanced can scope it
 * (spec 3.5): an algorithm's field, Degree, a hops or touching condition.
 * @param rule - the step's rule.
 * @returns true when it reads the links.
 */
function readsLinks(rule: RuleTree): boolean {
    if (rule.kind === "measure" || rule.kind === "hops" || rule.kind === "touching") {
        return true;
    }
    const read = rule as { attribute?: unknown; path?: unknown };
    const path = read.attribute ?? read.path;
    return typeof path === "string" && LINK_PATHS.has(path);
}

/**
 * Links, in a step's Advanced (spec 3.5): All links, or Links where one edge condition holds --
 * an edge value and its test, the controls of section 5 -- so the step reads only the links that
 * pass ("ignore links with weight under 2") without the graph-wide Data filter.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.step - the step
 * @param props.within - the selection's base
 * @param props.onLinks - takes the edge condition, or undefined for every link
 * @returns The rows
 */
function LinksBody({
    session,
    step,
    within,
    onLinks,
}: Readonly<{
    session: GraphSession;
    step: UnionStep;
    within: UnionLeaf["within"];
    onLinks: (links: RuleTree | undefined) => void;
}>): React.JSX.Element {
    const [where, setWhere] = useState(step.links !== undefined);
    const [picking, setPicking] = useState(false);
    // Choosing "Links where ..." hands focus to the edge value's field, where Enter opens its list.
    const field = useRef<HTMLButtonElement>(null);
    const [toField, setToField] = useState(false);
    useEffect(() => {
        if (toField) {
            setToField(false);
            field.current?.focus();
        }
    }, [toField]);
    // A picked edge value hands focus to its test's first box (Min), where the reader types next.
    const testBox = useRef<HTMLDivElement>(null);
    const toTest = useRef(false);
    useEffect(() => {
        if (!toTest.current) {
            return;
        }
        const box = testBox.current?.querySelector<HTMLElement>("input:not([type=hidden]):not([readonly])");
        if (box !== null && box !== undefined) {
            toTest.current = false;
            box.focus();
        }
    });
    const fields = useMemo(
        () =>
            cardFields(session, "edge")
                .filter((field) => field.group === "Data")
                .map((field) => ({ ...field, within })),
        [session, within],
    );
    const card = step.links === undefined ? null : cardOf(session, step.links, fields, 0);
    const shown = card === null || card.type === "fixed" ? null : card;
    const name = shown !== null && "field" in shown ? shown.field.name : "";
    return (
        <>
            <CaptionedRow>
                <SegmentedControl
                    label="Edges"
                    fullWidth
                    data={[
                        { value: "all", label: "All edges" },
                        { value: "where", label: "Edges where ..." },
                    ]}
                    value={where ? "where" : "all"}
                    onChange={(next) => {
                        setWhere(next === "where");
                        if (next === "all") {
                            onLinks(undefined);
                        } else if (step.links === undefined) {
                            setToField(true);
                        }
                    }}
                />
            </CaptionedRow>
            {where && (
                <AddCondition
                    fields={picking ? fields : []}
                    used={[]}
                    placeholder="Find edge attributes"
                    opened={picking}
                    onAdd={(field) => {
                        setPicking(false);
                        toTest.current = true;
                        // Untouched: every link with a value passes until a test is set.
                        onLinks(ruleOfField(session, field));
                    }}
                    onOpened={(next) => {
                        if (!next) {
                            setPicking(false);
                        }
                    }}
                    anchor={
                        <InputBase
                            ref={field}
                            component="button"
                            size="sm"
                            variant="outlined"
                            rightSection={<FieldCaret />}
                            rightSectionPointerEvents="none"
                            type="button"
                            pointer
                            aria-label={`Edge value: ${name === "" ? "none" : name}`}
                            aria-haspopup="dialog"
                            aria-expanded={picking}
                            onClick={() => {
                                setPicking(true);
                            }}
                        >
                            <span className="sel-field-text">{name === "" ? "Edge value..." : name}</span>
                        </InputBase>
                    }
                />
            )}
            {where && shown !== null && (
                <div ref={testBox}>
                    <CardBody
                        session={session}
                        card={shown}
                        side="edge"
                        onChange={(next) => {
                            onLinks(leafOf(next) ?? undefined);
                        }}
                        variant="step"
                    />
                </div>
            )}
        </>
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
    /** The selection's result count: "N so far" is said only where it differs. */
    readonly total?: number;
    readonly hostPicks: readonly PickSection[];
    /** The Done button, drawn last in the first row. */
    readonly done?: React.ReactNode;
    /** The add actions, drawn first in the first row. */
    readonly adds?: React.ReactNode;
    /** Whether it draws its first row; false under a title pane that already has one. */
    readonly head?: boolean;
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
 * @param props.total - the selection's result count
 * @param props.hostPicks - the host's own value picker entries
 * @param props.done - the Done button
 * @param props.adds - the add actions
 * @param props.head - whether it draws its first row
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
    total,
    hostPicks,
    done,
    adds,
    head = true,
    onStep,
    onToggle,
    onMove,
    onDuplicate,
    onRemove,
}: StepPaneProps): React.JSX.Element {
    // After a value is picked, focus goes to its test's first control, never back onto the segment.
    const testBox = useRef<HTMLDivElement>(null);
    const toTest = useRef(false);
    useEffect(() => {
        if (!toTest.current) {
            return;
        }
        toTest.current = false;
        testBox.current
            ?.querySelector<HTMLElement>("input:not([type=hidden]):not([readonly]), button, [tabindex='0']")
            ?.focus();
    });
    const side: Side = sideOf(rule);
    const { value } = rowWords(session, step, side, reading);
    // Typing in a box is held and written when committed (Enter, leaving the box): one undo step.
    const [draft, setDraft] = useState<Card | null>(null);
    const [advanced, setAdvanced] = useState(false);
    // Read once per reading, never per render: it reads the step's values and their spread.
    const read = useMemo(
        () => stepCard(session, step, reading, side, rule.within),
        [session, step, reading, side, rule.within],
    );
    // A Keep or Except step's checklist counts what comes into the step (spec 5); an Add step's
    // counts the base, since what it adds comes from there.
    const counted = useMemo(
        () =>
            read.card?.type === "category" && step.op !== "add" && reading !== undefined && !reading.waiting
                ? { ...read.card, field: { ...read.card.field, counted: reading.input } }
                : read.card,
        [read.card, step.op, reading],
    );
    const card = draft ?? counted;
    const commit = (next: Card | null = draft): void => {
        setDraft(null);
        if (next !== null) {
            onStep({ rule: ruleOfCard(step, next), mode: modeOf(next) });
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
    // A group that starts with nothing holds nothing until its step has a test: no "0 so far".
    const untouched =
        branch.start === "none" && (reading?.reason?.code === "test-unset" || reading?.reason?.code === "no-reference");
    const count = reading === undefined || reading.waiting || untouched ? undefined : reading.count;
    const missing = missingOf(step.rule);
    // By position keeps every element tied at the cut (spec 5): when it keeps more than asked, the
    // pane says so beside the number box.
    // Only a group's first step: there its count is exactly what it keeps.
    const asked = first && card?.type === "number" && card.match === "top" ? card.top : undefined;
    const tieWords =
        asked !== undefined && count !== undefined && count > asked
            ? `${formatNumber(asked)} asked, ${formatNumber(count)} kept: tied`
            : null;
    // "Include not measured" is offered only when the value has elements with no value (or is on).
    const valuePath = card !== null && "field" in card ? card.field.path : undefined;
    const givenMissing = card !== null && "field" in card ? card.field.missing : undefined;
    const unmeasured = useMemo(() => {
        if (missing === undefined || valuePath === undefined) {
            return 0;
        }
        return givenMissing ?? session.scope.histogram(valuePath, { within: rule.within }).missing;
    }, [missing, valuePath, givenMissing, session, rule.within]);
    const offersMissing = missing === true || (missing === false && unmeasured > 0);
    const algorithm =
        step.rule.kind === "measure"
            ? session.catalog.algorithms().find((each) => each.key === (step.rule as { algorithm: string }).algorithm)
            : undefined;
    const canSoFar = step.op !== "add" && algorithm?.scopeInput === "subgraph";
    // The algorithm's own settings, as Analyze draws them (spec 3.2), past the ones a step binds.
    const settings = algorithm?.options.filter((o) => o.internal !== true && o.type !== "node-id") ?? [];
    const pending = reading?.state === "pending";
    // A state the Run button does not already say (Paused, Waits for step 1, No reference) is said
    // in the pane, as on the step's row (spec 3.1).
    const reasonCode = reading?.reason?.code;
    const stateShown =
        reasonCode === undefined ||
        reasonCode === "run-needed" ||
        reasonCode === "stale" ||
        reasonCode === "run-failed" ||
        reasonCode === "computing" ||
        reasonCode === "test-unset"
            ? ""
            : reasonWords(
                  reading?.reason ?? null,
                  branch.steps.map((each) => each.id ?? ""),
              ).short;
    // An edge step reading a node value says whether both ends must pass, or either.
    const readsEnds = side === "edge" && card !== null && "field" in card && card.field.on === "node";
    const linked = readsLinks(step.rule);
    // Said only once the edge condition can leave an edge out (ws-polish 3).
    const linksWords =
        step.links === undefined || !linksTested(session, step.links) ? "" : `Edges: ${linksSaid(session, step.links)}`;
    // A text test's Match case lives in Advanced, named on its right when set (ws-polish 3).
    const textCard = card?.type === "text" && card.match !== "list" ? card : null;
    const changed = [
        ...(textCard?.caseSensitive === true ? ["Match case"] : []),
        ...(step.computedOn === "so-far" ? ["So far"] : []),
        ...(linksWords === "" ? [] : [linksWords]),
        ...(step.ends === "either" ? ["Either end"] : []),
        ...(missing === true ? ["Not measured"] : []),
    ];
    const hasAdvanced =
        textCard !== null ||
        canSoFar ||
        linked ||
        readsEnds ||
        offersMissing ||
        step.rule.kind === "touching" ||
        settings.length > 0;
    const base = host === "filter" ? "Full graph" : "Filtered graph";
    const verbs = verbsAt(branch, branch.steps.indexOf(step));
    // Whether the Except switch (or the word Add) is drawn: as ExceptSwitch decides.
    const switchShown = step.op === "add" ? verbs.length >= 2 : step.op === "except" || verbs.includes("except");
    const soFar =
        count !== undefined && count !== total ? (
            <Text size="sm" c="dimmed" className="sel-count" aria-hidden>
                {`${formatNumber(count)} so far`}
            </Text>
        ) : null;
    return (
        <div // NOSONAR(S6819): an ARIA group naming one step's controls; a fieldset draws its own border and legend
            role="group"
            aria-label={[
                step.op === "keep" ? value : `${VERB_WORDS[step.op].word}, ${value}`,
                ...(count === undefined
                    ? []
                    : [`${formatNumber(count)} of ${formatNumber(of)} ${NOUNS[side].many} so far`]),
            ].join(", ")}
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
                if (draft === null || (to instanceof Element && to.closest("[data-portal]") !== null)) {
                    return;
                }
                // Leaving the text box commits its text, as the Min and Max boxes do; moving between
                // the pane's other controls keeps nothing to commit.
                const inside = to instanceof Element && event.currentTarget.contains(to);
                if (!inside || isTypingTarget(event.target)) {
                    commit();
                }
            }}
        >
            <Stack gap={6}>
                {head && (
                    <Group gap={4} wrap="nowrap" className="sel-pane-head">
                        {adds}
                        <span className="sel-spacer" />
                        <StepMenu
                            name={value}
                            verb={step.op}
                            verbs={verbs}
                            onVerb={(op) => {
                                onStep({ op });
                            }}
                            on={step.on !== false}
                            first={first}
                            last={last}
                            onToggle={onToggle}
                            onMove={onMove}
                            onDuplicate={onDuplicate}
                            onRemove={onRemove}
                        />
                        {done}
                    </Group>
                )}
                {switchShown || stateShown !== "" ? (
                    <Group gap={6} wrap="nowrap">
                        <ExceptSwitch
                            verb={step.op}
                            verbs={verbs}
                            onVerb={(op) => {
                                onStep({ op });
                            }}
                        />
                        <span className="sel-spacer" />
                        {soFar}
                        {stateShown !== "" && (
                            <Text size="sm" c="dimmed" className="sel-state">
                                {stateShown}
                            </Text>
                        )}
                    </Group>
                ) : null}
                {/* With no switch and no state word above, "so far" sits on the value field's row (ws-polish 3). */}
                <Group gap={6} wrap="nowrap">
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <ValueField
                            session={session}
                            rule={rule}
                            branch={branch}
                            // "While ... has nodes" stays whole in its field; the reference picker holds the node.
                            value={step.rule.kind === "nonempty" ? WHILE : value}
                            hostPicks={hostPicks}
                            onRule={(stepRule) => {
                                setDraft(null);
                                toTest.current = true;
                                onStep({ rule: stepRule });
                            }}
                        />
                    </div>
                    {!(switchShown || stateShown !== "") && soFar}
                </Group>
                <div ref={testBox} className="sel-test-box">
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
                            <RunButton session={session} rule={rule} step={step} reading={reading} />
                            {card !== null && (
                                <CardBody
                                    session={session}
                                    card={card}
                                    side={"field" in card ? card.field.on : side}
                                    onChange={onCard}
                                    variant="step"
                                />
                            )}
                            {tieWords !== null && (
                                <Text size="sm" c="dimmed" data-ties="">
                                    {tieWords}
                                </Text>
                            )}
                        </>
                    )}
                </div>
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
                            <Text size="sm" span>
                                Advanced
                            </Text>
                            {changed.length > 0 && (
                                <Text size="sm" c="dimmed" span ml="auto">
                                    {changed.join(", ")}
                                </Text>
                            )}
                        </UnstyledButton>
                        <Collapse in={advanced}>
                            <Stack gap={6}>
                                {textCard !== null && (
                                    <Checkbox
                                        size="xs"
                                        label="Match case"
                                        checked={textCard.caseSensitive}
                                        onChange={(event) => {
                                            commit({ ...textCard, caseSensitive: event.currentTarget.checked });
                                        }}
                                    />
                                )}
                                {canSoFar && (
                                    <CaptionedRow>
                                        <SegmentedControl
                                            label="Computed on"
                                            fullWidth
                                            data={[
                                                { value: "base", label: base },
                                                { value: "so-far", label: "So far" },
                                            ]}
                                            value={step.computedOn === "so-far" ? "so-far" : "base"}
                                            onChange={(next) => {
                                                onStep({ computedOn: next === "so-far" ? "so-far" : "base" });
                                            }}
                                        />
                                    </CaptionedRow>
                                )}
                                {linked && (
                                    <LinksBody
                                        session={session}
                                        step={step}
                                        within={rule.within}
                                        onLinks={(links) => {
                                            onStep({ links });
                                        }}
                                    />
                                )}
                                {readsEnds && (
                                    <CaptionedRow>
                                        <SegmentedControl
                                            label="Edge ends"
                                            fullWidth
                                            data={[
                                                { value: "both", label: "Both" },
                                                { value: "either", label: "Either" },
                                            ]}
                                            value={step.ends ?? "both"}
                                            onChange={(next) => {
                                                onStep({ ends: next === "either" ? "either" : "both" });
                                            }}
                                        />
                                    </CaptionedRow>
                                )}
                                {step.rule.kind === "touching" && (
                                    <CaptionedRow>
                                        <SegmentedControl
                                            label="Edge ends"
                                            fullWidth
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
                                    </CaptionedRow>
                                )}
                                {algorithm !== undefined && settings.length > 0 && step.rule.kind === "measure" && (
                                    <OptionsForm
                                        session={session}
                                        options={settings}
                                        values={step.rule.params ?? {}}
                                        words={(option) => optionWords(algorithm.key, option)}
                                        weightReads={algorithm.weightMeaning ?? null}
                                        algorithm={algorithm.key}
                                        onChange={(name, next) => {
                                            const measure = step.rule as Extract<RuleTree, { kind: "measure" }>;
                                            onStep({
                                                rule: { ...measure, params: { ...measure.params, [name]: next } },
                                            });
                                        }}
                                    />
                                )}
                                {offersMissing && (
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
 * A step's "..." menu: Add instead (or Narrow instead) where both can change the group, Turn off,
 * Duplicate, Move up, Move down | Delete, each with its key.
 * @param props - Component props
 * @param props.name - the step's value
 * @param props.verb - the step's verb
 * @param props.verbs - the verbs that can change the group here
 * @param props.onVerb - takes the new verb
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
    verb,
    verbs,
    onVerb,
    on,
    first,
    last,
    onToggle,
    onMove,
    onDuplicate,
    onRemove,
}: Readonly<{
    name: string;
    verb: Verb;
    verbs: readonly Verb[];
    onVerb: (verb: Verb) => void;
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
                        ...(verbs.includes("add") && verbs.length > 1
                            ? [
                                  {
                                      id: "verb",
                                      label: verb === "add" ? "Narrow instead" : "Add instead",
                                      icon: verb === "add" ? ("intersect" as const) : ("union" as const),
                                      group: "edit" as const,
                                      onRun: () => {
                                          onVerb(verb === "add" ? "keep" : "add");
                                      },
                                  },
                              ]
                            : []),
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
                            reasonDrawn: false,
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
                            reasonDrawn: false,
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
