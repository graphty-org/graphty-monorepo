import "./data-place.css";

import type { SourceKey } from "@graphty/graphty-element/session";
import React from "react";

import { SOURCE_GLYPHS } from "../glyphs";
import { useSessionVersion } from "../inspector/hooks";
import { ServerPlace } from "../server/ServerForm";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { Fields } from "./Fields";
import { FiltersSection } from "./Filters";
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
 * name, then Sources, the selected source's Fields, and Filters (tier2-design.md section 1). Every
 * fact is the element's (`data.sources()`, `data.attributes()`, `visibility.steps`); this only
 * arranges them. The selected source is the reader's pick, kept in the workspace store so a visit to
 * another place keeps it, and the newest load until they pick one; picking one also opens it in the
 * inspector.
 * @returns The Data place
 */
export function DataPlace(): React.JSX.Element {
    const { session, store } = useWorkspace();
    useSessionVersion(session);
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

    return (
        <section className="dp" aria-label="Data place">
            <h2 className="dp-title">{graphName}</h2>
            <Sources sources={sources} selected={selected?.key} onSelect={select} />
            <ServerPlace />
            <Fields sources={sources} selected={selected} />
            <FiltersSection />
        </section>
    );
}
