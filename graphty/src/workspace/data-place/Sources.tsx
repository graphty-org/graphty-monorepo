import { ControlSection } from "@graphty/compact-mantine";
import type { LoadedSource, SourceKey } from "@graphty/graphty-element/session";
import React from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { StyleNotes } from "../styles/StyleNotes";
import { AddSourceMenu } from "./AddSourceMenu";
import { SourceRow } from "./SourceRow";

/**
 * The Sources section (spec section 3.2): one row per load still in the graph
 * (`data.sources()`), oldest first, and "+" to add one. Clicking a row selects it, and the Fields
 * section below shows its special fields.
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
    return (
        <ControlSection label="Sources" actions={<AddSourceMenu />} empty={sources.length === 0}>
            {sources.length === 0 ? null : (
                <div role="list" aria-label="Sources" className="dp-sources">
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
