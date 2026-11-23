import "./source-steps.css";

import { SegmentedControl } from "@graphty/compact-mantine";
import { Group, Kbd } from "@mantine/core";
import React from "react";

import { sourceStepsOn } from "../features";
import { ariaKey, formatKey } from "../keys/keys";
import { useSessionEvents } from "../sessionEvents";
import { useWorkspace } from "../state/WorkspaceContext";
import { SIDE_KEY } from "./keys";
import { openDraft, showSide } from "./preview";
import { PREVIEW_WORDS } from "./words";

/** The element's events after which the chip reads the draft again. */
const DRAFT_EVENTS = ["data:draft-changed"] as const;

/**
 * Before / After (B) over the canvas while a source card's draft is drawn (the source-steps
 * experiment, design 5.3): which side of the commit the graph shows. The element draws the draft.
 * @returns the chip, or nothing while no draft is drawn
 */
export function BeforeAfterChip(): React.JSX.Element | null {
    const { session } = useWorkspace();
    useSessionEvents(session, DRAFT_EVENTS);
    const draft = session !== null && sourceStepsOn(session) ? openDraft(session) : null;
    if (session === null || draft?.displayed !== true) {
        return null;
    }
    return (
        <Group className="ss-draft-chip" gap={6} wrap="nowrap">
            <SegmentedControl
                size="xs"
                aria-label={PREVIEW_WORDS.beforeAfter}
                aria-keyshortcuts={ariaKey(SIDE_KEY)}
                value={draft.side}
                data={[
                    { value: "before", label: PREVIEW_WORDS.before },
                    { value: "after", label: PREVIEW_WORDS.after },
                ]}
                onChange={(value) => {
                    void showSide(session, value === "before" ? "before" : "after");
                }}
            />
            <Kbd size="xs">{formatKey(SIDE_KEY)}</Kbd>
        </Group>
    );
}
