import { Box, Text, UnstyledButton } from "@mantine/core";
import React, { useId } from "react";

import { PANEL_GRID, PANEL_INK } from "../../constants/panel";
import { useLabels } from "../../i18n";
import { UiGlyph } from "../../icons";
import type { ActivationHandler } from "../../types/events";
import { useDevWarning } from "../../utils/dev-warning";
import { liveRegionProps,type LiveSetting } from "../../utils/live-region";
import { isRtl, useDirection } from "../../utils/rtl";

// Contract section 4: the reading is rebased onto Mantine's Text, which puts
// its typography, its colour handling and its truncation back under the theme
// instead of on a raw Box. The two dense variants use `Text span` for the same
// reason; only the flex wrappers stay Boxes, because they are layout and have
// no text of their own.

/**
 * The reading's type size, in pixels: the panel's body size.
 *
 * Deliberately not `PANEL_GRID.CHEVRON`, which is also 12: that number is the
 * drawn size of a glyph and this one is a font size, and the two are free to
 * diverge. The compact theme's font-size scale has no 12px step -- `sm` is 11
 * and `md` is 13 -- so the reading names its own and sets it on the Text
 * directly.
 */
const READING_FONT_SIZE = 12;

/**
 * The reading's line height. Prose is set looser than a control's label
 * because it is read as a sentence rather than scanned as a value.
 */
const READING_LINE_HEIGHT = 1.5;

/**
 * The line height of the departure line and the run record: one notch tighter
 * than the reading, because both are a single line about a result rather than
 * prose.
 */
const DENSE_LINE_HEIGHT = 1.4;

/** The gap between a glyph and the words beside it. */
const INLINE_GAP = 4;

/**
 * The run record's row height, in pixels.
 *
 * Shorter than `PANEL_GRID.CONTROL_HEIGHT`, because the line holds no control:
 * a dimmed sentence and a 12px chevron, and nothing else to hit.
 */
const RUN_RECORD_HEIGHT = 20;

/**
 * The most characters a reading may spend before it stops being a reading.
 *
 * Counted in Unicode code points rather than in the UTF-16 code units
 * `String.length` returns, so an emoji or a character outside the Basic
 * Multilingual Plane counts once instead of twice.
 */
const READING_MAX_CHARACTERS = 220;

/** The most sentences a reading may spend. */
const READING_MAX_SENTENCES = 2;

// The cap is a rough guide rather than a measurement of reading effort: 220
// characters is a longer passage in a script that packs a word into two or
// three characters than it is in German. The sentence cap below is the rule
// that carries across scripts; this one catches a single run-on sentence.

/**
 * Any character Unicode marks as ending a sentence.
 *
 * The property covers the full stop, the exclamation mark and the question
 * mark, and equally the ideographic full stop, the Arabic question mark, the
 * Devanagari danda and the rest, so the count is not restricted to text written
 * in a Latin script.
 */
const SENTENCE_TERMINATOR = /\p{Sentence_Terminal}/u;

/**
 * The three sentence terminators that are also used for something else.
 *
 * A full stop is a decimal point and an abbreviation mark, so these three only
 * end a sentence when whitespace or the end of the text follows. Every other
 * terminator in Unicode is unambiguous, and most scripts that use one write the
 * next sentence straight after it with no space.
 */
const AMBIGUOUS_TERMINATOR = /[.!?]/u;

/** Whitespace, which is what separates one sentence from the next. */
const WHITESPACE = /\s/u;

/**
 * Count the sentences in a passage of text, in any script.
 *
 * A run of terminators such as `"?!"` or an ellipsis of full stops counts as
 * one ending; the decimals a result is full of -- "granularity 2.5", "1.0" --
 * do not read as endings; and a last sentence that was never given a full stop
 * still counts. It is a guide for a development-time warning, not a parser: it
 * does not try to tell "U.S." from the end of a sentence.
 * @param text - The text to count
 * @returns How many sentences the text holds
 */
