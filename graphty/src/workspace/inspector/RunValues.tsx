import { ControlSection, DataRow, DataRowHeader, HistogramRow, StyleNumberInput } from "@graphty/compact-mantine";
import type { OptionDescriptor } from "@graphty/graphty-element/catalog";
import {
    type GraphSession,
    RESULT_SHAPE_CONTRACTS,
    type Run,
    type RunId,
    type ScopeInput,
} from "@graphty/graphty-element/session";
import { Button, Checkbox, Group, Select, Text } from "@mantine/core";
import type React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { useAsyncValue } from "./hooks";
import { groupKey, nodeKey } from "./inspected";
import { type Draft, selectNode, settingsChanged, settingsOf } from "./reads";
import { count, formatNumber, runDate } from "./words";

/** How many top elements and group members a Values tab lists. */
const TOP = 10;

/**
 * The state bar (tier1-design.md section 2.7): at most two buttons, only when needed.
 * @param props - Component props
 * @param props.run - The run
 * @param props.draft - The reader's changes to its settings
 * @param props.onDraft - Replaces the changes
 * @returns The bar, or nothing when nothing needs saying
 */
export function RunStateBar({
    run,
    draft,
    onDraft,
}: {
    run: Run;
    draft: Draft;
    onDraft: (draft: Draft) => void;
}): React.JSX.Element | null {
    const { session } = useWorkspace();
    let words: string;
    let buttons: React.ReactNode;
    if (run.status === "queued" || run.status === "running") {
        words = "Running";
        buttons = run.cancellable && (
            <Button
                size="compact-xs"
                variant="default"
                onClick={() => {
                    run.cancel();
                }}
            >
                Cancel
            </Button>
        );
    } else if (run.status === "failed") {
        words = `The run failed (${run.error?.code ?? "no code"})`;
    } else if (settingsChanged(run, draft)) {
        words = "Settings changed since the run";
        buttons = (
            <>
                <Button
                    size="compact-xs"
                    onClick={() => {
                        session?.runs.start(run.algorithm, settingsOf(run, draft), { as: run.id });
                        onDraft({});
                    }}
                >
                    Rerun
                </Button>
                <Button
                    size="compact-xs"
                    variant="default"
                    onClick={() => {
                        onDraft({});
                    }}
                >
                    Revert
                </Button>
            </>
        );
    } else {
        return null;
    }
    return (
        <Group role="status" gap={6} px="md" py={4} justify="space-between" wrap="nowrap" bg="var(--mantine-color-default-hover)">
            <Text size="xs">{words}</Text>
            <Group gap={4} wrap="nowrap">
                {buttons}
            </Group>
        </Group>
    );
}

/**
 * One setting of the run, drawn from graphty-element's option descriptor.
 * @param props - Component props
 * @param props.option - The descriptor
 * @param props.value - The value now
 * @param props.onChange - Called with a new value
 * @returns The control, or nothing for a kind of option the Values tab does not edit
 */
function SettingField({
    option,
    value,
    onChange,
}: {
    option: OptionDescriptor;
    value: unknown;
    onChange: (value: unknown) => void;
}): React.JSX.Element | null {
    switch (option.type) {
        case "number":
        case "integer":
            return (
                <StyleNumberInput
                    label={option.plainName}
                    value={typeof value === "number" ? value : undefined}
                    defaultValue={typeof option.default === "number" ? option.default : 0}
                    min={typeof option.min === "number" ? option.min : undefined}
                    max={typeof option.max === "number" ? option.max : undefined}
                    step={option.step ?? (option.type === "integer" ? 1 : undefined)}
                    decimalScale={option.type === "integer" ? 0 : undefined}
                    onChange={onChange}
                />
            );
        case "enum":
            return (
                <Select
                    size="xs"
                    label={option.plainName}
                    value={typeof value === "string" ? value : null}
                    data={(option.values ?? []).map(({ value: v, label }) => ({ value: v, label: label ?? v }))}
                    allowDeselect={false}
                    onChange={onChange}
                />
            );
        case "boolean":
            return (
                <Checkbox
                    size="xs"
                    label={option.plainName}
                    checked={value === true}
                    onChange={(event) => {
                        onChange(event.currentTarget.checked);
                    }}
                />
            );
        default:
            return null;
    }
}

