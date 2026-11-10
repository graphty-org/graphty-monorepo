import { SegmentedControl } from "@graphty/compact-mantine";
import type {
    JoinChoices,
    JoinInput,
    JoinKey,
    JoinReport,
    JoinRowFate,
    JoinStepEntry,
    JoinStepOutcome,
} from "@graphty/graphty-element/session";
import { Button, MultiSelect, NumberInput, Select, Text, TextInput } from "@mantine/core";
import React, { useRef } from "react";

import { GLYPHS } from "../../glyphs";
import { formatNumber } from "../../inspector/words";
import { formatKey } from "../../keys/keys";
import { useJoinWorkspace } from "../context";
import { ROW_FATE_WORDS } from "../words";
import { ConflictsButton } from "./ConflictsReview";
import { type CanvasBox, reached, refusalWords, stepColor, stepName } from "./model";
import type { CanvasFocusKey } from "./ModelCanvas";
import { OP_GLYPHS } from "./opGlyphs";
import { addsThings, choicesFor, columnOf, type JoinOp, mainCount, OP_WORDS, opOf, OPS, pathOf } from "./ops";

/** The bar's keys, shown on their buttons. */
export const BAR_KEYS = { remove: "Delete", conflicts: "C" } as const;

/** Every row fate, in chip order. */
const FATES: readonly JoinRowFate[] = ["joined", "merged", "linked", "new-end", "repeat", "over-cap", "left-out"];

/** Props for the bar. */
export interface JoinBarProps {
    readonly boxes: readonly CanvasBox[];
    /** The step the panes show. */
    readonly selected: string | undefined;
    readonly outcomes: ReadonlyMap<string, JoinStepOutcome>;
    readonly targets: ReadonlyMap<string, readonly string[]>;
    /** Sets the box a step's key reaches. */
    readonly onTarget: (step: string, index: number, box: string) => void;
    readonly focus: CanvasFocusKey | null;
    /** Picks out a row fate's rows and elements, or lets go. */
    readonly onFocus: (focus: (CanvasFocusKey & { readonly fate?: JoinRowFate }) | null) => void;
    readonly conflicts: boolean;
    readonly onConflicts: (open: boolean) => void;
    /** Adds the suggested join of the input most recently held. */
    readonly onAdd: () => void;
}

/**
 * The bar under the canvas: the recipe's joins as tabs (drag one onto another to reorder), the
 * shown join's settings, and its counts, each a button that picks its rows out.
 * @param props - Component props
 * @returns the bar.
 */
export function JoinBar(props: JoinBarProps): React.JSX.Element {
    const api = useJoinWorkspace();
    const step = api.draft.steps.find((each) => each.id === props.selected);
    const outcome = step === undefined ? undefined : props.outcomes.get(step.id);
    return (
        <div className="jwc-bar" role="region" aria-label="Joins">
            <Tabs {...props} />
            {step === undefined || outcome === undefined ? null : (
                <>
                    <Settings {...props} step={step} />
                    <Counts {...props} step={step} outcome={outcome} />
                </>
            )}
        </div>
    );
}

/**
 * The joins as tabs, then + Join.
 * @param props - Component props
 * @returns the tabs.
 */
