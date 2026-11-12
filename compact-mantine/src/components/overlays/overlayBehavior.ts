/**
 * The overlay behavior a Mantine theme cannot express through props (design/figma-spec.md 8.1
 * and 8.3), installed once per document by the Tooltip and Menu theme extensions the first time
 * one renders:
 *
 * - Tooltips dismiss at once on pointer-down, on any key but a modifier, on the wheel and when
 *   the pointer leaves the window. The open tooltip element is marked `data-cm-dismissed` (CSS
 *   hides it); the mark lives exactly as long as that tooltip does, so it stays hidden while the
 *   pointer rests on its trigger and the next tooltip shows normally.
 * - An Escape pressed while no tooltip shows reaches the page, even when a hidden one is open:
 *   only a visible tooltip takes the Escape that closes it.
 * - A dismissed tooltip whose trigger then turns off (Undo pressed until nothing is left) shows
 *   again, now with its reason ("Nothing to undo"): Mantine keeps the same tooltip element and only
 *   changes its words, so the dismissal would otherwise hide the reason too.
 * - A pointer-down on a trigger also keeps every tooltip that mounts for it later dismissed until
 *   the pointer leaves it: a click before the open delay ran out, or a toggle whose label changes,
 *   mounts a new tooltip under the resting pointer, which must not open over what the click just
 *   showed. A fresh hover after leaving opens it normally.
 * - A tooltip opened by keyboard focus waits the same 1000 ms as a hovered one (Mantine's focus
 *   handling has no delay): it is marked `data-cm-held` for that long. While tooltips are warm
 *   (one is visible, or was within the 300 ms hide window) it shows at once, as a hovered one
 *   does: Tabbing from a visible tooltip's trigger hands off immediately.
 * - A tooltip does not open when a script puts focus back on its trigger (a pop-out closed with
 *   Escape, a menu's pick, a panel's Run): only a key that moves focus (Tab, an arrow, Home, End,
 *   F6) or the pointer opens one, so a returned focus never drops a bubble over the next control.
 * - A tooltip opens on hover only when the pointer moved onto its trigger. Chromium updates hover
 *   after a layout change with a move that does not move, so a trigger that slides under a resting
 *   pointer (a page switch, a panel opening) would open its tooltip unasked. Such a tooltip is
 *   marked `data-cm-still` (CSS hides it) until the pointer moves over the trigger or it is
 *   focused, and then shows after the usual delay. Keyboard focus is unaffected.
 * - A tooltip does not open while its trigger's own pop-up is open (`aria-expanded` on a control
 *   with `aria-haspopup`): an info circle's explanation, a menu or a list already covers that
 *   place and says more.
 * - A submenu stays open when the pointer leaves its row for anything but another row of the
 *   parent menu (the gap between the menus, the page), and closes at once on another row.
 * - Menus get type-ahead: a printable key moves focus to the next enabled row whose label starts
 *   with it ("v" -> View).
 * - A menu clamped to the viewport shows Figma's 24px chevron rows at the ends it can still
 *   scroll towards (`data-cm-scroll-up` / `data-cm-scroll-down`, drawn by the CSS); hovering
 *   one scrolls the menu.
 *
 * Tooltip and menu mounts are seen through the `cm-tooltip-mount` and `cm-overlay-mount`
 * animations the CSS gives them, whose `animationstart` bubbles to the document: no
 * MutationObserver over the whole page. A tooltip stays hidden until it is marked
 * `data-cm-seen`: its 1 ms mount animation can end a frame before `animationstart` is
 * dispatched, so the animation alone would let a focus-opened tooltip show before it is held.
 */
import { TOOLTIP_CLOSE_DELAY, TOOLTIP_OPEN_DELAY } from "../../theme/styles/overlays";
import { tooltipTrigger } from "./tooltipPlacement";

/** Keys that never dismiss a tooltip. */
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "AltGraph", "Meta", "CapsLock", "Fn", "OS"]);
/** The mount-hook animation names, shared with ../../theme/css/overlays.css.ts. */
const MOUNT_ANIMATIONS = new Set(["cm-overlay-mount", "cm-tooltip-mount"]);
/** The height of a menu's scroll chevron row, in px (Figma: 24). */
const CHEVRON_ROW = 24;
/** How far a hovered scroll chevron moves the menu per frame, in px. */
const AUTO_SCROLL_STEP = 4;

