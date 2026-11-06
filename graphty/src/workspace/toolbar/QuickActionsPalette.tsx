import { QuickActions } from "@graphty/compact-mantine";
import React, { useState } from "react";

import type { Command } from "../commands/registry";
import { formatKey } from "../keys/keys";
import { useWorkspace } from "../state/WorkspaceContext";
import { matchesWordStart } from "../style/words";

/** The order Quick actions lists the command homes in (tier1-design.md 2.3). */
const GROUP_ORDER = [
    "Go to",
    "Graph tree",
    "Analyze",
    "Data",
    "Notes",
    "View",
    "Layout",
    "Selection",
    "Project",
    "Settings and help",
] as const;

/**
 * Quick actions (tier1-design.md 2.3): every built command by its one label, grouped by its home,
 * with its key; a disabled command is listed with its reason but cannot be run. A search lists the
 * commands it matches at the start of a word (of the label or a keyword) before those it matches
 * inside a word, so "ai" finds Assistant before "Select what it paints". Running one closes the
 * palette first, so a command that opens another popover opens it in the freed slot.
 * @param props - Component props
 * @param props.onClose - Closes the palette
 * @returns The palette
 */
export function QuickActionsPalette({ onClose }: Readonly<{ onClose: () => void }>): React.JSX.Element {
    const workspace = useWorkspace();
    const [query, setQuery] = useState("");
    const inside = (command: Command): number =>
        [command.label, ...(command.keywords ?? [])].some((words) => matchesWordStart(words, query)) ? 0 : 1;
    const actions = workspace.registry.live
        .filter((command) => command.id !== "quick-actions.open" && command.shown?.(workspace) !== false)
        .sort((a, b) => inside(a) - inside(b) || GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))
        .map((command) => {
            const reason = command.disabled?.(workspace) ?? null;
            return {
                value: command.id,
                label: command.label,
                section: command.group,
                shortcut: command.keys?.[0] === undefined ? undefined : formatKey(command.keys[0]),
                keywords: command.keywords,
                disabled: reason !== null,
                description: reason ?? undefined,
            };
        });
    return (
        <QuickActions
            actions={actions}
            query={query}
            onQueryChange={setQuery}
            placeholder="Search commands"
            onClose={onClose}
            onRun={(id) => {
                onClose();
                workspace.run(id);
            }}
        />
    );
}
