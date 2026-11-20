/**
 * What the Style sidebar may draw (owner, 2026-11-17; #8739; ledger E174): every element is an approved control,
 * sits inside one, or is a container src/workspace/style/approved-controls.json names, and every word is a
 * control's own or a control's name. Shared by SidebarControls and owner-forbidden.
 */

import approved from "../approved-controls.json";

/** Every approved control's root: what is inside one is the control's. */
const CONTROLS = approved.controls.map((entry) => entry.dom).join(", ");
/** The library internals not drawn by the app: inside these nothing is checked. */
const INTERNALS = approved.controls
    .filter((entry) => !entry.from.startsWith("@mantine/"))
    .map((entry) => entry.dom)
    .join(", ");
/** Where words may sit: in a control, or in a container's own words (a section's header, a tab). */
const WORDS = [CONTROLS, ...approved.containers.flatMap((entry) => ("words" in entry ? [entry.words] : []))].join(", ");
/** The Mantine components the sidebar may draw. */
const MANTINE = new Set(
    [...approved.controls, ...approved.containers]
        .filter((entry) => entry.from.startsWith("@mantine/"))
        .map((entry) => entry.name),
);
/** What is information however it is drawn, even inside a button. */
const INFORMATION = new Set(["Badge", "Pill", "Chip", "Alert", "Text", "Notification", "Loader", "Code", "Mark"]);
/** An app's own class naming a pill, chip, badge, caption or note. */
const INFORMATION_CLASS = /(?:^|-)(?:chip|chips|pill|badge|caption|note|hint|covered|state-line)(?:-|$)/;

/**
 * Whether an element is drawn so a reader can see it: shown, and not shrunk or clipped to a point as a
 * screen-reader-only element is.
 * @param element - the element.
 * @param root - where to stop looking up.
 * @returns whether it is seen.
 */
function seen(element: Element, root: Element): boolean {
    if (!element.checkVisibility({ opacityProperty: true, visibilityProperty: true })) {
        return false;
    }
    for (let at: Element | null = element; at !== null && at !== root; at = at.parentElement) {
        const box = at.getBoundingClientRect();
        const style = getComputedStyle(at);
        if (box.width <= 1 || box.height <= 1 || style.clip !== "auto" || style.clipPath.startsWith("inset(50%")) {
            return false;
        }
    }
    return true;
}

/**
 * A short description of an element, for a failure message.
 * @param element - the element.
 * @returns its tag, classes and words.
 */
function described(element: Element): string {
    const classes = [element.tagName.toLowerCase(), ...[...element.classList].filter((name) => !name.startsWith("m_"))];
    return `<${classes.join(".")}> "${(element.textContent ?? "").trim().slice(0, 40)}"`;
}

/**
 * The classes of one element that name information, or a Mantine component the list does not allow there.
 * @param element - the element.
 * @returns each refused class, with the element described.
 */
function refusedClasses(element: Element): string[] {
    const inControl = element.closest(CONTROLS) !== null;
    const ownControl = element.matches(CONTROLS);
    return [...element.classList]
        .filter((name) => {
            const mantine = /^mantine-(\w+)-root$/.exec(name)?.[1];
            return mantine === undefined
                ? INFORMATION_CLASS.test(name)
                : !ownControl && (INFORMATION.has(mantine) || (!inControl && !MANTINE.has(mantine)));
        })
        .map((name) => `${name}: ${described(element)}`);
}

/**
 * Everything the sidebar draws that the approved list does not allow.
 * @param tab - the Style tab.
 * @returns each offending element, described.
 */
export function outsideTheList(tab: HTMLElement): string[] {
    const found: string[] = [];
    for (const element of tab.querySelectorAll("*")) {
        if (element.parentElement?.closest(INTERNALS) || !seen(element, tab)) {
            continue;
        }
        found.push(...refusedClasses(element));
    }
    const walker = document.createTreeWalker(tab, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const holder = node.parentElement;
        if (holder === null || (node.textContent ?? "").trim() === "" || !seen(holder, tab)) {
            continue;
        }
        if (holder.closest(WORDS) === null) {
            found.push(`words outside a control: ${described(holder)}`);
        }
    }
    return [...new Set(found)];
}