let installed = false;
/** Until when (performance.now()) a focus-opened tooltip counts as a warm hand-off. */
let warmUntil = 0;
/**
 * When focus last moved (performance.now()). The warm check compares this, not the tooltip's
 * mount time: the key that moves focus is what hands off, and a slow render between the focus
 * and the mount must not turn a warm hand-off cold.
 */
let focusedAt = 0;
/** Keys that move focus on purpose: Tab, the arrows of a roving group, Home, End and F6. */
const NAVIGATION_KEYS = new Set(["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "F6"]);
/** Whether the last key was one that moves focus, until the focus it moved arrives. */
let navigating = false;
/** Whether focus last arrived by a key that moves it, not put there by a script. */
let focusByKey = false;
/** Where the pointer last was (client px). */
let pointerAt: { x: number; y: number } | null = null;
/** What the pointer was over when it last actually moved. */
let movedOver: EventTarget | null = null;
/** The control the last pointer-down landed on, until the pointer leaves it: its tooltips stay closed. */
let pressed: Element | null = null;
/**
 * Every element the last pointer-down passed through, innermost first. A tooltip's trigger can sit
 * inside the control `pressed` names (a caret inside a tree row), so the trigger is looked up here.
 */
let pressedPath: EventTarget[] = [];
/** The keyboard opened the menu that is opening (the last key came after the last pointer-down). */
let keyLast = false;

/**
 * Whether a tooltip other than `except` is showing (not held, not dismissed).
 * @param except - the tooltip to ignore
 * @returns true when one is visible
 */
function anotherTooltipVisible(except?: Element): boolean {
    return Array.from(document.querySelectorAll<HTMLElement>(".cm-tooltip")).some(
        (tooltip) =>
            tooltip !== except &&
            tooltip.dataset.cmSeen !== undefined &&
            tooltip.dataset.cmHeld === undefined &&
            tooltip.dataset.cmStill === undefined &&
            tooltip.dataset.cmDismissed === undefined,
    );
}

/**
 * The element a tooltip describes: the trigger floating-ui placed it beside, else the element
 * whose aria-describedby names it (Mantine sets that while the tooltip is open, but a text input
 * or a child that passes its own overwrites it).
 * @param tooltip - a cm-tooltip element
 * @returns the trigger, or null
 */
function triggerOf(tooltip: Element): Element | null {
    return (
        tooltipTrigger(tooltip) ??
        (tooltip.id ? document.querySelector(`[aria-describedby~="${CSS.escape(tooltip.id)}"]`) : null)
    );
}

/** A trigger whose own pop-up (a popover, a menu, a list) is open. */
const POPUP_OPEN = '[aria-expanded="true"][aria-haspopup]:not([aria-haspopup="false"])';

/**
 * Whether a tooltip that just mounted belongs to a control whose own pop-up is open: the pop-up
 * already says more than the tooltip would, and the bubble would sit over it (an info circle's
 * explanation opens on hover, its name tooltip a second later).
 * @param tooltip - the tooltip element that just mounted
 * @returns true when it stays closed
 */
function popupOpen(tooltip: HTMLElement): boolean {
    return triggerOf(tooltip)?.matches(POPUP_OPEN) === true;
}

/** What makes a trigger off: a tooltip on it then says why. */
const DISABLED = ':disabled, [aria-disabled="true"], [data-disabled]';

/**
 * Watches the triggers of dismissed tooltips; one that turns off shows its tooltip again.
 * ponytail: a trigger stays observed after its tooltip goes; the callback finds no tooltip then.
 */
const turnedOff =
    typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver((records) => {
              for (const { target } of records) {
                  if (!(target instanceof Element) || !target.matches(DISABLED)) {
                      continue;
                  }
                  for (const id of target.getAttribute("aria-describedby")?.split(/\s+/) ?? []) {
                      document.getElementById(id)?.removeAttribute("data-cm-dismissed");
                  }
              }
          });

/**
 * Hide every tooltip that is open because its trigger is hovered or focused. A tooltip held open
 * through its `opened` prop is left alone: its owner decides when it goes, and so is the reason of
 * an off control the reader presses again (`pressedOn`): the press did nothing, and the tooltip
 * says why.
 * @param pressedOn - what a pointer-down, Enter or Space landed on, if one did
 */
function dismissTooltips(pressedOn: EventTarget | null = null): void {
    // The key (Tab) or pointer-down that hides a visible tooltip keeps the group warm, so the
    // tooltip it moves focus to shows at once.
    if (anotherTooltipVisible()) {
        warmUntil = performance.now() + TOOLTIP_CLOSE_DELAY;
    }
    // A still tooltip was never shown, so there is nothing to dismiss: the Tab that focuses its
    // trigger must still show it.
    for (const tooltip of document.querySelectorAll<HTMLElement>(".cm-tooltip:not([data-cm-still])")) {
        const trigger = triggerOf(tooltip);
        const offPressed =
            trigger?.matches(DISABLED) === true && pressedOn instanceof Node && trigger.contains(pressedOn);
        if (trigger && !offPressed && (trigger.matches(":hover") || trigger === document.activeElement)) {
            tooltip.dataset.cmDismissed = "";
            if (!trigger.matches(DISABLED)) {
                turnedOff?.observe(trigger, {
                    attributes: true,
                    attributeFilter: ["disabled", "aria-disabled", "data-disabled"],
                });
            }
        }
    }
}

/**
 * Let an Escape through when no tooltip is showing. A tooltip this file hides (dismissed, still,
 * held, not yet seen) is still open to floating-ui, whose dismiss stops every Escape at its
 * trigger and at the document while its tooltip is open, so a page shortcut on the window
 * ("Escape clears the selection") never ran: a tooltip the reader could not see took the key
 * (#3380). floating-ui leaves an Escape alone while an input method is composing, and it learns
 * that from `compositionstart` and `compositionend` on the document, so this Escape is framed by
 * the two: the hidden tooltips stay as they are (hidden), and the key goes on. A visible tooltip
 * still takes the Escape that closes it, as a menu does. Read before `dismissTooltips` marks the
 * visible one dismissed. That composition handling is floating-ui's own, not an API it promises:
 * checked against @floating-ui/react 0.27.20 (Mantine 8.3.18), and the test "a tooltip kept hidden
 * under a resting pointer does not take the page's Escape" fails if an upgrade changes it.
 * ponytail: a visible HoverCard (floating-ui too) beside a hidden tooltip would let this Escape
 * through as well; no HoverCard is used today.
 * @param event - a keydown anywhere in the document, in the capture phase
 */
function passEscapeOfHiddenTooltips(event: KeyboardEvent): void {
    if (
        event.key !== "Escape" ||
        event.isComposing ||
        anotherTooltipVisible() ||
        document.querySelector(".cm-tooltip") === null
    ) {
        return;
    }
    document.dispatchEvent(new CompositionEvent("compositionstart"));
    // After this key's dispatch: a microtask would run between its listeners.
    globalThis.setTimeout(() => {
        document.dispatchEvent(new CompositionEvent("compositionend"));
    }, 0);
}

/**
 * Whether a tooltip that just mounted opened on keyboard focus while tooltips are cold.
 * @param tooltip - the tooltip element that just mounted
 * @returns true when it must wait the cold delay
 */
function mustHold(tooltip: HTMLElement): boolean {
    const trigger = triggerOf(tooltip);
    if (!trigger || trigger !== document.activeElement || trigger.matches(":hover")) {
        return false;
    }
    // Warm only when focus moved inside the window the key opened (warmUntil - TOOLTIP_CLOSE_DELAY
    // is that key's time): focus that sat on the trigger since before the key is not a hand-off.
    const warm = focusedAt >= warmUntil - TOOLTIP_CLOSE_DELAY && focusedAt < warmUntil;
    return !warm && !anotherTooltipVisible(tooltip);
}

/**
 * Hold a tooltip for the open delay, then let it show.
 * @param tooltip - the tooltip element
 */
function hold(tooltip: HTMLElement): void {
    tooltip.dataset.cmHeld = "";
    globalThis.setTimeout(() => {
        delete tooltip.dataset.cmHeld;
    }, TOOLTIP_OPEN_DELAY);
}

/**
 * Whether a tooltip that just mounted opened on hover with no pointer movement onto its trigger:
 * the trigger came to lie under a resting pointer.
 * ponytail: a tooltip held open through its `opened` prop whose trigger sits under a resting
 * pointer is hidden too, until the pointer moves over it; none does today.
 * @param tooltip - the tooltip element that just mounted
 * @returns true when nobody pointed at the trigger
 */
function openedUnasked(tooltip: HTMLElement): boolean {
    const trigger = triggerOf(tooltip);
    return (
        !!trigger &&
        trigger !== document.activeElement &&
        trigger.matches(":hover") &&
        !(movedOver instanceof Node && trigger.contains(movedOver))
    );
}

/**
 * Show, after the open delay, a still tooltip whose trigger the pointer moved onto or focus
 * reached.
 * @param target - what the pointer moved over, or what took focus
 */
function wakeStillTooltips(target: EventTarget | null): void {
    if (!(target instanceof Node)) {
        return;
    }
    for (const tooltip of document.querySelectorAll<HTMLElement>(".cm-tooltip[data-cm-still]")) {
        if (triggerOf(tooltip)?.contains(target)) {
            delete tooltip.dataset.cmStill;
            hold(tooltip);
        }
    }
}

/**
 * Record a pointer move that moved. A move at the same place is Chromium's hover update after a
 * layout change, not the reader pointing; a script-dispatched move always counts.
 * @param event - a pointermove anywhere in the document
 */
function trackPointer(event: PointerEvent): void {
    if (event.isTrusted && pointerAt?.x === event.clientX && pointerAt.y === event.clientY) {
        return;
    }
    pointerAt = { x: event.clientX, y: event.clientY };
    movedOver = event.target;
    if (pressed && !(event.target instanceof Node && pressed.contains(event.target))) {
        pressed = null;
    }
    wakeStillTooltips(event.target);
}

/**
 * Whether a tooltip opened because a script put focus back on its trigger (a pop-out or menu
 * closed with Escape or a pick, a panel's Run): the reader did not move there, and the bubble
 * would cover the control they reach for next. Tab, an arrow or F6 onto it shows it as before.
 * @param tooltip - the tooltip element that just mounted
 * @returns true when it should stay hidden
 */
function focusReturned(tooltip: HTMLElement): boolean {
    const trigger = triggerOf(tooltip);
    return !!trigger && trigger === document.activeElement && !trigger.matches(":hover") && !focusByKey;
}

/**
 * Whether a tooltip that just mounted belongs to the control the pointer pressed and still rests
 * on: the control itself, or a trigger inside it that the press went through (a tree row's caret).
 * A trigger the press turned off is left out: its tooltip says why it is off now ("Nothing to
 * undo"), which is what a reader looking at it after the click wants to know.
 * @param tooltip - the tooltip element that just mounted
 * @returns true when the tooltip stays closed
 */
function pressedTrigger(tooltip: HTMLElement): boolean {
    const trigger = triggerOf(tooltip);
    if (!pressed || !trigger || trigger.matches(DISABLED)) {
        return false;
    }
    return trigger.contains(pressed) || pressedPath.includes(trigger);
}

/**
 * Hold a tooltip that opened on keyboard focus for the cold delay, then mark it seen. The CSS
 * hides a tooltip until it is seen, so it never shows before this decision.
 * @param tooltip - the tooltip element that just mounted
 */
function holdIfFocusOpened(tooltip: HTMLElement): void {
    if (pressedTrigger(tooltip) || popupOpen(tooltip)) {
        tooltip.dataset.cmDismissed = "";
    } else if (focusReturned(tooltip)) {
        tooltip.dataset.cmDismissed = "";
    } else if (openedUnasked(tooltip)) {
        tooltip.dataset.cmStill = "";
    } else if (mustHold(tooltip)) {
        hold(tooltip);
    }
    tooltip.dataset.cmSeen = "";
}

/** A submenu row whose submenu is open. */
const OPEN_SUBMENU_ROW = '[data-sub-menu-item][aria-expanded="true"]';

/**
 * Whether an element is in an open submenu or on the row that opened it. A submenu's dropdown
 * renders inside its parent dropdown (Menu.Sub does not portal), so it is a dropdown inside another.
 * @param element - where the pointer was
 * @returns true for an open submenu row or anything in a submenu
 */
function inSubmenu(element: Element): boolean {
    const outer = element.closest("[data-menu-dropdown]")?.parentElement?.closest("[data-menu-dropdown]");
    return element.closest(OPEN_SUBMENU_ROW) !== null || (outer !== undefined && outer !== null);
}

/**
 * A submenu stays open until the pointer moves onto another row of its parent menu (Figma, and a
 * macOS menu): Mantine closes it when the pointer leaves its row, so the 4px gap between the two
 * menus closed it before the pointer could reach it (issue 4631). A move from a submenu or its row
 * to anything that is not a menu row is kept from React, so Mantine never sees that leave.
 * @param event - a mouseout anywhere in the document, in the capture phase
 */
function keepSubmenuOpen(event: MouseEvent): void {
    const { target, relatedTarget } = event;
    if (
        target instanceof Element &&
        relatedTarget instanceof Element &&
        relatedTarget.closest("[data-menu-item]") === null &&
        inSubmenu(target)
    ) {
        event.stopPropagation();
    }
}

/**
 * The other half of keepSubmenuOpen: the pointer reaching another row of a parent menu closes
 * that menu's open submenu, at once. The close is Mantine's own, run by the leave it was kept from.
 * @param event - a mouseover anywhere in the document, in the capture phase
 */
function closeSubmenusLeft(event: MouseEvent): void {
    const row = event.target instanceof Element ? event.target.closest("[data-menu-item]") : null;
    if (row === null) {
        return;
    }
    for (const item of document.querySelectorAll(OPEN_SUBMENU_ROW)) {
        const submenu = document.getElementById(item.getAttribute("aria-controls") ?? "");
        if (item !== row && !submenu?.contains(row) && item.closest("[data-menu-dropdown]")?.contains(row)) {
            item.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: row }));
        }
    }
}

