import { Popout } from "@graphty/compact-mantine";
import type { JoinReduce, JoinReport, JoinStepEntry } from "@graphty/graphty-element/session";
import { Badge, Button, Group, NumberInput, SegmentedControl, Select, Table, Text } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../../glyphs";
import { useJoinWorkspace } from "../context";
import { changeStep } from "./choices";
import { conflictCount, type JoinOp } from "./ops";

/** A clashing column's rule: one of the element's clash choices, or a fuse reduction. */
type Rule = "both" | "keep" | "overwrite" | JoinReduce;

/** The rules a clashing column can take, and their words. */
const RULES: readonly { value: Rule; label: string }[] = [
    { value: "both", label: "keep both" },
    { value: "keep", label: "keep graph value" },
    { value: "overwrite", label: "take incoming" },
    { value: "mean", label: "average" },
    { value: "sum", label: "sum" },
    { value: "min", label: "min" },
    { value: "max", label: "max" },
    { value: "list", label: "keep all as list" },
];

/** The reductions a pair's rows can take, for one edge per pair. */
const REDUCTIONS: readonly JoinReduce[] = ["sum", "mean", "min", "max", "count", "first", "last", "list"];

/**
 * A value as one short line.
 * @param value - the value.
 * @returns the text.
 */
function text(value: unknown): string {
    if (value === undefined || value === null) {
        return "";
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return Array.isArray(value) ? value.map(text).join(";") : JSON.stringify(value);
}

/**
 * A copy of a record without one entry.
 * @param record - the record, or undefined.
 * @param name - the entry to leave out.
 * @returns the copy.
 */
function without<T>(record: Readonly<Record<string, T>> | undefined, name: string): Record<string, T> {
    return Object.fromEntries(Object.entries(record ?? {}).filter(([key]) => key !== name));
}

/**
 * A card's Conflicts button and, on a press, its conflicts review: per clashing column its count,
 * a fusion rule and one clash (graph and incoming values, from `draft.clashes`); the repeated keys
 * and how their rows reduce; unmapped keys; values shared too widely; new nodes.
 * @param props - Component props
 * @param props.step - the step.
 * @param props.op - its intent.
 * @param props.report - its report, or undefined when it cannot run.
 * @returns the button and its review.
 */
export function ConflictsButton({
    step,
    op,
    report,
}: Readonly<{ step: JoinStepEntry; op: JoinOp; report: JoinReport | undefined }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const [open, setOpen] = useState(false);
    const count = report === undefined ? 0 : conflictCount(api.draft, step.id, report);
    return (
        <Popout opened={open} onOpenChange={setOpen}>
            <Popout.Trigger>
                <Button
                    size="compact-xs"
                    variant={count > 0 ? "light" : "subtle"}
                    color={count > 0 ? "yellow" : undefined}
                    disabled={report === undefined}
                    leftSection={<GLYPHS.warning size={12} aria-hidden />}
                    onClick={() => {
                        api.select(step.id);
                    }}
                >
                    Conflicts {count}
                </Button>
            </Popout.Trigger>
            <Popout.Panel
                width={560}
                placement="right"
                header={{ variant: "title", title: `Conflicts ${String(count)}` }}
                closeLabel="Close Conflicts"
            >
                <Popout.Content>
                    {open && report !== undefined ? <Review step={step} op={op} report={report} /> : null}
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * A heading of the review with its count.
 * @param props - Component props
 * @param props.title - the heading.
 * @param props.count - the count.
 * @param props.children - controls after it.
 * @returns the heading.
 */
function Section({
    title,
    count,
    children,
}: Readonly<{ title: string; count: number; children?: React.ReactNode }>): React.JSX.Element {
    return (
        <Group gap={6} wrap="nowrap" className="jr-sub">
            <Text size="sm" fw={600} c="dimmed">
                {title}
            </Text>
            <Badge size="sm" variant="light" color={count > 0 ? "yellow" : "gray"}>
                {count}
            </Badge>
            <span className="sel-spacer" />
            {children}
        </Group>
    );
}

/**
 * The review's body.
 * @param props - Component props
 * @param props.step - the step.
 * @param props.op - its intent.
 * @param props.report - its report.
 * @returns the body.
 */
function Review({
    step,
    op,
    report,
}: Readonly<{ step: JoinStepEntry; op: JoinOp; report: JoinReport }>): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft } = api;
    const { choices } = step;
    const ruleOf = (column: string): Rule => choices.fuse?.[column] ?? choices.clash?.[column] ?? "both";
    const setRule = (column: string, rule: Rule): void => {
        const fuse: Record<string, JoinReduce> = without(choices.fuse, column);
        const clash: Record<string, "both" | "keep" | "overwrite"> = without(choices.clash, column);
        if (rule === "both" || rule === "keep" || rule === "overwrite") {
            clash[column] = rule;
        } else {
            fuse[column] = rule;
        }
        changeStep(api, step, {
            fuse: Object.keys(fuse).length === 0 ? undefined : fuse,
            clash: Object.keys(clash).length === 0 ? undefined : clash,
        });
    };
    const clashes = report.clashes.map((each) => {
        const page = draft.clashes(step.id, each.column, { limit: 1 });
        return { column: each.column, total: page.total, first: page.items[0] };
    });
    const input = draft.inputs.find((each) => each.key === step.from);
    const keyColumns = new Set(choices.keys.map((key) => key.file));
    const pairColumns = (input?.columns ?? []).filter((column) => !keyColumns.has(column));
    const perPair = choices.aggregate !== undefined || choices.repeated !== "both";
    return (
        <div className="jr-review">
            {op !== "compare" && (
                <>
                    <Section title="Clashes" count={clashes.reduce((sum, each) => sum + each.total, 0)} />
                    {clashes.length > 0 && (
                        <Table className="jr-table" withRowBorders>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Column</Table.Th>
                                    <Table.Th>Rows</Table.Th>
                                    <Table.Th>Rule</Table.Th>
                                    <Table.Th>Graph</Table.Th>
                                    <Table.Th>Incoming</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {clashes.map((each) => (
                                    <Table.Tr key={each.column}>
                                        <Table.Td fw={600}>{each.column}</Table.Td>
                                        <Table.Td>{each.total}</Table.Td>
                                        <Table.Td>
                                            <Select
                                                size="xs"
                                                aria-label={`${each.column} rule`}
                                                data={RULES}
                                                value={ruleOf(each.column)}
                                                allowDeselect={false}
                                                comboboxProps={{ withinPortal: false }}
                                                onChange={(value) => {
                                                    if (value !== null) {
                                                        setRule(each.column, value as Rule);
                                                    }
                                                }}
                                            />
                                        </Table.Td>
                                        <Table.Td className="jr-mono">{text(each.first?.graph)}</Table.Td>
                                        <Table.Td className="jr-mono">{text(each.first?.incoming)}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    )}
                </>
            )}
            <Section title={op === "edges" ? "Repeated pairs" : "Repeated keys"} count={report.repeatedKeys}>
                {op === "edges" ? (
                    <SegmentedControl
                        size="xs"
                        aria-label="Edges"
                        value={perPair ? "pair" : "row"}
                        data={[
                            { value: "row", label: "one per row" },
                            { value: "pair", label: "one per pair" },
                        ]}
                        onChange={(value) => {
                            changeStep(
                                api,
                                step,
                                value === "row" ? { repeated: "both", aggregate: undefined } : { repeated: undefined },
                            );
                        }}
                    />
                ) : (
                    (op === "values" || op === "map") && (
                        <SegmentedControl
                            size="xs"
                            aria-label="Repeated rows"
                            value={choices.repeated ?? "first"}
                            data={[
                                { value: "first", label: "first" },
                                { value: "last", label: "last" },
                                { value: "both", label: "list" },
                            ]}
                            onChange={(value) => {
                                changeStep(api, step, { repeated: value as "first" | "last" | "both" });
                            }}
                        />
                    )
                )}
            </Section>
            {op === "edges" && perPair && pairColumns.length > 0 && (
                <Table className="jr-table">
                    <Table.Tbody>
                        {pairColumns.map((column) => (
                            <Table.Tr key={column}>
                                <Table.Td>{column}</Table.Td>
                                <Table.Td>
                                    <Select
                                        size="xs"
                                        aria-label={`${column} per pair`}
                                        placeholder="-"
                                        data={REDUCTIONS.map((each) => ({ value: each, label: each }))}
                                        value={(choices.aggregate?.[column] as JoinReduce | undefined) ?? null}
                                        clearable
                                        comboboxProps={{ withinPortal: false }}
                                        onChange={(value) => {
                                            const aggregate = without(
                                                choices.aggregate as Record<string, JoinReduce> | undefined,
                                                column,
                                            );
                                            if (value !== null) {
                                                aggregate[column] = value as JoinReduce;
                                            }
                                            changeStep(api, step, {
                                                aggregate: Object.keys(aggregate).length === 0 ? undefined : aggregate,
                                            });
                                        }}
                                    />
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            )}
            {op === "map" && (
                <Section title="Unmapped keys" count={report.unmapped}>
                    <Text size="sm" c="dimmed">
                        {report.mappedToMany} to many
                    </Text>
                    <SegmentedControl
                        size="xs"
                        aria-label="To many"
                        value={choices.mapping?.many ?? "first"}
                        data={[
                            { value: "first", label: "first" },
                            { value: "list", label: "all" },
                        ]}
                        onChange={(value) => {
                            changeStep(api, step, { mapping: { ...choices.mapping, many: value as "first" | "list" } });
                        }}
                    />
                </Section>
            )}
            {op === "link" && (
                <Section title="Hub values" count={report.valuesOverCap}>
                    <NumberInput
                        size="xs"
                        w={72}
                        aria-label="Hub cap"
                        min={2}
                        value={choices.link?.maxShared ?? 10}
                        onChange={(value) => {
                            if (typeof value === "number") {
                                changeStep(api, step, { link: { columns: [], ...choices.link, maxShared: value } });
                            }
                        }}
                    />
                </Section>
            )}
            {report.fanOut > 0 && <Section title="One row, many nodes" count={report.fanOut} />}
            {(op === "edges" || op === "kind") && (
                <Section title="New nodes" count={report.newNodes}>
                    <SegmentedControl
                        size="xs"
                        aria-label="Unknown ends"
                        value={choices.unknownEnds ?? "add"}
                        data={[
                            { value: "add", label: "add" },
                            { value: "leave-out", label: "skip" },
                        ]}
                        onChange={(value) => {
                            changeStep(api, step, { unknownEnds: value as "add" | "leave-out" });
                        }}
                    />
                </Section>
            )}
        </div>
    );
}
