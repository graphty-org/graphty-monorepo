import { ControlSection } from "@graphty/compact-mantine";
import type { LoadedSource, SourceKey } from "@graphty/graphty-element/session";
import React, { useEffect, useRef } from "react";

import { sourceStepsOn } from "../features";
import { JoinButton, JoinWorkspaceButton } from "../source-steps/JoinButton";
import { JoinCard } from "../source-steps/JoinCard";
import { ReaderEdits } from "../source-steps/ReaderEdits";
import { StagedSection } from "../source-steps/StagedSection";
import { StepCard } from "../source-steps/StepCard";
import { StepsList } from "../source-steps/StepsList";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { StyleNotes } from "../styles/StyleNotes";
import { AddSourceMenu } from "./AddSourceMenu";
import { SourceRow } from "./SourceRow";

/**
 * The Sources section (spec section 3.2): one row per load still in the graph
 * (`data.sources()`), oldest first, and "+" to add one. Clicking a row selects it, and the Fields
 * section below shows its special fields. A load added while the section is drawn takes focus on
 * its row, unless the reader is typing in a field. A staged source (the source-steps experiment)
 * shows as its own dashed section after the rows; then the reader's edits and the committed steps,
 * and the card that removes a step or a source.
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
    const card = useWorkspaceState((state) => state.sourceCard);
    const list = useRef<HTMLDivElement>(null);
    // Only the source-steps experiment stages a source: off, the list is empty and a staged source
    // a saved project holds is one of `sources`.
    const stepsOn = session !== null && sourceStepsOn(session);
    const staged = stepsOn ? session.data.staged() : [];
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
        list.current?.querySelector<HTMLElement>(`[data-source="${CSS.escape(added.key)}"] .dp-source-main`)?.focus();
    }, [sources]);
    return (
        <ControlSection
            label="Data sources"
            actions={
                <>
                    {stepsOn && staged.length + sources.length >= 2 ? <JoinButton /> : null}
                    {stepsOn && staged.length + sources.length >= 2 ? <JoinWorkspaceButton /> : null}
                    <AddSourceMenu />
                </>
            }
            empty={sources.length === 0 && staged.length === 0}
        >
            {sources.length === 0 ? null : (
                <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- a <ul>/<li> would bring list styling and spacing the compact rows do not use; the role gives the same semantics
                    ref={list}
                    role="list"
                    aria-label="Data sources"
                    className="dp-sources"
                >
                    {sources.map((source) => (
                        <SourceRow
                            key={source.key}
                            source={source}
                            selected={source.key === selected}
                            onSelect={() => {
                                onSelect(source.key);
                            }}
                        />
                    ))}
                </div>
            )}
            {staged.map((source) => (
                <StagedSection key={source.key} source={source} />
            ))}
            {stepsOn && card?.kind === "join" ? <JoinCard session={session} card={card} /> : null}
            {stepsOn && card?.kind === "step" ? <StepCard session={session} card={card} /> : null}
            {stepsOn ? <ReaderEdits session={session} /> : null}
            {stepsOn ? <StepsList session={session} folded={card !== null} /> : null}
            <StyleNotes notes={session?.data.lastImport()?.styles?.notes} />
        </ControlSection>
    );
}
