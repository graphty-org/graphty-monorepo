import { ActionRow, PANEL_GRID, PANEL_INK, ProseBlock } from "@graphty/compact-mantine";
import { ActionIcon, Box, Button, Textarea } from "@mantine/core";
import React, { useState } from "react";

import { AiMessageBubble, type ChatMessage } from "../../ai/AiMessageBubble";
import { keyChipFor } from "../bindings";
import { AiGlyph } from "./aiGlyphs";
import { PanelQuietButton } from "./panelButtons";
import { ComingTag, PanelRows, PanelSection } from "./PanelSection";

/** The console input's tooltip, with the binding the one table owns. */
const ASK_LABEL = "Ask the assistant";

/** The send control's name (AiPanel.dc.html). */
const SEND_LABEL = "Send";

/**
 * One line of the composer's text, and the pad above and below it.
 *
 * A panel control is PANEL_GRID.CONTROL_HEIGHT tall, and Mantine spends 1 px of an
 * input's box on the border it swaps to paint focus, so one line is
 *     1 + 3 + 16 + 3 + 1 = 24 = PANEL_GRID.CONTROL_HEIGHT
 * which is the 24 px field AiPanel.dc.html:535 draws beside a 24 px Send. Left to
 * Mantine's own size="sm" metrics the field is 36 px and overhangs that button by
 * 12 px. Stated here rather than taken from the theme on purpose: compact-mantine's
 * `compactInputVarsNoHeight` deliberately omits `--input-height` for multi-line
 * inputs, so no theme fix supplies this number.
 *
 * Every further line adds exactly COMPOSER_LINE_HEIGHT, which is also what
 * react-textarea-autosize measures to size the grown field. Raising the composer's
 * font size above 11 px would clip the text inside this line box.
 */
const COMPOSER_LINE_HEIGHT = 16;

/** The pad above and below the one line, the remainder of the 24 px box. */
const COMPOSER_PAD_BLOCK = (PANEL_GRID.CONTROL_HEIGHT - COMPOSER_LINE_HEIGHT - 2) / 2;

/**
 * The composer's box, written as the custom properties Mantine resolves an input from.
 *
 * They go on the WRAPPER, where Mantine keeps them, and they redefine the SIZE RUNGS
 * rather than the resolved variables. Mantine's own vars
 * resolver writes `--input-height: var(--input-height-sm)` and
 * `--input-padding-y: var(--input-padding-y-sm)` inline on that same element, and
 * `getStyle` applies vars AFTER `styles`, so writing those two names loses; the rungs
 * they point at are declared in a stylesheet rule and an inline value wins. The rung
 * spelling also keeps compact-mantine's size="sm" default honest -- change that default
 * and the field grows, visibly, rather than half-applying.
 *
 * `styles.input` is not an option for the height at all: react-textarea-autosize throws
 * on `style.minHeight`, and Mantine's `min-height: var(--input-height)` is exactly what
 * has to move. Neither is the `vars` PROP -- `useInputProps` destructures it and never
 * forwards it to Input.
 *
 * `--input-size` is deliberately untouched. `[data-multiline]` sets it to `auto`, which
 * is what lets autosize drive the height; pinning it would freeze the field at one line.
 * Autosize measures line-height and padding off the input to size each row, so these
 * three give 24 px at one line and +16 px per line after it.
 */
const COMPOSER_INPUT_VARS = {
    "--input-height-sm": `${PANEL_GRID.CONTROL_HEIGHT}px`,
    "--input-padding-y-sm": `${COMPOSER_PAD_BLOCK}px`,
    "--input-line-height": `${COMPOSER_LINE_HEIGHT}px`,
} as React.CSSProperties;

/**
 * The dictation control's name, in BOTH states.
 *
 * The register holds exactly one title for this verb -- REGISTER-1.5 section 1.4,
 * "stop listening (voice)" -> `Stop listening` -- and no artboard in the set draws
 * another. The register also fixes the convention on the show-on-canvas row: "a toggle
 * never renames itself". So the control keeps one name and the state travels in
 * `aria-pressed` and in the drawn `Listening...` line, rather than in a second name
 * coined here.
 */
const STOP_LISTENING_LABEL = "Stop listening";

/** The verb 6.8's never list keeps in words, in every form. */
const CANCEL_LABEL = "Cancel";

/** The retry verb, offered on a failed message (spec 03 section 2.6 item 4). */
const RETRY_LABEL = "Retry";

/**
 * The one line drawn when no provider is configured -- and only then. It is the
 * setup prompt of spec 03 section 2.6 item 6, and it sits above the console.
 */
const SETUP_PROMPT = "No provider is configured. Open Settings to connect one.";

/** The Provider row's name (AiPanel.dc.html). */
const PROVIDER_LABEL = "Provider";

/**
 * One step the assistant took: a tool call, drawn as the RT-10 run record.
 *
 * Built by the caller and handed in through {@link AiPanelProps.steps}.
 * @public
 */
