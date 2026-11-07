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
    NodeId,
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
    Select,
    Stack,
    Switch,
    Text,
    Tooltip,
    UnstyledButton,
} from "@mantine/core";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { optionWords, wordsFor } from "../analyze/words";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../inspector/words";
import { isTypingTarget, printable } from "../keys/keys";
import { OptionsForm } from "../options/OptionsForm";
import { SettingsPopout } from "../options/SettingsPopout";
import { type Card, cardFields, cardOf, leafOf, type Side } from "../style/cards";
import { AddCondition, CardBody } from "../style/WhichPicker";
import { type Verb, verbsAt } from "./model";
import { ReferencePicker } from "./ReferencePicker";
import { SelectionMenuItems } from "./SelectionMenu";
import {
    freshTest,
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

/** Where the workspace's header ends: its 28px margin and 40px row. A card's settings stay under it. */
const MODAL_HEAD_BOTTOM = 68;

/** A card's words for the nodes a route runs between, by option name (the approved prototype). */
const REFERENCE_WORDS: Readonly<Partial<Record<string, string>>> = { source: "From", target: "To" };

/** What a step pane asks its editor to do. */
interface StepActions {
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
        <Stack gap={4} className="sel-captioned">
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
 * @param props.host - where the selection is edited
 * @param props.hostPicks - the host's own picker entries
 * @param props.onRule - takes the new value's rule
 * @param props.perAlgorithm - the picker lists one entry per algorithm (a workspace card)
 * @param props.glyph - drawn before the value's name (an algorithm's, on a workspace card)
 * @returns The field
 */
function ValueField({
    session,
    rule,
    branch,
    value,
    hostPicks,
    host,
    onRule,
    perAlgorithm = false,
    glyph,
}: Readonly<{
    session: GraphSession;
    rule: UnionLeaf;
    branch: UnionBranch;
    value: string;
    hostPicks: readonly PickSection[];
    host: Host;
    onRule: (stepRule: RuleTree) => void;
    perAlgorithm?: boolean;
    glyph?: React.ReactNode;
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
            fields={open ? pickerFields(session, sideOf(rule), rule.within, perAlgorithm) : []}
            used={usedPaths(rule, branch)}
            placeholder="Find attributes, results"
            sections={open ? [...hostPicks, ...pickSections(session, rule, choose, host, perAlgorithm)] : []}
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
                    {...(glyph === undefined ? {} : { leftSection: glyph, leftSectionPointerEvents: "none" as const })}
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
 * Links, in a step's Advanced (spec 3.5): All links, or Links where one edge condition holds. The
 * choice alone: {@link LinksCondition} draws the condition.
 * @param props - Component props
 * @param props.where - the choice is Edges where
 * @param props.onChoice - takes the choice
 * @returns The row
 */
function LinksChoice({
    where,
    onChoice,
}: Readonly<{ where: boolean; onChoice: (where: boolean) => void }>): React.JSX.Element {
    return (
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
                    onChoice(next === "where");
                }}
            />
        </CaptionedRow>
    );
}

/**
 * Links where one edge condition holds (spec 3.5): an edge value and its test, the controls of
 * section 5, so the step reads only the links that pass ("ignore links with weight under 2")
 * without the graph-wide Data filter. On a workspace card it is drawn on the card, never inside the
 * card's settings: a popover holds settings, not a card of its own.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.step - the step
 * @param props.within - the selection's base
 * @param props.toField - the field takes focus as it is drawn
 * @param props.onLinks - takes the edge condition, or undefined for every link
 * @returns The rows
 */
function LinksCondition({
    session,
    step,
    within,
    toField,
    onLinks,
}: Readonly<{
    session: GraphSession;
    step: UnionStep;
    within: UnionLeaf["within"];
    toField: boolean;
    onLinks: (links: RuleTree | undefined) => void;
}>): React.JSX.Element {
    const [picking, setPicking] = useState(false);
    // Choosing "Links where ..." hands focus to the edge value's field, where Enter opens its list.
    const field = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (toField) {
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
            {shown !== null && (
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
    /** How many the group held before this step: its head draws the change ("+24", "-20"). */
    readonly before?: number;
    readonly hostPicks: readonly PickSection[];
    /** The Done button, drawn last in the first row. */
    readonly done?: React.ReactNode;
    /** The add actions, drawn first in the first row. */
    readonly adds?: React.ReactNode;
    /** Whether it draws its first row; false under a title pane that already has one. */
    readonly head?: boolean;
    /** Whether it draws the Except switch; false where the step's verb is drawn already (a group card). */
    readonly verbSwitch?: boolean;
    /**
     * Drawn in a group card of the full-screen workspace (the `selection-workspace` experiment): its
     * head says its change to the group, and a new number step starts over its whole range. Off,
     * "N so far" is said only where it differs from the result, and a new step starts untested.
     */
    readonly cards?: boolean;
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
 * @param props.before - how many the group held before this step
 * @param props.hostPicks - the host's own value picker entries
 * @param props.done - the Done button
 * @param props.adds - the add actions
 * @param props.head - whether it draws its first row
 * @param props.verbSwitch - whether it draws the Except switch
 * @param props.cards - drawn in a group card of the full-screen workspace
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
    before,
    hostPicks,
    done,
    adds,
    head = true,
    verbSwitch = true,
    cards = false,
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
    // A tick on a value that is only a name (a community's number) follows the group it stood for:
    // graphty-element names each group's best-connected member, and once the new run answers, the
    // ticks go to whichever groups now hold those members. So settings that give the same groups
    // keep the same ticks.
    const following = useRef<{ from: string | null; nodes: readonly NodeId[] } | null>(null);
    const tickedMembers = (values: readonly unknown[]): readonly NodeId[] => {
        if (card === null || !("field" in card)) {
            return [];
        }
        const ticked = new Set(values.map(String));
        const read = session.scope.histogram(card.field.path, {
            ...(rule.within === undefined ? {} : { within: rule.within }),
            as: "categorical",
        });
        return read.kind === "categorical"
            ? read.values.flatMap((each) =>
                  ticked.has(String(each.value)) && each.member !== undefined ? [each.member] : [],
              )
            : [];
    };
    useEffect(() => {
        const held = following.current;
        const run = reading?.run ?? null;
        if (held === null || run === null || run === held.from || step.rule.kind !== "measure") {
            return;
        }
        const { rule: measureNow } = step;
        const result = session.runs.get(run)?.result;
        if (result === undefined) {
            return;
        }
        following.current = null;
        const groups = held.nodes.flatMap((node) => {
            const value = result.node(node)?.[measureNow.field];
            return typeof value === "string" || typeof value === "number" ? [String(value)] : [];
        });
        if (groups.length > 0) {
            onStep({ rule: { ...measureNow, test: { kind: "categories", values: [...new Set(groups)] } } });
        }
    });
    /**
     * The measure under new settings. A field whose values are names a re-run may spell differently
     * (a community's number) has its picked values cleared until the new run says which groups
     * hold the old ticks' members: "Group 1" of the old run is not the new run's Group 1.
     * @param measure - the step's measure.
     * @param params - its new settings.
     * @returns the measure.
     */
    const retuned = (
        measure: Extract<RuleTree, { kind: "measure" }>,
        params: Readonly<Record<string, unknown>>,
    ): RuleTree => {
        const renames = algorithm?.fields.some((field) => field.name === measure.field && field.unstable === true);
        if (renames !== true || measure.test?.kind !== "categories") {
            return { ...measure, params, ...(measure.test === undefined ? {} : { test: measure.test }) };
        }
        following.current = { from: reading?.run ?? null, nodes: tickedMembers(measure.test.values) };
        return { ...measure, params, test: { ...measure.test, values: [] } };
    };
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
        (cards && card?.type === "number") ||
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
    const switchShown =
        verbSwitch && (step.op === "add" ? verbs.length >= 2 : step.op === "except" || verbs.includes("except"));
    // With the group's count before it, the step's head draws what it changed; else what it holds.
    const soFarWords = count === undefined ? "" : `${formatNumber(count)} of ${formatNumber(of)} so far`;
    const change = count === undefined || before === undefined ? undefined : count - before;
    const changeChip =
        count === undefined ? null : (
            <Tooltip label={soFarWords} openDelay={300}>
                <Text size="sm" className="sel-count sel-step-change" data-change={change ?? ""} aria-hidden>
                    {change === undefined ? formatNumber(count) : changeWords(change)}
                </Text>
            </Tooltip>
        );
    const soFarText =
        count !== undefined && count !== total ? (
            <Text size="sm" c="dimmed" className="sel-count" aria-hidden>
                {`${formatNumber(count)} so far`}
            </Text>
        ) : null;
    // In a card the head says the change; elsewhere "so far" is said below, only where it differs.
    const soFar = cards ? changeChip : null;
    const cardBelow = !head && count !== total ? changeChip : null;
    const soFarBelow = cards ? cardBelow : soFarText;
    const paneLabel = [
        step.op === "keep" ? value : `${VERB_WORDS[step.op].word}, ${value}`,
        ...(count === undefined ? [] : [`${formatNumber(count)} of ${formatNumber(of)} ${NOUNS[side].many} so far`]),
    ].join(", ");
    const paneKeys = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing && draft !== null) {
            commit();
        }
    };
    const paneBlur = (event: React.FocusEvent<HTMLElement>): void => {
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
    };
    // On a card: the settings popover's state (a changed setting's chip opens it), the measure, and
    // the nodes the algorithm reads (node-id options), chosen on the card.
    const [settingsOpen, setSettingsOpen] = useState(false);
    const measure = step.rule.kind === "measure" ? step.rule : undefined;
    const references = algorithm?.options.filter((o) => o.internal !== true && o.type === "node-id") ?? [];
    // An algorithm's step is named by its method on a card, the field chosen beside it.
    const algorithmWords = algorithm === undefined ? undefined : wordsFor(algorithm).name;
    const outputs =
        algorithm?.fields.filter(
            (field) =>
                field.kind === side && field.type !== "table" && field.name !== "rank" && field.name !== "percentile",
        ) ?? [];
    const outputName = algorithm?.fields.find((field) => measure?.field === field.name)?.plainName ?? value;
    const testBody = (
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
                            bare={cards}
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
    );
    // Links: the choice in Advanced; the condition under it in a pane, on the card itself in a card.
    const [linksWhere, setLinksWhere] = useState(step.links !== undefined);
    const [toLinks, setToLinks] = useState(false);
    const chooseLinks = (where: boolean): void => {
        setLinksWhere(where);
        setToLinks(where && step.links === undefined);
        if (!where) {
            onStep({ links: undefined });
        } else if (cards) {
            setSettingsOpen(false);
        }
    };
    const linksCondition = (
        <LinksCondition
            session={session}
            step={step}
            within={rule.within}
            toField={toLinks}
            onLinks={(links) => {
                onStep({ links });
            }}
        />
    );
    // Advanced's rows: under its disclosure in a pane, behind the settings button on a card.
    const advancedRows = (
        <Stack gap={6}>
            {cards && card?.type === "number" && (
                <CaptionedRow>
                    <SegmentedControl
                        label="Test"
                        fullWidth
                        data={[
                            { value: "range", label: "By value" },
                            { value: "top", label: "By position" },
                        ]}
                        value={card.match === "top" ? "top" : "range"}
                        onChange={(next) => {
                            if (next === "top" && card.match !== "top") {
                                commit({ ...card, match: "top", min: undefined, max: undefined, top: undefined });
                            } else if (next === "range" && card.match === "top") {
                                commit({ ...card, match: "range", top: undefined });
                            }
                        }}
                    />
                </CaptionedRow>
            )}
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
            {linked && <LinksChoice where={linksWhere} onChoice={chooseLinks} />}
            {linked && linksWhere && !cards && linksCondition}
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
                        onStep({ rule: retuned(measure, { ...measure.params, [name]: next }) });
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
    );
    if (cards) {
        return (
            <CardStep
                label={paneLabel}
                stepId={step.id}
                pending={pending}
                onKeyDown={paneKeys}
                onBlur={paneBlur}
                valueRow={
                    <>
                        {adds}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <ValueField
                                session={session}
                                rule={rule}
                                branch={branch}
                                value={step.rule.kind === "nonempty" ? WHILE : (algorithmWords ?? value)}
                                hostPicks={hostPicks}
                                host={host}
                                perAlgorithm
                                glyph={algorithm === undefined ? undefined : <GLYPHS.analyze size={12} aria-hidden />}
                                onRule={(stepRule) => {
                                    setDraft(null);
                                    toTest.current = true;
                                    onStep({ rule: stepRule });
                                }}
                            />
                        </div>
                        {algorithm !== undefined && outputs.length > 1 && step.rule.kind === "measure" && (
                            <OutputSelect
                                name={algorithmWords ?? value}
                                rule={step.rule}
                                outputs={outputs}
                                onRule={(next) => {
                                    setDraft(null);
                                    onStep({ rule: next });
                                }}
                            />
                        )}
                        {hasAdvanced && (
                            // The cards sit at the workspace's start edge, so it opens over the drawing:
                            // the workspace holds its PopoutManager, outside the modal, so never under it.
                            <SettingsPopout
                                label={`Settings for ${algorithmWords ?? value}`}
                                title={algorithmWords ?? value}
                                tip={changed.length === 0 ? "Settings" : `Settings: ${changed.join(", ")}`}
                                changed={changed.length > 0}
                                opened={settingsOpen}
                                onOpenChange={setSettingsOpen}
                                width={280}
                                placement="right"
                                boundaryTop={MODAL_HEAD_BOTTOM}
                            >
                                {/* A portal: Escape here closes the panel, never the workspace around it. */}
                                <div data-portal="" className="ws-options-rows">
                                    {advancedRows}
                                </div>
                            </SettingsPopout>
                        )}
                        {done}
                    </>
                }
                // The card says no sentence for a missing reference: its reference box shows it empty.
                state={reasonCode === "no-reference" ? "" : stateShown}
                test={
                    <>
                        {measure !== undefined && algorithm !== undefined && (
                            <SettingChips
                                options={settings}
                                params={measure.params ?? {}}
                                onOpen={() => {
                                    setSettingsOpen(true);
                                }}
                                onReset={(name) => {
                                    const { [name]: _gone, ...kept } = measure.params ?? {};
                                    onStep({ rule: retuned(measure, kept) });
                                }}
                            />
                        )}
                        {measure !== undefined &&
                            references.map((option) => (
                                // A node an algorithm reads (Shortest path's From and To) is chosen on
                                // the card, by search or on the canvas, never from a list of every node.
                                <Group key={option.name} gap={6} wrap="nowrap" className="sel-card-ref">
                                    <Text size="sm" className="sel-card-ref-name">
                                        {REFERENCE_WORDS[option.name] ?? option.plainName}
                                    </Text>
                                    <ReferencePicker
                                        session={session}
                                        host={host}
                                        name={REFERENCE_WORDS[option.name] ?? option.plainName}
                                        reference={measure.bind?.[option.name]}
                                        firstStep={first}
                                        onReference={(reference) => {
                                            onStep({
                                                rule: {
                                                    ...measure,
                                                    bind: { ...measure.bind, [option.name]: reference },
                                                },
                                            });
                                        }}
                                    />
                                </Group>
                            ))}
                        {card?.type === "yes-no" ? (
                            // A yes-or-no output is named as the From and To rows are.
                            <Group gap={6} wrap="nowrap" className="sel-card-ref">
                                <Text size="sm" className="sel-card-ref-name">
                                    {outputName}
                                </Text>
                                {testBody}
                            </Group>
                        ) : (
                            testBody
                        )}
                        {linked && linksWhere && (
                            <div className="sel-card-links" data-card-links="">
                                {linksCondition}
                            </div>
                        )}
                    </>
                }
            />
        );
    }
    return (
        <div // NOSONAR(S6819): an ARIA group naming one step's controls; a fieldset draws its own border and legend
            role="group"
            aria-label={paneLabel}
            className="sel-pane"
            data-step-pane={step.id}
            data-pending={pending ? "" : undefined}
            onKeyDown={paneKeys}
            onBlur={paneBlur}
        >
            <Stack gap={6}>
                {head && (
                    <Group gap={4} wrap="nowrap" className="sel-pane-head">
                        {adds}
                        <span className="sel-spacer" />
                        {soFar}
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
                        {switchShown && (
                            <ExceptSwitch
                                verb={step.op}
                                verbs={verbs}
                                onVerb={(op) => {
                                    onStep({ op });
                                }}
                            />
                        )}
                        <span className="sel-spacer" />
                        {soFarBelow}
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
                            host={host}
                            onRule={(stepRule) => {
                                setDraft(null);
                                toTest.current = true;
                                onStep({ rule: stepRule });
                            }}
                        />
                    </div>
                    {!(switchShown || stateShown !== "") && soFarBelow}
                </Group>
                {testBody}
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
                        <Collapse in={advanced}>{advancedRows}</Collapse>
                    </>
                )}
            </Stack>
        </div>
    );
}

/**
 * A step on a workspace card (the `selection-workspace` experiment): its value row (the value
 * picker, an algorithm's output and settings), its state word, then its test inline.
 * @param props - Component props
 * @param props.label - the step's accessible name
 * @param props.stepId - the step's id
 * @param props.pending - it waits on a run
 * @param props.onKeyDown - the pane's keys
 * @param props.onBlur - the pane's blur
 * @param props.valueRow - the value row's controls
 * @param props.state - the state word, or ""
 * @param props.test - the test
 * @returns The step
 */
function CardStep({
    label,
    stepId,
    pending,
    onKeyDown,
    onBlur,
    valueRow,
    state,
    test,
}: Readonly<{
    label: string;
    stepId: string | undefined;
    pending: boolean;
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    onBlur: (event: React.FocusEvent<HTMLElement>) => void;
    valueRow: React.ReactNode;
    state: string;
    test: React.ReactNode;
}>): React.JSX.Element {
    return (
        <div // NOSONAR(S6819): an ARIA group naming one step's controls; a fieldset draws its own border and legend
            role="group"
            aria-label={label}
            className="sel-pane sel-card-body"
            data-step-pane={stepId}
            data-pending={pending ? "" : undefined}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
        >
            <Stack gap={6}>
                <Group gap={4} wrap="nowrap" className="sel-card-value">
                    {valueRow}
                </Group>
                {state !== "" && (
                    <Text size="sm" c="dimmed" className="sel-state">
                        {state}
                    </Text>
                )}
                {test}
            </Stack>
        </div>
    );
}

/**
 * An algorithm step's output on a card: which of the algorithm's fields the card tests
 * ("Community", "Community size"). A change drops the test, which another field reads otherwise.
 * @param props - Component props
 * @param props.name - the algorithm's name
 * @param props.rule - the step's measure
 * @param props.outputs - the algorithm's fields for the side
 * @param props.onRule - takes the measure on the new field
 * @returns The select
 */
function OutputSelect({
    name,
    rule,
    outputs,
    onRule,
}: Readonly<{
    name: string;
    rule: Extract<RuleTree, { kind: "measure" }>;
    outputs: readonly { name: string; plainName: string; type: string; measurement?: string }[];
    onRule: (rule: RuleTree) => void;
}>): React.JSX.Element {
    return (
        <Select
            aria-label={`${name} output`}
            allowDeselect={false}
            className="sel-card-output"
            data={outputs.map((each) => ({ value: each.name, label: each.plainName }))}
            value={rule.field}
            comboboxProps={{ withinPortal: true }}
            onChange={(next) => {
                const output = outputs.find((each) => each.name === next);
                if (output !== undefined && next !== rule.field) {
                    const { test: _test, ...rest } = rule;
                    const test = freshTest(output);
                    onRule({ ...rest, field: output.name, ...(test === undefined ? {} : { test }) });
                }
            }}
        />
    );
}

/**
 * A card's changed settings as chips (the approved prototype): each says its setting and value,
 * opens the settings on a click, and goes back to the default on its x.
 * @param props - Component props
 * @param props.options - the algorithm's settings
 * @param props.params - the step's settings
 * @param props.onOpen - opens the settings
 * @param props.onReset - takes a setting back to its default
 * @returns The chips, or nothing when none changed
 */
function SettingChips({
    options,
    params,
    onOpen,
    onReset,
}: Readonly<{
    options: readonly { name: string; plainName: string; default?: unknown }[];
    params: Readonly<Record<string, unknown>>;
    onOpen: () => void;
    onReset: (name: string) => void;
}>): React.JSX.Element | null {
    const changed = options.filter(
        (option) =>
            params[option.name] !== undefined && JSON.stringify(params[option.name]) !== JSON.stringify(option.default),
    );
    if (changed.length === 0) {
        return null;
    }
    return (
        <Group gap={4} className="sel-card-chips">
            {changed.map((option) => {
                const value = params[option.name];
                const said = `${option.plainName} ${typeof value === "number" ? formatNumber(value) : String(value)}`;
                return (
                    <Group key={option.name} gap={0} wrap="nowrap" className="ws-chip sel-setting-chip">
                        <UnstyledButton aria-label={`${said}, settings`} onClick={onOpen}>
                            <Text size="sm" span>
                                {said}
                            </Text>
                        </UnstyledButton>
                        <ActionIcon
                            variant="subtle"
                            size="xs"
                            aria-label={`Reset ${option.plainName}`}
                            onClick={() => {
                                onReset(option.name);
                            }}
                        >
                            <GLYPHS.close size={10} aria-hidden />
                        </ActionIcon>
                    </Group>
                );
            })}
        </Group>
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

/**
 * A step's change to its group, signed: "+24", "-20", "0".
 * @param change - the change.
 * @returns the words.
 */
function changeWords(change: number): string {
    if (change === 0) {
        return "0";
    }
    return `${change > 0 ? "+" : "-"}${formatNumber(Math.abs(change))}`;
}
