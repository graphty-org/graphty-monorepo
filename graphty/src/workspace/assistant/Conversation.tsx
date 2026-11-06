import type { AiConversationMessage, AiConversationSnapshot, AiStatus } from "@graphty/graphty-element/ai";
import type { AiEffect, AiResultCode, AiResultParams } from "@graphty/graphty-element/catalog";
import { Button, Collapse, Group, Stack, Text } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { AssistantChoice } from "../assistant-door/provider";
import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { ChangeRows, ResultRow } from "./Checks";
import { scopeKind, send } from "./connection";
import { isRunning } from "./useAssistantView";
import {
    durationWords,
    type EndWords,
    endWords,
    isChange,
    isResult,
    stepName,
    stepsWords,
    WORDS,
    workingLine,
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

/** How a turn ended. */
interface Ending {
    readonly code: AiResultCode;
    readonly params: AiResultParams;
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
            turns.at(-1)?.replies.push(message);
        }
    }
    return turns;
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
                        <li
                            key={index} // NOSONAR(S6479): a step has no id to key by
                        >
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
                                      <ResultRow
                                          key={at} // NOSONAR(S6479): an effect has no id to key by
                                          effect={effect}
                                      />
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
    /** Whether a failure is news: it ended while the log was open, so a reopened log never repeats it. */
    readonly alert: boolean;
}

/**
 * How a turn ended, in words from its code, with its buttons under it, so the words get the
 * panel's width. A new failure is the alert. The buttons stay out of the alert, so the one going
 * away on the next send changes nothing it says, and a space keeps its two lines two sentences when
 * read as one.
 * @param props - Component props
 * @param props.words - the words
 * @param props.unchanged - whether nothing changed
 * @param props.onAgain - sends the message again, on the newest turn
 * @param props.alert - whether a failure is news
 * @returns The row
 */
