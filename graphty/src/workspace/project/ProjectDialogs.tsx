import { ModalFooter } from "@graphty/compact-mantine";
import { Button, Modal, Text, TextInput } from "@mantine/core";
import React, { useEffect, useState } from "react";

import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { DISCARD_DIALOG, discardAndContinue, openPending, SAVE_AS_DIALOG, saveProjectAs } from "./actions";
import { keepsFileHandles } from "./files";

/**
 * Save as... (`#/project-menu/save-as`): titled with the project's name, the name a field with
 * its text selected; Enter saves.
 * @returns The dialog
 */
function SaveAsDialog(): React.JSX.Element {
    const workspace = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === SAVE_AS_DIALOG);
    const current = useWorkspaceState((state) => state.project?.name ?? "");
    const [name, setName] = useState(current);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (opened) {
            setName(current);
        }
    }, [opened, current]);

    const close = (): void => {
        workspace.store.set({ dialog: null });
    };
    const trimmed = name.trim();
    const save = async (): Promise<void> => {
        if (trimmed === "" || saving) {
            return;
        }
        setSaving(true);
        try {
            if (await saveProjectAs(workspace, trimmed)) {
                close();
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal opened={opened} onClose={close} title={`Save ${current} as`}>
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                }}
            >
                <TextInput
                    data-autofocus
                    label="Name"
                    value={name}
                    onChange={(event) => {
                        setName(event.currentTarget.value);
                    }}
                    onFocus={(event) => {
                        event.currentTarget.select();
                    }}
                />
                <Text size="xs" c="dimmed" mt="xs">
                    {keepsFileHandles()
                        ? "Choose where the file goes next. Later saves write the same file."
                        : "The file is downloaded. Each later Save downloads a new copy."}
                </Text>
                <ModalFooter mt="md">
                    <Button variant="default" onClick={close}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={trimmed === ""} loading={saving}>
                        Save
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

/**
 * The unsaved-changes question, asked when Close project or opening another project would throw
 * away changes graphty-element reports as unsaved (`project.dirty`, `E_UNSAVED_CHANGES`).
 * @returns The dialog
 */
function DiscardDialog(): React.JSX.Element {
    const { store } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === DISCARD_DIALOG);
    const name = useWorkspaceState((state) => state.project?.name ?? "This project");
    const close = (): void => {
        store.set({ dialog: null });
    };

    return (
        <Modal opened={opened} onClose={close} title="Discard unsaved changes?">
            <Text size="sm">{name} has changes that are not saved. They are lost if you continue.</Text>
            <ModalFooter mt="md">
                <Button variant="default" onClick={close} data-autofocus>
                    Cancel
                </Button>
                <Button
                    color="red"
                    onClick={() => {
                        void discardAndContinue(store);
                    }}
                >
                    Discard
                </Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * The Project package's dialogs (tier1-design.md section T14): Save as... and the unsaved-changes
 * question. It also opens a file waiting for a just-opened project's element, and keeps the
 * header's name in step with the name graphty-element holds (an Undo of a rename, a reopened file).
 * @returns The dialogs
 */
export function ProjectDialogs(): React.JSX.Element {
    const workspace = useWorkspace();
    const { session, store } = workspace;

    useEffect(() => {
        if (session !== null) {
            void openPending(workspace);
        }
    }, [session, workspace]);

    useEffect(
        () =>
            session?.on("project:status", ({ name }) => {
                const { project } = store.get();
                if (name !== null && project !== null && project.name !== name) {
                    store.set({ project: { ...project, name } });
                }
            }),
        [session, store],
    );

    return (
        <>
            <SaveAsDialog />
            <DiscardDialog />
        </>
    );
}
