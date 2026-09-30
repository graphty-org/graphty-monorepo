/* Present: a full-window, canvas-only showing of the saved views, in the Views place's order.
   Top left: back arrow and the Esc hint (both go to the Views place). Top right: the Lock the
   canvas switch (graphty-element's setInputEnabled(false); off by default, remembered per
   project). Bottom: the view's caption, the step counter and previous / next.
   Views: the Graph place's two saved views plus one more, on Les Miserables. Plain ASCII.
   Styles are this section's own, injected once below. */
(function () {
    "use strict";
    const { h, icon } = AB;

    const CSS = `
.pm { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; background: var(--k-canvas); }
.pm .k-canvas { flex: 1 1 auto; }
.pm-top { position: absolute; left: 12px; right: 12px; top: 12px; z-index: 2; display: flex; align-items: center; gap: 8px; pointer-events: none; }
.pm-top > * { pointer-events: auto; }
.pm-pill { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 10px 0 4px; border-radius: 8px; background: var(--cm-bg); box-shadow: var(--cm-elevation-200); line-height: 16px; }
.pm-pill.pm-lock { padding: 0 10px; cursor: pointer; }
.pm-hint { color: var(--cm-text-secondary); }
.pm-grow { flex: 1 1 auto; }
.pm-foot { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 2; width: min(720px, calc(100% - 32px)); display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 16px; border-radius: 10px; background: var(--cm-bg); box-shadow: var(--cm-elevation-300); line-height: 18px; }
.pm-cap { flex: 1 1 auto; min-width: 0; display: grid; gap: 2px; }
.pm-cap b { font-weight: 600; }
.pm-cap span { color: var(--cm-text-secondary); }
.pm-step { flex: none; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.pm-count { min-width: 44px; text-align: center; color: var(--cm-text-secondary); }
.pm-note { position: absolute; left: 50%; top: 56px; transform: translateX(-50%); z-index: 2; max-width: calc(100% - 32px); }
.pm-oq { display: inline-flex; align-items: center; height: 16px; padding: 0 6px; border-radius: 8px; font-size: 10px; font-weight: 550; background: var(--cm-bg-warning); color: #000; white-space: nowrap; }
.pm-empty { text-align: center; }
.pm-empty .k-btn { justify-self: center; }
@media (max-width: 1100px) { .pm-hide-narrow { display: none; } }
`;
    if (!document.querySelector("style[data-pm-css]")) document.head.append(h("style", { "data-pm-css": "" }, CSS));

    // The saved views in the tour, in the Views place's order (From above is not in the tour; Valjean's neighbors is the view saved in views-place/saved-toast).
    const VIEWS = [
        { name: AB.SAVED_VIEWS[0], pic: "lesmis-groups", alt: "Les Miserables, colored by community, the whole graph in frame",
            caption: "The characters fall into communities of people who share chapters." },
        { name: AB.SAVED_VIEWS[1], pic: "lesmis-groups-valjean", alt: "Les Miserables, framed on Valjean and the characters around him",
            caption: "Valjean sits where most of the story's communities meet." },
        { name: "Valjean's neighbors", pic: "lesmis-neighbors", alt: "Les Miserables, Valjean and the characters who share a chapter with him",
            caption: "The characters who share at least one chapter with Valjean." },
    ];
    const STEP = { "first-view": 0, presenting: 1, locked: 1, "last-view": 2 };
    const STATE_OF = ["first-view", "presenting", "last-view"];
    const LOCK_KEY = "present-lock:Les Miserables"; // per project

    const oq = (text) => h("span", { class: "pm-oq", title: text }, "Open question");

    function isLocked(state) {
        if (state === "locked") return true;
        if (state === "presenting") return false;
        return AB.mem.get(LOCK_KEY) === "on";
    }

    function backPill(label) {
        return h("span", { class: "pm-pill" },
            AB.iconButton("arrow-left", "Leave Present (Esc)", { go: ["views-place", "at-rest"] }),
            h("span", null, label),
            h("span", { class: "pm-hint pm-hide-narrow" }, h("span", { class: "k-kbd" }, "Esc"), " to leave"));
    }

    function render(el, state) {
        const root = h("div", { class: "pm", role: "region", "aria-label": "Present" });
        el.append(root);

        if (state === "no-views") {
            root.append(
                h("div", { class: "k-canvas" }),
                h("div", { class: "pm-top" }, backPill("Present")),
                h("div", { class: "k-canvas-card pm-empty", role: "status" },
                    h("b", null, "Save a view first"),
                    h("span", { class: "k-secondary" }, "Present steps through your saved views in order. This project has none yet: frame the graph and press Save camera view... in Views."),
                    AB.button("Go to Views", { icon: "camera", go: ["views-place", "empty"] })));
            return;
        }

        const i = STEP[state] ?? 1;
        const v = VIEWS[i];
        const locked = isLocked(state);
        const last = i === VIEWS.length - 1;

        const toggle = () => {
            const on = !locked;
            AB.mem.set(LOCK_KEY, on ? "on" : "off");
            if (i === 1) AB.go("present-mode", on ? "locked" : "presenting");
            else window.dispatchEvent(new HashChangeEvent("hashchange")); // same route: re-render; the switch reads memory
            AB.announce(on ? "Canvas locked" : "Canvas unlocked");
        };
        const sw = h("span", { class: "k-switch", "aria-hidden": "true", "aria-checked": String(locked) });
        const lockPill = h("span", { class: "pm-pill pm-lock", role: "switch", tabindex: "0", "aria-checked": String(locked), title: "Turns off the mouse, touch and keys on the graph", on: { click: toggle, keydown: (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); } } } },
            icon(locked ? "lock" : "lock-open", "sm"), "Lock the canvas", sw);

        const go = (j) => AB.go("present-mode", j === 1 && locked ? "locked" : STATE_OF[j]);
        const prev = AB.iconButton("chevron-left", "Previous view (Page Up)", { onClick: () => i > 0 && go(i - 1) });
        const next = AB.iconButton("chevron-right", last ? "No more views" : "Next view (Page Down)", { onClick: () => !last && go(i + 1) });
        if (i === 0) prev.setAttribute("aria-disabled", "true"), prev.disabled = true;
        if (last) next.setAttribute("aria-disabled", "true"), next.disabled = true;

        root.append(...[
            h("div", { class: "k-canvas", "aria-label": locked ? "Graph, locked" : "Graph" }, h("div", { class: "k-stage" }, AB.drawing(v.pic, v.alt))),
            h("div", { class: "pm-top" },
                backPill(v.name),
                h("span", { class: "pm-grow" }),
                oq("Arrow keys turn the graph while the canvas is unlocked (they are graphty-element's camera keys), so stepping uses Page Up and Page Down, which presentation clickers send. Should arrows step only while locked?"),
                lockPill),
            locked ? h("div", { class: "pm-note k-toast", role: "status" }, icon("lock", "sm"), "The audience cannot turn the graph") : null,
            h("div", { class: "pm-foot" },
                h("div", { class: "pm-cap" },
                    h("b", { class: "k-ellipsis" }, v.name),
                    h("span", null, v.caption),
                    last ? h("span", null, "Last view. ", AB.link("views-place", "at-rest", "Back to Views"), " or press Esc.") : null),
                h("span", { class: "pm-step" }, prev, h("span", { class: "pm-count k-num", "aria-live": "polite" }, (i + 1) + " of " + VIEWS.length), next)),
        ].filter(Boolean));

        // Page Down / Space: next; Page Up / Shift+Space: previous. Esc is the shell's (closeTo).
        const onKey = (e) => {
            if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
            const fwd = e.key === "PageDown" || (e.key === " " && !e.shiftKey);
            const back = e.key === "PageUp" || (e.key === " " && e.shiftKey);
            if (fwd && !last) { e.preventDefault(); go(i + 1); }
            else if (back && i > 0) { e.preventDefault(); go(i - 1); }
        };
        document.addEventListener("keydown", onKey);
        // Focus starts on the way out (Esc returns it to the Present button that opened this)
        setTimeout(() => { const x = root.querySelector('[aria-label="Leave Present (Esc)"]'); if (x && (document.activeElement === document.body || !document.activeElement)) x.focus(); }, 0);
        const off = () => { document.removeEventListener("keydown", onKey); window.removeEventListener("hashchange", off); };
        window.addEventListener("hashchange", off);
    }

    registerSection({
        id: "present-mode",
        title: "Present",
        region: "full",
        frame: { top: false, rail: false },
        closeTo: "views-place",
        states: [
            { id: "presenting", label: "Stepping: view 2 of 3" },
            { id: "locked", label: "Canvas locked" },
            { id: "first-view", label: "First view" },
            { id: "last-view", label: "Last view" },
            { id: "no-views", label: "No saved views" },
        ],
        render,
    });
})();