function Tabs(props: JoinBarProps): React.JSX.Element {
    const api = useJoinWorkspace();
    const { steps } = api.draft;
    const press = useRef<{ id: string; x: number; y: number } | null>(null);
    return (
        <div className="jwc-tabs" role="tablist" aria-label="Recipe">
            {steps.map((step, index) => {
                const op = opOf(step.choices);
                const Icon = OP_GLYPHS[op];
                const outcome = props.outcomes.get(step.id);
                const refusal = outcome === undefined ? undefined : refusalWords(outcome);
                const report = outcome?.report;
                const count = report === undefined ? 0 : mainCount(op, report, step.choices);
                return (
                    <button
                        key={step.id}
                        type="button"
                        role="tab"
                        className="jwc-tab"
                        data-tab={step.id}
                        data-error={refusal === undefined ? undefined : ""}
                        aria-selected={step.id === props.selected}
                        style={{ ["--jc" as string]: stepColor(index) }}
                        onPointerDown={(event) => {
                            press.current = { id: step.id, x: event.clientX, y: event.clientY };
                            event.currentTarget.setPointerCapture(event.pointerId);
                        }}
                        onPointerUp={(event) => {
                            const start = press.current;
                            press.current = null;
                            if (start === null || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) {
                                return;
                            }
                            const over = document
                                .elementFromPoint(event.clientX, event.clientY)
                                ?.closest<HTMLElement>("[data-tab]")?.dataset.tab;
                            const to = steps.findIndex((each) => each.id === over);
                            if (over !== undefined && over !== start.id && to !== -1) {
                                api.edit((draft) => {
                                    draft.move(start.id, to);
                                });
                            }
                        }}
                        onClick={() => {
                            api.select(step.id);
                        }}
                    >
                        <span className="jwc-no">{index + 1}</span>
                        <Icon size={12} aria-hidden />
                        <span className="jwc-tab-name">{stepName(step, props.boxes, OP_WORDS)}</span>
                        <span className="jwc-tab-count">
                            {refusal === undefined
                                ? `${addsThings(op, step.choices) ? "+" : ""}${formatNumber(count)}`
                                : `! ${refusal}`}
                        </span>
                    </button>
                );
            })}
            <Button
                size="compact-xs"
                variant="subtle"
                leftSection={<GLYPHS.add size={14} aria-hidden />}
                disabled={api.draft.inputs.length === 0}
                onClick={props.onAdd}
            >
                Join
            </Button>
        </div>
    );
}

/**
 * The input a step reads.
 * @param inputs - the draft's inputs.
 * @param step - the step.
 * @returns the input, if the draft still has it.
 */
function inputOf(inputs: readonly JoinInput[], step: JoinStepEntry): JoinInput | undefined {
    return inputs.find((input) => input.key === step.from);
}

/**
 * The shown join's settings: its kind, its input, its keys, matching, and its kind's own choices.
 * @param props - Component props
 * @returns the settings row.
 */
