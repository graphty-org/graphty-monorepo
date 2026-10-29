/**
 * Whether keyboard focus has fallen to the page itself, as it does when the control holding it
 * is removed (WCAG 2.4.3): the caller then hands it on to a stated target.
 * @returns true when no control has focus.
 */
export function focusIsLost(): boolean {
    return document.activeElement === null || document.activeElement === document.body;
}

/**
 * Puts focus in the list of the place the left panel shows (the Graph place's style layers), on
 * the row a Tab into the list would reach; else, when the place has no list, on the rail button
 * that names the open place. Used where a whole surface comes up or goes (a project opens, the
 * Data page closes), so focus lands where the reader goes next, not on the drawing's outline or
 * on the page.
 */
export function focusCurrentPlace(): void {
    const rowOf = (): HTMLElement | null =>
        document.querySelector<HTMLElement>('.ws-left [role="tree"] [role="treeitem"][tabindex="0"]');
    const row = rowOf();
    if (row !== null) {
        row.focus();
        return;
    }
    const rail = document.querySelector<HTMLElement>('.ws-rail [aria-current="page"]');
    if (rail === null) {
        return;
    }
    rail.focus();
    // The list is drawn after the place opens (a graph's layers once it is read): its first row
    // takes focus as it appears, unless the reader has moved on from the rail.
    const observer = new MutationObserver(() => {
        const drawn = rowOf();
        if (drawn !== null) {
            observer.disconnect();
            drawn.focus();
        }
    });
    rail.addEventListener(
        "blur",
        () => {
            observer.disconnect();
        },
        { once: true },
    );
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["tabindex"],
    });
}

/** The inspector title's id; see `focusInspectorTitle`. */
export const INSPECTOR_TITLE_ID = "ws-inspector-title";

/**
 * Puts focus on the graph's heading in the inspector once a graph has opened (a sample, a file,
 * a project, a load from the Data page), so a screen reader starts with which graph it is and
 * how big; else, while the inspector shows something else, on the open place's list. A reader
 * who has already moved into the drawing, or into a dialog, while the graph was still being read
 * keeps their place.
 */
export function focusOpenedGraph(): void {
    const active = document.activeElement;
    if (active?.tagName === "GRAPHTY-ELEMENT" || (active?.closest('[role="dialog"]') ?? null) !== null) {
        return;
    }
    const title = document.querySelector<HTMLElement>(`[data-inspected="graph"] #${INSPECTOR_TITLE_ID}`);
    if (title === null) {
        focusCurrentPlace();
    } else {
        title.focus();
    }
}

/**
 * For a graph that opens after a wait (a sample read, a file opened): watches, from now, for the
 * reader's own keys and presses. The function it returns puts focus on the graph's heading
 * (`focusOpenedGraph`) only when the reader did nothing meanwhile or focus has fallen to the page,
 * so focus never jumps away from where the reader went while the graph was loading.
 * @returns Stops watching; with `focus` (the default) it then moves focus as above.
 */
export function focusOpenedGraphLater(): (focus?: boolean) => void {
    let acted = false;
    const onInput = (event: Event): void => {
        acted ||= event.isTrusted;
    };
    document.addEventListener("keydown", onInput, true);
    document.addEventListener("pointerdown", onInput, true);
    return (focus = true) => {
        document.removeEventListener("keydown", onInput, true);
        document.removeEventListener("pointerdown", onInput, true);
        if (focus && (!acted || focusIsLost())) {
            focusOpenedGraph();
        }
    };
}

/**
 * Puts focus on the inspector's title after an action filled the inspector (a run, a find pick):
 * the ring says "here is what you asked for" without marking a value row as chosen, and the next
 * Enter opens nothing. Single-key shortcuts (n for a note) still work from there.
 */
export function focusInspectorTitle(): void {
    document.getElementById(INSPECTOR_TITLE_ID)?.focus();
}

/**
 * Puts focus on the workspace's main heading, the inspector's title, which names what is open:
 * where a reopened tab starts, so a screen reader hears where the reader left off. The title is
 * drawn after the place it names comes back, so focus waits for it, unless the reader has moved
 * focus somewhere first.
 */
export function focusMainHeading(): void {
    const title = (): HTMLElement | null => document.getElementById(INSPECTOR_TITLE_ID);
    if (title() !== null) {
        title()?.focus();
        return;
    }
    const observer = new MutationObserver(() => {
        const drawn = title();
        if (drawn !== null) {
            stop();
            drawn.focus();
        }
    });
    const stop = (): void => {
        observer.disconnect();
        document.removeEventListener("focusin", stop);
    };
    document.addEventListener("focusin", stop);
    observer.observe(document.body, { childList: true, subtree: true });
}

