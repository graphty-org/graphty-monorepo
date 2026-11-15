import { TooltipShortcut } from "@graphty/compact-mantine";
import { ActionIcon, Tooltip } from "@mantine/core";
import type React from "react";

import { ariaKey, formatKey } from "../keys/keys";
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
     * A press leaves open pop-outs open (Undo and Redo): the reader sees the change taken back in
     * the pop-out it was made in.
     */
    keepsPopouts?: boolean;
}

/**
 * An icon-only button for one command: its tooltip name (the command's own, such as "Undo
 * changing node color on Everything", else its label) is the accessible name, the tooltip shows
 * it and the first key, and a disabled command stays focusable with its reason as the tooltip
 * (tier1-design.md section 4, "Tooltip" and "Disabled"); pressed while disabled, it says that
 * reason ("Nothing to undo") and clears the notice of its last run, so a second Enter on Undo is
 * never silent and never reads as a second undo. Draws nothing for a stub
 * command.
 * @param props - Component props
 * @param props.id - The command id
 * @param props.icon - The glyph
 * @param props.pressed - Whether the thing it opens is open
 * @param props.keepsPopouts - Whether a press leaves open pop-outs open
 * @returns The button, or null
 */
export function CommandButton({
    id,
    icon,
    pressed,
    keepsPopouts,
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
                aria-label={tip}
                // Every key, where the tooltip shows the first: Redo is Shift+Control+Z and Control+Y.
                aria-keyshortcuts={command.keys?.map(ariaKey).join(" ")}
                aria-pressed={pressed}
                data-popout-keep={keepsPopouts === true ? "" : undefined}
                aria-disabled={disabledReason !== null}
                data-disabled={disabledReason === null ? undefined : true}
                onClick={
                    disabledReason === null
                        ? run
                        : () => {
                              // The notice of what it last did ("Undid ...") goes: the button
                              // did nothing this time, and its tooltip says why.
                              store.set({ announcement: disabledReason, notice: null });
                          }
                }
            >
                {icon}
            </ActionIcon>
        </Tooltip>
    );
}
