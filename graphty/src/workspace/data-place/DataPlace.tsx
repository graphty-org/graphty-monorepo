import "./data-place.css";

import type { SourceKey } from "@graphty/graphty-element/session";
import { Tabs } from "@mantine/core";
import React from "react";

import { selectionWorkspaceOn } from "../features";
import { SOURCE_GLYPHS } from "../glyphs";
import { useSessionVersion } from "../inspector/hooks";
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
 * `selection-workspace` experiment the panel's first row is two tabs, Loaded (Sources, the server
 * form, Fields) and Calculated (the results), as Figma's panel tabs are; Filters sit under the tab
 * row in both tabs and stay put, since a filter tests loaded and calculated columns alike, and only
 * the chosen tab's body scrolls. The tab is the reader's, kept per project. Every
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
    const loaded = (
        <>
            <Sources sources={sources} selected={selected?.key} onSelect={select} />
            <ServerPlace />
            <Fields sources={sources} selected={selected} />
        </>
    );
    if (session === null || !selectionWorkspaceOn(session)) {
        return (
            <section className="dp" aria-label="Data place">
                <h2 className="dp-title">{graphName}</h2>
                {loaded}
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
                    <Tabs.Tab value="loaded">Loaded</Tabs.Tab>
                    <Tabs.Tab value="calculated">Calculated</Tabs.Tab>
                </Tabs.List>
                {/* Under the tab row, so the tabs never move, and drawn for both tabs. */}
                <FiltersSection />
                <Tabs.Panel value="loaded" className="dp-tab-body">
                    {loaded}
                </Tabs.Panel>
                <Tabs.Panel value="calculated" className="dp-tab-body">
                    <ResultsList />
                </Tabs.Panel>
            </Tabs>
        </section>
    );
}