function menuRows(menu: Element): HTMLElement[] {
    return Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')).filter(
        (row) =>
            row.closest(".cm-menu") === menu &&
            row.dataset.disabled === undefined &&
            row.getAttribute("aria-disabled") !== "true",
    );
}

/**
 * Type-ahead: focus the next enabled row, after the focused one, whose label starts with the key.
 * @param event - a keydown anywhere in the document
 */
function typeAhead(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }
    if (event.key.length !== 1 || event.key === " ") {
        return;
    }
    const menu = event.target instanceof Element ? event.target.closest(".cm-menu") : null;
    if (!menu) {
        return;
    }
    const rows = menuRows(menu);
    const start = rows.indexOf(event.target as HTMLElement);
    const key = event.key.toLowerCase();
    for (let step = 1; step <= rows.length; step++) {
        const row = rows[(start + step + rows.length) % rows.length];
        const label = (row.querySelector(".cm-menu-item-label") ?? row).textContent?.trim().toLowerCase() ?? "";
        if (label.startsWith(key)) {
            event.preventDefault();
            row.focus();
            return;
        }
    }
}

/**
 * The Escape that closes a themed menu is used up there (`preventDefault`), so a page shortcut on
 * the same key -- "Escape clears the selection" -- skips it, as it skips any key something already
 * handled. Mantine closes the menu but lets the key go on unmarked, and by the time it reaches the
 * window the menu is gone, so the page could not tell. Marked in the document's capture phase,
 * before Mantine's close runs. The next Escape, with the menu shut, reaches the page as usual.
 * @param event - a keydown anywhere in the document
 */
