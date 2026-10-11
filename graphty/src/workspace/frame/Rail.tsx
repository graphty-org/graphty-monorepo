import { NavRail, RailButton } from "@graphty/compact-mantine";
import type React from "react";

import { GLYPHS } from "../glyphs";
import { formatKey } from "../keys/keys";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/**
 * The rail (tier1-design.md section 2.2): Graph, Data and Notes, with Settings pinned to its foot
 * as the classic shell's activity rail pins it. Views and Assistant are not drawn until they are
 * built. Icon buttons with the shared tooltip; only Settings has a key.
 * @returns The rail
 */
export function Rail(): React.JSX.Element {
    const { run } = useWorkspace();
    const place = useWorkspaceState((state) => (state.page === "panels" ? state.place : "data"));
    const settingsOpen = useWorkspaceState((state) => state.dialog?.startsWith("settings") ?? false);
    const settings = useCommand("settings.open");
    const settingsKey = settings?.command.keys?.[0];
    return (
        <NavRail
            aria-label="Places"
            className="ws-rail"
            footer={
                settings === null ? undefined : (
                    <RailButton
                        icon={<GLYPHS.settings size={20} aria-hidden />}
                        label="Settings"
                        shortcut={settingsKey === undefined ? undefined : formatKey(settingsKey)}
                        aria-haspopup="dialog"
                        aria-expanded={settingsOpen}
                        onClick={settings.run}
                    />
                )
            }
        >
            <RailButton
                icon={<GLYPHS.graph size={20} aria-hidden />}
                label="Graph"
                active={place === "graph"}
                aria-current={place === "graph" ? "page" : undefined}
                onClick={() => {
                    run("place.graph");
                }}
            />
            <RailButton
                icon={<GLYPHS.data size={20} aria-hidden />}
                label="Data"
                active={place === "data"}
                aria-current={place === "data" ? "page" : undefined}
                onClick={() => {
                    run("place.data");
                }}
            />
            <RailButton
                icon={<GLYPHS.notes size={20} aria-hidden />}
                label="Notes"
                active={place === "notes"}
                aria-current={place === "notes" ? "page" : undefined}
                onClick={() => {
                    run("place.notes");
                }}
            />
        </NavRail>
    );
}
