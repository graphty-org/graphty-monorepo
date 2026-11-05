import "./assistant.css";

import { TooltipShortcut } from "@graphty/compact-mantine";
import { ActionIcon, Button, Stack, Text, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { closeAssistant } from "../assistant-door/commands";
import { type AssistantChoice, providerDescriptor, useAssistantChoice } from "../assistant-door/provider";
import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { Composer } from "./Composer";
import { Conversation } from "./Conversation";
import { ConversationList } from "./ConversationList";
import { type AssistantView, useAssistantView } from "./useAssistantView";
import { starterColumn, WORDS } from "./words";

/**
 * The first screen: what the assistant does, then the one door to set it up. No composer, because
 * a dead control teaches nothing. Marked as the composer, so Mod+I closes from here as it does there.
 * @returns The screen
 */
function NoProvider(): React.JSX.Element {
    const { run } = useWorkspace();
    const composerCalls = useWorkspaceState((state) => state.composerCalls);
    const door = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (composerCalls > 0) {
            door.current?.focus();
        }
    }, [composerCalls]);
    return (
        <Stack gap={8} className="ws-assistant-setup" data-panel-start="">
            <Text size="sm">{WORDS["assistant.intro"]}</Text>
            <Button
                ref={door}
                variant="default"
                size="xs"
                data-assistant-composer=""
                onClick={() => {
                    run("settings.assistant");
                }}
            >
                {WORDS["assistant.setup.button"]}
            </Button>
            <Text size="xs">{WORDS["assistant.setup.line"]}</Text>
        </Stack>
    );
}

/**
 * An empty conversation's intro and starters: questions that fill the composer and never send, the
 * third from the graph's first categorical column.
 * @returns The intro
 */
function Starters(): React.JSX.Element {
    const { store, session } = useWorkspace();
    const column = session?.data
        .attributes()
        .find(({ kind, name, measurement }) => kind === "node" && name !== "id" && measurement === "categorical");
    const starters = [
        WORDS["assistant.starter.matter"],
        WORDS["assistant.starter.groups"],
        column === undefined ? WORDS["assistant.starter.stands-out"] : starterColumn(column.name),
    ];
    return (
        <Stack gap={4} className="ws-assistant-starters">
            <Text size="sm" mb={4}>
                {WORDS["assistant.intro"]}
            </Text>
            {starters.map((starter) => (
                <Button
                    key={starter}
                    variant="subtle"
                    color="gray"
                    size="compact-sm"
                    justify="flex-start"
                    onClick={() => {
                        store.set((state) => ({
                            assistantDraft: starter,
                            composerCalls: state.composerCalls + 1,
                        }));
                    }}
                >
                    {starter}
                </Button>
            ))}
        </Stack>
    );
}

/** Props for Ready. */
interface ReadyProps {
    readonly choice: AssistantChoice;
    readonly view: AssistantView;
    readonly listing: boolean;
    readonly onCloseList: () => void;
}

/**
 * The panel with a provider set up: the log or the conversation list, and the composer.
 * @param props - Component props
 * @param props.choice - the provider and model
 * @param props.view - what the element reports
 * @param props.listing - whether the list shows in place of the log
 * @param props.onCloseList - returns to the log
 * @returns The panel's body
 */
function Ready({ choice, view, listing, onCloseList }: Readonly<ReadyProps>): React.JSX.Element {
    const ended = useWorkspaceState((state) => state.assistantEnded);
    const { models } = providerDescriptor(choice.provider);
    const model = models.find((entry) => entry.id === choice.model)?.plainName ?? choice.model;
    const empty = (view.conversation?.messages ?? []).length === 0 && ended === null;
    if (listing) {
        return (
            <>
                <ConversationList onClose={onCloseList} />
                <Composer choice={choice} view={view} model={model} />
            </>
        );
    }
    return (
        <>
            {empty ? (
                <div className="ws-assistant-log">
                    <Starters />
                </div>
            ) : (
                <Conversation conversation={view.conversation} status={view.status} choice={choice} />
            )}
            <Composer choice={choice} view={view} model={model} />
        </>
    );
}

/**
 * The Assistant's panel: its title, the conversation and the composer, or the first screen until
 * a provider is set up.
 * @returns The panel
 */
export default function AssistantPanel(): React.JSX.Element {
    const { store, element } = useWorkspace();
    const choice = useAssistantChoice();
    const view = useAssistantView(choice);
    const [listing, setListing] = useState(false);
    const setUp = choice !== null && !view.keyMissing;
    const empty = (view.conversation?.messages ?? []).length === 0;
    const title = empty ? WORDS["assistant.title.new"] : WORDS["assistant.name"];
    const backToLog = (): void => {
        setListing(false);
        store.set((state) => ({ composerCalls: state.composerCalls + 1 }));
    };
    return (
        <section className="ws-assistant" aria-label={WORDS["assistant.name"]}>
            <header className="ws-assistant-head">
                {setUp ? (
                    <Tooltip label={WORDS["assistant.title.tooltip"]}>
                        <Button
                            variant="subtle"
                            color="gray"
                            size="compact-xs"
                            aria-label={`${title}, ${WORDS["assistant.title.tooltip"]}`}
                            aria-expanded={listing}
                            rightSection={<GLYPHS.expand size={12} aria-hidden />}
                            onClick={() => {
                                if (listing) {
                                    backToLog();
                                } else {
                                    setListing(true);
                                }
                            }}
                        >
                            {title}
                        </Button>
                    </Tooltip>
                ) : (
                    <h2 className="ws-assistant-title">{WORDS["assistant.name"]}</h2>
                )}
                <span className="ws-assistant-actions">
                    {setUp ? (
                        <Tooltip label={WORDS["assistant.new"]}>
                            <ActionIcon
                                variant="subtle"
                                color="gray"
                                aria-label={WORDS["assistant.new"]}
                                onClick={() => {
                                    void element?.newAiConversation().then(backToLog);
                                }}
                            >
                                <GLYPHS.add size={14} aria-hidden />
                            </ActionIcon>
                        </Tooltip>
                    ) : null}
                    <Tooltip label={<TooltipShortcut label={WORDS["assistant.close"]} shortcut={formatKey("Mod+I")} />}>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={WORDS["assistant.close"]}
                            aria-keyshortcuts={ariaKey("Mod+I")}
                            onClick={() => {
                                closeAssistant(store);
                            }}
                        >
                            <GLYPHS.close size={14} aria-hidden />
                        </ActionIcon>
                    </Tooltip>
                </span>
            </header>
            {setUp ? <Ready choice={choice} view={view} listing={listing} onCloseList={backToLog} /> : <NoProvider />}
        </section>
    );
}
