import "./start.css";

import { Button, Kbd, Paper, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { FilePlus, FolderOpen, Lock, Network, Settings, Upload } from "lucide-react";
import React, { useEffect, useState } from "react";

import { START_SAMPLES } from "../../data/sampleManifest";
import { CommandButton } from "../frame/CommandButton";
import { formatKey } from "../keys/keys";
import { PrivacyChip } from "../privacy/PrivacyChip";
import { UsageDataCard } from "../privacy/UsageDataCard";
import { RecentProjects } from "../project/RecentProjects";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";
import { openFile, openSample } from "./open";

/**
 * One way in: a command drawn as a row with its key.
 * @param props - Component props
 * @param props.id - The command id
 * @param props.icon - The glyph
 * @returns The row, or nothing for a stub command
 */
function Door({ id, icon }: Readonly<{ id: string; icon: React.ReactNode }>): React.JSX.Element | null {
    const door = useCommand(id);
    if (door === null) {
        return null;
    }
    const key = door.command.keys?.[0];
    return (
        <Button
            variant="subtle"
            justify="space-between"
            fullWidth
            leftSection={icon}
            rightSection={key === undefined ? undefined : <Kbd size="xs">{formatKey(key)}</Kbd>}
            onClick={door.run}
            classNames={{ inner: "ws-start-door-inner", label: "ws-start-door-label" }}
        >
            {door.command.label}
        </Button>
    );
}

/**
 * One column of the start screen, under its heading.
 * @param props - Component props
 * @param props.title - The heading
 * @param props.children - The column's rows
 * @returns The column
 */
function Column({ title, children }: Readonly<{ title: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <section className="ws-start-col" aria-label={title}>
            <Title order={2} size="xs" className="ws-start-h">
                {title}
            </Title>
            {children}
        </section>
    );
}

/**
 * The start screen (tier1-design.md section 2.11), shown whenever no project is open: the two
 * ways in, Recent projects, the four samples, and the usage data card at its foot until it is
 * answered. A file dropped anywhere on it opens.
 * @returns The start screen
 */
export function StartScreen(): React.JSX.Element {
    const workspace = useWorkspace();
    const [dragging, setDragging] = useState(false);

    // The drop target is the whole window ("drop a file anywhere in this window"), so the
    // listeners go on globalThis (the window) rather than on an element.
    useEffect(() => {
        const over = (event: DragEvent): void => {
            event.preventDefault();
            setDragging(true);
        };
        const leave = (event: DragEvent): void => {
            if (event.relatedTarget === null) {
                setDragging(false);
            }
        };
        const drop = (event: DragEvent): void => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer?.files.item(0) ?? null;
            if (file !== null) {
                openFile(workspace, file);
            }
        };
        globalThis.addEventListener("dragover", over);
        globalThis.addEventListener("dragleave", leave);
        globalThis.addEventListener("drop", drop);
        return () => {
            globalThis.removeEventListener("dragover", over);
            globalThis.removeEventListener("dragleave", leave);
            globalThis.removeEventListener("drop", drop);
        };
    }, [workspace]);

    return (
        <div className="ws-start">
            <header className="ws-start-head">
                <h1 className="ws-start-brand">
                    <Network size={16} aria-hidden />
                    graphty
                </h1>
                <span className="ws-start-grow" />
                <PrivacyChip />
                <CommandButton id="settings.open" icon={<Settings size={16} aria-hidden />} />
            </header>

            <main className="ws-start-main">
                <div className="ws-start-cols">
                    <Column title="Start">
                        <Door id="file.open" icon={<FolderOpen size={16} aria-hidden />} />
                        <Door id="data.new" icon={<FilePlus size={16} aria-hidden />} />
                        <Text size="xs" c="dimmed" className="ws-start-line">
                            <Upload size={12} aria-hidden /> or drop a file anywhere in this window
                        </Text>
                        <Text size="xs" c="dimmed" className="ws-start-line">
                            <Lock size={12} aria-hidden /> Files are read on this computer and never uploaded.
                        </Text>
                    </Column>
                    <Column title="Recent projects">
                        <RecentProjects />
                    </Column>
                    <Column title="Samples">
                        {START_SAMPLES.map((sample) => (
                            <UnstyledButton
                                key={sample.id}
                                className="ws-start-sample"
                                aria-label={`Open the ${sample.name} sample`}
                                onClick={() => {
                                    openSample(workspace.store, sample);
                                }}
                            >
                                <span className="ws-start-sample-name">
                                    <Text span size="sm" fw={550} truncate="end">
                                        {sample.name}
                                    </Text>
                                    <Text span size="xs" c="dimmed">
                                        {sample.size}
                                    </Text>
                                </span>
                                <Text size="xs" c="dimmed">
                                    {sample.sentence}
                                </Text>
                            </UnstyledButton>
                        ))}
                    </Column>
                </div>

                <div className="ws-start-foot">
                    <UsageDataCard />
                </div>
            </main>

            {dragging ? (
                <div className="ws-start-drop" aria-hidden>
                    <Paper withBorder p="lg">
                        <Stack align="center" gap={4}>
                            <Upload size={24} aria-hidden />
                            <Text fw={600}>Drop to open</Text>
                            <Text size="xs" c="dimmed">
                                The file is read here and never uploaded.
                            </Text>
                        </Stack>
                    </Paper>
                </div>
            ) : null}
        </div>
    );
}
