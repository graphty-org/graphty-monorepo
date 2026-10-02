/* Present: a full-window, canvas-only showing of the saved views checked In tour, in the Views
   place's order. The header is the shared mode header (AB.pageHead: back arrow, "Present", the Esc
   hint), with the Lock the canvas checkbox at its end; while presenting it hides itself 2 s after
   the pointer leaves it and comes back when the pointer nears the top edge or focus enters it.
   Right and Left arrows step (also Page Down / Page Up and Space, which presentation clickers send),
   locked or not; Esc leaves. The view's name appears once, in the caption
   at the foot, with the step counter and previous / next. Lock the canvas is graphty-element's
   setInputEnabled(false): off by default, remembered per project, no notice.
   With no saved views Present is disabled in the Views place ("Save a view first"), so this
   section has no empty state; on the last view Next is disabled. Plain ASCII. */
(function () {
    "use strict";
    const { h } = AB;

    const CSS = `
.pm { position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; background: var(--k-canvas); }
.pm .k-canvas { flex: 1 1 auto; }
.pm-head { position: absolute; left: 0; right: 0; top: 0; z-index: 2; transition: transform 160ms ease, opacity 160ms ease; }
.pm-head[data-hidden] { transform: translateY(-100%); opacity: 0; }
.pm-head:focus-within { transform: none; opacity: 1; }
.pm-hot { position: absolute; left: 0; right: 0; top: 0; height: 24px; z-index: 1; }
.pm-lock { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; white-space: nowrap; }
.pm-foot { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 2; width: min(720px, calc(100% - 32px)); display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 16px; border-radius: 10px; background: var(--cm-bg); box-shadow: var(--cm-elevation-300); line-height: 18px; }
.pm-cap { flex: 1 1 auto; min-width: 0; display: grid; gap: 2px; }
.pm-cap b { font-weight: 600; }
.pm-cap span { color: var(--cm-text-secondary); }
.pm-step { flex: none; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.pm-count { min-width: 44px; text-align: center; color: var(--cm-text-secondary); }
@media (prefers-reduced-motion: reduce) { .pm-head { transition: none; } }
`;
    if (!document.querySelector("style[data-pm-css]")) document.head.append(h("style", { "data-pm-css": "" }, CSS));

    // The views checked In tour, in the Views place's order ("From above" is not in the tour;
    // "Valjean's neighbors" is the view saved in views-place/saved-toast).
    const VIEWS = [
        { name: AB.SAVED_VIEWS[0], pic: "lesmis-groups", alt: "Les Miserables, colored by community, the whole graph in frame",
            caption: "The characters fall into communities of people who share chapters." },
        { name: AB.SAVED_VIEWS[1], pic: "lesmis-groups-valjean", alt: "Les Miserables, framed on Valjean and the characters around him",
            caption: "Valjean sits where most of the story's communities meet." },
        { name: "Valjean's neighbors", pic: "lesmis-neighbors", alt: "Les Miserables, Valjean and the characters who share a chapter with him",
            caption: "The characters who share at least one chapter with Valjean." },
    ];
    // present-mode/long-caption: the same view with a caption at the 300-character limit, which
    // wraps inside the caption box; the name keeps its one line and the stepper keeps its place.
    const LONG_CAPTION = "Valjean sits where most of the story's communities meet: the convicts of Toulon, the Thenardiers and their inn, the students of the ABC cafe, and the household on the Rue Plumet. Remove him and the graph falls apart into islands, which is why the novel needs him in nearly every one of its five volumes.";
    const LOCK_KEY = "present-lock:Les Miserables"; // per project
    const HIDE_MS = 2000;

    function render(el, state) {
        const root = h("div", { class: "pm", role: "region", "aria-label": "Present" });
        el.append(root);

        // The route picks where the skeleton starts; stepping and locking then happen in place.
        let i = state === "first-view" ? 0 : 1;
        let locked = state === "locked" ? true : state === "presenting" ? false : AB.mem.get(LOCK_KEY) === "on";
        if (state !== "first-view") AB.mem.set(LOCK_KEY, locked ? "on" : "off");

        // ---- the header: back arrow, the mode's name, the Esc hint, Lock the canvas ----
        const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": "false", "aria-label": "Lock the canvas" });
        const lock = h("span", { class: "pm-lock" }, box, h("span", { "aria-hidden": "true" }, "Lock the canvas"));
        AB.tip(box, "Lock the canvas", { second: "Turns off the mouse, touch and keys on the graph" });
        const flip = () => { locked = !locked; AB.mem.set(LOCK_KEY, locked ? "on" : "off"); paint(); };
        lock.addEventListener("click", flip);
        box.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); e.stopPropagation(); flip(); } });

        // The shared mode header; Esc and the back arrow return to the screen that opened Present.
        const head = h("div", { class: "pm-head" }, AB.pageHead("Present", { backTip: "Leave Present", trail: lock }));
        const hot = h("div", { class: "pm-hot", "aria-hidden": "true" });

        // Auto-hide: shown on arrival, hidden 2 s after the pointer leaves it.
        let timer = 0;
        const show = () => { clearTimeout(timer); head.removeAttribute("data-hidden"); };
        const hideSoon = () => { clearTimeout(timer); timer = setTimeout(() => head.setAttribute("data-hidden", ""), HIDE_MS); };
        hot.addEventListener("pointerenter", show);
        head.addEventListener("pointerenter", show);
        head.addEventListener("pointerleave", hideSoon);
        hideSoon();

        // ---- the canvas and the caption ----
        const canvas = h("div", { class: "k-canvas" });
        const prev = AB.iconButton("chevron-left", "Previous view", { key: "ArrowLeft", onClick: () => step(-1) });
        const next = AB.iconButton("chevron-right", "Next view", { key: "ArrowRight", onClick: () => step(1) });
        const name = h("b", { class: "k-ellipsis" });
        const cap = h("span");
        const count = h("span", { class: "pm-count k-num", "aria-live": "polite" });
        const foot = h("div", { class: "pm-foot" },
            h("div", { class: "pm-cap" }, name, cap),
            h("span", { class: "pm-step" }, prev, count, next));

        function setDisabled(btn, off) {
            btn.disabled = off;
            if (off) btn.setAttribute("aria-disabled", "true"); else btn.removeAttribute("aria-disabled");
        }

        function paint() {
            const v = VIEWS[i];
            canvas.replaceChildren(h("div", { class: "k-stage" }, AB.drawing(v.pic, v.alt)));
            canvas.setAttribute("aria-label", locked ? "Graph, locked" : "Graph");
            box.setAttribute("aria-checked", String(locked));
            name.textContent = v.name;
            cap.textContent = state === "long-caption" && i === 1 ? LONG_CAPTION : v.caption;
            count.textContent = (i + 1) + " of " + VIEWS.length;
            setDisabled(prev, i === 0);
            setDisabled(next, i === VIEWS.length - 1);
        }

        function step(d) {
            const j = i + d;
            if (j < 0 || j >= VIEWS.length) return;
            i = j;
            paint();
        }

        root.append(canvas, hot, head, foot);
        paint();

        // Right / Page Down / Space next, Left / Page Up / Shift+Space previous, locked or not.
        // Esc is the shell's (pageHead's cancel).
        const onKey = (e) => {
            if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
            const fwd = e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && !e.shiftKey && e.target === document.body);
            const bk = e.key === "ArrowLeft" || e.key === "PageUp" || (e.key === " " && e.shiftKey && e.target === document.body);
            if (fwd) { e.preventDefault(); step(1); } else if (bk) { e.preventDefault(); step(-1); }
        };
        document.addEventListener("keydown", onKey);
        const off = () => { clearTimeout(timer); document.removeEventListener("keydown", onKey); window.removeEventListener("hashchange", off); };
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
            { id: "long-caption", label: "A 300-character caption, wrapped" },
        ],
        render,
    });
})();
