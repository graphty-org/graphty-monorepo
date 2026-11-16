import { ModalFooter } from "@graphty/compact-mantine";
import type { DataIssue } from "@graphty/graphty-element/session";
import { Button, Checkbox, Menu, NumberInput, Text, Textarea, TextInput } from "@mantine/core";
import React, { useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { fileName, saveBlob } from "./choices";
import {
    cleaningSteps,
    issuesCsv,
    REPORT_SECTIONS,
    type ReportChoices,
    reportMarkdown,
    type ReportSection,
    sectionCounts,
    validationIssues,
} from "./report";

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
 * The Report output: Title, Row cap, the sections checklist with what each holds, the reader's
 * summary and findings, then Export (the report as Markdown) and Save issues (the validation report
 * or the data changes alone, as JSON or CSV).
 * @param props - Component props
 * @param props.choices - The report's choices
 * @param props.onChange - Takes the changed choices
 * @param props.onCancel - Closes the dialog
 * @param props.onDone - Closes the dialog with a notice
 * @returns The output's body and footer
 */
export function ReportOutput({ choices, onChange, onCancel, onDone }: Readonly<ReportOutputProps>): React.JSX.Element {
    const { session } = useWorkspace();
    const project = useWorkspaceState((state) => state.project?.name ?? "untitled");
    const [counts] = useState(() => (session === null ? null : sectionCounts(session)));
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
        saveBlob(new Blob([reportMarkdown(session, choices, project)], { type: "text/markdown" }), name);
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
                            label={counts === null ? each.name : `${each.name} (${String(counts[each.id])})`}
                            checked={choices.sections.includes(each.id)}
                            onChange={(event) => {
                                toggle(each.id, event.currentTarget.checked);
                            }}
                        />
                    ))}
                </fieldset>
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
