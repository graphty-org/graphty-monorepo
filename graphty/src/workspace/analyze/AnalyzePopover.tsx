import { PopoutManager, SearchInput } from "@graphty/compact-mantine";
import type { AlgorithmDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession, Run } from "@graphty/graphty-element/session";
import { Button, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { isPanelEscape } from "../keys/keys";
import { OptionsForm } from "../options/OptionsForm";
import { SettingsPopout } from "../options/SettingsPopout";
import { PATH_ALGORITHM, PathForm } from "./PathForm";
import {
    paramsFor,
    planOptions,
    runAllMethods,
    runningBatch,
    type RunPlan,
    runPlan,
    settingsOf,
    startAlgorithm,
    startAll,
    unavailable,
} from "./run";
import {
    costLine,
    groupAlgorithms,
    type Heading,
    HEADINGS,
    optionWords,
    RUN_ALL,
    runRefusalWords,
    wordsFor,
} from "./words";

/** The type icon of the row a run adds, by heading. */
const ROW_ICON: Readonly<Record<Heading["id"], React.ReactNode>> = {
    rank: <GLYPHS.measure size={16} />,
    groups: <GLYPHS.run size={16} />,
    paths: <GLYPHS.paths size={16} />,
    measure: <GLYPHS.number size={16} />,
};

/** A heading's Run all entry: every method under it that can run now. */
interface RunAllEntry {
    readonly all: Heading;
    readonly methods: readonly AlgorithmDescriptor[];
}

/** One entry of the list: an algorithm, or a heading's Run all. */
type Entry = AlgorithmDescriptor | RunAllEntry;

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
    /** The settings to open the picked algorithm with, such as a result's own. */
    initialValues?: Readonly<Record<string, unknown>>;
}