function Settings(props: JoinBarProps & { readonly step: JoinStepEntry }): React.JSX.Element {
    const api = useJoinWorkspace();
    const { step } = props;
    const { choices } = step;
    const op = opOf(choices);
    const { inputs } = api.draft;
    const from = inputOf(inputs, step);
    const change = (next: JoinChoices, input = step.from): void => {
        api.edit((draft) => {
            draft.change(step.id, { from: input, choices: next });
        });
    };
    const changeOp = (next: JoinOp): void => {
        if (from === undefined) {
            return;
        }
        const first = choices.keys[0] ?? { file: from.columns[0] ?? "id", graph: "id" };
        const heldOther = inputs.find((input) => input.held && input.key !== from.key);
        const via =
            next === "map" && heldOther !== undefined
                ? { input: heldOther, column: heldOther.columns[0] ?? "id" }
                : undefined;
        const made = choicesFor(next, {
            from,
            column: first.file,
            ...(next === "kind" || next === "split" ? {} : { path: first.graph }),
            ...(via === undefined ? {} : { via }),
            suggestion: api.draft.suggest(from.key),
        });
        change({
            ...made,
            ...(choices.ignoreCase === undefined ? {} : { ignoreCase: choices.ignoreCase }),
            ...(choices.ignoreSpaces === undefined ? {} : { ignoreSpaces: choices.ignoreSpaces }),
        });
    };
    const setKey = (index: number, key: JoinKey): void => {
        change({ ...choices, keys: choices.keys.map((each, at) => (at === index ? key : each)) });
    };
    const graphBoxes = props.boxes.filter((box) => !box.held);
    const fromColumns = from?.columns ?? [];
    const newKind = op === "kind" || op === "split";
    return (
        <div className="jwc-row" aria-label="Settings" role="group">
            <Select
                size="xs"
                w={104}
                aria-label="Join kind"
                data={OPS.map((each) => ({ value: each, label: OP_WORDS[each].name }))}
                value={op}
                allowDeselect={false}
                onChange={(value) => {
                    if (value !== null && value !== op) {
                        changeOp(value as JoinOp);
                    }
                }}
            />
            <Select
                size="xs"
                w={140}
                aria-label="From"
                data={inputs.map((input) => ({ value: input.key, label: input.name }))}
                value={step.from}
                allowDeselect={false}
                onChange={(value) => {
                    if (value !== null && value !== step.from) {
                        change(choices, value);
                    }
                }}
            />
            {choices.keys.map((key, index) => {
                const reachesKind = newKind && index === 1;
                const reach = reached(props.boxes, step, index, props.targets.get(step.id), []);
                const box = graphBoxes.find((each) => each.key === reach);
                return (
                    <span className="jwc-key" key={`${step.id}:${String(index)}`}>
                        <Select
                            size="xs"
                            w={124}
                            aria-label={`Key ${String(index + 1)} column`}
                            data={fromColumns.includes(key.file) ? fromColumns : [...fromColumns, key.file]}
                            value={key.file}
                            allowDeselect={false}
                            searchable
                            error={!fromColumns.includes(key.file)}
                            onChange={(value) => {
                                if (value !== null) {
                                    setKey(index, { ...key, file: value });
                                }
                            }}
                        />
                        <GLYPHS.go size={12} aria-hidden />
                        {reachesKind ? (
                            <TextInput
                                size="xs"
                                w={104}
                                aria-label="New kind"
                                value={choices.endKinds?.target ?? ""}
                                onChange={(event) => {
                                    const kind = event.currentTarget.value;
                                    change({ ...choices, endKinds: { ...choices.endKinds, target: kind } });
                                }}
                            />
                        ) : (
                            <>
                                <Select
                                    size="xs"
                                    w={124}
                                    aria-label={`Key ${String(index + 1)} box`}
                                    data={graphBoxes.map((each) => ({ value: each.key, label: each.name }))}
                                    value={box?.key ?? null}
                                    allowDeselect={false}
                                    onChange={(value) => {
                                        const next = graphBoxes.find((each) => each.key === value);
                                        if (next !== undefined) {
                                            props.onTarget(step.id, index, next.key);
                                            const column = next.columns.includes(columnOf(key.graph))
                                                ? columnOf(key.graph)
                                                : (next.columns[0] ?? "id");
                                            setKey(index, { ...key, graph: pathOf(column) });
                                        }
                                    }}
                                />
                                <Select
                                    size="xs"
                                    w={116}
                                    aria-label={`Key ${String(index + 1)} graph column`}
                                    data={[...new Set([...(box?.columns ?? []), columnOf(key.graph)])]}
                                    value={columnOf(key.graph)}
                                    allowDeselect={false}
                                    searchable
                                    onChange={(value) => {
                                        if (value !== null) {
                                            setKey(index, { ...key, graph: pathOf(value) });
                                        }
                                    }}
                                />
                            </>
                        )}
                    </span>
                );
            })}
            {op === "map" ? <MapSettings step={step} change={change} /> : null}
            <ToggleButton
                label="Ignore case"
                pressed={choices.ignoreCase === true}
                onClick={() => {
                    change({ ...choices, ignoreCase: choices.ignoreCase !== true });
                }}
            >
                Aa
            </ToggleButton>
            <ToggleButton
                label="Ignore spaces"
                pressed={choices.ignoreSpaces === true}
                onClick={() => {
                    change({ ...choices, ignoreSpaces: choices.ignoreSpaces !== true });
                }}
            >
                a b
            </ToggleButton>
            <OpSettings op={op} choices={choices} fromColumns={fromColumns} change={change} />
            <span className="jwc-spacer" />
            <Button
                size="compact-xs"
                variant="subtle"
                color="red"
                aria-keyshortcuts={BAR_KEYS.remove}
                leftSection={<GLYPHS.delete size={14} aria-hidden />}
                rightSection={
                    <Text span size="sm" c="dimmed" className="sel-key">
                        Del
                    </Text>
                }
                onClick={() => {
                    api.edit((draft) => {
                        draft.remove(step.id);
                    });
                }}
            >
                Remove
            </Button>
        </div>
    );
}

