import type { AutosaveStatus } from "@graphty/graphty-element";
import { Badge, Group, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { availableSentence, dataCountsFact, formatAutosaveChip } from "./words";

/**
 * The chip's dot for each tone. Shade 8 keeps the dot at 3:1 or better on the status bar; the label
 * itself is drawn in the text color (the dot variant), not in the tone.
 */
const TONE_COLOR = { ok: "green.8", busy: "blue.8", problem: "red.8" } as const;

/**
 * The status bar's autosave chip: where graphty-element's autosave stands, in the workspace's words.
 * A failing write is the chip's own "not saved" state. Beside it
 * is the workspace's one polite status region, which hears the data's counts after every change
 * to the graph and the chip's state when a write starts failing.
 * @returns The chip and the status region
 */
export function AutosaveChip(): React.JSX.Element {
    const { element, session, store } = useWorkspace();
    const on = useWorkspaceState((state) => state.autosave);
    const [status, setStatus] = useState<AutosaveStatus | null>(null);
    const [said, setSaid] = useState("");

    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        return session.on("project:changed", (change) => {
            if (change.slices.includes("graph")) {
                const stats = session.data.statistics();
                setSaid(dataCountsFact(stats.nodeCount, stats.edgeCount));
            }
        });
    }, [session]);

    useEffect(() => {
        if (!on || element === null) {
            setStatus(null);
            return undefined;
        }
        // The status event does not fire at start: read it once.
        let before = element.autosaver.status;
        setStatus(before);
        const onStatus = (event: HTMLElementEventMap["graphty-autosave-status"]): void => {
            const { detail } = event;
            // A write that starts failing is said once; the chip keeps showing it until one succeeds.
            if (detail.state === "failing" && before.state !== "failing") {
                setSaid(formatAutosaveChip(detail)?.label ?? "");
            }
            before = detail;
            setStatus(detail);
        };
        const onAvailable = (event: HTMLElementEventMap["graphty-autosave-available"]): void => {
            // "manual" is the start screen's own offer, made before this project opened.
            if (event.detail.reason !== "manual") {
                store.set({ notice: { message: availableSentence(event.detail) } });
            }
        };
        element.addEventListener("graphty-autosave-status", onStatus);
        element.addEventListener("graphty-autosave-available", onAvailable);
        return () => {
            element.removeEventListener("graphty-autosave-status", onStatus);
            element.removeEventListener("graphty-autosave-available", onAvailable);
        };
    }, [element, on, store]);

    const chip = status === null ? null : formatAutosaveChip(status);
    const region = (
        <VisuallyHidden role="status" aria-live="polite" data-testid="workspace-status">
            {said}
        </VisuallyHidden>
    );
    if (chip === null) {
        return region;
    }
    return (
        <Group gap={2} wrap="nowrap">
            <Badge variant="dot" color={TONE_COLOR[chip.tone]} title={chip.title} data-testid="autosave-chip">
                {chip.label}
            </Badge>
            {region}
        </Group>
    );
}