/**
 * Made with (tier1-design.md section 2.7, runs only): the algorithm and its settings, editable;
 * a change raises the state bar's Rerun and Revert.
 * @param props - Component props
 * @param props.run - The run
 * @param props.draft - The reader's changes
 * @param props.onDraft - Replaces the changes
 * @returns The section
 */
function MadeWith({ run, draft, onDraft }: { run: Run; draft: Draft; onDraft: (draft: Draft) => void }): React.JSX.Element {
    const { session } = useWorkspace();
    const descriptor = session?.catalog.algorithms().find((algorithm) => algorithm.key === run.algorithm);
    const settings = settingsOf(run, draft);
    const options = (descriptor?.options ?? []).filter((option) => option.internal !== true && option.advanced !== true);
    const date = runDate(run.startedAt);

    return (
        <ControlSection label="Made with" defaultOpened>
            <DataRow stat name="Analysis" value={descriptor?.plainName ?? run.algorithm} />
            {date !== null && <DataRow stat name="Ran" value={date} />}
            {options.map((option) => (
                <div key={option.name} style={{ padding: "0 16px" }}>
                    <SettingField
                        option={option}
                        value={settings[option.name] ?? option.default}
                        onChange={(value) => {
                            onDraft({ ...draft, [option.name]: value });
                        }}
                    />
                </div>
            ))}
        </ControlSection>
    );
}

/**
 * The measure's values: the histogram with its caption, then the top 10 with ties kept whole,
 * each name selecting what it names.
 * @param props - Component props
 * @param props.session - The session
 * @param props.run - The run
 * @param props.field - The field the run is read by
 * @returns The sections
 */
function MeasureValues({ session, run, field }: { session: GraphSession; run: Run; field: string }): React.JSX.Element | null {
    const { result } = run;
    if (result === undefined) {
        return null;
    }
    const summary = result.summary();
    const histogram = result.histogram(field);
    const labels = new Map(summary.top.map((entry) => [nodeKey(entry.id), entry.label]));
    const top = result.top(field, TOP);
    const first = histogram.bins.at(0);
    const last = histogram.bins.at(-1);

    return (
        <>
            <ControlSection label="Values" defaultOpened>
                {first !== undefined && last !== undefined && (
                    <HistogramRow
                        label={run.label}
                        bins={histogram.bins.map((bin) => ({
                            label: `${formatNumber(bin.from)} to ${formatNumber(bin.to)}: ${count(bin.count, "node")}`,
                            count: bin.count,
                        }))}
                        minLabel={formatNumber(first.from)}
                        maxLabel={formatNumber(last.to)}
                    />
                )}
                {summary.min !== null && summary.max !== null && summary.median !== null && (
                    <Text size="xs" c="dimmed" px="md">
                        {`${formatNumber(summary.measured)} of ${formatNumber(summary.count)} have a value, ${formatNumber(summary.min)} to ${formatNumber(summary.max)}, median ${formatNumber(summary.median)}`}
                    </Text>
                )}
            </ControlSection>
            <ControlSection label={`Top ${String(TOP)}`} defaultOpened>
                {top.entries.map((entry) => (
                    <DataRow
                        key={nodeKey(entry.id)}
                        name={labels.get(nodeKey(entry.id)) ?? String(entry.id)}
                        value={formatNumber(entry.value)}
                        onClick={() => {
                            selectNode(session, entry.id);
                        }}
                    />
                ))}
            </ControlSection>
        </>
    );
}

/**
 * A grouping run's values: Summary (how many groups, the quality score when the run has one),
 * then Sizes, one bar per group.
 * @param props - Component props
 * @param props.run - The run
 * @returns The sections
 */
