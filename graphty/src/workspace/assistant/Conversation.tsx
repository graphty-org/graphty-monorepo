import type { AiConversationMessage, AiConversationSnapshot, AiStatus } from "@graphty/graphty-element/ai";
import type { AiEffect } from "@graphty/graphty-element/catalog";
import { Button, Collapse, Group, Text } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { AssistantChoice } from "../assistant-door/provider";
import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { ChangeRows, ResultRow } from "./Checks";
import { send } from "./connection";
import { isRunning } from "./useAssistantView";
import {
    durationWords,
    type EndWords,
    endWords,
    isChange,
    providerName,
    runningWords,
    sendingWords,
    stepName,
    stepsWords,
    WORDS,
} from "./words";

/** A scrolled-up reader this close to the foot still counts as following. */
const FOOT_SLACK_PX = 8;
/** How long a run goes before its working line shows (design 4.5). */
const WORKING_AFTER_MS = 1000;

type ReaderMessage = Extract<AiConversationMessage, { role: "reader" }>;
type AssistantMessage = Extract<AiConversationMessage, { role: "assistant" }>;

/** The reader's message and everything that answered it. */
interface Turn {
    readonly reader: ReaderMessage | null;
    readonly replies: readonly AssistantMessage[];
    /** The id its steps carry: an answer to a question goes on with the message it answers. */
    readonly provenance: string | undefined;
    /** Whether none of its changes stands. */
    readonly undone: boolean;
}

/** One step, as a row shows it: never its arguments. */
interface Step {
    readonly name: string;
    readonly ms?: number;
    /** What it found, on the last step of its reply. */
    readonly results?: readonly AiEffect[];
}

/**
 * Groups a conversation's messages into turns.
 * @param messages - the messages, oldest first.
 * @returns the turns.
 */
function turnsOf(messages: readonly AiConversationMessage[]): readonly Turn[] {
    const turns: {
        reader: ReaderMessage | null;
        replies: AssistantMessage[];
        provenance: string | undefined;
        undone: boolean;
    }[] = [];
    for (const message of messages) {
        if (message.role === "reader") {
            const before = turns.at(-1);
            turns.push({
                reader: message,
                replies: [],
                provenance: message.provenance ?? before?.provenance,
                undone: message.undone ?? (message.provenance === undefined && before?.undone === true),
            });
        } else if (message.role === "assistant") {
            if (turns.length === 0) {
                turns.push({ reader: null, replies: [], provenance: undefined, undone: false });
            }
            turns[turns.length - 1].replies.push(message);
        }
    }
    return turns;
}

/**
 * The working line: what is happening now, from the stage and the running tool.
 * @param status - the status.
 * @param provider - the provider's id.
 * @returns the line.
 */
function workingLine(status: AiStatus, provider: string): string {
    const tool = status.toolCalls?.findLast((call) => call.status === "executing");
    if (status.stage === "executing" || tool !== undefined) {
        return runningWords(stepName(tool?.name ?? "", tool?.arguments));
    }
    return status.stage === "generating" ? WORDS["assistant.working.writing"] : sendingWords(providerName(provider));
}

/**
 * Whether a run has gone on long enough to show its working line.
 * @param running - whether one runs.
 * @returns true after a second of it.
 */
function useLate(running: boolean): boolean {
    const [late, setLate] = useState(false);
    useEffect(() => {
        setLate(false);
        if (!running) {
            return undefined;
        }
        const timer = setTimeout(() => {
            setLate(true);
        }, WORKING_AFTER_MS);
        return () => {
            clearTimeout(timer);
        };
    }, [running]);
    return late;
}

/** Props for Steps. */
interface StepsProps {
    readonly steps: readonly Step[];
    readonly open: boolean;
    readonly onToggle: () => void;
}

/**
 * A turn's steps: collapsed, a plain name, a time and any chips each.
 * @param props - Component props
 * @param props.steps - the steps
 * @param props.open - whether they show
 * @param props.onToggle - opens or closes them
 * @returns The row, or nothing with no steps
 */