function countSentences(text: string): number {
    const characters = Array.from(text);
    let sentences = 0;
    let index = 0;
    // Where the text after the last ending begins. Anything but whitespace
    // left here at the end is a sentence the author never terminated, and it
    // counts: "20 nodes. 43 edges. Everyone is connected" is three sentences.
    let afterLastEnding = 0;

    while (index < characters.length) {
        if (!SENTENCE_TERMINATOR.test(characters[index])) {
            index += 1;
            continue;
        }

        let last = index;
        while (last + 1 < characters.length && SENTENCE_TERMINATOR.test(characters[last + 1])) {
            last += 1;
        }

        // The last terminator of the run is the one that decides, because it is
        // the one the following character sits against: the "?" of "!?" ends a
        // sentence whatever comes next, while the "." of "2.5" does not.
        const following = characters[last + 1];
        const needsSpace = AMBIGUOUS_TERMINATOR.test(characters[last]);
        index = last + 1;

        if (!needsSpace || following === undefined || WHITESPACE.test(following)) {
            sentences += 1;
            afterLastEnding = index;
        }
    }

    const unterminated = characters.slice(afterLastEnding).some((character) => !WHITESPACE.test(character));

    return unterminated ? sentences + 1 : sentences;
}

// Code points, not grapheme clusters: Intl.Segmenter would count a flag or a
// family emoji as the one mark a reader sees, but its types arrive with the
// ES2022 library and this repository compiles against ES2020. The difference
// only matters to a handful of emoji in a length warning, so the cheaper count
// stands until the library setting moves.

/**
 * Count the characters in a passage of text as a reader perceives them, rather
 * than as JavaScript stores them.
 * @param text - The text to count
 * @returns How many Unicode code points the text holds
 */
function countCharacters(text: string): number {
    return Array.from(text).length;
}

// The copy is as much a part of this component as the markup: a reading that
// has grown into three sentences has quietly turned into the explanation the
// component exists to keep off a dense panel. Each check below builds a message
// and hands it to useDevWarning, which is what every component in this package
// reports through -- so all of them log once, from an effect, in production
// builds never.

/**
 * Props for the ProseBlock component.
 */
export interface ProseBlockProps {
    /**
     * Which of the three shapes this passage takes.
     *
     * `"reading"` is the plain-language sentence about a result, `"departure"`
     * is the warning line saying how the result falls short of being exact and
     * complete, and `"runRecord"` is the single shortened line naming what was
     * run.
     */
    variant: "reading" | "departure" | "runRecord";
    /** The sentence, the warning line, or the record's one line. */
    children: React.ReactNode;
    /**
     * Called when the chevron at the end of a run record is activated, by a
     * pointer or from the keyboard.
     *
     * Applies to the `"runRecord"` variant only. The chevron is drawn only when
     * this is given, because a chevron that reveals nothing is a defect. The
     * event is passed through so you can read modifier keys or call
     * `preventDefault`.
     *
     * Give it whenever the line can outgrow the panel. The whole line stays in
     * the document when it is visually shortened, so a screen reader reads all
     * of it, and the chevron is what makes the rest reachable for everyone
     * else.
     */
    onDetails?: ActivationHandler;
    /**
     * Whether what this shows is still being worked out by something that
     * finishes later, such as a background computation.
     *
     * Supplying it at all -- `busy={isRunning}`, true or false -- is how you
     * say the text arrives late, and that is what makes the passage a live
     * region a screen reader announces. Pass it for the whole life of the
     * component rather than only while the run is in flight: a live region has
     * to be in the document before the change it announces, so one that gains
     * the prop at the same moment it gains its text announces nothing.
     *
     * While it is true the passage is marked busy, which holds the announcement
     * back until the run finishes. Leave it out for text that is written once,
     * which needs no announcement and gets none.
     */
    busy?: boolean;
    /**
     * How urgently a screen reader announces this when it changes on its own.
     *
     * Defaults to `"polite"` when `busy` is given and `"off"` when it is not,
     * which is the right answer nearly always. Raise it to `"assertive"`, which
     * interrupts whatever is being read, only for a failure; lower it to
     * `"off"` to mark a passage busy without announcing it.
     *
     * Either way the element has to be on the page before the text changes for
     * a browser to notice the change, so render the block first and fill it in
     * after rather than adding the whole block at once.
     */
    live?: LiveSetting;
}

/**
 * States that a reading has grown past the length that keeps it a reading.
 * @param variant - Which shape the passage takes, since only a reading is measured
 * @param children - The passage's own children, which are only measurable when they are a plain string
 * @returns The message to report, or undefined when the reading is short enough
 */
