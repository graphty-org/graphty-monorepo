import type { JoinChoices, JoinReport, JoinStepEntry } from "@graphty/graphty-element/session";
import { NumberInput, Select } from "@mantine/core";
import React from "react";

import { useJoinWorkspace } from "../context";
import { changeStep, type ChoicesPatch } from "./choices";
import { ColumnChips, CommitInput, Row, Seg } from "./controls";
import type { Outcome } from "./outcomes";

/** Several rows naming one node: the first row's values, a list of every row's, or a count. */
type ManyRows = "first" | "list" | "count";

/**
 * How a Fields card reads several rows naming one node.
 * @param choices - the step's choices.
 * @returns the choice.
 */
function manyRowsOf(choices: JoinChoices): ManyRows {
    if (choices.aggregate !== undefined) {
        return "count";
    }
    return choices.repeated === "both" ? "list" : "first";
}

/** The clash rules a Fields card offers, by the element's rule. */
const CLASH_RULES = [
    { value: "keep", label: "Keep" },
    { value: "overwrite", label: "New" },
    { value: "both", label: "Both" },
] as const;

/**
 * The options of the answer a card picked; only that answer's.
 * @param props - Component props
 * @param props.step - the card's step.
 * @param props.outcome - its answer.
 * @param props.report - its step's report, or undefined when it cannot run.
 * @returns the options' rows.
 */
