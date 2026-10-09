/**
 * The overlay behavior a Mantine theme cannot express through props (design/figma-spec.md 8.1
 * and 8.3), installed once per document by the Tooltip and Menu theme extensions the first time
 * one renders:
 *
 * - Tooltips dismiss at once on pointer-down, on any key but a modifier, on the wheel and when
 *   the pointer leaves the window. The open tooltip element is marked `data-cm-dismissed` (CSS
 *   hides it); the mark lives exactly as long as that tooltip does, so it stays hidden while the
 *   pointer rests on its trigger and the next tooltip shows normally.
 * - A tooltip opened by keyboard focus waits the same 1000 ms as a hovered one (Mantine's focus
 *   handling has no delay): it is marked `data-cm-held` for that long. While tooltips are warm
 *   (one is visible, or was within the 300 ms hide window) it shows at once, as a hovered one
 *   does: Tabbing from a visible tooltip's trigger hands off immediately.
 * - A tooltip opens on hover only when the pointer moved onto its trigger. Chromium updates hover
 *   after a layout change with a move that does not move, so a trigger that slides under a resting
 *   pointer (a page switch, a panel opening) would open its tooltip unasked. Such a tooltip is
 *   marked `data-cm-still` (CSS hides it) until the pointer moves over the trigger or it is
 *   focused, and then shows after the usual delay. Keyboard focus is unaffected.
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
/** Where the pointer last was (client px). */
let pointerAt: { x: number; y: number } | null = null;
/** What the pointer was over when it last actually moved. */
let movedOver: EventTarget | null = null;

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
 * The element a tooltip describes (Mantine sets aria-describedby on it while the tooltip is open).
 * @param tooltip - a cm-tooltip element
 * @returns the trigger, or null
 */
function triggerOf(tooltip: Element): Element | null {
    return tooltip.id ? document.querySelector(`[aria-describedby~="${CSS.escape(tooltip.id)}"]`) : null;
}

/**
 * Hide every tooltip that is open because its trigger is hovered or focused. A tooltip held open
 * through its `opened` prop is left alone: its owner decides when it goes.
 */
function dismissTooltips(): void {
    // The key (Tab) or pointer-down that hides a visible tooltip keeps the group warm, so the
    // tooltip it moves focus to shows at once.
    if (anotherTooltipVisible()) {
        warmUntil = performance.now() + TOOLTIP_CLOSE_DELAY;
    }
    // A still tooltip was never shown, so there is nothing to dismiss: the Tab that focuses its
    // trigger must still show it.
    for (const tooltip of document.querySelectorAll(".cm-tooltip:not([data-cm-still])")) {
        const trigger = triggerOf(tooltip);
        if (trigger && (trigger.matches(":hover") || trigger === document.activeElement)) {
            tooltip.setAttribute("data-cm-dismissed", "");
        }
    }
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
    wakeStillTooltips(event.target);
}

/**
 * Hold a tooltip that opened on keyboard focus for the cold delay, then mark it seen. The CSS
 * hides a tooltip until it is seen, so it never shows before this decision.
 * @param tooltip - the tooltip element that just mounted
 */
function holdIfFocusOpened(tooltip: HTMLElement): void {
    if (openedUnasked(tooltip)) {
        tooltip.dataset.cmStill = "";
    } else if (mustHold(tooltip)) {
        hold(tooltip);
    }
    tooltip.dataset.cmSeen = "";
}

function menuRows(menu: Element): HTMLElement[] {
    return Array.from(menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')).filter(
        (row) =>
            row.closest(".cm-menu") === menu &&
            !row.hasAttribute("data-disabled") &&
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
 * A menu's first focus skips a disabled row: Mantine's focus trap focuses the first focusable
 * row as the menu opens, and a disabled row that stays focusable to show its reason would be the
 * one highlighted, the row Enter cannot run (its ArrowDown from the dropdown does the same).
 * Focus moves on to the first enabled row, or the menu itself when none is. Focus coming from
 * another row (an arrow, a click on the row to read its reason) stays.
 * @param event - a focusin anywhere in the document
 */
function skipDisabledFirstRow(event: FocusEvent): void {
    const row = event.target instanceof HTMLElement ? event.target : null;
    const menu = row?.closest<HTMLElement>(".cm-menu");
    if (!row || !menu || menuRows(menu).includes(row) || !row.matches('[role^="menuitem"]')) {
        return;
    }
    const from = event.relatedTarget;
    if (from instanceof Node && from !== menu && menu.contains(from)) {
        return;
    }
    const first = menuRows(menu).at(0);
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
        if (menu.hasAttribute("data-cm-scroll-up") && event.clientY < rect.top + CHEVRON_ROW) {
            startAutoScroll(menu, -1);
            return;
        }
        if (menu.hasAttribute("data-cm-scroll-down") && event.clientY > rect.bottom - CHEVRON_ROW) {
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
    document.addEventListener("pointerdown", dismissTooltips, capture);
    document.addEventListener("wheel", dismissTooltips, capture);
    document.addEventListener(
        "focusin",
        (event) => {
            focusedAt = performance.now();
            wakeStillTooltips(event.target);
        },
        capture,
    );
    document.addEventListener(
        "keydown",
        (event) => {
            if (!MODIFIER_KEYS.has(event.key)) {
                dismissTooltips();
            }
        },
        capture,
    );
    document.addEventListener("mouseout", (event) => {
        if (!event.relatedTarget) {
            // Back in at the same pixel is a move: the pointer was elsewhere in between.
            pointerAt = null;
            dismissTooltips();
            stopAutoScroll();
        }
    });
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
            holdIfFocusOpened(event.target);
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