function Steps({ steps, open, onToggle }: Readonly<StepsProps>): React.JSX.Element | null {
    if (steps.length === 0) {
        return null;
    }
    return (
        <div>
            <Button
                variant="subtle"
                color="gray"
                size="compact-xs"
                aria-expanded={open}
                leftSection={<GLYPHS.expand size={12} aria-hidden className={open ? undefined : "ws-assistant-shut"} />}
                onClick={onToggle}
            >
                {stepsWords(steps.length)}
            </Button>
            <Collapse in={open}>
                <ul className="ws-assistant-steps">
                    {steps.map((step, index) => (
                        // A step has no id of its own, and a turn's steps only ever grow at the end.
                        <li key={index}>
                            <span className="ws-assistant-step">
                                <Text span size="xs">
                                    {step.name}
                                </Text>
                                {step.ms === undefined ? null : (
                                    <Text span size="xs" c="dimmed">
                                        {durationWords(step.ms)}
                                    </Text>
                                )}
                            </span>
                            {open
                                ? step.results?.map((effect, at) => (
                                      // A reply's results never reorder.
                                      <ResultRow key={at} effect={effect} />
                                  ))
                                : null}
                        </li>
                    ))}
                </ul>
            </Collapse>
        </div>
    );
}

/** Props for EndRow. */
interface EndRowProps {
    readonly words: EndWords;
    /** Whether the turn left the graph as it was. */
    readonly unchanged: boolean;
    readonly onAgain: (() => void) | null;
}

/**
 * How a turn ended, in words from its code, with its one button.
 * @param props - Component props
 * @param props.words - the words
 * @param props.unchanged - whether nothing changed
 * @param props.onAgain - sends the message again, on the newest turn
 * @returns The row
 */
function EndRow({ words, unchanged, onAgain }: Readonly<EndRowProps>): React.JSX.Element {
    const { run } = useWorkspace();
    return (
        <div role={words.failed ? "alert" : undefined}>
            <Text size="sm">{words.line}</Text>
            <Group justify="space-between" gap={4}>
                {words.action !== null && unchanged ? (
                    <Text size="sm">{WORDS["assistant.nothing-changed"]}</Text>
                ) : (
                    <span />
                )}
                {words.action === "again" && onAgain !== null ? (
                    <Button variant="default" size="compact-xs" onClick={onAgain}>
                        {WORDS["assistant.again"]}
                    </Button>
                ) : null}
                {words.action === "provider" ? (
                    <Button
                        variant="default"
                        size="compact-xs"
                        onClick={() => {
                            run("settings.assistant");
                        }}
                    >
                        {WORDS["assistant.setup.button"]}
                    </Button>
                ) : null}
            </Group>
        </div>
    );
}

/** Props for TurnView. */
interface TurnViewProps {
    readonly turn: Turn;
    /** The status, on the newest turn only. */
    readonly status: AiStatus | null;
    readonly provider: string;
    readonly late: boolean;
    readonly onAgain: ((reader: ReaderMessage) => void) | null;
}

/**
 * One turn: You, then Assistant with its steps, its prose and how it ended. Prose is text, never HTML.
 * @param props - Component props
 * @param props.turn - the turn
 * @param props.status - the status, on the newest turn
 * @param props.provider - the provider's id
 * @param props.late - whether the working line shows
 * @param props.onAgain - sends a message again, on the newest turn
 * @returns The turn
 */
