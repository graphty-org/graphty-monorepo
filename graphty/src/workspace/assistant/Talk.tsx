import { TooltipShortcut } from "@graphty/compact-mantine";
import type {
    AiPointing,
    AiVoiceEndEvent,
    AiVoiceSupport,
    AiVoiceSupportChangeEvent,
    AiVoiceTranscriptEvent,
} from "@graphty/graphty-element/ai";
import { ActionIcon, Tooltip } from "@mantine/core";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { ariaKey, formatKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { audioWords, voiceWords, WORDS } from "./words";

/** A press longer than this stops on release; a shorter one latches, and ends when the reader stops talking (design 4.12). */
const HOLD_MS = 300;
const TALK_KEY = "Shift+Mod+Space";
/** Marks that the reader was told where the audio goes. */
const AUDIO_TOLD = "app.graphty.assistant.audio-told";

/**
 * Says once which way the audio goes.
 * @param words - the line.
 * @returns the line the first time, else null.
 */
function firstUse(words: string | null): string | null {
    try {
        if (words === null || localStorage.getItem(AUDIO_TOLD) !== null) {
            return null;
        }
        localStorage.setItem(AUDIO_TOLD, "1");
    } catch {
        // Storage blocked: it says so again next time.
    }
    return words;
}

/** Props for Talk. */
interface TalkProps {
    /** The provider's name. */
    readonly provider: string;
    /** Whether the element's assistant is up. */
    readonly linked: boolean;
    /** Shows a line under the composer; null clears it. */
    readonly onLine: (line: string | null) => void;
    /** A press ended with words waiting to be sent: the composer's text and what was pointed at. */
    readonly onHeard?: (text: string, pointing: AiPointing) => void;
}

/**
 * Talk: shown only where the element allows input. A press and release latches, a hold over 300 ms
 * stops on release, and Enter, Space or Shift+Mod+Space act as a press. What it hears lands in the
 * composer, with what the reader pointed at, and `onHeard` hears it when the press ends.
 * @param props - Component props
 * @param props.provider - the provider's name
 * @param props.linked - whether the assistant is up
 * @param props.onLine - shows a line under the composer
 * @param props.onHeard - hears what a press heard, when it ends
 * @returns The button, or nothing where speech cannot be heard
 */
export function Talk({ provider, linked, onLine, onHeard }: Readonly<TalkProps>): React.JSX.Element | null {
    const { element, store } = useWorkspace();
    const asked = useWorkspaceState((state) => state.assistantTalkPress);
    const [support, setSupport] = useState<AiVoiceSupport | null>(null);
    /** The element's word on whether talk is on, read again after every press and voice event. */
    const [listening, setListening] = useState(false);
    /** The press heard something, so its end need not say it heard nothing. */
    const heardAny = useRef(false);
    const pressedAt = useRef<number | null>(null);
    /** The key is down: its repeats are no new press. */
    const keyDown = useRef(false);
    /** The draft a transcript adds to. */
    const before = useRef("");
    // Held in a ref, so a new callback each render never ends the listening below.
    const heardText = useRef(onHeard);
    heardText.current = onHeard;

    useEffect(() => {
        if (element === null || !linked) {
            return undefined;
        }
        let current = true;
        void element.getAiVoiceSupport().then((read) => {
            if (current) {
                setSupport(read);
            }
        });
        const changed = ({ detail }: CustomEvent<AiVoiceSupportChangeEvent>): void => {
            setSupport(detail.support);
        };
        const start = (): void => {
            setListening(element.isAiTalking());
            store.set({ announcement: WORDS["assistant.status.listening"] });
        };
        const end = ({ detail }: CustomEvent<AiVoiceEndEvent>): void => {
            // An earlier press still being transcribed may end while a later one listens.
            setListening(element.isAiTalking());
            const nothing =
                detail.code === "AI_COMPLETED" && !heardAny.current ? WORDS["assistant.talk.nothing"] : null;
            const line = detail.reason === "error" ? voiceWords(detail.params?.reason) : nothing;
            onLine(line);
            // The line is drawn, not live: the status line speaks it.
            if (line !== null) {
                store.set({ announcement: line });
            }
        };
        const heard = ({ detail }: CustomEvent<AiVoiceTranscriptEvent>): void => {
            if (detail.transcript !== "") {
                heardAny.current = true;
            }
            const text = [before.current, detail.transcript].filter((part) => part !== "").join(" ");
            store.set({ assistantDraft: text });
            if (detail.isFinal) {
                store.set((state) => ({
                    assistantSpoken: detail.pointing === undefined ? {} : { pointing: detail.pointing },
                    composerCalls: state.composerCalls + 1,
                    announcement: WORDS["assistant.status.transcript"],
                }));
            }
            // Only a transcript held for the app carries the pointing; the element sent any other itself.
            if (detail.isFinal && detail.pointing !== undefined) {
                heardText.current?.(text, detail.pointing);
            }
        };
        const listeners = [
            ["ai-voice-support-change", changed],
            ["ai-voice-start", start],
            ["ai-voice-end", end],
            ["ai-voice-transcript", heard],
        ] as const;
        for (const [type, listener] of listeners) {
            element.addEventListener(type, listener as EventListener);
        }
        return () => {
            current = false;
            for (const [type, listener] of listeners) {
                element.removeEventListener(type, listener as EventListener);
            }
            if (element.isAiTalking()) {
                element.aiTalk(false);
            }
        };
    }, [element, linked, store, onLine]);

    const press = useCallback((): void => {
        if (element === null) {
            return;
        }
        // The element says whether talk is on: a press it ended itself, or one still loading, is
        // never mistaken for the other.
        if (element.isAiTalking()) {
            pressedAt.current = null;
            element.aiTalk(false);
            setListening(element.isAiTalking());
            return;
        }
        pressedAt.current = performance.now();
        before.current = store.get().assistantDraft;
        heardAny.current = false;
        onLine(firstUse(audioWords(support?.input.destination ?? "none", provider)));
        element.aiTalk(true);
        setListening(element.isAiTalking());
    }, [element, store, support, provider, onLine]);

    const release = useCallback((): void => {
        const held = pressedAt.current === null ? 0 : performance.now() - pressedAt.current;
        pressedAt.current = null;
        if (!element?.isAiTalking()) {
            return;
        }
        if (held > HOLD_MS) {
            element.aiTalk(false);
            setListening(element.isAiTalking());
        } else {
            // Latched: nobody is holding it, so it ends when the reader stops talking.
            element.aiTalk(true, { endOnSilence: true });
        }
    }, [element]);

    const available = support !== null && support.input.status !== "unavailable";
    useEffect(() => {
        if (!asked || support === null) {
            return undefined;
        }
        store.set({ assistantTalkPress: false });
        if (!available || keyDown.current) {
            return undefined;
        }
        keyDown.current = true;
        press();
        // Any key: a Mac sends no Space keyup while Cmd is down.
        globalThis.addEventListener(
            "keyup",
            () => {
                keyDown.current = false;
                release();
            },
            { once: true },
        );
        return undefined;
    }, [asked, support, available, store, press, release]);

    if (support === null) {
        // Its place is held, unseen, until the element says whether speech is heard, so the row never jumps.
        return (
            <ActionIcon variant="subtle" tabIndex={-1} aria-hidden style={{ visibility: "hidden" }}>
                <GLYPHS.talk size={16} aria-hidden />
            </ActionIcon>
        );
    }
    if (!available) {
        return null;
    }
    return (
        <Tooltip
            label={
                <TooltipShortcut
                    label={listening ? WORDS["assistant.talk.stop"] : WORDS["assistant.talk"]}
                    shortcut={formatKey(TALK_KEY)}
                />
            }
        >
            <ActionIcon
                variant="subtle"
                color="gray"
                className={listening ? "ws-assistant-listening" : undefined}
                aria-label={listening ? WORDS["assistant.talk.stop"] : WORDS["assistant.talk"]}
                aria-pressed={listening}
                aria-keyshortcuts={ariaKey(TALK_KEY)}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    press();
                }}
                onPointerUp={release}
                onPointerCancel={release}
                onClick={(event) => {
                    // A click with no pointer behind it: Enter, Space, or a screen reader's press.
                    if (event.detail === 0) {
                        press();
                        release();
                    }
                }}
            >
                {listening ? (
                    <GLYPHS.stop size={14} fill="currentColor" aria-hidden />
                ) : (
                    <GLYPHS.talk size={16} aria-hidden />
                )}
            </ActionIcon>
        </Tooltip>
    );
}
