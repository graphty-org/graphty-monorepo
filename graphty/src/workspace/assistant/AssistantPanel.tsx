import "./assistant.css";

import { TooltipShortcut } from "@graphty/compact-mantine";
import { ActionIcon, Tooltip } from "@mantine/core";
import React, { useEffect, useRef } from "react";

import { closeAssistant } from "../assistant-door/commands";
import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/**
 * The Assistant's panel: its title, the x and the composer's region at the foot. Every call to the
 * composer (the rail button, Mod+I) focuses it; a reload that lands here leaves focus alone.
 * @returns The panel
 */
export default function AssistantPanel(): React.JSX.Element {
    const { store } = useWorkspace();
    const composerCalls = useWorkspaceState((state) => state.composerCalls);
    const composer = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (composerCalls > 0) {
            composer.current?.focus();
        }
    }, [composerCalls]);
    return (
        <section className="ws-assistant" aria-label="Assistant">
            <header className="ws-assistant-head">
                <h2 className="ws-assistant-title">Assistant</h2>
                <Tooltip label={<TooltipShortcut label="Close" shortcut={formatKey("Mod+I")} />}>
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label="Close"
                        aria-keyshortcuts={ariaKey("Mod+I")}
                        onClick={() => {
                            closeAssistant(store);
                        }}
                    >
                        <GLYPHS.close size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </header>
            <div className="ws-assistant-log" />
            {/* F6 lands here (`data-panel-start`). */}
            <div data-panel-start="">
                <div
                    ref={composer}
                    className="ws-assistant-composer"
                    role="group"
                    aria-label="Message the assistant"
                    tabIndex={0}
                    data-assistant-composer=""
                />
            </div>
        </section>
    );
}
