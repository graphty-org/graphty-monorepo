import "./data-place.css";

import type { SourceKey } from "@graphty/graphty-element/session";
import { Tabs } from "@mantine/core";
import React from "react";

import { selectionWorkspaceOn } from "../features";
import { SOURCE_GLYPHS } from "../glyphs";
import { useSessionVersion } from "../inspector/hooks";
import { JoinRow } from "../join-workspace/JoinRow";
import { ServerPlace } from "../server/ServerForm";
import { useNumberFormats } from "../settings/numberFormat";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { Fields } from "./Fields";
import { FiltersSection } from "./Filters";
import { ResultsList } from "./Runs";
import { Sources } from "./Sources";
import type { SourceKind } from "./words";

/**
 * A source's icon, which the source inspector's header draws.
 * @param props - Component props
 * @param props.kind - The source's kind
 * @returns The icon
 */
export function SourceGlyph({ kind }: Readonly<{ kind: SourceKind }>): React.JSX.Element {
    const { icon: Icon, color } = SOURCE_GLYPHS[kind];
    return <Icon size={14} color={color} aria-hidden />;
}

/**
 * The Data place, the left sidebar's data (data prototype spec sections 3.2 to 3.4): the graph's
 * name, then Sources, the selected source's Fields, and Filters (tier2-design.md section 1). In the
 * `selection-workspace` experiment the panel's first row is two tabs, Sources and Calculated (the
 * results), as Figma's panel tabs are (the owner, 2026-11-07); only the chosen tab's body scrolls.
 * Sources holds Data sources, then each load as a section of its own: its node and edge rows, the
 * columns its rows carry, and its own Filters, which judge only that load's elements. The filters
 * of no load (made before a second load came, or from the toolbar with several loads) sit under
 * Data sources. The tab is the reader's, kept per project. Every
 * fact is the element's (`data.sources()`, `data.attributes()`, `visibility.steps`); this only
 * arranges them. The selected source is the reader's pick, kept in the workspace store so a visit to
 * another place keeps it, and the newest load until they pick one; picking one also opens it in the
 * inspector.
 * @returns The Data place
 */
export function DataPlace(): React.JSX.Element {
    const { session, store } = useWorkspace();
    useSessionVersion(session);
    // The reader's Number format respells the counts.
    useNumberFormats();
    const graphName = useWorkspaceState((state) => state.project?.name ?? "");
    const picked = useWorkspaceState((state) => state.pickedSource);
    const sources = session?.data.sources() ?? [];
    const selected = sources.find((each) => each.key === picked) ?? sources.at(-1);
    // A press picks the load for Fields and opens it in the inspector: what it added and what it
    // left out, with Edit source and Replace in its "...".
    const select = (key: SourceKey): void => {
        const at = sources.findIndex((each) => each.key === key);
        if (at !== -1) {
            store.set({ pickedSource: key, inspected: { kind: "source", id: `source:${String(at)}` } });
        }
    };

    const tab = useWorkspaceState((state) => state.dataTab);
    const sourcesSection = <Sources sources={sources} selected={selected?.key} onSelect={select} />;
    if (session === null || !selectionWorkspaceOn(session)) {
        return (
            <section className="dp" aria-label="Data place">
                <h2 className="dp-title">{graphName}</h2>
                {sourcesSection}
                <JoinRow sources={sources} />
                <ServerPlace />
                <Fields sources={sources} selected={selected} />
                <FiltersSection />
            </section>
        );
    }
    return (
        <section className="dp" data-tabs="" aria-label="Data place">
            <h2 className="dp-title">{graphName}</h2>
            <Tabs
                variant="default"
                keepMounted={false}
                className="dp-tabs"
                value={tab}
                onChange={(next) => {
                    if (next === "loaded" || next === "calculated") {
                        store.set({ dataTab: next });
                    }
                }}
            >
                <Tabs.List aria-label="Data">
                    {/* The stored value stays "loaded": it is saved per project. */}
                    <Tabs.Tab value="loaded">Sources</Tabs.Tab>
                    <Tabs.Tab value="calculated">Calculated</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="loaded" className="dp-tab-body">
                    {sourcesSection}
                    {/* Join + sits above the per-source sections (the join-workspace experiment). */}
                    <JoinRow sources={sources} />
                    {/* Each load's filters sit in its own section; with no load, or several, the
                        filters of every load sit here, under Data sources. */}
                    {sources.length === 1 ? null : <FiltersSection unscoped={sources.length > 1} />}
                    <ServerPlace />
                    <Fields sources={sources} selected={selected} filters />
                </Tabs.Panel>
                <Tabs.Panel value="calculated" className="dp-tab-body">
                    <ResultsList />
                </Tabs.Panel>
            </Tabs>
        </section>
    );
}
