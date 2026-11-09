import { EntityChip, MenuCheckItem, TargetTooltip, TooltipShortcut } from "@graphty/compact-mantine";
import type { AiPointing } from "@graphty/graphty-element/ai";
import { ActionIcon, Group, Indicator, Menu, Text, Textarea, Tooltip } from "@mantine/core";
import React, { useEffect, useId, useRef, useState } from "react";

import {
    type AssistantChoice,
    effortLevels,
    effortOf,
    providerDescriptor,
    writeAssistantChoice,
} from "../assistant-door/provider";
import { GLYPHS } from "../glyphs";
import { formatNumber } from "../settings/numberFormat";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { useSessionVersion } from "../toolbar/useSessionVersion";
import { answerQuestion, link, type ScopeKind, scopeKind, send } from "./connection";
import { Talk } from "./Talk";
import { type AssistantView, isRunning } from "./useAssistantView";
import { effortRows, optionsSelectionTip, WORDS } from "./words";

/** The scope a message goes with. */
interface Scope {
    /** What the next message is about. */
    readonly kind: ScopeKind;
    /** How many nodes and edges are selected now. */
    readonly nodes: number;
    readonly edges: number;
}

/**
 * What the next message is about: the whole graph, unless the reader picked Selection in the
 * options and something is still selected. Workspace drops the pick when the selection empties.
 * @returns The scope
 */
function useScope(): Scope {
    const { session } = useWorkspace();
    useSessionVersion(session);
    const picked = useWorkspaceState((state) => state.assistantScopeSelection);
    return {
        kind: scopeKind(session, picked),
        nodes: session?.selection.nodes.length ?? 0,
        edges: session?.selection.edges.length ?? 0,
    };
}

/** Props for Options. */
interface OptionsProps {
    readonly choice: AssistantChoice;
    readonly scope: Scope;
    readonly running: boolean;
    readonly model: string;
}

/**
 * The cog at the composer's left: what to ask about, the effort level, whether what Talk heard is
 * sent when talking ends, and the model, which opens Settings. A dot on the cog marks a message about the selection.
 * @param props - Component props
 * @param props.choice - the provider and model
 * @param props.scope - what the next message is about
 * @param props.running - whether a message runs
 * @param props.model - the model's name
 * @returns The cog and its menu
 */
function Options({ choice, scope, running, model }: Readonly<OptionsProps>): React.JSX.Element {
    const { store, element, run } = useWorkspace();
    const levels = effortLevels(choice);
    const effort = effortOf(choice);
    const about = scope.kind === "selection";
    const any = scope.nodes + scope.edges > 0;
    const pick = (assistantScopeSelection: boolean): void => {
        store.set({ assistantScopeSelection });
    };
    // Each set of radio rows is a group named by its label, so picking one leaves the other alone.
    const aboutId = useId();
    const effortId = useId();
    return (
        <Indicator inline size={7} offset={5} withBorder disabled={!about}>
            <Menu position="top-start">
                <Menu.Target>
                    <TargetTooltip
                        label={about ? optionsSelectionTip(scope.nodes, scope.edges) : WORDS["assistant.options"]}
                    >
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label={about ? WORDS["assistant.options.selection"] : WORDS["assistant.options"]}
                        >
                            <GLYPHS.settings size={16} aria-hidden />
                        </ActionIcon>
                    </TargetTooltip>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Label id={aboutId}>{WORDS["assistant.scope.about"]}</Menu.Label>
                    <div // NOSONAR(S6819): a group of menu items; a fieldset is not allowed inside a menu
                        role="group"
                        aria-labelledby={aboutId}
                    >
                        <MenuCheckItem
                            radio
                            checked={!about}
                            onClick={() => {
                                pick(false);
                            }}
                        >
                            {WORDS["assistant.scope.graph"]}
                        </MenuCheckItem>
                        <MenuCheckItem
                            radio
                            checked={about}
                            disabled={!any}
                            rightSection={
                                <Group gap={2} wrap="nowrap">
                                    {scope.nodes > 0 ? (
                                        <EntityChip kind="node">{formatNumber(scope.nodes)}</EntityChip>
                                    ) : null}
                                    {scope.edges > 0 ? (
                                        <EntityChip kind="edge">{formatNumber(scope.edges)}</EntityChip>
                                    ) : null}
                                </Group>
                            }
                            onClick={() => {
                                pick(true);
                            }}
                        >
                            {WORDS["assistant.scope.selection"]}
                        </MenuCheckItem>
                    </div>
                    {levels.length > 0 ? (
                        <>
                            <Menu.Divider />
                            <Menu.Label id={effortId}>{WORDS["assistant.provider.effort"]}</Menu.Label>
                            <div // NOSONAR(S6819): a group of menu items; a fieldset is not allowed inside a menu
                                role="group"
                                aria-labelledby={effortId}
                            >
                                {effortRows(levels).map((row) => (
                                    <MenuCheckItem
                                        key={row.value}
                                        radio
                                        checked={effort === row.value}
                                        disabled={running}
                                        onClick={() => {
                                            if (element === null || effort === row.value) {
                                                return;
                                            }
                                            const next = { ...choice, effort: row.value };
                                            writeAssistantChoice(next);
                                            // The assistant takes a new level by being set up again, as Settings' Save does.
                                            void link(element, store, next).catch(() => undefined);
                                        }}
                                    >
                                        {row.label}
                                    </MenuCheckItem>
                                ))}
                            </div>
                        </>
                    ) : null}
                    <Menu.Divider />
                    <MenuCheckItem
                        checked={choice.sendSpoken !== false}
                        onClick={() => {
                            // Read at the end of each press, so the next one goes the new way.
                            writeAssistantChoice({ ...choice, sendSpoken: choice.sendSpoken === false });
                        }}
                    >
                        {WORDS["assistant.talk.send"]}
                    </MenuCheckItem>
                    <Menu.Divider />
                    <Menu.Item
                        onClick={() => {
                            run("settings.assistant");
                        }}
                    >
                        {`${model}...`}
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Indicator>
    );
}

