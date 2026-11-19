import { NavRail, RailButton } from "@graphty/compact-mantine";
import { Indicator } from "@mantine/core";
import type React from "react";

import { closeAssistant } from "../assistant-door/commands";
import { GLYPHS } from "../glyphs";
import { formatKey } from "../keys/keys";
import { useCommand, useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useShownPlace } from "./shownPlace";

/**
 * The Assistant's glyph, with a neutral dot while a request waits for the reader.
 * @param props - Component props
 * @param props.waiting - whether one waits
 * @returns The glyph
 */
function AssistantGlyph({ waiting }: Readonly<{ waiting: boolean }>): React.JSX.Element {
    const glyph = <GLYPHS.assistant size={20} aria-hidden />;
    return waiting ? (
        <Indicator color="gray" size={8} offset={2} processing={false}>
            {glyph}
        </Indicator>
    ) : (
        glyph
    );
}

/**
 * The rail's Views button, while the element has the camera-views experiment on.
 * @param props - Component props
 * @param props.active - Whether the Views place is showing
 * @returns The button, or nothing with the experiment off
 */
function ViewsButton({ active }: Readonly<{ active: boolean }>): React.JSX.Element | null {
    const { store } = useWorkspace();
    const views = useCommand("place.views");
    if (views === null) {
        return null;
    }
    return (
        <RailButton
            icon={<GLYPHS.camera size={20} aria-hidden />}
            label="Views"
            active={active}
            aria-current={active ? "page" : undefined}
            onClick={() => {
                views.run();
                // A rail click keeps focus on the rail; only the other doors move it in.
                store.set({ viewsFocus: null });
            }}
        />
    );
}

/**
 * The rail (tier1-design.md section 2.2): Graph, Data and Notes, with Settings pinned to its foot
 * as the classic shell's activity rail pins it; Views after Data while the element has the
 * camera-views experiment on, wearing the Camera tool's glyph (design/ui/camera-views-tours-and-capture.md,
 * section 3.1); and Assistant after them while the element has the assistant experiment on, with a
 * neutral dot while a request waits for the reader. Icon buttons
 * with the shared tooltip; only Settings and Assistant have a key. Pressing the active Assistant closes it.
 * @returns The rail
 */
export function Rail(): React.JSX.Element {
    const { run, store } = useWorkspace();
    const place = useShownPlace(useWorkspaceState((state) => (state.page === "panels" ? state.place : "data")));
    const settingsOpen = useWorkspaceState((state) => state.dialog?.startsWith("settings") ?? false);
    const settings = useCommand("settings.open");
    const settingsKey = settings?.command.keys?.[0];
    const assistant = useCommand("place.assistant");
    const assistantKey = assistant?.command.keys?.[0];
    const waiting = useWorkspaceState((state) => state.assistantWaiting > 0) && place !== "assistant";
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
            <ViewsButton active={place === "views"} />
            {assistant === null ? null : (
                <RailButton
                    icon={<AssistantGlyph waiting={waiting} />}
                    label="Assistant"
                    shortcut={assistantKey === undefined ? undefined : formatKey(assistantKey)}
                    active={place === "assistant"}
                    aria-current={place === "assistant" ? "page" : undefined}
                    data-assistant-door=""
                    aria-description={waiting ? "Waiting for you" : undefined}
                    onClick={() => {
                        if (place === "assistant") {
                            closeAssistant(store);
                        } else {
                            assistant.run();
                        }
                    }}
                />
            )}
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
