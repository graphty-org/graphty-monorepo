/**
 * What the reader sees and has picked, read from the page's accessibility tree: one fingerprint
 * that a reload must give back unchanged. The real-element tests' reload() (src/test/reload.tsx)
 * and the dry run's reload after every route (run.mjs) both read it, so the two never disagree
 * about what a reload has to keep.
 *
 * Self-contained on purpose: the dry run hands this function to Playwright's page.evaluate, which
 * sends its text to the page, so it may not use anything from outside its own body.
 *
 * Counts, timings and the canvas change on their own, so they are left out: nothing is read from
 * a live region, a status bar, a progress bar or the drawing, and a number in a name reads as "#".
 * @returns the entries, sorted, each once: "<what>: <name>" (dialog, list, region, pressed,
 *   selected, current, expanded, checked) or "value: <name> = <value>".
 */
export function screenFingerprint() {
    const nameOf = (element) => {
        const label = element.getAttribute("aria-label");
        if (label !== null) return label.trim();
        const by = element.getAttribute("aria-labelledby");
        if (by !== null) {
            return by
                .split(/\s+/)
                .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
                .join(" ")
                .trim();
        }
        if (
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement
        ) {
            return element.labels?.[0]?.textContent?.trim() ?? "";
        }
        return (element.textContent ?? "").trim().replaceAll(/\s+/g, " ");
    };
    // What no reader sees: a hidden subtree. (An inert one is seen: the panels under an open
    // selection workspace are inert and still show the picked row.)
    // A menu, a picker's list or a pop-over held open over the page by the control that opened it
    // (aria-haspopup with aria-controls) closes on any reload, as it does on a click elsewhere: the
    // reader did not leave it open, the pointer did ("fresh: pointer" in fresh-kinds.json).
    const popupIds = new Set(
        [...document.querySelectorAll("[aria-haspopup][aria-controls], [role=combobox][aria-controls]")].flatMap(
            (each) => (each.getAttribute("aria-controls") ?? "").split(/\s+/),
        ),
    );
    const inPopup = (element) => {
        for (let each = element; each !== null; each = each.parentElement) {
            if (each.id !== "" && popupIds.has(each.id)) return true;
        }
        return false;
    };
    const transient = (element) =>
        element.matches("[aria-haspopup]:not([aria-haspopup=false])") ||
        element.closest('[role="menu"]') !== null ||
        inPopup(element);
    const unseen = (element) =>
        transient(element) || element.closest('[hidden], [aria-hidden="true"], [role="status"], [role="log"]') !== null;
    const seen = new Set();
    // A name's counts ("Busy, node layer, 41 nodes", "A, 41 of 77 nodes") settle on their own time
    // after a change, so a number in a name is read as "#"; a field's value keeps its digits.
    const counted = (name) => name.replaceAll(/\d[\d,.]*/g, "#");
    const add = (what, selector) => {
        for (const element of document.querySelectorAll(selector)) {
            const name = counted(nameOf(element));
            if (name !== "" && !unseen(element)) seen.add(`${what}: ${name}`);
        }
    };
    const surfaces = [
        '[role="dialog"]',
        "dialog[open]",
        '[role="region"]',
        "section[aria-label]",
        "section[aria-labelledby]",
        '[role="menu"]',
        '[role="listbox"]',
    ];
    add("dialog", '[role="dialog"], dialog[open]');
    add("list", '[role="listbox"]');
    add(
        "region",
        '[role="region"][aria-label], [role="region"][aria-labelledby], section[aria-label], section[aria-labelledby]',
    );
    add("pressed", '[aria-pressed="true"]');
    add("selected", '[aria-selected="true"]');
    add("current", '[aria-current]:not([aria-current="false"])');
    add("expanded", '[aria-expanded="true"]');
    const controls = "input:not([type=hidden]):not([type=file]), textarea, select";
    for (const each of document.querySelectorAll(`:is(${surfaces.join(", ")}) :is(${controls})`)) {
        const name = nameOf(each);
        if (name === "" || unseen(each)) continue;
        if (each.type === "checkbox" || each.type === "radio") {
            if (each.checked) seen.add(`checked: ${counted(name)}`);
        } else if (each.value !== "") {
            seen.add(`value: ${counted(name)} = ${each.value}`);
        }
    }
    return [...seen].sort();
}

/**
 * How two fingerprints differ: what went and what came. A reload that changes what the reader
 * picked ("selected: test" became "selected: Everything") shows on both sides.
 * @param before - the fingerprint before.
 * @param after - the fingerprint after.
 * @param allowed - entries either side may differ on.
 * @returns the entries only before ("missing") and only after ("appeared").
 */
export function fingerprintChanges(before, after, allowed = []) {
    const missing = before.filter((each) => !after.includes(each) && !allowed.includes(each));
    const appeared = after.filter((each) => !before.includes(each) && !allowed.includes(each));
    return { missing, appeared };
}
