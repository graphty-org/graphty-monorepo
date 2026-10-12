/**
 * Filters (tier2-design.md section 1): the Data place's Filters section, the step editor the
 * inspector draws, and the header chip. The steps are graphty-element's
 * (`visibility.steps` / `setSteps`); their counts are the element's (`visibility.summary` and the
 * `steps` effect of `plan`). The app holds no filter state and writes only the words.
 */

import { ControlSection, Tree, type TreeNodeData } from "@graphty/compact-mantine";
import type { AttributeDescriptor, FilterStep, GraphSession, RuleTree } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, Group, Menu, Select, Stack, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";
import {
    attributeOf,
    BLANK_CONDITION,
    type Condition,
    conditionOf,
    conditionRule,
    filterCompares,
    isNumber,
} from "../rules/conditions";
import { ConditionRow } from "../rules/RuleRows";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { NEW, newId, openStepEditor, stepWords, writeSteps } from "./filterSteps";
import {
    applyName,
    applyTip,
    cancelledWords,
    chipTip,
    chipWords,
    ENDS_LINE,
    type Left,
    missingTip,
    outcomeWords,
    overEdges,
    savedWords,
    saveLabel,
    statusWords,
    type StepMissing,
} from "./filterWords";
import { useVisibilityVersion } from "./useVisibilityVersion";

/** What is left before the first step and after each step that is on, by step id. */
interface Outcomes {
    readonly start: Left;
    readonly after: ReadonlyMap<string, Left>;
}

/** Where focus goes once the Filters section draws the steps next: a step's row, or `PLUS` for "+". */
const PLUS = "+";
let pendingFocus: string | null = null;
/** A new step left half-made when the inspector moved on, kept until it is added or cancelled. */
let draft: { readonly session: GraphSession; readonly fields: Fields } | null = null;

/**
 * Asks the Filters section to focus a step's row, or "+" (`PLUS`), once it has drawn the steps
 * that change brings, so focus never falls to the page when the editor closes or a row goes
 * (WCAG 2.4.3).
 * @param target - a step id, or `PLUS`.
 */
function focusNext(target: string): void {
    pendingFocus = target;
}

/**
 * Focuses a step's row in the Filters section, or its "+".
 * @param target - a step id, or `PLUS`.
 * @returns whether that control is on the page.
 */
function focusStep(target: string): boolean {
    const control = document.querySelector<HTMLElement>(
        target === PLUS ? "[data-filters-plus]" : `[role=tree][aria-label="Filters"] [data-id="${CSS.escape(target)}"]`,
    );
    control?.focus();
    return control !== null;
}

/**
 * The element's per-step counts for the steps in force (`plan({ op: "visibility.steps" })`).
 * @param session - the element's session, or null.
 * @param version - changes whenever the steps or the data may have.
 * @returns the counts, or null until counted.
 */
function useOutcomes(session: GraphSession | null, version: number): Outcomes | null {
    const [outcomes, setOutcomes] = useState<Outcomes | null>(null);
    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        let live = true;
        session.plan({ op: "visibility.steps", steps: session.visibility.steps }).then(
            (plan) => {
                if (live && plan.effect.kind === "steps") {
                    const { start, steps } = plan.effect;
                    setOutcomes({ start, after: new Map(steps.map((s) => [s.id, s])) });
                }
            },
            () => undefined,
        );
        return () => {
            live = false;
        };
    }, [session, version]);
    return outcomes;
}

/**
 * The Filters section: one row per step, as a sentence (its outcome on the row's second line)
 * and its Apply this step checkbox. "+" opens the step editor; a row opens it on that step; the
 * row menu deletes.
 * @returns the section.
 */