function readingLengthWarning(variant: ProseBlockProps["variant"], children: React.ReactNode): string | undefined {
    if (variant !== "reading" || typeof children !== "string") {
        return undefined;
    }

    const characters = countCharacters(children);
    if (characters > READING_MAX_CHARACTERS) {
        return (
            `ProseBlock was given a reading of ${String(characters)} characters, and a reading is at most ` +
            `${String(READING_MAX_CHARACTERS)} characters. Shorten it, or it has stopped being a reading and ` +
            "become an explanation."
        );
    }

    const sentences = countSentences(children);
    if (sentences > READING_MAX_SENTENCES) {
        return (
            `ProseBlock was given a reading of ${String(sentences)} sentences, and a reading is at most ` +
            `${String(READING_MAX_SENTENCES)} sentences. Delete any sentence that repeats what is already on ` +
            "screen, and move the rest into an InfoCircle."
        );
    }

    return undefined;
}

/**
 * States that a chevron was asked for on a shape that carries none.
 * @param variant - Which shape the passage takes
 * @param onDetails - The handler the caller gave, if any
 * @returns The message to report, or undefined when the handler belongs where it was put
 */
function detailsVariantWarning(
    variant: ProseBlockProps["variant"],
    onDetails: ProseBlockProps["onDetails"],
): string | undefined {
    if (onDetails === undefined || variant === "runRecord") {
        return undefined;
    }

    return (
        `ProseBlock was given onDetails on the "${variant}" shape, and it belongs to "runRecord". A reading and ` +
        "a departure line carry no chevron, so the handler is ignored."
    );
}

// Accessibility, by variant:
//
// - reading: no widget and no role. It is a paragraph, and Mantine's Text
//   renders it as one, so it is already reachable by a screen reader's own
//   text navigation. Naming it would be worse than leaving it alone -- WAI-ARIA
//   "Providing Accessible Names and Descriptions" is explicit that a name must
//   not replace content that says the same thing.
// - departure: the WAI-ARIA `note` document-structure role, named from the
//   `departure` label, so the severity the yellow triangle draws is also
//   stated. Without it the line is text in a colour, which fails WCAG 1.4.1.
//   The triangle itself is then decorative and hidden, so the name is not read
//   twice.
// - runRecord: the APG "Button" pattern for the chevron. It is icon-only, so it
//   takes its name from the `details` label, and `aria-describedby` points at
//   the line it belongs to, which is how the full untruncated text reaches
//   someone who moves through the page by Tab.
//
// WCAG 2.2 2.5.8 (target size): the chevron's 16px slot is under the 24px
// minimum and rests on the spacing exception. It is the only target on its own
// line, and a 20px line separated by a panel gap of 8 keeps 28px between its
// centre and the next target's, past the 24px the exception asks for. Two run
// records stacked flush against each other would break that, which is why the
// row keeps its own height rather than collapsing to the text.

/**
 * A short passage of text on a dense property panel.
 *
 * A property panel is built from rows of controls, and a sentence is expensive
 * on one. This is the one component that spends the space, in three fixed
 * shapes:
 *
 * - `reading` -- what a result says, in plain language. One or two sentences,
 *   always on screen and never collapsed. Rendered as a paragraph, so pass it
 *   inline content rather than block elements.
 * - `departure` -- a warning triangle and one line saying how the result falls
 *   short of being exact and complete: that it was approximated, or run over
 *   part of the data rather than all of it. Render it only when that is true.
 *   An exact result draws nothing here, and that is what makes the line
 *   noticeable when it does appear.
 * - `runRecord` -- one line naming what was run and the settings that were not
 *   left at their defaults. It is shortened with an ellipsis when it does not
 *   fit, with an optional chevron that opens the rest.
 *
 * Do not use it for an explanation of what a control does, for an empty-state
 * message, or for a caption under a chart. An explanation that repeats
 * something already on the screen should be deleted rather than moved; one that
 * adds something belongs in `InfoCircle`, a hover or a tap away.
 *
 * In development builds the component warns when a reading grows past two
 * sentences or 220 characters, in any script. Nothing is logged in a production
 * build.
 *
 * Every string it produces -- the name of the warning line and the name of the
 * chevron -- comes from `LabelsProvider`, so both can be translated or reworded.
 * The chevron follows the text direction, pointing left under
 * Mantine's `DirectionProvider` set to `"rtl"`.
 * @param props - Component props
 * @param props.variant - Which of the three shapes this passage takes
 * @param props.children - The sentence, the warning line, or the record's one line
 * @param props.onDetails - Called when the chevron at the end of a run record is activated; the chevron is drawn only when it is given
 * @param props.busy - Whether the text is still being worked out by something that finishes later
 * @param props.live - How urgently a screen reader announces the text when it changes on its own
 * @returns The prose block
 * @example
 * ```tsx
 * <Stack gap="md">
 *     <ProseBlock variant="reading" live="polite">
 *         41 of the 190 shortest paths run through Mr Whiskers, more than through any other node.
 *     </ProseBlock>
 *     <ProseBlock variant="departure">
 *         Approximate, from a sample of 8. Largest connected part only, 18 of 20 nodes.
 *     </ProseBlock>
 *     <ProseBlock variant="runRecord" onDetails={openRunDetails}>
 *         Betweenness, weighted by Bridges, sample 8
 *     </ProseBlock>
 * </Stack>
 * ```
 */
