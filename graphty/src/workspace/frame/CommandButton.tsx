import { TooltipShortcut } from "@graphty/compact-mantine";
import { ActionIcon, Tooltip } from "@mantine/core";
import type React from "react";

import { formatKey } from "../keys/keys";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";

/** Props for CommandButton. */
interface CommandButtonProps {
    /** The command id. */
    id: string;
    /** The glyph. */
    icon: React.ReactNode;
    /** Whether the thing it opens is open (`aria-pressed`). */
    pressed?: boolean;
    /**
     * Whether Tab passes over the button while its command cannot run. For a button the reader
     * would only press when it can act (Undo, Redo), so a Tab walk does not stop on it; a pointer
     * still shows its reason.
     */
    skipWhileDisabled?: boolean;
}

/**
 * An icon-only button for one command: its label is the accessible name, the tooltip shows the
 * label (or the command's own tooltip name) and the first key, and a disabled command stays focusable with its reason as the tooltip
 * (tier1-design.md section 4, "Tooltip" and "Disabled"); pressed while disabled, it says that
 * reason ("Nothing to undo"), so a second Enter on Undo is never silent. Draws nothing for a stub
 * command.
 * @param props - Component props
 * @param props.id - The command id
 * @param props.icon - The glyph
 * @param props.pressed - Whether the thing it opens is open
 * @param props.skipWhileDisabled - Whether Tab passes over it while its command cannot run
 * @returns The button, or null
 */
export function CommandButton({
    id,
    icon,
    pressed,
    skipWhileDisabled = false,
}: Readonly<CommandButtonProps>): React.JSX.Element | null {
    const door = useCommand(id);
    const { store } = useWorkspace();
    if (door === null) {
        return null;
    }
    const { command, disabledReason, tip, run } = door;
    const key = command.keys?.[0];
    const label = key === undefined ? tip : <TooltipShortcut label={tip} shortcut={formatKey(key)} />;
    return (
        <Tooltip label={disabledReason ?? label}>
            <ActionIcon
                variant="subtle"
                aria-label={command.label}
                aria-pressed={pressed}
                aria-disabled={disabledReason !== null}
                data-disabled={disabledReason === null ? undefined : true}
                tabIndex={skipWhileDisabled && disabledReason !== null ? -1 : undefined}
                onClick={
                    disabledReason === null
                        ? run
                        : () => {
                              store.set({ announcement: disabledReason });
                          }
                }
            >
                {icon}
            </ActionIcon>
        </Tooltip>
    );
}