export function FiltersSection(): React.JSX.Element {
    const { session, store } = useWorkspace();
    const version = useVisibilityVersion(session);
    const outcomes = useOutcomes(session, version);
    const steps = session?.visibility.steps ?? [];
    // The step whose editor is open is marked, as an inspected row is elsewhere.
    const open = useWorkspaceState((state) =>
        state.inspected?.kind === "filter-step" ? state.inspected.id : undefined,
    );
    // Once the steps changed, the focus a step change asked for (focusNext).
    useEffect(() => {
        if (pendingFocus !== null && focusStep(pendingFocus)) {
            pendingFocus = null;
        }
    }, [version]);

    const setOn = (step: FilterStep, on: boolean): void => {
        if (session !== null) {
            void writeSteps(
                session,
                store,
                steps.map((s) => (s.id === step.id ? { ...s, on } : s)),
            );
        }
    };

    let before = outcomes?.start;
    const items: TreeNodeData[] = steps.map((step) => {
        const words = session === null ? "" : stepWords(session, step);
        const after = step.on ? outcomes?.after.get(step.id) : undefined;
        // A step over an edge column changes both counts, so it names both; the element counts both.
        const outcome = outcomeWords(step.on, before, after, overEdges(step));
        if (step.on && after !== undefined) {
            before = after;
        }
        return {
            id: step.id,
            name: words,
            icon: <GLYPHS.filter size={14} aria-hidden />,
            // The outcome ("77 to 26 nodes", "off") is the row's second line: beside the sentence
            // it would cut the threshold the reader set, in a 240-wide list.
            description: outcome,
            descriptionVisible: true,
            dimmed: !step.on,
            strong: false,
            actions: (
                <Tooltip label={applyTip(step.on)}>
                    <span data-pinned="">
                        <Checkbox
                            size="xs"
                            aria-label={applyName(words)}
                            checked={step.on}
                            onChange={(event) => {
                                setOn(step, event.currentTarget.checked);
                            }}
                        />
                    </span>
                </Tooltip>
            ),
        };
    });

    const plus = (
        <Tooltip label="Add filter step">
            <ActionIcon
                data-filters-plus=""
                variant="subtle"
                aria-label="Add filter step"
                onClick={() => {
                    openStepEditor(store, NEW);
                }}
            >
                <GLYPHS.add size={14} aria-hidden />
            </ActionIcon>
        </Tooltip>
    );

    return (
        <ControlSection label="Filters" actions={plus} empty={steps.length === 0}>
            {steps.length === 0 ? null : (
                <Tree
                    label="Filters"
                    items={items}
                    multiselect={false}
                    selected={open !== undefined && steps.some((s) => s.id === open) ? [open] : []}
                    onSelect={(ids) => {
                        const id = ids.at(-1);
                        if (id !== undefined) {
                            openStepEditor(store, id);
                        }
                    }}
                    rowMenu={(node) => (
                        <Menu.Item
                            onClick={() => {
                                if (session !== null) {
                                    // The next row takes focus, or the one above when the last
                                    // goes, or "+" when none is left.
                                    const at = steps.findIndex((s) => s.id === node.id);
                                    focusNext(steps[at + 1]?.id ?? steps[at - 1]?.id ?? PLUS);
                                    void writeSteps(
                                        session,
                                        store,
                                        steps.filter((s) => s.id !== node.id),
                                    );
                                }
                            }}
                        >
                            Delete
                        </Menu.Item>
                    )}
                />
            )}
        </ControlSection>
    );
}

/** What a step keeps, as the editor's first field. */
type Keep = "attribute" | "largest" | "neighbors";

/** The editor's fields: what the step keeps, and for an attribute's value, its condition. */
interface Fields {
    readonly keep: Keep;
    readonly condition: Condition;
}

const BLANK: Fields = { keep: "attribute", condition: BLANK_CONDITION };

/**
 * The editor's fields for a step, or for a new one.
 * @param step - the step, or undefined for a new one.
 * @param attributes - the attributes.
 * @param filled - `<kind>:<path>` to fill for a new step, or "".
 * @returns the fields.
 */
