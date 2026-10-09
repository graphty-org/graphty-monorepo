import { ControlSection, DataRow, DataRowHeader, HistogramRow } from "@graphty/compact-mantine";
import {
    type GraphSession,
    RESULT_SHAPE_CONTRACTS,
    type Run,
    type RunId,
    type ScopeInput,
} from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text } from "@mantine/core";
import React, { useEffect } from "react";

import { isPathFollow, ranOptionWords, runName, weightRead, wordsFor } from "../analyze/words";
import { focusInspectorTitle } from "../frame/focus";
import { OptionsForm } from "../options/OptionsForm";
import { useWorkspace } from "../state/WorkspaceContext";
import { useAsyncValue } from "./hooks";
import { groupKey, nodeKey } from "./inspected";
import {
    type Draft,
    measuredNoun,
    rowKindOf,
    selectNode,
    settingsChanged,
    settingsOf,
    takePathValuesFocus,
} from "./reads";
import {
    count,
    formatNumber,
    groupName,
    queuedWords,
    rankedName,
    routeWords,
    runFailureWords,
    runTime,
    staleWords,
} from "./words";

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
}: Readonly<{
    run: Run;
    draft: Draft;
    onDraft: (draft: Draft) => void;
}>): React.JSX.Element | null {
    const { session } = useWorkspace();
    let words: string;
    let buttons: React.ReactNode;
    if (run.status === "queued" || run.status === "running") {
        words = run.status === "queued" ? queuedWords(run.queuePosition) : "Running";
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
        words = runFailureWords(run.error?.code);
    } else if (settingsChanged(run, draft)) {
        words = "Settings changed since the run";
        buttons = (
            <>
                <Button
                    size="compact-xs"
                    onClick={() => {
                        session?.runs.start(run.algorithm, settingsOf(run, draft), { as: run.id });
                        onDraft({});
                        // The bar and its Rerun go once the run is current, so focus would fall
                        // to the page: it goes to the inspector's title, as after any run.
                        focusInspectorTitle();
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
    } else if (run.status === "succeeded" && run.stale !== null) {
        // Nothing reruns by itself (tier2-design.md section 7): the reader starts it, here.
        const { scopeSpec } = run.stale;
        words = staleWords(run.stale);
        buttons = (
            <Button
                size="compact-xs"
                onClick={() => {
                    session?.runs.start(run.algorithm, run.params, { as: run.id, scope: scopeSpec });
                    focusInspectorTitle();
                }}
            >
                Rerun
            </Button>
        );
    } else {
        return null;
    }
    return (
        <Group
            role="status"
            gap={6}
            px="md"
            py={4}
            justify="space-between"
            wrap="nowrap"
            bg="var(--mantine-color-default-hover)"
        >
            <Text size="xs">{words}</Text>
            <Group gap={4} wrap="nowrap">
                {buttons}
            </Group>
        </Group>
    );
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
function MadeWith({
    run,
    draft,
    onDraft,
}: Readonly<{
    run: Run;
    draft: Draft;
    onDraft: (draft: Draft) => void;
}>): React.JSX.Element {
    const { session } = useWorkspace();
    const descriptor = session?.catalog.algorithms().find((algorithm) => algorithm.key === run.algorithm);
    const settings = settingsOf(run, draft);
    const date = runTime(run.startedAt);
    const weighted = (descriptor?.weightMeaning ?? null) !== null;
    // The run's nodes (a path's From and To) are facts like Analysis and Ran: rows, in line with
    // them. The weight is one row too, saying what the run read, so it is stated once.
    const options = descriptor?.options ?? [];
    const rows = options.filter((o) => o.type === "node-id" && o.advanced !== true && o.internal !== true);
    // A path's Follow is a row, like its ends, and only on a directed graph: undirected, it changes nothing.
    const follow = options.find((o) => isPathFollow(run.algorithm, o.name));
    const fields = options.filter((o) => !rows.includes(o) && o !== follow && !(weighted && o.name === "weight"));
    const form = (shown: typeof options, advancedLabel?: string): React.JSX.Element | null =>
        session === null || descriptor === undefined ? null : (
            <OptionsForm
                session={session}
                options={shown}
                values={settings}
                words={(option) => ranOptionWords(run, option)}
                weightReads={descriptor.weightMeaning ?? null}
                algorithm={run.algorithm}
                canUseSelectedNode
                advancedLabel={advancedLabel}
                onChange={(name, value) => {
                    onDraft({ ...draft, [name]: value });
                }}
            />
        );

    return (
        <ControlSection label="Made with" defaultOpened>
            <DataRow
                stat
                name="Analysis"
                value={descriptor === undefined ? run.algorithm : wordsFor(descriptor).name}
            />
            {date !== null && <DataRow stat name="Ran" value={date} />}
            {form(rows)}
            {follow !== undefined && session?.status.directed === true && (
                <DataRow
                    stat
                    name={ranOptionWords(run, follow).label}
                    value={ranOptionWords(run, follow).choice(
                        typeof settings.direction === "string" ? settings.direction : "all",
                    )}
                />
            )}
            {run.status === "succeeded" && weighted && <WeightRow run={run} />}
            {fields.length > 0 && (
                <Stack gap={8} px="md">
                    {/* Named for the panel, so it is never taken for a popover's own Advanced. */}
                    {form(fields, "Advanced run settings")}
                </Stack>
            )}
        </ControlSection>
    );
}

/**
 * Made with's Weight: a short value in the row, and its explanation on a line of its own under
 * it, so the value column never holds a wrapped sentence.
 * @param props - Component props
 * @param props.run - The run
 * @returns The row and its note
 */
function WeightRow({ run }: Readonly<{ run: Run }>): React.JSX.Element {
    const { value, note } = weightRead(run.caveats);
    return (
        <>
            <DataRow stat name="Weight" value={value} />
            {note !== null && (
                <Text size="xs" c="dimmed" px="md" pb={8}>
                    {note}
                </Text>
            )}
        </>
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
function MeasureValues({
    session,
    run,
    field,
}: Readonly<{
    session: GraphSession;
    run: Run;
    field: string;
}>): React.JSX.Element | null {
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
                        label={runName(session, run)}
                        bins={histogram.bins.map((bin) => ({
                            label: `${formatNumber(bin.from)} to ${formatNumber(bin.to)}: ${count(bin.count, measuredNoun(run))}`,
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
 * then Sizes: one bar per group until graphty-element bins groups by size (#932), and the ten
 * largest groups, each opening its row.
 * @param props - Component props
 * @param props.run - The run
 * @returns The sections
 */
function GroupsValues({ run }: Readonly<{ run: Run }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const groups = run.result?.summary().groups;
    if (run.result === undefined || groups === undefined) {
        return null;
    }
    const { modularity } = run.result.graph;
    const band = run.result.band("modularity");

    return (
        <>
            <ControlSection label="Summary" defaultOpened>
                <DataRow stat name="Groups" value={groups.length} />
                {typeof modularity === "number" && (
                    <DataRow
                        stat
                        name="Modularity"
                        value={
                            band === undefined
                                ? formatNumber(modularity)
                                : `${formatNumber(modularity)}, ${band.plainName}`
                        }
                    />
                )}
            </ControlSection>
            <ControlSection label="Sizes" defaultOpened>
                <HistogramRow
                    label="Group sizes"
                    bins={groups.map((group) => ({
                        label: `${groupName(group)}: ${count(group.size, "node")}`,
                        count: group.size,
                    }))}
                    minLabel={rankedName(groups.at(0))}
                    maxLabel={rankedName(groups.at(-1))}
                />
                {groups.length > TOP && <DataRowHeader label={`Largest ${String(TOP)}`} />}
                {groups.slice(0, TOP).map((group) => (
                    <DataRow
                        key={String(group.group)}
                        name={groupName(group)}
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
 * A path run's values: how big the path is, its total distance when it read a distance weight,
 * then its nodes from source to target, each selecting that node.
 * @param props - Component props
 * @param props.session - The session
 * @param props.run - The run
 * @returns The sections
 */
function PathValues({ session, run }: Readonly<{ session: GraphSession; run: Run }>): React.JSX.Element | null {
    // After Find path, focus goes to the inspector's title once the route is drawn: the result the
    // reader asked for, not the canvas, the control that opened the form, or a node row whose
    // ring would read as picked.
    useEffect(() => {
        if (run.result !== undefined && takePathValuesFocus(run.id)) {
            focusInspectorTitle();
        }
    });
    const { result } = run;
    if (result === undefined) {
        return null;
    }
    const { length, hops, cost } = result.graph;
    const nodes = result
        .ranking("order")
        .filter((entry) => Number.isFinite(entry.value))
        .sort((a, b) => a.value - b.value);
    const distance = run.caveats.weight?.meaning === "distance" && typeof cost === "number";
    return (
        <>
            <ControlSection label="Summary" defaultOpened>
                {typeof length === "number" && typeof hops === "number" && (
                    <DataRow stat name="Path" value={routeWords(length, hops)} />
                )}
                {distance && <DataRow stat name="Total distance" value={formatNumber(cost)} />}
            </ControlSection>
            <ControlSection label="Nodes in order" defaultOpened>
                {nodes.map((entry) => (
                    <DataRow
                        key={nodeKey(entry.id)}
                        name={String(entry.id)}
                        value={formatNumber(entry.value + 1)}
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
 * A set run's values: how many nodes or edges it holds.
 * @param props - Component props
 * @param props.run - The run
 * @returns The section
 */
function SetValues({ run }: Readonly<{ run: Run }>): React.JSX.Element | null {
    const size = run.result?.graph.count;
    if (typeof size !== "number") {
        return null;
    }
    return (
        <ControlSection label="Summary" defaultOpened>
            <DataRow stat name="Holds" value={count(size, measuredNoun(run))} />
        </ControlSection>
    );
}

/**
 * Which values view a finished run gets, from its shape's contract and its primary field's type:
 * a grouping's summary, a path's route, a set's size, a number's histogram, or none.
 * @param run - the run.
 * @returns the view.
 */
function viewOf(run: Run): "groups" | "path" | "set" | "measure" | null {
    const contract = RESULT_SHAPE_CONTRACTS[run.shape];
    const { nodeFields }: { nodeFields: readonly string[] } = contract;
    if (run.status !== "succeeded" || contract.primaryField === null) {
        return null;
    }
    if (rowKindOf(run) === "run-row") {
        return "groups";
    }
    if (contract.layer === "highlight") {
        return nodeFields.includes("order") ? "path" : "set";
    }
    const type = run.fields.find((field) => field.name === contract.primaryField)?.type;
    return type === "number" || type === "integer" ? "measure" : null;
}

/**
 * A run row's Values tab (tier1-design.md section 2.7): a measure's histogram and top 10, a
 * grouping's summary and sizes, a path's route or a set's size; then Made with.
 * @param props - Component props
 * @param props.run - The run
 * @param props.draft - The reader's changes to its settings
 * @param props.onDraft - Replaces the changes
 * @returns The tab
 */
export function RunValues({
    run,
    draft,
    onDraft,
}: Readonly<{
    run: Run;
    draft: Draft;
    onDraft: (draft: Draft) => void;
}>): React.JSX.Element | null {
    const { session } = useWorkspace();
    if (session === null) {
        return null;
    }
    const field = RESULT_SHAPE_CONTRACTS[run.shape].primaryField;
    const view = viewOf(run);
    return (
        <>
            {view === "measure" && field !== null && <MeasureValues session={session} run={run} field={field} />}
            {view === "groups" && <GroupsValues run={run} />}
            {view === "path" && <PathValues session={session} run={run} />}
            {view === "set" && <SetValues run={run} />}
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
        define: {
            kind: "rule",
            where: { kind: "item", item: { result: run, key: { field, value: group } } },
            reading: "induced",
        },
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
export function GroupValues({
    run,
    group,
    version,
}: Readonly<{
    run: Run;
    group: string | number;
    version: number;
}>): React.JSX.Element | null {
    const { session } = useWorkspace();
    const field = RESULT_SHAPE_CONTRACTS[run.shape].primaryField;
    const scope = field === null ? null : groupScope(run.id, field, group);
    const members = useAsyncValue(
        () => (scope === null ? null : (session?.scope.resolve(scope) ?? null)),
        `${String(version)}:${groupKey(run.id, group)}`,
    );
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
                <DataRow stat name="Made by" value={runName(session, run)} />
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