function consumeMenuEscape(event: KeyboardEvent): void {
    if (event.key === "Escape" && event.target instanceof Element && event.target.closest(".cm-menu")) {
        event.preventDefault();
    }
}

/**
 * A menu's first focus: Mantine's focus trap focuses the first focusable row as the menu opens,
 * which highlights it as if already chosen, and a disabled row that stays focusable to show its
 * reason would be the row Enter cannot run (its ArrowDown from the dropdown does the same).
 * Opened by a key, focus moves on to the first enabled row, or the menu itself when none is.
 * Opened by the pointer, it goes to the menu itself, whatever the first row is, so no row is
 * highlighted until an arrow key, as in Figma (ArrowDown then lands here again, from a key, and
 * reaches the first enabled row). Focus coming from another row (an arrow, a click on the row to
 * read its reason) stays.
 * @param event - a focusin anywhere in the document
 */
function skipDisabledFirstRow(event: FocusEvent): void {
    const row = event.target instanceof HTMLElement ? event.target : null;
    const menu = row?.closest<HTMLElement>(".cm-menu");
    if (!row || !menu || !row.matches('[role^="menuitem"]')) {
        return;
    }
    // An enabled row other than the one the focus trap picks (the first) was reached on purpose:
    // type-ahead from the menu itself lands there.
    const trapPick = Array.from(menu.querySelectorAll('[role^="menuitem"]')).find(
        (r) => r.closest(".cm-menu") === menu,
    );
    if (row !== trapPick && menuRows(menu).includes(row)) {
        return;
    }
    const from = event.relatedTarget;
    if (from instanceof Node && from !== menu && menu.contains(from)) {
        return;
    }
    const first = keyLast ? menuRows(menu).at(0) : undefined;
    if (row === first) {
        return;
    }
    // Mantine's focus trap places its first focus twice (two timers), the second time from the
    // row this moved to; marked, both land here.
    first?.setAttribute("data-autofocus", "");
    (first ?? menu).focus();
}

