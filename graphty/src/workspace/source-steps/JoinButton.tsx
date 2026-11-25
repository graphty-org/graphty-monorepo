import type { NodeId, SourceKey } from "@graphty/graphty-element/session";
import { Button, Kbd } from "@mantine/core";
import React from "react";

import { sourceStepsOn } from "../features";
import { ariaKey, formatKey } from "../keys/keys";
import { INSPECTOR_EVENTS, useSessionEvents } from "../sessionEvents";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { nodeField1, openJoin } from "./join";
import { JOIN_KEY, JOIN_WORKSPACE_KEY } from "./keys";
import { JOIN_WORDS, WORKSPACE_WORDS } from "./words";

/**
 * Join (J): opens the Join card (design 5.2), disabled while a card is open.
 * @param props - Component props
 * @param props.start - Field 2's source (from a staged section) or the node whose type fills
 *   Field 1 (from the inspector)
 * @param props.disabled - also disabled
 * @returns the button
 */
export function JoinButton({
    start = {},
    disabled = false,
}: Readonly<{
    start?: { readonly field2?: SourceKey; readonly node?: NodeId };
    disabled?: boolean;
}>): React.JSX.Element {
    const { session, store } = useWorkspace();
    return (
        <KeyedButton
            combo={JOIN_KEY}
            label={JOIN_WORDS.join}
            disabled={disabled}
            onClick={() => {
                if (session === null) {
                    return;
                }
                const field1 = start.node === undefined ? null : nodeField1(session, start.node);
                openJoin(store, session, {
                    ...(field1 === null ? {} : { field1 }),
                    ...(start.field2 === undefined ? {} : { field2: start.field2 }),
                });
            }}
        />
    );
}

/**
 * A Sources button showing its key, off while a source card is open or before the session.
 * @param props - Component props
 * @param props.combo - its key
 * @param props.label - its words
 * @param props.disabled - also disabled
 * @param props.onClick - what it does
 * @returns the button
 */
function KeyedButton({
    combo,
    label,
    disabled = false,
    onClick,
}: Readonly<{ combo: string; label: string; disabled?: boolean; onClick: () => void }>): React.JSX.Element {
    const { session } = useWorkspace();
    const card = useWorkspaceState((state) => state.sourceCard);
    return (
        <Button
            size="compact-xs"
            variant="default"
            rightSection={<Kbd size="xs">{formatKey(combo)}</Kbd>}
            aria-keyshortcuts={ariaKey(combo)}
            disabled={disabled || card !== null || session === null}
            onClick={onClick}
        >
            {label}
        </Button>
    );
}

/**
 * The inspector's Join on a node: fills Field 1 with the node's type, on its key. Only with the
 * source-steps experiment on and a node the element keyed in a space.
 * @param props - Component props
 * @param props.id - the inspected node, if one is
 * @returns the button, or nothing
 */
export function NodeJoinButton({ id }: Readonly<{ id: NodeId | undefined }>): React.JSX.Element | null {
    const { session } = useWorkspace();
    useSessionEvents(session, INSPECTOR_EVENTS);
    if (id === undefined || session === null || !sourceStepsOn(session) || nodeField1(session, id) === null) {
        return null;
    }
    return <JoinButton start={{ node: id }} />;
}

/**
 * The Sources header's Joins: opens the join workspace with every join as a card (issue #9796).
 * @returns the button
 */
export function JoinWorkspaceButton(): React.JSX.Element {
    const { store } = useWorkspace();
    return (
        <KeyedButton
            combo={JOIN_WORKSPACE_KEY}
            label={WORKSPACE_WORDS.open}
            onClick={() => {
                store.set({ joinWorkspace: true });
            }}
        />
    );
}
