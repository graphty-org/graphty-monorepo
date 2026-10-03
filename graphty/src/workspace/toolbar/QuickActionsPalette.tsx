import { QuickActions } from "@graphty/compact-mantine";
import type React from "react";

import { formatKey } from "../keys/keys";
import { useWorkspace } from "../state/WorkspaceContext";

/** The order Quick actions lists the command homes in (tier1-design.md 2.3). */
const GROUP_ORDER = [
    "Go to",
    "Graph tree",
    "Analyze",
    "Data",
    "View",
    "Layout",
    "Selection",
    "Project",
    "Settings and help",
] as const;

/**
 * Quick actions (tier1-design.md 2.3): every built command by its one label, grouped by its home,
 * with its key; a disabled command is listed but cannot be run. Running one closes the palette
 * first, so a command that opens another popover opens it in the freed slot.
 * @param props - Component props
 * @param props.onClose - Closes the palette
 * @returns The palette
 */
export function QuickActionsPalette({ onClose }: { onClose: () => void }): React.JSX.Element {
    const workspace = useWorkspace();
    const actions = workspace.registry.live
        .filter((command) => command.id !== "quick-actions.open")
        .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))
        .map((command) => ({
            value: command.id,
            label: command.label,
            section: command.group,
            shortcut: command.keys?.[0] === undefined ? undefined : formatKey(command.keys[0]),
            keywords: command.keywords,
            disabled: (command.disabled?.(workspace) ?? null) !== null,
        }));
    return (
        <QuickActions
            actions={actions}
            placeholder="Search commands"
            onClose={onClose}
            onRun={(id) => {
                onClose();
                workspace.run(id);
            }}
        />
    );
}
