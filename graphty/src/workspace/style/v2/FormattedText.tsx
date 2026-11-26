/**
 * A label's Formatted string (owner, 2026-11-24: "The formatted string editor opens in a popout, allows adding text
 * and values (data, calculated, etc) in a string, and has a live preview"): text with values in it, written as
 * graphty-element's `{ template }` binding, one line per line of the label. Its pop-out holds the preview (what
 * graphty-element draws for the selected node or edge, else the first one with words), the text with each value as
 * `{path}`, and Insert value, the value list (data columns and algorithm results) that puts a value at the caret.
 */

import { Popout } from "@graphty/compact-mantine";
import type { Channel } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { Stack, Textarea } from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../../glyphs";
import { useWorkspace } from "../../state/WorkspaceContext";
import type { RowContext } from "../PropertyRow";
import { propose } from "../row";
import { useStyleVersion } from "../useStyleVersion";
import { ValuePicker } from "../ValuePicker";
import { ValueButton } from "./ValueButton";

/** The pop-out's width: the settings pop-over's own. */
const WIDTH = 264;

/** How many nodes or edges the preview looks through for one with words, when none is selected. */
const SAMPLES = 200;

/** What the preview shows when no node or edge draws words from the text. */
const NO_WORDS = "No words";

/**
 * The words graphty-element draws for the selected node or edge, else for the first one that draws any.
 * @param session - the session.
 * @param side - nodes or edges.
 * @param channel - the text channel.
 * @returns the words, or undefined when none is drawn.
 */
function drawnWords(session: GraphSession, side: RowContext["side"], channel: Channel): string | undefined {
    const wordsOf = (target: { readonly node: string } | { readonly edge: string }): string | undefined => {
        try {
            const value = session.styles.explain(target).merged[channel as keyof object] as unknown;
            return typeof value === "string" && value !== "" ? value : undefined;
        } catch {
            // It left the graph since it was listed.
            return undefined;
        }
    };
    const picked = side === "node" ? session.selection.nodes : session.selection.edges;
    const ids = [...picked, ...(side === "node" ? session.data.nodes() : session.data.edges()).map((each) => each.id)];
    for (const id of ids.slice(0, SAMPLES)) {
        const words = wordsOf(side === "node" ? { node: String(id) } : { edge: String(id) });
        if (words !== undefined) {
            return words;
        }
    }
    return undefined;
}

/**
 * The Formatted string pop-out, beside the panel, anchored to the label's line.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the text channel (`node.label`, `edge.label`, `node.tooltip`)
 * @param props.title - the label's name with its kind ("Node label")
 * @param props.lines - the template's lines
 * @param props.opened - whether it is open
 * @param props.onOpenChange - opens or closes it
 * @param props.onLines - writes the lines (one undo step each)
 * @returns The pop-out
 */