export interface AiStepRecord {
    /** Stable id. */
    readonly id: string;
    /** What it did, e.g. "Ran Groups". */
    readonly title: string;
    /** The 6.3 technical half, e.g. "(Communities, Louvain)". */
    readonly technical?: string;
    /** Scope and method, e.g. "resolution 1.0, seed 42, 20 of 20 nodes, 12 ms". */
    readonly record: string;
    /** Opens this step's home panel. */
    readonly onOpenHome?: () => void;
    /** Opens the full record behind its Details chevron (floor item 3). */
    readonly onDetails?: () => void;
}

/**
 * One follow-up chip under an answer. Only an action with a backing tool is
 * offered (spec 03 section 2.6 item 5).
 *
 * Built by the caller and handed in through {@link AiPanelProps.followUps}.
 * @public
 */
export interface AiFollowUp {
    /** Stable id. */
    readonly id: string;
    /** The action's own words. */
    readonly label: string;
    /** Runs it. */
    readonly onSelect: () => void;
}

/**
 * Props of the AI panel body.
 */
export interface AiPanelProps {
    /** The transcript, oldest first. */
    readonly messages?: readonly ChatMessage[];
    /** One row per tool call the assistant made. */
    readonly steps?: readonly AiStepRecord[];
    /** The follow-up chips under the latest answer. */
    readonly followUps?: readonly AiFollowUp[];
    /** Whether a provider is configured. The setup prompt draws only when none is. */
    readonly providerConfigured?: boolean;
    /** The provider and model in words, e.g. "claude-sonnet-5". */
    readonly providerLabel?: string;
    /** The provider row's full reading. */
    readonly providerTitle?: string;
    /** Whether a call is in flight, which is what puts Cancel on screen. */
    readonly isProcessing?: boolean;
    /** Whether the browser offers speech recognition. The mic draws only if it does. */
    readonly speechAvailable?: boolean;
    /** Whether dictation is currently listening. */
    readonly listening?: boolean;
    /** Sends the console's text. */
    readonly onSend?: (text: string) => void;
    /** Cancels the in-flight message. */
    readonly onCancel?: () => void;
    /** Retries a failed message. */
    readonly onRetry?: (message: ChatMessage) => void;
    /** Starts or stops dictation. */
    readonly onListeningChange?: (listening: boolean) => void;
    /** Opens Settings, from the setup prompt and the Provider row. */
    readonly onOpenSettings?: () => void;
}

/**
 * The AI panel body: the transcript, the per-step record of what the assistant
 * did, the follow-up chips, the Provider row, the console section, and the chat
 * input.
 *
 * This panel is the transcript's new home. The internals of the app's existing
 * chat dialog are reused rather than rewritten: `AiMessageBubble` and its
 * `ChatMessage` type draw every message here exactly as they did in the dialog.
 * @param props - the AI panel's props.
 * @returns the AI panel body.
 */
