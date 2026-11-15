import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import type { GraphSession, ProjectAssetChoice } from "@graphty/graphty-element/session";
import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { modelName, pictureName } from "../canvas/models";
import { megabytes } from "../start/library";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { chipLine, middleCut } from "../style/modelWords";
import {
    type AssetChoices,
    assetQuestion,
    DISCARD_DIALOG,
    discardAndContinue,
    KEEP_ASSETS_DIALOG,
    openPending,
    SAVE_AS_DIALOG,
    saveProjectAs,
} from "./actions";
import { NetworkPrompt } from "./NetworkPrompt";

/**
 * Save as... (`#/project-menu/save-as`): titled with the project's name, the name a field with
 * its text selected; Enter keeps the project in this browser under that name.
 * @returns The dialog
 */
function SaveAsDialog(): React.JSX.Element {
    const workspace = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === SAVE_AS_DIALOG);
    const current = useWorkspaceState((state) => state.project?.name ?? "");
    const [name, setName] = useState(current);
    const [saving, setSaving] = useState(false);

    // Whether another dialog took the slot during a save (the question about files from the web,
    // or Save as pressed again over it): the save then leaves the slot to that dialog.
    const left = useRef(false);
    useEffect(() => {
        if (opened) {
            setName(current);
        } else {
            left.current = true;
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
        left.current = false;
        try {
            await saveProjectAs(workspace, trimmed);
            if (!left.current) {
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
 * The unsaved-changes question, asked when Back to start or opening another project would throw
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
    // Cancel hands focus back to where the dialog opened. Discard does not: what it continues
    // (an open, Back to start) puts focus where it points the reader, and Mantine's hand-back,
    // on a timer a busy page runs late, would otherwise land after it and take it away.
    const [discarding, setDiscarding] = useState(false);
    if (opened && discarding) {
        setDiscarding(false);
    }

    return (
        <Modal opened={opened} onClose={close} returnFocus={!discarding} title="Discard unsaved changes?">
            <Text size="sm">{name} has changes that are not saved. They are lost if you continue.</Text>
            <ModalFooter mt="md">
                <Button variant="default" onClick={close} data-autofocus>
                    Cancel
                </Button>
                <Button
                    color="red"
                    onClick={() => {
                        setDiscarding(true);
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
 * A file's size as the dialog writes it: "3 KB", "9.4 MB".
 * @param bytes - the size in bytes.
 * @returns the words.
 */
function fileSize(bytes: number): string {
    return bytes < 1_000_000 ? `${String(Math.max(1, Math.round(bytes / 1000)))} KB` : megabytes(bytes);
}

/**
 * A web address without its scheme, cut in the middle so its host and its file name both show.
 * @param url - the address.
 * @returns the short address.
 */
function shortAddress(url: string): string {
    // graphty-element lists only addresses it fetched, so each one parses.
    const { host, pathname } = new URL(url);
    return middleCut(`${host}${pathname}`, 40);
}

/**
 * A model's or a picture's name for the reader, from the address a layer names it by.
 * @param session - the element's session, or null before it comes up.
 * @param entry - what graphty-element said of it.
 * @returns the name.
 */
function assetName(session: GraphSession | null, entry: ProjectAssetChoice): string {
    if (session === null) {
        return entry.url;
    }
    return entry.kind === "image" ? pictureName(session, entry.url) : modelName(session, entry.url);
}

/**
 * One model or picture in the save question: its address, its size and how to keep it.
 * @param props - Component props
 * @param props.entry - what graphty-element said of it (`project.assetChoices()`)
 * @param props.name - its name
 * @param props.value - how it is kept now
 * @param props.onChange - takes the reader's choice
 * @returns The row
 */
function KeepAssetRow({
    entry,
    name,
    value,
    onChange,
}: Readonly<{
    entry: ProjectAssetChoice;
    name: string;
    value: AssetChoices[string];
    onChange: (value: AssetChoices[string]) => void;
}>): React.JSX.Element {
    const refused = entry.urlRefused === undefined ? undefined : chipLine(entry.urlRefused);
    return (
        <Stack gap={2}>
            <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size="sm" truncate title={entry.url}>
                    {shortAddress(entry.url)}
                </Text>
                <Text size="xs" c="var(--cm-text-secondary)">
                    {fileSize(entry.byteLength)}
                </Text>
            </Group>
            <SegmentedControl
                size="xs"
                label={`Keep ${name}`}
                value={value}
                data={[
                    { value: "embed", label: entry.kind === "image" ? "Embed picture" : "Embed model" },
                    { value: "url", label: "Use URL", disabled: refused !== undefined },
                ]}
                onChange={(next) => {
                    onChange(next === "url" ? "url" : "embed");
                }}
            />
            {refused === undefined ? null : (
                <Text size="xs" c="var(--cm-text-secondary)">
                    {refused}
                </Text>
            )}
        </Stack>
    );
}

/**
 * How to keep each model or picture a layer names by web address, asked before a save that holds
 * any (the node models experiment): embed it, so the project opens offline, or keep only its
 * address, so the file is fetched again when the project opens.
 * @returns The dialog
 */
function KeepAssetsDialog(): React.JSX.Element {
    const { store, session } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === KEEP_ASSETS_DIALOG);
    const question = opened ? assetQuestion(store) : undefined;
    const [choices, setChoices] = useState<AssetChoices>({});

    useEffect(() => {
        if (!opened) {
            return undefined;
        }
        setChoices({});
        // Closed without an answer (another dialog took the slot, as Save as pressed while it
        // asks): the save waiting on it is cancelled, never left waiting.
        return () => {
            assetQuestion(store)?.answer(null);
        };
    }, [opened, store]);

    const finish = (answer: AssetChoices | null): void => {
        question?.answer(answer);
        store.set({ dialog: null });
    };
    const entries = question?.entries ?? [];

    return (
        <Modal
            opened={opened}
            onClose={() => {
                finish(null);
            }}
            title="Save files from the web"
        >
            <Stack gap="sm">
                {entries.map((entry) => (
                    <KeepAssetRow
                        key={entry.url}
                        entry={entry}
                        name={assetName(session, entry)}
                        value={choices[entry.url] ?? entry.storage}
                        onChange={(value) => {
                            setChoices((now) => ({ ...now, [entry.url]: value }));
                        }}
                    />
                ))}
            </Stack>
            <ModalFooter mt="md">
                <Button
                    variant="default"
                    onClick={() => {
                        finish(null);
                    }}
                >
                    Cancel
                </Button>
                <Button
                    data-autofocus
                    onClick={() => {
                        finish(
                            Object.fromEntries(
                                entries.map((entry) => [entry.url, choices[entry.url] ?? entry.storage]),
                            ),
                        );
                    }}
                >
                    Save
                </Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * The Project package's dialogs (tier1-design.md section T14): Save as..., the unsaved-changes
 * question and, with the node models experiment, how to keep files from the web. It also opens a file waiting for a just-opened project's element, and keeps the
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

    useEffect(() => {
        if (session === null) {
            return undefined;
        }
        // The shown name follows the element's. While the element holds none (a project named by
        // its data), the app's own name shows; an Undo back to no name shows that one again.
        let held = session.project.name;
        let unnamed = store.get().project?.name ?? null;
        return session.on("project:status", ({ name }) => {
            const { project } = store.get();
            if (project === null) {
                return;
            }
            if (held === null) {
                unnamed = project.name;
            }
            held = name;
            const shown = name ?? unnamed;
            if (shown !== null && shown !== project.name) {
                store.set({ project: { ...project, name: shown } });
            }
        });
    }, [session, store]);

    return (
        <>
            <SaveAsDialog />
            <DiscardDialog />
            <KeepAssetsDialog />
            <NetworkPrompt />
        </>
    );
}
