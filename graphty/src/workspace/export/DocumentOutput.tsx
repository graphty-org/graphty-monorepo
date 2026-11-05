import { ModalFooter } from "@graphty/compact-mantine";
import { Badge, Button, Group, Text } from "@mantine/core";
import React, { useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { fileName, saveBlob, slug } from "./choices";

/** How many lines of the file the preview shows. */
const PREVIEW_LINES = 14;

/** The outputs that are one document graphty-element writes. */
export type DocumentKind = "styles" | "recipe" | "project";

const TITLES: Readonly<Record<DocumentKind, string>> = { styles: "Styles", recipe: "Recipe", project: "Project" };

/** Props for DocumentOutput. */
interface DocumentOutputProps {
    kind: DocumentKind;
    onCancel: () => void;
    /** Closes the dialog with a notice, and lists the file under Recent. */
    onDone: (message: string, file?: string) => void;
}

/** What one document output shows: its counts, and its text for the preview and the file. */
interface Contents {
    readonly rows: readonly { readonly label: string; readonly value: number; readonly warn?: boolean }[];
    readonly text?: string;
}

/**
 * Styles (`session.styles.toFile()`, the layers alone), Recipe (`session.recipe()`, the data
 * steps and styles, naming columns, never nodes) and Project (the whole project file, written by
 * `element.downloadProject`): their counts, a preview and Export.
 * @param props - Component props
 * @param props.kind - Which document
 * @param props.onCancel - Closes the dialog
 * @param props.onDone - Closes the dialog with a notice
 * @returns The output's body and footer
 */
export function DocumentOutput({ kind, onCancel, onDone }: Readonly<DocumentOutputProps>): React.JSX.Element {
    const { element, session } = useWorkspace();
    const project = useWorkspaceState((state) => state.project?.name ?? "untitled");
    const [contents] = useState((): Contents | null => {
        if (session === null) {
            return null;
        }
        if (kind === "styles") {
            const file = session.styles.toFile();
            return { rows: [{ label: "Layers", value: file.layers.length }], text: JSON.stringify(file, null, 2) };
        }
        if (kind === "recipe") {
            const recipe = session.recipe();
            const leftOut = recipe.leftOut.reduce((sum, fact) => sum + Number(fact.params?.count ?? 1), 0);
            return {
                rows: [
                    { label: "Data sources", value: recipe.sources.length },
                    { label: "Columns", value: recipe.columns.length },
                    { label: "Joins", value: recipe.joins.length },
                    { label: "Layers", value: recipe.styles.layers.length },
                    ...(leftOut > 0 ? [{ label: "Left out", value: leftOut, warn: true }] : []),
                ],
                text: JSON.stringify(recipe, null, 2),
            };
        }
        return {
            rows: [
                { label: "Nodes", value: session.data.statistics().nodeCount },
                { label: "Edges", value: session.data.statistics().edgeCount },
                { label: "Layers", value: session.styles.list().length },
            ],
        };
    });

    const extension = kind === "styles" ? "style.json" : "json";
    const name = kind === "project" ? `${slug(project)}.graphty.json` : fileName(project, kind, extension);

    const save = async (): Promise<void> => {
        if (kind === "project") {
            await element?.downloadProject({ fileName: name });
        } else if (contents?.text !== undefined) {
            saveBlob(new Blob([contents.text], { type: "application/json" }), name);
        }
        onDone(`Exported ${name}`, name);
    };

    return (
        <>
            <div className="ws-export-main">
                <Text fw={550} size="md" role="heading" aria-level={3}>
                    {TITLES[kind]}
                </Text>
                <Group gap={6}>
                    {contents?.rows.map((row) => (
                        <Badge key={row.label} size="sm" variant="light" color={row.warn === true ? "orange" : "gray"}>
                            {`${row.label} ${String(row.value)}`}
                        </Badge>
                    ))}
                </Group>
                {contents?.text === undefined ? null : (
                    <pre
                        className="ws-export-text"
                        tabIndex={0} // NOSONAR(S6845): a scrolling region must take focus so a keyboard can scroll it
                        aria-label={`Preview of the ${kind} file`}
                    >
                        {contents.text.split("\n").slice(0, PREVIEW_LINES).join("\n")}
                    </pre>
                )}
            </div>
            <ModalFooter className="ws-export-footer">
                <span className="ws-export-note" />
                <Button variant="default" onClick={onCancel}>
                    Cancel
                </Button>
                <Button disabled={element === null} onClick={() => void save()}>
                    Export
                </Button>
            </ModalFooter>
        </>
    );
}
