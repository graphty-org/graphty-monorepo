import "./data-place.css";

import type { SourceKey } from "@graphty/graphty-element/session";
import React, { useState } from "react";

import { useSessionVersion } from "../inspector/hooks";
import { ServerPlace } from "../server/ServerForm";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { Fields } from "./Fields";
import { FiltersSection } from "./Filters";
import { Sources } from "./Sources";

/**
 * The Data place, the left sidebar's data (spec sections 3.2 to 3.4): the graph's name, then
 * Sources, the selected source's Fields, and Filters. Every fact is the element's
 * (`data.sources()`, `data.attributes()`, `visibility.steps`); this only arranges them. The
 * selected source is the reader's pick, the newest load until they pick one.
 * @returns The Data place
 */
export function DataPlace(): React.JSX.Element {
    const { session } = useWorkspace();
    useSessionVersion(session);
    const graphName = useWorkspaceState((state) => state.project?.name ?? "");
    const [picked, setPicked] = useState<SourceKey | undefined>(undefined);
    const sources = session?.data.sources() ?? [];
    const selected = sources.find((each) => each.key === picked) ?? sources.at(-1);

    return (
        <section className="dp" aria-label="Data place">
            <h2 className="dp-title">{graphName}</h2>
            <Sources sources={sources} selected={selected?.key} onSelect={setPicked} />
            <ServerPlace />
            <Fields source={selected} />
            <FiltersSection />
        </section>
    );
}