/** Everything that can take focus, before the checks `canFocus` makes. */
const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]';

/**
 * Whether an element is on the page, drawn and enabled, so focus can go to it.
 * @param element - the element.
 * @returns true when it can take focus.
 */
function canFocus(element: Element): boolean {
    return (
        element instanceof HTMLElement &&
        element.isConnected &&
        element.getClientRects().length > 0 &&
        !element.matches(":disabled") &&
        element.closest("[inert]") === null
    );
}

/**
 * The Tab stops inside a container, in Tab order (document order: the app sets no positive
 * tabindex).
 * @param root - the container.
 * @returns the stops.
 */
export function tabStops(root: ParentNode): HTMLElement[] {
    return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => canFocus(element) && element.tabIndex >= 0,
    );
}

/**
 * The panels F6 and Shift+F6 move between, in order, as a desktop application's do: the left
 * panel, then the inspector that edits what it picks (one press from a layer to its style), the
 * drawing, the timeline dock while a time field is designated, the canvas toolbar, the table while
 * it is open, and the Data page while it stands in for them. A hidden one is passed over.
 */
const PANELS = [
    ".ws-left",
    ".ws-right",
    ".ws-canvas graphty-element",
    // The timeline dock while a time field is designated: its brush is where focus lands.
    ".tl-dock",
    ".ws-toolbar-dock",
    ".ws-dock",
    ".ws-page",
];

/** The control that last had focus in each panel, by its selector: where F6 returns to it. */
const lastInPanel = new Map<string, HTMLElement>();

/**
 * Moves focus to the next panel (or the previous one): the control that last had focus there,
 * else its first Tab stop; the drawing itself for the canvas. Does nothing while a modal dialog
 * is open: focus belongs to the dialog.
 * @param step - 1 for the next panel, -1 for the previous one.
 */
export function cyclePanel(step: 1 | -1): void {
    const modal = [...document.querySelectorAll("[aria-modal='true']")].some((dialog) => canFocus(dialog));
    if (modal) {
        return;
    }
    const panels = PANELS.map((selector) => ({
        selector,
        element: document.querySelector<HTMLElement>(selector),
    })).filter(
        (panel): panel is { selector: string; element: HTMLElement } =>
            panel.element !== null && canFocus(panel.element),
    );
    if (panels.length === 0) {
        return;
    }
    const active = document.activeElement;
    const at = panels.findIndex((panel) => active !== null && panel.element.contains(active));
    // From nowhere in a panel, F6 starts at the first and Shift+F6 at the last.
    let from = at;
    if (at === -1) {
        from = step === 1 ? -1 : 0;
    }
    for (let turn = 1; turn <= panels.length; turn++) {
        const panel = panels[(from + step * turn + panels.length * 2) % panels.length];
        const target = panelTarget(panel.selector, panel.element);
        if (target !== undefined) {
            target.focus();
            return;
        }
    }
}

/**
 * Where focus lands in a panel: the control that last had it there, else the drawing itself for
 * the canvas, else the panel's first Tab stop.
 * @param selector - the panel's selector.
 * @param element - the panel.
 * @returns the control, or undefined when the panel has none.
 */
function panelTarget(selector: string, element: HTMLElement): HTMLElement | undefined {
    const last = lastInPanel.get(selector);
    if (last !== undefined && element.contains(last) && canFocus(last)) {
        return last;
    }
    if (element.tagName === "GRAPHTY-ELEMENT") {
        return element;
    }
    // A panel can name where focus lands first (the timeline dock's brush, not its first button).
    const start = element.querySelector<HTMLElement>("[data-panel-start]");
    return (start === null ? undefined : tabStops(start)[0]) ?? tabStops(element)[0];
}

/** How many focused controls the guard remembers, newest last. */
const HISTORY = 30;

/** A control that had focus, and what it says: its kind and its name. */
interface Held {
    readonly element: HTMLElement;
    readonly says: string;
}

/**
 * What a control says: its tag, role and name, enough to find the same control drawn again (a
 * field keyed by its value is a new element with the same label).
 * @param element - the control.
 * @returns the words, or "" when it has no name to go by.
 */
function saysOf(element: HTMLElement): string {
    const label = (element as HTMLInputElement).labels?.[0]?.textContent;
    const name = element.getAttribute("aria-label") ?? label ?? element.textContent ?? "";
    const trimmed = name.replaceAll(/\s+/g, " ").trim().slice(0, 80);
    return trimmed === "" ? "" : `${element.tagName}|${element.getAttribute("role") ?? ""}|${trimmed}`;
}

