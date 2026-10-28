import { SearchInput } from "@graphty/compact-mantine";
import type { AlgorithmDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession, Run } from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";
import { OptionsForm } from "../options/OptionsForm";
import { groupPalettes } from "../style/row";
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

/** What Analyze's button will do with an algorithm: run it, update its layer, or add its layer back. */
interface RunPlan {
    readonly label: string;
    /** Ask the element to put back the kept run's missing layers, from the stored result. */
    readonly restoreLayer: boolean;
    /** Running it would change nothing: the element holds this answer and its layers show. */
    readonly current: boolean;
}

/**
 * A grouping run's name for one group's layer: "Group <rank>", or the next number no layer in the
 * run's folder goes by, so a re-run never gives two layers one name.
 * @param group - the group, as graphty-element asks about it.
 * @param group.rank - its place by size, 1 for the largest.
 * @param group.taken - the names the folder's layers already go by.
 * @returns the name.
 */
function groupLayerName({ rank, taken }: { readonly rank: number; readonly taken: readonly string[] }): string {
    let n = rank;
    while (taken.includes(`Group ${String(n)}`)) {
        n += 1;
    }
    return `Group ${String(n)}`;
}

/**
 * The button's words, named for the kept run `start()` reuses (the algorithm's latest): "Run"
 * when there is none, "Update <name> layer" while its layer shows, "Add <name> layer" once its
 * layer was deleted ("layers" for a run that made several), which the element restores from the stored result without computing again
 * unless the settings changed. With the settings the element already answered and its layers
 * showing, it is current: the button would change nothing, so it is not offered.
 * @param session - The element's session
 * @param key - The algorithm
 * @param name - The algorithm's name in words
 * @param params - The settings the button would run with, when the form knows them
 * @returns The plan
 */
function runPlan(session: GraphSession, key: string, name: string, params?: Record<string, unknown>): RunPlan {
    const kept = session.runs.list().filter((run) => run.algorithm === key && run.status !== "removed");
    const latest = kept.at(-1);
    if (latest === undefined) {
        return { label: "Run", restoreLayer: false, current: false };
    }
    const layers = session.runs.layers(latest.id);
    const gone = layers?.present.length === 0 && layers.missing.length > 0;
    // A run that made a folder of layers (one per group) names them in the plural. Once the folder
    // is deleted the element lists it as the one suggestion that makes it, so a run with groups
    // is plural whatever the count.
    const grouped = latest.result?.summary().groups !== undefined;
    const noun =
        grouped || (layers !== undefined && layers.present.length + layers.missing.length > 1) ? "layers" : "layer";
    return gone
        ? { label: `Add ${name} ${noun}`, restoreLayer: true, current: false }
        : {
              label: `Update ${name} ${noun}`,
              restoreLayer: false,
              current: params !== undefined && session.runs.answered(key, params) !== undefined,
          };
}

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
    const selected = session.selection.nodes.length;
    if (needed > selected) {
        return needed === 1 ? "Select a node first" : `Select ${String(needed)} nodes first`;
    }
    // Its nodes come from the selection only when it holds exactly them: never the first few of a
    // larger selection, which the reader did not choose.
    if (needed > 0 && selected > needed) {
        const wanted = needed === 1 ? "1 node" : `${String(needed)} nodes`;
        return `Select only ${wanted}; ${String(selected)} are selected`;
    }
    const estimate = session.estimate({ op: "algo.run", algorithm: descriptor.key });
    return estimate.available ? null : runRefusalWords(estimate);
}

/**
 * The parameters to run with: what the reader set, plus the selected nodes for the options that
 * read them, when the selection holds exactly that many.
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
    const names = nodeOptions(descriptor);
    // Filled only from a selection of exactly as many nodes as the options read.
    if (names.length === session.selection.nodes.length) {
        names.forEach((name, i) => {
            params[name] = session.selection.nodes[i];
        });
    }
    return params;
}

/** Props for AnalyzePopover. */
interface AnalyzePopoverProps {
    session: GraphSession;
    /** Closes the popover, returning focus to Analyze. */
    onClose: () => void;
    /**
     * Tab (or Shift+Tab with `back`) from Filter analyses, its only Tab stop: the popover closes
     * and focus moves on (or back), as Tab out of any pop-out does.
     */
    onTab?: (back: boolean) => void;
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
 * text the first match is active, so Enter on a single match opens it, and so does Tab. Esc steps back one level,
 * and a second Esc closes. Running closes the popover; the new row in the tree is the feedback.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.onClose - Closes the popover
 * @param props.onTab - Tab or Shift+Tab out of Filter analyses
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
    onTab,
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
    // The list's height as it opened: a filter that shortens it never shortens the popover, which
    // opens upward from the toolbar, so the filter box stays where the reader is typing.
    const floor = useRef<number | undefined>(undefined);
    useLayoutEffect(() => {
        const list = listRef.current;
        if (list === null) {
            return;
        }
        floor.current ??= list.offsetHeight;
        list.style.minHeight = `${String(floor.current)}px`;
    });

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
                    const run = session.runs.start(picked.key, params, {
                        style: { name: wordsFor(picked).name },
                        restoreLayer: runPlan(session, picked.key, wordsFor(picked).name).restoreLayer,
                    });
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
                    // The layers it adds go by the algorithm's name as the reader picked it ("Closeness");
                    // a grouping run's groups each become a layer in a folder of that name, named
                    // "Group 1" for the largest (the reader renames them in the tree); a re-run's
                    // new group takes the next number no layer in the folder has. More groups than
                    // eight take the first group palette with a color for each, never an eight-color
                    // palette continued into near-identical oranges.
                    const run = session.runs.start(picked.key, paramsFor(session, picked, values), {
                        style: {
                            name: wordsFor(picked).name,
                            groups: "layers",
                            groupName: groupLayerName,
                            groupPalettes: groupPalettes(session).map((palette) => palette.id),
                        },
                        restoreLayer: runPlan(session, picked.key, wordsFor(picked).name).restoreLayer,
                    });
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
    // Nothing is active until the reader types or arrows; typing makes the first entry that can run
    // active, never one that cannot.
    const active = moved ?? (filter.trim() === "" ? -1 : flat.findIndex((d) => unavailable(session, d) === null));
    const optionId = (i: number): string => `${listId}-${String(i)}`;
    const open = (descriptor: AlgorithmDescriptor | undefined): void => {
        if (descriptor !== undefined && unavailable(session, descriptor) === null) {
            pick(descriptor);
        }
    };