/**
 * A map's mapping table and its two columns.
 * @param props - Component props
 * @param props.step - the step.
 * @param props.change - writes the step's choices.
 * @returns the settings.
 */
function MapSettings({
    step,
    change,
}: Readonly<{ step: JoinStepEntry; change: (next: JoinChoices) => void }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const { choices } = step;
    const tables = api.draft.inputs.filter((input) => input.held && input.key !== step.from);
    const via = tables.find((input) => input.key === choices.via);
    const [fromColumn, toColumn] = choices.mapping?.columns ?? [];
    const setColumns = (columns: readonly [string, string]): void => {
        change({ ...choices, mapping: { ...choices.mapping, columns } });
    };
    return (
        <span className="jwc-key">
            <Text span size="sm" c="dimmed">
                via
            </Text>
            <Select
                size="xs"
                w={140}
                aria-label="Mapping table"
                data={tables.map((input) => ({ value: input.key, label: input.name }))}
                value={via?.key ?? null}
                allowDeselect={false}
                onChange={(value) => {
                    const next = tables.find((input) => input.key === value);
                    if (next !== undefined) {
                        change({
                            ...choices,
                            via: next.key,
                            mapping: { columns: [next.columns[0] ?? "id", next.columns[1] ?? next.columns[0] ?? "id"] },
                        });
                    }
                }}
            />
            <Select
                size="xs"
                w={112}
                aria-label="Mapping from"
                data={via?.columns ?? []}
                value={fromColumn ?? null}
                allowDeselect={false}
                onChange={(value) => {
                    if (value !== null) {
                        setColumns([value, toColumn ?? value]);
                    }
                }}
            />
            <GLYPHS.go size={12} aria-hidden />
            <Select
                size="xs"
                w={112}
                aria-label="Mapping to"
                data={via?.columns ?? []}
                value={toColumn ?? null}
                allowDeselect={false}
                onChange={(value) => {
                    if (value !== null) {
                        setColumns([fromColumn ?? value, value]);
                    }
                }}
            />
        </span>
    );
}

/**
 * A kind's own choices: ends and pairs for edges, the link's columns and caps, a merge's
 * unmatched rows, a flag's column, a split's separator.
 * @param props - Component props
 * @param props.op - the kind.
 * @param props.choices - the step's join.
 * @param props.fromColumns - the input's columns.
 * @param props.change - writes the step's choices.
 * @returns the choices, or null for a kind with none.
 */
