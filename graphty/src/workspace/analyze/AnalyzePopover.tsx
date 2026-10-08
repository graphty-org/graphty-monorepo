import { SearchInput } from "@graphty/compact-mantine";
import type { AlgorithmDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession, Run } from "@graphty/graphty-element/session";
import { Badge, Button, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";
import { OptionsForm } from "../options/OptionsForm";
import { PATH_ALGORITHM, PathForm } from "./PathForm";
import { costLine, groupAlgorithms, type Heading, HEADINGS, optionWords, runRefusalWords, wordsFor } from "./words";

/** The type icon of the row a run adds, by heading. */
const ROW_ICON: Readonly<Record<Heading["id"], React.ReactNode>> = {
    rank: <GLYPHS.measure size={16} />,
    groups: <GLYPHS.run size={16} />,
    paths: <GLYPHS.paths size={16} />,
    measure: <GLYPHS.number size={16} />,
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
    // The Path form picks its own ends, so it needs no selection.
    const needed = descriptor.key === PATH_ALGORITHM ? 0 : nodeOptions(descriptor).length;
    if (needed > session.selection.nodes.length) {
        return needed === 1 ? "Select a node first" : `Select ${String(needed)} nodes first`;
    }
    const estimate = session.estimate({ op: "algo.run", algorithm: descriptor.key });
    return estimate.available ? null : runRefusalWords(estimate);
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
    /** Called with a path search's run as it starts, so its row is selected. */
    onPathStarted?: (run: Run) => void;
    /** Open straight on the Path form (P, Path between...): Esc then closes, with no way back. */
    path?: boolean;
    /** An algorithm to open on, for a story. */
    initialPick?: string;
    /** The filter text to open with, for a story. */
    initialFilter?: string;
}

/**
 * The Analyze popover (tier1-design.md 5.T7): a Filter analyses box, Recent, then the element's
 * algorithm catalog under the app's headings; picking one shows its short form (its key options,
 * the advanced ones behind a closed fold), the cost line and Run. The filter box is a combobox over the
 * list: ArrowDown and ArrowUp move the active entry, Enter opens it, and while there is filter
 * text the first match is active, so Enter on a single match opens it. Esc steps back one level,
 * and a second Esc closes. Running closes the popover; the new row in the tree is the feedback.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.onClose - Closes the popover
 * @param props.onStarted - Called with a run's name as it starts
 * @param props.initialPick - An algorithm to open on
 * @param props.initialFilter - The filter text to open with
 * @param props.onPathStarted - Called with a path search's run as it starts
 * @param props.path - Open straight on the Path form
 * @returns The popover's body
 */
export function AnalyzePopover({
    session,
    onClose,
    onStarted,
    onPathStarted,
    path = false,
    initialPick,
    initialFilter = "",
}: Readonly<AnalyzePopoverProps>): React.JSX.Element {
    const algorithms = session.catalog.algorithms();
    const [filter, setFilter] = useState(initialFilter);
    const [picked, setPicked] = useState<AlgorithmDescriptor | undefined>(() =>
        algorithms.find((a) => a.key === (path ? PATH_ALGORITHM : initialPick)),
    );
    const [values, setValues] = useState<Record<string, unknown>>({});
    // The entry ArrowUp/Down moved to; null follows the filter (its first match, or none).
    const [moved, setMoved] = useState<number | null>(null);
    const listId = useId();
    const listRef = useRef<HTMLDivElement>(null);

    const pick = (descriptor: AlgorithmDescriptor | undefined): void => {
        setPicked(descriptor);
        setValues({});
        setMoved(null);
    };

    useEffect(() => {
        listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
    });

    const onKeyDown = (event: React.KeyboardEvent): void => {
        if (!isPanelEscape(event)) {
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

    if (picked?.key === PATH_ALGORITHM) {
        return (
            <PathForm
                session={session}
                descriptor={picked}
                onBack={
                    path
                        ? undefined
                        : () => {
                              pick(undefined);
                          }
                }
                onClose={onClose}
                onRun={(params) => {
                    // Each From and To is its own run, so its own row.
                    const run = session.runs.start(picked.key, params);
                    run.then(undefined, () => undefined);
                    onStarted(wordsFor(picked).name);
                    onPathStarted?.(run);
                    onClose();
                }}
            />
        );
    }

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
    const recentKeys = [
        ...new Set(
            session.runs
                .list()
                .map((run) => run.algorithm)
                .reverse(),
        ),
    ].slice(0, RECENT);
    // Most recent first.
    const recent =
        filter.trim() === ""
            ? recentKeys
                  .map((key) => algorithms.find((a) => a.key === key))
                  .filter((a): a is AlgorithmDescriptor => a !== undefined)
            : [];
    // Every entry in list order (Recent repeats some), for the active entry.
    const flat = [...recent, ...groups.flatMap((g) => g.entries)];
    const active = moved ?? (filter.trim() === "" ? -1 : 0);
    const optionId = (i: number): string => `${listId}-${String(i)}`;
    const open = (descriptor: AlgorithmDescriptor | undefined): void => {
        if (descriptor !== undefined && unavailable(session, descriptor) === null) {
            pick(descriptor);
        }
    };

    const onFilterKeyDown = (event: React.KeyboardEvent): void => {
        if (flat.length === 0) {
            return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const step = event.key === "ArrowDown" ? 1 : -1;
            setMoved(active < 0 && step < 0 ? flat.length - 1 : (active + step + flat.length) % flat.length);
        } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            open(flat[active]);
        }
    };

    let index = 0;
    const entry = (descriptor: AlgorithmDescriptor, showStart: boolean): React.JSX.Element => {
        const words = wordsFor(descriptor);
        const reason = unavailable(session, descriptor);
        const i = index++;
        return (
            <UnstyledButton
                component="div"
                role="option"
                id={optionId(i)}
                key={`${String(i)}-${descriptor.key}`}
                aria-selected={i === active}
                className="ws-analyze-entry"
                aria-disabled={reason !== null}
                aria-description={reason ?? undefined}
                onClick={() => {
                    open(descriptor);
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
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                value={filter}
                onChange={(text) => {
                    setFilter(text);
                    setMoved(null);
                }}
                onKeyDown={onFilterKeyDown}
                // Back from an entry's short form, focus returns here, so a second Esc closes.
                autoFocus
            />
            <div className="ws-analyze-list" id={listId} ref={listRef} role="listbox" aria-label="Analyses">
                {recent.length > 0 ? (
                    <div role="group" aria-label="Recent">
                        <Text size="xs" fw={600} c="dimmed" className="ws-analyze-heading">
                            Recent
                        </Text>
                        {recent.map((descriptor) => entry(descriptor, false))}
                    </div>
                ) : null}
                {groups.map(({ heading, entries }) => (
                    <div role="group" key={heading.id} aria-label={heading.title}>
                        <Text size="xs" fw={600} c="dimmed" className="ws-analyze-heading">
                            {heading.title}
                        </Text>
                        {entries.map((descriptor) => entry(descriptor, true))}
                    </div>
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
 * One algorithm's short form: its options (the advanced ones behind a fold), the cost line and
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
}: Readonly<EssentialsProps>): React.JSX.Element {
    const words = wordsFor(descriptor);
    const params = paramsFor(session, descriptor, values);
    const estimate = session.estimate({ op: "algo.run", algorithm: descriptor.key, params });
    const hasRow = session.runs.list().some((run) => run.algorithm === descriptor.key && run.status !== "removed");
    const runLabel = hasRow ? `Update ${words.name} row` : "Run";

    return (
        <form // NOSONAR(S6847): catches Esc bubbling from the form's own controls to step back
            className="ws-analyze"
            onKeyDown={onKeyDown}
            aria-label={words.name}
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
                        <GLYPHS.back size={16} />
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
                <OptionsForm
                    session={session}
                    options={descriptor.options}
                    values={params}
                    words={(option) => optionWords(descriptor.key, option)}
                    weightReads={descriptor.weightMeaning ?? null}
                    algorithm={descriptor.key}
                    onChange={(name, value) => {
                        onValues({ ...values, [name]: value });
                    }}
                />
                <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" c="dimmed">
                        {estimate.available ? costLine(estimate.seconds) : runRefusalWords(estimate)}
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