export function FormattedText({
    ctx,
    channel,
    title,
    lines,
    opened,
    onOpenChange,
    onLines,
}: Readonly<{
    ctx: RowContext;
    channel: Channel;
    title: string;
    lines: readonly string[];
    opened: boolean;
    onOpenChange: (open: boolean) => void;
    onLines: (lines: readonly string[]) => void;
}>): React.JSX.Element {
    return (
        <Popout opened={opened} onOpenChange={onOpenChange}>
            <Popout.Trigger>
                {/* The pop-out opens from the source list's "Formatted string", level with this line. */}
                <span aria-hidden data-formatted-anchor="" style={{ position: "absolute", width: 0, height: 0 }} />
            </Popout.Trigger>
            <Popout.Panel
                width={WIDTH}
                placement="left"
                alignment="start"
                header={{ variant: "title", title: `${title} text` }}
                closeLabel={`Close ${title} text`}
            >
                <Popout.Content>
                    {opened ? (
                        <Editor ctx={ctx} channel={channel} title={title} lines={lines} onLines={onLines} />
                    ) : null}
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}

/**
 * The pop-out's lines: Preview, Text and Insert value.
 * @param props - Component props
 * @param props.ctx - the row
 * @param props.channel - the text channel
 * @param props.title - the label's name
 * @param props.lines - the template's lines
 * @param props.onLines - writes the lines
 * @returns The lines
 */
function Editor({
    ctx,
    channel,
    title,
    lines,
    onLines,
}: Readonly<{
    ctx: RowContext;
    channel: Channel;
    title: string;
    lines: readonly string[];
    onLines: (lines: readonly string[]) => void;
}>): React.JSX.Element {
    const { session, element } = useWorkspace();
    // The preview follows every write the element settles.
    useStyleVersion(session, element);
    const written = lines.join("\n");
    // Typed words, until they are written on leaving the field.
    // on reload: fresh: in flight: typed words not yet written
    const [draft, setDraft] = useState<string | null>(null);
    // on reload: fresh: pointer: a picker held open by the pointer
    const [picking, setPicking] = useState(false);
    const caret = useRef<number | null>(null);
    // The words last committed, until the element hands them back: a value inserted right after a commit goes into
    // them, not into the lines written before it.
    const committed = useRef<string | null>(null);
    if (committed.current === written) {
        committed.current = null;
    }
    const text = draft ?? committed.current ?? written;
    const commit = (next: string): void => {
        setDraft(null);
        if (next !== (committed.current ?? written)) {
            committed.current = next;
            onLines(next.split("\n"));
        }
    };
    const preview = session === null ? undefined : drawnWords(session, ctx.side, channel);
    return (
        <Stack gap={8} data-formatted-text="">
            <Textarea
                label="Preview"
                readOnly
                autosize
                minRows={1}
                maxRows={6}
                value={preview ?? NO_WORDS}
                data-formatted-preview=""
            />
            <Textarea
                label="Text"
                autosize
                minRows={2}
                maxRows={8}
                value={text}
                onChange={(event) => {
                    setDraft(event.currentTarget.value);
                }}
                onSelect={(event) => {
                    caret.current = event.currentTarget.selectionStart;
                }}
                onBlur={(event) => {
                    caret.current = event.currentTarget.selectionStart;
                    // Going to Insert value keeps the typed words a draft: the insert writes them with the value, in
                    // one step, and a write under the press would close the value list it opens.
                    const to = event.relatedTarget;
                    if (!(to instanceof Element && to.closest("[data-insert-value]") !== null)) {
                        commit(event.currentTarget.value);
                    }
                }}
            />
            <div data-insert-value="">
                <Popout
                    opened={picking}
                    onOpenChange={(open) => {
                        setPicking(open);
                        // Closed with no value picked: the typed words are written as they are.
                        if (!open) {
                            commit(text);
                        }
                    }}
                >
                    <Popout.Trigger>
                        <ValueButton
                            label={`${title} insert value`}
                            words="Insert value"
                            opens="dialog"
                            expanded={picking}
                            left={<GLYPHS.add size={12} aria-hidden />}
                            right={<GLYPHS.expand size={12} aria-hidden />}
                        />
                    </Popout.Trigger>
                    <Popout.Panel
                        width={260}
                        placement="beside"
                        header={{ variant: "title", title: "Insert value" }}
                        closeLabel="Close Insert value"
                    >
                        <ValuePicker
                            title="Insert value"
                            target={ctx.side}
                            channel={channel}
                            onPick={(choice) => {
                                setPicking(false);
                                if (session === null) {
                                    return;
                                }
                                const proposal = propose(session, choice, channel);
                                if (!proposal.ok || !("by" in proposal.binding)) {
                                    return;
                                }
                                const at = Math.min(caret.current ?? text.length, text.length);
                                commit(`${text.slice(0, at)}{${proposal.binding.by}}${text.slice(at)}`);
                            }}
                            onClose={() => {
                                setPicking(false);
                                commit(text);
                            }}
                        />
                    </Popout.Panel>
                </Popout>
            </div>
        </Stack>
    );
}