function fieldsOf(step: FilterStep | undefined, attributes: readonly AttributeDescriptor[], filled: string): Fields {
    const rule = step?.rule;
    if (rule === undefined) {
        const compare = filterCompares(attributeOf(filled, attributes))[0];
        return { ...BLANK, condition: { ...BLANK_CONDITION, reads: filled, compare } };
    }
    if (rule.kind === "member") {
        return { ...BLANK, keep: "largest" };
    }
    if (rule.kind === "neighborhood") {
        return { ...BLANK, keep: "neighbors" };
    }
    return { ...BLANK, condition: conditionOf(rule, attributes) ?? BLANK_CONDITION };
}

/**
 * The rule the fields describe, or null while they are incomplete.
 * @param fields - the fields.
 * @param attributes - the attributes.
 * @param seeds - the selected nodes, for a neighbors step.
 * @returns the rule.
 */
function ruleOf(
    fields: Fields,
    attributes: readonly AttributeDescriptor[],
    seeds: readonly (string | number)[],
): RuleTree | null {
    if (fields.keep === "largest") {
        return { kind: "member", of: "largest-component" };
    }
    if (fields.keep === "neighbors") {
        return seeds.length === 0 ? null : { kind: "neighborhood", seeds, depth: 1 };
    }
    // An edge attribute's step keeps the edges that pass and the nodes at their ends.
    return conditionRule(fields.condition, attributes, true);
}

/**
 * What the editor's submit waits for, or null when it is ready.
 * @param rule - the rule the fields make, or null while incomplete.
 * @param unchanged - whether the rule is the saved step's own.
 * @param keep - the Keep choice.
 * @param attribute - the chosen attribute.
 * @returns what is missing.
 */
function missingOf(
    rule: RuleTree | null,
    unchanged: boolean,
    keep: Fields["keep"],
    attribute: AttributeDescriptor | undefined,
): StepMissing | null {
    if (rule !== null) {
        return unchanged ? "change" : null;
    }
    if (keep === "neighbors") {
        return "nodes";
    }
    return attribute === undefined ? "attribute" : "value";
}

/**
 * Whether two rules say the same, whatever order their keys were written in.
 * @param a - one rule.
 * @param b - the other.
 * @returns true when they match.
 */
function sameRule(a: RuleTree, b: RuleTree): boolean {
    const text = (rule: RuleTree): string =>
        JSON.stringify(rule, (_key, value: unknown) =>
            value !== null && typeof value === "object" && !Array.isArray(value)
                ? Object.fromEntries(Object.entries(value).sort(([x], [y]) => x.localeCompare(y)))
                : value,
        );
    return text(a) === text(b);
}

/**
 * The step editor, drawn in the inspector: Keep, then the attribute, the comparison and the
 * value. Committing adds the step or saves the edited one, on either way.
 * @param props - Component props
 * @param props.id - the step id, `NEW`, or `NEW:<kind>:<path>`.
 * @returns the editor.
 */