function TurnView({ turn, status, provider, late, onAgain }: Readonly<TurnViewProps>): React.JSX.Element {
    const lastEnded = useWorkspaceState((state) => state.assistantEnded);
    const [stepsOpen, setStepsOpen] = useState(false);
    const running = isRunning(status);
    const said = turn.replies
        .map((reply) => reply.text)
        .filter((text) => text !== "")
        .join("\n");
    // A run in progress, and a run that ended before its words were saved, show what streamed.
    const prose = running || said === "" ? (status?.streamedText ?? said) : said;
    const steps: readonly Step[] = running
        ? (status?.toolCalls ?? []).map((call) => ({ name: stepName(call.name, call.arguments) }))
        : turn.replies.flatMap((reply) =>
              reply.calls.map((call, index) => ({
                  name: stepName(call.command, call.arguments),
                  ...(call.durationMs === undefined ? {} : { ms: call.durationMs }),
                  ...(index === reply.calls.length - 1
                      ? { results: (reply.effects ?? []).filter((effect) => !isChange(effect)) }
                      : {}),
              })),
          );
    const effects = running ? [] : turn.replies.flatMap((reply) => reply.effects ?? []);
    const changes = effects.filter(isChange);
    const result = effects.findLast((effect) => !isChange(effect));
    // A request that ended unanswered says why on the calls it held.
    const unanswered = turn.replies
        .flatMap((reply) => reply.calls)
        .findLast((call) => call.code === "AI_APPROVAL_STALE");
    const saved = turn.replies.findLast((reply) => reply.outcome !== undefined)?.outcome ?? unanswered;
    const ended = saved ?? (status === null ? undefined : (lastEnded ?? undefined));
    const words = running || ended === undefined ? null : endWords(ended.code, ended.params, provider, false);
    const { reader } = turn;
    return (
        <div className="ws-assistant-turn">
            {reader === null ? null : (
                <>
                    <h3 className="ws-assistant-who">
                        {reader.via === "voice" ? WORDS["assistant.turn.you-spoken"] : WORDS["assistant.turn.you"]}
                    </h3>
                    <Text size="sm" className="ws-assistant-prose">
                        {reader.text}
                    </Text>
                </>
            )}
            {running || prose !== "" || steps.length > 0 || words !== null ? (
                <>
                    <h3 className="ws-assistant-who">{WORDS["assistant.turn.assistant"]}</h3>
                    <Steps
                        steps={steps}
                        open={stepsOpen}
                        onToggle={() => {
                            setStepsOpen(!stepsOpen);
                        }}
                    />
                    {prose === "" ? null : (
                        <Text size="sm" className="ws-assistant-prose">
                            {prose}
                        </Text>
                    )}
                    {running && late && status !== null ? <Text size="sm">{workingLine(status, provider)}</Text> : null}
                    {changes.length > 0 ? (
                        <ChangeRows
                            changes={changes}
                            provenance={turn.provenance}
                            undone={turn.undone}
                            onMore={() => {
                                setStepsOpen(true);
                            }}
                        />
                    ) : null}
                    {changes.length === 0 && result !== undefined ? <ResultRow effect={result} table /> : null}
                    {words === null ? null : (
                        <EndRow
                            words={words}
                            unchanged={changes.length === 0}
                            onAgain={
                                onAgain === null || reader === null
                                    ? null
                                    : () => {
                                          onAgain(reader);
                                      }
                            }
                        />
                    )}
                </>
            ) : null}
        </div>
    );
}

/** Props for Conversation. */
interface ConversationProps {
    readonly conversation: AiConversationSnapshot | null;
    readonly status: AiStatus | null;
    readonly choice: AssistantChoice;
}

/**
 * The log: every turn, following a reader at the foot and offering Jump to newest to anyone else.
 * One focus stop, so arrows and Page keys scroll it. Never a live region: status news is the
 * workspace's one status line.
 * @param props - Component props
 * @param props.conversation - the open conversation
 * @param props.status - the status
 * @param props.choice - the provider and model
 * @returns The log
 */
export function Conversation({ conversation, status, choice }: Readonly<ConversationProps>): React.JSX.Element {
    const { element, store } = useWorkspace();
    const log = useRef<HTMLDivElement>(null);
    const following = useRef(true);
    const [behind, setBehind] = useState(false);
    const running = isRunning(status);
    const late = useLate(running);
    const turns = turnsOf(conversation?.messages ?? []);
    const toFoot = (): void => {
        const box = log.current;
        if (box !== null) {
            box.scrollTop = box.scrollHeight;
        }
        following.current = true;
        setBehind(false);
    };
    // Every streamed word can lengthen the log.
    useLayoutEffect(() => {
        if (following.current) {
            toFoot();
        } else {
            setBehind(true);
        }
    }, [turns.length, status?.streamedText, status?.toolCalls?.length, status?.state, late]);
    const again = ({ text, scope, via }: ReaderMessage): void => {
        if (element !== null) {
            void send(element, store, choice, text, { via, ...(scope === undefined ? {} : { scope: scope.kind }) });
        }
    };
    return (
        <div className="ws-assistant-logwrap">
            <div
                ref={log}
                className="ws-assistant-log cm-focus-inside"
                role="region"
                aria-label={WORDS["assistant.log.name"]}
                // Scrolls by keyboard: a region with focus takes the arrow and Page keys.
                tabIndex={0}
                onScroll={(event) => {
                    const box = event.currentTarget;
                    const atFoot = box.scrollHeight - box.scrollTop - box.clientHeight <= FOOT_SLACK_PX;
                    following.current = atFoot;
                    if (atFoot) {
                        setBehind(false);
                    }
                }}
            >
                {turns.map((turn, index) => {
                    const newest = index === turns.length - 1;
                    return (
                        <TurnView
                            key={turn.reader?.id ?? index}
                            turn={turn}
                            status={newest ? status : null}
                            provider={choice.provider}
                            late={late}
                            onAgain={newest ? again : null}
                        />
                    );
                })}
            </div>
            {behind ? (
                <Button className="ws-assistant-jump" variant="default" size="compact-xs" onClick={toFoot}>
                    {WORDS["assistant.jump"]}
                </Button>
            ) : null}
        </div>
    );
}