/**
 * The Analyze popover (tier1-design.md 5.T7): a Filter analyses box, Recent, then the element's
 * algorithm catalog under the app's headings; picking one shows its short form (its key options,
 * the advanced ones behind a closed fold), the cost line and Run. The filter box is a combobox over the
 * list: ArrowDown and ArrowUp move the active entry, Enter opens it, and while there is filter
 * text the first match is active, so Enter on a single match opens it, and so does Tab. Esc steps back one level,
 * and a second Esc closes. Running closes the popover; the new row in the tree is the feedback.
 * Each heading ends with Run all (issue #195): its methods as one graphty-element batch, each its
 * own run and row, and Cancel all while that batch runs.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.onClose - Closes the popover
 * @param props.onTab - Tab or Shift+Tab out of Filter analyses
 * @param props.onStarted - Called with a run's name as it starts
 * @param props.initialPick - An algorithm to open on
 * @param props.initialFilter - The filter text to open with
 * @param props.initialValues - The settings to open the picked algorithm with
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
    initialValues,
}: Readonly<AnalyzePopoverProps>): React.JSX.Element {
    const algorithms = session.catalog.algorithms();
    // The approved prototype: a calm list of names, the chosen row with its settings at its end, Run
    // at the bottom. Only Path keeps its form: it picks its ends.
    const [filter, setFilter] = useState(initialFilter);
    const [picked, setPicked] = useState<AlgorithmDescriptor | undefined>(() =>
        algorithms.find((a) => a.key === PATH_ALGORITHM && (path || initialPick === PATH_ALGORITHM)),
    );
    const [chosen, setChosen] = useState<AlgorithmDescriptor | undefined>(() =>
        algorithms.find((a) => a.key === initialPick && a.key !== PATH_ALGORITHM),
    );
    const [values, setValues] = useState<Record<string, unknown>>(() => ({ ...initialValues }));
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
        // Escape in the settings popover closes only that popover (its manager takes it).
        if (!isPanelEscape(event) || (event.target instanceof Element && event.target.closest("[data-popout-id]"))) {
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
                        ...planOptions(session, picked.key, wordsFor(picked).name, params),
                    });
                    run.then(undefined, () => undefined);
                    onStarted(wordsFor(picked).name);
                    onPathStarted?.(run);
                    onClose();
                }}
            />
        );
    }

    const runIt = (descriptor: AlgorithmDescriptor): void => {
        startAlgorithm(session, descriptor, values);
        onStarted(wordsFor(descriptor).name);
        onClose();
    };

    // Run all ends each heading with two or more methods that can run now (or whose batch still
    // runs, to cancel it); only on the whole list, so it always means every method of the heading.
    // Run all starts one graphty-element batch and closes, as Run does; on a batch still running
    // it cancels the whole batch and stays open.
    const runAll = ({ all, methods }: RunAllEntry): void => {
        const running = runningBatch(session, all.id);
        if (running !== undefined) {
            running.cancel();
            return;
        }
        startAll(session, all.id, all.title, methods);
        onStarted(all.title);
        onClose();
    };

    const groups = groupAlgorithms(algorithms, filter).map((group) => {
        const methods = runAllMethods(session, group.entries);
        const offered =
            filter.trim() === "" && (methods.length > 1 || runningBatch(session, group.heading.id) !== undefined);
        return { ...group, all: offered ? { all: group.heading, methods } : undefined };
    });
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
    const flat: Entry[] = [
        ...recent,
        ...groups.flatMap((g): Entry[] => (g.all === undefined ? [...g.entries] : [...g.entries, g.all])),
    ];
    // Nothing is active until the reader types or arrows; typing makes the first entry that can run
    // active, never one that cannot.
    const active =
        moved ?? (filter.trim() === "" ? -1 : flat.findIndex((d) => "all" in d || unavailable(session, d) === null));
    const optionId = (i: number): string => `${listId}-${String(i)}`;
    const open = (descriptor: Entry | undefined): void => {
        if (descriptor !== undefined && "all" in descriptor) {
            runAll(descriptor);
            return;
        }
        if (descriptor === undefined || unavailable(session, descriptor) !== null) {
            return;
        }
        if (descriptor.key !== PATH_ALGORITHM) {
            setChosen(descriptor);
            setValues({});
            return;
        }
        pick(descriptor);
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
        const isChosen = chosen?.key === descriptor.key;
        return (
            <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- a layout wrapper between the listbox and its option, which no image could be
                key={`${String(i)}-${descriptor.key}`}
                className="ws-analyze-row"
                role="presentation"
            >
                <Tooltip label={reason ?? words.answers} disabled={(reason ?? words.answers) === ""} openDelay={500}>
                    <UnstyledButton // eslint-disable-line jsx-a11y/role-supports-aria-props -- aria-description is a global ARIA 1.3 attribute, valid on an option
                        component="div"
                        role="option"
                        id={optionId(i)}
                        aria-selected={i === active || isChosen}
                        className="ws-analyze-entry"
                        data-chosen={isChosen ? "" : undefined}
                        aria-disabled={reason !== null}
                        aria-label={isRecent ? `${words.name}, recent` : words.name}
                        aria-description={reason ?? words.answers}
                        onClick={() => {
                            open(descriptor);
                        }}
                    >
                        <Group gap={8} wrap="nowrap">
                            <span className="ws-analyze-icon" aria-hidden="true">
                                {rowIcon(descriptor)}
                            </span>
                            <Text size="sm" c={reason === null ? undefined : "dimmed"} truncate>
                                {words.name}
                            </Text>
                        </Group>
                    </UnstyledButton>
                </Tooltip>
                {isChosen && !isRecent && (
                    <AnalyzeSettings session={session} descriptor={descriptor} values={values} onValues={setValues} />
                )}
            </div>
        );
    };

    const allEntry = ({ all, methods }: RunAllEntry): React.JSX.Element => {
        const i = index++;
        const words = runningBatch(session, all.id) === undefined ? RUN_ALL.run : RUN_ALL.cancel;
        return (
            <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- a layout wrapper between the listbox and its option, which no image could be
                key={`${String(i)}-all`}
                className="ws-analyze-row"
                role="presentation"
            >
                <UnstyledButton
                    component="div"
                    role="option"
                    id={optionId(i)}
                    aria-selected={i === active}
                    className="ws-analyze-entry"
                    aria-label={`${words}, ${all.title}`}
                    onClick={() => {
                        runAll({ all, methods });
                    }}
                >
                    <Group gap={8} wrap="nowrap">
                        <span className="ws-analyze-icon" aria-hidden="true">
                            <GLYPHS.run size={16} />
                        </span>
                        <Text size="sm" truncate>
                            {words}
                        </Text>
                    </Group>
                </UnstyledButton>
            </div>
        );
    };

    return (
        // The settings popover's panels are drawn inside Analyze, so a press in one is not outside it.
        <PopoutManager>
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
                <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- the popup of an ARIA combobox on a text box; a native select cannot be one
                    className="ws-analyze-list"
                    id={listId}
                    ref={listRef}
                    role="listbox"
                    aria-label="Analyses"
                >
                    {recent.length > 0 ? (
                        <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- an option group inside an ARIA listbox; optgroup needs a native select
                            role="group"
                            aria-label="Recent"
                        >
                            <Text size="xs" fw={600} c="dimmed" className="ws-analyze-heading">
                                Recent
                            </Text>
                            {recent.map((descriptor) => entry(descriptor, true))}
                        </div>
                    ) : null}
                    {groups.map(({ heading, entries, all }) => (
                        <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- an option group inside an ARIA listbox; optgroup needs a native select
                            role="group"
                            key={heading.id}
                            aria-label={heading.title}
                        >
                            <Text size="xs" fw={600} c="dimmed" className="ws-analyze-heading">
                                {heading.title}
                            </Text>
                            {entries.map((descriptor) => entry(descriptor))}
                            {all === undefined ? null : allEntry(all)}
                        </div>
                    ))}
                    {groups.length === 0 ? (
                        <Text size="xs" c="dimmed" p="xs">
                            No analysis matches "{filter}"
                        </Text>
                    ) : null}
                </div>
                {chosen !== undefined && (
                    <RunBar
                        session={session}
                        descriptor={chosen}
                        values={values}
                        onRun={() => {
                            runIt(chosen);
                        }}
                    />
                )}
            </Stack>
        </PopoutManager>
    );
}

/**
 * The chosen row's settings: the 24px settings button at the row's end, which opens them in the one
 * settings popover beside Analyze, as on a card. Run stays at the list's foot.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.descriptor - The algorithm
 * @param props.values - The values set
 * @param props.onValues - Called with the new values
 * @returns The button and its popover, or nothing for an algorithm with no settings
 */