export function FilterStepEditor({ id }: Readonly<{ id: string }>): React.JSX.Element {
    const { session, store } = useWorkspace();
    const attributes = session?.data.attributes() ?? [];
    const steps = session?.visibility.steps ?? [];
    const step = steps.find((s) => s.id === id);
    const filled = id.startsWith(`${NEW}:`) ? id.slice(NEW.length + 1) : "";
    // "+" reopens a new step the reader left half-made by selecting something else
    const [fields, setFields] = useState<Fields>(() =>
        id === NEW && draft !== null && draft.session === session ? draft.fields : fieldsOf(step, attributes, filled),
    );
    const set = (next: Partial<Fields>): void => {
        setFields((now) => ({ ...now, ...next }));
    };
    const latest = useRef(fields);
    latest.current = fields;
    // false once the reader adds the step or closes the editor with Escape: nothing to keep then
    const keep = useRef(true);
    // Saves a whole, changed rule when the reader leaves the editor; set on every draw below.
    const leave = useRef<() => void>(() => undefined);
    useEffect(
        () => () => {
            // A click on anything else closes the editor: that saves the edit too.
            leave.current();
            if (id.startsWith(NEW)) {
                draft = keep.current && session !== null ? { session, fields: latest.current } : null;
            }
        },
        [id, session],
    );
    const seeds = session?.selection.nodes ?? [];
    const attribute = attributeOf(fields.condition.reads, attributes);
    // A neighbors step keeps its own seeds unless the editor opened on a new selection.
    const kept = step?.rule.kind === "neighborhood" ? step.rule.seeds : [];
    const rule = ruleOf(fields, attributes, seeds.length > 0 ? seeds : kept);
    // Save step waits for a change: a rule that is the step's own saves nothing. An off step's
    // "Save and turn on" does something either way.
    const unchanged = step?.on === true && rule !== null && sameRule(rule, step.rule);
    // What the submit waits for, named in its tooltip while it is drawn disabled.
    const missing = missingOf(rule, unchanged, fields.keep, attribute);

    if (session === null || (step === undefined && id !== NEW && filled === "")) {
        // Nothing to save on leaving: the step this editor was open on is gone (deleted), and the
        // last draw's save would write it back.
        leave.current = () => undefined;
        return (
            <Text size="xs" c="dimmed" p="md">
                This step is gone
            </Text>
        );
    }

    const keepChoices = [
        { value: "attribute", label: "an attribute's value" },
        { value: "largest", label: "the largest component" },
        // Offered only with a selection to start from, or on a step that already has one.
        ...(seeds.length > 0 || fields.keep === "neighbors"
            ? [{ value: "neighbors", label: "the neighbors of the selection" }]
            : []),
    ];
    const attributeChoices = (["node", "edge"] as const).flatMap((kind) => {
        const items = attributes
            .filter((a) => a.kind === kind && (isNumber(a) || a.measurement === "categorical"))
            .map((a) => ({ value: `${a.kind}:${a.path}`, label: a.plainName }));
        return items.length === 0 ? [] : [{ group: kind === "node" ? "Nodes" : "Edges", items }];
    });

    const commit = async (): Promise<void> => {
        // A press or Enter on an incomplete or unchanged rule adds nothing.
        if (rule === null || unchanged) {
            return;
        }
        // A saved step is on: the reader edited it to use it (Undo restores it as it was).
        const added = step === undefined ? newId(steps) : step.id;
        const next =
            step === undefined
                ? [...steps, { id: added, on: true, rule }]
                : steps.map((s) => (s.id === step.id ? { ...s, rule, on: true } : s));
        // The editor closes; focus goes to the step's row.
        keep.current = false;
        focusNext(added);
        if (!(await writeSteps(session, store, next))) {
            pendingFocus = null;
            return;
        }
        store.set({
            inspected: null,
            ...(step === undefined ? {} : { announcement: savedWords(stepWords(session, { ...step, rule })) }),
        });
    };

    // Leaving the editor -- Tab out of it, or a click on anything else -- saves the edit as Enter
    // does, without moving focus from where the reader put it. A rule not yet whole stays as typed.
    // An off step left unedited stays off: only "Save and turn on" or Enter turns it on.
    leave.current = (): void => {
        if (
            !keep.current ||
            rule === null ||
            (step !== undefined && sameRule(rule, step.rule)) ||
            (step === undefined && !id.startsWith(NEW))
        ) {
            return;
        }
        keep.current = false;
        const added = step === undefined ? newId(steps) : step.id;
        const next =
            step === undefined
                ? [...steps, { id: added, on: true, rule }]
                : steps.map((s) => (s.id === step.id ? { ...s, rule, on: true } : s));
        void writeSteps(session, store, next).then((written) => {
            if (!written) {
                return;
            }
            // Tabbed out, the editor is still open: it moves on to the step as saved.
            const { inspected } = store.get();
            const open = inspected?.kind === "filter-step" && inspected.id === id;
            // Still open on this saved step: a later edit is saved on leaving too.
            keep.current = open && step !== undefined;
            store.set({
                announcement: savedWords(stepWords(session, { id: added, on: true, rule })),
                ...(open ? { inspected: { kind: "filter-step", id: added } } : {}),
            });
        });
    };

    // Enter commits (the form's submit); Escape no inner control took closes the editor, says
    // nothing was saved and returns focus to the step's row, or to "+" for a new step.
    return (
        <Stack
            component="form"
            gap="xs"
            p="md"
            onSubmit={(event: React.SyntheticEvent) => {
                event.preventDefault();
                void commit();
            }}
            onKeyDown={(event: React.KeyboardEvent) => {
                if (isPanelEscape(event.nativeEvent)) {
                    event.preventDefault();
                    event.stopPropagation();
                    keep.current = false;
                    focusStep(step?.id ?? PLUS);
                    store.set({
                        inspected: null,
                        announcement: cancelledWords(step === undefined ? null : stepWords(session, step)),
                    });
                }
            }}
            onBlur={(event: React.FocusEvent) => {
                // Focus moved out of the form, not between its fields or into a list it opened.
                const to = event.relatedTarget;
                if (!(to instanceof Node) || !event.currentTarget.contains(to)) {
                    leave.current();
                }
            }}
        >
            <Select
                label="Keep"
                // A new step's editor takes focus, from "+" or the toolbar's Filters, so a key
                // reader is in the form it asked for.
                autoFocus={id === NEW}
                data={keepChoices}
                value={fields.keep}
                allowDeselect={false}
                onChange={(value) => {
                    if (value === "attribute" || value === "largest" || value === "neighbors") {
                        set({ keep: value });
                    }
                }}
            />
            {fields.keep === "attribute" && (
                <>
                    <ConditionRow
                        condition={fields.condition}
                        onChange={(condition) => {
                            set({ condition });
                        }}
                        choices={attributeChoices}
                        compares={filterCompares}
                        attributes={attributes}
                    />
                    {attribute?.kind === "edge" && (
                        <Text size="xs" c="dimmed">
                            {ENDS_LINE}
                        </Text>
                    )}
                </>
            )}
            <Group gap="xs">
                {/* Drawn disabled but focusable, so hover and focus show what is missing. */}
                <Tooltip label={missing === null ? "" : missingTip(missing)} disabled={missing === null}>
                    <Button
                        size="xs"
                        type="submit"
                        aria-disabled={missing !== null || undefined}
                        data-disabled={missing !== null || undefined}
                    >
                        {step === undefined ? "Add step" : saveLabel(step.on)}
                    </Button>
                </Tooltip>
            </Group>
        </Stack>
    );
}

/**
 * The header's filter chip, "9 of 22 nodes", drawn only while a step is on; its tooltip names the
 * steps that are on, and it opens the Data place, where the Filters section is. It also puts each steps change on the status line.
 * @returns the chip, or nothing.
 */
export function FilterChip(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useVisibilityVersion(session);

    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        let { steps } = session.visibility;
        return session.on("visibility:changed", () => {
            const now = session.visibility.steps;
            if (now !== steps) {
                steps = now;
                store.set({ announcement: statusWords(now, session.visibility.summary) });
            }
        });
    }, [session, store]);

    if (!session?.visibility.steps.some((step) => step.on)) {
        return null;
    }
    const words = chipWords(session.visibility.summary, session.visibility.steps);
    const on = session.visibility.steps.filter((step) => step.on).map((step) => stepWords(session, step));
    return (
        <Tooltip label={chipTip(on)} multiline maw={280}>
            <Button
                variant="subtle"
                size="compact-xs"
                aria-label={`Filter: ${words}`}
                leftSection={<GLYPHS.filter size={12} aria-hidden />}
                onClick={() => {
                    store.set({ page: "panels", place: "data" });
                }}
            >
                {words}
            </Button>
        </Tooltip>
    );
}