export function AiPanel(props: AiPanelProps): React.JSX.Element {
    const {
        messages = [],
        steps = [],
        followUps = [],
        providerConfigured = false,
        providerLabel,
        providerTitle,
        isProcessing = false,
        speechAvailable = false,
        listening = false,
        onSend,
        onCancel,
        onRetry,
        onListeningChange,
        onOpenSettings,
    } = props;

    const [draft, setDraft] = useState("");

    const askChip = keyChipFor("focusAssistant");
    const askTooltip = askChip === null ? ASK_LABEL : `${ASK_LABEL} (${askChip})`;
    const sendChip = keyChipFor("assistantSend");
    const sendTooltip = sendChip === null ? SEND_LABEL : `${SEND_LABEL} (${sendChip})`;

    const send = (): void => {
        const text = draft.trim();

        if (text === "") {
            return;
        }

        onSend?.(text);
        setDraft("");
    };

    const lastFailed = [...messages].reverse().find((message) => message.isError === true);

    return (
        <>
            <Box
                data-testid="ai-transcript"
                style={{
                    flex: "1 1 auto",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: PANEL_GRID.TRAIL_GAP,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                    paddingBlockStart: PANEL_GRID.TRAIL_GAP,
                    overflowY: "auto",
                }}
            >
                {messages.map((message) => (
                    <AiMessageBubble key={message.id} message={message} onRetry={onRetry} />
                ))}
            </Box>

            {steps.length > 0 && (
                <PanelRows>
                    {steps.map((step) => (
                        <ProseBlock key={step.id} variant="runRecord" onDetails={step.onDetails}>
                            <button
                                type="button"
                                data-testid="ai-step-title"
                                onClick={step.onOpenHome}
                                style={{
                                    display: "block",
                                    border: "none",
                                    padding: 0,
                                    background: "transparent",
                                    color: PANEL_INK.VALUE,
                                    textAlign: "start",
                                    cursor: "pointer",
                                }}
                            >
                                {step.technical === undefined ? step.title : `${step.title} ${step.technical}`}
                            </button>
                            <Box component="span" style={{ color: PANEL_INK.CHROME }}>
                                {step.record}
                            </Box>
                        </ProseBlock>
                    ))}
                </PanelRows>
            )}

            {followUps.length > 0 && (
                <PanelRows>
                    <Box
                        data-testid="ai-follow-ups"
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: PANEL_GRID.TRIPLE_GAP,
                            paddingBlock: PANEL_GRID.TRIPLE_GAP,
                        }}
                    >
                        {followUps.map((followUp) => (
                            <Button
                                key={followUp.id}
                                variant="default"
                                h={PANEL_GRID.CONTROL_HEIGHT}
                                px={PANEL_GRID.TRAIL_GAP}
                                radius="xl"
                                onClick={followUp.onSelect}
                            >
                                {followUp.label}
                            </Button>
                        ))}
                    </Box>
                </PanelRows>
            )}

            {(isProcessing || lastFailed !== undefined) && (
                <PanelRows>
                    <ActionRow
                        state={isProcessing ? "Working..." : "That message failed"}
                        busy={isProcessing}
                        residentActions={
                            isProcessing ? (
                                <PanelQuietButton data-testid="ai-cancel" onClick={onCancel}>
                                    {CANCEL_LABEL}
                                </PanelQuietButton>
                            ) : (
                                <PanelQuietButton
                                    data-testid="ai-retry"
                                    onClick={() => {
                                        if (lastFailed !== undefined) {
                                            onRetry?.(lastFailed);
                                        }
                                    }}
                                >
                                    {RETRY_LABEL}
                                </PanelQuietButton>
                            )
                        }
                    />
                </PanelRows>
            )}

            {/* Drawn ONLY when no provider is configured, and above the console. */}
            {!providerConfigured && (
                <PanelRows>
                    <ActionRow
                        state={SETUP_PROMPT}
                        residentActions={
                            <PanelQuietButton data-testid="ai-open-settings" onClick={onOpenSettings}>
                                Settings
                            </PanelQuietButton>
                        }
                    />
                </PanelRows>
            )}

            {providerConfigured && (
                <PanelRows>
                    <Box title={providerTitle}>
                        <ActionRow
                            state={PROVIDER_LABEL}
                            residentActions={
                                <Box
                                    component="span"
                                    data-testid="ai-provider"
                                    style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}
                                >
                                    {providerLabel}
                                </Box>
                            }
                        />
                    </Box>
                </PanelRows>
            )}

            <PanelSection sectionId="ai.console" label="Console" empty actions={<ComingTag />} />

            <PanelRows>
                {/* flex-end, not the artboard's center: once both items are 24 px the two
                    render identically at rest, and flex-end is what keeps the mic and Send on
                    the composer's LAST line as it grows to maxRows. */}
                <Box
                    style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: PANEL_GRID.TRIPLE_GAP,
                        paddingBlock: PANEL_GRID.TRAIL_GAP,
                    }}
                >
                    <Textarea
                        autosize
                        minRows={1}
                        maxRows={4}
                        value={draft}
                        title={askTooltip}
                        aria-label={ASK_LABEL}
                        placeholder={ASK_LABEL}
                        data-testid="ai-input"
                        style={{ flex: "1 1 auto", minWidth: 0 }}
                        // `style` reaches the root, which is what carries the flex; the
                        // 24 px control identity is a wrapper var (COMPOSER_INPUT_VARS),
                        // because compact-mantine's `compactInputVarsNoHeight` omits
                        // `--input-height` for multi-line inputs on purpose and Mantine's
                        // size="sm" 36 px is what fills the gap.
                        styles={{ wrapper: COMPOSER_INPUT_VARS }}
                        onChange={(event) => {
                            setDraft(event.currentTarget.value);
                        }}
                        onKeyDown={(event) => {
                            // The platform key plus Enter sends, which is the gesture the
                            // inspector's note input already established (the table's
                            // `assistantSend` and `noteSave` rows). Bare Enter is claimed by
                            // nothing here, so the platform's own newline runs -- a composer
                            // that grows to four rows has to be typable.
                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                                event.preventDefault();
                                send();
                            }
                        }}
                    />
                    {speechAvailable && (
                        <ActionIcon
                            type="button"
                            variant="subtle"
                            size={PANEL_GRID.CONTROL_HEIGHT}
                            radius="sm"
                            c={PANEL_INK.CHROME}
                            title={STOP_LISTENING_LABEL}
                            aria-label={STOP_LISTENING_LABEL}
                            aria-pressed={listening}
                            data-testid="ai-microphone"
                            onClick={() => {
                                onListeningChange?.(!listening);
                            }}
                        >
                            <AiGlyph name="stopListening" />
                        </ActionIcon>
                    )}
                    <ActionIcon
                        type="button"
                        variant="filled"
                        size={PANEL_GRID.CONTROL_HEIGHT}
                        radius="sm"
                        title={sendTooltip}
                        aria-label={SEND_LABEL}
                        data-testid="ai-send"
                        onClick={send}
                    >
                        <AiGlyph name="send" />
                    </ActionIcon>
                </Box>
            </PanelRows>
        </>
    );
}
