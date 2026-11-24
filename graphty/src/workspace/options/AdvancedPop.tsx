/**
 * A pop-over's rare settings (design/ui/style-panel-v2/design.md, "Input rules"): a "..." button in the pop-over's
 * header opens them in a pop-over of their own beside it, which leaves the first open and never covers it. Nothing
 * replaces a pop-over's content in place (owner, 2026-11-24: "do not use in-place pop-overs").
 *
 * compact-mantine's pop-out header draws its buttons from an icon, a name and a click (compact-mantine is locked to
 * Figma), so a pop-over that can hold an Advanced pop-over offers its header through `useHeaderAction`.
 */

import { Popout } from "@graphty/compact-mantine";
import { Tooltip } from "@mantine/core";
import React, { useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { headerBottom } from "../style/useFocusLine";
import { type HeaderAction, HeaderContext } from "./useHeaderAction";

/** The Advanced button's name and tooltip, the same in every pop-over. */
const ADVANCED_NAME = "Advanced settings";

/** The Advanced pop-over's width: its rarer settings have longer names ("Letter outline opacity"). */
const ADVANCED_WIDTH = 312;

/** The gap between the pop-over and its Advanced pop-over, and the least room either side must leave. */
const ADVANCED_GAP = 8;

/** Where the Advanced pop-over opens beside its pop-over, and how tall its content may be there (none: any). */
interface AdvancedPlace {
    readonly side: "left" | "right" | "bottom" | "top";
    readonly room?: number;
}

/** What the Advanced pop-over's header and padding take of its height, and its margin off the window's edge. */
const ADVANCED_CHROME = 64;

/**
 * Where the Advanced pop-over opens, so it never covers its pop-over: on the start (left) side when it fits there,
 * else the end (right), else below or above, where there is more room (an iPad held upright), its content then
 * scrolling within that room (above, below the app's header).
 * @param parent - the pop-over's panel
 * @returns the side, and the room for its content above or below
 */
function advancedPlace(parent: Element | null): AdvancedPlace {
    const box = parent?.getBoundingClientRect();
    if (box === undefined || box.left >= ADVANCED_WIDTH + ADVANCED_GAP) {
        return { side: "left" };
    }
    if (window.innerWidth - box.right >= ADVANCED_WIDTH + ADVANCED_GAP) {
        return { side: "right" };
    }
    const below = window.innerHeight - box.bottom;
    return below >= box.top
        ? { side: "bottom", room: below - ADVANCED_GAP - ADVANCED_CHROME }
        : { side: "top", room: box.top - headerBottom() - ADVANCED_GAP - ADVANCED_CHROME };
}

/**
 * The Advanced "..." glyph in its pop-over's header. The header's buttons are compact-mantine's, drawn from an icon,
 * a name and a click (compact-mantine is locked to Figma), so the glyph gives its button the tooltip, the open state
 * and the changed ink the row's settings "..." has.
 * @param props - Component props
 * @param props.open - whether the Advanced pop-over is open
 * @param props.changed - whether a setting in it is set
 * @param props.controls - the id of the Advanced pop-over's content
 * @returns The glyph
 */
function AdvancedGlyph({
    open,
    changed,
    controls,
}: Readonly<{ open: boolean; changed: boolean; controls: string }>): React.JSX.Element {
    const [button, setButton] = useState<HTMLElement | null>(null);
    const [tip, setTip] = useState(false);
    useEffect(() => {
        button?.setAttribute("aria-haspopup", "dialog");
        button?.setAttribute("aria-expanded", String(open));
        button?.setAttribute("aria-controls", controls);
    }, [button, open, controls]);
    useEffect(() => {
        // A Tooltip given a target only places itself there: it is shown on the button's hover here.
        const show = (): void => {
            setTip(true);
        };
        const hide = (): void => {
            setTip(false);
        };
        button?.addEventListener("pointerenter", show);
        button?.addEventListener("pointerleave", hide);
        button?.addEventListener("click", hide);
        return () => {
            button?.removeEventListener("pointerenter", show);
            button?.removeEventListener("pointerleave", hide);
            button?.removeEventListener("click", hide);
        };
    }, [button]);
    return (
        <>
            <span
                ref={(node) => {
                    setButton(node?.closest("button") ?? null);
                }}
                style={{
                    display: "contents",
                    color: changed && !open ? "var(--cm-icon-brand)" : undefined,
                }}
            >
                <GLYPHS.more size={14} aria-hidden />
            </span>
            {/* Mantine's Tooltip needs its target or a child: drawn once the button is known. */}
            {button === null ? null : <Tooltip label={ADVANCED_NAME} target={button} opened={tip} />}
        </>
    );
}

/**
 * A pop-over's rare settings (design "Input rules"): a "..." button in the header of the pop-over it is written in,
 * opening a pop-over of its own beside it, which leaves the first open. Clicking "..." again or its close button
 * closes only it; closing the
 * pop-over it opened from closes both.
 * @param props - Component props
 * @param props.title - its title in the header
 * @param props.changed - whether a setting in it is set
 * @param props.children - the rare settings
 * @returns The pop-over
 */
export function AdvancedPop({
    title,
    changed,
    children,
}: Readonly<{ title: string; changed: boolean; children: React.ReactNode }>): React.JSX.Element {
    const setAction = useContext(HeaderContext);
    const [open, setOpen] = useState(false);
    const [place, setPlace] = useState<AdvancedPlace>({ side: "left" });
    const controls = `advanced-${useId().replaceAll(":", "")}`;
    const button = useRef<Element | null>(null);
    const action = useMemo<HeaderAction>(
        () => ({
            id: "advanced",
            label: ADVANCED_NAME,
            icon: <AdvancedGlyph open={open} changed={changed} controls={controls} />,
            onClick: (event) => {
                button.current = event.currentTarget;
                if (!open) {
                    setPlace(advancedPlace(event.currentTarget.closest("[data-popout-id]")));
                }
                setOpen(!open);
            },
        }),
        [open, changed, controls],
    );
    // Before paint: the pop-over never draws a frame without its "...".
    useLayoutEffect(() => {
        setAction?.(action);
        return () => {
            setAction?.(undefined);
        };
    }, [setAction, action]);
    if (setAction === null && import.meta.env.DEV) {
        throw new Error(`${title} has no pop-over to put its "..." in: write it inside a settings pop-over.`);
    }
    return (
        <Popout
            opened={open}
            onOpenChange={(next) => {
                // It has no Popout.Trigger: focus goes back to its "..." as a trigger's would.
                if (!next && document.getElementById(controls)?.contains(document.activeElement) === true) {
                    (button.current as HTMLElement | null)?.focus();
                }
                setOpen(next);
            }}
        >
            <Popout.Panel
                width={ADVANCED_WIDTH}
                placement={place.side}
                alignment="start"
                anchorX="parent"
                anchorY="parent"
                gap={ADVANCED_GAP}
                header={{ variant: "title", title }}
                closeLabel={`Close ${title}`}
            >
                <Popout.Content>
                    <div
                        id={controls}
                        data-advanced-pop=""
                        style={place.room === undefined ? undefined : { maxHeight: place.room, overflowY: "auto" }}
                    >
                        {children}
                    </div>
                </Popout.Content>
            </Popout.Panel>
        </Popout>
    );
}
