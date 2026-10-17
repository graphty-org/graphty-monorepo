import type { AutosaveStatus } from "@graphty/graphty-element";
import { Badge } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { atRiskSentence, autosaveProblemSentence, availableSentence, formatAutosaveChip } from "./words";

/** The chip's color for each tone. */
const TONE_COLOR = { ok: "green", busy: "blue", problem: "red" } as const;

/** The action a warning about the browser's storage offers: a copy in a file. */
const SAVE_ACTION = "Save";

/**
 * The header's autosave chip: where graphty-element's autosave stands, in the workspace's words.
 * It also turns the element's warnings into notices: work kept only where the browser may delete
 * it, work it found and did not reopen, and a write that failed. Nothing while autosave is off.
 * @returns The chip, or nothing
 */
export function AutosaveChip(): React.JSX.Element | null {
    const { element, store, run } = useWorkspace();
    const on = useWorkspaceState((state) => state.autosave);
    const [status, setStatus] = useState<AutosaveStatus | null>(null);

    useEffect(() => {
        if (!on || element === null) {
            setStatus(null);
            return undefined;
        }
        const save = {
            label: SAVE_ACTION,
            run: () => {
                run("project.save");
            },
        };
        // The status event does not fire at start: read it once.
        let before = element.autosaver.status;
        setStatus(before);
        const onStatus = (event: HTMLElementEventMap["graphty-autosave-status"]): void => {
            const { detail } = event;
            // A write that starts failing is said once; the chip keeps saying it until one succeeds.
            if (detail.state === "failing" && detail.problem !== null && before.state !== "failing") {
                store.set({ notice: { message: autosaveProblemSentence(detail.problem), action: save } });
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
            store.set({ notice: { message: atRiskSentence(event.detail), action: save } });
        };
        element.addEventListener("graphty-autosave-status", onStatus);
        element.addEventListener("graphty-autosave-available", onAvailable);
        element.addEventListener("graphty-autosave-at-risk", onAtRisk);
        return () => {
            element.removeEventListener("graphty-autosave-status", onStatus);
            element.removeEventListener("graphty-autosave-available", onAvailable);
            element.removeEventListener("graphty-autosave-at-risk", onAtRisk);
        };
    }, [element, on, run, store]);

    const chip = status === null ? null : formatAutosaveChip(status);
    if (chip === null) {
        return null;
    }
    return (
        <Badge variant="light" color={TONE_COLOR[chip.tone]} title={chip.title} data-testid="autosave-chip">
            {chip.label}
        </Badge>
    );
}
