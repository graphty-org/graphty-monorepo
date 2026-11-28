import type { NodeId } from "@graphty/graphty-element/session";
import { Button } from "@mantine/core";
import React from "react";

import { sourceStepsOn } from "../features";
import { INSPECTOR_EVENTS, useSessionEvents } from "../sessionEvents";
import { useWorkspace } from "../state/WorkspaceContext";
import { nodeSpace, openJoinWorkspace } from "./join";
import { JOIN_WORDS } from "./words";

/**
 * The inspector's Join on a node: opens the join workspace with a card whose node 1 is the node's
 * type, on its key. Only with the source-steps experiment on and a node the element keyed in a
 * space.
 * @param props - Component props
 * @param props.id - the inspected node, if one is
 * @returns the button, or nothing
 */
export function NodeJoinButton({ id }: Readonly<{ id: NodeId | undefined }>): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useSessionEvents(session, INSPECTOR_EVENTS);
    const space = id === undefined || session === null || !sourceStepsOn(session) ? null : nodeSpace(session, id);
    if (space === null) {
        return null;
    }
    return (
        <Button
            size="compact-xs"
            variant="default"
            onClick={() => {
                openJoinWorkspace(store, { into: space });
            }}
        >
            {JOIN_WORDS.join}
        </Button>
    );
}
