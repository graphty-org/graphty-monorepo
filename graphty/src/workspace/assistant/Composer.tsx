import { Button, Group, Textarea, Tooltip } from "@mantine/core";
import React, { useEffect, useRef } from "react";

import type { AssistantChoice } from "../assistant-door/provider";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { send } from "./connection";
import { type AssistantView, isRunning } from "./useAssistantView";
import { WORDS } from "./words";

/** Props for Composer. */
interface ComposerProps {
    readonly choice: AssistantChoice;
    readonly view: AssistantView;
    /** The model's name, shown because the reader pays for it. */
    readonly model: string;
}

/**
 * The composer, pinned at the panel's foot: the message field, the model label and Send, which is
 * Stop while a message runs. The field stays typable through a run, and Send and Stop are one
 * button, so focus survives the change.
 * @param props - Component props
 * @param props.choice - the provider and model
 * @param props.view - what the element reports
 * @param props.model - the model's name
 * @returns The composer
 */
export function Composer({ choice, view, model }: Readonly<ComposerProps>): React.JSX.Element {
    const { store, element, run } = useWorkspace();
    const draft = useWorkspaceState((state) => state.assistantDraft);
    const composerCalls = useWorkspaceState((state) => state.composerCalls);
    const field = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (composerCalls > 0) {
            field.current?.focus();
        }
    }, [composerCalls]);
    const running = isRunning(view.status);
    const empty = draft.trim() === "";
    const submit = (): void => {
        if (element !== null && !running && !empty) {
            void send(element, store, choice, draft);
        }
    };
    return (
        <div className="ws-assistant-foot" data-panel-start="">
            <Textarea
                ref={field}
                aria-label={WORDS["assistant.composer.name"]}
                placeholder={WORDS["assistant.composer.placeholder"]}
                data-assistant-composer=""
                autosize
                minRows={1}
                maxRows={6}
                value={draft}
                onChange={(event) => {
                    store.set({ assistantDraft: event.currentTarget.value });
                }}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        submit();
                    } else if (event.key === "Escape" && view.status?.canCancel === true) {
                        event.preventDefault();
                        element?.cancelAiCommand();
                    }
                }}
            />
            <Group justify="space-between" gap={4} wrap="nowrap">
                <Tooltip label={WORDS["assistant.model.tooltip"]}>
                    <Button
                        variant="subtle"
                        color="gray"
                        size="compact-xs"
                        onClick={() => {
                            run("settings.assistant");
                        }}
                    >
                        {model}
                    </Button>
                </Tooltip>
                <Tooltip label={WORDS["assistant.send.tooltip"]} disabled={running}>
                    <Button
                        size="compact-xs"
                        variant={running ? "default" : "filled"}
                        aria-disabled={!running && empty}
                        aria-keyshortcuts={running ? "Escape" : undefined}
                        onClick={() => {
                            if (running) {
                                element?.cancelAiCommand();
                            } else {
                                submit();
                            }
                            field.current?.focus();
                        }}
                    >
                        {running ? WORDS["assistant.stop"] : WORDS["assistant.send"]}
                    </Button>
                </Tooltip>
            </Group>
        </div>
    );
}
