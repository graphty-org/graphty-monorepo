import { EntityChip } from "@graphty/compact-mantine";
import { ActionIcon, Button, Group, Text, Textarea, Tooltip } from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { type AssistantChoice, providerDescriptor } from "../assistant-door/provider";
import { useVisibilityVersion } from "../data-place/useVisibilityVersion";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../settings/numberFormat";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useSessionVersion } from "../toolbar/useSessionVersion";
import { answerQuestion, type ScopeKind, scopeKind, send } from "./connection";
import { Talk } from "./Talk";
import { type AssistantView, isRunning } from "./useAssistantView";
import { hiddenWords, WORDS } from "./words";

/** The scope a message goes with. */
interface Scope {
    /** What the next message is about. */
    readonly kind: ScopeKind;
    readonly line: React.JSX.Element;
}

/**
 * What the next message is about, in one line above the composer, live while typing. The x lasts
 * for one message, or until the selection changes.
 * @returns The scope and its line
 */
function useScope(): Scope {
    const { session, store } = useWorkspace();
    useVisibilityVersion(session);
    useSessionVersion(session);
    const dropped = useWorkspaceState((state) => state.assistantScopeDropped);
    const setDropped = (assistantScopeDropped: boolean): void => {
        store.set({ assistantScopeDropped });
    };
    const selected = session?.selection.nodes.length ?? 0;
    const selectedEdges = session?.selection.edges.length ?? 0;
    const any = selected + selectedEdges > 0;
    const kind = scopeKind(session, dropped);
    useEffect(() => {
        const forget = (): void => {
            store.set({ assistantScopeDropped: false });
        };
        const off = session?.on("selection:changed", forget);
        return () => {
            off?.();
            // Nothing watches the selection without this line, so the x goes with it.
            forget();
        };
    }, [session, store]);
    const { nodes = 0, edges = 0 } = session?.status.counts ?? {};
    const hidden = nodes - (session?.visibility.summary.visibleNodes ?? nodes);
    const chips = (nodeCount: number, edgeCount: number): React.JSX.Element => (
        <>
            {nodeCount > 0 ? <EntityChip kind="node">{formatNumber(nodeCount)}</EntityChip> : null}
            {edgeCount > 0 ? <EntityChip kind="edge">{formatNumber(edgeCount)}</EntityChip> : null}
        </>
    );
    const line =
        kind === "selection" ? (
            <Group gap={4} wrap="nowrap" className="ws-assistant-scope">
                <Text size="xs">{WORDS["assistant.scope.selection"]}</Text>
                {chips(selected, selectedEdges)}
                <Tooltip label={WORDS["assistant.scope.drop"]}>
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="xs"
                        aria-label={WORDS["assistant.scope.drop"]}
                        onClick={() => {
                            setDropped(true);
                        }}
                    >
                        <GLYPHS.close size={12} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            </Group>
        ) : (
            <Group gap={4} wrap="nowrap" className="ws-assistant-scope">
                <Text size="xs">{WORDS["assistant.scope.graph"]}</Text>
                {chips(nodes, edges)}
                {hidden > 0 ? <Text size="xs">{hiddenWords(hidden)}</Text> : null}
                {any ? (
                    <Button
                        variant="subtle"
                        color="gray"
                        size="compact-xs"
                        onClick={() => {
                            setDropped(false);
                        }}
                    >
                        {WORDS["assistant.scope.use"]}
                    </Button>
                ) : null}
            </Group>
        );
    return { kind, line };
}

/** Props for Composer. */
interface ComposerProps {
    readonly choice: AssistantChoice;
    readonly view: AssistantView;
    /** The model's name, shown because the reader pays for it. */
    readonly model: string;
}

/**
 * The composer, pinned at the panel's foot: the scope line, the message field, the model label, Talk
 * and Send, which is Stop while a message runs. The field stays typable through a run, and Send and
 * Stop are one button, so focus survives the change.
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
    const spoken = useWorkspaceState((state) => state.assistantSpoken);
    const [voiceLine, setVoiceLine] = useState<string | null>(null);
    const field = useRef<HTMLTextAreaElement>(null);
    const scope = useScope();
    useEffect(() => {
        if (composerCalls > 0) {
            field.current?.focus();
        }
    }, [composerCalls]);
    const running = isRunning(view.status);
    const empty = draft.trim() === "";
    const [question] = view.questions;
    const asking = view.approvals.length === 0 && question !== undefined;
    const waiting = view.approvals.length > 0 || question !== undefined;
    const submit = (): void => {
        if (element === null || running || empty) {
            return;
        }
        if (asking) {
            void answerQuestion(element, store, choice, question.id, draft, draft);
            return;
        }
        void send(element, store, choice, draft, {
            scope: scope.kind,
            ...(spoken === null ? {} : { via: "voice" as const, ...spoken }),
        });
    };
    return (
        <div className="ws-assistant-foot">
            {scope.line}
            <div data-panel-always="">
                <Textarea
                    ref={field}
                    aria-label={WORDS["assistant.composer.name"]}
                    placeholder={asking ? WORDS["assistant.composer.answer"] : WORDS["assistant.composer.placeholder"]}
                    data-assistant-composer=""
                    // An emptied composer holds no edit of its own, so Mod+Z is the app's Undo.
                    data-committed={draft === "" ? "" : undefined}
                    autosize
                    minRows={1}
                    maxRows={6}
                    value={draft}
                    onChange={(event) => {
                        const text = event.currentTarget.value;
                        store.set({
                            assistantDraft: text,
                            assistantRefused: false,
                            // An erased transcript takes what was said, and pointed at, with it.
                            ...(text.trim() === "" ? { assistantSpoken: null } : {}),
                        });
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
            </div>
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
                <Group gap={4} wrap="nowrap">
                    <Talk
                        provider={providerDescriptor(choice.provider).plainName}
                        linked={view.linked}
                        onLine={setVoiceLine}
                    />
                    <Tooltip label={WORDS["assistant.send.tooltip"]} disabled={running}>
                        <Button
                            size="compact-xs"
                            variant={running || waiting ? "default" : "filled"}
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
            </Group>
            {voiceLine === null ? null : <Text size="xs">{voiceLine}</Text>}
        </div>
    );
}
