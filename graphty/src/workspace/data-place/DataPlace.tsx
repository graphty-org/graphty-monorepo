import "./data-place.css";

import type { SourceKey } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { GLYPHS, SOURCE_GLYPHS } from "../glyphs";
import { useSessionVersion } from "../inspector/hooks";
import { ServerPlace } from "../server/ServerForm";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { Fields } from "./Fields";
import { FiltersSection } from "./Filters";
import { Sources } from "./Sources";
import type { SourceKind, TypeGlyph } from "./words";

const TYPE_GLYPHS: Record<TypeGlyph, React.ReactNode> = {
    category: <GLYPHS.category size={14} aria-hidden />,
    text: <GLYPHS.text size={14} aria-hidden />,
    number: <GLYPHS.number size={14} aria-hidden />,
    ordinal: <GLYPHS.ordinal size={14} aria-hidden />,
    time: <GLYPHS.time size={14} aria-hidden />,
    "yes-no": <GLYPHS.yesNo size={14} aria-hidden />,
    unknown: <GLYPHS.unknown size={14} aria-hidden />,
    result: <GLYPHS.measure size={14} aria-hidden />,
};

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
 * An attribute's type icon, which the attribute inspector's header draws.
 * @param props - Component props
 * @param props.glyph - The attribute's type glyph
 * @returns The icon
 */
export function TypeGlyphIcon({ glyph }: Readonly<{ glyph: TypeGlyph }>): React.JSX.Element {
    return <>{TYPE_GLYPHS[glyph]}</>;
}

/**
 * The Data place, the left sidebar's data (data prototype spec sections 3.2 to 3.4): the graph's
 * name, then Sources, the selected source's Fields, and Filters (tier2-design.md section 1). Every
 * fact is the element's (`data.sources()`, `data.attributes()`, `visibility.steps`); this only
 * arranges them. The selected source is the reader's pick, the newest load until they pick one;
 * picking one also opens it in the inspector.
 * @returns The Data place
 */
export function DataPlace(): React.JSX.Element {
    const { session, store } = useWorkspace();
    useSessionVersion(session);
    const graphName = useWorkspaceState((state) => state.project?.name ?? "");
    const [picked, setPicked] = useState<SourceKey | undefined>(undefined);
    const sources = session?.data.sources() ?? [];
    const selected = sources.find((each) => each.key === picked) ?? sources.at(-1);
    // A press picks the load for Fields and opens it in the inspector: what it added and what it
    // left out, with Edit source and Replace in its "...".
    const select = (key: SourceKey): void => {
        setPicked(key);
        const at = sources.findIndex((each) => each.key === key);
        if (at !== -1) {
            store.set({ inspected: { kind: "source", id: `source:${String(at)}` } });
        }
    };

    return (
        <section className="dp" aria-label="Data place">
            <h2 className="dp-title">{graphName}</h2>
            <Sources sources={sources} selected={selected?.key} onSelect={select} />
            <ServerPlace />
            <Fields source={selected} />
            <FiltersSection />
        </section>
    );
}
