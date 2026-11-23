import type React from "react";
import { flushSync } from "react-dom";

// Figma switches pill tabs and segmented options when the mouse button goes DOWN, not when it
// comes back up (design/figma-spec.md 5.1, 5.2). Mantine activates on click, so the theme hands
// these handlers to Tabs.Tab and SegmentedControl through `defaultProps`: a primary-button
// mouse-down activates the control at once by dispatching the same click the keyboard and every
// click-only test already use, and the real click that follows the mouse-up is then swallowed
// so the change is reported exactly once.
//
// The browser's own mouse-down focus step runs after these handlers. When the activation moved
// focus (the change focused a field) or removed the pressed element (it closed the pop-out holding
// the control), that step would find nothing to focus and drop focus to the page, so it is skipped.

/**
 * Click `target` with React's resulting render flushed, then skip the browser's mouse-down focus
 * step when that moved focus to another element or removed `pressed`.
 * @param event - the mouse-down
 * @param pressed - the element the press landed on
 * @param target - what to click
 */
function activate(event: React.MouseEvent<HTMLElement>, pressed: Element, target: HTMLElement): void {
    const focused = pressed.ownerDocument.activeElement;
    flushSync(() => {
        target.click();
    });
    // Focus that fell to the page because the change removed its holder (a panel that closed)
    // was not moved by the change, so the browser still focuses the pressed control.
    const now = pressed.ownerDocument.activeElement;
    const moved = now !== focused && now !== null && now !== pressed.ownerDocument.body;
    if (!pressed.isConnected || moved) {
        event.preventDefault();
    }
}

/** Tabs activated by a mouse-down whose click has not arrived yet. */
const pending = new WeakSet<Element>();

/**
 * `onMouseDown` for Tabs.Tab: activate the tab now.
 * @param event - the mouse-down on the tab
 */
export function activateTabOnMouseDown(event: React.MouseEvent<HTMLElement>): void {
    const tab = event.currentTarget;
    pending.delete(tab);
    if (event.button !== 0 || tab.matches(":disabled, [data-disabled]")) {
        return;
    }
    activate(event, tab, tab);
    pending.add(tab);
}

/**
 * `onClickCapture` for Tabs.Tab: drop the click that ends a mouse-down which already activated
 * the tab. Runs before Mantine's own click handler on the same element.
 * @param event - the click
 */
export function swallowActivatedClick(event: React.MouseEvent<HTMLElement>): void {
    if (pending.delete(event.currentTarget)) {
        event.stopPropagation();
    }
}

/**
 * `onKeyDown` / `onMouseLeave` for Tabs.Tab: a press that never became a click (the pointer left,
 * or the keyboard took over) leaves nothing to swallow.
 * @param event - the event
 */
export function forgetActivation(event: React.SyntheticEvent<HTMLElement>): void {
    pending.delete(event.currentTarget);
}

/** Per segmented group: the option label a mouse-down checked, whose click has not arrived yet. */
const pendingSegment = new WeakMap<Element, Element>();

/**
 * `onMouseDown` for SegmentedControl's root: check the option under the pointer now. The real
 * click that follows is swallowed by {@link swallowCheckedSegmentClick}: a caller that leaves
 * `value` unchanged (a deferred or refused change) keeps the radio unchecked, so that click
 * would otherwise check it again and report the change twice.
 * @param event - the mouse-down anywhere in the group
 */
export function checkSegmentOnMouseDown(event: React.MouseEvent<HTMLElement>): void {
    const group = event.currentTarget;
    pendingSegment.delete(group);
    if (event.button !== 0 || !(event.target instanceof Element)) {
        return;
    }
    const label = event.target.closest("label");
    const id = label?.htmlFor;
    if (!id) {
        return;
    }
    const input = group.ownerDocument.getElementById(id);
    if (input instanceof HTMLInputElement && input.type === "radio" && !input.disabled && !input.checked) {
        activate(event, label, input);
        pendingSegment.set(group, label);
    }
}

/**
 * `onClickCapture` for SegmentedControl's root: cancel the label click that ends a mouse-down
 * which already checked its option, so the label does not click its radio a second time.
 * @param event - the click
 */
export function swallowCheckedSegmentClick(event: React.MouseEvent<HTMLElement>): void {
    const label = pendingSegment.get(event.currentTarget);
    pendingSegment.delete(event.currentTarget);
    if (label && event.target instanceof Node && label.contains(event.target)) {
        event.preventDefault();
    }
}
