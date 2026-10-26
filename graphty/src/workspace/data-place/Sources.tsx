import { ControlSection } from "@graphty/compact-mantine";
import type { LoadedSource, SourceKey } from "@graphty/graphty-element/session";
import React, { useEffect, useRef } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { StyleNotes } from "../styles/StyleNotes";
import { AddSourceMenu } from "./AddSourceMenu";
import { SourceRow } from "./SourceRow";

/**
 * The Sources section (spec section 3.2): one row per load still in the graph
 * (`data.sources()`), oldest first, and "+" to add one. Clicking a row selects it, and the Fields
 * section below shows its special fields. A load added while the section is drawn takes focus on
 * its row, unless the reader is typing in a field.
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
    const known = useRef<ReadonlySet<SourceKey> | null>(null);
    useEffect(() => {
        const before = known.current;
        known.current = new Set(sources.map((source) => source.key));
        const added = before === null ? undefined : sources.filter((source) => !before.has(source.key)).at(-1); // NOSONAR(S7750): graphty's lib is ES2022, which has no Array#findLast
        const active = document.activeElement;
        const typing = active instanceof HTMLElement && active.matches("input, textarea, [contenteditable]");
        if (added === undefined || typing) {
            return;
        }
        list.current?.querySelector<HTMLElement>(`[data-source="${CSS.escape(added.key)}"] .dp-source-main`)?.focus();
    }, [sources]);
    return (
        <ControlSection label="Sources" actions={<AddSourceMenu />} empty={sources.length === 0}>
            {sources.length === 0 ? null : (
                <div // NOSONAR(S6819): a <ul>/<li> would bring list styling and spacing the compact rows do not use; the role gives the same semantics
                    ref={list}
                    role="list"
                    aria-label="Sources"
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
            <StyleNotes notes={session?.data.lastImport()?.styles?.notes} />
        </ControlSection>
    );
}
