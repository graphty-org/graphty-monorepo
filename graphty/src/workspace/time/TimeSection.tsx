/**
 * The Data place's Time section (design/data/timeline-attribute.md section 6.6): designate the
 * time field and set how the window moves. Every value is graphty-element's (`session.time`): the
 * field, its unit, and the window's step, mode and algorithm-results option. Only the playback
 * speed is the app's, a reader preference.
 */

import { ControlSection, FieldRow, PanelField, PanelLabelsProvider, SegmentedControl } from "@graphty/compact-mantine";
import type {
    CodedFact,
    GraphSession,
    TimeField,
    TimeNoticeCode,
    TimeResultsPolicy,
    TimeStep,
    TimeUnit,
    TimeWindowInput,
} from "@graphty/graphty-element/session";
import { Input, Stack } from "@mantine/core";
import React from "react";

import type { WorkspaceStore } from "../state/store";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { unitOf } from "./timeActions";
import {
    CALENDAR_STEPS,
    intervalOf,
    ORDINAL_STEPS,
    RESULTS_CHOICES,
    SPEEDS,
    stepLabel,
    UNIT_CHOICES,
} from "./timeWords";
import { useTimeVersion } from "./useTimeVersion";

/** The Field menu's value for "no time field". */
const NONE = "none";

/**
 * A notice from designating a field, in words.
 * @param notice - the element's notice.
 * @returns one short line.
 */
function noticeWords(notice: CodedFact<TimeNoticeCode>): string {
    const { path, count } = notice.params as { path: string; count?: number };
    switch (notice.code) {
        case "time.unparsed":
            return `${String(count)} values in ${path} are not times`;
        case "time.parsed-loosely":
            return `${String(count)} values in ${path} were read as dates loosely`;
        default:
            return `${path} looks like seconds: set its unit to Epoch s`;
    }
}

/**
 * Designates a column as the time field (or none), and says what the element found in it.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param field - the field, or null.
 */
function designate(session: GraphSession, store: WorkspaceStore, field: TimeField | null): void {
    session.time.pause();
    session.time.setField(field).then(
        (result) => {
            const words = result.notices.map(noticeWords);
            if (words.length > 0) {
                store.set({ notice: { message: words.join(". ") } });
            }
        },
        () => {
            store.set({ notice: { message: "That attribute cannot be the time field." } });
        },
    );
}

/**
 * Changes the window's settings; with no window yet, the element opens one at the start.
 * @param session - the element's session.
 * @param patch - what changes.
 */
function retune(session: GraphSession, patch: TimeWindowInput): void {
    session.time.window(patch).then(
        () => undefined,
        () => undefined,
    );
}

/**
 * The Time section: Field (and its unit for a number column), Step, Mode, Speed and Results.
 * @returns the section.
 */
export function TimeSection(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useTimeVersion(session);
    const speed = useWorkspaceState((state) => state.timeSpeed);
    if (session === null) {
        return null;
    }
    const { time } = session;
    const attributes = session.data.attributes().filter((a) => a.origin !== "result");
    const { field } = time;
    const designated = field?.edges ?? field?.nodes;
    const kind = field?.edges === undefined ? "node" : "edge";
    const value = designated === undefined ? NONE : `${kind}:${designated.start}`;
    const column = attributes.find((a) => `${a.kind}:${a.name}` === value);
    const numeric = column?.type === "number" || column?.type === "integer";
    const unit: TimeUnit = unitOf(session);
    const window = time.current;
    const steps: readonly TimeStep[] = unit === "ordinal" ? ORDINAL_STEPS : CALENDAR_STEPS;
    const groups = (["node", "edge"] as const).flatMap((on) => {
        const items = attributes
            .filter((a) => a.kind === on)
            .map((a) => ({ value: `${a.kind}:${a.name}`, label: a.name }));
        return items.length === 0 ? [] : [{ group: on === "node" ? "Nodes" : "Edges", items }];
    });
    const sourceOf = (picked: string, pickedUnit?: TimeUnit): TimeField | null => {
        const at = picked.indexOf(":");
        if (at < 0) {
            return null;
        }
        const start = picked.slice(at + 1);
        const source = pickedUnit === undefined ? { start } : { start, unit: pickedUnit };
        return picked.startsWith("edge:") ? { edges: source } : { nodes: source };
    };

    return (
        <ControlSection label="Time">
            <PanelLabelsProvider showLabels>
                <Stack gap={4}>
                    <FieldRow>
                        <PanelField
                            label="Time field"
                            kind="select"
                            width="fill"
                            data={[{ value: NONE, label: "None" }, ...groups]}
                            value={value}
                            onChange={(picked) => {
                                if (String(picked) !== value) {
                                    designate(session, store, sourceOf(String(picked)));
                                }
                            }}
                        />
                    </FieldRow>
                    {designated !== undefined && numeric ? (
                        <Input.Wrapper size="xs" label="Unit">
                            <SegmentedControl
                                fullWidth
                                size="xs"
                                value={unit}
                                data={UNIT_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
                                onChange={(picked) => {
                                    designate(session, store, sourceOf(value, picked as TimeUnit));
                                }}
                            />
                        </Input.Wrapper>
                    ) : null}
                    {designated === undefined ? null : (
                        <>
                            <FieldRow>
                                <PanelField
                                    label="Step"
                                    kind="select"
                                    width="fill"
                                    data={steps.map((s) => ({ value: String(s), label: stepLabel(s) }))}
                                    value={window?.step === undefined ? null : String(window.step)}
                                    placeholder="Auto"
                                    onChange={(picked) => {
                                        const step = Number.isNaN(Number(picked))
                                            ? (picked as TimeStep)
                                            : Number(picked);
                                        retune(session, { step });
                                    }}
                                />
                            </FieldRow>
                            <Input.Wrapper size="xs" label="Mode">
                                <SegmentedControl
                                    fullWidth
                                    size="xs"
                                    value={time.mode}
                                    data={[
                                        { value: "sliding", label: "Sliding" },
                                        { value: "cumulative", label: "Cumulative" },
                                    ]}
                                    onChange={(picked) => {
                                        retune(session, { mode: picked === "cumulative" ? "cumulative" : "sliding" });
                                    }}
                                />
                            </Input.Wrapper>
                            <Input.Wrapper size="xs" label="Speed">
                                <SegmentedControl
                                    fullWidth
                                    size="xs"
                                    value={String(speed)}
                                    data={SPEEDS.map((s) => ({ value: String(s), label: `${String(s)}x` }))}
                                    onChange={(picked) => {
                                        const next = Number(picked) as 1 | 2 | 4;
                                        store.set({ timeSpeed: next });
                                        // A play in progress goes on at the new speed.
                                        if (time.playing) {
                                            time.pause();
                                            time.play({ interval: intervalOf(next) });
                                        }
                                    }}
                                />
                            </Input.Wrapper>
                            <FieldRow>
                                <PanelField
                                    label="Results"
                                    kind="select"
                                    width="fill"
                                    data={RESULTS_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
                                    value={window?.results ?? "stale"}
                                    onChange={(picked) => {
                                        retune(session, { results: picked as TimeResultsPolicy });
                                    }}
                                />
                            </FieldRow>
                        </>
                    )}
                </Stack>
            </PanelLabelsProvider>
        </ControlSection>
    );
}