export function ProseBlock({ variant, children, onDetails, busy, live }: ProseBlockProps): React.JSX.Element {
    const labels = useLabels();
    const direction = useDirection();
    const lineId = useId();

    useDevWarning(readingLengthWarning(variant, children));
    useDevWarning(detailsVariantWarning(variant, onDetails));

    // A live region has to say what to re-read as well as when: the aria-atomic
    // that comes with these attributes makes a screen reader read the whole
    // passage again rather than only the words that changed, which is the only
    // reading of a rewritten sentence that makes sense.
    const announcement = liveRegionProps(live, busy);

    if (variant === "reading") {
        return (
            <Text
                {...announcement}
                data-testid="prose-block"
                data-variant={variant}
                style={{
                    fontSize: READING_FONT_SIZE,
                    lineHeight: READING_LINE_HEIGHT,
                    color: PANEL_INK.PROSE,
                }}
            >
                {children}
            </Text>
        );
    }

    if (variant === "departure") {
        return (
            <Box
                {...announcement}
                role="note"
                aria-label={labels.departure}
                data-testid="prose-block"
                data-variant={variant}
                style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: INLINE_GAP,
                }}
            >
                {/* The triangle is decorative: the note around it already
                    carries the name, and a second copy on the glyph would be
                    read out twice. */}
                <Box
                    aria-hidden
                    data-testid="prose-block-warning"
                    style={{
                        flex: "0 0 auto",
                        inlineSize: PANEL_GRID.GLYPH_SLOT,
                        blockSize: PANEL_GRID.GLYPH_SLOT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: PANEL_INK.WARNING,
                    }}
                >
                    <UiGlyph name="warning" size={PANEL_GRID.GLYPH} />
                </Box>
                <Text
                    span
                    size="sm"
                    data-testid="prose-block-text"
                    style={{
                        lineHeight: DENSE_LINE_HEIGHT,
                        color: PANEL_INK.VALUE,
                    }}
                >
                    {children}
                </Text>
            </Box>
        );
    }

    // The line is shortened with CSS, so the whole of it stays in the document
    // and a screen reader still reads it in full. The title serves a pointer,
    // and aria-describedby on the chevron serves a keyboard.
    const fullLine = typeof children === "string" ? children : undefined;

    return (
        <Box
            {...announcement}
            data-testid="prose-block"
            data-variant={variant}
            style={{
                display: "flex",
                alignItems: "center",
                gap: INLINE_GAP,
                blockSize: RUN_RECORD_HEIGHT,
            }}
        >
            <Text
                span
                size="sm"
                truncate="end"
                id={lineId}
                title={fullLine}
                data-testid="prose-block-text"
                style={{
                    flex: "1 1 auto",
                    minInlineSize: 0,
                    lineHeight: DENSE_LINE_HEIGHT,
                    color: PANEL_INK.CHROME,
                }}
            >
                {children}
            </Text>
            {/* Not the 24px trailing-slot button a control row ends with: a run
                record is not a control row, and its line is 20px. This is the
                smaller chevron drawn inline at the end of the text. */}
            {onDetails !== undefined && (
                <UnstyledButton
                    type="button"
                    title={labels.details}
                    aria-label={labels.details}
                    aria-describedby={lineId}
                    data-testid="prose-block-details"
                    onClick={onDetails}
                    style={{
                        flex: "0 0 auto",
                        inlineSize: PANEL_GRID.GLYPH_SLOT,
                        blockSize: PANEL_GRID.GLYPH_SLOT,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxSizing: "border-box",
                        background: "transparent",
                        color: PANEL_INK.CHROME,
                        cursor: "pointer",
                    }}
                >
                    <UiGlyph
                        name={isRtl(direction) ? "chevronLeft" : "chevronRight"}
                        size={PANEL_GRID.CHEVRON}
                    />
                </UnstyledButton>
            )}
        </Box>
    );
}