/**
 * Mark which ends of a menu can still scroll, so the CSS draws the chevron rows.
 * @param menu - a cm-menu dropdown
 */
function updateScrollEnds(menu: HTMLElement): void {
    const up = menu.scrollTop > 0;
    const down = menu.scrollTop + menu.clientHeight < menu.scrollHeight - 1;
    menu.toggleAttribute("data-cm-scroll-up", up);
    menu.toggleAttribute("data-cm-scroll-down", down);
}

const menuResize =
    typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver((entries) => {
              for (const { target } of entries) {
                  if (target.isConnected) {
                      updateScrollEnds(target as HTMLElement);
                  } else {
                      menuResize?.unobserve(target);
                  }
              }
          });

let autoScroll: { menu: HTMLElement; direction: -1 | 1; frame: number } | null = null;

function stopAutoScroll(): void {
    if (autoScroll) {
        cancelAnimationFrame(autoScroll.frame);
        autoScroll = null;
    }
}

function startAutoScroll(menu: HTMLElement, direction: -1 | 1): void {
    if (autoScroll?.menu === menu && autoScroll.direction === direction) {
        return;
    }
    stopAutoScroll();
    const tick = (): void => {
        if (!autoScroll) {
            return;
        }
        menu.scrollTop += direction * AUTO_SCROLL_STEP;
        autoScroll.frame = requestAnimationFrame(tick);
    };
    autoScroll = { menu, direction, frame: requestAnimationFrame(tick) };
}