    const onFilterKeyDown = (event: React.KeyboardEvent): void => {
        const plainTab = event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;
        // Tab with letters typed takes the highlighted analysis, as in every list; with nothing
        // typed it leaves and takes nothing. Stopped here, or the popover's focus trap (a document
        // listener) takes the same Tab on to the card's next stop, past Run.
        if (plainTab && !event.shiftKey && filter.trim() !== "" && active >= 0) {
            event.preventDefault();
            event.stopPropagation();
            open(flat[active]);
            return;
        }
        if (plainTab && onTab !== undefined) {
            event.preventDefault();
            onTab(event.shiftKey);
            return;
        }
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
    // A Recent entry repeats one listed below: its name says which it is, so the two differ.
    const entry = (descriptor: AlgorithmDescriptor, isRecent = false): React.JSX.Element => {
        const words = wordsFor(descriptor);
        const reason = unavailable(session, descriptor);
        const i = index++;
        return (
            <UnstyledButton // NOSONAR(S6811): aria-description is a global ARIA 1.3 attribute, valid on an option
                component="div"
                role="option"
                id={optionId(i)}
                key={`${String(i)}-${descriptor.key}`}
                aria-selected={i === active}
                className="ws-analyze-entry"
                aria-disabled={reason !== null}
                // The name alone; the mark is part of the description, not of the name.
                aria-label={isRecent ? `${words.name}, recent` : words.name}
                aria-description={reason ?? words.answers}
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
            <div // NOSONAR(S6819): the popup of an ARIA combobox on a text box; a native select cannot be one
                className="ws-analyze-list"
                id={listId}
                ref={listRef}
                role="listbox"
                aria-label="Analyses"
            >
                {recent.length > 0 ? (
                    <div // NOSONAR(S6819): an option group inside an ARIA listbox; optgroup needs a native select
                        role="group"
                        aria-label="Recent"
                    >
                        <Text size="xs" fw={600} c="dimmed" className="ws-analyze-heading">
                            Recent
                        </Text>
                        {recent.map((descriptor) => entry(descriptor, true))}
                    </div>
                ) : null}
                {groups.map(({ heading, entries }) => (
                    <div // NOSONAR(S6819): an option group inside an ARIA listbox; optgroup needs a native select
                        role="group"
                        key={heading.id}
                        aria-label={heading.title}
                    >
                        <Text size="xs" fw={600} c="dimmed" className="ws-analyze-heading">
                            {heading.title}
                        </Text>
                        {entries.map((descriptor) => entry(descriptor))}
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
 * the button, which names what the run it reuses will do: "Run", "Update <name> layer" or "Add
 * <name> layer" (see `runPlan`).
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
    const plan = runPlan(session, descriptor.key, words.name, params);
    const ready = estimate.available && !plan.current;
    let footnote = estimate.available ? costLine(estimate.seconds) : runRefusalWords(estimate);
    if (estimate.available && plan.current) {
        footnote = `${words.name} is up to date with these settings.`;
    }

    return (
        <form // NOSONAR(S6847): catches Esc bubbling from the form's own controls to step back
            className="ws-analyze"
            onKeyDown={onKeyDown}
            aria-label={words.name}
            onSubmit={(event) => {
                event.preventDefault();
                if (ready) {
                    onRun();
                }
            }}
        >
            <Stack gap={8}>
                <Group gap={4} wrap="nowrap">
                    {/* Its tooltip is its name, as every icon button's is. */}
                    <Tooltip label="Back to analyses">
                        <UnstyledButton aria-label="Back to analyses" onClick={onBack} className="ws-analyze-back">
                            <GLYPHS.back size={16} />
                        </UnstyledButton>
                    </Tooltip>
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
                        {footnote}
                    </Text>
                    {/* Focus lands on Run, so Enter runs and Esc steps back (tier1-design.md 5.T7). A
                        current layer's button stays focusable for that, marked disabled; submit is
                        refused while it is. */}
                    <Button
                        size="xs"
                        type="submit"
                        disabled={!estimate.available}
                        data-disabled={plan.current || undefined}
                        aria-disabled={plan.current || undefined}
                        // A bare "Run" names no analysis to a reader who reached it by Tab; the
                        // other labels already name it ("Update Degree layer").
                        aria-label={plan.label === "Run" ? `Run ${words.name}` : undefined}
                        autoFocus
                    >
                        {plan.label}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}
