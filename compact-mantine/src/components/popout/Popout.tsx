import type { JSX } from "react";

import type { PopoutProps } from "../../types/popout";
import { PopoutAnchor } from "./PopoutAnchor";
import { PopoutContent } from "./PopoutContent";
import { PopoutProvider, useOptionalPopoutContext } from "./PopoutContext";
import { PopoutPanel } from "./PopoutPanel";
import { PopoutTrigger } from "./PopoutTrigger";

/**
 * A floating panel that opens from a trigger and can be dragged, nested and
 * dismissed without leaving the page.
 *
 * Compose it from its parts: a `Popout.Trigger` wrapping the control that opens
 * it, and a `Popout.Panel` holding the content. A pop-out written inside
 * another pop-out's panel is treated as opened from it, which is what makes
 * Escape close the innermost one first and closing the outer one take the inner
 * one with it.
 *
 * Leave `opened` out and the pop-out keeps its own state. Supply it, with
 * `onOpenChange`, to drive it from yours.
 *
 * Every pop-out must be inside a `PopoutManager`, which owns the stacking
 * order, the dismissal rules and the portal they render into.
 * @example
 * ```tsx
 * <PopoutManager>
 *     <Popout>
 *         <Popout.Trigger>
 *             <Button>Open</Button>
 *         </Popout.Trigger>
 *         <Popout.Panel width={280} header={{variant: "title", title: "Settings"}}>
 *             <Popout.Content>Panel content here</Popout.Content>
 *         </Popout.Panel>
 *     </Popout>
 * </PopoutManager>
 * ```
 * @param props - Component props
 * @param props.children - The pop-out's parts: a trigger and a panel
 * @param props.opened - Whether the panel is open, when driven from your own state
 * @param props.defaultOpened - Whether the panel starts open, when it keeps its own state
 * @param props.onOpenChange - Called when the panel opens or closes, with the new state first
 * @returns The Popout compound component
 */
function PopoutRoot({
    children,
    opened,
    defaultOpened,
    onOpenChange,
}: PopoutProps): JSX.Element {
    // A Popout written inside another Popout's panel is its child: the parent's
    // id is what the manager uses to build the hierarchy.
    const parentContext = useOptionalPopoutContext();
    const parentId = parentContext?.id ?? null;

    return (
        <PopoutProvider
            parentId={parentId}
            opened={opened}
            defaultOpened={defaultOpened}
            onOpenChange={onOpenChange}
        >
            {children}
        </PopoutProvider>
    );
}

// Attach sub-components to the root component
export const Popout = Object.assign(PopoutRoot, {
    Trigger: PopoutTrigger,
    Panel: PopoutPanel,
    Content: PopoutContent,
    Anchor: PopoutAnchor,
});