/**
 * Scroll a menu while the pointer is over one of its visible chevron rows.
 * @param event - a pointermove anywhere in the document
 */
function trackChevronHover(event: PointerEvent): void {
    const menu = event.target instanceof Element ? event.target.closest<HTMLElement>(".cm-menu") : null;
    if (menu) {
        const rect = menu.getBoundingClientRect();
        if (menu.dataset.cmScrollUp !== undefined && event.clientY < rect.top + CHEVRON_ROW) {
            startAutoScroll(menu, -1);
            return;
        }
        if (menu.dataset.cmScrollDown !== undefined && event.clientY > rect.bottom - CHEVRON_ROW) {
            startAutoScroll(menu, 1);
            return;
        }
    }
    stopAutoScroll();
}

/** Install the document listeners once. Safe to call on every render and during SSR. */
export function installOverlayBehavior(): void {
    if (installed || typeof document === "undefined") {
        return;
    }
    installed = true;
    const capture = { capture: true, passive: true } as const;
    document.addEventListener(
        "pointerdown",
        (event) => {
            keyLast = false;
            const target = event.target instanceof Element ? event.target : null;
            // The control, not the label span inside it: moving onto its padding is not leaving.
            pressed = target?.closest("button, a, input, select, textarea, [role], [tabindex]") ?? target;
            pressedPath = event.composedPath();
            navigating = false;
            dismissTooltips(event.target);
        },
        capture,
    );
    document.addEventListener(
        "wheel",
        () => {
            dismissTooltips();
        },
        capture,
    );
    document.addEventListener(
        "focusin",
        (event) => {
            focusedAt = performance.now();
            focusByKey = navigating;
            navigating = false;
            wakeStillTooltips(event.target);
        },
        capture,
    );
    document.addEventListener(
        "keydown",
        (event) => {
            keyLast = true;
            if (!MODIFIER_KEYS.has(event.key)) {
                passEscapeOfHiddenTooltips(event);
                navigating = NAVIGATION_KEYS.has(event.key);
                dismissTooltips(event.key === "Enter" || event.key === " " ? event.target : null);
            }
        },
        capture,
    );
    document.addEventListener("mouseout", (event) => {
        if (!event.relatedTarget) {
            // Back in at the same pixel is a move: the pointer was elsewhere in between.
            pointerAt = null;
            pressed = null;
            dismissTooltips();
            stopAutoScroll();
        }
    });
    document.addEventListener("mouseout", keepSubmenuOpen, true);
    document.addEventListener("mouseover", closeSubmenusLeft, true);
    document.addEventListener("keydown", consumeMenuEscape, true);
    document.addEventListener("keydown", typeAhead);
    document.addEventListener("focusin", skipDisabledFirstRow);
    document.addEventListener("pointermove", trackChevronHover, { passive: true });
    document.addEventListener("pointermove", trackPointer, capture);
    document.addEventListener(
        "scroll",
        (event) => {
            if (event.target instanceof HTMLElement && event.target.classList.contains("cm-menu")) {
                updateScrollEnds(event.target);
            }
        },
        capture,
    );
    document.addEventListener("animationstart", (event) => {
        if (!MOUNT_ANIMATIONS.has(event.animationName) || !(event.target instanceof HTMLElement)) {
            return;
        }
        if (event.target.classList.contains("cm-tooltip")) {
            // Only a mount is decided. The animation also starts again on a tooltip that is
            // already open when its style is recomputed, and holding it then hid it for another
            // open delay while its trigger kept focus.
            if (event.target.dataset.cmSeen === undefined) {
                holdIfFocusOpened(event.target);
            }
        } else if (event.target.classList.contains("cm-menu")) {
            updateScrollEnds(event.target);
            menuResize?.observe(event.target);
        }
    });
}