export function Options({
    step,
    outcome,
    report,
}: Readonly<{ step: JoinStepEntry; outcome: Outcome; report: JoinReport | undefined }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const { choices } = step;
    const set = (patch: ChoicesPatch): void => {
        changeStep(api, step, patch);
    };
    const columns = api.draft.inputs.find((each) => each.key === step.from)?.columns ?? [];
    const keyFiles = new Set(choices.keys.map((key) => key.file));
    const offered = columns.filter((column) => !keyFiles.has(column) && column !== choices.rowNode?.id);
    const bring = (
        <Row key="bring" label="Bring">
            <ColumnChips
                label="Bring"
                columns={offered}
                chosen={choices.columns ?? offered}
                onChange={(chosen) => {
                    set({ columns: chosen.length === offered.length ? undefined : chosen });
                }}
            />
        </Row>
    );

    if (outcome === "edge") {
        return (
            <>
                <Row label="No match">
                    <Seg
                        label="No match"
                        value={choices.unknownEnds ?? "add"}
                        data={[
                            { value: "add", label: "Add node" },
                            { value: "leave-out", label: "Skip row" },
                        ]}
                        onChange={(value) => {
                            set({ unknownEnds: value === "add" ? undefined : "leave-out" });
                        }}
                    />
                </Row>
                <Row label="Edges">
                    <Seg
                        label="Edges"
                        value={choices.repeated === "both" ? "row" : "pair"}
                        data={[
                            { value: "pair", label: "Per pair" },
                            { value: "row", label: "Per row" },
                        ]}
                        onChange={(value) => {
                            set({ repeated: value === "row" ? "both" : undefined });
                        }}
                    />
                </Row>
                <Row label="Existing">
                    <Seg
                        label="Existing edge"
                        value={choices.existingEdges ?? "add"}
                        data={[
                            { value: "add", label: "Add another" },
                            { value: "merge", label: "Merge into it" },
                        ]}
                        onChange={(value) => {
                            set({ existingEdges: value === "merge" ? "merge" : undefined });
                        }}
                    />
                </Row>
                {bring}
            </>
        );
    }

    if (outcome === "node") {
        return (
            <>
                <Row label="Row id">
                    <Select
                        size="xs"
                        aria-label="Row id"
                        data={[
                            { value: "", label: "row number" },
                            ...columns.map((column) => ({ value: column, label: column })),
                        ]}
                        value={choices.rowNode?.id ?? ""}
                        allowDeselect={false}
                        comboboxProps={{ withinPortal: true }}
                        onChange={(value) => {
                            set({
                                rowNode: { ...choices.rowNode, id: value === "" || value === null ? undefined : value },
                            });
                        }}
                    />
                </Row>
                <Row label="Kind">
                    <CommitInput
                        label="Kind"
                        value={choices.rowNode?.kind ?? ""}
                        onCommit={(kind) => {
                            set({ rowNode: { ...choices.rowNode, kind: kind === "" ? undefined : kind } });
                        }}
                    />
                </Row>
                {bring}
            </>
        );
    }

    if (outcome === "links") {
        const link = choices.link ?? { columns: [] };
        return (
            <>
                <Row label="Shared">
                    <ColumnChips
                        label="Shared"
                        columns={offered}
                        chosen={link.columns}
                        onChange={(chosen) => {
                            set({ link: { ...link, columns: chosen } });
                        }}
                    />
                </Row>
                <Row label="Draw">
                    <Seg
                        label="Draw"
                        value={link.as ?? "edges"}
                        data={[
                            { value: "edges", label: "Links" },
                            { value: "nodes", label: "Value nodes" },
                        ]}
                        onChange={(value) => {
                            set({ link: { ...link, as: value === "nodes" ? "nodes" : undefined } });
                        }}
                    />
                </Row>
                <Row label="Hub cap">
                    <NumberInput
                        size="xs"
                        w={72}
                        aria-label="Hub cap"
                        min={2}
                        value={link.maxShared ?? 10}
                        onChange={(value) => {
                            if (typeof value === "number") {
                                set({ link: { ...link, maxShared: value } });
                            }
                        }}
                    />
                </Row>
                <Row label="At least">
                    <NumberInput
                        size="xs"
                        w={72}
                        aria-label="At least"
                        min={1}
                        value={link.minShared ?? 1}
                        onChange={(value) => {
                            if (typeof value === "number") {
                                set({ link: { ...link, minShared: value } });
                            }
                        }}
                    />
                </Row>
            </>
        );
    }

    // Fields on a node.
    const adding = choices.shape === "merge";
    const key = choices.keys[0]?.file;
    const many = manyRowsOf(choices);
    return (
        <>
            <Row label="No match">
                <Seg
                    label="No match"
                    value={adding ? "add" : "skip"}
                    data={[
                        { value: "skip", label: "Skip" },
                        { value: "add", label: "Add" },
                    ]}
                    onChange={(value) => {
                        set(
                            value === "add"
                                ? { shape: "merge" }
                                : { shape: "node-values", compare: undefined, membership: undefined },
                        );
                    }}
                />
                {adding ? (
                    <Seg
                        label="Record source"
                        value={choices.compare === true ? "on" : "off"}
                        data={[
                            { value: "off", label: "No source" },
                            { value: "on", label: "Record source" },
                        ]}
                        onChange={(value) => {
                            set({ compare: value === "on" ? true : undefined });
                        }}
                    />
                ) : null}
            </Row>
            <Row label="Many rows">
                <Seg
                    label="Many rows"
                    value={many}
                    data={[
                        { value: "first", label: "First" },
                        { value: "list", label: "List" },
                        { value: "count", label: "Count" },
                    ]}
                    onChange={(value) => {
                        if (value === "count" && key !== undefined) {
                            set({ repeated: undefined, aggregate: { [key]: "count" }, columns: [] });
                        } else {
                            set({
                                repeated: value === "list" ? "both" : undefined,
                                aggregate: undefined,
                                columns: undefined,
                            });
                        }
                    }}
                />
            </Row>
            {many === "count" ? null : bring}
            <Row label="Mark">
                <CommitInput
                    label="Mark"
                    placeholder="on_list"
                    value={choices.flag ?? ""}
                    onCommit={(flag) => {
                        set({ flag: flag === "" ? undefined : flag });
                    }}
                />
            </Row>
            {choices.compare === true
                ? null
                : (report?.clashes ?? []).map(({ column }) => (
                      <Row key={`clash-${column}`} label={column}>
                          <Seg
                              label={`Clash ${column}`}
                              value={choices.clash?.[column] ?? "both"}
                              data={CLASH_RULES}
                              onChange={(value) => {
                                  const rule = CLASH_RULES.find((each) => each.value === value)?.value ?? "both";
                                  set({ clash: { ...choices.clash, [column]: rule } });
                              }}
                          />
                      </Row>
                  ))}
        </>
    );
}
