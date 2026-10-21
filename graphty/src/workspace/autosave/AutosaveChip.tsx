import type { AutosaveAtRisk, AutosaveStatus } from "@graphty/graphty-element";
import { ActionIcon, Badge, Group, VisuallyHidden } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { atRiskSentence, availableSentence, dataCountsFact, formatAutosaveChip } from "./words";

/**
 * The chip's dot for each tone. Shade 8 keeps the dot at 3:1 or better on the header; the label
 * itself is drawn in the text color (the dot variant), not in the tone.
 */
const TONE_COLOR = { ok: "green.8", busy: "blue.8", problem: "red.8" } as const;

/**
 * The header's autosave chip: where graphty-element's autosave stands, in the workspace's words.
 * Work kept only where the browser may delete it shows as a storage icon on the chip (hover for
 * the fact, click to save a copy); a failing write is the chip's own "not saved" state. Beside it
 * is the workspace's one polite status region, which hears the data's counts after every change
 * to the graph and the chip's state when a write starts failing.
 * @returns The chip and the status region
 */
export function AutosaveChip(): React.JSX.Element {
    const { element, session, store, run } = useWorkspace();
    const on = useWorkspaceState((state) => state.autosave);
    const [status, setStatus] = useState<AutosaveStatus | null>(null);
    const [atRisk, setAtRisk] = useState<AutosaveAtRisk | null>(null);
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
            setAtRisk(null);
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
        const onAtRisk = (event: HTMLElementEventMap["graphty-autosave-at-risk"]): void => {
            setAtRisk(event.detail);
        };
        element.addEventListener("graphty-autosave-status", onStatus);
        element.addEventListener("graphty-autosave-available", onAvailable);
        element.addEventListener("graphty-autosave-at-risk", onAtRisk);
        return () => {
            element.removeEventListener("graphty-autosave-status", onStatus);
            element.removeEventListener("graphty-autosave-available", onAvailable);
            element.removeEventListener("graphty-autosave-at-risk", onAtRisk);
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
            {atRisk === null ? null : (
                <ActionIcon
                    variant="subtle"
                    size="sm"
                    color="orange.9"
                    aria-label={`Save a copy (${atRiskSentence(atRisk)})`}
                    title={atRiskSentence(atRisk)}
                    data-testid="autosave-at-risk"
                    onClick={() => {
                        run("project.save");
                    }}
                >
                    <GLYPHS.saveLocal size={14} aria-hidden />
                </ActionIcon>
            )}
            {region}
        </Group>
    );
}
