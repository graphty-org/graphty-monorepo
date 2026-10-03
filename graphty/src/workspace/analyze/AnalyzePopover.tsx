import { SearchInput } from "@graphty/compact-mantine";
import type { AlgorithmDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Badge, Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChartColumn, ChevronLeft, Hash, Layers, Waypoints } from "lucide-react";
import React, { useState } from "react";

import { OptionField } from "./OptionField";
import { costLine, groupAlgorithms, type Heading, HEADINGS, isEssential, wordsFor } from "./words";

/** The type icon of the row a run adds, by heading. */
const ROW_ICON: Readonly<Record<Heading["id"], React.ReactNode>> = {
    rank: <ChartColumn size={16} />,
    groups: <Layers size={16} />,
    paths: <Waypoints size={16} />,
    measure: <Hash size={16} />,
};

/** How many recent algorithms the list leads with. */
const RECENT = 3;

/**
 * The icon of the row an algorithm adds.
 * @param descriptor - the algorithm.
 * @returns the icon.
 */
function rowIcon(descriptor: AlgorithmDescriptor): React.ReactNode {
    const heading = HEADINGS.find((h) => h.shapes.includes(descriptor.shape));
    return ROW_ICON[heading?.id ?? "measure"];
}

/**
 * The options an algorithm reads from the selection (a start node, a target): node ids, in
 * catalog order.
 * @param descriptor - the algorithm.
 * @returns the option names.
 */
function nodeOptions(descriptor: AlgorithmDescriptor): string[] {
    return descriptor.options
        .filter((o) => o.type === "node-id" && o.advanced !== true && o.internal !== true)
        .map((o) => o.name);
}

/**
 * Why an algorithm cannot run now, or null.
 * @param session - the element's session.
 * @param descriptor - the algorithm.
 * @returns the reason, or null.
 */
function unavailable(session: GraphSession, descriptor: AlgorithmDescriptor): string | null {
    const needed = nodeOptions(descriptor).length;
    if (needed > session.selection.nodes.length) {
        return needed === 1 ? "Select a node first" : `Select ${String(needed)} nodes first`;
    }
    const estimate = session.estimate({ op: "algo.run", algorithm: descriptor.key });
    // ponytail: the element's reason is English prose; it becomes a code the app words once the
    // element reports one (recorded as an element gap).
    return estimate.available ? null : (estimate.reason ?? "Cannot run on this graph");
}

/**
 * The parameters to run with: what the reader set, plus the selected nodes for the options that
 * read them.
 * @param session - the element's session.
 * @param descriptor - the algorithm.
 * @param set - the values the reader set.
 * @returns the parameters.
 */
function paramsFor(
    session: GraphSession,
    descriptor: AlgorithmDescriptor,
    set: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
    const params: Record<string, unknown> = { ...set };
    nodeOptions(descriptor).forEach((name, i) => {
        params[name] = session.selection.nodes[i];
    });
    return params;
}

/** Props for AnalyzePopover. */
interface AnalyzePopoverProps {
    session: GraphSession;
    /** Closes the popover, returning focus to Analyze. */
    onClose: () => void;
    /** Called with a run's name as it starts, for the screen reader's "added, running". */
    onStarted: (name: string) => void;
    /** An algorithm to open on, for a story. */
    initialPick?: string;
    /** The filter text to open with, for a story. */
    initialFilter?: string;
}

/**
 * The Analyze popover (tier1-design.md 5.T7): a Filter analyses box, Recent, then the element's
 * algorithm catalog under the app's headings; picking one shows its short form (the options the
 * element does not mark advanced), the cost line and Run. Esc steps back one level, and a second
 * Esc closes. Running closes the popover; the new row in the tree is the feedback.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.onClose - Closes the popover
 * @param props.onStarted - Called with a run's name as it starts
 * @param props.initialPick - An algorithm to open on
 * @param props.initialFilter - The filter text to open with
 * @returns The popover's body
 */