/** The element focused when the last themed Menu opened: where focus goes back when it closes. */
let menuOpener: HTMLElement | null = null;

/**
 * A themed Menu's default `onOpen`: remember the element focused as it opens (its button, when
 * opened by a click or a key), as Mantine's own focus return does.
 */
export function rememberMenuOpener(): void {
    menuOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

/**
 * A themed Menu's default `onClose` (Mantine's `returnFocus` is off in the theme): when focus is
 * still inside the closing menu (a submenu included) or on the page body, hand it back to the
 * opener now, before the dropdown unmounts. Mantine's own return refocuses the button 10 ms
 * after the close wherever focus has gone since, so a dialog opened from a row lost the focus it
 * had just taken to the button behind it. Done now instead, a dialog that opens from the row
 * takes focus after this, keeps it, and gives it back to the button when it closes. Focus
 * already elsewhere (a click outside on another control) is left alone.
 * ponytail: one opener for the whole document, so a Menu opened from inside another Menu's
 * dropdown (not a Menu.Sub) leaves the outer one nothing to return to; and a caller passing its
 * own `onOpen` / `onClose` replaces these defaults (each one today returns focus itself).
 */
export function returnFocusToMenuOpener(): void {
    const opener = menuOpener;
    menuOpener = null;
    const active = document.activeElement;
    if (
        opener?.isConnected &&
        (active === null || active === document.body || active.closest("[data-menu-dropdown]"))
    ) {
        opener.focus({ preventScroll: true });
    }
}

/**
 * The default click handler of a submenu row (Menu.Sub.Item): a tap or a click opens the submenu
 * and focuses its first row. Mantine opens a submenu only on mouseenter and ArrowRight, so a touch
 * screen (no hover) could never reach one; this replays the row's own ArrowRight path, which runs
 * Mantine's open and focus. Enter and Space on a focused row produce a click, so they open it too.
 * ponytail: a caller passing its own onClick to Menu.Sub.Item replaces this default (none does);
 * compose the two in the theme if one ever needs to.
 * @param event - the click on the submenu row
 */
export function openSubmenuOnClick(event: Pick<Event, "currentTarget">): void {
    event.currentTarget?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
}
