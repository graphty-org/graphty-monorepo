/* Refined B skeleton: shared helpers for section files. Plain ASCII.
   Every helper is on window.AB; the common ones are also globals (h, icon, link, ...).
   Version 3: one helper per job (spec section 2.5). Read README.md before adding a section. */
(function () {
    "use strict";
    const AB = (window.AB = window.AB || {});
    AB.sections = AB.sections || {};
    AB.order = AB.order || [];
    AB.fx = null; // kit/fixtures.json, loaded by app.js before any render

    // ---------- registry ----------
    function normStates(states) {
        return (states && states.length ? states : ["default"]).map((s) =>
            typeof s === "string" ? { id: s, label: s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") } : s,
        );
    }
    function registerSection(spec) {
        if (!spec || !spec.id) throw new Error("registerSection needs an id");
        spec.states = normStates(spec.states);
        spec.region = spec.region || "left";
        AB.sections[spec.id] = spec;
        if (AB.onRegister) AB.onRegister(spec);
    }

    // ---------- DOM builder ----------
    // h("div", { class: "x", on: { click: fn }, style: "...", "aria-label": "..." }, child, [children], "text")
    const SVG_TAGS = ["svg", "use", "path", "rect", "circle", "line", "g", "text", "polyline"];
    function h(tag, attrs, ...kids) {
        const el = SVG_TAGS.includes(tag) ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
        if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) {
            kids.unshift(attrs);
            attrs = null;
        }
        for (const [k, v] of Object.entries(attrs || {})) {
            if (v == null || v === false) continue;
            if (k === "on") for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
            else if (k === "class") el.setAttribute("class", v);
            else if (k === "html") el.innerHTML = v;
            else el.setAttribute(k, v === true ? "" : v);
        }
        append(el, kids);
        return el;
    }
    function append(el, kids) {
        for (const k of kids.flat(Infinity)) {
            if (k == null || k === false) continue;
            el.append(k instanceof Node ? k : document.createTextNode(String(k)));
        }
        return el;
    }
    // Glyphs the kit sprite lacks (lucide paths, ISC), drawn inline; the sprite is generated.
    const EXTRA_ICONS = {
        headset: '<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>',
        accessibility: '<circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/>',
        // Everything: the base layer, a frame with its bottom band filled -- never a second swatch
        "base-layer": '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor"/>',
        // Local only: this computer
        laptop: '<path d="M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z"/><path d="M20.054 15.987H3.946"/>',
        "circle-plus": '<circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/>',
        list: '<path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/>',
        command: '<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>',
        "arrow-left-right": '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
        "message-square-plus": '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v6"/><path d="M9 10h6"/>',
        // Create set: the set glyph (circle-check) with a plus at its top right
        "circle-check+plus": '<path d="M20.9 13A9 9 0 1 1 13 3.1"/><path d="m7.5 12 3.5 3.5 5-5" stroke-width="2.75"/><path d="M19 1.5v7"/><path d="M15.5 5h7"/>',
    };
    function icon(name, size) {
        const cls = "k-i" + (size === "sm" ? " k-i-sm" : size === "lg" ? " k-i-lg" : "");
        const s = h("svg", { class: cls, "aria-hidden": "true" });
        if (EXTRA_ICONS[name]) { s.setAttribute("viewBox", "0 0 24 24"); s.innerHTML = EXTRA_ICONS[name]; return s; }
        s.append(h("use", { href: "kit/icons.svg#" + name }));
        return s;
    }
    // One meaning per icon (spec 2.5). Use these names rather than typing an icon for these jobs.
    const ICON = { view: "bookmark", set: "circle-check", createSet: "circle-check+plus", run: "layers", legend: "list", note: "message-square", addNote: "message-square-plus", filter: "funnel", options: "ellipsis", swap: "arrow-left-right", mode3d: "box", mode2d: "square", hidden: "eye-off", shown: "eye", quickActions: "zap", local: "laptop" };

    // ---------- navigation ----------
    function href(sectionId, state) {
        return "#/" + sectionId + (state ? "/" + state : "");
    }
    function go(sectionId, state) {
        location.hash = href(sectionId, state);
    }
    // link(sectionId, state, label, attrs?) -> <a> that navigates. label may be a node or an array.
    function link(sectionId, state, label, attrs) {
        return h("a", Object.assign({ href: href(sectionId, state), class: "ab-link" }, attrs || {}), label);
    }
    // Make any element navigate on click (and Enter/Space): nav(el, "inspector-node", "valjean")
    function nav(el, sectionId, state) {
        el.setAttribute("role", el.getAttribute("role") && el.getAttribute("role") !== "img" ? el.getAttribute("role") : "link");
        el.tabIndex = 0;
        el.dataset.nav = href(sectionId, state);
        el.addEventListener("click", (e) => { e.stopPropagation(); go(sectionId, state); });
        el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(sectionId, state); } });
        return el;
    }
    // Action target: { go: [id, state] } or { onClick: fn }. Returns attrs for h().
    function act(o) {
        if (!o) return {};
        if (o.go) return { tabindex: "0", "data-nav": href(o.go[0], o.go[1]), on: { click: (e) => { e.stopPropagation(); go(o.go[0], o.go[1]); }, keydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(o.go[0], o.go[1]); } } } };
        if (o.onClick) return { tabindex: "0", on: { click: (e) => { e.stopPropagation(); o.onClick(e); }, keydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); o.onClick(e); } } } };
        return {};
    }

    // ---------- viewer conveniences kept in this browser (never required; a private window just forgets) ----------
    const mem = {
        get(k) { try { return localStorage.getItem("ab." + k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem("ab." + k, v); } catch (e) { /* fine */ } },
    };

    // ---------- input modality: focus rings only for the keyboard (app.css, html[data-input]) ----------
    // Until the first key press the page counts as pointer-driven, so a state opened from a link draws no stray ring
    document.documentElement.dataset.input = "pointer";
    document.addEventListener("pointerdown", () => { document.documentElement.dataset.input = "pointer"; }, true);
    document.addEventListener("keydown", (e) => { if (!["Shift", "Control", "Alt", "Meta"].includes(e.key)) document.documentElement.dataset.input = "key"; }, true);
    const byKeyboard = () => document.documentElement.dataset.input !== "pointer";

    // ---------- the one tooltip (spec 2.5) ----------
    // tip(el, name, { key, second, label }) : the name becomes el's aria-label (unless label: false,
    // for a control whose visible text already names it), the key its aria-keyshortcuts. The bubble is
    // drawn by one document-level delegate from data-tip / data-key / data-tip2, so a section may
    // write those attributes directly. Never use the native title attribute.
    const KEYLIKE = /^(Ctrl|Shift|Alt|Mod|Cmd|Esc|Del|Delete|Enter|Space|Tab|F\d{1,2}|[A-Z0-9?/,.\]\[])(\+\S+)*$/;
    // The display key ("Mod+Enter", "Ctrl+Z", "Esc") as a valid aria-keyshortcuts value
    const ARIA_KEY = { Ctrl: "Control", Cmd: "Meta", Esc: "Escape", Del: "Delete" };
    function ariaKeys(key) {
        const one = (k) => k.split("+").map((p) => ARIA_KEY[p] || p).join("+");
        return String(key).split(/\s+/).flatMap((k) => (/(^|\+)Mod(\+|$)/.test(k) ? [k.replace(/Mod/, "Control"), k.replace(/Mod/, "Meta")] : [k])).map(one).join(" ");
    }
    // The participant view (design notes hidden, as study.mjs opens it)
    const studyView = () => document.documentElement.hasAttribute("data-design-notes-hidden");
    // a tooltip that names an element gap is review text: the study build says only that it is not available
    const forStudy = (t) => (typeof t === "string" && studyView() && /needs graphty-element/i.test(t) ? "Not available yet" : t);
    function tip(el, name, o) {
        o = o || {};
        name = forStudy(name);
        if (o.second) o = Object.assign({}, o, { second: forStudy(o.second) });
        let key = o.key;
        // "Undo (Ctrl+Z)" -> name "Undo", key "Ctrl+Z"
        const m = !key && typeof name === "string" && name.match(/^(.*\S) \(([^()]+)\)$/);
        if (m && KEYLIKE.test(m[2])) { name = m[1]; key = m[2]; }
        if (!name) return el;
        el.dataset.tip = name;
        if (key) { el.dataset.key = key; el.setAttribute("aria-keyshortcuts", ariaKeys(key)); }
        // The second line (a disabled reason, a gesture) also reaches screen readers: the bubble is aria-hidden
        if (o.second) { el.dataset.tip2 = o.second; el.setAttribute("aria-description", o.second); }
        if (o.label !== false && !el.hasAttribute("aria-label")) {
            el.setAttribute("aria-label", name);
            // a name on a plain span or div needs a role that allows one
            if (!el.hasAttribute("role") && !el.hasAttribute("tabindex") && /^(SPAN|DIV)$/.test(el.tagName)) el.setAttribute("role", "img");
        }
        el.removeAttribute("title");
        return el;
    }
    const TIP = { el: null, cur: null, timer: 0, hideTimer: 0, lastHide: 0, touchShown: false };
    function tipBubble() {
        if (TIP.el && TIP.el.isConnected) return TIP.el;
        TIP.el = h("div", { class: "ab-tip", "aria-hidden": "true", hidden: true });
        TIP.el.addEventListener("pointerenter", () => clearTimeout(TIP.hideTimer)); // WCAG 1.4.13: the pointer may rest on it
        TIP.el.addEventListener("pointerleave", () => hideTipSoon());
        document.body.append(TIP.el);
        return TIP.el;
    }
    function showTip(t, byFocus) {
        TIP.byFocus = !!byFocus;
        clearTimeout(TIP.timer);
        clearTimeout(TIP.hideTimer);
        if (!t || !t.isConnected || !t.dataset.tip) return;
        const b = tipBubble();
        b.replaceChildren();
        append(b, [h("div", { class: "ab-tip-l1" }, h("span", null, t.dataset.tip), t.dataset.key ? h("span", { class: "ab-kbd" }, t.dataset.key) : null), t.dataset.tip2 ? h("div", { class: "ab-tip-l2" }, t.dataset.tip2) : null]);
        b.hidden = false;
        TIP.cur = t;
        const r = t.getBoundingClientRect(), B = b.getBoundingClientRect();
        let y = r.top - B.height - 6;
        if (y < 4) y = r.bottom + 6;
        const x = Math.max(4, Math.min(r.left + r.width / 2 - B.width / 2, innerWidth - B.width - 4));
        b.style.left = x + "px";
        b.style.top = y + "px";
    }
    function hideTip() {
        clearTimeout(TIP.timer);
        clearTimeout(TIP.hideTimer);
        if (TIP.el && !TIP.el.hidden) { TIP.el.hidden = true; TIP.lastHide = Date.now(); }
        TIP.cur = null;
    }
    function hideTipSoon() { clearTimeout(TIP.hideTimer); TIP.hideTimer = setTimeout(hideTip, 120); }
    const tipTarget = (n) => (n && n.closest ? n.closest("[data-tip]") : null);
    document.addEventListener("pointerover", (e) => {
        if (e.pointerType === "touch") return;
        const t = tipTarget(e.target);
        if (!t || t === TIP.cur) { if (t) clearTimeout(TIP.hideTimer); return; }
        clearTimeout(TIP.timer);
        // A neighbor within 1 s of the last tooltip hiding shows at once
        const quick = TIP.cur || Date.now() - TIP.lastHide < 1000;
        if (TIP.cur) hideTip();
        TIP.timer = setTimeout(() => showTip(t), quick ? 0 : 500);
    });
    document.addEventListener("pointerout", (e) => {
        if (e.pointerType === "touch") return;
        const t = tipTarget(e.target);
        const to = e.relatedTarget;
        if (t && to && (t.contains(to) || (TIP.el && TIP.el.contains(to)))) return;
        clearTimeout(TIP.timer);
        if (TIP.cur) hideTipSoon();
    });
    document.addEventListener("focusin", (e) => {
        const t = tipTarget(e.target);
        if (t && t.matches(":focus-visible") && byKeyboard()) showTip(t, true);
        else hideTip();
    });
    document.addEventListener("focusout", () => hideTip());
    document.addEventListener("keydown", (e) => {
        // A hover tooltip takes one Esc; one shown by keyboard focus hides and lets Esc close the popover too
        if (e.key === "Escape" && TIP.el && !TIP.el.hidden) { const pass = TIP.byFocus; hideTip(); if (!pass) { e.preventDefault(); e.stopPropagation(); } }
    }, true);
    // Touch: a tap acts; a 500 ms long press shows the tooltip without acting, until the next tap
    document.addEventListener("pointerdown", (e) => {
        if (TIP.touchShown) { TIP.touchShown = false; hideTip(); }
        if (e.pointerType !== "touch") return;
        const t = tipTarget(e.target);
        if (!t) return;
        TIP.timer = setTimeout(() => { showTip(t); TIP.touchShown = true; TIP.swallow = true; }, 500);
    });
    ["pointerup", "pointercancel"].forEach((ev) => document.addEventListener(ev, (e) => { if (e.pointerType === "touch" && !TIP.touchShown) clearTimeout(TIP.timer); }));
    document.addEventListener("click", (e) => { if (TIP.swallow) { TIP.swallow = false; e.preventDefault(); e.stopPropagation(); } }, true);
    window.addEventListener("hashchange", hideTip);
    // After a redraw: a section that wrote data-tip by hand on an icon-only control gets its label and key
    function tipSweep(root) {
        (root || document).querySelectorAll("[data-tip]").forEach((el) => {
            if (!el.hasAttribute("aria-label") && !el.textContent.trim()) el.setAttribute("aria-label", el.dataset.tip);
            if (el.dataset.key && !el.hasAttribute("aria-keyshortcuts")) el.setAttribute("aria-keyshortcuts", ariaKeys(el.dataset.key));
        });
    }

    // ---------- small builders ----------
    // button(label, { kind: "secondary" | "ghost" | "danger", icon, go, onClick, disabled: true | "reason", tip, key, block })
    function button(label, o) {
        o = o || {};
        const cls = "k-btn" + (o.kind === "secondary" ? " k-btn-secondary" : o.kind === "ghost" ? " k-btn-ghost" : o.kind === "danger" ? " k-btn-danger" : "") + (o.block ? " k-btn-block" : "");
        const b = h("span", Object.assign({ class: cls, role: "button", "aria-disabled": o.disabled ? "true" : null }, o.disabled ? { tabindex: "0" } : act(o)), o.icon ? icon(o.icon, "sm") : null, label);
        const reason = typeof o.disabled === "string" ? o.disabled : null;
        if (o.tip || o.key || reason) tip(b, o.tip || label, { key: o.key, second: reason, label: false });
        return b;
    }
    // iconButton(icon, name, { go, onClick, pressed, key, disabled: "reason", second })
    function iconButton(name, label, o) {
        o = o || {};
        const b = h("span", Object.assign({ class: "k-icon-btn", role: "button", "aria-pressed": o.pressed == null ? null : String(!!o.pressed), "aria-disabled": o.disabled ? "true" : null }, o.disabled ? { tabindex: "0" } : act(o)), icon(name));
        return tip(b, label, { key: o.key, second: typeof o.disabled === "string" ? o.disabled : o.second });
    }
    function chit(color, round) {
        return h("span", { class: "k-chit" + (round ? " k-chit-round" : ""), style: "background:" + color });
    }
    // A sequential ramp swatch for a measure row
    function ramp(from, to) {
        return h("span", { class: "ab-ramp", style: `background:linear-gradient(90deg,${from || "#d6e6f4"},${to || "#0072B2"})` });
    }

    // ---------- sections: collapsible only when read-only (spec 2.5) ----------
    // section("Overview", child, ...) or
    // section({ title, actions: node, collapsible, collapsed, summary, key, remember, editable }, ...children)
    // collapsible: the head toggles the body in place; closed, `summary` shows as one line. The choice
    // is remembered per `key`, which names the KIND, not the thing ("why.node", "data.run.made-with").
    // editable: true marks a body that edits values; it is always open (no accordion in anything editable).
    function section(head, ...kids) {
        const o = typeof head === "string" ? { title: head } : Object.assign({}, head);
        if (o.editable && o.collapsible) { console.warn("section(" + o.title + "): an editable section is never collapsible"); o.collapsible = false; }
        const s = h("section", { class: "k-section" + (o.editable ? " ab-editable" : ""), "data-collapsed": o.collapsed && !o.editable ? "" : null });
        if (!o.collapsible) {
            s.append(h("div", { class: "k-section-head" }, h("span", { role: "heading", "aria-level": "3", class: "ab-sec-h" }, o.title), h("span", { class: "k-grow" }), o.actions || null));
            if (!o.collapsed || o.editable) append(s, kids);
            return s;
        }
        const key = "sec." + (o.key || o.title);
        const saved = o.remember === false ? null : mem.get(key);
        let open = saved == null ? !o.collapsed : saved === "1";
        const disc = h("span", { class: "ab-disc" });
        const btn = h("span", { class: "ab-sec-btn", role: "button", tabindex: "0" }, disc, o.title);
        const hd = h("div", { class: "k-section-head ab-sec-toggle" }, h("span", { role: "heading", "aria-level": "3", class: "ab-sec-h" }, btn), h("span", { class: "k-grow" }), o.actions || null);
        const body = append(h("div", { class: "ab-sec-body" }), kids);
        const sum = o.summary ? h("div", { class: "ab-sec-sum k-secondary" }, o.summary) : null;
        if (sum && typeof o.summary === "string") tip(sum, o.summary, { label: false });
        const paint = () => {
            disc.replaceChildren(icon(open ? "chevron-down" : "chevron-right", "sm"));
            btn.setAttribute("aria-expanded", String(open));
            s.toggleAttribute("data-collapsed", !open);
            body.hidden = !open;
            if (sum) sum.hidden = open;
        };
        const flip = () => { open = !open; mem.set(key, open ? "1" : "0"); paint(); };
        hd.addEventListener("click", (e) => { if (!e.target.closest(".k-icon-btn, a, .ab-design-note")) flip(); });
        btn.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.stopPropagation(), flip()));
        append(s, [hd, sum, body]);
        paint();
        return s;
    }
    // A label column and a control: the one field row (88 px label in the inspector, 96 px in popovers)
    function fieldRow(label, control, o) {
        o = o || {};
        return h("div", { class: "ab-frow" + (o.popover ? " ab-frow-pop" : "") }, h("span", { class: "ab-flabel" }, label), h("span", { class: "ab-fctl" }, control));
    }
    function data(name, value, o) {
        return h("div", Object.assign({ class: "k-data", role: o && o.go ? "link" : o && o.onClick ? "button" : null }, act(o)), h("span", { class: "k-name" }, name), h("span", { class: "k-value" }, value));
    }
    // row({ icon, label, trail, selected, go, onClick }) -> a k-row
    function row(o) {
        // A row that opens something is a link (or a button); a selected link row says so with aria-current
        const role = o.role || (o.go ? "link" : o.onClick ? "button" : null);
        return h("div", Object.assign({ class: "k-row", role, "aria-selected": o.selected && (!role || o.role) ? "true" : null, "aria-current": o.selected && role && !o.role ? "true" : null }, act(o)), o.icon ? icon(o.icon) : null, o.swatch || null, h("span", { class: "k-grow k-ellipsis" }, o.label), o.trail != null ? h("span", { class: "k-secondary k-num" }, o.trail) : null);
    }
    function field(value, o) {
        o = o || {};
        return h("span", Object.assign({ class: "k-field" + (o.span ? " k-span" : ""), role: o.go || o.onClick ? "button" : null }, act(o)), o.icon ? icon(o.icon, "sm") : null, h("span", { class: "k-grow k-ellipsis" }, value), o.caret ? h("span", { class: "k-caret" }, icon("chevron-down", "sm")) : null);
    }

    // ---------- one empty state (spec 2.5) ----------
    // empty("No notes.", { verb: "Add note", key: "N", go | onClick }) -> "No notes. Add note (N)"
    function empty(text, o) {
        o = o || {};
        const verb = o.verb ? h("span", Object.assign({ class: "ab-link", role: o.go ? "link" : "button" }, act(o)), o.verb) : null;
        return h("div", { class: "ab-empty" }, text, verb ? [" ", verb, o.key ? " (" + o.key + ")" : null] : null);
    }
    const noMatch = (q) => empty('No match for "' + q + '"');

    // ---------- one "+" (spec 2.5): only in a section or list header ----------
    // plus({ label: "Add to Line", items: ["Width", { label, desc, needs }], onAdd(item), go, fields })
    // One item: "+" adds it. Two or more: a dark menu; past 15 the field list at menu size (with
    // `fields`, a fieldList options object, it lists those fields at any length). None: nothing.
    // `go` sends "+" to a route instead of the local menu (a picker section that draws its own).
    function plus(o) {
        o = o || {};
        const items = (o.items || []).map((x) => (typeof x === "string" ? { label: x } : x));
        if (!items.length && !o.go && !o.fields) return null;
        const b = iconButton("plus", o.label || (items.length === 1 ? "Add " + items[0].label : "Add"), {
            onClick: () => {
                if (items.length === 1 && !o.go) return o.onAdd && o.onAdd(items[0]);
                if (o.go) return go(o.go[0], o.go[1]);
                // Past 15 items the menu is the field list at menu size: its fields when the items are
                // fields (o.fields: fieldList options), else its find over these items
                if (o.fields) return openFieldList(b, Object.assign({}, o.fields, { onPick: (name, type, f) => o.onAdd && o.onAdd(Object.assign({ label: name, type }, f)) }));
                const list = items.map((it) => Object.assign({}, it, { onClick: () => o.onAdd && o.onAdd(it) }));
                if (items.length > 15) openFieldList(b, { items: list });
                else openMenu(b, list);
            },
        });
        b.classList.add("ab-plus");
        if (items.length > 1 || o.go || o.fields) b.setAttribute("aria-haspopup", items.length > 15 || o.fields ? "listbox" : "menu");
        return b;
    }
    // A new item opens into rename with its name selected: createThenRename(rowEl, { onSave })
    function createThenRename(el, o) {
        const nameEl = el.querySelector(".ab-tname, .k-name, [data-name]") || el;
        renameInPlace(nameEl, Object.assign({ focusAfter: el }, o || {}));
    }

    // ---------- notes ----------
    // The Notes section every inspector ends with (read-only, so collapsible): "2 notes -- Open in
    // Notes", or "No notes. Add note (N)". Folders, attributes, sources and saved views have none.
    const NO_NOTES = ["folder", "attribute", "source", "saved-view", "view"];
    // Notes saved in this page view, newest first (the Notes place writes them): every count reads
    // the fixture's count plus these, so a saved note shows the same number in every place
    AB.sessionNotes = [];
    const sessionCount = (targets) => AB.sessionNotes.filter((n) => n.about.some((t) => targets.some((x) => x.label === t.label && (x.go || [])[0] === (t.go || [])[0]))).length;
    function notesSection(count, target, kind) {
        if (NO_NOTES.includes(kind)) { console.warn("notesSection: a " + kind + " cannot be a note's subject"); return null; }
        const t = target || ["notes-place", "about-selection"];
        const build = (c) => {
            const n = c ? c + (c === 1 ? " note" : " notes") : null;
            // The count names what it opens: one link, the notes about this thing (no second "Open in" link)
            return section({ title: "Notes", collapsible: true, key: "notes." + (kind || "any"), summary: n || "No notes" },
                // Add note stays offered beside a count, so the thing shown can always get another note
                n ? h("div", { class: "k-data" }, link(n && c > count ? "notes-place" : t[0], n && c > count ? "all" : t[1], n, { class: "ab-link" }),
                    h("span", { class: "k-secondary" }, " . "), h("span", Object.assign({ class: "ab-link", role: "button" }, act({ onClick: () => addNote() })), "Add note"), h("span", { class: "k-secondary" }, " (N)"))
                    : empty(kind === "graph" ? "No notes about the graph itself." : "No notes.", { verb: "Add note", key: "N", onClick: () => addNote() }));
        };
        const sec = build(count);
        // The subject is known once the inspector's head is drawn
        if (AB.sessionNotes.length) requestAnimationFrame(() => { if (!sec.isConnected) return; const extra = sessionCount(noteSubject().targets); if (extra) sec.replaceWith(build((count || 0) + extra)); });
        return sec;
    }

    // Add note, the one gesture (spec 2.1): it writes about the subject the inspector shows; with
    // nothing selected, or a kind that cannot have notes (a folder, an attribute, a saved view), the
    // graph. Every door (N, the selection bar, "+" in Notes, any menu's Add note, an empty Notes
    // section) calls addNote(); the editor reads AB.noteDraft, and the inspector stays as it was.
    const SUBJECT_ICON = { "inspector-node": "circle-dot", "inspector-edge": "spline", "inspector-run-row": ICON.run, "inspector-measure-row": "chart-column", "inspector-attribute-and-filter-step": ICON.filter, "inspector-several-elements": "circle-dot" };
    // The graph a note is about when nothing is selected: the graph of the project on screen
    const GRAPH_STATE = { lesmis: "overview", doorEntries: "door-entries", transactions: "transfers", wide: "wide", nested: "wide", plainJson: "wide" };
    function noteSubject() {
        const r = AB.route, ds = (r && r.frame.dataset) || "lesmis", D = AB.fx.datasets[ds];
        const gname = ds === "lesmis" ? "Co-appearances" : ds === "transactions" ? D.frame.graphRow : D.graphName;
        const gs = GRAPH_STATE[ds] || "overview";
        const graph = { dataset: ds, targets: [{ label: gname, icon: "network", go: ["inspector-nothing-selected", gs] }], right: "inspector-nothing-selected/" + gs };
        const sub = noteSubjectOf(r, graph, gname);
        sub.dataset = ds;
        sub.graph = graph.targets[0];
        return sub;
    }
    function noteSubjectOf(r, graph, gname) {
        if (!r) return graph;
        const ref = r.sec.region === "right" ? r.id + "/" + r.state : r.frame.right;
        if (!ref || typeof ref !== "string") return graph;
        const [id, state = ""] = ref.split("/");
        if (id === "inspector-nothing-selected" || id === "inspector-folder" || id === "inspector-saved-view" || (id === "inspector-attribute-and-filter-step" && !/filter-step/.test(state))) return graph;
        if (id === "inspector-several-elements" && state === "two-nodes") return { right: ref, targets: [{ label: "Valjean", icon: "circle-dot", go: ["inspector-node", "data"] }, { label: "Javert", icon: "circle-dot", go: ["inspector-node", "data"] }] };
        const name = document.querySelector("#ab-right .ab-insp-head .k-name");
        const sw = document.querySelector("#ab-right .ab-insp-head .ab-sw-slot [style]");
        const label = name ? name.textContent.trim() : gname;
        return { right: ref, targets: [{ label, icon: SUBJECT_ICON[id] || "circle-dot", swatch: sw ? sw.style.background || sw.style.backgroundColor : null, go: [id, state] }] };
    }
    function addNote(subject) {
        AB.noteDraft = subject || noteSubject();
        // Where the editor was opened from: Esc goes back there, focus on the control that opened it
        if (location.hash !== href("notes-place", "writing")) AB.noteFrom = { hash: location.hash, focus: AB.describeFocus() };
        if (location.hash === href("notes-place", "writing")) AB.render();
        else go("notes-place", "writing");
    }
    // The Paints line and the paint-order line that open every painting row's Style tab (spec 5.1).
    // paintsLine("Paints 10 nodes", ["table-dock", "nodes"]) : the count is a link that selects.
    // (Version 2's paintsLine("10 nodes: ", link, { title }) still draws, prefixed "Paints ".)
    function paintsLine(...args) {
        if (typeof args[0] === "string" && (args.length === 1 || Array.isArray(args[1])) && /^Paints\b/.test(args[0])) {
            const t = args[0].replace(/^(Paints [\d,]+ nodes?) and /, "$1, ");
            return h("div", { class: "ab-paints" }, args[1] ? link(args[1][0], args[1][1], t, { class: "ab-link ab-paints-link" }) : t);
        }
        const o = args.length && args[args.length - 1] && args[args.length - 1].constructor === Object ? args.pop() : {};
        const el = h("div", { class: "ab-paints" }, h("span", null, "Paints ", args));
        if (o.title) tip(el, o.title, { label: false });
        return el;
    }
    // One line, one grammar: "Covered for Color by PageRank". The long form (how many, what scope) is its tooltip.
    function paintOrderLine(text) {
        if (!text) return null;
        // The same rule for a line built with a link: ["Covered by ", link, " for Color on 10 of 10"]
        if (Array.isArray(text) && text[0] === "Covered by " && typeof text[2] === "string") {
            const m2 = text[2].match(/^ for ([A-Za-z ]+?)(?: on .*)?$/);
            if (m2) {
                const el = h("div", { class: "ab-paint-order k-secondary k-ellipsis" }, "Covered for " + m2[1] + " by ", text[1], text.slice(3));
                return tip(el, "Covered by " + text[1].textContent + text[2] + text.slice(3).map((x) => (x && x.textContent) || x || "").join(""), { label: false });
            }
        }
        const m = typeof text === "string" && text.match(/^Covered by (.+?) for ([A-Za-z ,]+?)(?: on [^.]*)?\.?(?:\s.*)?$/);
        const short = m ? "Covered for " + m[2] + " by " + m[1] : text;
        const el = h("div", { class: "ab-paint-order k-secondary k-ellipsis" }, short);
        if (typeof text === "string") tip(el, text, { label: false });
        return el;
    }

    // tabs(["Style", "Data"], "Style", onChange) -> tablist; switches in place
    function tabs(names, active, onChange) {
        const list = h("div", { class: "k-tabs", role: "tablist" });
        names.forEach((n) => {
            const t = h("span", { class: "k-tab", role: "tab", tabindex: n === active ? "0" : "-1", "aria-selected": String(n === active) }, n);
            const pick = () => {
                list.querySelectorAll(".k-tab").forEach((x) => { x.setAttribute("aria-selected", String(x === t)); x.tabIndex = x === t ? 0 : -1; });
                onChange && onChange(n);
            };
            t.addEventListener("click", pick);
            t.addEventListener("keydown", (e) => {
                const all = [...list.querySelectorAll(".k-tab")];
                const i = all.indexOf(t);
                const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key];
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); }
                else if (to != null) { e.preventDefault(); const n2 = all[(to + all.length) % all.length]; n2.focus(); n2.click(); }
            });
            list.append(t);
        });
        return list;
    }
    // A segmented control: one Tab stop, arrows move and select. seg([["node", "Nodes"], ...], value, onChange, { label })
    function seg(options, value, onChange, o) {
        const g = h("span", { class: "k-seg", role: "radiogroup", "aria-label": (o && o.label) || null });
        const btns = options.map(([v, label, extra]) => {
            const b = h("span", { role: "radio", tabindex: v === value ? "0" : "-1", "aria-checked": String(v === value) }, label, extra || null);
            b.addEventListener("click", () => onChange(v));
            return b;
        });
        g.addEventListener("keydown", (e) => {
            const i = btns.indexOf(document.activeElement);
            // Space checks the focused radio (the ARIA radio pattern); the arrows move and check
            if (i >= 0 && e.key === " ") { e.preventDefault(); e.stopPropagation(); if (btns[i].getAttribute("aria-checked") !== "true") btns[i].click(); return; }
            const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
            if (i < 0 || !d) return;
            e.preventDefault();
            const n = btns[(i + d + btns.length) % btns.length];
            n.focus();
            n.click();
        });
        append(g, btns);
        return g;
    }

    // ---------- live announcements and rename in place ----------
    function announce(text) {
        let live = document.getElementById("ab-live");
        if (!live) document.body.append((live = h("div", { id: "ab-live", class: "k-sr", "aria-live": "polite" })));
        live.textContent = "";
        setTimeout(() => (live.textContent = text), 30);
    }
    // Turn a name element into a text field, text selected. Enter or blur saves, Esc cancels,
    // an empty name restores the old one. o: { onSave(name), onTab(dir), focusAfter }
    function renameInPlace(nameEl, o) {
        o = o || {};
        const old = nameEl.textContent;
        const input = h("input", { class: "ab-rename", type: "text", value: old, "aria-label": "Rename " + old, spellcheck: "false" });
        let done = false;
        const finish = (save, dir) => {
            if (done) return;
            done = true;
            const name = save ? input.value.trim() || old : old;
            nameEl.textContent = name;
            input.replaceWith(nameEl);
            if (save && name !== old) { o.onSave && o.onSave(name); announce("Renamed to " + name); }
            else announce(save ? "Name unchanged: " + old : "Rename cancelled");
            if (dir && o.onTab) o.onTab(dir);
            else if (o.focusAfter) o.focusAfter.focus();
        };
        input.addEventListener("keydown", (e) => {
            e.stopPropagation();
            if (e.key === "Enter") { e.preventDefault(); finish(true); }
            else if (e.key === "Escape") { e.preventDefault(); finish(false); }
            else if (e.key === "Tab" && o.onTab) { e.preventDefault(); finish(true, e.shiftKey ? -1 : 1); }
        });
        input.addEventListener("blur", () => finish(true));
        ["click", "dblclick", "mousedown"].forEach((ev) => input.addEventListener(ev, (e) => e.stopPropagation()));
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        announce("Renaming " + old);
    }
    // Why a name cannot change here: a built-in row, or a rename graphty-element cannot store yet.
    // A reason written as a full sentence (a capital first letter) is a design choice and reads as
    // is; a lowercase fragment is an element gap and gets the "needs graphty-element" lead.
    function renameRefusal(r) {
        if (r.builtin) return "Built-in rows keep their names";
        if (!r.renameDisabled) return null;
        if (/^[A-Z]/.test(r.renameDisabled)) return r.renameDisabled;
        // the study build says what a participant can do instead, never which library lacks what
        if (studyView()) { const next = r.renameDisabled.split(/; |\. /).slice(1).join(". "); return "This name cannot be changed" + (next && !/graphty-element/.test(next) ? ". " + next.replace(/^\w/, (c) => c.toUpperCase()) : ""); }
        return "Rename needs graphty-element: " + r.renameDisabled;
        return null;
    }

    // ---------- design notes: one chip for "needs graphty-element" and "Open question" ----------
    // Placed after the control it qualifies; its text is the tooltip. "Hide design notes" in the review
    // bar hides every chip, every menu item marked `needs` and every control marked data-needs.
    function designNote(word, text) {
        const c = h("span", { class: "ab-design-note", tabindex: "0", role: "note", "aria-label": word + ": " + text }, word);
        return tip(c, text, { label: false });
    }
    const needsElement = (reason) => designNote("needs graphty-element", reason);
    const openQuestion = (text) => designNote("Open question", text);

    // ---------- the inspector: one frame for every kind of selected thing (spec 5.1) ----------
    // inspector({ icon, swatch, title, kind, kindKey, locked, provenance: [label, id, state], menu: [id, state],
    //   stateBar: { text, why, actions: [{ label, go|onClick }] (at most two) }, changed, builtin, renameDisabled,
    //   onRename(name), tabs: { Style: fn|node, Data: fn|node }, tab, body })
    // Line 1 mirrors the tree row: kind icon, swatch, name, lock. Line 2: kind word, provenance, "...".
    // Tabs draw only with two or more; a single body starts right under the header (no spacer).
    // The tab last chosen is remembered per kind.
    const lastTab = {};
    let inspSeq = 0;
    function inspector(o) {
        if (o.meta) console.warn("inspector(" + o.title + "): meta is gone; open the Style tab with paintsLine()");
        const wrap = h("div", { class: "ab-insp", "data-changed": o.changed ? "" : null });
        // A node reached by the canvas walk (Shift+Arrow) is named in the header (the shell sets AB.walked)
        const W = AB.walked;
        if (W && (o.kindKey || o.kind) === "node" && AB.route && AB.route.frame.right === W.right) o = Object.assign({}, o, { title: W.name, swatch: null });
        const no = renameRefusal(o);
        // The name is text, not a button: rename is double-click or F2, as on every name (spec 3.6)
        const name = h("span", { class: "k-name k-strong k-ellipsis", tabindex: "0", "aria-keyshortcuts": no ? null : "F2", "aria-description": no ? null : "Double-click or F2 renames" }, o.title);
        if (no) tip(name, no, { label: false });
        const startRename = () => (no ? announce(no) : renameInPlace(name, { onSave: o.onRename, focusAfter: name }));
        name.addEventListener("dblclick", (e) => { e.stopPropagation(); startRename(); });
        name.addEventListener("keydown", (e) => { if (e.key === "F2" || (e.key === "Enter" && !no)) { e.preventDefault(); startRename(); } });
        // The shared out-of-date mark (the tree's and the Data place's triangle); a dot means only "this side sets something"
        const changed = o.changed ? tip(h("span", { class: "ab-changed", role: "img" }, icon("triangle-alert", "sm")), typeof o.changed === "string" ? o.changed : "Out of date: changed since it was last computed") : null;
        wrap.append(h("div", { class: "ab-insp-head", role: "heading", "aria-level": "2" },
            o.icon ? h("span", { class: "ab-kind" }, typeof o.icon === "string" ? icon(o.icon) : o.icon) : null,
            o.swatch ? h("span", { class: "ab-sw-slot" }, typeof o.swatch === "string" ? chit(o.swatch) : o.swatch) : null,
            name, o.locked ? tip(h("span", { class: "ab-lock", role: "img" }, icon("lock", "sm")), "Locked") : null, changed));
        // Provenance that names the place already on screen is text, not a link that goes nowhere
        const here = o.provenance && AB.route && [AB.route.frame.left, AB.route.id + "/" + AB.route.state].includes(o.provenance[1] + "/" + o.provenance[2]);
        const prov = !o.provenance ? null : here ? h("span", { class: "ab-prov k-ellipsis k-secondary", tabindex: "0" }, o.provenance[0]) : link(o.provenance[1], o.provenance[2], o.provenance[0], { class: "ab-link ab-prov k-ellipsis" });
        if (prov) tip(prov, o.kind ? o.kind + " " + o.provenance[0] : o.provenance[0], { label: false }); // a long source name is never lost to the ellipsis
        wrap.append(h("div", { class: "ab-insp-sub" }, o.kind ? h("span", { class: "k-secondary" }, o.kind) : null, prov, h("span", { class: "k-grow" }),
            // menu: [id, state] (a context-menus state), or a function of the button that opens a menu in place
            o.menu ? iconButton("ellipsis", "More actions", typeof o.menu === "function" ? { key: "Shift+F10", onClick: (e) => o.menu(e.currentTarget) } : { key: "Shift+F10", go: o.menu }) : null));
        if (o.stateBar) {
            const txt = h("span", { class: "k-grow k-ellipsis" }, o.stateBar.text);
            if (o.stateBar.why || typeof o.stateBar.text === "string") tip(txt, o.stateBar.why || o.stateBar.text, { label: false });
            wrap.append(h("div", { class: "ab-statebar", role: "status" }, txt,
                (o.stateBar.actions || []).slice(0, 2).map((a, i) => button(a.label, Object.assign({ kind: i ? "ghost" : "secondary" }, a)))));
        }
        const body = h("div", { class: "k-scroll ab-insp-body" });
        const names = o.tabs ? Object.keys(o.tabs) : [];
        const put = (c) => append(body, [typeof c === "function" ? c() : c]);
        if (names.length >= 2) {
            const key = o.kindKey || o.kind || o.title;
            let cur = o.tab || lastTab[key] || names[0];
            if (!names.includes(cur)) cur = names[0];
            const id = "ab-insp-" + ++inspSeq;
            const strip = tabs(names, cur, (n) => show(n));
            const tabEls = [...strip.querySelectorAll(".k-tab")];
            tabEls.forEach((t, i) => { t.id = id + "-tab-" + i; t.setAttribute("aria-controls", id + "-panel"); });
            body.id = id + "-panel";
            body.setAttribute("role", "tabpanel");
            const show = (n) => { lastTab[key] = n; body.setAttribute("aria-labelledby", tabEls[names.indexOf(n)].id); body.replaceChildren(); put(o.tabs[n]); };
            wrap.append(h("div", { class: "ab-insp-tabs" }, strip));
            show(cur);
        } else {
            wrap.classList.add("ab-insp-single");
            put(names.length ? o.tabs[names[0]] : o.body);
        }
        wrap.append(body);
        return wrap;
    }
    // Every Data tab uses these section names, in this order, any empty one left out (spec 5.1 item 5)
    const dataVocab = ["Summary", "Members", "Values", "Sizes", "Memberships", "Painted by", "Made with", "Notes"];
    // dataTab({ Summary: [nodes] | { summary, body }, "Made with": ..., Notes: { count, target } }, { kind })
    // Sections are read-only, so collapsible, remembered per kind ("data.run.made-with").
    function dataTab(parts, o) {
        o = o || {};
        const kind = o.kind || "any";
        const names = Object.keys(parts).filter((k) => parts[k] != null && parts[k] !== false);
        const rank = (n) => (dataVocab.includes(n) ? dataVocab.indexOf(n) : dataVocab.length - 1.5);
        names.sort((a, b) => rank(a) - rank(b));
        return names.map((n) => {
            const v = parts[n];
            if (n === "Notes") return notesSection(v.count || 0, v.target, kind);
            const body = Array.isArray(v) || v instanceof Node ? v : v.body;
            return section({ title: n, collapsible: true, key: "data." + kind + "." + n.toLowerCase().replace(/\s+/g, "-"), summary: v.summary || null }, body);
        });
    }

    // ---------- the paint tree (spec 3.3, 3.10) ----------
    // tree(rows, { label, onEye, go }) ; row = { id, kindIcon, swatch, name, count, notes, notesInside, eye: true|false|null,
    //   locked, pinned, builtin, renameDisabled: "reason", onRename(name), onDelete(), children, open, selected, dim,
    //   go: [id, state] (or onOpen(), a screen computed when the row opens), menu: [id, state], status: "running"|"queued"|"partial"|"stale"|"error"|"filtered", statusText,
    //   progress: 0..1 (the running bar under the row) }
    // Fixed trailing slots: count, note count, one slot shared by lock and eye. Status replaces the kind icon.
    // Keyboard (one Tab stop): arrows, Home, End, Left/Right collapse and expand, Enter opens, Space the eye,
    // F2 renames, Delete deletes (with Undo), Shift+F10 the row menu, Mod+] and Mod+[ move the row.
    const STATUS = { running: ["loader-circle", "running"], queued: ["clock", "queued"], partial: ["triangle-alert", "partial"], stale: ["triangle-alert", "out of date"], error: ["circle-x", "failed"], filtered: ["triangle-alert", "computed before the current filter"] }; // the funnel is for data filters only
    function statusOf(r) {
        if (r.status) return r.status;
        if (typeof r.progress === "number" || typeof r.progress === "string") return "running";
        if (r.queued) return "queued";
        if (r.partial) return "partial";
        return null;
    }
    function tree(rows, opts) {
        opts = opts || {};
        opts.rootRows = opts.rootRows || rows;
        const ul = h("ul", { class: "ab-tree", role: "tree", "aria-label": opts.label || "Paint order" });
        const all = [];
        opts.el = ul; // the tree on screen: an Undo after a redraw replaces that one, not this
        const rebuild = (focusId) => {
            const cur = opts.el && opts.el.isConnected ? opts.el : ul;
            const fresh = tree(opts.rootRows, opts);
            cur.replaceWith(fresh);
            const f = focusId && fresh.querySelector(`[data-row="${CSS.escape(focusId)}"]`);
            if (f) { fresh.querySelectorAll(".ab-trow").forEach((x) => (x.tabIndex = x === f ? 0 : -1)); f.focus(); }
            return fresh;
        };
        const rowId = (r) => String(r.id || r.name);
        const startRename = (entry) => {
            const no = renameRefusal(entry.r);
            if (no) return announce(no);
            renameInPlace(entry.li.querySelector(".ab-tname"), {
                focusAfter: entry.li,
                onSave: (name) => { entry.r.name = name; entry.r.onRename && entry.r.onRename(name); },
                onTab: (dir) => {
                    const live = all.filter((x) => x.li.isConnected && !renameRefusal(x.r));
                    const next = live[live.indexOf(entry) + dir];
                    if (next) startRename(next);
                    else entry.li.focus();
                },
            });
        };
        const build = (r, level, siblings, parent) => {
            const st = statusOf(r);
            const words = st ? STATUS[st][1] : null;
            const li = h("li", { class: "ab-trow", role: "treeitem", "data-row": rowId(r), "aria-level": String(level), "aria-selected": r.selected ? "true" : "false", "aria-label": r.name + (words ? ", " + words : ""), "aria-expanded": r.children && r.children.length ? String(!!r.open) : null, "data-dim": r.dim ? "" : null, "data-pinned": r.pinned ? "" : null, "data-locked": r.locked ? "" : null, "data-eye-off": r.eye === false ? "" : null, style: `--lvl:${level - 1}`, tabindex: "-1" });
            const hasKids = r.children && r.children.length;
            const disc = h("span", { class: "ab-disc" }, hasKids ? icon(r.open ? "chevron-down" : "chevron-right", "sm") : null);
            const kind = st
                ? tip(h("span", { class: "ab-kind ab-status", "data-status": st }, icon(STATUS[st][0])), r.statusText || (typeof r.progress === "string" ? r.progress : typeof r.queued === "string" ? r.queued : typeof r.partial === "string" ? r.partial : r.name + " is " + words), { label: false })
                : h("span", { class: "ab-kind" }, r.kindIcon ? (typeof r.kindIcon === "string" ? icon(r.kindIcon) : r.kindIcon) : null);
            const nameEl = h("span", { class: "ab-tname k-ellipsis" }, r.name);
            const no = renameRefusal(r);
            if (no) tip(nameEl, no, { label: false });
            const noteN = r.notes || (!r.open && r.notesInside) || null;
            const notes = h("span", { class: "ab-tnotes k-num" }, noteN ? [icon(ICON.note, "sm"), noteN] : null);
            if (noteN) tip(notes, r.notes ? noteN + (noteN === 1 ? " note" : " notes") : noteN + " notes inside", { label: false });
            const eye = r.eye == null ? null : h("span", { class: "ab-eye", role: "button", tabindex: "-1", "aria-pressed": String(!!r.eye) }, icon(r.eye ? "eye" : "eye-off"));
            if (eye) tip(eye, (r.eye ? "Hide " : "Show ") + r.name, { second: "Alt-click or Alt+Space: show only this row" });
            const le = h("span", { class: "ab-le" }, r.locked ? tip(h("span", { class: "ab-lock" }, icon("lock", "sm")), "Locked", { label: false }) : null, eye);
            append(li, [disc, kind, h("span", { class: "ab-sw-slot" }, r.swatch || null), nameEl,
                r.countTip && r.count != null ? tip(h("span", { class: "ab-tcount k-num", role: "img", "aria-label": r.count + " " + r.countTip.toLowerCase() }, r.count), r.count + " " + r.countTip.toLowerCase(), { label: false }) : h("span", { class: "ab-tcount k-num" }, r.count != null ? r.count : null), notes, le,
                typeof r.progress === "number" ? h("span", { class: "ab-tbar", role: "progressbar", "aria-valuenow": String(Math.round(r.progress * 100)), "aria-label": r.name + " progress" }, h("i", { style: `width:${Math.round(r.progress * 100)}%` })) : null]);
            ul.append(li);
            const entry = { li, r, siblings, parent };
            all.push(entry);
            li._entry = entry;
            // One click selects in place and the shell keeps the left panel, so the real dblclick lands here
            nameEl.addEventListener("dblclick", (e) => { e.stopPropagation(); startRename(entry); });
            if (eye)
                eye.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (e.detail > 1) return; // the second click of a double-click: one toggle only
                    if (e.altKey) {
                        const solo = !li.hasAttribute("data-solo");
                        all.forEach(({ li: x }) => x.removeAttribute("data-solo") || x.toggleAttribute("data-struck", solo && x !== li));
                        if (solo) li.setAttribute("data-solo", "");
                        return;
                    }
                    r.eye = !r.eye;
                    eye.replaceChildren(icon(r.eye ? "eye" : "eye-off"));
                    eye.setAttribute("aria-pressed", String(!!r.eye));
                    li.toggleAttribute("data-eye-off", !r.eye);
                    tip(eye, (r.eye ? "Hide " : "Show ") + r.name, { second: "Alt-click or Alt+Space: show only this row" });
                    announce(r.name + (r.eye ? " shown" : " hidden"));
                    opts.onEye && opts.onEye(r);
                });
            if (hasKids)
                disc.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (e.detail > 1) return;
                    r.open = !r.open;
                    rebuild(rowId(r));
                });
            const target = r.go || opts.go;
            if (target) {
                li.dataset.nav = href(target[0], target[1]);
                li.addEventListener("click", (e) => {
                    if (e.detail > 1) { clearTimeout(li._wait); return; }
                    all.forEach((x) => { x.li.setAttribute("aria-selected", String(x.li === li)); x.li.tabIndex = x.li === li ? 0 : -1; });
                    const open = () => { if (location.hash !== li.dataset.nav) { AB.keepLeft = true; go(target[0], target[1]); } };
                    // A row whose target replaces the left panel (waitDouble) waits out the double-click
                    // interval, so a double-click on its name still renames; Enter (detail 0) opens at once
                    if (r.waitDouble && e.detail === 1) li._wait = setTimeout(open, 350);
                    else open();
                });
            } else if (r.onOpen) {
                // a row whose screen is computed when it opens (a filter step hands its rule over); the left panel stays
                li.dataset.opens = "";
                li.addEventListener("click", (e) => {
                    if (e.detail > 1) return;
                    all.forEach((x) => { x.li.setAttribute("aria-selected", String(x.li === li)); x.li.tabIndex = x.li === li ? 0 : -1; });
                    AB.keepLeft = true;
                    r.onOpen();
                });
            }
            if (r.menu) li.addEventListener("contextmenu", (e) => { e.preventDefault(); go(r.menu[0], r.menu[1]); });
            if (hasKids && r.open) r.children.forEach((c) => build(c, level + 1, r.children, r));
        };
        rows.forEach((r) => build(r, 1, rows, null));
        // Roving focus: the selected row (or the first) is the tree's one Tab stop
        const sel = all.find((x) => x.r.selected) || all[0];
        if (sel) sel.li.tabIndex = 0;
        ul.addEventListener("keydown", (e) => {
            const li = e.target.closest && e.target.closest(".ab-trow");
            if (!li || e.target !== li) return;
            const entry = li._entry, r = entry.r;
            const items = [...ul.querySelectorAll(".ab-trow")];
            const i = items.indexOf(li);
            const mod = e.ctrlKey || e.metaKey;
            const move = (n) => { if (!n) return; items.forEach((x) => (x.tabIndex = x === n ? 0 : -1)); n.focus(); };
            const k = e.key;
            if (k === "ArrowDown") move(items[i + 1]);
            else if (k === "ArrowUp") move(items[i - 1]);
            else if (k === "Home") move(items[0]);
            else if (k === "End") move(items[items.length - 1]);
            else if (k === "ArrowRight" && r.children && r.children.length) { if (!r.open) { r.open = true; rebuild(rowId(r)); } else move(items[i + 1]); }
            else if (k === "ArrowLeft") { if (r.open && r.children && r.children.length) { r.open = false; rebuild(rowId(r)); } else if (entry.parent) move(ul.querySelector(`[data-row="${CSS.escape(rowId(entry.parent))}"]`)); }
            else if (k === "Enter") { if (li.dataset.nav || "opens" in li.dataset) li.click(); }
            // Space flips the eye; Alt+Space is "Show only this row" (the row menu's command; Alt-click is its accelerator)
            else if (k === " ") { const eye = li.querySelector(".ab-eye"); if (eye) { e.preventDefault(); eye.dispatchEvent(new MouseEvent("click", { altKey: e.altKey, bubbles: true, detail: 1 })); } }
            else if (k === "F2") startRename(entry);
            else if (k === "F10" && e.shiftKey || k === "ContextMenu") { if (r.menu) go(r.menu[0], r.menu[1]); }
            else if (k === "Delete" || k === "Backspace") {
                if (r.builtin || r.pinned) { announce(r.name + " is built in and cannot be deleted"); }
                else {
                    const at = entry.siblings.indexOf(r);
                    entry.siblings.splice(at, 1);
                    r.onDelete && r.onDelete();
                    const near = entry.siblings[Math.min(at, entry.siblings.length - 1)] || entry.parent;
                    rebuild(near ? rowId(near) : null);
                    deleted(r.name, () => { entry.siblings.splice(at, 0, r); rebuild(rowId(r)); });
                }
            }
            else if (mod && (k === "]" || k === "[")) {
                const sib = entry.siblings, at = sib.indexOf(r), to = at + (k === "]" ? -1 : 1);
                if (r.pinned || to < 0 || to >= sib.length || sib[to].pinned) return announce(r.name + " cannot move further");
                sib.splice(at, 1);
                sib.splice(to, 0, r);
                rebuild(rowId(r));
                announce("Moved " + r.name + (k === "]" ? " up" : " down"));
            }
            else return;
            e.preventDefault();
            e.stopPropagation();
        });
        return ul;
    }
    // One line under the tree; pass candidates most specific first and the first one wins:
    // treeFooter([["1 hidden row still paints.", linkNode], ["Analyze (Shift+A) to add results here", null]])
    function treeFooter(text, lnk) {
        const c = Array.isArray(text) ? text.find((x) => x && x[0]) : [text, lnk];
        if (!c) return null;
        return h("div", { class: "ab-tree-foot k-secondary" }, c[0], c[1] ? [" ", c[1]] : null);
    }

    // ---------- overlays ----------
    // Position `el` (already in the overlay layer) next to `anchor` (element or selector).
    // place: "below-start" | "below-end" | "above" | "above-start" | "above-end" | "right-start" | "center"  (menus, modals)
    //        "auto" (popovers): above the toolbar for an anchor in the toolbar or selection bar; left of the
    //        inspector, level with the anchor, for an anchor in the inspector; below-start elsewhere.
    function position(el, anchor, place) {
        const layer = document.getElementById("ab-overlay");
        const run = () => {
            const L = layer.getBoundingClientRect();
            const E = el.getBoundingClientRect();
            const a = typeof anchor === "string" ? document.querySelector(anchor) : anchor;
            let x, y;
            let p = place || "below-start";
            if (p === "auto") p = !a ? "center" : a.closest("#ab-toolbar") ? "above-toolbar" : a.closest("#ab-right") ? "left-of-inspector" : "below-start";
            if (!a || p === "center") {
                x = (L.width - E.width) / 2;
                y = Math.max(16, (L.height - E.height) / 3);
            } else {
                const A = a.getBoundingClientRect();
                const ax = A.left - L.left, ay = A.top - L.top;
                if (p === "above-toolbar") {
                    const T = document.getElementById("ab-toolbar").getBoundingClientRect();
                    x = ax + A.width / 2 - E.width / 2;
                    y = T.top - L.top - E.height - 8;
                } else if (p === "left-of-inspector") {
                    const R = document.getElementById("ab-right").getBoundingClientRect();
                    x = R.left - L.left - E.width - 8;
                    y = ay - 8;
                } else if (p === "below-end") { x = ax + A.width - E.width; y = ay + A.height + 4; }
                else if (p === "above") { x = ax + A.width / 2 - E.width / 2; y = ay - E.height - 8; }
                else if (p === "above-start") { x = ax; y = ay - E.height - 8; }
                else if (p === "above-end") { x = ax + A.width - E.width; y = ay - E.height - 8; }
                else if (p === "right-start") {
                    // a submenu opens beside the whole menu it came from, never over it: to the right, or to the
                    // left when the right has no room or its parent menu already opened to the left
                    const pm = a.closest(".k-menu, [role=menu], [role=listbox]"), M = (pm || a).getBoundingClientRect();
                    const right = ax + A.width + 4, left = M.left - L.left - E.width - 4;
                    const goLeft = (right + E.width > L.width - 8 || (pm && pm.closest("[data-side=left]"))) && left >= 8;
                    x = goLeft ? left : right; y = ay;
                    el.dataset.side = goLeft ? "left" : "right";
                }
                else { x = ax; y = ay + A.height + 4; }
                // a popover opening up from the table dock stays clear of the canvas toolbar above the dock
                const tb = /^above/.test(p) && a.closest("#ab-dock") && document.getElementById("ab-toolbar");
                const T = tb && tb.getBoundingClientRect();
                if (T && T.height && x < T.right - L.left && x + E.width > T.left - L.left && y + E.height > T.top - L.top - 8) {
                    const room = T.top - L.top - 16;
                    if (E.height > room) el.style.maxHeight = room + "px";
                    y = T.top - L.top - Math.min(E.height, room) - 8;
                }
            }
            x = Math.max(8, Math.min(x, L.width - E.width - 8));
            y = Math.max(8, Math.min(y, L.height - E.height - 8));
            el.style.left = x + "px";
            el.style.top = y + "px";
            el.style.visibility = "";
        };
        el.style.visibility = "hidden";
        requestAnimationFrame(run);
        return el;
    }
    // The one light popover for editing a value: popover({ anchor, title, body, foot, width, place })
    // A title and an X; each change applies live; Esc or a click outside closes it; focus starts on the
    // first field and returns to the anchor on close (the shell keeps the panels). `foot` only when the
    // popover creates something. Placement is "auto" unless `place` names a fixed one.
    function popover(o) {
        const p = h("div", { class: "k-popover ab-pop", role: "dialog", "aria-label": o.title || "", style: o.width ? `width:${o.width}px` : null });
        if (o.title) p.append(h("div", { class: "k-popover-head" }, h("span", { class: "k-grow k-ellipsis" }, o.title), iconButton("x", "Close", { key: "Esc", onClick: () => AB.close() })));
        const body = append(h("div", { class: "k-popover-body" }), [o.body]);
        p.append(body);
        if (o.foot) p.append(append(h("div", { class: "ab-pop-foot" }), [o.foot]));
        if (!p.querySelector("[data-autofocus]")) {
            const f = body.querySelector("input, select, textarea, [tabindex='0']");
            if (f) f.setAttribute("data-autofocus", "");
        }
        return position(p, o.anchor, o.place || "auto");
    }
    // menu({ anchor, place, label, items, back: [id, state], onClose })
    // item = { label, shortcut, go:[id,state], onClick, sub: true, check, disabled: true | "reason", desc, needs: "reason",
    //   toggle: [label when on, label when off], on } | { sep: true } | { heading: "..." }
    // One line per item; `desc` becomes the item's tooltip; a second line only says why an item is disabled.
    // Keyboard: Up, Down, Home, End, typeahead; Right or Enter opens a submenu, Left closes it (goes `back`);
    // Esc closes one level (`back`, else the shell's close). Hovering a submenu item opens it after 200 ms.
    function menu(o) {
        const m = h("div", { class: "k-menu ab-menu", role: "menu", "aria-label": o.label || null });
        (o.items || []).forEach((it) => {
            if (it.sep) return m.append(h("div", { class: "k-menu-sep", role: "separator" }));
            if (it.heading) return m.append(h("div", { class: "k-menu-label" }, it.heading));
            const label = it.toggle ? (it.on ? it.toggle[0] : it.toggle[1]) : it.label;
            const dis = !!(it.disabled || it.needs);
            const reason = it.needs ? null : typeof it.disabled === "string" ? it.disabled : it.disabled && it.desc ? it.desc : null;
            const target = it.go || it.onClick ? it : { onClick: () => AB.flash(label + " (not wired in the skeleton)") };
            const el = h("div", Object.assign({ class: "k-menu-item", role: it.check != null ? "menuitemcheckbox" : "menuitem", "aria-checked": it.check != null ? String(!!it.check) : null, "aria-disabled": dis ? "true" : null, "data-described": reason ? "" : null, "data-needs": it.needs ? "" : null, "aria-haspopup": it.sub ? "menu" : null, "aria-keyshortcuts": it.shortcut ? ariaKeys(it.shortcut) : null }, dis ? {} : act(target)),
                h("span", { class: "k-check-col" }, it.check ? icon("check", "sm") : null),
                reason ? h("span", null, label, h("span", { class: "k-menu-desc", "aria-hidden": "true" }, reason)) : h("span", null, label),
                it.needs ? needsElement(it.needs) : null,
                it.shortcut ? h("span", { class: "k-shortcut", "aria-hidden": "true" }, it.shortcut) : null,
                it.sub ? h("span", { class: "k-sub" }, icon("chevron-right", "sm")) : null);
            el.tabIndex = -1;
            if (reason) el.setAttribute("aria-description", reason);
            if (reason && typeof label === "string") el.setAttribute("aria-label", label);
            if (it.desc && !reason) tip(el, it.desc, { label: false });
            if (it.sub && !dis) {
                let t = 0;
                el.addEventListener("pointerenter", () => { t = setTimeout(() => el.click(), 200); });
                el.addEventListener("pointerleave", () => clearTimeout(t));
            }
            m.append(el);
        });
        m.addEventListener("keydown", (e) => {
            const items = [...m.querySelectorAll(".k-menu-item")];
            const cur = e.target.closest(".k-menu-item");
            const i = items.indexOf(cur);
            const to = (n) => { if (n) { n.focus(); } };
            const k = e.key;
            if (k === "ArrowDown") to(items[(i + 1) % items.length]);
            else if (k === "ArrowUp") to(items[(i - 1 + items.length) % items.length]);
            else if (k === "Home") to(items[0]);
            else if (k === "End") to(items[items.length - 1]);
            else if (k === "ArrowRight" && cur && cur.getAttribute("aria-haspopup") === "menu") cur.click();
            else if (k === " " && cur) cur.click();
            else if (k === "Tab") { if (o.onClose) o.onClose(); else if (o.back) go(o.back[0], o.back[1]); else AB.close(); }
            else if ((k === "ArrowLeft" || k === "Escape") && (o.back || o.onClose)) { if (o.onClose) o.onClose(); else go(o.back[0], o.back[1]); }
            else if (k.length === 1 && /\S/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const rest = items.slice(i + 1).concat(items.slice(0, i + 1));
                to(rest.find((x) => x.textContent.trim().toLowerCase().startsWith(k.toLowerCase())));
                if (e.target.tagName === "INPUT") return;
            } else return;
            e.preventDefault();
            e.stopPropagation();
        });
        return position(m, o.anchor, o.place);
    }
    // A local dark menu that is not a route (the "+" menu): openMenu(anchor, items). A list past 15
    // items is not a menu: it is the field list at menu size (openFieldList), which has the find.
    let localMenu = null;
    function closeMenu(refocus) {
        if (!localMenu) return;
        const { el, anchor, off } = localMenu;
        localMenu = null;
        el.remove();
        const layer = document.getElementById("ab-overlay");
        if (layer && !layer.childElementCount) layer.hidden = true;
        document.removeEventListener("pointerdown", off, true);
        if (refocus && anchor.isConnected) anchor.focus();
    }
    function openMenu(anchor, items) {
        if (items.length > 15) console.warn("openMenu: " + items.length + " items; past 15 use AB.openFieldList(anchor, { items })");
        // The control that opened the menu closes it again: a second click toggles
        if (localMenu && localMenu.anchor === anchor && localMenu.el.isConnected) { closeMenu(true); return null; }
        closeMenu();
        const layer = document.getElementById("ab-overlay");
        const wrapItems = (list) => list.map((it) => (it.sep || it.heading ? it : Object.assign({}, it, { onClick: () => { closeMenu(true); it.onClick && it.onClick(); } })));
        const m = menu({ anchor, place: "below-end", items: wrapItems(items), onClose: () => closeMenu(true), label: anchor.getAttribute("aria-label") });
        const off = (e) => { if (!m.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) closeMenu(); };
        localMenu = { el: m, anchor, off };
        layer.hidden = false; // the shell hides the layer while no overlay section shows
        layer.append(m);
        document.addEventListener("pointerdown", off, true);
        requestAnimationFrame(() => requestAnimationFrame(() => { const f = m.querySelector("input, .k-menu-item"); if (f) f.focus(); }));
        return m;
    }
    // The field list at menu size as a local popup (like openMenu): a second click on the anchor
    // closes it, a pick, Esc or Tab closes it and focus goes back to the anchor.
    // openFieldList(anchor, fieldList options; size is "menu")
    function openFieldList(anchor, o) {
        if (localMenu && localMenu.anchor === anchor && localMenu.el.isConnected) { closeMenu(true); return null; }
        closeMenu();
        const layer = document.getElementById("ab-overlay");
        const wrapPick = (fn) => (...a) => { closeMenu(true); if (fn) fn(...a); };
        const opts = Object.assign({}, o, { size: "menu", onPick: wrapPick(o.onPick), onClose: () => closeMenu(true), label: o.label || anchor.getAttribute("aria-label") });
        if (o.items) opts.items = o.items.map((it) => (it.sep || it.heading ? it : Object.assign({}, it, { onClick: wrapPick(it.onClick) })));
        const m = position(fieldList(opts), anchor, "below-end");
        const off = (e) => { if (!m.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) closeMenu(); };
        localMenu = { el: m, anchor, off };
        layer.hidden = false;
        layer.append(m);
        document.addEventListener("pointerdown", off, true);
        requestAnimationFrame(() => requestAnimationFrame(() => { const f = m.querySelector("input, .ab-fl-list"); if (f) f.focus(); }));
        return m;
    }
    window.addEventListener("hashchange", () => closeMenu());
    // One focus rule for overlays: Tab stays inside a modal (it wraps); Tab off either end of a light
    // popover closes it, and focus goes back to the control that opened it.
    document.addEventListener("keydown", (e) => {
        if (e.key !== "Tab") return;
        const layer = document.getElementById("ab-overlay");
        if (!layer || layer.querySelector(".ab-menu")) return; // a dark menu has its own Tab rule
        const modalBox = [...layer.querySelectorAll('[aria-modal="true"]')].pop();
        const pop = modalBox ? null : [...layer.querySelectorAll(".k-popover")].find((p) => p.contains(document.activeElement));
        const box = modalBox || pop;
        if (!box) return;
        const stops = [...box.querySelectorAll('input:not([disabled]):not([type="hidden"]), textarea, select, [tabindex="0"], a[href]')].filter((x) => x.getClientRects().length && !x.closest("[hidden]"));
        if (!stops.length) return;
        const i = stops.indexOf(document.activeElement);
        const atEnd = e.shiftKey ? i <= 0 : i === stops.length - 1 || i < 0;
        if (!atEnd) return;
        e.preventDefault();
        if (modalBox) (e.shiftKey ? stops[stops.length - 1] : stops[0]).focus();
        else AB.close();
    }, true);
    // modal({ title, body, foot, wide }) -> backdrop element (append to overlay el)
    function modal(o) {
        const tid = "ab-modal-title-" + ++inspSeq;
        const box = h("div", { class: "k-modal" + (o.wide ? " k-modal-wide" : ""), role: "dialog", "aria-modal": "true", "aria-labelledby": tid, on: { click: (e) => e.stopPropagation() } });
        box.append(h("div", { class: "k-modal-head" }, h("h2", { id: tid, class: "k-grow ab-modal-title" }, o.title), iconButton("x", "Close", { key: "Esc", onClick: () => AB.close() })));
        box.append(append(h("div", { class: "k-modal-body" }), [o.body]));
        if (o.foot) box.append(append(h("div", { class: "k-modal-foot" }), [o.foot]));
        return h("div", { class: "ab-modal-wrap" }, box);
    }
    // The one confirmation left (Forget all keys): "[Verb] [thing]?", one sentence on what is lost, Cancel and the verb
    function confirm(o) {
        return modal({
            title: o.verb + " " + o.thing + "?",
            body: h("p", { class: "ab-confirm" }, o.loss),
            foot: [button("Cancel", { kind: "secondary", onClick: () => AB.close() }), button(o.verb, { kind: "danger", onClick: () => (o.onConfirm ? o.onConfirm() : AB.close()) })],
        });
    }

    // ---------- one notice (spec 2.5) ----------
    // notice(text, { label, go | onClick }) shows in the shell's one slot, centered 8 px above the lowest
    // bar, for 6 s (paused while hovered), with at most one action. It returns an empty placeholder, so a
    // section that appends the result somewhere still gets the notice in the one slot.
    let noticeTimer = 0;
    function placeNotice() {
        const slot = document.getElementById("ab-notice");
        if (!slot || !slot.firstChild) return;
        const tb = document.getElementById("ab-toolbar");
        const T = tb && !tb.hidden && tb.offsetParent !== null && tb.childElementCount ? tb.getBoundingClientRect() : null;
        const N = slot.getBoundingClientRect();
        const app = document.getElementById("ab-app").getBoundingClientRect();
        slot.style.left = Math.max(8, (T ? T.left + T.width / 2 : app.left + app.width / 2) - N.width / 2) + "px";
        slot.style.top = (T ? T.top - N.height - 8 : app.bottom - N.height - 24) + "px";
    }
    // A reviewer's aside in a notice ("(not wired in the skeleton)") is for the review only: the study build drops it
    const SKELETON_ASIDE = /;\s*not (?:wired|modeled) in the skeleton(?=\))|\s*\([^()]*\bin the skeleton\)/g;
    function notice(text, action) {
        if (typeof text === "string" && studyView()) text = /needs graphty-element/i.test(text) ? (/^Rename/.test(text) ? "This name cannot be changed" : "Not available yet") : text.replace(SKELETON_ASIDE, "");
        const slot = document.getElementById("ab-notice");
        const n = h("div", { class: "k-toast ab-notice", role: "status" }, text);
        if (action) {
            const run = action.onClick;
            n.append(h("span", Object.assign({ class: "k-toast-action", role: "button" }, act(action.go ? { go: action.go } : { onClick: (e) => { hide(); run && run(e); } })), action.label));
        }
        const hide = () => { clearTimeout(noticeTimer); n.remove(); };
        const arm = () => { clearTimeout(noticeTimer); noticeTimer = setTimeout(hide, 6000); };
        n.addEventListener("pointerenter", () => clearTimeout(noticeTimer));
        n.addEventListener("pointerleave", arm);
        if (!slot) return n;
        slot.replaceChildren(n);
        requestAnimationFrame(placeNotice);
        arm();
        const ph = document.createComment("notice: " + text);
        ph.remove = function () { hide(); if (this.parentNode) this.parentNode.removeChild(this); };
        return ph;
    }
    // A control the skeleton does not model: the same notice, no action
    const flash = (text) => notice(text);
    // After any delete: "Deleted Louvain. Undo"
    function deleted(what, onUndo) {
        return notice("Deleted " + what, { label: "Undo", onClick: () => { onUndo && onUndo(); announce("Restored " + what); } });
    }
    // The table dock's collapse toggle; put it at the end of your dock's tab strip.
    function dockToggle() {
        const open = !document.querySelector(".ab-main[data-dock='closed']");
        return iconButton(open ? "chevron-down" : "chevron-up", open ? "Collapse the table" : "Open the table", { key: "Shift+T", onClick: () => AB.toggleDock() });
    }
    // The canvas drawing, both themes: drawing("lesmis-groups-rest", "alt text")
    function drawing(name, alt) {
        return [h("img", { class: "k-light-only", src: `kit/canvas/${name}-light.svg`, alt }), h("img", { class: "k-dark-only", src: `kit/canvas/${name}-dark.svg`, alt })];
    }

    // ---------- the toolbar (spec 2.3): five 32 px icon buttons, no text ----------
    // toolbarButton(icon, name, { key, popup: "dialog" | "menu", pressed, open, disabled: "reason", go, onClick, tool })
    // Blue fill = pressed (a toggle that is on); gray fill = open (its flyout or popover shows). `open`
    // defaults to "the overlay on screen is this button's go target". While a state card shows,
    // AB.toolbarDisabled ("Nothing is drawn") disables every button except Quick actions.
    function toolbarButton(ic, name, o) {
        o = o || {};
        const dis = o.disabled || (AB.toolbarDisabled && name !== "Quick actions" ? AB.toolbarDisabled : null);
        const ov = AB.route && AB.route.frame && AB.route.frame.overlay;
        const open = o.open != null ? o.open : !!(o.go && ov && ov.split("/")[0] === o.go[0]);
        const b = h("span", Object.assign({ class: "k-tool", role: "button", "data-tool": o.tool || name, "aria-disabled": dis ? "true" : null, "aria-haspopup": o.popup || null, "aria-expanded": o.popup ? String(!!open) : null, "aria-pressed": o.pressed == null ? null : String(!!o.pressed), "data-open": open ? "" : null }, dis ? {} : act(o)), icon(ic));
        b.tabIndex = -1;
        tip(b, name, { key: o.key, second: typeof dis === "string" ? dis : o.second });
        b.addEventListener("keydown", (e) => {
            if (dis) return;
            if (e.key === " " || (e.key === "ArrowDown" && e.altKey)) { e.preventDefault(); b.click(); }
        });
        return b;
    }
    // toolbarBar([button, "sep", button, ...], label) -> the bar: one Tab stop, arrow keys between buttons
    function toolbarBar(items, label) {
        const bar = h("div", { class: "k-toolbar", role: "toolbar", "aria-label": label || "Tools" }, items.map((x) => (x === "sep" ? h("span", { class: "k-toolbar-sep" }) : x)));
        rove(bar);
        return bar;
    }
    function rove(bar) {
        const btns = [...bar.querySelectorAll(".k-tool, .k-tool-caret")];
        if (!btns.some((b) => b.tabIndex === 0)) btns.forEach((b, i) => (b.tabIndex = i ? -1 : 0));
    }
    document.addEventListener("keydown", (e) => {
        const bar = e.target.closest && e.target.closest("[role='toolbar']");
        if (!bar || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key) || e.altKey) return;
        const btns = [...bar.querySelectorAll(".k-tool, .k-tool-caret")].filter((b) => b.offsetParent !== null);
        const i = btns.indexOf(e.target.closest(".k-tool, .k-tool-caret"));
        if (i < 0) return;
        const n = btns[{ ArrowLeft: (i - 1 + btns.length) % btns.length, ArrowRight: (i + 1) % btns.length, Home: 0, End: btns.length - 1 }[e.key]];
        e.preventDefault();
        btns.forEach((b) => (b.tabIndex = b === n ? 0 : -1));
        n.focus();
    });
    // Legend and layout state (spec 9): the legend is on by default and remembered per project; the
    // toolbar's Legend button and L are its only doors. The layout is running, paused or settled.
    const projectKey = () => (AB.route && AB.route.frame && AB.route.frame.dataset) || "lesmis";
    function legendOn() { return mem.get("legend." + projectKey()) !== "0"; }
    function setLegend(on) {
        mem.set("legend." + projectKey(), on ? "1" : "0");
        announce(on ? "Legend shown" : "Legend hidden");
        if (AB.render) AB.render();
    }
    AB.layoutState = "settled";
    function layoutButton() {
        const running = AB.layoutState === "running";
        return toolbarButton(running ? "pause" : "play", running ? "Pause layout" : "Resume layout", { tool: "Layout", onClick: () => setLayout(running ? "paused" : "running") });
    }
    function setLayout(state) {
        AB.layoutState = state;
        document.querySelectorAll("[data-tool='Layout']").forEach((old) => {
            const had = document.activeElement === old;
            const b = layoutButton();
            b.tabIndex = old.tabIndex;
            old.replaceWith(b);
            if (had) b.focus();
        });
        announce(state === "paused" ? "Layout paused" : state === "running" ? "Layout running" : "Layout settled");
    }
    const legendButton = () => toolbarButton(ICON.legend, "Legend", { key: "L", pressed: legendOn(), onClick: () => setLegend(!legendOn()) });
    // The standard bar: Analyze | Layout, View, Legend | Quick actions
    function mainToolbar() {
        const mode = (AB.route && AB.route.frame.mode) || "3d";
        return toolbarBar([
            toolbarButton("flask-conical", "Analyze", { key: "Shift+A", popup: "dialog", go: ["analyze-popover", "open"] }),
            "sep",
            layoutButton(),
            toolbarButton(mode === "2d" ? ICON.mode2d : ICON.mode3d, "View", { popup: "menu", go: ["view-flyout", mode] }),
            legendButton(),
            "sep",
            toolbarButton(ICON.quickActions, "Quick actions", { key: "Ctrl+K", popup: "dialog", go: ["commands-and-search", "quick-actions"] }),
        ]);
    }
    // The legend card, top left of the canvas: legendCard([{ title: "Color: group", go, rows: [{ swatch, label, count, go }],
    //   more: "28 more communities", sub }]). Returns null while the legend is off.
    function legendCard(parts) {
        if (!legendOn()) return null;
        // A pressed Legend button always draws a card: with nothing bound, it says so in one line
        if (!parts.length) parts = [{ title: "Nothing is colored or sized by a row" }];
        // Read-only: the canvas carries no controls, and the tree row is the one door to a row's inspector
        const card = h("div", { class: "k-legend-card ab-legend", role: "img", "aria-label": "Legend: " + parts.map((p) => p.title).join("; ") });
        parts.forEach((p) => {
            card.append(h("div", { class: "k-lg-title" }, p.title));
            (p.rows || []).forEach((r) => {
                const el = h("div", { class: "k-lg-row" }, typeof r.swatch === "string" ? chit(r.swatch) : r.swatch || null, h("span", { class: "k-ellipsis" }, r.label), r.count != null ? h("span", { class: "k-value" }, String(r.count)) : null);
                card.append(el);
            });
            if (p.more) card.append(h("div", { class: "k-lg-sub" }, p.more));
            if (p.sub) card.append(h("div", { class: "k-lg-sub" }, p.sub));
        });
        return card;
    }

    // ---------- the style properties ----------
    // STAND-IN for graphty-element's channelsFor('node' | 'edge') descriptor list
    // (graphty-element/src/session/styles/channels.ts, CHANNEL_DESCRIPTORS). The real app reads it
    // from the element and never types it. Ids, value kinds, ranges and choice lists follow the
    // element. `section` and `fold` are NOT in the element's descriptors (needs graphty-element: a
    // section and order per descriptor); until then they are this app-side list. A folded channel has
    // no line of its own: it is edited in the popover of the line it folds into (opacity in Color,
    // pattern count in Pattern, an arrow's size, color and caption in Head or Tail).
    const NODE_SHAPES = ["box", "sphere", "cylinder", "cone", "capsule", "torus", "torus-knot", "tetrahedron", "octahedron", "dodecahedron", "icosahedron", "rhombicuboctahedron", "triangular_prism", "pentagonal_prism", "hexagonal_prism", "square_pyramid", "pentagonal_pyramid", "triangular_dipyramid", "pentagonal_dipyramid", "elongated_square_dipyramid", "elongated_pentagonal_dipyramid", "elongated_pentagonal_cupola", "goldberg", "icosphere", "geodesic"];
    const ARROWS = ["normal", "inverted", "dot", "sphere-dot", "open-dot", "none", "tee", "open-normal", "diamond", "open-diamond", "crow", "box", "half-open", "vee"];
    const LINES = ["solid", "dot", "star", "box", "dash", "diamond", "dash-dot", "sinewave", "zigzag"];
    const ch = (id, name, kind, section, extra) => Object.assign({ id, name, kind, section }, extra || {});
    const CHANNELS = {
        node: [
            ch("node.color", "Color", "color", "Fill", { opacity: "node.opacity", picker: "color", def: "#808080" }),
            ch("node.opacity", "Opacity", "number", "Fill", { range: [0, 1], fold: "node.color" }),
            ch("node.shape", "Shape", "choice", "Shape", { choices: NODE_SHAPES, picker: "shape", def: "sphere" }),
            ch("node.size", "Size", "number", "Shape", { range: [0, null], def: 1 }),
            ch("node.outline", "Outline", "color", "Effects", { picker: "color", def: "#1A1A1A", caveat: "An outline is a color with no width: every outline on screen is one width." }),
            ch("node.glow", "Glow", "color", "Effects", { picker: "color", def: "#FFD700" }),
            ch("node.glowStrength", "Glow strength", "number", "Effects", { range: [0, null], fold: "node.glow" }),
            ch("node.wireframe", "Wireframe", "boolean", "Effects", { def: true }),
            ch("node.flat", "Flat shading", "boolean", "Effects", { def: true }),
            ch("node.label", "Text", "text", "Label", { style: "node.labelStyle", def: "" }),
            ch("node.labelStyle", "Label style", "labelStyle", "Label", { fold: "node.label" }),
            ch("node.labelShow", "Show labels", "boolean", "Label", { def: false, onlyWithout: "node.label", caveat: "Unchecked, it hides labels on this row's members whatever the rows beneath say (the label style's enabled: false)." }),
            ch("node.tooltip", "Text", "text", "Tooltip", { style: "node.tooltipStyle", def: "", caveat: "Drawn on hover only." }),
            ch("node.tooltipStyle", "Tooltip style", "labelStyle", "Tooltip", { fold: "node.tooltip" }),
            ch("node.marker", "Marker", "nothing", null, { drawn: false, caveat: "graphty-element draws no marker yet." }),
        ],
        edge: [
            ch("edge.color", "Color", "color", "Line", { opacity: "edge.opacity", picker: "color", def: "#808080" }),
            ch("edge.width", "Width", "number", "Line", { range: [0, null], def: 1 }),
            ch("edge.opacity", "Opacity", "number", "Line", { range: [0, 1], fold: "edge.color" }),
            ch("edge.style", "Pattern", "choice", "Line", { choices: LINES, picker: "pattern", def: "solid" }),
            ch("edge.patternCount", "Pattern count", "number", "Line", { range: [2, null], fold: "edge.style", caveat: "Counts the marks of a patterned line; solid, zigzag and sinewave ignore it." }),
            ch("edge.curvature", "Curve", "boolean", "Line", { def: true, caveat: "A switch, not an amount." }),
            ch("edge.animationSpeed", "Flow speed", "number", "Line", { range: [0, null], def: 1 }),
            ch("edge.arrowHead", "Head", "choice", "Arrows", { choices: ARROWS, picker: "arrow", def: "normal" }),
            ch("edge.arrowHeadSize", "Head size", "number", "Arrows", { range: [0, null], fold: "edge.arrowHead" }),
            ch("edge.arrowHeadColor", "Head color", "color", "Arrows", { fold: "edge.arrowHead" }),
            ch("edge.arrowHeadOpacity", "Head opacity", "number", "Arrows", { range: [0, 1], fold: "edge.arrowHead" }),
            ch("edge.arrowHeadText", "Head caption", "text", "Arrows", { fold: "edge.arrowHead" }),
            ch("edge.arrowHeadTextStyle", "Head caption style", "labelStyle", "Arrows", { fold: "edge.arrowHead" }),
            ch("edge.arrowTail", "Tail", "choice", "Arrows", { choices: ARROWS, picker: "arrow", def: "normal" }),
            ch("edge.arrowTailSize", "Tail size", "number", "Arrows", { range: [0, null], fold: "edge.arrowTail" }),
            ch("edge.arrowTailColor", "Tail color", "color", "Arrows", { fold: "edge.arrowTail" }),
            ch("edge.arrowTailOpacity", "Tail opacity", "number", "Arrows", { range: [0, 1], fold: "edge.arrowTail" }),
            ch("edge.arrowTailText", "Tail caption", "text", "Arrows", { fold: "edge.arrowTail" }),
            ch("edge.arrowTailTextStyle", "Tail caption style", "labelStyle", "Arrows", { fold: "edge.arrowTail" }),
            ch("edge.label", "Text", "text", "Label", { style: "edge.labelStyle", def: "" }),
            ch("edge.labelStyle", "Label style", "labelStyle", "Label", { fold: "edge.label" }),
            ch("edge.labelShow", "Show labels", "boolean", "Label", { def: false, onlyWithout: "edge.label", caveat: "Unchecked, it hides labels on this row's members whatever the rows beneath say (the label style's enabled: false)." }),
        ],
    };
    // Label positions, in the order a new label line takes them: graphty-element's TextLocation ids
    // (config/common.ts) and the plain word the Style tab shows. STAND-IN: the element has ONE
    // node.label channel with one location; labels keyed by position (node.label.top,
    // node.label.bottom, ... one text and style per position) and a plain name per location are
    // missing in graphty-element (element-requirements-4.md, "Labels").
    CHANNELS.positions = [["top", "Above"], ["bottom", "Below"], ["right", "Right"], ["left", "Left"], ["top-left", "Top left"], ["top-right", "Top right"], ["bottom-left", "Bottom left"], ["bottom-right", "Bottom right"], ["center", "Center"]];
    const SECTIONS = { node: ["Fill", "Shape", "Effects", "Label", "Tooltip", "More"], edge: ["Line", "Arrows", "Label", "More"] };
    const chanOf = (id) => CHANNELS.node.concat(CHANNELS.edge).find((c) => c.id === id);
    const secOf = (c) => (c.section && SECTIONS[c.id.split(".")[0]].includes(c.section) ? c.section : "More");
    const lineChannels = (kind) => CHANNELS[kind].filter((c) => !c.fold && c.drawn !== false);
    // Plain names for the element's choice values. STAND-IN: the element's descriptors carry `values`
    // (its ids, "icosphere", "open-normal") but no plain name per value (needs graphty-element: a
    // plainName per enum value, as each channel already has). A reader never sees an element id.
    const PLAIN = {
        shape: { icosphere: "Faceted sphere", goldberg: "Goldberg sphere", geodesic: "Geodesic sphere", "torus-knot": "Knot", box: "Cube" },
        arrow: { normal: "Arrow", inverted: "Reversed arrow", dot: "Dot", "sphere-dot": "Ball", "open-dot": "Ring", none: "None", tee: "Bar", "open-normal": "Open arrow", diamond: "Diamond", "open-diamond": "Open diamond", crow: "Crow's foot", box: "Square", "half-open": "Half arrow", vee: "Chevron" },
        pattern: { solid: "Solid", dot: "Dotted", star: "Stars", box: "Squares", dash: "Dashed", diamond: "Diamonds", "dash-dot": "Dash and dot", sinewave: "Wave", zigzag: "Zigzag" },
        weight: { 300: "Light", normal: "Regular", 500: "Medium", bold: "Bold", 700: "Bold" },
    };
    function plain(family, v) {
        if (v == null || v === "") return "";
        const t = PLAIN[family] && PLAIN[family][v];
        if (t) return t;
        const w = String(v).replace(/[_-]/g, " ");
        return w.charAt(0).toUpperCase() + w.slice(1);
    }
    function fmtValue(c, v) {
        if (v === true) return "On";
        if (v === false) return "Off";
        if (v == null || v === "") return "";
        return c.picker ? plain(c.picker, v) : String(v).replace(/_/g, " ");
    }
    // The one color field, in the Style tab and in every popover: swatch, six-digit hex, opacity percent
    // in one borderless field; a click opens the Color popover (which holds the hex and percent editors).
    // colorField({ name, hex, pct (0..100, or null for no opacity), eff: "#hex" (unset: shown gray), go })
    function colorField(o) {
        const hex = o.hex || o.eff || "";
        const sw = chit(hex || "transparent");
        if (!o.hex) sw.style.opacity = ".5";
        const hx = String(hex).replace(/^#/, "").toUpperCase();
        const name = (o.name || "Color") + ", " + (o.hex ? "#" + hx : hx ? "not set, #" + hx + " from below" : "not set") + (o.pct != null ? ", " + o.pct + "% opacity" : "");
        const f = h("span", Object.assign({ class: "k-field ab-sv ab-color-field", role: "button", "aria-haspopup": "dialog", "aria-label": name, "data-error": o.error ? "" : null }, act({ go: o.go || ["style-pickers", "color"] })),
            sw, h("span", { class: "k-grow k-ellipsis k-num" + (o.hex ? "" : " k-secondary") }, hx),
            o.pct != null ? h("span", { class: "k-secondary k-num" }, o.pct + "%") : null);
        return f;
    }
    // Drag a number's name to scrub it: scrub(nameEl, input, { range, onSet(v) })
    function scrub(nameEl, inp, o) {
        o = o || {};
        nameEl.classList.add("ab-scrub");
        nameEl.addEventListener("pointerdown", (e) => {
            const x0 = e.clientX, v0 = Number(inp.value) || Number(inp.placeholder) || 0;
            const step = o.range && o.range[1] === 1 ? 0.01 : 0.1;
            nameEl.setPointerCapture(e.pointerId);
            const mv = (ev) => {
                let v = v0 + Math.round((ev.clientX - x0) / 2) * step;
                if (o.range) { if (o.range[0] != null) v = Math.max(o.range[0], v); if (o.range[1] != null) v = Math.min(o.range[1], v); }
                inp.value = String(Math.round(v * 100) / 100);
                if (o.onSet) o.onSet(+inp.value);
            };
            const up = () => { nameEl.removeEventListener("pointermove", mv); nameEl.removeEventListener("pointerup", up); };
            nameEl.addEventListener("pointermove", mv);
            nameEl.addEventListener("pointerup", up);
        });
        return nameEl;
    }
    const pct = (v) => Math.round((v == null ? 1 : Number(v)) * 100) + "%";

    // The one Style tab, for every row that paints, Everything included (spec 16).
    // styleTab({ kinds: ["node","edge"], kind, set: {channelId: value}, base: {channelId: value}, changed: [channelId],
    //   bound: {channelId: "field" | { field, palette, ramp: [from, to], range }}, mixed: {channelId: [a, b]},
    //   error: {channelId: message}, selected: channelId, noBind: true (Selection: no bind, "-" or "+"),
    //   paints: "Paints 10 nodes" | [text, go], order: "Covered by PageRank for Color on 10 of 10",
    //   extra: node, blocks: {channelId: () => node},
    //   labels: [{ pos: "Above", field: "label", type: "cat" } | { pos: "Right", draft: true }] })
    // Node labels are label lines keyed by position (spec 16.6): the name column is the position, the
    // value the field. "+" adds a draft at the first free position and opens the From data list on it;
    // a draft reads "Pick a field" and writes nothing. Without `labels`, a bound node.label is one Above
    // line. Edge labels keep their one middle line.
    // No counts. Sections are always open. A section with nothing set is its header and "+". A line is the
    // name and the value; bind and "-" show on hover, on focus within and on the selected line. `base` is
    // graphty-element's defaults (Everything): drawn as lines with no "-" until changed.
    let lastStyleKind = "node";
    function styleTab(o) {
        o = o || {};
        ["inherited", "openSection", "collapseAll", "all"].forEach((k) => { if (o[k]) console.warn("styleTab: '" + k + "' is gone in version 3"); });
        const kinds = o.kinds || ["node", "edge"];
        const set = Object.assign({}, o.set || {});
        const base = o.base || {};
        const changed = new Set(o.changed || []);
        const bound = Object.assign({}, o.bound || {});
        const mixed = o.mixed || {};
        const errors = o.error || {};
        let selected = o.selected || null;
        let kind = o.kind || (kinds.length === 1 ? kinds[0] : kinds.includes(lastStyleKind) ? lastStyleKind : kinds[0]);
        const wrap = h("div", { class: "ab-style" });
        const POS = CHANNELS.positions.map((p) => p[1]);
        const legacyLabel = bound["node.label"] ? [Object.assign({ pos: "Above" }, typeof bound["node.label"] === "string" ? { field: bound["node.label"] } : bound["node.label"])]
            : set["node.label"] || base["node.label"] ? [{ pos: "Above", text: String(set["node.label"] || base["node.label"]) }] : [];
        const labels = (o.labels || legacyLabel).map((l) => Object.assign({}, l));
        delete bound["node.label"];
        delete set["node.label"];
        const has = (id) => (id === "node.label" ? labels.length > 0 : id in set || id in bound || id in base || id in mixed);
        const valueOf = (id) => (id in set ? set[id] : base[id]);
        const sets = (k) => (k === "node" && labels.some((l) => !l.draft)) || CHANNELS[k].some((c) => c.id in set || c.id in base || c.id in bound || changed.has(c.id) || c.id in mixed);
        let focusId = null;
        const add = (c) => {
            set[c.id] = c.id in base ? base[c.id] : c.def != null ? c.def : "";
            selected = focusId = c.id;
            drawBody();
        };
        const remove = (c) => {
            const was = { v: set[c.id], b: bound[c.id], ch: changed.has(c.id) };
            if (c.id in base) { set[c.id] = base[c.id]; changed.delete(c.id); } else delete set[c.id];
            delete bound[c.id];
            drawBody();
            notice("Removed " + c.name, { label: "Undo", onClick: () => { if (was.v !== undefined) set[c.id] = was.v; if (was.b) bound[c.id] = was.b; if (was.ch) changed.add(c.id); drawBody(); } });
        };
        const pickerGo = (c) => ["style-pickers", c.picker || (c.kind === "choice" ? "choice" : "token-edit")];
        const valueCtl = (c) => {
            if (c.id in bound) {
                const b = typeof bound[c.id] === "string" ? { field: bound[c.id] } : bound[c.id];
                const text = b.palette || b.range || b.field;
                // A bound value is a chip, never typed text: the ramp for a color, else the field's type glyph and name
                const glyph = c.kind === "color" ? ramp(b.ramp && b.ramp[0], b.ramp && b.ramp[1]) : typeGlyph(b.type || (c.kind === "number" ? "num" : "cat"));
                const v = h("span", Object.assign({ class: "k-field ab-sv ab-bound", role: "button", "aria-haspopup": "dialog", "aria-label": c.name + ": " + text + (text === b.field ? "" : ", from " + b.field) }, act({ go: ["style-pickers", c.style ? "label-style" : b.go || "binding"] })), glyph, h("span", { class: "k-grow k-ellipsis" }, text));
                return tip(v, "From " + b.field, { label: false });
            }
            if (c.id in mixed) {
                const [a, b2] = mixed[c.id];
                const v = h("span", Object.assign({ class: "k-field ab-sv", role: "button" }, act({ go: pickerGo(c) })), c.kind === "color" ? [chit(a), chit(b2)] : null, h("span", { class: "k-grow" }, "Mixed"));
                return tip(v, "A change applies to both rows", { label: false });
            }
            const v = valueOf(c.id);
            if (c.kind === "boolean") {
                const box = h("span", { class: "k-check", role: "checkbox", tabindex: "0", "aria-checked": String(!!v), "aria-label": c.name });
                const flip = (e) => { e.stopPropagation(); set[c.id] = !valueOf(c.id); if (c.id in base) changed.add(c.id); box.setAttribute("aria-checked", String(!!set[c.id])); };
                box.addEventListener("click", flip);
                box.addEventListener("keydown", (e) => e.key === " " && (e.preventDefault(), flip(e)));
                return h("span", { class: "ab-sv" }, box);
            }
            // A label's text: clicking the value opens the one Label popover (its text source on top, its style below)
            if (c.style) {
                const lbl = h("span", Object.assign({ class: "k-field ab-sv", role: "button", "aria-haspopup": "dialog", "aria-label": c.name + ": " + (v ? v : "none") }, act({ go: ["style-pickers", "label-style"] })),
                    h("span", { class: "k-grow k-ellipsis" + (v ? "" : " k-secondary") }, v ? String(v) : "None"));
                return lbl;
            }
            if (c.kind === "number" || c.kind === "text") {
                const inp = h("input", { class: "ab-sin" + (c.kind === "number" ? " k-num" : ""), type: "text", inputmode: c.kind === "number" ? "decimal" : null, value: v == null ? "" : String(v), "aria-label": c.name, spellcheck: "false" });
                const commit = () => { const t = inp.value.trim(); set[c.id] = c.kind === "number" && t !== "" && !isNaN(+t) ? +t : t; if (c.id in base) changed.add(c.id); };
                inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { commit(); inp.blur(); } else if (e.key === "Escape") { inp.value = v == null ? "" : String(v); inp.blur(); } });
                inp.addEventListener("change", commit);
                return h("span", { class: "ab-sv" }, inp);
            }
            if (c.kind === "color") return colorField({ name: c.name, hex: v, pct: c.opacity ? parseInt(pct(valueOf(c.opacity)), 10) : null, error: errors[c.id], go: pickerGo(c) });
            return h("span", Object.assign({ class: "k-field ab-sv", role: "button", "aria-haspopup": "dialog", "aria-label": c.name + ": " + fmtValue(c, v), "data-error": errors[c.id] ? "" : null }, act({ go: pickerGo(c) })),
                h("span", { class: "k-grow k-ellipsis" }, fmtValue(c, v)));
        };
        const line = (c) => {
            const isBase = c.id in base;
            const canRemove = !o.noBind && (!isBase || changed.has(c.id) || c.id in bound);
            const nameEl = h("span", { class: "ab-sname" }, c.name);
            if (isBase && !changed.has(c.id)) tip(nameEl, "The default look; change it to override", { label: false });
            else if (c.caveat) tip(nameEl, c.caveat, { label: false });
            const numInp = () => nameEl.parentNode && nameEl.parentNode.querySelector("input");
            const li = h("div", { class: "ab-sline", "data-ch": c.id, "data-bound": c.id in bound ? "" : null, "data-selected": selected === c.id ? "" : null, "data-base": isBase && !changed.has(c.id) ? "" : null },
                nameEl, valueCtl(c),
                // bind and "-" float over the value's end (the 240 px panel has no room for two more columns)
                o.noBind ? null : h("span", { class: "ab-sact" },
                    bindButton(c),
                    canRemove ? iconButton("minus", "Remove " + c.name, { onClick: () => remove(c) }) : null));
            li.addEventListener("focusin", () => { if (selected !== c.id) { wrap.querySelectorAll(".ab-sline[data-selected]").forEach((x) => x.removeAttribute("data-selected")); selected = c.id; li.setAttribute("data-selected", ""); } });
            const ni = numInp();
            if (c.kind === "number" && !(c.id in bound) && ni) scrub(nameEl, ni, { range: c.range, onSet: (v) => { set[c.id] = v; } });
            const out = [li];
            if (o.blocks && o.blocks[c.id] && c.id in bound) out.push(o.blocks[c.id]());
            if (errors[c.id]) out.push(h("div", { class: "ab-serr k-danger", role: "alert" }, errors[c.id]));
            return out;
        };
        // ---- label lines ----
        const freePos = () => POS.find((w) => !labels.some((l) => l.pos === w));
        const openFields = (anchor, l) => openFieldList(anchor, { kind: "text", typed: true, element: "node", current: l.draft ? undefined : l.field, onPick: (name, type) => {
            if (name === null) { Object.assign(l, { field: null, type: null, text: "Label text" }); delete l.draft; focusLabel = l.pos; drawBody(); announce("Label, " + l.pos + ": typed text"); return; }
            Object.assign(l, { field: name, type }); delete l.draft; delete l.text;
            focusLabel = l.pos; drawBody(); announce("Label, " + l.pos + ": " + name);
        } });
        let focusLabel = null;
        // "+" with an empty line already there returns to it (as the Notes "+" returns to its open draft)
        const addLabel = () => {
            const open = labels.find((x) => x.draft);
            if (open) { const v = body.querySelector(`.ab-sline[data-label="${open.pos}"] .ab-sv`); if (v) { v.focus(); openFields(v, open); } return; }
            const l = { pos: freePos(), draft: true };
            labels.push(l);
            drawBody();
            const v = body.querySelector(`.ab-sline[data-label="${l.pos}"] .ab-sv`);
            if (v) openFields(v, l);
        };
        const removeLabel = (l) => {
            const at = labels.indexOf(l);
            labels.splice(at, 1);
            drawBody();
            if (!l.draft) notice("Removed the " + l.pos + " label", { label: "Undo", onClick: () => { labels.splice(at, 0, l); drawBody(); } });
        };
        const labelLine = (l, i) => {
            const say = "Label, " + l.pos + ": " + (l.draft ? "no field, draws nothing" : l.field || l.text);
            const val = l.draft
                ? h("span", Object.assign({ class: "k-field ab-sv", role: "button", "aria-haspopup": "menu", "aria-label": say }, act({ onClick: (e) => openFields(e.currentTarget, l) })), h("span", { class: "k-grow k-ellipsis k-secondary" }, "Pick a field"))
                : h("span", Object.assign({ class: "k-field ab-sv" + (l.field ? " ab-bound" : ""), role: "button", "aria-haspopup": "dialog", "aria-label": say }, act({ go: ["style-pickers", "label-style"] })), l.field ? typeGlyph(l.type || "cat") : null, h("span", { class: "k-grow k-ellipsis" }, l.field || l.text));
            const sel = (o.selected === "node.label" && i === 0) || selected === "label:" + l.pos;
            const li = h("div", { class: "ab-sline", "data-ch": "node.label", "data-label": l.pos, "data-bound": l.field ? "" : null, "data-selected": sel ? "" : null },
                // the position is the line's name, not a control: it moves only in the Label popover's position grid
                h("span", { class: "ab-sname" }, l.pos), val,
                // No bind icon on a label line: its value opens the Label popover, whose Text is the field list (one way)
                o.noBind ? null : h("span", { class: "ab-sact" },
                    iconButton("minus", "Remove the " + l.pos + " label", { onClick: () => removeLabel(l) })));
            li.addEventListener("focusin", () => { wrap.querySelectorAll(".ab-sline[data-selected]").forEach((x) => x.removeAttribute("data-selected")); selected = "label:" + l.pos; li.setAttribute("data-selected", ""); });
            return li;
        };
        // bind opens a popover (the Label popover for a label, else Binding); it is never a pressed toggle
        // A bound line's bind icon opens its own binding (as its value does); an unbound one opens Binding
        // for that property with no source yet, over the inspector and project on screen (bind-prop)
        const bindButton = (c) => {
            const b0 = c.id in bound && typeof bound[c.id] === "object" ? bound[c.id] : {};
            const b = iconButton("database", "Use a field or result for " + c.name, { go: ["style-pickers", c.style ? "label-style" : c.id in bound ? b0.go || "binding" : "bind-prop"] });
            b.setAttribute("aria-haspopup", "dialog");
            b.setAttribute("aria-expanded", "false");
            return b;
        };
        const body = h("div", { class: "ab-style-body" });
        const head = h("div", { class: "ab-style-head" });
        const drawHead = () => {
            head.replaceChildren();
            if (kinds.length > 1) {
                const dot = (k) => (sets(k) ? tip(h("span", { class: "ab-sdot" }), "This row sets " + (k === "node" ? "node" : "edge") + " properties", { label: false }) : null);
                head.append(seg(kinds.map((k) => [k, k === "node" ? "Nodes" : "Edges", dot(k)]), kind, (k) => { kind = lastStyleKind = k; drawHead(); drawBody(); head.querySelector("[aria-checked='true']").focus(); }, { label: "What the row paints" }));
            }
        };
        const drawBody = () => {
            body.replaceChildren();
            const chans = lineChannels(kind);
            SECTIONS[kind].forEach((sn) => {
                const inSec = chans.filter((c) => secOf(c) === sn);
                const shown = inSec.filter((c) => has(c.id));
                const unset = o.noBind ? [] : inSec.filter((c) => !has(c.id) && !(c.onlyWithout && has(c.onlyWithout)));
                if (sn === "More" && !shown.length) return; // More holds only what no section places
                if (kind === "node" && sn === "Label") {
                    // The Label "+" is the one "+" that opens a menu after adding; Show only while no line exists
                    if (o.noBind && !labels.length && !shown.length) return;
                    const items = o.noBind ? [] : [freePos() ? { label: "Label line", lab: true } : null].concat(unset.filter((c) => c.id === "node.labelShow").map((c) => ({ label: c.name, ch: c }))).filter(Boolean);
                    const actions = plus({ label: "Add to Label", items, onAdd: (it) => (it.lab ? addLabel() : add(it.ch)) });
                    // A label line opens its field list as it is added, so the "+" always opens a menu
                    if (actions) actions.setAttribute("aria-haspopup", "menu");
                    body.append(section({ title: sn, editable: true, actions }, labels.map(labelLine), shown.filter((c) => c.id !== "node.label").map(line)));
                    return;
                }
                if (o.noBind && !shown.length) return;
                const actions = plus({ label: "Add to " + sn, items: unset.map((c) => ({ label: c.name, ch: c })), onAdd: (it) => add(it.ch) });
                body.append(section({ title: sn, editable: true, actions }, shown.map(line)));
            });
            // One design note for the whole tab, outside every control (hidden in the user-test build),
            // above the first section header it qualifies, so it never reads as a note on the last section
            if (!o.noBind) body.prepend(h("div", { class: "ab-cap ab-style-note ab-review-only k-secondary" }, "Sections and their order:", needsElement("The sections and their order are the app's list until graphty-element's style descriptors carry a section and an order.")));
            if (focusLabel) {
                const v = body.querySelector(`.ab-sline[data-label="${focusLabel}"] .ab-sv`);
                focusLabel = null;
                if (v) requestAnimationFrame(() => v.focus());
            }
            if (focusId) {
                const l = body.querySelector(`.ab-sline[data-ch="${focusId}"]`);
                focusId = null;
                const f = l && l.querySelector("input, .ab-sv[role=button], .k-check");
                if (f) requestAnimationFrame(() => f.focus());
            }
            drawHead();
        };
        if (o.paints) wrap.append(Array.isArray(o.paints) ? paintsLine(o.paints[0], o.paints[1]) : typeof o.paints === "string" ? paintsLine(o.paints) : o.paints);
        if (o.order) wrap.append(paintOrderLine(o.order));
        wrap.append(head);
        wrap.append(body);
        // A design note goes under the sections, never above them
        if (o.extra) wrap.append(o.extra);
        drawBody();
        return wrap;
    }

    // "Why this look" (spec 5.4): a collapsible, read-only section (remembered per kind) listing every
    // layer that wins at least one property on this element, top first, on one grid: swatch, name link,
    // tokens right-aligned, and for several elements a coverage column.
    // whyThisLook(lines, { kind: "node" | "edge" | "several", element: "Valjean", coverage, coverageReason, tokenGo(prop, line) })
    // line = { name, swatch: node|color, go: [id,state], wins: ["Color", ...], values: {prop: "resolved"}, locked,
    //   hiddenRow, overrides, coverage: "14 of 20" }. Lines with no wins are not listed (Memberships lists those).
    function whyThisLook(lines, opts) {
        opts = opts || {};
        const cap = (p) => p.charAt(0).toUpperCase() + p.slice(1);
        const winners = lines.filter((l) => l.wins && l.wins.length);
        const list = h("div", { class: "ab-why" + (opts.coverage ? " ab-why-cov" : ""), role: "list", "aria-label": "Rows that paint it, top first" });
        winners.forEach((l) => {
            const sw = typeof l.swatch === "string" ? chit(l.swatch) : l.swatch || h("span");
            // A row hidden from the list is drawn as the tree draws it with Show hidden rows on: dimmed
            // italic. The eye-off glyph means only "not drawn", here as in the tree.
            const name = l.locked || !l.go ? h("span", { class: "ab-why-name k-ellipsis", "data-dim": l.hiddenRow ? "" : null }, l.name) : link(l.go[0], l.go[1], l.name, { class: "ab-link ab-why-name k-ellipsis", "data-dim": l.hiddenRow ? "" : null });
            if (l.hiddenRow) tip(name, "Hidden from the list; it still paints", { label: false, second: "Hidden from the list; it still paints" });
            // One fixed mark slot (lock), so every line's tokens start at the same place
            const marks = h("span", { class: "ab-why-marks" },
                l.locked ? tip(h("span", null, icon("lock", "sm")), "Owned by graphty-element; not a row you can select", { label: false }) : null);
            // Tokens stay on one line: at most two, else the first and "+N" (the rest in its tooltip and name)
            const tok = (p) => {
                const P = cap(p);
                const t = h("span", Object.assign({ class: "ab-token", role: "button", "aria-label": P + " from " + l.name }, act({ go: opts.tokenGo ? opts.tokenGo(P, l) : ["style-pickers", "token-edit"] })), P);
                return tip(t, (l.values && (l.values[p] || l.values[P])) || P, { label: false });
            };
            const shown = l.wins.length > 2 ? l.wins.slice(0, 1) : l.wins;
            const rest = l.wins.slice(shown.length).map(cap);
            const more = rest.length ? tip(h("span", Object.assign({ class: "ab-token ab-token-more", role: "button", "aria-label": rest.join(", ") + " from " + l.name }, act({ go: opts.tokenGo ? opts.tokenGo(rest[0], l) : ["style-pickers", "token-edit"] })), "+" + rest.length), rest.join(", "), { label: false }) : null;
            const tokens = h("span", { class: "ab-why-tokens" }, shown.map(tok), more);
            const row = h("div", { class: "ab-why-line", role: "listitem", "data-overrides": l.overrides ? "" : null }, sw, name, marks, tokens,
                opts.coverage ? h("span", { class: "ab-why-cov-n k-num k-secondary" }, l.coverage || "") : null,
                l.overrides ? iconButton("minus", "Clear " + (opts.element ? opts.element + "'s" : "this") + " override", { onClick: () => { const at = row.nextSibling; row.remove(); deleted("the override", () => list.insertBefore(row, at)); } }) : h("span", { class: "ab-why-x" }));
            list.append(row);
        });
        // Design notes about the list open the section, never loose under it (hidden in the user-test build)
        // One Tab stop for the whole list: arrows move between its names, tokens and "-"
        const stops = () => [...list.querySelectorAll("a, [role=button], .k-icon-btn")];
        stops().forEach((x, i) => (x.tabIndex = i ? -1 : 0));
        list.addEventListener("keydown", (e) => {
            const all = stops(), i = all.indexOf(document.activeElement);
            const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
            if (i < 0 || to == null || !all[to]) return;
            e.preventDefault();
            all.forEach((x) => (x.tabIndex = -1));
            all[to].tabIndex = 0;
            all[to].focus();
        });
        // At most ONE design note, and it opens the section (several notes merge into one chip)
        const texts = [opts.coverage ? "Coverage counts how many of the selected elements each row wins. " + (opts.coverageReason || "explain() takes one node or edge; an explain over a set, returning coverage, is filed.") : null]
            .concat((opts.notes || []).map((n) => (n && n.dataset ? (n.textContent === "Open question" ? "Open question: " : "") + n.dataset.tip : n))).filter(Boolean);
        const notes = texts.length ? [needsElement(texts.join(" "))] : [];
        return section({ title: "Why this look", collapsible: true, key: "why." + (opts.kind || "node"), summary: winners.map((l) => l.name).join(", ") }, notes.length ? h("div", { class: "ab-why-notes" }, notes) : null, list);
    }

    // ---------- one command table (spec 17): every door draws its label and key from here ----------
    // { label, shortcut, home: "Place > Control", disabledReason, go | onClick, more: true (asks for input, so "..."),
    //   toggle: [label when on, label when off], on: () => bool }
    const COMMANDS = {
        analyze: { label: "Analyze...", shortcut: "Shift+A", home: "Toolbar > Analyze", more: true, go: ["analyze-popover", "open"] },
        "quick-actions": { label: "Quick actions", shortcut: "Ctrl+K", home: "Toolbar > Quick actions", go: ["commands-and-search", "quick-actions"] },
        layout: { toggle: ["Pause layout", "Resume layout"], on: () => AB.layoutState === "running", home: "Toolbar > Layout", onClick: () => setLayout(AB.layoutState === "running" ? "paused" : "running") },
        "rerun-layout": { label: "Re-run layout", home: "Canvas menu > Re-run layout", go: ["context-menus", "canvas"] },
        "view-mode": { toggle: ["Switch to 2D", "Switch to 3D"], on: () => ((AB.route && AB.route.frame.mode) || "3d") === "3d", shortcut: "5", home: "Toolbar > View", go: ["view-flyout", "3d"] },
        "enter-vr": { label: "Enter VR", home: "Toolbar > View", disabledReason: "No headset connected", go: ["view-flyout", "3d"] },
        "enter-ar": { label: "Enter AR", home: "Toolbar > View", disabledReason: "No AR device connected", go: ["view-flyout", "3d"] },
        fit: { label: "Fit", shortcut: "0", home: "Toolbar > View", go: ["view-flyout", "3d"] },
        "frame-selection": { label: "Frame selection", shortcut: "F", home: "Toolbar > View", go: ["view-flyout", "3d"] },
        "frame-members": { label: "Frame members", home: "Row menu > Frame members", go: ["context-menus", "row"] },
        legend: { toggle: ["Hide legend", "Show legend"], on: () => legendOn(), shortcut: "L", home: "Toolbar > Legend", onClick: () => setLegend(!legendOn()) },
        "find-paths": { label: "Path between...", shortcut: "P", home: "Selection bar > Path between", more: true, go: ["path-popover", "from-selection"] },
        neighborhood: { label: "Neighborhood...", home: "Selection bar > Neighborhood", more: true, go: ["selection-bar", "neighborhood"] },
        "create-set": { label: "Create set", shortcut: "Ctrl+G", home: "Selection bar > Create set", go: ["selection-bar", "two-nodes"] },
        "hide-on-canvas": { label: "Hide on canvas", shortcut: "Ctrl+Shift+H", home: "Selection bar > Hide on canvas", go: ["selection-bar", "hidden"] },
        "show-hidden": { label: "Show hidden elements", home: "Main menu > Show hidden elements", go: ["canvas-and-states", "drawn"] },
        "reselect-previous": { label: "Reselect previous", home: "Canvas menu > Reselect previous", go: ["context-menus", "canvas"] },
        "add-note": { label: "Add note", shortcut: "N", home: "Selection bar > Add note", onClick: () => addNote() },
        "label-by": { label: "Label by", home: "Attribute menu > Label by", go: ["context-menus", "attribute"] },
        "run-as-copy": { label: "Run as copy", home: "Run row menu > Run as copy", go: ["context-menus", "run-row"] },
        "clear-graph-data": { label: "Clear graph data", home: "Canvas menu > Clear graph data", onClick: () => notice("Cleared graph data", { label: "Undo", onClick: () => announce("Graph data restored") }) },
        "save-view": { label: "Save view", home: "Views > Save view", go: ["views-place", "saving"] },
        present: { label: "Present", home: "Views > Present", go: ["present-mode", "presenting"] },
        "record-tour": { label: "Record tour...", home: "Views > Record tour", more: true, go: ["export-video", "tour"] },
        "toggle-table": { toggle: ["Hide table", "Show table"], on: () => !document.querySelector(".ab-main[data-dock='closed']"), shortcut: "Shift+T", home: "Table dock > Collapse", onClick: () => AB.toggleDock() },
        export: { label: "Export...", shortcut: "Ctrl+E", home: "Project menu > Export", more: true, go: ["export-dialog"] },
        "add-data": { label: "Add data...", home: "Data > Sources +", more: true, go: ["data-page", "entries"] },
        "edit-source": { label: "Edit source...", home: "Source row menu > Edit source", more: true, go: ["data-page", "edit-source"] },
        "replace-file": { label: "Replace with file...", home: "Source row menu > Replace with file", more: true, go: ["data-page", "replace"] },
        "version-history": { label: "Version history", home: "Project menu > Version history", go: ["full-canvas-modes", "version-history"] },
        settings: { label: "Settings...", shortcut: "Ctrl+,", home: "Main menu > Settings", more: true, go: ["settings", "general"] },
        shortcuts: { label: "Keyboard shortcuts", shortcut: "?", home: "Main menu > Keyboard shortcuts", go: ["commands-and-search", "shortcuts"] },
        rename: { label: "Rename", shortcut: "F2", home: "Row menu > Rename" },
        find: { label: "Find...", shortcut: "/", home: "Graph > Find rows", more: true, go: ["commands-and-search", "find"] },
        undo: { label: "Undo", shortcut: "Ctrl+Z", home: "Header > Undo" },
        redo: { label: "Redo", shortcut: "Ctrl+Shift+Z", home: "Header > Redo" },
    };
    // The project's saved views, in the Views place's order. Every door (the View flyout, Export,
    // Present, Quick actions) reads this one list.
    const SAVED_VIEWS = ["Whole cast", "Valjean's circle", "From above"];
    // cmd(id, extra?) -> a menu item for menu() ({ label, shortcut, go|onClick, disabled, home, toggle, on })
    function cmd(id, extra) {
        const c = COMMANDS[id];
        if (!c) throw new Error("Unknown command " + id);
        const label = c.toggle ? (c.on() ? c.toggle[0] : c.toggle[1]) : c.label;
        if (/\.\.\.$/.test(label) && !c.more) console.warn("cmd(" + id + "): '" + label + "' ends in '...' but asks for no more input");
        const it = { label, shortcut: c.shortcut, home: c.home };
        if (c.go) it.go = c.go;
        if (c.onClick) it.onClick = c.onClick;
        if (c.disabledReason && !(extra && extra.enabled)) it.disabled = c.disabledReason;
        return Object.assign(it, extra || {});
    }

    // ---------- the Graph and Data places' title line (spec 3): a quiet place word, then the graphs switcher ----------
    // graphHead("Graph", "Co-appearances", { trail }) -- one line, 40 px, like placeHead
    function graphHead(place, name, o) {
        o = o || {};
        const btn = h("span", Object.assign({ class: "ab-switch-btn", role: "button", "aria-haspopup": "menu", "aria-label": name + ", graphs in this project" }, act({ go: ["graphs-switcher", "open"] })), h("span", { class: "k-ellipsis" }, name), icon("chevron-down", "sm"));
        tip(btn, "Graphs in this project", { label: false });
        // No note bubble here: one speech-bubble count beside the tree's Notes row was a second meaning
        // for one glyph on one screen; the graph's notes are in its Data tab
        return h("div", { class: "ab-place-head ab-graph-head" }, h("h2", { class: "ab-place-title ab-switch-pre", tabindex: "-1" }, place), btn, h("span", { class: "k-grow" }), o.trail || null);
    }
    // The tree's find line: the search field and the list options (an ellipsis). Every left-panel list uses it.
    // treebar({ placeholder, value, onKey(e, input), menuGo: [id, state], menuClick (opens the menu in place), menuOpen })
    function treebar(o) {
        o = o || {};
        const ph = o.placeholder || "Find rows and notes";
        const input = h("input", { type: "search", placeholder: ph, "aria-label": ph, value: o.value || null });
        if (o.onKey) input.addEventListener("keydown", (e) => o.onKey(e, input));
        if (o.onInput) input.addEventListener("input", () => o.onInput(input));
        let more = null;
        if (o.menuGo) {
            more = iconButton(ICON.options, "List options", o.menuClick ? { onClick: () => o.menuClick() } : { go: o.menuGo });
            more.id = "ab-list-btn";
            more.setAttribute("aria-haspopup", "menu");
            more.setAttribute("aria-expanded", String(!!o.menuOpen));
            if (o.menuOpen) more.setAttribute("data-open", "");
        }
        return h("div", { class: "ab-treebar" }, h("label", { class: "ab-find" }, icon("search", "sm"), input), more);
    }

    // One glyph per attribute type everywhere (Data place, table headers, Read as): Abc Category, # Number, calendar Time
    function typeGlyph(type) {
        if (type === "time") return icon("calendar", "sm");
        if (type === "bool") return icon("circle-check", "sm");
        return h("span", { class: "ab-abc" }, type === "num" ? "#" : "Abc");
    }

    // The one role tag (Data page grid, Data place attributes, attribute inspector): a k-badge naming a
    // column's role, its tooltip saying what the role does.
    // roleTag("Weight", { second: "set when loaded -- every run uses it unless the run picks another", go })
    function roleTag(word, o) {
        o = o || {};
        const el = h("span", Object.assign({ class: "k-badge ab-role" }, o.go ? Object.assign({ role: "link" }, act({ go: o.go })) : {}), word);
        return tip(el, o.second ? word + ", " + o.second : word + " role", { label: !!o.go });
    }

    // The one workspace-page header (the Data page, version history): a back arrow that cancels, the
    // title saying the act ("Add to Entries", "Version history"), and the Esc hint. Cancel and Esc go
    // back to the screen that opened the page (the shell remembers it), or to `onCancel` when given.
    // pageHead(title, { onCancel, backTip, trail })
    function pageHead(title, o) {
        o = o || {};
        const cancel = o.onCancel || (() => (AB.pageOpener ? location.assign(AB.pageOpener) : AB.close()));
        AB.onPageCancel = cancel; // the shell's Esc calls it while no overlay is open
        return h("div", { class: "ab-page-head" },
            iconButton("arrow-left", o.backTip || "Cancel", { key: "Esc", onClick: cancel }),
            h("h2", { class: "ab-page-title", tabindex: "-1" }, title),
            h("span", { class: "ab-page-hint" }, h("span", { class: "k-kbd" }, "Esc"), " to leave"),
            h("span", { class: "k-grow" }), o.trail || null);
    }

    // ---------- truncation (spec 2.5): a middle ellipsis on attribute names and paths ----------
    // Prose (node names, notes, source names, row names) takes the end ellipsis (CSS .k-ellipsis).
    // An attribute name or path keeps its start and its end: cpu_util...p95_pct. truncMiddle(text, max)
    // returns a span; when it shortens, the full text is its tooltip and its accessible name.
    const midCut = (text, max) => {
        const t = String(text);
        if (t.length <= max) return null;
        // A dotted path keeps its last two segments, or its last one, whole: they tell siblings apart
        // ("attr...profile.contact", not "attribute....contact"); it also keeps some of its start, so
        // every path is cut in the middle, never at its start
        const segs = t.split(".");
        for (const k of [2, 1]) {
            const tail = segs.slice(-k).join(".");
            let head = max - 3 - tail.length;
            if (head > 1 && t[head - 1] === ".") head--;
            if (segs.length > k && head >= 1 && tail.length >= max / 2) return [head, t.length - tail.length];
        }
        const keep = max - 3;
        let head = Math.ceil(keep / 2), from = t.length - (keep - head);
        // never a "." beside the ellipsis (it reads as four dots)
        if (t[head - 1] === ".") head--;
        if (t[from] === ".") from++;
        return [head, from]; // [end of the head, start of the tail]
    };
    function truncMiddle(text, max, ranges) {
        const t = String(text), cut = midCut(t, max || 30);
        // the kept parts, with the matched ranges in bold
        const mark = (from, to) => {
            const out = [];
            let i = from;
            (ranges || []).map(([a, b]) => [Math.max(a, from), Math.min(b, to)]).filter(([a, b]) => a < b).forEach(([a, b]) => { if (a > i) out.push(t.slice(i, a)); out.push(h("b", null, t.slice(a, b))); i = b; });
            if (i < to) out.push(t.slice(i, to));
            return out;
        };
        const el = h("span", { class: "ab-mid" }, cut ? [mark(0, cut[0]), "...", mark(cut[1], t.length)] : mark(0, t.length));
        if (cut) tip(el, t);
        return el;
    }

    // ---------- word-start matching (spec 2.5): "vu cr", "cpu p95" ----------
    // Names split at _ . - [ ] spaces and case changes; each typed word must start a word of the name,
    // in order. Returns the matched [start, end) ranges, or null.
    function wordMatch(name, query) {
        const q = String(query || "").trim().toLowerCase().split(/[\s_.\-[\]]+/).filter(Boolean); // a typed name splits like a stored one
        if (!q.length) return [];
        const s = String(name), words = [];
        const re = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|[^\s_.\-[\]A-Za-z0-9]+/g;
        let m;
        while ((m = re.exec(s))) words.push([m.index, m[0].toLowerCase()]);
        const out = [];
        let w = 0;
        for (const part of q) {
            while (w < words.length && !words[w][1].startsWith(part)) w++;
            if (w === words.length) return null;
            out.push([words[w][0], words[w][0] + part.length]);
            w++;
        }
        return out;
    }

    // ---------- the fields of the project on screen ----------
    // fieldsOf(dataset) -> [{ table, element: "node" | "edge", fields: [field] }], a stand-in for
    // graphty-element's session.data.attributes() (types, fill, parents, usedBy). A field:
    // { name (the stored name or path), label (the last segment), parent (its folder, or null), type:
    // "cat" | "num" | "time" | "bool" | "id" | "text" | "list" | "whole", fill (0 to 1), usedBy, computed }.
    // ponytail: usedBy is typed here per sample (USED_BY) until the element's usedBy reaches the app.
    // It names only what the project on screen really uses: the roles set at load, plus the row a
    // later state adds (STYLED, keyed by the tree's state) and the filter steps the route's frame
    // names (frame.filterOn) -- never a binding the tree does not hold.
    const USED_BY = {
        lesmis: { label: "Name, Label", group: "Color (group)", degree: "Size (Degree)" },
        transactions: { "id (account)": "Key", kind: "Color (kind)", "amount (edge)": "Weight" },
        doorEntries: { id: "Key", name: "Name, Label", bldg: "Key", person_id: "Link to person", building_id: "Link to building", time: "Time", count: "Weight" },
        wide: { id: "Key", hostname: "Name", source: "From", target: "To", bytes_total_24h: "Weight" },
        nested: { id: "Key", source: "From", target: "To", weight: "Weight", institution_id: "To" },
        plainJson: { id: "Key", name: "Name", source: "From", target: "To", weight: "Weight" },
    };
    const STYLED = {
        "graph-place/wide-sized": { vuln_count_critical_unremediated_over_30_days: "Size" },
        "graph-place/nested-set": { "attributes.profile.metrics.citations.last_5_years": "Label (set)" },
    };
    // The nested project as the last Load left it (data-page's nestedChoices); before any Load, the
    // Data page's own proposal: coauthor_ids as Several edges (one edge per pair), the other arrays kept
    // as one value, links' weight column as the weight
    const NESTED_LOADED = { researchers: true, institutions: true, links: true, name: { researcher: ["attributes.name.given", "attributes.name.family"], institution: ["attributes.name"] }, co: "edges", coPer: "pair", aff: "one", addr: "one", keep: [], direction: "undirected", linkTo: ["researcher", "institution"], weight: "weight", idLinks: [] };
    const nestedLoaded = () => (AB.fx && AB.fx.datasets.nested && AB.fx.datasets.nested.loaded) || NESTED_LOADED;
    // ---------- the Name role: one or more columns, joined by a space ----------
    // nameCols(ds, type): the columns holding a node type's Name role, in column order (the nested
    // project's are the last Load's choice, per type); nameOf(ds, record): that one Name, empty parts
    // skipped, else the key. ponytail: a stand-in for graphty-element's node name (displayName:
    // string | string[], element-requirements-5.md); every surface reads a node's name through it.
    const NAME_COLS = { wide: ["hostname"], plainJson: ["name"] };
    const nameCols = (ds, type) => (ds === "nested" ? (nestedLoaded().name || {})[type || "researcher"] || [] : NAME_COLS[ds] || []);
    const pathAt = (r, p) => p.split(".").reduce((o, k) => (o == null ? o : o[k]), r);
    function nameOf(ds, rec) {
        const parts = nameCols(ds, rec.type).map((c) => pathAt(rec, c)).filter((v) => v != null && v !== "");
        return parts.length ? parts.join(" ") : String(rec.id);
    }
    // The role chip's words: "Name" for one column, "Name: given + family" for several
    const nameWord = (cols) => (cols.length > 1 ? "Name: " + cols.map((c) => c.split(".").pop()).join(" + ") : "Name");
    const fieldCache = new Map();
    const KIND_TYPE = { id: "id", text: "text", category: "cat", boolean: "bool", integer: "num", number: "num", datetime: "time", date: "time" };
    const typeOfKind = (k) => KIND_TYPE[k] || (/currency|number|integer/.test(k) ? "num" : /date|time/.test(k) ? "time" : "text");
    const RESULTS = { lesmis: [["PageRank", "num"], ["Louvain", "cat"]] };
    function fieldsOf(ds) {
        const D = AB.fx.datasets[ds];
        if (!D) return [];
        if (D._fields) return D._fields; // a list handed its own fields (the node inspector's "N more")
        const left = (AB.route && AB.route.frame && AB.route.frame.left) || "";
        const NL = ds === "nested" ? nestedLoaded() : null;
        const steps = (AB.route && AB.route.frame && AB.route.frame.filterOn) || [];
        const ck = ds + "|" + (STYLED[left] ? left : "") + "|" + steps.join(",") + "|" + (NL ? JSON.stringify(NL) : "") + "|" + JSON.stringify(painted[ds] || []);
        if (fieldCache.has(ck)) return fieldCache.get(ck);
        const used = Object.assign({}, USED_BY[ds] || {}, STYLED[left] || {});
        // what the reader painted from an attribute (Color by, Size by, a bound line) is in use too
        (painted[ds] || []).forEach((p) => { const w = p.element === "edge" && p.prop === "Size" ? "Width" : p.prop; used[p.name] = (used[p.name] ? used[p.name] + ", " : "") + w + (p.on === "row" ? "" : " (Everything)"); });
        if (NL) Object.values(NL.name || {}).forEach((cols) => cols.forEach((c) => { used[c] = nameWord(cols); })); // the Name the last Load chose, per type
        const f = (name, type, o) => Object.assign({ name, label: name, parent: null, type, fill: null, usedBy: used[name] || null, computed: false }, o || {});
        let out = [];
        if (ds === "wide") {
            const col = (a, n) => f(a.name, typeOfKind(a.kind), { fill: a.filled / n });
            out = [{ table: "hosts", element: "node", fields: D.nodeAttributes.map((a) => col(a, D.nodes)) }, { table: "connections", element: "edge", fields: D.edgeAttributes.map((a) => col(a, D.edges)) }];
        } else if (ds === "nested") {
            // One table per array of records the last Load used; a sub-object's fields sit in its folder
            // (the parent path without the record's "attributes." holder); an array follows its Load
            // outcome: One value (kept whole), Several values (a list), Several edges (not an
            // attribute: the edges), Several rows (a table of its own); a sub-object kept as one value
            // is one whole field.
            const RES = "data.researchers[].";
            const outcome = { "relationships.coauthor_ids": NL.co, "attributes.affiliations": NL.aff, "attributes.profile.contact.addresses": NL.addr };
            const kept = (rel) => NL.keep.find((k) => rel === k || rel.startsWith(k + "."));
            const on = { "data.researchers[]": NL.researchers, "data.institutions[]": NL.institutions, "links[]": NL.links };
            out = Object.keys(D.recordArrays).filter((arr) => on[arr] !== false).map((arr) => {
                const n = D.recordArrays[arr], pre = arr + ".";
                const kinds = {};
                D.paths.forEach((p) => { if (p.path.startsWith(pre)) kinds[p.path.slice(pre.length)] = p; });
                const fields = [];
                Object.keys(kinds).forEach((rel) => {
                    if (rel.includes("[]")) return; // inside an array
                    const pick = pre === RES ? outcome[rel] : null;
                    if (pick === "edges" || pick === "rows") return; // edges, or a table of its own
                    const k0 = pre === RES ? kept(rel) : null;
                    if (k0 && k0 !== rel) return; // inside a sub-object kept as one value
                    const p = kinds[rel], k = Object.keys(p.kinds).filter((x) => x !== "null");
                    if (k[0] === "object" && !k0) return; // a folder, not a value
                    const items = kinds[rel + "[]"];
                    const type = k0 || pick === "one" ? "whole" : k[0] === "array" ? (items && items.kinds.object ? "whole" : "list") : k[0] === "number" ? "num" : k[0] === "boolean" ? "bool" : "text";
                    const segs = rel.split(".");
                    const parent = segs.length > 1 ? segs.slice(0, -1).join(".") : null; // the full sub-object path, as the element reports it
                    fields.push(f(rel, type, { label: segs[segs.length - 1], parent, fill: (p.count - (p.kinds.null || 0)) / n }));
                });
                return { table: arr.replace(/^data\./, "").replace(/\[\]$/, ""), element: /^links/.test(arr) ? "edge" : "node", fields };
            });
            // Several rows: the child table's columns (the items' leaves), after its parent's table
            const child = (rel, table, element) => {
                const p0 = RES + rel + "[].", n = (D.paths.find((q) => q.path === RES + rel + "[]") || {}).count || 0;
                const fields = D.paths.filter((q) => q.path.startsWith(p0) && !q.path.slice(p0.length).includes("[") && !q.kinds.object && !q.kinds.array).map((q) => {
                    const r = q.path.slice(p0.length), segs = r.split("."), k = Object.keys(q.kinds).filter((x) => x !== "null")[0];
                    return f(r, k === "number" ? "num" : k === "boolean" ? "bool" : "text", { label: segs[segs.length - 1], parent: segs.length > 1 ? segs.slice(0, -1).join(".") : null, fill: (q.count - (q.kinds.null || 0)) / n });
                });
                out.splice(1, 0, { table, element, fields });
            };
            if (NL.researchers && NL.addr === "rows") child("attributes.profile.contact.addresses", "addresses", "node");
            if (NL.researchers && NL.aff === "rows") child("attributes.affiliations", "affiliations", "edge");
        } else if (ds === "plainJson") {
            const doc = D.document, keys = (rows) => [...new Set(rows.flatMap((r) => Object.keys(r)))];
            const fill = (rows, k) => rows.filter((r) => r[k] != null).length / rows.length;
            const ty = (rows, k) => (rows.every((r) => r[k] == null || typeof r[k] === "number") ? "num" : "text");
            out = [{ table: "nodes", element: "node", fields: keys(doc.nodes).map((k) => f(k, ty(doc.nodes, k), { fill: fill(doc.nodes, k) })) },
                { table: "links", element: "edge", fields: keys(doc.links).map((k) => f(k, ty(doc.links, k), { fill: fill(doc.links, k) })) }];
        } else if (ds === "registry") {
            // the package registry's columns (data-page/json-keyed): every record carries each one
            out = [{ table: "packages", element: "node", fields: [f("key", "id", { usedBy: "Key" }), f("latest", "text"), f("license", "text"), f("description", "text"), f("repository.type", "text", { label: "type", parent: "repository" }), f("repository.url", "text", { label: "url", parent: "repository" }), f("maintainers", "whole")] }];
        } else if (ds === "doorEntries") {
            const [p, b] = D.tables;
            out = [{ table: "people", element: "node", fields: p.columns.map((c) => f(c, c === "id" || c === "badge" ? "id" : "cat")) },
                { table: "buildings", element: "node", fields: b.columns.map((c) => f(c, c === "floors" ? "num" : c === "bldg" ? "id" : "cat")) },
                { table: "entries", element: "edge", fields: [f("time", "time"), f("count", "num", { computed: true })] }];
        } else {
            // lesmis, transactions and the other kit samples: attributes, edge ones marked "(edge)"
            const attrs = (D.attributes || []).map((a) => {
                const edge = /\((edge)\)/.test(a.name);
                return [edge, f(a.name.replace(/ \(edge\)$/, ""), typeOfKind(a.kind), { usedBy: used[a.name] || used[a.name.replace(/ \(edge\)$/, "")] || null, computed: ds === "lesmis" && (a.name === "degree" || a.name === "betweenness") })];
            });
            out = [{ table: ds === "transactions" ? "accounts" : "nodes", element: "node", fields: attrs.filter(([e]) => !e).map(([, x]) => x) },
                { table: ds === "transactions" ? "transfers" : "edges", element: "edge", fields: attrs.filter(([e]) => e).map(([, x]) => x) }];
        }
        out = out.filter((g) => g.fields.length);
        // A field a filter step reads (frame.filterOn, from the Filters the route's Data place lists) is in use
        if (steps.length) out = out.map((g) => Object.assign({}, g, { fields: g.fields.map((x) => (steps.includes(x.name) ? Object.assign({}, x, { usedBy: (x.usedBy ? x.usedBy + ", " : "") + "Filter step" }) : x)) }));
        fieldCache.set(ck, out);
        return out;
    }
    // ---------- painting an attribute in a loaded project (wide, nested, plain JSON) ----------
    // AB.painted[ds]: the bindings the reader made, newest last: { prop: "Color" | "Size", name, type,
    // element, table, on }. on is "row" (Color by, Size by: a measure row named after the attribute,
    // spec 3.2) or the inspector route whose line was bound (Everything's Color line). One per prop and
    // on: a new pick replaces the old. The tree, the canvas, the legend and the inspectors read it.
    // ponytail: a stand-in for graphty-element's style layers, kept for the session only.
    const painted = {};
    // The records a field's table holds, in the canvas's node and edge order (AB.walkList's for nodes)
    function recordsOf(ds, g) {
        const D = AB.fx.datasets[ds];
        if (ds === "wide") return g.element === "edge" ? D.edgeRows : D.nodeRows;
        if (ds === "plainJson") return g.element === "edge" ? D.document.links : D.document.nodes;
        const doc = D.document;
        return g.table === "researchers" ? doc.data.researchers : g.table === "institutions" ? doc.data.institutions : g.table === "links" ? doc.links : [];
    }
    const valueAt = (r, name) => (r == null ? undefined : name in r ? r[name] : pathAt(r, name));
    function fieldIn(ds, name) {
        for (const g of fieldsOf(ds)) { const x = g.fields.find((f) => f.name === name); if (x) return [x, g]; }
        return [null, null];
    }
    // paintBy(ds, "Color" | "Size", name, on): records the binding and returns it; a field the property
    // cannot take raises its reason as a notice and returns null
    function paintBy(ds, prop, name, on) {
        const [x, g] = fieldIn(ds, name);
        if (!x) return null;
        const why = unsuitable(prop === "Color" ? "color" : "number", x);
        if (why) { notice(why); return null; }
        on = on || "row";
        painted[ds] = (painted[ds] || []).filter((p) => !(p.prop === prop && p.on === on));
        const p = { prop, name, type: x.type, element: g.element, table: g.table, on };
        painted[ds].push(p);
        AB.paintedLast = { ds, prop };
        return p;
    }
    // The binding on screen for a prop and element: a row's wins over Everything's line (rows paint above it)
    const paintOf = (ds, prop, element) => {
        const l = (painted[ds] || []).filter((p) => p.prop === prop && (!element || p.element === element));
        return l.filter((p) => p.on === "row").pop() || l.pop() || null;
    };
    // The lines a bind icon bound on one inspector (on === that route), as styleTab's `bound`; a click
    // on one opens its Binding popover (style-pickers/bound)
    function boundOn(route) {
        const ds = AB.route && AB.route.frame.dataset, out = {};
        (painted[ds] || []).filter((p) => p.on === route).forEach((p) => {
            const ch = p.element + "." + (p.prop === "Color" ? "color" : p.element === "edge" ? "width" : "size");
            out[ch] = p.prop === "Color" ? { field: p.name, palette: p.type === "num" ? "Orange to brown" : "Eight distinct", ramp: p.type === "num" ? ["#ef7818", "#662506"] : ["#E69F00", "#0072B2"], go: "bound" }
                : { field: p.name, type: p.type, range: p.element === "edge" ? "0.5 to 4" : "0.5 to 3", go: "bound" };
        });
        return out;
    }
    // Color by and Size by from an attribute's menu: the measure row, its inspector and the colored canvas
    function paintRow(ds, prop, name) {
        if (paintBy(ds, prop, name, "row")) go("graph-place", "painted");
    }

    // ---------- an attribute's menu (spec 10.3): Data > Attributes, the attribute inspector's "...", a table column ----------
    // attributeMenu(anchor, ds, name, { noTable, editOn, table }): one menu for every project. In a loaded
    // project (wide, nested, plain JSON) Color by and Size by add the measure row (paintRow), Filter to...
    // adds a step on the attribute (AB.filterTo), Create set where this is... opens Select with the
    // attribute in its query (AB.whereFrom) and Read as... opens the attribute's inspector (AB.openField).
    // A command the skeleton does not model says so and gives focus back to the row it was opened on.
    function attributeMenu(anchor, ds, name, o) {
        o = o || {};
        const [x, g] = fieldIn(ds, name);
        const edge = g ? g.element === "edge" : !!o.edge;
        const loaded = ["wide", "nested", "plainJson"].includes(ds);
        const back = () => requestAnimationFrame(() => { if (anchor && anchor.isConnected) anchor.focus(); });
        const say = (text) => () => { notice(text + " (not wired in the skeleton)"); back(); };
        const paint = (prop) => (loaded ? () => paintRow(ds, prop, name) : say((prop === "Color" ? "Color by " : edge ? "Width by " : "Size by ") + name));
        const no = (kind) => (loaded && x ? unsuitable(kind, x) : null) || false;
        openMenu(anchor, [
            { heading: name },
            { label: "Color by", disabled: no("color"), onClick: paint("Color") },
            { label: edge ? "Width by" : "Size by", disabled: no("number"), onClick: paint("Size") },
            cmd("label-by", { go: null, onClick: say("Label by " + name) }),
            { label: "Show as groups", onClick: say("Show as groups by " + name) },
            { label: "Place by", needs: "graphty-element places nodes only by position attributes; " + name + " as an axis needs a layout that reads any attribute" },
            { sep: true },
            { label: "Filter to...", onClick: () => AB.filterTo(ds, name) },
            { label: "Create set where this is...", onClick: () => AB.whereFrom(ds, name) },
            { sep: true },
            { label: "Read as...", onClick: () => AB.openField(ds, name) },
            o.editOn ? { label: "Edit on the Data page", desc: "Its roles, type and links, under its column header", go: o.editOn } : null,
            o.noTable || !o.table ? null : { sep: true },
            o.noTable || !o.table ? null : { label: "Show in table", go: ["table-dock", o.table[edge ? 1 : 0]] },
        ].filter(Boolean));
    }

    // Why a typed picker cannot take a field (null: it can). Suitability stands in for the element's
    // AttributeDescriptor.domainKind.
    function unsuitable(kind, x) {
        if (x.type === "whole" && kind && kind !== "any") return x.name + " is kept as one value; open it on the Data page to read its parts";
        if (x.type === "list" && (kind === "number" || kind === "color")) return x.label + " holds several values; use Show as groups";
        if (kind === "number" && x.type !== "num") return "Not a number";
        return null;
    }

    // ---------- the field list (spec 2.5): one component, two sizes ----------
    // fieldList({ size: "menu" | "panel", dataset, kind, element, current, checkboxes, locked, onPick,
    //   onToggle, typed, results, notes, items, query, label, onClose, trail })
    // - size "menu": a dark list for every attribute picker (bind, Label, Color by, Size by, Width by, a
    //   filter step, a link's "by", Go to column, Weight, Insert attribute, a recipe's binding). Open it
    //   from a control with openFieldList(anchor, o); a section drawing it in its own overlay places it
    //   with position(fieldList(o), anchor, place). "panel": the same list inline (Data > Attributes,
    //   "N more attributes", the table's Columns).
    // - The fields are the project on screen's (dataset, default AB.route.frame.dataset), grouped by
    //   table, open; `element` "node" or "edge" keeps one side. In each table "In use (n)" first, each
    //   row tagged with what uses it, then computed, then by name; folders only from the data's nesting,
    //   collapsed unless something inside is in use. Then Results and, at menu size, Notes.
    // - kind: "number" (Size by, Width by, Weight), "color" (Color by), "text" (Label), or none. A typed
    //   picker lists unsuitable fields last, disabled, in one closed folder ("Not a number (45)", or "Not
    //   usable here (3)" for other kinds), each with its reason on a second line.
    // - Find past 15 rows, matching word starts; matches in bold; the count announced; focus stays in
    //   Find over the listbox (arrows move, Enter picks, Esc clears then closes). No match: the empty
    //   line `No match for "x"` with Clear.
    // - checkboxes: the names shown (panel size, the table's Columns); `locked` names cannot be
    //   unchecked (the key); onToggle(name, on). typed: Typed text first (onPick(null, null)).
    // - items: [{ label, desc, disabled, onClick, check }] lists those instead of fields, with the same
    //   find (the "+" menu and any list past 15 that is not fields).
    // - onPick(name, type, field); trail(field) adds a node at a row's end (a role tag).
    let flSeq = 0;
    function fieldList(o) {
        o = Object.assign({ size: "menu" }, o);
        const menuSize = o.size === "menu";
        const ds = o.dataset || (AB.route && AB.route.frame.dataset) || "lesmis";
        const id = "ab-fl-" + ++flSeq;
        const checks = o.checkboxes ? new Set(o.checkboxes) : null;
        const open = {}; // folder key -> open
        // ---- the rows: groups of { head, rows }, a row being a field, an item or a folder ----
        const groups = [];
        if (o.items) groups.push({ head: null, rows: o.items.filter((it) => !it.sep).map((it) => (it.heading ? { heading: it.heading } : { item: it, label: typeof it.label === "string" ? it.label : it.label.textContent, name: typeof it.label === "string" ? it.label : it.label.textContent })) });
        else {
            if (o.typed) groups.push({ head: null, rows: [{ typed: true, name: "Typed text", label: "Typed text" }] });
            fieldsOf(ds).filter((g) => !o.element || g.element === o.element).forEach((g) => groups.push({ head: g.table, fields: g.fields }));
            const res = o.results !== false && RESULTS[ds];
            if (res) groups.push({ head: "Results", fields: res.map(([n, t]) => ({ name: n, label: n, type: t, parent: null, fill: null, usedBy: null, computed: true })) });
            if (o.notes != null ? o.notes : menuSize) groups.push({ head: "Notes", fields: [{ name: "Note count", label: "Note count", type: "num", parent: null, fill: null, usedBy: null, computed: true }].concat(o.kind === "text" ? [{ name: "Latest note", label: "Latest note", type: "text", parent: null, fill: null, usedBy: null, computed: true }] : []) });
        }
        const total = groups.reduce((n, g) => n + (g.fields ? g.fields.length : g.rows.filter((r) => !r.heading).length), 0);
        const findOn = total > 15;
        let query = findOn ? o.query || "" : "";
        let emptyAt = 0;

        const box = h("div", { class: "ab-fl " + (menuSize ? "k-menu ab-menu ab-fl-menu" : "ab-fl-panel") });
        const list = h("div", { id, class: "ab-fl-list", role: "listbox", "aria-label": o.label || (o.items ? "Choices" : "Attributes"), "aria-multiselectable": checks ? "true" : null });
        let input = null;
        const say = h("span", { class: "ab-fl-count", role: "status" }); // the match count is announced as Find narrows
        if (findOn) {
            input = h("input", { type: "search", placeholder: o.items ? "Find" : "Find attribute", "aria-label": o.items ? "Find" : "Find attribute", role: "combobox", "aria-controls": id, "aria-expanded": "true", "aria-autocomplete": "list", value: query || null });
            box.append(h("div", { class: "ab-fl-find" }, h("label", { class: "ab-find" }, icon("search", "sm"), input), say));
            // a find that opens with text in it puts the caret after that text, so typing adds to it
            input.addEventListener("focus", () => { const n = input.value.length; try { input.setSelectionRange(n, n); } catch (e) { /* type=search may refuse */ } });
        } else list.tabIndex = 0; // no find: the listbox holds focus and the active row
        box.append(list);
        // The no-match line and its Clear sit beside the listbox, not in it: a listbox holds only options
        const none = h("div", { class: "ab-fl-noneslot" });
        box.append(none);

        let active = null;
        const opts = () => [...list.querySelectorAll("[data-fl-row]")];
        const setActive = (el) => {
            opts().forEach((x) => x.removeAttribute("data-hover"));
            active = el;
            if (el) { el.setAttribute("data-hover", ""); el.scrollIntoView({ block: "nearest" }); }
            (input || list).setAttribute("aria-activedescendant", el ? el.id : "");
        };
        const choose = (el) => { if (el && el.getAttribute("aria-disabled") !== "true") el.click(); };

        let seq = 0;
        const glyph = (x) => (x.type === "list" ? icon("list", "sm") : x.type === "whole" ? h("span", { class: "ab-abc" }, "{ }") : typeGlyph(x.type === "num" || x.type === "time" || x.type === "bool" ? x.type : "cat"));
        const fillText = (x) => (x.fill != null && x.fill < 1 ? (x.fill > 0 && x.fill < 0.01 ? "<1%" : Math.round(x.fill * 100) + "%") : null);
        // a character budget for the middle ellipsis: the menu is 320 px, the panel the left panel's width
        const maxFor = (trail) => (menuSize ? (trail || o.trail ? 30 : 36) : trail || o.trail ? 20 : 26) - (checks ? 2 : 0); // o.trail: a value at the row's end (the inspector)
        // The name cut at the width the row really has (spec 2.5: truncate to the available width, the
        // same way in every list): drawn whole, then cut in the middle only if it overflows once laid out.
        // Not laid out (a list built off screen): the fixed length is the fallback.
        function fitName(text, max, ranges, desc) {
            const box = h("span", { class: "ab-fl-name" }, truncMiddle(text, Infinity, ranges), desc);
            requestAnimationFrame(() => {
                const inner = box.firstChild;
                if (!box.isConnected || !box.clientWidth) { box.replaceChild(truncMiddle(text, max, ranges), inner); return; }
                const need = inner.getBoundingClientRect().width, have = box.clientWidth;
                if (need <= have + 0.5) return;
                const fit = Math.max(8, Math.floor(String(text).length * have / need) - 1);
                box.replaceChild(truncMiddle(text, fit, ranges), inner);
            });
            return box;
        }
        // one row: glyph, name (middle ellipsis, matches bold), then what uses it or its fill
        function fieldRow(x, ranges, full) {
            const why = unsuitable(o.kind, x);
            const shownName = full ? (x.parent ? x.parent + "." + x.label : x.label) : x.label;
            const usedText = x.usedBy || null, fill = fillText(x);
            const checked = checks ? checks.has(x.name) : x.name === o.current;
            const locked = checks && o.locked && o.locked.includes(x.name);
            const dis = !!why || locked;
            const trailEl = o.trail ? o.trail(x) : null;
            const el = h("div", { id: id + "-" + ++seq, class: (menuSize ? "k-menu-item " : "k-row ") + "ab-fl-opt", role: "option", "data-fl-row": "", "aria-selected": String(!!checked), "aria-disabled": dis ? "true" : null, "data-described": why && why !== "Not a number" ? "" : null },
                h("span", { class: "k-check-col" }, checks ? h("span", { class: "ab-fl-box", "data-on": checked ? "" : null }, checked ? icon("check", "sm") : null) : checked ? icon("check", "sm") : null),
                h("span", { class: "ab-fl-glyph" }, glyph(x)),
                fitName(shownName, maxFor(usedText || fill), ranges, why && why !== "Not a number" ? h("span", { class: "k-menu-desc", "aria-hidden": "true" }, x.type === "whole" ? "kept as one value" : x.type === "list" ? "several values" : why) : null),
                usedText ? h("span", { class: "ab-fl-trail" }, usedText) : fill ? tip(h("span", { class: "ab-fl-trail" }, fill), "Filled on " + fill + " of the rows; the rest have no value", { label: false }) : null,
                trailEl);
            // the trail (a value, a role tag) is part of what the row says, so a screen reader hears it too
            const trailText = trailEl ? trailEl.textContent.trim() : "";
            el.setAttribute("aria-label", x.name + (trailText ? ", " + trailText : "") + (usedText ? ", in use: " + usedText : "") + (fill ? ", " + fill + " filled" : "") + (locked ? ", always shown" : ""));
            if (why) el.setAttribute("aria-description", why);
            if (why && why !== "Not a number" && !locked) tip(el, why, { label: false }); // the full reason; the row says it in two words
            if (locked) tip(el, "The key column always shows", { label: false });
            else if (!why && !full && x.parent) tip(el, x.parent + "." + x.label, { label: false }); // a nested field shows its own name; the tooltip gives the path
            el.addEventListener("click", () => {
                if (dis) return;
                if (checks) { const on = !checks.has(x.name); if (on) checks.add(x.name); else checks.delete(x.name); if (o.onToggle) o.onToggle(x.name, on); draw(); return; }
                if (o.onPick) o.onPick(x.name, x.type, x);
            });
            el.addEventListener("pointerenter", () => setActive(el));
            return el;
        }
        function itemRow(r, ranges) {
            const it = r.item, dis = !!it.disabled, reason = typeof it.disabled === "string" ? it.disabled : null;
            const el = h("div", { id: id + "-" + ++seq, class: (menuSize ? "k-menu-item " : "k-row ") + "ab-fl-opt", role: "option", "data-fl-row": "", "aria-selected": String(!!it.check), "aria-disabled": dis ? "true" : null, "data-described": reason ? "" : null },
                h("span", { class: "k-check-col" }, it.check ? icon("check", "sm") : null),
                h("span", { class: "ab-fl-name" }, truncMiddle(r.label, 40, ranges), reason ? h("span", { class: "k-menu-desc", "aria-hidden": "true" }, reason) : null));
            el.setAttribute("aria-label", r.label);
            if (reason) el.setAttribute("aria-description", reason);
            if (it.desc && !reason) tip(el, it.desc, { label: false });
            el.addEventListener("click", () => { if (!dis && it.onClick) it.onClick(); });
            el.addEventListener("pointerenter", () => setActive(el));
            return el;
        }
        const sub = (text, extra) => h("div", Object.assign({ class: menuSize ? "k-menu-label ab-fl-sub" : "ab-fl-sub", role: "presentation" }, extra || {}), text);
        // a folder: a subhead that opens and closes in place (Enter or a click)
        function folder(key, title, rows, startOpen) {
            const isOpen = key in open ? open[key] : startOpen;
            const head = h("div", { id: id + "-" + ++seq, class: (menuSize ? "k-menu-item " : "k-row ") + "ab-fl-folder", role: "option", "data-fl-row": "", "aria-selected": "false", "data-open": String(isOpen) }, // an option may not carry aria-expanded: the label says it
                // a nested folder shows its last segment, indented one step per level; the full path is its tooltip and name
                h("span", { class: "k-check-col", style: title.includes(".") ? "margin-inline-start:" + 12 * (title.split(".").length - 1) + "px" : null }, icon(isOpen ? "chevron-down" : "chevron-right", "sm")),
                h("span", { class: "ab-fl-name" }, title.includes(".") ? tip(h("span", { class: "k-ellipsis" }, title.split(".").pop()), title, { label: false }) : truncMiddle(title, maxFor(true))), h("span", { class: "ab-fl-trail" }, String(rows.length)));
            head.setAttribute("aria-label", title + ", " + rows.length + (rows.length === 1 ? " attribute" : " attributes") + (isOpen ? "" : ", collapsed"));
            head.addEventListener("click", () => { open[key] = !isOpen; draw(head.id); });
            head.addEventListener("pointerenter", () => setActive(head));
            return [head].concat(isOpen ? rows.map((x) => { const r = fieldRow(x); r.classList.add("ab-fl-in"); return r; }) : []);
        }

        // With more than one table, an option says its table, so a name two tables share is not ambiguous
        const tables = groups.filter((g) => g.head && g.fields).length;
        function draw(keepActive) {
            list.replaceChildren();
            none.replaceChildren();
            seq = 0;
            let hits = 0;
            groups.forEach((g, gi) => {
                const out = [];
                if (g.rows) {
                    g.rows.forEach((r) => {
                        if (r.heading) { if (!query) out.push(sub(r.heading)); return; }
                        const m = query ? wordMatch(r.label, query) : [];
                        if (!m) return;
                        hits++;
                        out.push(r.typed ? itemRow({ item: { label: "Typed text", check: o.current === null, onClick: () => o.onPick && o.onPick(null, null) }, label: "Typed text" }, m) : itemRow(r, m));
                    });
                } else if (query) {
                    g.fields.forEach((x) => { const full = x.parent ? x.parent + "." + x.label : x.label, m = wordMatch(full, query); if (m) { hits++; out.push(fieldRow(x, m, true)); } });
                } else {
                    const ok = g.fields.filter((x) => !unsuitable(o.kind, x)), bad = g.fields.filter((x) => unsuitable(o.kind, x));
                    const inUse = ok.filter((x) => x.usedBy);
                    const rest = ok.filter((x) => !x.usedBy).sort((a, b) => (b.computed - a.computed) || a.name.localeCompare(b.name));
                    if (inUse.length) out.push(sub("In use (" + inUse.length + ")"), ...inUse.map((x) => fieldRow(x)));
                    if (inUse.length && rest.length) out.push(sub("Other attributes"));
                    rest.filter((x) => !x.parent).forEach((x) => out.push(fieldRow(x)));
                    const folders = [...new Set(rest.filter((x) => x.parent).map((x) => x.parent))].sort();
                    folders.forEach((p) => out.push(...folder(gi + ":" + p, p, rest.filter((x) => x.parent === p), g.fields.some((x) => x.parent === p && x.usedBy))));
                    // every unsuitable field sits in one closed folder; each row keeps its reason
                    if (bad.length) out.push(...folder(gi + ":nan", (o.kind === "number" ? "Not a number" : "Not usable here") + " (" + bad.length + ")", bad, false));
                    hits += g.fields.length;
                }
                if (!out.length) return;
                if (tables > 1 && typeof g.head === "string") out.forEach((el) => { if (el.matches && el.matches("[data-fl-row]")) el.setAttribute("aria-label", el.getAttribute("aria-label") + ", " + g.head); });
                if (g.head) list.append(h("div", { class: (menuSize ? "k-menu-label " : "") + "ab-fl-table", role: "presentation" }, g.head));
                list.append(...out);
            });
            // o.empty: fields this element has no value for, counted and not listed; Find still names them
            const emptyHits = query && o.empty ? o.empty.filter((nm) => wordMatch(nm, query)) : [];
            if (query && !hits && !emptyHits.length) {
                const clear = h("span", Object.assign({ class: "ab-link", role: "button" }, act({ onClick: () => { query = ""; input.value = ""; draw(); input.focus(); } })), "Clear");
                none.append(h("div", { class: "ab-fl-none" }, noMatch(query), " ", clear));
            }
            if (emptyHits.length) none.append(h("div", { class: "ab-fl-none k-secondary" }, emptyHits.join(", ") + (emptyHits.length === 1 ? " is" : " are") + " empty " + (o.emptyWhere || "here")));
            emptyAt = emptyHits.length;
            say.textContent = query && hits ? (hits === 1 ? "1 match" : hits + " matches") : "";
            const rows = opts();
            // a menu opens on its checked row, so Enter keeps the current choice and the arrows move from it
            setActive((keepActive && document.getElementById(keepActive)) || (query ? rows.find((x) => x.getAttribute("aria-disabled") !== "true") : null) || (menuSize ? rows.find((x) => x.getAttribute("aria-selected") === "true") : null) || null);
            return hits;
        }
        draw();
        if (input) {
            let t = 0;
            input.addEventListener("input", () => { query = input.value.trim(); const n = draw(); clearTimeout(t); t = setTimeout(() => announce(query ? (n ? n + (n === 1 ? " match" : " matches") : emptyAt ? emptyAt + " empty " + (o.emptyWhere || "here") : 'No match for "' + query + '"') : total + " attributes"), 300); });
        }
        (input || list).addEventListener("keydown", (e) => {
            const rows = opts(), i = rows.indexOf(active), k = e.key;
            if (k === "ArrowDown") setActive(rows[Math.min(rows.length - 1, i + 1)] || rows[0]);
            else if (k === "ArrowUp") setActive(rows[Math.max(0, i - 1)] || rows[0]);
            else if (k === "Home" && !input) setActive(rows[0]);
            else if (k === "End" && !input) setActive(rows[rows.length - 1]);
            else if (k === "Enter" || (k === " " && !input)) choose(active);
            else if ((k === "ArrowRight" || k === "ArrowLeft") && active && active.hasAttribute("data-open") && (active.getAttribute("data-open") === "true") === (k === "ArrowLeft")) active.click();
            else if (k === "Escape" && input && input.value) { query = ""; input.value = ""; draw(); }
            // Tab leaves a panel list like any field (never a trap); a menu-size list closes on it
            else if ((k === "Escape" || (k === "Tab" && menuSize)) && (o.onClose || menuSize)) { if (o.onClose) o.onClose(); else AB.close(); }
            else return;
            e.preventDefault();
            e.stopPropagation();
        });
        return box;
    }

    // ---------- the problem block (spec 13): what happened, what to do, at most one action ----------
    // problem({ what, todo, action: { label, go | onClick }, level: "error" | "partial" })
    function problem(o) {
        const err = o.level !== "partial";
        return h("div", { class: "ab-problem", "data-level": err ? "error" : "partial", role: err ? "alert" : "status" },
            h("span", { class: "k-warn-glyph" + (err ? " k-err-glyph" : ""), "aria-hidden": "true" }, err ? "x" : "!"),
            h("div", { class: "ab-problem-text" }, h("div", { class: "ab-problem-what" }, o.what), o.todo ? h("div", { class: "ab-problem-todo" }, o.todo) : null,
                o.action ? h("div", { class: "ab-problem-act" }, button(o.action.label, Object.assign({ kind: "secondary" }, o.action))) : null));
    }

    Object.assign(AB, {
        graphHead, treebar, typeGlyph, roleTag, pageHead, addNote, noteSubject,
        fieldList, openFieldList, fieldsOf, nestedLoaded, painted, paintBy, paintOf, paintRow, recordsOf, valueAt, fieldIn, attributeMenu, boundOn, nameCols, nameOf, nameWord, problem, truncMiddle, wordMatch,
        registerSection, h, append, icon, ICON, href, go, link, nav, act, mem,
        tip, tipSweep, showTip, button, iconButton, chit, ramp, section, fieldRow, data, row, field, tabs, seg,
        empty, noMatch, plus, createThenRename, notesSection, paintsLine, paintOrderLine,
        announce, renameInPlace, needsElement, openQuestion,
        inspector, dataVocab, dataTab, tree, treeFooter, footer: treeFooter,
        position, popover, menu, openMenu, closeMenu, modal, confirm, notice, placeNotice, flash, deleted, dockToggle, drawing,
        toolbarButton, toolbarBar, mainToolbar, layoutButton, legendButton, setLayout, legendOn, setLegend, legendCard,
        CHANNELS, SECTIONS, styleTab, whyThisLook, COMMANDS, SAVED_VIEWS, cmd, plain, colorField, scrub,
    });
    Object.assign(window, { registerSection, h, icon, link });
})();