/** Props for Composer. */
interface ComposerProps {
    readonly choice: AssistantChoice;
    readonly view: AssistantView;
    /** The model's name, in the options because the reader pays for it. */
    readonly model: string;
}

/**
 * The composer, pinned at the panel's foot: one box holding the message field over a row of
 * icons -- the options cog, Talk, and Send, which is Stop while a message runs. The field stays
 * typable through a run, and Send and Stop are one button, so focus survives the change.
 * @param props - Component props
 * @param props.choice - the provider and model
 * @param props.view - what the element reports
 * @param props.model - the model's name
 * @returns The composer
 */
export function Composer({ choice, view, model }: Readonly<ComposerProps>): React.JSX.Element {
    const { store, element } = useWorkspace();
    const draft = useWorkspaceState((state) => state.assistantDraft);
    const composerCalls = useWorkspaceState((state) => state.composerCalls);
    const spoken = useWorkspaceState((state) => state.assistantSpoken);
    const [voiceLine, setVoiceLine] = useState<string | null>(null);
    const field = useRef<HTMLTextAreaElement>(null);
    const scope = useScope();
    useEffect(() => {
        const box = field.current;
        if (composerCalls > 0 && box !== null) {
            box.focus();
            // A field drawn with its words already in it holds the caret at 0; new words go after old.
            box.setSelectionRange(box.value.length, box.value.length);
        }
    }, [composerCalls]);
    const running = isRunning(view.status);
    const empty = draft.trim() === "";
    const [question] = view.questions;
    const asking = view.approvals.length === 0 && question !== undefined;
    const waiting = view.approvals.length > 0 || question !== undefined;
    const about =
        scope.kind === "selection"
            ? WORDS["assistant.composer.placeholder.selection"]
            : WORDS["assistant.composer.placeholder"];
    const placeholder = asking ? WORDS["assistant.composer.answer"] : about;
    const submitText = (text: string, said: { pointing?: AiPointing } | null): void => {
        if (element === null || running || text.trim() === "") {
            return;
        }
        if (asking) {
            void answerQuestion(element, store, choice, question.id, text, text);
            return;
        }
        void send(element, store, choice, text, {
            scope: scope.kind,
            ...(said === null ? {} : { via: "voice" as const, ...said }),
        });
    };
    const submit = (): void => {
        submitText(draft, spoken);
    };
    const sendName = running ? WORDS["assistant.stop"] : WORDS["assistant.send"];
    // Stop is a gray fill, never the accent: the accent stays on Send alone.
    let sendVariant = waiting ? "default" : "filled";
    if (running) {
        sendVariant = "light";
    }
    return (
        <div className="ws-assistant-foot">
            <div className="ws-assistant-box" data-panel-always="">
                <Textarea
                    ref={field}
                    variant="unstyled"
                    classNames={{ input: "ws-assistant-input" }}
                    aria-label={WORDS["assistant.composer.name"]}
                    placeholder={placeholder}
                    // The browser does not read a named field's placeholder, so its words describe it too.
                    aria-description={placeholder}
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
                <Group gap={2} wrap="nowrap">
                    <Options choice={choice} scope={scope} running={running} model={model} />
                    <Group gap={4} wrap="nowrap" ml="auto">
                        <Talk
                            provider={providerDescriptor(choice.provider).plainName}
                            linked={view.linked}
                            onLine={setVoiceLine}
                            onHeard={(text, pointing) => {
                                if (choice.sendSpoken !== false) {
                                    submitText(text, { pointing });
                                }
                            }}
                        />
                        <Tooltip label={<TooltipShortcut label={sendName} shortcut={running ? "Esc" : "Enter"} />}>
                            <ActionIcon
                                className="ws-assistant-send"
                                radius="xl"
                                variant={sendVariant}
                                color={running ? "gray" : undefined}
                                aria-label={sendName}
                                aria-disabled={!running && empty}
                                aria-keyshortcuts={running ? "Escape" : "Enter"}
                                onClick={() => {
                                    if (running) {
                                        element?.cancelAiCommand();
                                    } else {
                                        submit();
                                    }
                                    field.current?.focus();
                                }}
                            >
                                {running ? (
                                    <GLYPHS.stop size={14} fill="currentColor" aria-hidden />
                                ) : (
                                    <GLYPHS.send size={14} aria-hidden />
                                )}
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </div>
            {/* Over the log's foot, so the line coming and going never moves the composer. */}
            {voiceLine === null ? null : (
                <Text size="xs" className="ws-assistant-voice">
                    {voiceLine}
                </Text>
            )}
        </div>
    );
}
