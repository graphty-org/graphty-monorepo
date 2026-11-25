import { ControlSection } from "@graphty/compact-mantine";
import { ActionIcon, Group, Tooltip } from "@mantine/core";
import React from "react";

import { GLYPHS } from "../glyphs";
import { ariaKey } from "../keys/keys";
import { useWorkspace } from "../state/WorkspaceContext";
import { openJoinWorkspace } from "./join";
import { JOIN_WORKSPACE_KEY } from "./keys";
import { KeyWords } from "./KeyWords";
import { WORKSPACE_WORDS } from "./words";

/**
 * "Join +" below the data sources (the source-steps experiment), built as "Filter +" is: an empty
 * section whose "+" opens the join workspace, with its key (Shift+J) shown beside it. It holds no
 * joins: every join is a card in the workspace.
 * @returns the row
 */
export function JoinRow(): React.JSX.Element {
    const { store } = useWorkspace();
    const open = (): void => {
        openJoinWorkspace(store);
    };
    return (
        <ControlSection
            label={WORKSPACE_WORDS.open}
            empty
            actions={
                <Group gap={4} wrap="nowrap" data-join-plus="">
                    <KeyWords combo={JOIN_WORKSPACE_KEY} />
                    <Tooltip label={WORKSPACE_WORDS.open}>
                        <ActionIcon
                            variant="subtle"
                            aria-label={WORKSPACE_WORDS.open}
                            aria-keyshortcuts={ariaKey(JOIN_WORKSPACE_KEY)}
                            onClick={open}
                        >
                            <GLYPHS.add size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            }
        />
    );
}
