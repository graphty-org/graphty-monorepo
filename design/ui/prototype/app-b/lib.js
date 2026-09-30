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
    function icon(name, size) {
        const cls = "k-i" + (size === "sm" ? " k-i-sm" : size === "lg" ? " k-i-lg" : "");
        const s = h("svg", { class: cls, "aria-hidden": "true" });
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
    // A section block: section("Overview", child, ...) or section({ title, count, actions:[nodes], collapsed }, ...)
    function section(head, ...kids) {
        const o = typeof head === "string" ? { title: head } : head;
        const s = h("section", { class: "k-section", "data-collapsed": o.collapsed ? "" : null });
        const hd = h("div", { class: "k-section-head" }, o.title, o.count != null ? h("span", { class: "k-count k-num" }, " " + o.count) : null, h("span", { class: "k-grow" }), o.actions || null);
        s.append(hd);
        if (!o.collapsed) append(s, kids);
        return s;
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
            const t = h("span", { class: "k-tab", role: "tab", tabindex: "0", "aria-selected": String(n === active) }, n);
            const pick = () => {
                list.querySelectorAll(".k-tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
                onChange && onChange(n);
            };
            t.addEventListener("click", pick);
            t.addEventListener("keydown", (e) => e.key === "Enter" && pick());
            list.append(t);
        });
        return list;
    }

    // The inspector: header (icon, name, kind, meta line), then tabs.
    // inspector({ icon, title, kind, meta, tabs: { Style: fn|node, Data: fn|node }, tab, body })
    // tab content functions are called each time the tab is shown. Without tabs, `body` is shown.
    const lastTab = {};
    function inspector(o) {
        const wrap = h("div", { class: "ab-insp" });
        wrap.append(h("div", { class: "ab-insp-head" }, o.icon ? icon(o.icon) : null, h("span", { class: "k-name k-strong k-ellipsis" }, o.title), o.kind ? h("span", { class: "k-secondary" }, o.kind) : null));
        if (o.meta) wrap.append(h("div", { class: "ab-insp-meta k-secondary" }, o.meta));
        const body = h("div", { class: "k-scroll ab-insp-body" });
        if (o.tabs) {
            const names = Object.keys(o.tabs);
            const key = o.kindKey || o.kind || o.title;
            let cur = o.tab || lastTab[key] || names[0];
            if (!names.includes(cur)) cur = names[0];
            const show = (n) => {
                lastTab[key] = n;
                body.replaceChildren();
                const c = o.tabs[n];
                append(body, [typeof c === "function" ? c() : c]);
            };
            wrap.append(h("div", { class: "ab-insp-tabs" }, tabs(names, cur, show)));
            show(cur);
        } else append(body, [o.body]);
        wrap.append(body);
        return wrap;
    }

    // ---------- the paint tree ----------
    // tree(rows, opts) ; row = { id, kindIcon, swatch (node), name, count, notes, notesInside, eye: true|false|null,
    //   locked, pinned, children:[...], open, selected, go:[id,state], menu:[id,state] (context menu route), dim }
    function tree(rows, opts) {
        opts = opts || {};
        const ul = h("ul", { class: "ab-tree", role: "tree", "aria-label": opts.label || "Paint order" });
        const all = [];
        const build = (r, level, parentUl) => {
            const li = h("li", { class: "ab-trow", role: "treeitem", "aria-level": String(level), "aria-selected": r.selected ? "true" : "false", "data-dim": r.dim ? "" : null, "data-pinned": r.pinned ? "" : null, style: `--lvl:${level - 1}`, tabindex: "0" });
            const hasKids = r.children && r.children.length;
            const disc = h("span", { class: "ab-disc" }, hasKids ? icon(r.open ? "chevron-down" : "chevron-right", "sm") : null);
            const eye = r.eye == null ? h("span", { class: "ab-eye-slot" }) : h("span", { class: "ab-eye", role: "button", tabindex: "-1", "aria-label": (r.eye ? "Hide " : "Show ") + r.name + " on the canvas", "aria-pressed": String(!r.eye), title: "Show or hide this row's paint. Alt-click: solo" }, icon(r.eye ? "eye" : "eye-off"));
            append(li, [disc, r.kindIcon ? h("span", { class: "ab-kind" }, typeof r.kindIcon === "string" ? icon(r.kindIcon) : r.kindIcon) : null, r.swatch || h("span", { class: "ab-sw-empty" }), h("span", { class: "ab-tname k-ellipsis" }, r.name), r.count != null ? h("span", { class: "ab-tcount k-num" }, r.count) : null, r.notes ? h("span", { class: "ab-tnotes k-num", title: r.notes + " notes" }, icon("message-square", "sm"), r.notes) : null, r.notesInside && !r.open ? h("span", { class: "ab-tinside k-num", title: r.notesInside + " notes inside" }, r.notesInside + " inside") : null, r.locked ? icon("lock", "sm") : null, eye]);
            ul.append(li);
            all.push({ li, r });
            if (r.eye != null)
                eye.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (e.altKey) {
                        const solo = !li.hasAttribute("data-solo");
                        all.forEach(({ li: x }) => x.removeAttribute("data-solo") || x.toggleAttribute("data-struck", solo && x !== li));
                        if (solo) li.setAttribute("data-solo", "");
                        return;
                    }
                    r.eye = !r.eye;
                    eye.replaceChildren(icon(r.eye ? "eye" : "eye-off"));
                    eye.setAttribute("aria-pressed", String(!r.eye));
                    opts.onEye && opts.onEye(r);
                });
            if (hasKids)
                disc.addEventListener("click", (e) => {
                    e.stopPropagation();
                    r.open = !r.open;
                    const fresh = tree(opts.rootRows || rows, opts);
                    ul.replaceWith(fresh);
                });
            const target = r.go || opts.go;
            if (target) {
                li.dataset.nav = href(target[0], target[1]);
                li.addEventListener("click", () => go(target[0], target[1]));
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
            m.append(h("div", Object.assign({ class: "k-menu-item", role: "menuitem", "aria-disabled": it.disabled ? "true" : null, "data-described": it.desc ? "" : null }, it.disabled ? {} : act(target)), h("span", { class: "k-check-col" }, it.check ? icon("check", "sm") : null), it.desc ? h("span", null, it.label, h("span", { class: "k-menu-desc" }, it.desc)) : h("span", null, it.label), it.shortcut ? h("span", { class: "k-shortcut" }, it.shortcut) : null, it.sub ? h("span", { class: "k-sub" }, icon("chevron-right", "sm")) : null));
        });
        return position(m, o.anchor, o.place);
    }
    // modal({ title, body, foot, wide }) -> backdrop element (append to overlay el)
    function modal(o) {
        const box = h("div", { class: "k-modal" + (o.wide ? " k-modal-wide" : ""), role: "dialog", "aria-label": o.title, on: { click: (e) => e.stopPropagation() } });
        box.append(h("div", { class: "k-modal-head" }, h("span", { class: "k-grow" }, o.title), iconButton("x", "Close", { onClick: () => AB.close() })));
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

    Object.assign(AB, { registerSection, h, append, icon, href, go, link, nav, act, button, iconButton, chit, ramp, section, data, row, field, tabs, inspector, tree, position, popover, menu, modal, notice, dockToggle, drawing });
    Object.assign(window, { registerSection, h, icon, link });
})();
