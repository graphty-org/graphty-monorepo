import { TooltipShortcut } from "@graphty/compact-mantine";
import type {
    AiVoiceEndEvent,
    AiVoiceSupport,
    AiVoiceSupportChangeEvent,
    AiVoiceTranscriptEvent,
} from "@graphty/graphty-element/ai";
import { Button, Tooltip } from "@mantine/core";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { formatKey } from "../keys/keys";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { audioWords, voiceWords, WORDS } from "./words";

/** A press longer than this stops on release; a shorter one latches (design 4.12). */
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
}

/**
 * Talk: shown only where the element allows input. A press and release latches, a hold over 300 ms
 * stops on release, and Enter, Space or Shift+Mod+Space act as a press. What it hears lands in the
 * composer and waits for Enter, with what the reader pointed at.
 * @param props - Component props
 * @param props.provider - the provider's name
 * @param props.linked - whether the assistant is up
 * @param props.onLine - shows a line under the composer
 * @returns The button, or nothing where speech cannot be heard
 */
export function Talk({ provider, linked, onLine }: Readonly<TalkProps>): React.JSX.Element | null {
    const { element, store } = useWorkspace();
    const asked = useWorkspaceState((state) => state.assistantTalkPress);
    const [support, setSupport] = useState<AiVoiceSupport | null>(null);
    const [listening, setListening] = useState(false);
    const on = useRef(false);
    const pressedAt = useRef<number | null>(null);
    /** The key is down: its repeats are no new press. */
    const keyDown = useRef(false);
    /** The draft a transcript adds to. */
    const before = useRef("");

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
            setListening(true);
            store.set({ announcement: WORDS["assistant.status.listening"] });
        };
        const end = ({ detail }: CustomEvent<AiVoiceEndEvent>): void => {
            on.current = false;
            setListening(false);
            onLine(detail.reason === "error" ? voiceWords(detail.params?.reason) : null);
        };
        const heard = ({ detail }: CustomEvent<AiVoiceTranscriptEvent>): void => {
            const text = [before.current, detail.transcript].filter((part) => part !== "").join(" ");
            store.set({ assistantDraft: text });
            if (detail.isFinal) {
                store.set((state) => ({
                    assistantSpoken: detail.pointing === undefined ? {} : { pointing: detail.pointing },
                    composerCalls: state.composerCalls + 1,
                    announcement: WORDS["assistant.status.transcript"],
                }));
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
            if (on.current) {
                element.aiTalk(false);
            }
        };
    }, [element, linked, store, onLine]);

    const press = useCallback((): void => {
        if (element === null) {
            return;
        }
        if (on.current) {
            on.current = false;
            pressedAt.current = null;
            element.aiTalk(false);
            return;
        }
        on.current = true;
        pressedAt.current = performance.now();
        before.current = store.get().assistantDraft;
        onLine(firstUse(audioWords(support?.input.destination ?? "none", provider)));
        element.aiTalk(true);
    }, [element, store, support, provider, onLine]);

    const release = useCallback((): void => {
        const held = pressedAt.current === null ? 0 : performance.now() - pressedAt.current;
        pressedAt.current = null;
        if (on.current && held > HOLD_MS) {
            on.current = false;
            element?.aiTalk(false);
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

    if (!available) {
        return null;
    }
    return (
        <Tooltip
            label={
                listening ? (
                    WORDS["assistant.talk.stop"]
                ) : (
                    <TooltipShortcut label={WORDS["assistant.talk"]} shortcut={formatKey(TALK_KEY)} />
                )
            }
        >
            <Button
                variant="default"
                size="compact-xs"
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
                    }
                }}
            >
                {listening ? WORDS["assistant.talk.stop"] : WORDS["assistant.talk"]}
            </Button>
        </Tooltip>
    );
}
