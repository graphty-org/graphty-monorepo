/* Refined B skeleton: shared helpers for section files. Plain ASCII.
   Every helper is on window.AB; the common ones are also globals (h, icon, link, ...).
   Read README.md before adding a section. */
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
    function h(tag, attrs, ...kids) {
        const svg = tag === "svg" || tag === "use" || tag === "path" || tag === "rect" || tag === "circle" || tag === "line" || tag === "g" || tag === "text" || tag === "polyline";
        const el = svg ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
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
        // Everything: a filled square (spec 3.2), so it never reads as an empty checkbox
        "square-filled": '<rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/>',
    };
    function icon(name, size) {
        const cls = "k-i" + (size === "sm" ? " k-i-sm" : size === "lg" ? " k-i-lg" : "");
        const s = h("svg", { class: cls, "aria-hidden": "true" });
        if (EXTRA_ICONS[name]) { s.setAttribute("viewBox", "0 0 24 24"); s.innerHTML = EXTRA_ICONS[name]; return s; }
        s.append(h("use", { href: "kit/icons.svg#" + name }));
        return s;
    }

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
        el.setAttribute("role", el.getAttribute("role") || "link");
        el.tabIndex = 0;
        el.dataset.nav = href(sectionId, state);
        el.addEventListener("click", (e) => {
            e.stopPropagation();
            go(sectionId, state);
        });
        el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                go(sectionId, state);
            }
        });
        return el;
    }
    // Action target: { go: [id, state] } or { onClick: fn }. Returns attrs for h().
    function act(o) {
        if (!o) return {};
        if (o.go) return { tabindex: "0", "data-nav": href(o.go[0], o.go[1]), on: { click: (e) => { e.stopPropagation(); go(o.go[0], o.go[1]); }, keydown: (e) => { if (e.key === "Enter") go(o.go[0], o.go[1]); } } };
        if (o.onClick) return { tabindex: "0", on: { click: (e) => { e.stopPropagation(); o.onClick(e); }, keydown: (e) => { if (e.key === "Enter") o.onClick(e); } } };
        return {};
    }

    // ---------- small builders ----------
    function button(label, o) {
        o = o || {};
        const cls = "k-btn" + (o.kind === "secondary" ? " k-btn-secondary" : o.kind === "ghost" ? " k-btn-ghost" : "") + (o.block ? " k-btn-block" : "");
        return h("span", Object.assign({ class: cls, role: "button", "aria-disabled": o.disabled ? "true" : null }, act(o)), o.icon ? icon(o.icon, "sm") : null, label);
    }
    function iconButton(name, label, o) {
        o = o || {};
        return h("span", Object.assign({ class: "k-icon-btn", role: "button", "aria-label": label, title: label, "aria-pressed": o.pressed == null ? null : String(!!o.pressed) }, act(o)), icon(name));
    }
    function chit(color, round) {
        return h("span", { class: "k-chit" + (round ? " k-chit-round" : ""), style: "background:" + color });
    }
    // A sequential ramp swatch for a measure row
    function ramp(from, to) {
        return h("span", { class: "ab-ramp", style: `background:linear-gradient(90deg,${from || "#d6e6f4"},${to || "#0072B2"})` });
    }
    // Viewer conveniences kept in this browser (never required; a private window just forgets)
    const mem = {
        get(k) { try { return localStorage.getItem("ab." + k); } catch (e) { return null; } },
        set(k, v) { try { localStorage.setItem("ab." + k, v); } catch (e) { /* fine */ } },
    };
    // A section block: section("Overview", child, ...) or
    // section({ title, count, actions:[nodes], collapsed, collapsible, summary, key, remember }, ...)
    // collapsible: the head toggles the body in place; closed, `summary` shows as one line.
    // The open or closed choice is remembered per `key` (default: the title) in this browser.
    function section(head, ...kids) {
        const o = typeof head === "string" ? { title: head } : head;
        const s = h("section", { class: "k-section", "data-collapsed": o.collapsed ? "" : null });
        const count = o.count != null ? h("span", { class: "k-count k-num" }, " " + o.count) : null;
        if (!o.collapsible) {
            s.append(h("div", { class: "k-section-head" }, o.title, count, h("span", { class: "k-grow" }), o.actions || null));
            if (!o.collapsed) append(s, kids);
            return s;
        }
        const key = "sec." + (o.key || o.title);
        const saved = o.remember === false ? null : mem.get(key);
        let open = saved == null ? !o.collapsed : saved === "1";
        const disc = h("span", { class: "ab-disc" });
        const btn = h("span", { class: "ab-sec-btn", role: "button", tabindex: "0", "aria-label": o.countLabel ? o.title + ", " + o.countLabel : null }, disc, o.title, count);
        const hd = h("div", { class: "k-section-head ab-sec-toggle" }, h("span", { role: "heading", "aria-level": "3", class: "ab-sec-h" }, btn), h("span", { class: "k-grow" }), o.actions || null);
        const body = append(h("div", { class: "ab-sec-body" }), kids);
        const sum = o.summary ? h("div", { class: "ab-sec-sum k-secondary", title: typeof o.summary === "string" ? o.summary : null }, o.summary) : null;
        const paint = () => {
            disc.replaceChildren(icon(open ? "chevron-down" : "chevron-right", "sm"));
            btn.setAttribute("aria-expanded", String(open));
            s.toggleAttribute("data-collapsed", !open);
            body.hidden = !open;
            if (sum) sum.hidden = open;
        };
        const flip = () => { open = !open; mem.set(key, open ? "1" : "0"); paint(); };
        hd.addEventListener("click", flip);
        btn.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), e.stopPropagation(), flip()));
        append(s, [hd, sum, body]);
        paint();
        return s;
    }
    // The Notes section every inspector ends with: a count and "Open in Notes" (adding a note
    // lives on N, the selection bar and context menus, never on a "+" here).
    function notesSection(count, target) {
        const t = target || ["notes-place", "about-selection"];
        return section({ title: "Notes", count: count || null, collapsible: true, key: "notes", summary: count ? count + (count === 1 ? " note" : " notes") : "No notes yet" }, h("div", { class: "k-data" }, h("span", { class: "k-name" }, count ? count + (count === 1 ? " note" : " notes") : "No notes yet"), count ? h("span", { class: "k-value" }, link(t[0], t[1], "Open in Notes")) : null));
    }
    // The Paints line every painting row opens its Style tab with (spec 5.1 item 4): an icon, a
    // plain sentence of what the row's selector covers, then the count link. paintsLine(...kids, { title })
    function paintsLine(...kids) {
        const o = kids.length && kids[kids.length - 1] && kids[kids.length - 1].constructor === Object ? kids.pop() : {};
        return h("div", { class: "ab-paints", title: o.title || null }, icon("target", "sm"), h("span", { class: "k-grow" }, "Paints ", kids));
    }
    function data(name, value, o) {
        return h("div", Object.assign({ class: "k-data" }, act(o)), h("span", { class: "k-name" }, name), h("span", { class: "k-value" }, value));
    }
    // row({ icon, label, trail, selected, go, onClick }) -> a k-row
    function row(o) {
        return h("div", Object.assign({ class: "k-row", "aria-selected": o.selected ? "true" : null }, act(o)), o.icon ? icon(o.icon) : null, o.swatch || null, h("span", { class: "k-grow k-ellipsis" }, o.label), o.trail != null ? h("span", { class: "k-secondary k-num" }, o.trail) : null);
    }
    function field(value, o) {
        o = o || {};
        return h("span", Object.assign({ class: "k-field" + (o.span ? " k-span" : ""), role: o.go || o.onClick ? "button" : null }, act(o)), o.icon ? icon(o.icon, "sm") : null, h("span", { class: "k-grow k-ellipsis" }, value), o.caret ? h("span", { class: "k-caret" }, icon("chevron-down", "sm")) : null);
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

    // ---------- live announcements and rename in place ----------
    function announce(text) {
        let live = document.getElementById("ab-live");
        if (!live) document.body.append((live = h("div", { id: "ab-live", class: "k-sr", "aria-live": "polite" })));
        live.textContent = "";
        setTimeout(() => (live.textContent = text), 30);
    }
    // Turn a name element into a text field, text selected. Enter or blur saves, Esc cancels,
    // an empty name restores the old one. o: { onSave(name), onTab(dir) } ; returns nothing.
    function renameInPlace(nameEl, o) {
        o = o || {};
        const old = nameEl.textContent;
        const input = h("input", { class: "ab-rename", type: "text", value: old, "aria-label": "Rename " + old, title: "Enter saves" + (o.onTab ? ", Tab renames the next row" : "") + ", Esc cancels", spellcheck: "false" });
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
    // Why a name cannot change here: a built-in row, or a rename graphty-element cannot store yet
    function renameRefusal(r) {
        if (r.builtin) return "Built-in rows keep their names";
        if (r.renameDisabled) return "Rename needs graphty-element: " + r.renameDisabled;
        return null;
    }

    // ---------- "needs graphty-element": the one mark for every element-gap control ----------
    function needsElement(reason) {
        return h("span", { class: "ab-needs ab-design-note", tabindex: "0", title: reason, "aria-label": "needs graphty-element: " + reason }, "needs graphty-element");
    }

    // The inspector: one frame for every kind of selected thing.
    // inspector({ icon, title, kind, meta, provenance: [label, id, state], menu: [id, state],
    //   stateBar: { text, actions: [{ label, go|onClick }] }, changed, builtin, renameDisabled,
    //   onRename(name), tabs: { Style: fn|node, Data: fn|node }, tab, body })
    // Header line 1: icon and name (double-click renames). Line 2: kind, provenance link, "...".
    // The state bar sits under the header on every tab and is the only button a body may hold.
    // Two or more tabs draw the tab strip; one tab or `body` draws a 32 px spacer instead, so a
    // single body starts at the same height as tab bodies. Tab functions run each time shown.
    const lastTab = {};
    let inspSeq = 0;
    function inspector(o) {
        const wrap = h("div", { class: "ab-insp", "data-changed": o.changed || o.stateBar ? "" : null });
        const canRename = !(o.builtin || o.renameDisabled);
        const name = h("span", { class: "k-name k-strong k-ellipsis", tabindex: "0", role: canRename ? "button" : null, "aria-label": canRename ? "Rename " + o.title : null, "aria-keyshortcuts": canRename ? "F2" : null, title: canRename ? "Double-click or F2 to rename" : null }, o.title);
        const startRename = () => {
            const no = renameRefusal(o);
            if (no) return AB.flash(no);
            renameInPlace(name, { onSave: o.onRename, focusAfter: name });
        };
        name.addEventListener("dblclick", (e) => { e.stopPropagation(); startRename(); });
        name.addEventListener("keydown", (e) => { if (e.key === "F2") { e.preventDefault(); startRename(); } });
        wrap.append(h("div", { class: "ab-insp-head", role: "heading", "aria-level": "2" }, o.icon ? (typeof o.icon === "string" ? icon(o.icon) : o.icon) : null, name,
            o.changed || o.stateBar ? h("span", { class: "ab-changed", role: "img", title: "Changed since it was last computed", "aria-label": "changed since it was last computed" }) : null));
        const prov = o.provenance ? link(o.provenance[1], o.provenance[2], o.provenance[0], { class: "ab-link ab-prov k-ellipsis", title: o.provenance[0] }) : null;
        wrap.append(h("div", { class: "ab-insp-sub" }, o.kind ? h("span", { class: "k-secondary" }, o.kind) : null, prov, h("span", { class: "k-grow" }),
            o.menu ? iconButton("ellipsis", "More actions (Shift+F10)", { go: o.menu }) : null));
        if (o.stateBar) wrap.append(h("div", { class: "ab-statebar", role: "status" }, h("span", { class: "k-grow" }, o.stateBar.text),
            (o.stateBar.actions || []).map((a, i) => button(a.label, Object.assign({ kind: i ? "ghost" : "secondary" }, a)))));
        const body = h("div", { class: "k-scroll ab-insp-body" });
        const names = o.tabs ? Object.keys(o.tabs) : [];
        // The header is two lines on every kind (spec 5.1), so a status line (o.meta) opens the body
        const put = (c) => append(body, [o.meta ? h("div", { class: "ab-insp-meta k-secondary" }, o.meta) : null, typeof c === "function" ? c() : c]);
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
            wrap.append(h("div", { class: "ab-insp-tabs ab-insp-spacer", "aria-hidden": "true" }));
            put(names.length ? o.tabs[names[0]] : o.body);
        }
        wrap.append(body);
        return wrap;
    }

    // ---------- the paint tree ----------
    // tree(rows, opts) ; row = { id, kindIcon, swatch (node), name, count, notes, notesInside, eye: true|false|null,
    //   locked, pinned, children:[...], open, selected, go:[id,state], menu:[id,state] (context menu route), dim,
    //   builtin (keeps its name), renameDisabled: "reason" (needs graphty-element), onRename(name),
    //   queued, partial, progress (each: text, or true; drawn in the progress slot) }
    // Rename: double-click the name, or F2 on the focused row. Tab and Shift+Tab rename the next
    // and previous row. A single click still navigates; a double-click on the eye, disclosure,
    // swatch or count does what one click does.
    function tree(rows, opts) {
        opts = opts || {};
        const ul = h("ul", { class: "ab-tree", role: "tree", "aria-label": opts.label || "Paint order" });
        const all = [];
        const startRename = (entry) => {
            const no = renameRefusal(entry.r);
            if (no) return AB.flash(no);
            const nameEl = entry.li.querySelector(".ab-tname");
            renameInPlace(nameEl, {
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
        const build = (r, level, parentUl) => {
            const li = h("li", { class: "ab-trow", role: "treeitem", "aria-level": String(level), "aria-selected": r.selected ? "true" : "false", "data-dim": r.dim ? "" : null, "data-pinned": r.pinned ? "" : null, style: `--lvl:${level - 1}`, tabindex: "0", "aria-keyshortcuts": r.eye == null ? "F2" : "Space Alt+Space F2" });
            const hasKids = r.children && r.children.length;
            const disc = h("span", { class: "ab-disc" }, hasKids ? icon(r.open ? "chevron-down" : "chevron-right", "sm") : null);
            const eye = r.eye == null ? h("span", { class: "ab-eye-slot" }) : h("span", { class: "ab-eye", role: "button", tabindex: "-1", "aria-label": "Show " + r.name + " on the canvas", "aria-pressed": String(!!r.eye), title: "Show or hide this row's paint. Alt-click: solo" }, icon(r.eye ? "eye" : "eye-off"));
            const progText = (v, word) => (v === true ? word : v);
            const prog = r.progress != null || r.queued || r.partial
                ? h("span", { class: "ab-tprog k-num" }, r.progress != null && typeof r.progress === "number" ? h("span", { class: "k-progress", role: "progressbar", "aria-valuenow": String(Math.round(r.progress * 100)), "aria-label": r.name + " progress" }, h("i", { style: `width:${Math.round(r.progress * 100)}%` })) : null,
                    typeof r.progress === "string" ? r.progress : null, r.queued ? progText(r.queued, "Queued") : null, r.partial ? progText(r.partial, "Partial") : null)
                : null;
            const nameEl = h("span", { class: "ab-tname k-ellipsis" }, r.name);
            append(li, [disc, r.kindIcon ? h("span", { class: "ab-kind" }, typeof r.kindIcon === "string" ? icon(r.kindIcon) : r.kindIcon) : null, h("span", { class: "ab-sw-slot" }, r.swatch || null), nameEl, prog, r.count != null ? h("span", { class: "ab-tcount k-num" }, r.count) : null, r.notes ? h("span", { class: "ab-tnotes k-num", title: r.notes + " notes" }, icon("message-square", "sm"), r.notes) : null, r.notesInside && !r.open ? h("span", { class: "ab-tinside k-num", title: r.notesInside + " notes inside" }, r.notesInside + " inside") : null, r.locked ? icon("lock", "sm") : null, eye]);
            ul.append(li);
            const entry = { li, r };
            all.push(entry);
            // One click selects in place and the shell keeps the left panel, so the real dblclick lands here
            nameEl.addEventListener("dblclick", (e) => { e.stopPropagation(); startRename(entry); });
            li.addEventListener("keydown", (e) => {
                if (e.key === "F2" && e.target === li) { e.preventDefault(); startRename(entry); }
            });
            if (r.eye != null)
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
                    opts.onEye && opts.onEye(r);
                });
            if (hasKids)
                disc.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (e.detail > 1) return;
                    r.open = !r.open;
                    const fresh = tree(opts.rootRows || rows, opts);
                    ul.replaceWith(fresh);
                });
            const target = r.go || opts.go;
            if (target) {
                li.dataset.nav = href(target[0], target[1]);
                li.addEventListener("click", (e) => {
                    if (e.detail > 1) return;
                    all.forEach((x) => x.li.setAttribute("aria-selected", String(x.li === li)));
                    if (location.hash !== li.dataset.nav) { AB.keepLeft = true; go(target[0], target[1]); }
                });
                li.addEventListener("keydown", (e) => e.key === "Enter" && go(target[0], target[1]));
            }
            if (r.menu) li.addEventListener("contextmenu", (e) => { e.preventDefault(); go(r.menu[0], r.menu[1]); });
            if (hasKids && r.open) r.children.forEach((c) => build(c, level + 1));
        };
        opts.rootRows = opts.rootRows || rows;
        rows.forEach((r) => build(r, 1));
        return ul;
    }

    // ---------- overlays ----------
    // Position `el` (already in the overlay layer) next to `anchor` (element or selector).
    // place: "below-start" | "below-end" | "above" | "above-start" | "right-start" | "center"
    function position(el, anchor, place) {
        const layer = document.getElementById("ab-overlay");
        const run = () => {
            const L = layer.getBoundingClientRect();
            const E = el.getBoundingClientRect();
            const a = typeof anchor === "string" ? document.querySelector(anchor) : anchor;
            let x, y;
            if (!a || place === "center") {
                x = (L.width - E.width) / 2;
                y = Math.max(16, (L.height - E.height) / 3);
            } else {
                const A = a.getBoundingClientRect();
                const ax = A.left - L.left, ay = A.top - L.top;
                if (place === "below-end") { x = ax + A.width - E.width; y = ay + A.height + 4; }
                else if (place === "above") { x = ax + A.width / 2 - E.width / 2; y = ay - E.height - 8; }
                else if (place === "above-start") { x = ax; y = ay - E.height - 8; }
                else if (place === "right-start") { x = ax + A.width + 4; y = ay; }
                else { x = ax; y = ay + A.height + 4; }
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
    // popover({ anchor, place, title, body, width, foot }) -> element; append it to the overlay el you were given
    function popover(o) {
        const p = h("div", { class: "k-popover ab-pop", role: "dialog", "aria-label": o.title || "", style: o.width ? `width:${o.width}px` : null });
        if (o.title) p.append(h("div", { class: "k-popover-head" }, h("span", { class: "k-grow" }, o.title), iconButton("x", "Close", { onClick: () => AB.close() })));
        p.append(append(h("div", { class: "k-popover-body" }), [o.body]));
        if (o.foot) p.append(append(h("div", { class: "ab-pop-foot" }), [o.foot]));
        return position(p, o.anchor, o.place);
    }
    // menu({ anchor, place, items }) ; item = { label, shortcut, go:[id,state], onClick, sub:true, check, disabled, desc }
    //   | { sep: true } | { heading: "..." }
    function menu(o) {
        const m = h("div", { class: "k-menu ab-menu", role: "menu" });
        (o.items || []).forEach((it) => {
            if (it.sep) return m.append(h("div", { class: "k-menu-sep", role: "separator" }));
            if (it.heading) return m.append(h("div", { class: "k-menu-label" }, it.heading));
            const target = it.go || it.onClick ? it : { onClick: () => AB.flash(it.label + " (not wired in the skeleton)") };
            m.append(h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "aria-disabled": it.disabled ? "true" : null, "data-described": it.desc ? "" : null, "aria-keyshortcuts": it.shortcut || null }, it.disabled ? {} : act(target)), h("span", { class: "k-check-col" }, it.check ? icon("check", "sm") : null), it.desc ? h("span", null, it.label, h("span", { class: "k-menu-desc" }, it.desc)) : h("span", null, it.label), it.shortcut ? h("span", { class: "k-shortcut", "aria-hidden": "true" }, it.shortcut) : null, it.sub ? h("span", { class: "k-sub" }, icon("chevron-right", "sm")) : null));
        });
        return position(m, o.anchor, o.place);
    }
    // modal({ title, body, foot, wide }) -> backdrop element (append to overlay el)
    function modal(o) {
        const tid = "ab-modal-title-" + ++inspSeq;
        const box = h("div", { class: "k-modal" + (o.wide ? " k-modal-wide" : ""), role: "dialog", "aria-modal": "true", "aria-labelledby": tid, on: { click: (e) => e.stopPropagation() } });
        box.append(h("div", { class: "k-modal-head" }, h("h2", { id: tid, class: "k-grow ab-modal-title" }, o.title), iconButton("x", "Close", { onClick: () => AB.close() })));
        box.append(append(h("div", { class: "k-modal-body" }), [o.body]));
        if (o.foot) box.append(append(h("div", { class: "k-modal-foot" }), [o.foot]));
        return h("div", { class: "ab-modal-wrap" }, box);
    }
    // A dark notice above the toolbar; action = { label, go|onClick }
    function notice(text, action) {
        return h("div", { class: "k-toast" }, text, action ? h("span", Object.assign({ class: "k-toast-action", role: "button" }, act(action)), action.label) : null);
    }
    // The table dock's collapse toggle; put it at the end of your dock's tab strip.
    function dockToggle() {
        const open = !document.querySelector(".ab-main[data-dock='closed']");
        return iconButton(open ? "chevron-down" : "chevron-up", open ? "Collapse the table (Shift+T)" : "Open the table (Shift+T)", { onClick: () => AB.toggleDock() });
    }
    // The canvas drawing, both themes: drawing("lesmis-groups-rest", "alt text")
    function drawing(name, alt) {
        return [h("img", { class: "k-light-only", src: `kit/canvas/${name}-light.svg`, alt }), h("img", { class: "k-dark-only", src: `kit/canvas/${name}-dark.svg`, alt })];
    }

    // ---------- the style properties ----------
    // STAND-IN for graphty-element's channelsFor('node' | 'edge') descriptor list
    // (graphty-element/src/session/styles/channels.ts, CHANNEL_DESCRIPTORS). The real app reads it
    // from the element and never types it. Ids, value kinds, ranges and choice lists follow the
    // element; `name` drops the "Node" and "Edge" prefix of its plainName because the Nodes | Edges
    // switch already says it. `section` is NOT in the element's descriptors (needs graphty-element:
    // a `section` and `order` per descriptor); until then it is this app-side list.
    const NODE_SHAPES = ["box", "sphere", "cylinder", "cone", "capsule", "torus", "torus-knot", "tetrahedron", "octahedron", "dodecahedron", "icosahedron", "rhombicuboctahedron", "triangular_prism", "pentagonal_prism", "hexagonal_prism", "square_pyramid", "pentagonal_pyramid", "triangular_dipyramid", "pentagonal_dipyramid", "elongated_square_dipyramid", "elongated_pentagonal_dipyramid", "elongated_pentagonal_cupola", "goldberg", "icosphere", "geodesic"];
    const ARROWS = ["normal", "inverted", "dot", "sphere-dot", "open-dot", "none", "tee", "open-normal", "diamond", "open-diamond", "crow", "box", "half-open", "vee"];
    const LINES = ["solid", "dot", "star", "box", "dash", "diamond", "dash-dot", "sinewave", "zigzag"];
    const ch = (id, name, kind, section, extra) => Object.assign({ id, name, kind, section }, extra || {});
    const CHANNELS = {
        node: [
            ch("node.color", "Color", "color", "Fill"),
            ch("node.opacity", "Opacity", "number", "Fill", { range: [0, 1] }),
            ch("node.shape", "Shape", "choice", "Shape", { choices: NODE_SHAPES }),
            ch("node.size", "Size", "number", "Shape", { range: [0, null] }),
            ch("node.outline", "Outline", "color", "Effects", { caveat: "An outline is a color with no width: every outline on screen is one width." }),
            ch("node.glow", "Glow", "color", "Effects"),
            ch("node.glowStrength", "Glow strength", "number", "Effects", { range: [0, null] }),
            ch("node.wireframe", "Wireframe", "boolean", "Effects"),
            ch("node.flat", "Flat shading", "boolean", "Effects"),
            ch("node.label", "Text", "text", "Label"),
            ch("node.labelStyle", "Label style", "labelStyle", "Label"),
            ch("node.tooltip", "Text", "text", "Tooltip", { caveat: "Drawn on hover only." }),
            ch("node.tooltipStyle", "Tooltip style", "labelStyle", "Tooltip", { caveat: "Drawn on hover only." }),
            ch("node.marker", "Marker", "nothing", null, { drawn: false, caveat: "graphty-element draws no marker yet." }),
        ],
        edge: [
            ch("edge.color", "Color", "color", "Line"),
            ch("edge.width", "Width", "number", "Line", { range: [0, null] }),
            ch("edge.opacity", "Opacity", "number", "Line", { range: [0, 1] }),
            ch("edge.style", "Pattern", "choice", "Line", { choices: LINES }),
            ch("edge.patternCount", "Pattern count", "number", "Line", { range: [2, null], caveat: "Counts the marks of a patterned line; solid, zigzag and sinewave ignore it." }),
            ch("edge.curvature", "Curve", "boolean", "Line", { caveat: "A switch, not an amount." }),
            ch("edge.animationSpeed", "Flow speed", "number", "Line", { range: [0, null] }),
            ch("edge.arrowHead", "Type", "choice", "Arrow head", { choices: ARROWS }),
            ch("edge.arrowHeadSize", "Size", "number", "Arrow head", { range: [0, null] }),
            ch("edge.arrowHeadColor", "Color", "color", "Arrow head"),
            ch("edge.arrowHeadOpacity", "Opacity", "number", "Arrow head", { range: [0, 1] }),
            ch("edge.arrowHeadText", "Caption", "text", "Arrow head"),
            ch("edge.arrowHeadTextStyle", "Caption style", "labelStyle", "Arrow head"),
            ch("edge.arrowTail", "Type", "choice", "Arrow tail", { choices: ARROWS }),
            ch("edge.arrowTailSize", "Size", "number", "Arrow tail", { range: [0, null] }),
            ch("edge.arrowTailColor", "Color", "color", "Arrow tail"),
            ch("edge.arrowTailOpacity", "Opacity", "number", "Arrow tail", { range: [0, 1] }),
            ch("edge.arrowTailText", "Caption", "text", "Arrow tail"),
            ch("edge.arrowTailTextStyle", "Caption style", "labelStyle", "Arrow tail"),
            ch("edge.label", "Text", "text", "Label"),
            ch("edge.labelStyle", "Label style", "labelStyle", "Label"),
        ],
    };
    const SECTIONS = { node: ["Fill", "Shape", "Effects", "Label", "Tooltip", "More"], edge: ["Line", "Arrow head", "Arrow tail", "Label", "More"] };
    const chanOf = (id) => CHANNELS.node.concat(CHANNELS.edge).find((c) => c.id === id);
    const secOf = (c) => (c.section && SECTIONS[c.id.split(".")[0]].includes(c.section) ? c.section : "More");
    function fmtValue(c, v) {
        if (v === true) return "On";
        if (v === false) return "Off";
        if (c.kind === "labelStyle") return typeof v === "string" ? v : "Custom";
        return String(v).replace(/_/g, " ");
    }

    // The one Style tab, used by every row that paints.
    // styleTab({ kinds: ["node","edge"], set: {channelId: value}, bound: {channelId: "bound to"},
    //   inherited: {channelId: [value, fromRowName]}, openSection, collapseAll, error: {channelId: message},
    //   kind: the side shown first, noBind: true (Selection: no bind, no "-"), extra: node after the head,
    //   blocks: {channelId: () => node} -- a binding block drawn under that bound line })
    // Every row gets the Nodes | Edges switch with counts, so any row can style either (the owner's
    // "styling is left to the user"). Only what the row sets is shown; an empty section is a header
    // with "+". Lines: name, value, bind, "-". A collapsed section's summary is "name value" pairs.
    let lastStyleKind = "node";
    function styleTab(o) {
        o = o || {};
        const kinds = ["node", "edge"];
        const set = Object.assign({}, o.set || {});
        // o.all: the base row (Everything) shows every property with its effective value. Values not
        // given fall back to "None" or Off; the real app reads each descriptor's default (section 19).
        if (o.all) CHANNELS.node.concat(CHANNELS.edge).forEach((c) => { if (!(c.id in set) && c.drawn !== false) set[c.id] = c.id in o.all ? o.all[c.id] : c.kind === "boolean" ? false : "None"; });
        const bound = o.bound || {};
        const inherited = o.inherited || {};
        const errors = o.error || {};
        let kind = o.kind || (o.kinds && o.kinds.length === 1 ? o.kinds[0] : lastStyleKind);
        let filter = null;
        const wrap = h("div", { class: "ab-style" });
        const counts = (k) => CHANNELS[k].filter((c) => c.id in set || c.id in bound).length;
        const valueCtl = (c, v) => {
            if (c.id in bound) return h("span", Object.assign({ class: "k-field ab-sv ab-bound", role: "button", title: "Bound to " + bound[c.id] }, act({ go: ["style-pickers", "bind"] })), h("span", { class: "k-ellipsis" }, bound[c.id]));
            if (c.kind === "boolean") {
                const sw = h("span", { class: "k-switch", role: "switch", tabindex: "0", "aria-checked": String(!!v), "aria-label": c.name });
                const flip = (e) => { e.stopPropagation(); set[c.id] = !set[c.id]; sw.setAttribute("aria-checked", String(!!set[c.id])); };
                sw.addEventListener("click", flip);
                sw.addEventListener("keydown", (e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), flip(e)));
                return h("span", { class: "ab-sv" }, sw);
            }
            const target = c.kind === "color" ? "color" : c.kind === "choice" ? "choice" : c.kind === "labelStyle" ? "label-style" : "token-edit";
            return h("span", Object.assign({ class: "k-field ab-sv", role: "button", "data-error": errors[c.id] ? "" : null }, act({ go: ["style-pickers", target] })),
                c.kind === "color" ? chit(v) : c.kind === "labelStyle" ? h("span", { class: "ab-aa" }, "Aa") : null,
                h("span", { class: "k-grow k-ellipsis" }, fmtValue(c, v)), c.kind === "choice" ? h("span", { class: "k-caret" }, icon("chevron-down", "sm")) : null);
        };
        const line = (c) => {
            const isSet = c.id in set || c.id in bound;
            const inh = !isSet && inherited[c.id];
            const li = h("div", { class: "ab-sline", "data-inherited": inh ? "" : null, "data-unset": !isSet && !inh ? "" : null, title: c.caveat || null });
            if (!isSet && !inh) {
                // a search hit on a property the row does not set: offer to add it
                append(li, [h("span", { class: "ab-sname" }, c.name, h("span", { class: "k-tertiary" }, " (" + secOf(c) + ")")), h("span", { class: "k-grow" }), iconButton("plus", "Add " + c.name, { go: ["style-pickers", "plus-menu"] })]);
                return li;
            }
            if (inh) {
                append(li, [h("span", { class: "ab-sname" }, c.name), h("span", { class: "ab-sv ab-inh k-secondary", title: fmtValue(c, inh[0]) + ", from " + inh[1] }, icon("link", "sm"), h("span", { class: "k-ellipsis" }, fmtValue(c, inh[0]))), iconButton("plus", "Set " + c.name + " on this row", { go: ["style-pickers", "token-edit"] })]);
                return li;
            }
            if (o.noBind) { append(li, [h("span", { class: "ab-sname" }, c.name), valueCtl(c, set[c.id])]); return li; }
            append(li, [h("span", { class: "ab-sname" }, c.name), valueCtl(c, set[c.id]),
                iconButton("database", c.id in bound ? "Change what " + c.name + " is bound to" : "Bind " + c.name + " to an attribute or result", { go: ["style-pickers", "bind"], pressed: c.id in bound }),
                iconButton("minus", "Remove " + c.name + " (inherit from below)", { onClick: () => { delete set[c.id]; draw(); } })]);
            const out = [li];
            if (o.blocks && o.blocks[c.id] && c.id in bound) out.push(o.blocks[c.id]());
            if (errors[c.id]) out.push(h("div", { class: "ab-serr k-danger", role: "alert" }, errors[c.id]));
            return out;
        };
        const draw = () => {
            wrap.replaceChildren();
            const head = h("div", { class: "ab-style-head" });
            {
                const seg = h("span", { class: "k-seg", role: "radiogroup", "aria-label": "What the row paints" });
                kinds.forEach((k) => {
                    const b = h("span", { role: "radio", tabindex: "0", "aria-checked": String(k === kind) }, (k === "node" ? "Nodes " : "Edges ") , h("span", { class: "k-num k-secondary" }, String(counts(k))));
                    const pick = () => { kind = lastStyleKind = k; draw(); };
                    b.addEventListener("click", pick);
                    b.addEventListener("keydown", (e) => e.key === "Enter" && pick());
                    seg.append(b);
                });
                head.append(seg);
            }
            head.append(h("span", { class: "k-grow" }), iconButton("search", "Find a style property", { pressed: filter != null, onClick: () => { filter = filter == null ? "" : null; draw(); } }));
            wrap.append(head);
            if (o.all) wrap.append(h("div", { class: "ab-cap" }, needsElement("The values shown are stand-ins: graphty-element's style descriptors carry no default yet, and Everything cannot be edited until it can write the element's base style (section 19).")));
            if (o.extra) wrap.append(o.extra);
            if (filter != null) {
                const inp = h("input", { class: "ab-style-filter", type: "search", placeholder: "Find a property", "aria-label": "Find a style property", value: filter });
                inp.addEventListener("input", () => { filter = inp.value; drawBody(); });
                inp.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); filter = null; draw(); } });
                wrap.append(h("div", { class: "ab-pad" }, inp));
                setTimeout(() => inp.focus(), 0);
            }
            const body = h("div", { class: "ab-style-body" });
            wrap.append(body);
            const drawBody = () => {
                body.replaceChildren();
                const q = (filter || "").trim().toLowerCase();
                SECTIONS[kind].forEach((sn) => {
                    const chans = CHANNELS[kind].filter((c) => secOf(c) === sn && c.drawn !== false);
                    const shown = q ? chans.filter((c) => (c.name + " " + sn).toLowerCase().includes(q)) : chans.filter((c) => c.id in set || c.id in bound || inherited[c.id]);
                    if (q && !shown.length) return;
                    const setHere = chans.filter((c) => c.id in set || c.id in bound);
                    // Everything shows every property already, so "+" has nothing to add there
                    const plus = o.all ? null : iconButton("plus", "Add to " + sn, { go: ["style-pickers", "plus-menu"] });
                    // More holds only what no section places: hidden while the element reports nothing unplaced
                    if (!shown.length && (o.all || sn === "More")) return;
                    if (!shown.length) return body.append(section({ title: sn, actions: plus, collapsed: true }));
                    const open = q ? true : o.openSection ? o.openSection === sn : !o.collapseAll;
                    // Summary: name and value; on Everything only values that are not None or Off
                    const isDefault = (c) => o.all && !(c.id in bound) && (set[c.id] === false || set[c.id] === "None" || set[c.id] === 0 || set[c.id] === "0" || set[c.id] === "Default");
                    const counted = setHere.filter((c) => !isDefault(c));
                    const pairs = counted.map((c) => c.name + " " + (c.id in bound ? bound[c.id] : fmtValue(c, set[c.id])));
                    const summary = pairs.join(" . ") || (o.all ? "Defaults" : "inherited");
                    const nSet = counted.length;
                    body.append(section({ title: sn, count: nSet || null, countLabel: nSet ? nSet + (nSet === 1 ? " property" : " properties") : null, actions: plus, collapsible: !q, collapsed: !open, summary, key: "style." + kind + "." + sn, remember: !o.openSection && !o.collapseAll }, shown.map(line)));
                });
                // Everything carries its one mark at the top
                if (!o.all) body.append(h("div", { class: "ab-cap" }, needsElement("Every property comes from graphty-element's list; a section shows only what this row sets. The descriptors have no section yet, so this grouping is the app's until graphty-element publishes one.")));
            };
            drawBody();
        };
        draw();
        return wrap;
    }

    // "Why this look": one 24 px line per layer that wins at least one property.
    // lines: [{ name, swatch: node|color, go: [id,state], wins: ["color", ...], values: {prop: "resolved"},
    //   locked, coverage: "14 of 20" }] ; a line with no wins is covered.
    // opts: { coverage: true, coverageReason }
    function whyThisLook(lines, opts) {
        opts = opts || {};
        // One component on every kind: a heading, the winning rows, the covered line, then any mark
        const outer = h("div", { class: "ab-why" }, h("div", { class: "k-section-head ab-why-head", role: "heading", "aria-level": "3" }, "Why this look"));
        const wrap = h("div", { role: "list", "aria-label": "Why this look: the rows that paint it, top first" });
        outer.append(wrap);
        const winners = lines.filter((l) => l.wins && l.wins.length);
        const covered = lines.filter((l) => !l.wins || !l.wins.length);
        const mark = opts.coverage && (h("div", { class: "ab-cap" }, needsElement("Counts say how many of the selected elements each row wins. " + (opts.coverageReason || "explain() takes one node or edge; an explain over a set, returning coverage, is filed."))));
        const lineOf = (l, dim) => {
            const sw = typeof l.swatch === "string" ? chit(l.swatch) : l.swatch || h("span", { class: "ab-sw-empty" });
            const name = l.locked || !l.go ? h("span", { class: "ab-why-name k-ellipsis" }, l.name) : link(l.go[0], l.go[1], l.name, { class: "ab-link ab-why-name k-ellipsis" });
            return h("div", { class: "ab-why-line", role: "listitem", "data-dim": dim ? "" : null }, sw, name, l.locked ? h("span", { title: "Owned by graphty-element; not a row you can select" }, icon("lock", "sm")) : null,
                l.hiddenRow ? h("span", { class: "k-secondary ab-why-hidden", title: "This row is hidden from the list but still paints. The link opens the list with hidden rows shown." }, "hidden row") : null,
                h("span", { class: "ab-why-tokens" }, (l.wins || []).map((p) => h("span", Object.assign({ class: "ab-token", role: "button", title: (l.values && l.values[p]) || p, "aria-label": p + " from " + l.name + ((l.values && l.values[p]) ? ", " + l.values[p] : "") }, act({ go: ["style-pickers", "token-edit"] })), p))),
                l.coverage ? h("span", { class: "k-num k-secondary" }, l.coverage) : null);
        };
        winners.forEach((l) => wrap.append(lineOf(l)));
        if (covered.length) {
            const box = h("div", { hidden: true, role: "list", "aria-label": "Rows that match but are covered" }, covered.map((l) => lineOf(l, true)));
            const disc = h("span", { class: "ab-disc" }, icon("chevron-right", "sm"));
            const more = h("div", { class: "ab-why-line ab-why-more", role: "button", tabindex: "0", "aria-expanded": "false" }, disc, covered.length + " more " + (covered.length === 1 ? "row matches" : "rows match") + " but " + (covered.length === 1 ? "is" : "are") + " covered");
            const flip = () => { box.hidden = !box.hidden; more.setAttribute("aria-expanded", String(!box.hidden)); disc.replaceChildren(icon(box.hidden ? "chevron-right" : "chevron-down", "sm")); };
            more.addEventListener("click", flip);
            more.addEventListener("keydown", (e) => e.key === "Enter" && flip());
            outer.append(more, box);
        }
        if (mark) outer.append(mark);
        return outer;
    }

    // ---------- one command table (spec section 17): every door draws its label and key from here ----------
    // { label, shortcut, home, disabledReason, go } ; only commands with two or more doors.
    const COMMANDS = {
        select: { label: "Select", shortcut: "V", home: "Toolbar > Select", go: ["toolbar", "at-rest"] },
        analyze: { label: "Analyze...", shortcut: "Shift+A", home: "Toolbar > Analyze", go: ["analyze-popover", "open"] },
        "quick-actions": { label: "Quick actions", shortcut: "Ctrl+K", home: "Toolbar > Quick actions", go: ["commands-and-search", "quick-actions"] },
        "view-mode": { label: "Switch 2D / 3D", shortcut: "5", home: "Toolbar > View mode", go: ["toolbar", "view-mode"] },
        "enter-vr": { label: "Enter VR", home: "Toolbar > View mode", disabledReason: "No headset connected", go: ["toolbar", "view-mode-headset"] },
        "enter-ar": { label: "Enter AR", home: "Toolbar > View mode", disabledReason: "No AR device connected", go: ["toolbar", "view-mode-headset"] },
        "find-paths": { label: "Find paths...", shortcut: "P", home: "Selection bar > Path between", go: ["path-tool", "armed"] },
        neighborhood: { label: "Neighborhood", shortcut: "G", home: "Selection bar > Neighborhood", go: ["selection-bar", "neighborhood"] },
        "create-set": { label: "Create set", shortcut: "Ctrl+G", home: "Selection bar > Create set", go: ["selection-bar", "two-nodes"] },
        "hide-on-canvas": { label: "Hide on canvas", shortcut: "Ctrl+Shift+H", home: "Selection bar > Hide on canvas", go: ["selection-bar", "hidden"] },
        "show-hidden": { label: "Show hidden elements", home: "Main menu > Edit", go: ["canvas-and-states", "drawn"] },
        "add-note": { label: "Add note", shortcut: "N", home: "Selection bar > Add note", go: ["notes-place", "writing"] },
        fit: { label: "Fit", shortcut: "0", home: "Camera menu", go: ["camera-menu", "3d"] },
        "frame-selection": { label: "Frame selection", shortcut: "F", home: "Camera menu", go: ["camera-menu", "3d"] },
        "reset-camera": { label: "Reset camera", shortcut: "Shift+0", home: "Camera menu", go: ["camera-menu", "3d"] },
        "save-view": { label: "Save camera view...", home: "Views > Save camera view...", go: ["views-place", "saving"] },
        present: { label: "Present", home: "Views > Present", go: ["present-mode", "presenting"] },
        "record-tour": { label: "Record tour...", home: "Views > Record tour", go: ["export-video", "tour"] },
        "rerun-layout": { label: "Re-run layout", home: "Layout chip", go: ["canvas-and-states", "loading"] },
        "pause-layout": { label: "Pause layout", home: "Layout chip", go: ["canvas-and-states", "drawn"] },
        "toggle-table": { label: "Show or hide the table", shortcut: "Shift+T", home: "Table dock", onClick: () => AB.toggleDock() },
        legend: { label: "Show or hide the legend", shortcut: "L", home: "Legend card" },
        export: { label: "Export...", shortcut: "Ctrl+E", home: "Export dialog", go: ["export-image", "image"] },
        "export-image": { label: "Export image...", home: "Export dialog > Image", go: ["export-image", "image"] },
        "export-video": { label: "Record video...", home: "Export dialog > Video", go: ["export-video", "still"] },
        "add-data": { label: "Add data...", home: "Data > Sources +", go: ["data-place", "sources-menu"] },
        "version-history": { label: "Version history", home: "Project menu", go: ["full-canvas-modes", "version-history"] },
        settings: { label: "Settings...", shortcut: "Ctrl+,", home: "Settings", go: ["settings", "you"] },
        shortcuts: { label: "Keyboard shortcuts", shortcut: "?", home: "Help > Keyboard shortcuts", go: ["commands-and-search", "shortcuts"] },
        rename: { label: "Rename", shortcut: "F2", home: "Double-click the name" },
        find: { label: "Find...", shortcut: "/", home: "Graph > Find rows", go: ["commands-and-search", "find"] },
        undo: { label: "Undo", shortcut: "Ctrl+Z", home: "Header" },
        redo: { label: "Redo", shortcut: "Ctrl+Shift+Z", home: "Header" },
    };
    // The project's saved views, in the Views place's order. Every door (Camera menu jump list,
    // Export, Present, Quick actions) reads this one list.
    const SAVED_VIEWS = ["Whole cast", "Valjean's circle", "From above"];
    // cmd(id, extra?) -> a menu item for menu() ({ label, shortcut, go|onClick, disabled, desc, home })
    function cmd(id, extra) {
        const c = COMMANDS[id];
        if (!c) throw new Error("Unknown command " + id);
        const it = { label: c.label, shortcut: c.shortcut, home: c.home };
        if (c.go) it.go = c.go;
        if (c.onClick) it.onClick = c.onClick;
        if (c.disabledReason && !(extra && extra.enabled)) { it.disabled = true; it.desc = c.disabledReason; }
        return Object.assign(it, extra || {});
    }

    // ---------- canvas furniture shared by every canvas section ----------
    // The Camera menu face at the top right: camera icon, the view's name, "moved", 2D zoom, caret
    function cameraFace(o) {
        o = Object.assign({}, o || {});
        const mode = o.mode || (AB.route && AB.route.frame && AB.route.frame.mode) || "3d";
        // A 3D graph opens at the element's Front view (spec 9); 2D has no built-in views
        if (o.view == null) o.view = mode === "2d" ? "Unsaved view" : "Front";
        return h("span", Object.assign({ id: "ab-zoom", class: "k-btn k-btn-ghost ab-zoom", role: "button", "aria-haspopup": "menu", "aria-label": "Camera menu, " + o.view + (o.moved ? ", moved" : ""), title: "Camera menu: Fit, Frame selection, Reset" + (mode === "2d" ? ", zoom" : ", the built-in views (Front, Side, Top, Isometric)") + ", Save camera view..., your saved views, Export image" }, act({ go: ["camera-menu", mode] })),
            icon("camera", "sm"), h("span", null, o.view, o.moved ? h("span", { class: "k-secondary" }, ", moved") : null), mode === "2d" && o.zoom ? h("span", { class: "k-secondary k-num" }, " " + o.zoom) : null, icon("chevron-down", "sm"));
    }
    // The layout chip beside it: "running" | "paused" | "settled"
    function layoutChip(state) {
        const s = state || "running";
        const label = s === "paused" ? ["Paused", "Resume"] : s === "settled" ? ["Settled", "Re-run"] : ["Laying out...", "Pause"];
        const chip = h("span", { id: "ab-layout-chip", class: "k-chip ab-layout-chip", "data-state": s, role: "status" }, s === "running" ? icon("loader-circle", "sm") : null, label[0]);
        if (label[1]) chip.append(h("span", Object.assign({ class: "ab-link", role: "button" }, act({ onClick: () => chip.replaceWith(layoutChip(s === "running" ? "paused" : "running")) })), label[1]));
        return chip;
    }
    // A legend card's close button: hides the card and leaves a "Legend" chip that brings it back
    function legendClose(card) {
        return iconButton("x", "Close the legend (L)", { onClick: () => {
            const chip = h("span", Object.assign({ class: "k-chip k-chip-btn ab-legend-chip", role: "button", title: "Show the legend (L)" }, act({ onClick: () => { chip.remove(); card.hidden = false; } })), icon("layers", "sm"), "Legend");
            card.hidden = true;
            card.after(chip);
        } });
    }

    Object.assign(AB, { registerSection, h, append, icon, href, go, link, nav, act, button, iconButton, chit, ramp, section, notesSection, data, row, field, paintsLine, tabs, inspector, tree, position, popover, menu, modal, notice, dockToggle, drawing, announce, renameInPlace, needsElement, CHANNELS, SECTIONS, styleTab, whyThisLook, COMMANDS, SAVED_VIEWS, cmd, cameraFace, layoutChip, legendClose, mem });
    Object.assign(window, { registerSection, h, icon, link });
})();
