import { ActionIcon, Box } from "@mantine/core";
import React, { useId } from "react";

import { PANEL_GRID } from "../constants/panel";
import { useLabels } from "../i18n";
import { UiGlyph } from "../icons";
import type { DisclosureProps } from "../types/events";
import { Popout } from "./popout/Popout";
import {
    PopoutProvider,
    useOptionalPopoutContext,
    useOptionalPopoutManagerContext,
    usePopoutContext,
} from "./popout/PopoutContext";
import { PopoutManager } from "./popout/PopoutManager";

// The bubble is a Popout panel rather than a Mantine Popover so that the
// package has one floating layer with one set of dismissal rules. Before this,
// an info bubble and a pop-out panel on the same screen closed on different
// gestures, which is most of what made the library feel like two libraries.
//
// Figma has no info circle (it explains with tooltips); this one is drawn from
// Figma's parts (design/figma-spec.md 8.4): the trigger is the 24px ghost icon
// button with a 12px glyph, the bubble the light popover shell, 240 wide, with
// 11/16 secondary body text. It is a hover bubble, so it stays out of the
// one-popover-at-a-time rule: showing an explanation never closes the panel
// the person is working in.

/**
 * The width of the info bubble: Figma's default light popover. A surface this
 * narrow carries no header of its own: the explanation is the whole panel.
 */
const BUBBLE_WIDTH = PANEL_GRID.POPOVER_WIDTH;

/**
 * The gap between the circle and its bubble, small enough that the two read as
 * one object.
 */
const BUBBLE_GAP = 4;

/**
 * Props for the InfoCircle component.
 */
export interface InfoCircleProps extends DisclosureProps {
    /** The explanation. Becomes the accessible description of the info button. */
    children: React.ReactNode;
    /** Names what is being explained, for the accessible name of the button. */
    label: string;
}

/**
 * Props for the internal trigger, which needs the pop-out's own state.
 */
interface InfoCircleTriggerProps {
    /** The button's accessible name, such as "About resolution". */
    name: string;
    /** The id of the bubble, wired as the button's description while it is open. */
    bubbleId: string;
}

/**
 * The circled "i" itself, inside the pop-out so that it can read its state.
 * @param props - Component props
 * @param props.name - The button's accessible name
 * @param props.bubbleId - The id of the bubble, used as the button's description while open
 * @returns The info button
 */
function InfoCircleTrigger({ name, bubbleId }: InfoCircleTriggerProps): React.JSX.Element {
    const { isOpen, open, close } = usePopoutContext();

    return (
        // Hovering has already opened the bubble by the time a click arrives,
        // so the trigger only ever opens rather than toggling.
        <Popout.Trigger action="open">
            <ActionIcon
                variant="subtle"
                size="sm"
                aria-label={name}
                aria-describedby={isOpen ? bubbleId : undefined}
                data-testid="info-circle"
                onMouseEnter={open}
                onMouseLeave={close}
                onFocus={open}
                onBlur={close}
            >
                <UiGlyph name="info" size={PANEL_GRID.GLYPH} />
            </ActionIcon>
        </Popout.Trigger>
    );
}

// Accessibility: the APG "Disclosure" pattern. The button carries
// aria-expanded and, while the bubble is open, aria-describedby pointing at it,
// so the explanation is announced as the description of the button rather than
// as a stray region. The button is reachable by Tab and opens on focus, so the
// explanation is available without a pointer.

/**
 * A circled "i" that reveals an explanation on hover, on focus or on tap.
 *
 * Use it where an explanation would otherwise become a sentence of its own on a
 * dense panel: put it immediately after the name of the thing it explains. Give
 * `label` that name -- the button is announced as "About " and the name, and
 * the explanation becomes the button's accessible description, so a screen
 * reader reads the two together.
 *
 * The bubble closes when the pointer leaves, when focus moves away, on Escape,
 * on a second tap, and when something else on the page is clicked. It shares
 * the page's floating layer with every other pop-out (Escape closes the
 * innermost open thing), but as a hover bubble it neither closes an open panel
 * nor is closed by one opening; when there is no `PopoutManager` above it, it
 * supplies its own and works standalone.
 *
 * Leave `opened` out and the bubble keeps its own state. Supply it, with
 * `onOpenChange`, to drive it from yours.
 * @param props - Component props
 * @param props.children - The explanation, which becomes the button's accessible description
 * @param props.label - Names what is being explained, for the accessible name of the button
 * @param props.opened - Whether the bubble is open, when driven from your own state
 * @param props.defaultOpened - Whether the bubble starts open, when it keeps its own state
 * @param props.onOpenChange - Called when the bubble opens or closes, with the new state first
 * @returns The info circle and its bubble
 * @example
 * ```tsx
 * <Group gap={4}>
 *     <Text>Resolution</Text>
 *     <InfoCircle label="Resolution">
 *         Higher resolution finds more, smaller communities.
 *     </InfoCircle>
 * </Group>
 * ```
 */
export function InfoCircle({
    children,
    label,
    opened,
    defaultOpened,
    onOpenChange,
}: InfoCircleProps): React.JSX.Element {
    const labels = useLabels();
    const bubbleId = useId();
    const hasManager = useOptionalPopoutManagerContext() !== null;
    const parentId = useOptionalPopoutContext()?.id ?? null;
    const name = labels.about(label);

    const infoCircle = (
        <PopoutProvider
            parentId={parentId}
            opened={opened}
            defaultOpened={defaultOpened}
            onOpenChange={onOpenChange}
            exclusive={false}
        >
            <InfoCircleTrigger name={name} bubbleId={bubbleId} />
            <Popout.Panel
                width={BUBBLE_WIDTH}
                label={name}
                placement="bottom"
                alignment="start"
                gap={BUBBLE_GAP}
                anchorX="trigger"
                anchorY="trigger"
                // A bubble that opens on hover must not take focus away from
                // whatever the person is doing.
                manageFocus={false}
            >
                <Box id={bubbleId} w={BUBBLE_WIDTH} className="cm-info-bubble">
                    {children}
                </Box>
            </Popout.Panel>
        </PopoutProvider>
    );

    // Standalone use has to keep working: an info circle dropped into a page
    // with no floating layer of its own brings one with it.
    return hasManager ? infoCircle : <PopoutManager>{infoCircle}</PopoutManager>;
}