export function AnalyzePopover({
    session,
    onClose,
    onStarted,
    initialPick,
    initialFilter = "",
}: AnalyzePopoverProps): React.JSX.Element {
    const algorithms = session.catalog.algorithms();
    const [filter, setFilter] = useState(initialFilter);
    const [picked, setPicked] = useState<AlgorithmDescriptor | undefined>(() =>
        algorithms.find((a) => a.key === initialPick),
    );
    const [values, setValues] = useState<Record<string, unknown>>({});

    const pick = (descriptor: AlgorithmDescriptor | undefined): void => {
        setPicked(descriptor);
        setValues({});
    };

    const onKeyDown = (event: React.KeyboardEvent): void => {
        if (event.key !== "Escape") {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (picked === undefined) {
            onClose();
        } else {
            pick(undefined);
        }
    };

    if (picked !== undefined) {
        return (
            <Essentials
                session={session}
                descriptor={picked}
                values={values}
                onValues={setValues}
                onBack={() => {
                    pick(undefined);
                }}
                onRun={() => {
                    const run = session.runs.start(picked.key, paramsFor(session, picked, values));
                    // A failed run is reported on its row and in the inspector, from the run itself.
                    run.then(undefined, () => undefined);
                    onStarted(wordsFor(picked).name);
                    onClose();
                }}
                onKeyDown={onKeyDown}
            />
        );
    }

    const groups = groupAlgorithms(algorithms, filter);
    const recentKeys = [...new Set(session.runs.list().map((run) => run.algorithm).reverse())].slice(0, RECENT);
    const recent = filter.trim() === "" ? algorithms.filter((a) => recentKeys.includes(a.key)) : [];

    const entry = (descriptor: AlgorithmDescriptor, showStart: boolean): React.JSX.Element => {
        const words = wordsFor(descriptor);
        const reason = unavailable(session, descriptor);
        return (
            <UnstyledButton
                key={descriptor.key}
                className="ws-analyze-entry"
                aria-disabled={reason !== null}
                aria-description={reason ?? undefined}
                onClick={() => {
                    if (reason === null) {
                        pick(descriptor);
                    }
                }}
            >
                <Group gap={8} wrap="nowrap" align="flex-start">
                    <span className="ws-analyze-icon" aria-hidden="true">
                        {rowIcon(descriptor)}
                    </span>
                    <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                        <Group gap={6} wrap="nowrap">
                            <Text size="sm" c={reason === null ? undefined : "dimmed"}>
                                {words.name}
                            </Text>
                            {showStart && words.startHere === true ? (
                                <Badge size="xs" variant="light">
                                    Start here
                                </Badge>
                            ) : null}
                        </Group>
                        <Text size="xs" c="dimmed">
                            {reason ?? words.answers}
                        </Text>
                    </Stack>
                </Group>
            </UnstyledButton>
        );
    };

    return (
        <Stack gap={4} className="ws-analyze" onKeyDown={onKeyDown}>
            <SearchInput
                aria-label="Filter analyses"
                placeholder="Filter analyses"
                value={filter}
                onChange={setFilter}
                // Back from an entry's short form, focus returns here, so a second Esc closes.
                autoFocus
            />
            <div className="ws-analyze-list">
                {recent.length > 0 ? (
                    <section aria-label="Recent">
                        <Text size="xs" fw={600} c="dimmed" className="ws-analyze-heading">
                            Recent
                        </Text>
                        {recent.map((descriptor) => entry(descriptor, false))}
                    </section>
                ) : null}
                {groups.map(({ heading, entries }) => (
                    <section key={heading.id} aria-label={heading.title}>
                        <Text size="xs" fw={600} c="dimmed" className="ws-analyze-heading">
                            {heading.title}
                        </Text>
                        {entries.map((descriptor) => entry(descriptor, true))}
                    </section>
                ))}
                {groups.length === 0 ? (
                    <Text size="xs" c="dimmed" p="xs">
                        No analysis matches "{filter}"
                    </Text>
                ) : null}
            </div>
        </Stack>
    );
}

/** Props for Essentials. */
interface EssentialsProps {
    session: GraphSession;
    descriptor: AlgorithmDescriptor;
    values: Record<string, unknown>;
    onValues: (values: Record<string, unknown>) => void;
    onBack: () => void;
    onRun: () => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * One algorithm's short form: its options the element does not mark advanced, the cost line and
 * Run, which reads "Update <name> row" when the algorithm already has a row (the element runs it
 * again in place).
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.descriptor - The algorithm
 * @param props.values - The values set
 * @param props.onValues - Called with the new values
 * @param props.onBack - Back to the list
 * @param props.onRun - Runs it
 * @param props.onKeyDown - The popover's Esc handling
 * @returns The short form
 */
function Essentials({
    session,
    descriptor,
    values,
    onValues,
    onBack,
    onRun,
    onKeyDown,
}: EssentialsProps): React.JSX.Element {
    const words = wordsFor(descriptor);
    const estimate = session.estimate({
        op: "algo.run",
        algorithm: descriptor.key,
        params: paramsFor(session, descriptor, values),
    });
    const hasRow = session.runs.list().some((run) => run.algorithm === descriptor.key && run.status !== "removed");
    const runLabel = hasRow ? `Update ${words.name} row` : "Run";
    const options = descriptor.options.filter(isEssential);

    return (
        <form
            className="ws-analyze"
            aria-label={words.name}
            onKeyDown={onKeyDown}
            onSubmit={(event) => {
                event.preventDefault();
                if (estimate.available) {
                    onRun();
                }
            }}
        >
            <Stack gap={8}>
                <Group gap={4} wrap="nowrap">
                    <UnstyledButton aria-label="Back to analyses" onClick={onBack} className="ws-analyze-back">
                        <ChevronLeft size={16} />
                    </UnstyledButton>
                    <span aria-hidden="true">{rowIcon(descriptor)}</span>
                    <Text size="sm" fw={600}>
                        {words.name}
                    </Text>
                </Group>
                {words.answers === "" ? null : (
                    <Text size="xs" c="dimmed">
                        {words.answers}
                    </Text>
                )}
                {options.map((option) => (
                    <OptionField
                        key={option.name}
                        option={option}
                        value={values[option.name]}
                        onChange={(value) => {
                            onValues({ ...values, [option.name]: value });
                        }}
                    />
                ))}
                <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed">
                        {estimate.available ? costLine(estimate.seconds) : (estimate.reason ?? "")}
                    </Text>
                    {/* Focus lands on Run, so Enter runs and Esc steps back (tier1-design.md 5.T7). */}
                    <Button size="xs" type="submit" disabled={!estimate.available} autoFocus>
                        {runLabel}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
