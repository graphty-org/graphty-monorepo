import type { AiConversationMessage, AiConversationSnapshot, AiStatus } from "@graphty/graphty-element/ai";
import type { AiEffect, AiResultCode, AiResultParams } from "@graphty/graphty-element/catalog";
import type { GraphSession, GraphtyErrorCode } from "@graphty/graphty-element/session";
import { ActionIcon, Button, Collapse, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { AssistantChoice } from "../assistant-door/provider";
import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { ChangeRows, ResultRow } from "./Checks";
import { scopeKind, send } from "./connection";
import { isRunning } from "./useAssistantView";
import {
    type AskedRow,
    askedRows,
    type EndWords,
    endWords,
    isChange,
    isLookup,
    isResult,
    resultRows,
    runningWords,
    stepLine,
    stepName,
    stepsWords,
    WORDS,
    workingLine,
} from "./words";

/** A scrolled-up reader this close to the foot still counts as following. */
const FOOT_SLACK_PX = 8;
/** How long a run goes before its working dots show (design 4.5). */
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
    readonly code: AiResultCode | GraphtyErrorCode;
    readonly params: AiResultParams;
}

/** One step, as a row shows it: its line, and what it asked for and came to when opened. */
interface Step {
    readonly line: string;
    readonly asked: readonly AskedRow[];
    readonly result: readonly string[];
    /** Whether it only looked something up: drawn lighter, and not counted. */
    readonly lookup: boolean;
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

/**
 * One step: its line as a disclosure button, and when open what it asked for and what came of it.
 * A step still running has nothing to open.
 * @param props - Component props
 * @param props.step - the step
 * @returns The row
 */
function StepRow({ step }: Readonly<{ step: Step }>): React.JSX.Element {
    const [open, setOpen] = useState(false);
    const opens = step.asked.length > 0 || step.result.length > 0;
    const line = (
        <Text span size="xs" c={step.lookup ? "dimmed" : undefined}>
            {step.line}
        </Text>
    );
    return (
        <li className="ws-assistant-step-item" data-lookup={step.lookup ? "" : undefined}>
            {opens ? (
                <UnstyledButton
                    className="ws-assistant-step cm-focus-inside"
                    aria-expanded={open}
                    onClick={() => {
                        setOpen(!open);
                    }}
                >
                    <GLYPHS.expand size={12} aria-hidden className="ws-assistant-chevron" />
                    {line}
                </UnstyledButton>
            ) : (
                <div className="ws-assistant-step">{line}</div>
            )}
            <Collapse in={open}>
                {open ? (
                    <dl className="ws-assistant-step-detail">
                        {step.asked.length === 0 ? null : (
                            <>
                                <Text component="dt" size="xs" c="dimmed">
                                    {WORDS["assistant.step.asked"]}
                                </Text>
                                {step.asked.map((row) => (
                                    <Text component="dd" size="xs" key={row.label}>
                                        {row.label}: {row.value}
                                    </Text>
                                ))}
                            </>
                        )}
                        {step.result.length === 0 ? null : (
                            <>
                                <Text component="dt" size="xs" c="dimmed">
                                    {WORDS["assistant.step.result"]}
                                </Text>
                                {step.result.map((sentence) => (
                                    <Text component="dd" size="xs" key={sentence}>
                                        {sentence}
                                    </Text>
                                ))}
                            </>
                        )}
                    </dl>
                ) : null}
            </Collapse>
        </li>
    );
}

/** Props for StepGroup. */
interface StepGroupProps {
    readonly steps: readonly Step[];
    readonly open: boolean;
    readonly onToggle: () => void;
}

/**
 * A reply's steps as one group: a header saying what happened, with a chevron, that opens the
 * steps, one row each. They grow as a run adds them.
 * @param props - Component props
 * @param props.steps - the steps
 * @param props.open - whether they show
 * @param props.onToggle - opens or closes them
 * @returns The group, or nothing with no steps
 */
function StepGroup({ steps, open, onToggle }: Readonly<StepGroupProps>): React.JSX.Element | null {
    if (steps.length === 0) {
        return null;
    }
    const lookups = steps.filter((step) => step.lookup).length;
    return (
        <div className="ws-assistant-steps-group">
            <UnstyledButton className="ws-assistant-step cm-focus-inside" aria-expanded={open} onClick={onToggle}>
                <GLYPHS.expand size={12} aria-hidden className="ws-assistant-chevron" />
                <Text span size="xs" c="dimmed">
                    {stepsWords(steps.length - lookups, lookups)}
                </Text>
            </UnstyledButton>
            <Collapse in={open}>
                {open ? (
                    <ul className="ws-assistant-steps">
                        {steps.map((step, index) => (
                            // A step has no id of its own, and a turn's steps only ever grow at the end.
                            <StepRow
                                key={index} // NOSONAR(S6479): a step has no id to key by
                                step={step}
                            />
                        ))}
                    </ul>
                ) : null}
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
 * The words of how a turn ended: the stop glyph, the failure line, or the plain line. Keyed, so a
 * failure becoming news mounts with its role and is said.
 * @param words - the words
 * @param alert - whether a failure is news
 * @param said - the line and any "Nothing changed."
 * @returns The line
 */
function endLine(words: EndRowProps["words"], alert: boolean, said: React.JSX.Element): React.JSX.Element {
    if (words.stopped !== undefined) {
        return (
            <Group key={String(alert)} gap={4} wrap="nowrap">
                <GLYPHS.stop
                    size={10}
                    role="img"
                    aria-label={WORDS["assistant.stopped"]}
                    className="ws-assistant-stopped"
                />
                {words.stopped === "" ? null : <Text size="sm">{words.stopped}</Text>}
            </Group>
        );
    }
    if (words.failed) {
        return (
            <Group
                key={String(alert)}
                role={alert ? "alert" : "note"}
                gap={6}
                wrap="nowrap"
                align="flex-start"
                className="ws-assistant-failed"
                data-billing={words.billing === undefined ? undefined : ""}
            >
                <GLYPHS.warning size={14} aria-hidden className="ws-assistant-failed-mark" />
                <div>{said}</div>
            </Group>
        );
    }
    return <div key={String(alert)}>{said}</div>;
}

/**
 * How a turn ended, in words from its code, with its buttons under it, so the words get the
 * panel's width. A new failure is the alert. The buttons stay out of the alert, so the one going
 * away on the next send changes nothing it says, and a space keeps its two lines two sentences when
 * read as one. A failure is the warning glyph and its words in the error color, with no box, and a
 * provider out of credit is the same in the warning color, with Add credit opening its billing
 * page. A stopped run shows the stop glyph in place of "Stopped.".
 * @param props - Component props
 * @param props.words - the words
 * @param props.unchanged - whether nothing changed
 * @param props.onAgain - sends the message again, on the newest turn
 * @param props.alert - whether a failure is news
 * @returns The row
 */
function EndRow({ words, unchanged, onAgain, alert }: Readonly<EndRowProps>): React.JSX.Element {
    const { run } = useWorkspace();
    const said = (
        <>
            <Text size="sm">{words.line}</Text>{" "}
            {words.failed && words.action !== null && unchanged ? (
                <Text size="sm">{WORDS["assistant.nothing-changed"]}</Text>
            ) : null}
        </>
    );
    const row = endLine(words, alert, said);
    const buttons = (
        <Group gap={4} wrap="wrap" justify="flex-end">
            {words.billing === undefined ? null : (
                <Button
                    component="a"
                    href={words.billing}
                    target="_blank"
                    rel="noreferrer"
                    variant="default"
                    size="compact-xs"
                >
                    {WORDS["assistant.add-credit"]}
                </Button>
            )}
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
            {(words.action === "again" || words.action === "again-or-provider") && onAgain !== null ? (
                <Tooltip label={WORDS["assistant.again"]}>
                    <ActionIcon variant="subtle" color="gray" aria-label={WORDS["assistant.again"]} onClick={onAgain}>
                        <GLYPHS.again size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            ) : null}
        </Group>
    );
    // A stopped run's glyph is short: Send again sits on its row.
    return words.stopped === undefined ? (
        <Stack gap={4} align="stretch">
            {row}
            {buttons}
        </Stack>
    ) : (
        <Group gap={4} justify="space-between" wrap="nowrap">
            {row}
            {buttons}
        </Group>
    );
}

/**
 * A turn's steps: the running calls while it runs, said by the model's own words for each, then
 * what its replies recorded.
 * @param session - the session, to name columns and formats.
 * @param turn - the turn.
 * @param status - the status, on the newest turn.
 * @returns the steps.
 */
function stepsOf(session: GraphSession | null, turn: Turn, status: AiStatus | null): readonly Step[] {
    if (isRunning(status)) {
        return (status?.toolCalls ?? []).map((call) => {
            const intent = call.arguments?.intent;
            const running = {
                tool: call.name,
                arguments: call.arguments,
                ...(typeof intent === "string" ? { intent } : {}),
            };
            return { line: stepLine(session, running), asked: [], result: [], lookup: false };
        });
    }
    return turn.replies.flatMap((reply) =>
        reply.calls.map((record): Step => {
            const call = { ...record, tool: record.command };
            return {
                line: stepLine(session, call),
                asked: askedRows(session, call),
                result: resultRows(session, call),
                lookup: isLookup(call),
            };
        }),
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
 * What the reader said, on a gray fill. Its heading is for screen readers only, and a spoken message
 * starts with the microphone glyph.
 * @param props - Component props
 * @param props.reader - the message
 * @returns The rows
 */
function ReaderRows({ reader }: Readonly<{ reader: ReaderMessage }>): React.JSX.Element {
    const spoken = reader.via === "voice";
    return (
        <>
            <h3 className="ws-assistant-who">
                {spoken ? WORDS["assistant.turn.you-spoken"] : WORDS["assistant.turn.you"]}
            </h3>
            <Text size="sm" className="ws-assistant-prose ws-assistant-mine">
                {spoken ? <GLYPHS.talk size={12} aria-hidden className="ws-assistant-spoken" /> : null}
                {reader.text}
            </Text>
        </>
    );
}

/**
 * Whether a change changed what the reader sees: a selection does not, nor a run that painted
 * nothing (its column answers a question; the nodes the answer names still deserve chips).
 * @param effect - the change.
 * @returns true when the graph looks or holds different.
 */
const changesGraph = (effect: AiEffect): boolean =>
    effect.code !== "AI_EFFECT_SELECTION" &&
    !(effect.code === "AI_EFFECT_RUN" && Number(effect.params.painted ?? 0) === 0);

/** Props for TurnEffects. */
interface TurnEffectsProps {
    readonly turn: Turn;
    readonly effects: readonly AiEffect[];
    readonly onMore: () => void;
}

/**
 * What a turn did: its changes, and unless one of them changed the graph (a selection or an
 * unpainted run does not) what it found: its last result that found something, else its last empty
 * one.
 * @param props - Component props
 * @param props.turn - the turn
 * @param props.effects - what its calls did
 * @param props.onMore - called as the reader opens the rest of the change lines
 * @returns The rows
 */
function TurnEffects({ turn, effects, onMore }: Readonly<TurnEffectsProps>): React.JSX.Element {
    const changes = effects.filter(isChange);
    const found = effects.findLast((effect) => effect.code === "AI_EFFECT_FOUND") ?? effects.findLast(isResult);
    const result = changes.some(changesGraph) ? undefined : found;
    const resultShown = result !== undefined && (result.code === "AI_EFFECT_EMPTY" || result.target !== undefined);
    const changesShown = changes.length > 0;
    return (
        <>
            {changesShown ? (
                <ChangeRows
                    changes={changes}
                    provenance={turn.provenance}
                    undone={turn.undone}
                    onMore={onMore}
                    actions={null}
                />
            ) : null}
            {resultShown ? <ResultRow effect={result} table actions={null} /> : null}
        </>
    );
}

/**
 * The Assistant's half of a turn: its prose, the working dots while it runs, what it did, its steps
 * and how it ended. Prose is text, never HTML.
 * @param props - Component props
 * @param props.turn - the turn
 * @param props.status - the status, on the newest turn
 * @param props.provider - the provider's id
 * @param props.late - whether the working dots show
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
    const { session } = useWorkspace();
    const lastEnded = useWorkspaceState((state) => state.assistantEnded);
    const news = useWorkspaceState((state) => state.assistantEnded?.news === true);
    // Open while it runs, so steps show as they happen; then closed, unless the reader chose.
    const [chosen, setChosen] = useState<boolean | null>(null);
    const running = isRunning(status);
    const prose = proseOf(turn, status);
    const steps = stepsOf(session, turn, status);
    const effects = running ? [] : turn.replies.flatMap((reply) => reply.effects ?? []);
    const ended = endingOf(turn, status, lastEnded);
    const words = running || ended === undefined ? null : endWords(ended.code, ended.params, provider, false);
    const { reader } = turn;
    if (!running && prose === "" && steps.length === 0 && words === null) {
        return null;
    }
    const stepsOpen = chosen ?? running;
    return (
        <>
            <h3 className="ws-assistant-who">{WORDS["assistant.turn.assistant"]}</h3>
            <StepGroup
                steps={steps}
                open={stepsOpen}
                onToggle={() => {
                    onHold();
                    setChosen(!stepsOpen);
                }}
            />
            {prose === "" ? null : (
                <Text size="sm" className="ws-assistant-prose">
                    {prose}
                </Text>
            )}
            {running ? null : <TurnEffects turn={turn} effects={effects} onMore={onHold} />}
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
            {running && status !== null && (late || steps.length > 0) ? (
                // Last of all while it runs: nothing comes after the dots.
                <div className="ws-assistant-working">
                    {/* The dots are named with what they stand for; each step is also announced. */}
                    <span // NOSONAR(S6819): three CSS dots named as one picture; there is no image file for an img
                        role="img"
                        aria-label={workingLine(status, provider)}
                        className="ws-assistant-dots"
                    >
                        <span />
                        <span />
                        <span />
                    </span>
                </div>
            ) : null}
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
    // Each step is announced as it starts: the dots on screen do not say which one runs.
    const toolCalls = running ? (status?.toolCalls ?? []) : [];
    const at = toolCalls.findLastIndex((call) => call.status === "executing");
    const executing = toolCalls[at] as (typeof toolCalls)[number] | undefined;
    const stepSaid = executing === undefined ? null : runningWords(stepName(executing.name, executing.arguments));
    useEffect(() => {
        if (stepSaid !== null) {
            store.set({ announcement: stepSaid });
        }
    }, [at, stepSaid, store]);
    const again = ({ text, via }: ReaderMessage): void => {
        if (element !== null) {
            const scope = scopeKind(session, store.get().assistantScopeSelection);
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
                <Tooltip label={WORDS["assistant.jump"]}>
                    <ActionIcon
                        className="ws-assistant-jump"
                        variant="default"
                        aria-label={WORDS["assistant.jump"]}
                        onClick={toFoot}
                    >
                        <GLYPHS.newest size={14} aria-hidden />
                    </ActionIcon>
                </Tooltip>
            ) : null}
        </div>
    );
}
