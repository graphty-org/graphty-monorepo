import { ControlSection } from "@graphty/compact-mantine";
import type { LoadedSource, SourceKey } from "@graphty/graphty-element/session";
import React, { useEffect, useRef, useState } from "react";

import { sourceStepsOn } from "../features";
import { useWorkspace } from "../state/WorkspaceContext";
import { StyleNotes } from "../styles/StyleNotes";
import { AddSourceMenu } from "./AddSourceMenu";
import { SourceEntry, StagedEntry } from "./SourceEntry";

/**
 * The Sources section (spec section 3.2): one collapsible entry per load still in the graph
 * (`data.sources()`), oldest first, and "+" to add one. A closed entry shows the load's name and
 * counts; the picked load's entry is open unless the reader closed it, and the reader opens and
 * closes the rest. Opening an entry picks its load. A load added while the section is drawn takes
 * focus on its entry's header, unless the reader is typing in a field. A staged source (the
 * source-steps experiment) has its own entry after the loads, holding how its rows are read.
 * @param props - Component props
 * @param props.sources - `data.sources()`
 * @param props.selected - the selected load's key
 * @param props.onSelect - selects a load
 * @returns the section
 */
export function Sources({
    sources,
    selected,
    onSelect,
}: Readonly<{
    sources: readonly LoadedSource[];
    selected: SourceKey | undefined;
    onSelect: (key: SourceKey) => void;
}>): React.JSX.Element {
    const { session } = useWorkspace();
    const list = useRef<HTMLDivElement>(null);
    // Only the source-steps experiment stages a source: off, a staged source a saved project holds
    // is one of `sources`.
    const staged = session !== null && sourceStepsOn(session) ? session.data.staged() : [];
    // The entries the reader opened or closed; an entry they never touched is open only while its
    // load is picked. A new pick forgets the reader's choice for that entry, so it opens.
    // on reload: fresh: pointer: entries opened or closed for a look
    const [opened, setOpened] = useState<Readonly<Record<string, boolean>>>({});
    // on reload: fresh: derived: the pick, kept in the store
    const [openedFor, setOpenedFor] = useState(selected);
    if (openedFor !== selected) {
        setOpenedFor(selected);
        if (selected !== undefined) {
            setOpened(({ [selected]: _picked, ...rest }) => rest);
        }
    }
    const known = useRef<ReadonlySet<SourceKey> | null>(null);
    useEffect(() => {
        const before = known.current;
        known.current = new Set(sources.map((source) => source.key));
        const added = before === null ? undefined : sources.filter((source) => !before.has(source.key)).at(-1); // eslint-disable-line unicorn/prefer-array-find -- graphty's lib is ES2022, which has no Array#findLast
        const active = document.activeElement;
        const typing = active instanceof HTMLElement && active.matches("input, textarea, [contenteditable]");
        if (added === undefined || typing) {
            return;
        }
        list.current?.querySelector<HTMLElement>(`[data-source="${CSS.escape(added.key)}"] [aria-expanded]`)?.focus();
    }, [sources]);
    // Only a new pick scrolls the panel, to the picked entry.
    const drawn = useRef(false);
    useEffect(() => {
        if (drawn.current && selected !== undefined) {
            list.current
                ?.querySelector(`[data-source="${CSS.escape(selected)}"]`)
                ?.scrollIntoView({ block: "nearest" });
        }
        drawn.current = true;
    }, [selected]);
    const empty = sources.length === 0 && staged.length === 0;
    return (
        <ControlSection label="Data sources" actions={<AddSourceMenu />} empty={empty}>
            {empty ? null : (
                <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- a <ul>/<li> would bring list styling and spacing the entries do not use; the role gives the same semantics
                    ref={list}
                    role="list"
                    aria-label="Data sources"
                    className="dp-source-sections"
                >
                    {sources.map((source) => (
                        <SourceEntry
                            key={source.key}
                            source={source}
                            selected={source.key === selected}
                            opened={opened[source.key] ?? source.key === selected}
                            primary={sources.length === 1}
                            onOpenChange={(open) => {
                                setOpened((was) => ({ ...was, [source.key]: open }));
                                // Opening an entry picks it; closing the picked one shows it in the
                                // inspector again. Closing another never picks it, so it stays closed.
                                if (open || source.key === selected) {
                                    onSelect(source.key);
                                }
                            }}
                        />
                    ))}
                    {staged.map((source) => (
                        <StagedEntry
                            key={source.key}
                            source={source}
                            selected={source.key === selected}
                            opened={opened[source.key] ?? source.key === selected}
                            onOpenChange={(open) => {
                                setOpened((was) => ({ ...was, [source.key]: open }));
                                if (open) {
                                    onSelect(source.key);
                                }
                            }}
                        />
                    ))}
                </div>
            )}
            <StyleNotes notes={session?.data.lastImport()?.styles?.notes} />
        </ControlSection>
    );
}