function GroupsValues({ run }: { run: Run }): React.JSX.Element | null {
    const { store } = useWorkspace();
    const groups = run.result?.summary().groups;
    if (run.result === undefined || groups === undefined) {
        return null;
    }
    const {modularity} = run.result.graph;
    const band = run.result.band("modularity");

    return (
        <>
            <ControlSection label="Summary" defaultOpened>
                <DataRow stat name="Groups" value={groups.length} />
                {typeof modularity === "number" && (
                    <DataRow
                        stat
                        name="Modularity"
                        value={`${formatNumber(modularity)}${band === undefined ? "" : `, ${band.plainName}`}`}
                    />
                )}
            </ControlSection>
            <ControlSection label="Sizes" defaultOpened>
                <HistogramRow
                    label="Group sizes"
                    bins={groups.map((group) => ({
                        label: `${group.name ?? String(group.group)}: ${count(group.size, "node")}`,
                        count: group.size,
                    }))}
                    minLabel={groups.at(0)?.name ?? ""}
                    maxLabel={groups.at(-1)?.name ?? ""}
                />
                {groups.map((group) => (
                    <DataRow
                        key={String(group.group)}
                        name={group.name ?? String(group.group)}
                        value={group.size}
                        onClick={() => {
                            store.set({ inspected: { kind: "group-row", id: groupKey(run.id, group.group) } });
                        }}
                    />
                ))}
            </ControlSection>
        </>
    );
}

/**
 * A run row's Values tab (tier1-design.md section 2.7): a measure's histogram and top 10, or a
 * grouping's summary and sizes; then Made with.
 * @param props - Component props
 * @param props.run - The run
 * @param props.draft - The reader's changes to its settings
 * @param props.onDraft - Replaces the changes
 * @returns The tab
 */
export function RunValues({ run, draft, onDraft }: { run: Run; draft: Draft; onDraft: (draft: Draft) => void }): React.JSX.Element | null {
    const { session } = useWorkspace();
    if (session === null) {
        return null;
    }
    const field = RESULT_SHAPE_CONTRACTS[run.shape].primaryField;
    const grouping = run.result?.summary().groups !== undefined;
    return (
        <>
            {run.status === "succeeded" && field !== null && !grouping && <MeasureValues session={session} run={run} field={field} />}
            {run.status === "succeeded" && grouping && <GroupsValues run={run} />}
            <MadeWith run={run} draft={draft} onDraft={onDraft} />
        </>
    );
}

/**
 * The elements of one group, as a scope graphty-element resolves.
 * @param run - the grouping run.
 * @param field - the field its groups are read by.
 * @param group - the group.
 * @returns the scope.
 */
function groupScope(run: RunId, field: string, group: string | number): ScopeInput {
    return {
        define: { kind: "rule", where: { kind: "item", item: { result: run, key: { field, value: group } } }, reading: "induced" },
    };
}

/**
 * A group row's Values tab (tier1-design.md section 2.7): Summary (its size, a link that selects
 * its members) and its first members, each a link that selects that node. Members are named by
 * id until graphty-element publishes a node's name (#895).
 * @param props - Component props
 * @param props.run - The grouping run
 * @param props.group - The group
 * @param props.version - Changes whenever the element reports a change
 * @returns The tab
 */
export function GroupValues({ run, group, version }: { run: Run; group: string | number; version: number }): React.JSX.Element | null {
    const { session } = useWorkspace();
    const field = RESULT_SHAPE_CONTRACTS[run.shape].primaryField;
    const scope = field === null ? null : groupScope(run.id, field, group);
    const members = useAsyncValue(() => (scope === null ? null : (session?.scope.resolve(scope) ?? null)), `${String(version)}:${String(group)}`);
    if (session === null || scope === null) {
        return null;
    }
    const size = run.result?.summary().groups?.find((g) => g.group === group)?.size;

    return (
        <>
            <ControlSection label="Summary" defaultOpened>
                {size !== undefined && (
                    <DataRow
                        name="Size"
                        value={size}
                        onClick={() => {
                            void session.selection.apply({ scope });
                        }}
                    />
                )}
                <DataRow stat name="Made by" value={run.label} />
            </ControlSection>
            {members !== undefined && (
                <ControlSection label="Members" defaultOpened>
                    <DataRowHeader label={`First ${String(Math.min(TOP, members.nodeCount))}`} />
                    {[...members.nodes].slice(0, TOP).map((id) => (
                        <DataRow
                            key={nodeKey(id)}
                            name={String(id)}
                            onClick={() => {
                                selectNode(session, id);
                            }}
                        />
                    ))}
                </ControlSection>
            )}
        </>
    );
}