/**
 * Where focus goes when the control holding it is removed or hidden and nothing else placed it:
 * the same control drawn again in its place (one element saying the same), else the newest
 * control that had focus before it and is still there -- for a closed pop-out, menu or dialog,
 * the control that opened it. A click on the page's blank background leaves focus on the page:
 * the control that had it is still there.
 * @param history - the controls that had focus, newest last.
 */
function rescue(history: Held[]): void {
    const lost = history.at(-1);
    if (!focusIsLost() || lost === undefined || canFocus(lost.element)) {
        return;
    }
    if (lost.says !== "") {
        const same = [...document.querySelectorAll<HTMLElement>(lost.element.tagName)].filter(
            (element) => canFocus(element) && saysOf(element) === lost.says,
        );
        if (same.length === 1) {
            selectedTabFor(same[0]).focus();
            return;
        }
    }
    for (let index = history.length - 2; index >= 0; index--) {
        const held = history[index].element;
        if (canFocus(held) && held.closest("[aria-hidden='true']") === null) {
            selectedTabFor(held).focus();
            return;
        }
    }
}

/**
 * A tab focus is handed back to stands for its tab list, so focus goes to the list's selected
 * tab: the ring never sits on one tab while another is selected (a new view opened on Values).
 * @param element - where focus would go.
 * @returns the selected tab of its list, or the element itself.
 */
function selectedTabFor(element: HTMLElement): HTMLElement {
    if (element.getAttribute("role") !== "tab" || element.getAttribute("aria-selected") === "true") {
        return element;
    }
    const selected = element
        .closest('[role="tablist"]')
        ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    return selected !== null && selected !== undefined && canFocus(selected) ? selected : element;
}

/**
 * Keeps keyboard focus off the page itself (WCAG 2.4.3), for the whole workspace:
 *
 * - Tab past the last control wraps to the first, and Shift+Tab before the first to the last, as
 *   in a desktop application -- within an open dialog or popover, around its own controls; a
 *   control that claims Tab itself (a focus trap, a pop-out that closes on Tab) keeps it.
 * - A control removed or hidden while it held focus hands focus on (see `rescue`), after the
 *   frame the change was drawn in, so a caller that places focus itself always goes first.
 * - Each panel remembers its last focused control, for F6 (`cyclePanel`).
 * @returns the function that stops it.
 */
export function installFocusGuard(): () => void {
    const history: Held[] = [];
    const onFocusIn = (event: FocusEvent): void => {
        const element = event.target;
        if (!(element instanceof HTMLElement)) {
            return;
        }
        if (history.at(-1)?.element !== element) {
            history.push({ element, says: saysOf(element) });
            history.splice(0, Math.max(0, history.length - HISTORY));
        }
        for (const selector of PANELS) {
            if (element.closest(selector) !== null) {
                lastInPanel.set(selector, element);
            }
        }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
            return;
        }
        const active = focusIsLost() ? null : document.activeElement;
        // Inside an open dialog or popover, Tab rounds within it: it is the reader's place until
        // it closes. Elsewhere it rounds the page.
        const stops = tabStops(active?.closest("[role='dialog'], [role='alertdialog']") ?? document);
        const first = stops.at(0);
        const last = stops.at(-1);
        // Past the end (or before the start, or from the page itself): round to the other end.
        const [edge, other] = event.shiftKey ? [first, last] : [last, first];
        const target = active === null || active === edge ? other : undefined;
        if (target !== undefined) {
            event.preventDefault();
            target.focus();
        }
    };
    let pending = 0;
    const observer = new MutationObserver((records) => {
        // A view drawn again in place can select another tab under the focused one (a new view
        // opens on Values): the ring follows the selection, never resting on an unselected tab.
        const active = document.activeElement;
        if (
            active instanceof HTMLElement &&
            records.some((record) => record.target === active && record.attributeName === "aria-selected")
        ) {
            const selected = selectedTabFor(active);
            if (selected !== active) {
                selected.focus();
            }
        }
        if (pending !== 0 || !focusIsLost()) {
            return;
        }
        pending = requestAnimationFrame(() => {
            setTimeout(() => {
                pending = 0;
                rescue(history);
            });
        });
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["hidden", "style", "class", "disabled", "inert", "aria-selected"],
    });
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
        observer.disconnect();
        cancelAnimationFrame(pending);
        document.removeEventListener("focusin", onFocusIn, true);
        document.removeEventListener("keydown", onKeyDown);
    };
}
