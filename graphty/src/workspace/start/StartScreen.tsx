import "./start.css";

import { Button, Kbd, Paper, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import React, { type RefObject, useEffect, useRef, useState } from "react";

import { START_SAMPLES } from "../../data/sampleManifest";
import { CommandButton } from "../frame/CommandButton";
import { MainMenu } from "../frame/menus";
import { NoticeSlot } from "../frame/NoticeSlot";
import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey } from "../keys/keys";
import { PrivacyChip } from "../privacy/PrivacyChip";
import { UsageDataCard } from "../privacy/UsageDataCard";
import { openProjectFile } from "../project/actions";
import { RecentProjects } from "../project/RecentProjects";
import { useCommand, useWorkspace } from "../state/WorkspaceContext";
import { openSample } from "./open";

/**
 * One way in: a command drawn as a row with its key.
 * @param props - Component props
 * @param props.id - The command id
 * @param props.icon - The glyph
 * @param props.ref - The row's button, for a caller that hands it focus
 * @returns The row, or nothing for a stub command
 */
function Door({
    id,
    icon,
    ref,
}: Readonly<{
    id: string;
    icon: React.ReactNode;
    ref?: RefObject<HTMLButtonElement | null>;
}>): React.JSX.Element | null {
    const door = useCommand(id);
    if (door === null) {
        return null;
    }
    const key = door.command.keys?.[0];
    return (
        <Button
            ref={ref}
            data-start-door={id}
            variant="subtle"
            justify="space-between"
            fullWidth
            leftSection={icon}
            // The key is drawn, kept out of the name and given as the button's shortcut instead.
            aria-keyshortcuts={key === undefined ? undefined : ariaKey(key)}
            rightSection={
                key === undefined ? undefined : (
                    <Kbd size="xs" aria-hidden>
                        {formatKey(key)}
                    </Kbd>
                )
            }
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
 * answered. A file dropped anywhere on it opens, as Open project or file... opens one.
 * @param props - Component props
 * @param props.openRef - Takes Open project or file..., the first way in: where focus goes when
 *     the screen comes back and once the usage data card is answered
 * @param props.lastDoor - Takes the way in that last had focus (its `data-start-door`), so the
 *     screen coming back can hand focus to the control that left it
 * @returns The start screen
 */
export function StartScreen({
    openRef,
    lastDoor,
}: Readonly<{
    openRef?: RefObject<HTMLButtonElement | null>;
    lastDoor?: RefObject<string | null>;
}>): React.JSX.Element {
    const workspace = useWorkspace();
    const ownOpenRef = useRef<HTMLButtonElement>(null);
    const firstDoor = openRef ?? ownOpenRef;
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
                void openProjectFile(workspace, file);
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
        <div
            className="ws-start"
            onFocus={(event) => {
                if (lastDoor !== undefined && event.target instanceof HTMLElement) {
                    lastDoor.current =
                        event.target.closest<HTMLElement>("[data-start-door]")?.dataset.startDoor ?? null;
                }
            }}
        >
            <header className="ws-start-head">
                <MainMenu start />
                <h1 className="ws-start-brand">
                    <GLYPHS.sample size={16} aria-hidden />
                    graphty
                </h1>
                <span className="ws-start-grow" />
                <PrivacyChip />
                <CommandButton id="settings.open" icon={<GLYPHS.settings size={16} aria-hidden />} />
            </header>

            <main className="ws-start-main">
                <div className="ws-start-cols">
                    <Column title="Start">
                        <Door id="file.open" icon={<GLYPHS.open size={16} aria-hidden />} ref={firstDoor} />
                        <Door id="data.new" icon={<GLYPHS.newFile size={16} aria-hidden />} />
                        <Text size="xs" c="dimmed" className="ws-start-line">
                            <GLYPHS.upload size={12} aria-hidden /> or drop a file anywhere in this window
                        </Text>
                        <Text size="xs" c="dimmed" className="ws-start-line">
                            <GLYPHS.private size={12} aria-hidden /> Files are read on this computer and never uploaded.
                        </Text>
                    </Column>
                    <Column title="Recent projects">
                        <RecentProjects emptyFocus={firstDoor} />
                    </Column>
                    <Column title="Samples">
                        {START_SAMPLES.map((sample) => (
                            <UnstyledButton
                                key={sample.id}
                                className="ws-start-sample"
                                data-start-door={`sample:${sample.id}`}
                                aria-label={`Open the ${sample.name} sample`}
                                // The name replaces the card's text, so its size and sentence are
                                // given as the description: heard, not only seen.
                                aria-describedby={`ws-sample-${sample.id}-size ws-sample-${sample.id}-sentence`}
                                onClick={() => {
                                    openSample(workspace.store, sample);
                                }}
                            >
                                <span className="ws-start-sample-name">
                                    <Text span size="sm" fw={550} truncate="end">
                                        {sample.name}
                                    </Text>
                                    <Text span size="xs" c="dimmed" id={`ws-sample-${sample.id}-size`}>
                                        {sample.size}
                                    </Text>
                                </span>
                                <Text size="xs" c="dimmed" id={`ws-sample-${sample.id}-sentence`}>
                                    {sample.sentence}
                                </Text>
                            </UnstyledButton>
                        ))}
                    </Column>
                </div>

                <div className="ws-start-foot">
                    <UsageDataCard
                        onAnswered={() => {
                            // The card's buttons go; focus goes to the first way in, not the page.
                            firstDoor.current?.focus();
                        }}
                    />
                </div>
            </main>

            <NoticeSlot returnFocus={firstDoor} />

            {dragging ? (
                <div className="ws-start-drop" aria-hidden>
                    <Paper withBorder p="lg">
                        <Stack align="center" gap={4}>
                            <GLYPHS.upload size={24} aria-hidden />
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
