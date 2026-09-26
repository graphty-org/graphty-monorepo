/**
 * The overlay behaviour a Mantine theme cannot express through props (design/figma-spec.md 8.1
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
 * - Menus get type-ahead: a printable key moves focus to the next enabled row whose label starts
 *   with it ("v" -> View).
 * - A menu clamped to the viewport shows Figma's 24px chevron rows at the ends it can still
 *   scroll towards (`data-cm-scroll-up` / `data-cm-scroll-down`, drawn by the CSS); hovering
 *   one scrolls the menu.
 *
 * Tooltip and menu mounts are seen through the `cm-tooltip-mount` and `cm-overlay-mount`
 * animations the CSS gives them, whose `animationstart` bubbles to the document: no
 * MutationObserver over the whole page.
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
/** Tooltips whose mount has been seen (and held, when focus-opened); a newer one is not yet painted. */
const seenTooltips = new WeakSet<Element>();

/**
 * Whether a tooltip other than `except` is showing (not held, not dismissed).
 * @param except - the tooltip to ignore
 * @returns true when one is visible
 */
function anotherTooltipVisible(except?: Element): boolean {
    return Array.from(document.querySelectorAll(".cm-tooltip")).some(
        (tooltip) =>
            tooltip !== except &&
            seenTooltips.has(tooltip) &&
            !tooltip.hasAttribute("data-cm-held") &&
            !tooltip.hasAttribute("data-cm-dismissed"),
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
    for (const tooltip of document.querySelectorAll(".cm-tooltip")) {
        const trigger = triggerOf(tooltip);
        if (trigger && (trigger.matches(":hover") || trigger === document.activeElement)) {
            tooltip.setAttribute("data-cm-dismissed", "");
        }
    }
}

/**
 * Hold a tooltip that opened on keyboard focus for the cold delay.
 * @param tooltip - the tooltip element that just mounted
 */
function holdIfFocusOpened(tooltip: HTMLElement): void {
    seenTooltips.add(tooltip);
    const trigger = triggerOf(tooltip);
    if (!trigger || trigger !== document.activeElement || trigger.matches(":hover")) {
        return;
    }
    if (performance.now() < warmUntil || anotherTooltipVisible(tooltip)) {
        return;
    }
    tooltip.setAttribute("data-cm-held", "");
    window.setTimeout(() => {
        tooltip.removeAttribute("data-cm-held");
    }, TOOLTIP_OPEN_DELAY);
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
export function installOverlayBehaviour(): void {
    if (installed || typeof document === "undefined") {
        return;
    }
    installed = true;
    const capture = { capture: true, passive: true } as const;
    document.addEventListener("pointerdown", dismissTooltips, capture);
    document.addEventListener("wheel", dismissTooltips, capture);
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
            dismissTooltips();
            stopAutoScroll();
        }
    });
    document.addEventListener("keydown", typeAhead);
    document.addEventListener("pointermove", trackChevronHover, { passive: true });
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
