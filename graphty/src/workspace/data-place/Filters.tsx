/**
 * Filters (tier2-design.md section 1): the Data place's Filters section, the step editor the
 * inspector draws, and the header chip. The steps are graphty-element's
 * (`visibility.steps` / `setSteps`); their counts are the element's (`visibility.summary` and the
 * `steps` effect of `plan`). The app holds no filter state and writes only the words.
 */

import { ControlSection, Tree, type TreeNodeData } from "@graphty/compact-mantine";
import type { FilterStep, GraphSession, RuleTree } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, Group, Menu, Select, Stack, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { type Card, type CardField, cardFields, cardOf, keyOf, leafOf, newCard } from "../style/cards";
import { keystrokeTarget } from "../style/useFocusLine";
import { CardBody } from "../style/WhichPicker";
import { countStep, NEW, newId, openStepEditor, stepWords, writeSteps } from "./filterSteps";
import {
    applyName,
    applyTip,
    cancelledWords,
    chipTip,
    chipWords,
    ENDS_LINE,
    type Left,
    missingTip,
    notAddedWords,
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

/**
 * What a step not yet written would leave, as the element's plan counts it, for the rule the
 * editor holds now.
 * @param session - the element's session, or null.
 * @param next - the steps with this one written and on, or null while the rule is incomplete.
 * @param id - the step's id in that list.
 * @param key - changes whenever the rule does.
 * @returns the counts before and after the step, or null until counted.
 */
function usePreview(
    session: GraphSession | null,
    next: readonly FilterStep[] | null,
    id: string,
    key: string,
): { readonly before: Left; readonly after: Left } | null {
    const [preview, setPreview] = useState<{ key: string; before: Left; after: Left } | null>(null);
    const version = useVisibilityVersion(session);
    const latest = useRef(next);
    latest.current = next;
    useEffect(() => {
        const steps = latest.current;
        if (session === null || steps === null) {
            return undefined;
        }
        let live = true;
        countStep(session, steps, id).then(
            (counted) => {
                if (live) {
                    setPreview(counted === null ? null : { key, ...counted });
                }
            },
            () => undefined,
        );
        return () => {
            live = false;
        };
    }, [session, id, key, version]);
    return preview?.key === key ? preview : null;
}

/** What a step keeps, as the editor's first field. */
type Keep = "attribute" | "largest" | "neighbors";

/** The editor's fields: what the step keeps, and for a value, the condition card that tests it. */
interface Fields {
    readonly keep: Keep;
    readonly card: Card | null;
}

const BLANK: Fields = { keep: "attribute", card: null };

/**
 * A leaf on an edge value read as a filter step reads it: it keeps the passing edges and the nodes
 * at their ends.
 * @param leaf - the leaf a card makes.
 * @returns the leaf, its value tests reading `nodes: "ends"`.
 */
function atEnds(leaf: RuleTree): RuleTree {
    switch (leaf.kind) {
        case "range":
        case "categories":
        case "text":
            return { ...leaf, nodes: "ends" };
        case "not":
            return { ...leaf, of: atEnds(leaf.of) };
        case "any":
            return { ...leaf, of: leaf.of.map(atEnds) };
        default:
            return leaf;
    }
}

/**
 * The values a step can test, nodes' then edges', as condition cards read them. A Data source
 * step keeps nodes and edges alike, so it is offered once, among the nodes.
 * @param session - the element's session.
 * @returns the fields.
 */
const stepFields = (session: GraphSession): CardField[] => [
    ...cardFields(session, "node"),
    ...cardFields(session, "edge").filter((field) => field.kind !== "source"),
];

/**
 * The editor's fields for a step, or for a new one.
 * @param session - the element's session.
 * @param step - the step, or undefined for a new one.
 * @param filled - `<kind>:<path>` to fill for a new step, or "".
 * @returns the fields.
 */
function fieldsOf(session: GraphSession, step: FilterStep | undefined, filled: string): Fields {
    const fields = stepFields(session);
    const rule = step?.rule;
    if (rule === undefined) {
        const field = fields.find((f) => keyOf(f) === filled);
        return { ...BLANK, card: field === undefined ? null : newCard(field) };
    }
    if (rule.kind === "member") {
        return { ...BLANK, keep: "largest" };
    }
    if (rule.kind === "neighborhood") {
        return { ...BLANK, keep: "neighbors" };
    }
    // A rule that reads at its edges' ends is on an edge value: edges are looked up first.
    const onEdges = sameRule(rule, atEnds(rule));
    const ordered = onEdges ? [...fields.filter((f) => f.on === "edge"), ...fields] : fields;
    return { ...BLANK, card: cardOf(session, rule, ordered, 0) };
}

/**
 * The rule the fields describe, or null while they are incomplete.
 * @param fields - the fields.
 * @param seeds - the selected nodes, for a neighbors step.
 * @returns the rule.
 */
function ruleOf(fields: Fields, seeds: readonly (string | number)[]): RuleTree | null {
    if (fields.keep === "largest") {
        return { kind: "member", of: "largest-component" };
    }
    if (fields.keep === "neighbors") {
        return seeds.length === 0 ? null : { kind: "neighborhood", seeds, depth: 1 };
    }
    const { card } = fields;
    const leaf = card === null ? null : leafOf(card);
    // An edge value's step keeps the edges that pass and the nodes at their ends.
    return leaf !== null && card !== null && "field" in card && card.field.on === "edge" ? atEnds(leaf) : leaf;
}

/**
 * What the editor's submit waits for, or null when it is ready.
 * @param rule - the rule the fields make, or null while incomplete.
 * @param unchanged - whether the rule is the saved step's own.
 * @param keep - the Keep choice.
 * @param card - the condition card, or null before an attribute is chosen.
 * @param none - whether the element counted no node left after the step.
 * @returns what is missing.
 */
function missingOf(
    rule: RuleTree | null,
    unchanged: boolean,
    keep: Fields["keep"],
    card: Card | null,
    none: boolean,
): StepMissing | null {
    if (rule !== null) {
        if (unchanged) {
            return "change";
        }
        return none ? "none" : null;
    }
    if (keep === "neighbors") {
        return "nodes";
    }
    return card === null ? "attribute" : "value";
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
 * The side a step's attribute is on: a node's or an edge's.
 * @param card - the step's condition card.
 * @returns the side.
 */
function sideOf(card: Card | null): CardField["on"] {
    return card !== null && "field" in card ? card.field.on : "node";
}

/**
 * The Keep menu's choices.
 * @param neighbors - whether "the neighbors of the selection" is offered.
 * @returns the choices.
 */
function keepChoicesOf(neighbors: boolean): { value: string; label: string }[] {
    return [
        { value: "attribute", label: "an attribute's value" },
        { value: "largest", label: "the largest component" },
        ...(neighbors ? [{ value: "neighbors", label: "the neighbors of the selection" }] : []),
    ];
}

/**
 * The Attribute menu's choices, grouped under Nodes and Edges; a side with none has no group.
 * @param choosable - the attributes a step can test.
 * @returns the grouped choices.
 */
function attributeChoicesOf(choosable: CardField[]): { group: string; items: { value: string; label: string }[] }[] {
    return (["node", "edge"] as const).flatMap((kind) => {
        const items = choosable.filter((f) => f.on === kind).map((f) => ({ value: keyOf(f), label: f.name }));
        return items.length === 0 ? [] : [{ group: kind === "node" ? "Nodes" : "Edges", items }];
    });
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
    const steps = session?.visibility.steps ?? [];
    const step = steps.find((s) => s.id === id);
    const filled = id.startsWith(`${NEW}:`) ? id.slice(NEW.length + 1) : "";
    const [fields, setFields] = useState<Fields>(() => (session === null ? BLANK : fieldsOf(session, step, filled)));
    // What the editor opened with, so leaving a new step says it was not added only after an edit.
    const opened = useRef(fields);
    const set = (next: Partial<Fields>): void => {
        setFields((now) => ({ ...now, ...next }));
    };
    const latest = useRef(fields);
    latest.current = fields;
    // false once the reader adds the step or closes the editor with Escape: nothing to keep then
    const keep = useRef(true);
    // A new step's words while it is whole, for the notice that it was not added.
    const unadded = useRef<string | null>(null);
    // Saves a whole, changed rule when the reader leaves the editor; set on every draw below.
    const leave = useRef<() => void>(() => undefined);
    useEffect(
        () => () => {
            // A click on anything else closes the editor: that saves an edited step too.
            leave.current();
            // A new step applies only when added: leaving drops it, and says so.
            if (id.startsWith(NEW) && keep.current && latest.current !== opened.current) {
                store.set({ notice: { message: notAddedWords(unadded.current), error: false } });
            }
        },
        [id, session, store],
    );
    // An attribute picked hands focus to its card's value, as a layer's Add a condition does, so
    // the next keystroke is the value, not more search text in the attribute box.
    const cardBox = useRef<HTMLDivElement>(null);
    const [toCard, setToCard] = useState(false);
    useEffect(() => {
        if (toCard) {
            setToCard(false);
            const controls = cardBox.current?.querySelectorAll<HTMLElement>("input:not([type=hidden]), button");
            keystrokeTarget([...(controls ?? [])])?.focus();
        }
    }, [toCard]);
    const seeds = session?.selection.nodes ?? [];
    // A neighbors step keeps its own seeds unless the editor opened on a new selection.
    const kept = step?.rule.kind === "neighborhood" ? step.rule.seeds : [];
    const rule = ruleOf(fields, seeds.length > 0 ? seeds : kept);
    const { card } = fields;
    const side = sideOf(card);
    // Save step waits for a change: a rule that is the step's own saves nothing. An off step's
    // "Save and turn on" does something either way.
    const unchanged = step?.on === true && rule !== null && sameRule(rule, step.rule);
    // The steps as they would be with this one written, on: the id it would take, and the list.
    const added = step === undefined ? newId(steps) : step.id;
    const nextOf = (whole: RuleTree): FilterStep[] =>
        step === undefined
            ? [...steps, { id: added, on: true, rule: whole }]
            : steps.map((s) => (s.id === step.id ? { ...s, rule: whole, on: true } : s));
    // What the step would leave, as the element counts it, for the rule as it stands.
    const ruleKey = rule === null ? "" : JSON.stringify(rule);
    const preview = usePreview(session, rule === null ? null : nextOf(rule), added, ruleKey);
    // A step that would hide every node is never written: it is a value no node holds.
    const none = preview?.after.nodes === 0;
    // What the submit waits for, named in its tooltip while it is drawn disabled.
    const missing = missingOf(rule, unchanged, fields.keep, card, none);
    unadded.current = rule === null || session === null ? null : stepWords(session, { id: added, on: true, rule });

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

    // Neighbors is offered only with a selection to start from, or on a step that already has one.
    const keepChoices = keepChoicesOf(seeds.length > 0 || fields.keep === "neighbors");
    const choosable = stepFields(session);
    const attributeChoices = attributeChoicesOf(choosable);

    const commit = async (): Promise<void> => {
        // A press or Enter on an incomplete or unchanged rule adds nothing.
        if (rule === null || unchanged) {
            return;
        }
        // A saved step is on: the reader edited it to use it (Undo restores it as it was).
        const next = nextOf(rule);
        // Nor does one that would hide every node, counted now in case Enter beat the preview.
        if ((await countStep(session, next, added))?.after.nodes === 0) {
            store.set({ announcement: missingTip("none") });
            return;
        }
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
    // An off step left unedited stays off: only "Save and turn on" or Enter turns it on. A new step
    // is never written on leaving: only Add step adds it.
    leave.current = (): void => {
        if (!keep.current || rule === null || none || step === undefined || sameRule(rule, step.rule)) {
            return;
        }
        keep.current = false;
        const next = nextOf(rule);
        // A rule that would hide every node stays as typed, unwritten, as one not yet whole does.
        void countStep(session, next, added)
            .then((counted) => {
                if (counted?.after.nodes === 0) {
                    keep.current = true;
                    return false;
                }
                return writeSteps(session, store, next);
            })
            .then((written) => {
                if (!written) {
                    return;
                }
                // Tabbed out, the editor is still open: it moves on to the step as saved.
                const { inspected } = store.get();
                const open = inspected?.kind === "filter-step" && inspected.id === id;
                // Still open on this saved step: a later edit is saved on leaving too.
                keep.current = open;
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
                    <Select
                        label="Attribute"
                        data={attributeChoices}
                        value={card !== null && "field" in card ? keyOf(card.field) : null}
                        placeholder="Choose an attribute"
                        searchable
                        // Tab passes through; the list opens on a click, a typed letter or ArrowDown.
                        openOnFocus={false}
                        onChange={(value) => {
                            const field = choosable.find((f) => keyOf(f) === value);
                            set({ card: field === undefined ? null : newCard(field) });
                            setToCard(field !== undefined);
                        }}
                    />
                    {card !== null && (
                        // The condition card a layer's Which picker draws: its match menu, its values.
                        <div ref={cardBox}>
                            <CardBody
                                session={session}
                                card={card}
                                side={side}
                                onChange={(next) => {
                                    set({ card: next });
                                }}
                            />
                        </div>
                    )}
                    {side === "edge" && (
                        <Text size="xs" c="dimmed">
                            {ENDS_LINE}
                        </Text>
                    )}
                </>
            )}
            {rule !== null && preview !== null && (
                // What the step would leave, in the words its row will use: "77 to 0 nodes".
                <Text size="xs" c="dimmed">
                    {outcomeWords(true, preview.before, preview.after, overEdges({ id: added, on: true, rule }))}
                </Text>
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