function EndRow({ words, unchanged, onAgain, alert }: Readonly<EndRowProps>): React.JSX.Element {
    const { run } = useWorkspace();
    return (
        <Stack gap={4} align="flex-start">
            {/* Keyed, so a failure becoming news mounts with its role and is said. */}
            <div key={String(alert)} role={words.failed && alert ? "alert" : undefined}>
                <Text size="sm">{words.line}</Text>{" "}
                {words.failed && words.action !== null && unchanged ? (
                    <Text size="sm">{WORDS["assistant.nothing-changed"]}</Text>
                ) : null}
            </div>
            <Group gap={4} wrap="nowrap">
                {(words.action === "again" || words.action === "again-or-provider") && onAgain !== null ? (
                    <Button variant="default" size="compact-xs" onClick={onAgain}>
                        {WORDS["assistant.again"]}
                    </Button>
                ) : null}
                {words.action === "provider" || words.action === "again-or-provider" ? (
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
        </Stack>
    );
}

/**
 * A turn's steps: the running calls while it runs, then what its replies recorded.
 * @param turn - the turn.
 * @param status - the status, on the newest turn.
 * @returns the steps.
 */
function stepsOf(turn: Turn, status: AiStatus | null): readonly Step[] {
    if (isRunning(status)) {
        return (status?.toolCalls ?? []).map((call) => ({ name: stepName(call.name, call.arguments) }));
    }
    return turn.replies.flatMap((reply) =>
        reply.calls.map((call, index) => ({
            name: stepName(call.command, call.arguments),
            ...(call.durationMs === undefined ? {} : { ms: call.durationMs }),
            ...(index === reply.calls.length - 1 ? { results: (reply.effects ?? []).filter(isResult) } : {}),
        })),
    );
}

/**
 * How a turn ended: its saved outcome, the call a request ended on, else on the newest turn how the
 * last run ended.
 * @param turn - the turn.
 * @param status - the status, on the newest turn.
 * @param lastEnded - how the last run ended.
 * @returns the code and its facts, if it has ended that way.
 */
function endingOf(turn: Turn, status: AiStatus | null, lastEnded: Ending | null): Ending | undefined {
    // A request that ended unanswered, or declined, says so on the calls it held.
    const unanswered = turn.replies
        .flatMap((reply) => reply.calls)
        .findLast((call) => call.code === "AI_APPROVAL_STALE" || call.code === "AI_APPROVAL_DENIED");
    const saved = turn.replies.findLast((reply) => reply.outcome !== undefined)?.outcome ?? unanswered;
    return saved ?? (status === null ? undefined : (lastEnded ?? undefined));
}

/** Props for TurnView. */
interface TurnViewProps {
    readonly turn: Turn;
    /** The status, on the newest turn only. */
    readonly status: AiStatus | null;
    readonly provider: string;
    readonly late: boolean;
    readonly onAgain: ((reader: ReaderMessage) => void) | null;
    /** The reader opened or closed steps: the log stays where it is. */
    readonly onHold: () => void;
}

/**
 * What a turn's reply says: what was saved, with what streams while it runs (a continued message
 * streams only what it adds, and a hold saved mid-run holds the start of what streams), and what
 * streamed for a run that ended before its words were saved. Words said while a request waited
 * on the reader go once the reader has answered it.
 * @param turn - the turn.
 * @param status - the status, on the newest turn.
 * @returns the text.
 */
function proseOf(turn: Turn, status: AiStatus | null): string {
    // Words about a wait the reader has since ended no longer stand: the decision's reply says what happened.
    const said = turn.replies
        .filter((reply) => reply.saidWhileHeld !== true)
        .map((reply) => reply.text)
        .filter((text) => text !== "")
        .join("\n");
    const streamed = status?.streamedText ?? "";
    if (!isRunning(status)) {
        return said === "" ? streamed : said;
    }
    return streamed.startsWith(said) ? streamed : [said, streamed].filter((text) => text !== "").join("\n");
}

/**
 * What the reader said.
 * @param props - Component props
 * @param props.reader - the message
 * @returns The rows
 */
function ReaderRows({ reader }: Readonly<{ reader: ReaderMessage }>): React.JSX.Element {
    return (
        <>
            <h3 className="ws-assistant-who">
                {reader.via === "voice" ? WORDS["assistant.turn.you-spoken"] : WORDS["assistant.turn.you"]}
            </h3>
            <Text size="sm" className="ws-assistant-prose">
                {reader.text}
            </Text>
        </>
    );
}

/**
 * What a turn did: its changes, and unless one of them changed the graph (a selection does not) what
 * it found: its last result that found something, else its last empty one.
 * @param props - Component props
 * @param props.turn - the turn
 * @param props.effects - what its calls did
 * @param props.onMore - called as the reader opens the rest of the change lines
 * @returns The rows
 */
function TurnEffects({
    turn,
    effects,
    onMore,
}: Readonly<{ turn: Turn; effects: readonly AiEffect[]; onMore: () => void }>): React.JSX.Element {
    const changes = effects.filter(isChange);
    const result = effects.findLast((effect) => effect.code === "AI_EFFECT_FOUND") ?? effects.findLast(isResult);
    const changedGraph = changes.some((effect) => effect.code !== "AI_EFFECT_SELECTION");
    return (
        <>
            {changes.length > 0 ? (
                <ChangeRows changes={changes} provenance={turn.provenance} undone={turn.undone} onMore={onMore} />
            ) : null}
            {result === undefined || changedGraph ? null : <ResultRow effect={result} table />}
        </>
    );
}

/**
 * The Assistant's half of a turn: its steps, its prose, what it did and how it ended. Prose is text,
 * never HTML.
 * @param props - Component props
 * @param props.turn - the turn
 * @param props.status - the status, on the newest turn
 * @param props.provider - the provider's id
 * @param props.late - whether the working line shows
 * @param props.onAgain - sends a message again, on the newest turn
 * @param props.onHold - keeps the log where it is for the reader's own toggle
 * @returns The rows, or nothing with nothing to show
 */
function ReplyRows({
    turn,
    status,
    provider,
    late,
    onAgain,
    onHold,
}: Readonly<TurnViewProps>): React.JSX.Element | null {
    const lastEnded = useWorkspaceState((state) => state.assistantEnded);
    const news = useWorkspaceState((state) => state.assistantEnded?.news === true);
    const [stepsOpen, setStepsOpen] = useState(false);
    const running = isRunning(status);
    const prose = proseOf(turn, status);
    const steps = stepsOf(turn, status);
    const effects = running ? [] : turn.replies.flatMap((reply) => reply.effects ?? []);
    const ended = endingOf(turn, status, lastEnded);
    const words = running || ended === undefined ? null : endWords(ended.code, ended.params, provider, false);
    const { reader } = turn;
    if (!running && prose === "" && steps.length === 0 && words === null) {
        return null;
    }
    return (
        <>
            <h3 className="ws-assistant-who">{WORDS["assistant.turn.assistant"]}</h3>
            <Steps
                steps={steps}
                open={stepsOpen}
                onToggle={() => {
                    onHold();
                    setStepsOpen(!stepsOpen);
                }}
            />
            {prose === "" ? null : (
                <Text size="sm" className="ws-assistant-prose">
                    {prose}
                </Text>
            )}
            {running && late && status !== null ? <Text size="sm">{workingLine(status, provider)}</Text> : null}
            <TurnEffects turn={turn} effects={effects} onMore={onHold} />
            {words === null ? null : (
                <EndRow
                    words={words}
                    alert={status !== null && news}
                    unchanged={!effects.some(isChange)}
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
    );
}

/**
 * One turn: You, then Assistant.
 * @param props - Component props
 * @param props.turn - the turn
 * @param props.status - the status, on the newest turn
 * @param props.provider - the provider's id
 * @param props.late - whether the working line shows
 * @param props.onAgain - sends a message again, on the newest turn
 * @param props.onHold - keeps the log where it is for the reader's own toggle
 * @returns The turn
 */
function TurnView(props: Readonly<TurnViewProps>): React.JSX.Element {
    const { reader } = props.turn;
    return (
        <div className="ws-assistant-turn">
            {reader === null ? null : <ReaderRows reader={reader} />}
            <ReplyRows {...props} />
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
    const { element, session, store } = useWorkspace();
    const log = useRef<HTMLElement>(null);
    const rows = useRef<HTMLDivElement>(null);
    const following = useRef(true);
    const lastTop = useRef(0);
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
    // How the last run ended draws the newest turn's ending row, with no status change.
    const ended = useWorkspaceState((state) => state.assistantEnded);
    // Every streamed word can lengthen the log.
    useLayoutEffect(() => {
        if (following.current) {
            toFoot();
        } else {
            setBehind(true);
        }
    }, [turns.length, status?.streamedText, status?.toolCalls?.length, status?.state, late, ended]);
    // Rows that draw later (a chip row waits for its count) lengthen the log with no status change,
    // and the composer growing shortens it.
    useEffect(() => {
        const box = log.current;
        if (rows.current === null || box === null) {
            return undefined;
        }
        const observer = new ResizeObserver(() => {
            // A reader who opened steps follows again once nothing overflows.
            following.current ||= box.scrollHeight <= box.clientHeight;
            if (following.current) {
                toFoot();
            }
        });
        observer.observe(rows.current);
        observer.observe(box);
        return () => {
            observer.disconnect();
        };
    }, []);
    const again = ({ text, via }: ReaderMessage): void => {
        if (element !== null) {
            const scope = scopeKind(session, store.get().assistantScopeDropped);
            void send(element, store, choice, text, { via, scope });
        }
    };
    return (
        <div className="ws-assistant-logwrap">
            <section
                ref={log}
                className="ws-assistant-log cm-focus-inside"
                aria-label={WORDS["assistant.log.name"]}
                // Scrolls by keyboard: a region with focus takes the arrow and Page keys.
                tabIndex={0} // NOSONAR(S6845): a scrolling region needs a focus stop for the keyboard
                onScroll={(event) => {
                    const box = event.currentTarget;
                    const atFoot = box.scrollHeight - box.scrollTop - box.clientHeight <= FOOT_SLACK_PX;
                    // Only the reader scrolling up stops following: rows that grew between a scroll to
                    // the foot and its event leave the foot below without the reader moving.
                    if (atFoot) {
                        following.current = true;
                        setBehind(false);
                    } else if (box.scrollTop < lastTop.current) {
                        following.current = false;
                    }
                    lastTop.current = box.scrollTop;
                }}
            >
                <div ref={rows}>
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
                                onHold={() => {
                                    following.current = false;
                                }}
                            />
                        );
                    })}
                </div>
            </section>
            {behind ? (
                <Button className="ws-assistant-jump" variant="default" size="compact-xs" onClick={toFoot}>
                    {WORDS["assistant.jump"]}
                </Button>
            ) : null}
        </div>
    );
}