function OpSettings({
    op,
    choices,
    fromColumns,
    change,
}: Readonly<{
    op: JoinOp;
    choices: JoinChoices;
    fromColumns: readonly string[];
    change: (next: JoinChoices) => void;
}>): React.JSX.Element | null {
    if (op === "edges" || op === "kind" || op === "split") {
        const perPair = choices.aggregate !== undefined;
        return (
            <>
                <SegmentedControl
                    size="xs"
                    aria-label="Unknown ends"
                    value={choices.unknownEnds ?? "add"}
                    data={[
                        { value: "add", label: "Add ends" },
                        { value: "leave-out", label: "Skip unknown" },
                    ]}
                    onChange={(value) => {
                        change({ ...choices, unknownEnds: value === "leave-out" ? "leave-out" : "add" });
                    }}
                />
                <SegmentedControl
                    size="xs"
                    aria-label="Edges"
                    value={perPair ? "pair" : "row"}
                    data={[
                        { value: "row", label: "Per row" },
                        { value: "pair", label: "Per pair" },
                    ]}
                    onChange={(value) => {
                        const { aggregate: _dropped, ...rest } = choices;
                        const key = choices.keys[0]?.file;
                        change(
                            value === "pair" && key !== undefined ? { ...rest, aggregate: { [key]: "count" } } : rest,
                        );
                    }}
                />
                {op === "split" ? (
                    <TextInput
                        size="xs"
                        w={48}
                        aria-label="Separator"
                        value={Object.values(choices.split ?? {})[0] ?? ""}
                        onChange={(event) => {
                            const column = choices.keys[1]?.file;
                            const separator = event.currentTarget.value;
                            if (column !== undefined && separator !== "") {
                                change({ ...choices, split: { [column]: separator } });
                            }
                        }}
                    />
                ) : null}
            </>
        );
    }
    if (op === "link") {
        const link = choices.link ?? { columns: [] };
        return (
            <>
                <MultiSelect
                    size="xs"
                    w={180}
                    aria-label="Link columns"
                    data={fromColumns.filter((column) => column !== choices.keys[0]?.file)}
                    value={[...link.columns]}
                    onChange={(columns) => {
                        change({ ...choices, link: { ...link, columns } });
                    }}
                />
                <SegmentedControl
                    size="xs"
                    aria-label="Link as"
                    value={link.as ?? "edges"}
                    data={[
                        { value: "edges", label: "Edges" },
                        { value: "nodes", label: "Value nodes" },
                    ]}
                    onChange={(value) => {
                        change({ ...choices, link: { ...link, as: value === "nodes" ? "nodes" : "edges" } });
                    }}
                />
                <NumberInput
                    size="xs"
                    w={72}
                    aria-label="Hub cap"
                    min={2}
                    value={link.maxShared ?? 10}
                    onChange={(value) => {
                        if (typeof value === "number") {
                            change({ ...choices, link: { ...link, maxShared: value } });
                        }
                    }}
                />
                {link.as === "nodes" ? null : (
                    <NumberInput
                        size="xs"
                        w={64}
                        aria-label="Minimum shared"
                        min={1}
                        value={link.minShared ?? 1}
                        onChange={(value) => {
                            if (typeof value === "number") {
                                change({ ...choices, link: { ...link, minShared: value } });
                            }
                        }}
                    />
                )}
            </>
        );
    }
    if (op === "merge") {
        return (
            <SegmentedControl
                size="xs"
                aria-label="Unmatched rows"
                value={choices.unmatchedFrom ?? "keep"}
                data={[
                    { value: "keep", label: "Keep unmatched" },
                    { value: "drop", label: "Drop unmatched" },
                ]}
                onChange={(value) => {
                    change({ ...choices, unmatchedFrom: value === "drop" ? "drop" : "keep" });
                }}
            />
        );
    }
    if (op === "flag") {
        return (
            <TextInput
                size="xs"
                w={120}
                aria-label="Flag column"
                value={choices.flag ?? ""}
                onChange={(event) => {
                    change({ ...choices, flag: event.currentTarget.value });
                }}
            />
        );
    }
    return null;
}

/**
 * A toggle of the bar: pressed or not.
 * @param props - Component props
 * @param props.label - its accessible name.
 * @param props.pressed - whether it is on.
 * @param props.onClick - the press.
 * @param props.children - its face.
 * @returns the button.
 */
function ToggleButton({
    label,
    pressed,
    onClick,
    children,
}: Readonly<{ label: string; pressed: boolean; onClick: () => void; children: React.ReactNode }>): React.JSX.Element {
    return (
        <Button
            size="compact-xs"
            variant={pressed ? "light" : "default"}
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
        >
            {children}
        </Button>
    );
}

/**
 * The shown join's counts: a chip per row fate (pressed, it picks those rows and elements out), what
 * it makes, the matches that ignoring case or spaces would add (pressed, it ignores them), and
 * the conflicts review.
 * @param props - Component props
 * @returns the counts row.
 */
