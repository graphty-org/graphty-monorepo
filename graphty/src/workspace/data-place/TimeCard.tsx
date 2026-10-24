/**
 * The time window's condition card, drawn by the filter step editor (Keep: a time window) and
 * opened from the Filters section's Time row: the time field, its unit, and the step, mode,
 * untimed rule and algorithm-results setting. Every value is graphty-element's (`session.time`),
 * which keeps the settings with the field (`time.settings`), so turning the window off leaves
 * them as they are. The window itself moves in the timeline dock under the canvas.
 */

import { FieldRow, PanelField, PanelLabelsProvider, SegmentedControl } from "@graphty/compact-mantine";
import type { GraphSession, TimeField, TimeResultsPolicy, TimeStep, TimeUnit } from "@graphty/graphty-element/session";
import { Stack } from "@mantine/core";
import React from "react";

import type { WorkspaceStore } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { designate, reportTimeError, unitOf } from "../time/timeActions";
import {
    autoLabel,
    CALENDAR_STEPS,
    ORDINAL_STEPS,
    OUTSIDE_CHOICES,
    RESULTS_CHOICES,
    stepLabel,
    UNIT_CHOICES,
    UNTIMED_CHOICES,
} from "../time/timeWords";
import { useTimeVersion } from "../time/useTimeVersion";

/** The Field menu's value for "no time field". */
const NONE = "none";
/** The Step menu's value for the automatic step. */
const AUTO = "auto";

/**
 * Changes how windows move, and says why when the element refuses.
 * @param session - the element's session.
 * @param store - the chrome store.
 * @param patch - what changes.
 */
function retune(
    session: GraphSession,
    store: WorkspaceStore,
    patch: Parameters<GraphSession["time"]["setSettings"]>[0],
): void {
    session.time.setSettings(patch).then(() => undefined, reportTimeError(store));
}

/**
 * The field a menu value names.
 * @param picked - `"edge:sent"`, or the None value.
 * @param unit - a unit to read numbers in, or none to keep the column's.
 * @returns the field, or null.
 */
function sourceOf(picked: string, unit?: TimeUnit): TimeField | null {
    const at = picked.indexOf(":");
    if (at < 0) {
        return null;
    }
    const start = picked.slice(at + 1);
    const source = unit === undefined ? { start } : { start, unit };
    return picked.startsWith("edge:") ? { edges: source } : { nodes: source };
}

/**
 * The time card: Time field (and its unit for a number column), Step, Mode, Untimed and Results.
 * @returns the card.
 */
export function TimeCard(): React.JSX.Element | null {
    const { session, store } = useWorkspace();
    useTimeVersion(session);
    if (session === null) {
        return null;
    }
    const { time } = session;
    const attributes = session.data.attributes().filter((a) => a.origin !== "result");
    const { field, settings } = time;
    const designated = field?.edges ?? field?.nodes;
    const kind = field?.edges === undefined ? "node" : "edge";
    const value = designated === undefined ? NONE : `${kind}:${designated.start}`;
    const column = attributes.find((a) => `${a.kind}:${a.name}` === value);
    const numeric = column?.type === "number" || column?.type === "integer";
    const unit: TimeUnit = unitOf(session);
    const extent = time.extent();
    const untimed =
        extent === null
            ? 0
            : extent.nodes.untimed + extent.nodes.unparsed + extent.edges.untimed + extent.edges.unparsed;
    const steps: readonly TimeStep[] = unit === "ordinal" ? ORDINAL_STEPS : CALENDAR_STEPS;
    // The columns that read as time come first, from the element; then every other column.
    const candidates = time.candidates();
    const timed = new Set(candidates.map((c) => `${c.kind}:${c.column}`));
    const others = (["node", "edge"] as const).flatMap((on) => {
        const items = attributes
            .filter((a) => a.kind === on && !timed.has(`${a.kind}:${a.name}`))
            .map((a) => ({ value: `${a.kind}:${a.name}`, label: a.name }));
        return items.length === 0 ? [] : [{ group: on === "node" ? "Nodes" : "Edges", items }];
    });
    const groups = [
        ...(candidates.length === 0
            ? []
            : [
                  {
                      group: "Times",
                      items: candidates.map((c) => ({ value: `${c.kind}:${c.column}`, label: c.column })),
                  },
              ]),
        ...others,
    ];

    return (
        <div data-testid="time-card">
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
                        <FieldRow>
                            <SegmentedControl
                                label="Unit"
                                fullWidth
                                size="xs"
                                value={unit}
                                data={UNIT_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
                                onChange={(picked) => {
                                    designate(session, store, sourceOf(value, picked as TimeUnit));
                                }}
                            />
                        </FieldRow>
                    ) : null}
                    {designated === undefined ? null : (
                        <>
                            <FieldRow>
                                <PanelField
                                    label="Step"
                                    kind="select"
                                    width="fill"
                                    data={[
                                        { value: AUTO, label: autoLabel(time.current?.step) },
                                        ...steps.map((s) => ({ value: String(s), label: stepLabel(s) })),
                                    ]}
                                    value={String(settings.step)}
                                    onChange={(picked) => {
                                        const text = String(picked);
                                        let step: TimeStep | "auto" = text as TimeStep;
                                        if (text === AUTO) {
                                            step = "auto";
                                        } else if (!Number.isNaN(Number(text))) {
                                            step = Number(text);
                                        }
                                        retune(session, store, { step });
                                    }}
                                />
                            </FieldRow>
                            <FieldRow>
                                <SegmentedControl
                                    label="Mode"
                                    fullWidth
                                    size="xs"
                                    value={settings.mode}
                                    data={[
                                        { value: "sliding", label: "Sliding" },
                                        { value: "cumulative", label: "Cumulative" },
                                    ]}
                                    onChange={(picked) => {
                                        retune(session, store, {
                                            mode: picked === "cumulative" ? "cumulative" : "sliding",
                                        });
                                    }}
                                />
                            </FieldRow>
                            <FieldRow>
                                <SegmentedControl
                                    label="Outside"
                                    fullWidth
                                    size="xs"
                                    value={settings.outside}
                                    data={OUTSIDE_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
                                    onChange={(picked) => {
                                        retune(session, store, { outside: picked === "ghost" ? "ghost" : "hide" });
                                    }}
                                />
                            </FieldRow>
                            {untimed > 0 ? (
                                <FieldRow>
                                    <SegmentedControl
                                        label="Untimed"
                                        fullWidth
                                        size="xs"
                                        value={settings.missing}
                                        data={UNTIMED_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
                                        onChange={(picked) => {
                                            retune(session, store, {
                                                missing: picked === "outside" ? "outside" : "inside",
                                            });
                                        }}
                                    />
                                </FieldRow>
                            ) : null}
                            <FieldRow>
                                <PanelField
                                    label="Results"
                                    kind="select"
                                    width="fill"
                                    data={RESULTS_CHOICES.map((c) => ({ value: c.value, label: c.label }))}
                                    value={settings.results}
                                    onChange={(picked) => {
                                        retune(session, store, { results: picked as TimeResultsPolicy });
                                    }}
                                />
                            </FieldRow>
                        </>
                    )}
                </Stack>
            </PanelLabelsProvider>
        </div>
    );
}
