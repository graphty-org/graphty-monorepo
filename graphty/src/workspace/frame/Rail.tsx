import { NavRail, RailButton } from "@graphty/compact-mantine";
import { Database, Workflow } from "lucide-react";
import type React from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/**
 * The rail (tier1-design.md section 2.2): Graph and Data only in tier 1. Views, Notes and
 * Assistant are not drawn until they are built. Icon buttons with the shared tooltip, no hotkeys.
 * @returns The rail
 */
export function Rail(): React.JSX.Element {
    const { run } = useWorkspace();
    const place = useWorkspaceState((state) => (state.page === "panels" ? state.place : "data"));
    return (
        <NavRail aria-label="Places" className="ws-rail">
            <RailButton
                icon={<Workflow size={20} aria-hidden />}
                label="Graph"
                active={place === "graph"}
                aria-current={place === "graph" ? "page" : undefined}
                onClick={() => {
                    run("place.graph");
                }}
            />
            <RailButton
                icon={<Database size={20} aria-hidden />}
                label="Data"
                active={place === "data"}
                aria-current={place === "data" ? "page" : undefined}
                onClick={() => {
                    run("place.data");
                }}
            />
        </NavRail>
    );
}
