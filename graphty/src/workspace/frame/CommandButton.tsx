import { TooltipShortcut } from "@graphty/compact-mantine";
import { ActionIcon, Tooltip } from "@mantine/core";
import type React from "react";

import { formatKey } from "../keys/keys";
import { useCommand } from "../state/WorkspaceContext";

/** Props for CommandButton. */
interface CommandButtonProps {
    /** The command id. */
    id: string;
    /** The glyph. */
    icon: React.ReactNode;
    /** Whether the thing it opens is open (`aria-pressed`). */
    pressed?: boolean;
}

/**
 * An icon-only button for one command: its label is the accessible name, the tooltip shows the
 * label and the first key, and a disabled command stays focusable with its reason as the tooltip
 * (tier1-design.md section 4, "Tooltip" and "Disabled"). Draws nothing for a stub command.
 * @param props - Component props
 * @param props.id - The command id
 * @param props.icon - The glyph
 * @param props.pressed - Whether the thing it opens is open
 * @returns The button, or null
 */
export function CommandButton({ id, icon, pressed }: CommandButtonProps): React.JSX.Element | null {
    const door = useCommand(id);
    if (door === null) {
        return null;
    }
    const { command, disabledReason, run } = door;
    const key = command.keys?.[0];
    const label =
        key === undefined ? command.label : <TooltipShortcut label={command.label} shortcut={formatKey(key)} />;
    return (
        <Tooltip label={disabledReason ?? label}>
            <ActionIcon
                variant="subtle"
                aria-label={command.label}
                aria-pressed={pressed}
                aria-disabled={disabledReason !== null}
                data-disabled={disabledReason === null ? undefined : true}
                onClick={disabledReason === null ? run : undefined}
            >
                {icon}
            </ActionIcon>
        </Tooltip>
    );
}