function Counts(
    props: JoinBarProps & { readonly step: JoinStepEntry; readonly outcome: JoinStepOutcome },
): React.JSX.Element {
    const api = useJoinWorkspace();
    const { step, outcome } = props;
    const { report } = outcome;
    const refusal = refusalWords(outcome);
    const change = (next: JoinChoices): void => {
        api.edit((draft) => {
            draft.change(step.id, { from: step.from, choices: next });
        });
    };
    return (
        <div className="jwc-row" role="group" aria-label="Counts">
            {refusal === undefined ? null : (
                <Text span size="sm" c="red" fw={600}>
                    ! {refusal}
                </Text>
            )}
            {report === undefined ? null : (
                <>
                    {FATES.map((fate) => {
                        const { total } = api.draft.rows(step.id, { fate, limit: 0 });
                        if (total === 0) {
                            return null;
                        }
                        const key = `fate:${fate}`;
                        const pressed = props.focus?.key === key;
                        return (
                            <Button
                                key={fate}
                                size="compact-xs"
                                variant={pressed ? "light" : "subtle"}
                                color="gray"
                                aria-pressed={pressed}
                                className="jwc-chip"
                                onClick={() => {
                                    props.onFocus(pressed ? null : { key, fate });
                                }}
                            >
                                <b>{formatNumber(total)}</b>&nbsp;{ROW_FATE_WORDS[fate].toLowerCase()}
                            </Button>
                        );
                    })}
                    <Made report={report} />
                    <Hint
                        count={report.extraIgnoringCase}
                        face="Aa"
                        label="Ignore case"
                        onClick={() => {
                            change({ ...step.choices, ignoreCase: true });
                        }}
                    />
                    <Hint
                        count={report.extraIgnoringSpaces}
                        face="a b"
                        label="Ignore spaces"
                        onClick={() => {
                            change({ ...step.choices, ignoreSpaces: true });
                        }}
                    />
                    <span className="jwc-spacer" />
                    <ConflictsButton
                        step={step}
                        report={report}
                        open={props.conflicts}
                        onOpen={props.onConflicts}
                        shortcut={formatKey(BAR_KEYS.conflicts)}
                    />
                </>
            )}
        </div>
    );
}

/**
 * What a join makes and what it could not read: nodes, edges, unmapped keys, hub values.
 * @param props - Component props
 * @param props.report - its counts.
 * @returns the counts.
 */
function Made({ report }: Readonly<{ report: JoinReport }>): React.JSX.Element {
    const made = [
        { count: report.newNodes, words: "nodes", plus: true },
        { count: report.newEdges, words: "edges", plus: true },
        { count: report.updatedNodes, words: "updated", plus: false },
        { count: report.unmapped, words: "unmapped", plus: false },
        { count: report.valuesOverCap, words: "hub values", plus: false },
    ].filter((each) => each.count > 0);
    return (
        <>
            {made.map((each) => (
                <Text key={each.words} span size="sm" c="dimmed" className="jwc-made">
                    <b>
                        {each.plus ? "+" : ""}
                        {formatNumber(each.count)}
                    </b>{" "}
                    {each.words}
                </Text>
            ))}
        </>
    );
}

/**
 * The matches a matching option would add: pressed, it turns the option on.
 * @param props - Component props
 * @param props.count - the matches.
 * @param props.face - the option's face.
 * @param props.label - the option's name.
 * @param props.onClick - turns it on.
 * @returns the hint, or null when it adds none.
 */
function Hint({
    count,
    face,
    label,
    onClick,
}: Readonly<{ count: number; face: string; label: string; onClick: () => void }>): React.JSX.Element | null {
    if (count === 0) {
        return null;
    }
    return (
        <Button size="compact-xs" variant="light" aria-label={`${label} +${String(count)}`} onClick={onClick}>
            +{formatNumber(count)} {face}
        </Button>
    );
}