function AnalyzeSettings({
    session,
    descriptor,
    values,
    onValues,
}: Readonly<{
    session: GraphSession;
    descriptor: AlgorithmDescriptor;
    values: Record<string, unknown>;
    onValues: (values: Record<string, unknown>) => void;
}>): React.JSX.Element | null {
    const words = wordsFor(descriptor);
    const options = settingsOf(descriptor);
    if (options.length === 0) {
        return null;
    }
    return (
        // Analyze sits at the window's middle, so the panel opens on the right, clear of the list.
        <span className="ws-analyze-gear">
            <SettingsPopout
                label={`Settings for ${words.name}`}
                title={words.name}
                tip="Settings"
                changed={Object.keys(values).length > 0}
                width={280}
                placement="right"
            >
                <div className="ws-options-rows ws-analyze-settings" data-settings={descriptor.key}>
                    <OptionsForm
                        session={session}
                        options={options}
                        values={values}
                        words={(option) => optionWords(descriptor.key, option)}
                        weightReads={descriptor.weightMeaning ?? null}
                        algorithm={descriptor.key}
                        onChange={(name, value) => {
                            onValues({ ...values, [name]: value });
                        }}
                    />
                </div>
            </SettingsPopout>
        </span>
    );
}

/**
 * What the chosen algorithm's Run will do, the settings it would run with and whether it can.
 * @param session - The element's session
 * @param descriptor - The algorithm
 * @param values - The values set
 * @returns The parameters, the plan, whether it can run and the line beside Run
 */
function runState(
    session: GraphSession,
    descriptor: AlgorithmDescriptor,
    values: Record<string, unknown>,
): {
    params: Record<string, unknown>;
    plan: RunPlan;
    available: boolean;
    ready: boolean;
    footnote: string;
} {
    const { name } = wordsFor(descriptor);
    const params = paramsFor(session, descriptor, values);
    const estimate = session.estimate({ op: "algo.run", algorithm: descriptor.key, params });
    const plan = runPlan(session, descriptor.key, name, params);
    let footnote = estimate.available ? costLine(estimate.seconds) : runRefusalWords(estimate);
    if (estimate.available && plan.current) {
        footnote = `${name} is up to date with these settings.`;
    }
    return { params, plan, available: estimate.available, ready: estimate.available && !plan.current, footnote };
}

/**
 * Run at the bottom of the calm list, for the chosen row. Focus comes here as a row is chosen, so
 * Enter runs it, as it does on an algorithm's form.
 * @param props - Component props
 * @param props.session - The element's session
 * @param props.descriptor - The algorithm
 * @param props.values - The values set
 * @param props.onRun - Runs it
 * @returns The row
 */
function RunBar({
    session,
    descriptor,
    values,
    onRun,
}: Readonly<{
    session: GraphSession;
    descriptor: AlgorithmDescriptor;
    values: Record<string, unknown>;
    onRun: () => void;
}>): React.JSX.Element {
    const words = wordsFor(descriptor);
    const { plan, available, ready, footnote } = runState(session, descriptor, values);
    const button = useRef<HTMLButtonElement>(null);
    // Only a Run that runs takes focus: one dimmed because the layer is up to date, or refused, would
    // be a dead stop, so focus stays where the row was chosen from. Only as the row is chosen: Run
    // becoming ready later, as a setting changes, leaves focus in the setting.
    const chosenFor = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (chosenFor.current === descriptor.key) {
            return;
        }
        chosenFor.current = descriptor.key;
        if (ready) {
            button.current?.focus();
        }
    }, [descriptor.key, ready]);
    return (
        <Group justify="space-between" wrap="nowrap" className="ws-analyze-run">
            <Text size="xs" c="dimmed">
                {footnote}
            </Text>
            <Button
                ref={button}
                size="xs"
                disabled={!available}
                data-disabled={plan.current || undefined}
                aria-disabled={plan.current || undefined}
                aria-label={plan.label === "Run" ? `Run ${words.name}` : undefined}
                onClick={() => {
                    if (ready) {
                        onRun();
                    }
                }}
            >
                {plan.label}
            </Button>
        </Group>
    );
}
