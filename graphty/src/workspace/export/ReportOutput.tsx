import { ModalFooter } from "@graphty/compact-mantine";
import type { DataIssue } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Checkbox, Menu, NumberInput, Text, Textarea, TextInput, Tooltip } from "@mantine/core";
import React, { useState } from "react";

import { GLYPHS } from "../glyphs";
import { runName } from "../runWords";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { fileName, REPORT_SECTIONS, type ReportChoices, type ReportSection, saveBlob } from "./choices";
import { cleaningSteps, issuesCsv, pinnedRuns, reportMarkdown, sectionCounts, validationIssues } from "./report";

/** Props for ReportOutput. */
interface ReportOutputProps {
    choices: ReportChoices;
    onChange: (choices: ReportChoices) => void;
    onCancel: () => void;
    /** Closes the dialog with a notice, and lists the file under Recent. */
    onDone: (message: string, file?: string) => void;
}

/** The issue lists that save on their own, with the file name's part. */
const ISSUE_FILES: readonly {
    readonly label: string;
    readonly what: string;
    readonly list: typeof validationIssues;
}[] = [
    { label: "Validation report", what: "validation", list: validationIssues },
    { label: "Data changes", what: "data-changes", list: cleaningSteps },
];

/**
 * The Report output: Title, Row cap, the sections checklist with what each holds, the pinned
 * results in the order pinned (each with the reader's note and an Unpin), the reader's summary and
 * findings, then Export (the report as Markdown) and Save issues (the validation report
 * or the data changes alone, as JSON or CSV).
 * @param props - Component props
 * @param props.choices - The report's choices
 * @param props.onChange - Takes the changed choices
 * @param props.onCancel - Closes the dialog
 * @param props.onDone - Closes the dialog with a notice
 * @returns The output's body and footer
 */
export function ReportOutput({ choices, onChange, onCancel, onDone }: Readonly<ReportOutputProps>): React.JSX.Element {
    const { session, store } = useWorkspace();
    const project = useWorkspaceState((state) => state.project?.name ?? "untitled");
    const pins = useWorkspaceState((state) => state.reportPins);
    const [counts] = useState(() => (session === null ? null : sectionCounts(session)));
    const pinned = session === null ? [] : pinnedRuns(session, pins);
    const countOf = (id: ReportSection): number | undefined => (id === "pinned" ? pinned.length : counts?.[id]);
    const setNote = (run: string, note: string): void => {
        store.set((state) => ({
            reportPins: state.reportPins.map((pin) => (pin.run === run ? { ...pin, note } : pin)),
        }));
    };
    const unpin = (run: string): void => {
        store.set((state) => ({ reportPins: state.reportPins.filter((pin) => pin.run !== run) }));
    };
    const Unpin = GLYPHS.unpin;
    const set = (patch: Partial<ReportChoices>): void => {
        onChange({ ...choices, ...patch });
    };
    const toggle = (id: ReportSection, on: boolean): void => {
        set({
            sections: REPORT_SECTIONS.map((each) => each.id).filter((each) =>
                each === id ? on : choices.sections.includes(each),
            ),
        });
    };

    const generate = (): void => {
        if (session === null) {
            return;
        }
        const name = fileName(project, "report", "md");
        saveBlob(new Blob([reportMarkdown(session, choices, project, pins)], { type: "text/markdown" }), name);
        onDone(`Exported ${name}`, name);
    };

    const saveIssues = (what: string, issues: readonly DataIssue[], format: "json" | "csv"): void => {
        const name = fileName(project, what, format);
        const text = format === "json" ? `${JSON.stringify(issues, null, 2)}\n` : issuesCsv(issues);
        saveBlob(new Blob([text], { type: format === "json" ? "application/json" : "text/csv" }), name);
        onDone(`Exported ${name}`, name);
    };

    return (
        <>
            <section className="ws-export-main" aria-label="Report">
                <Text component="h3" fw={550} size="md" m={0}>
                    Report
                </Text>
                <div className="ws-export-fields">
                    <TextInput
                        label="Title"
                        placeholder={project}
                        value={choices.title}
                        onChange={(event) => {
                            set({ title: event.currentTarget.value });
                        }}
                    />
                    <NumberInput
                        label="Row cap"
                        min={0}
                        allowDecimal={false}
                        value={choices.rowCap}
                        onChange={(value) => {
                            set({ rowCap: typeof value === "number" ? value : 0 });
                        }}
                    />
                </div>
                <fieldset className="ws-export-sections">
                    <Text component="legend" size="xs" fw={500}>
                        Sections
                    </Text>
                    {REPORT_SECTIONS.map((each) => (
                        <Checkbox
                            key={each.id}
                            label={
                                countOf(each.id) === undefined
                                    ? each.name
                                    : `${each.name} (${String(countOf(each.id))})`
                            }
                            checked={choices.sections.includes(each.id)}
                            onChange={(event) => {
                                toggle(each.id, event.currentTarget.checked);
                            }}
                        />
                    ))}
                </fieldset>
                {session !== null && pinned.length > 0 ? (
                    <fieldset className="ws-export-sections" aria-label="Pinned items">
                        <Text component="legend" size="xs" fw={500}>
                            Pinned items
                        </Text>
                        {pinned.map(({ pin, run }) => {
                            const name = runName(session, run);
                            return (
                                <TextInput
                                    key={pin.run}
                                    label={name}
                                    placeholder="Note"
                                    value={pin.note}
                                    onChange={(event) => {
                                        setNote(pin.run, event.currentTarget.value);
                                    }}
                                    rightSection={
                                        <Tooltip label="Unpin from report">
                                            <ActionIcon
                                                variant="subtle"
                                                color="gray"
                                                aria-label={`Unpin ${name}`}
                                                onClick={() => {
                                                    unpin(pin.run);
                                                }}
                                            >
                                                <Unpin size={14} aria-hidden />
                                            </ActionIcon>
                                        </Tooltip>
                                    }
                                />
                            );
                        })}
                    </fieldset>
                ) : null}
                <Textarea
                    label="Summary"
                    autosize
                    minRows={2}
                    value={choices.summary}
                    onChange={(event) => {
                        set({ summary: event.currentTarget.value });
                    }}
                />
                <Textarea
                    label="Findings"
                    autosize
                    minRows={2}
                    value={choices.findings}
                    onChange={(event) => {
                        set({ findings: event.currentTarget.value });
                    }}
                />
            </section>
            <ModalFooter className="ws-export-footer">
                <span className="ws-export-note" />
                <Button variant="default" onClick={onCancel}>
                    Cancel
                </Button>
                <Menu position="top-end">
                    <Menu.Target>
                        <Button variant="default" disabled={session === null}>
                            Save issues
                        </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {ISSUE_FILES.flatMap((file) =>
                            (["json", "csv"] as const).map((format) => (
                                <Menu.Item
                                    key={`${file.what}-${format}`}
                                    onClick={() => {
                                        if (session !== null) {
                                            saveIssues(file.what, file.list(session), format);
                                        }
                                    }}
                                >
                                    {`${file.label} (${format.toUpperCase()})`}
                                </Menu.Item>
                            )),
                        )}
                    </Menu.Dropdown>
                </Menu>
                <Button disabled={session === null} onClick={generate}>
                    Generate report
                </Button>
            </ModalFooter>
        </>
    );
}
