// The kit's one script. Every page loads it right after kit.css:
//
//   <script src="../kit/kit.js" defer></script>
//
// It does five things, and a page writes no code for any of them (kit/README.md, "kit.js"):
//
// 1. Numbers come from the fixtures. An element with data-fx="datasets.ppi.nodes" shows that value
//    from kit/fixtures.json (data-fx="alerts:august.alerts.length" reads kit/alerts.json). The text
//    typed in the page is what shows offline, so it must equal the fixture: when it does not, or the
//    key does not exist, the page throws, and kit/shoot.mjs and kit/check.mjs fail. {ds} in a key is
//    the page's dataset: ?dataset=<id>, else the dataset of ?task=<id>, else <body data-dataset>.
//    The number formatting rule (content-design.md 5, as proposed in framework-changes.md) is applied
//    here, so every page states a set the same way; see fmtSet below.
// 2. Every icon button shows its tooltip: its data-tip, aria-label or title, else a name made from
//    its icon and the row or section it sits in.
// 3. A control that does nothing when clicked is marked "Not working in this mock", so nobody reads
//    a dead control as a broken product. data-not-in-mock marks one in advance, visibly.
// 4. Roles, names and keyboard paths a page left out, so every mock can be walked with the keyboard
//    and kit/a11y.mjs checks what a real page would expose (section 4 below).
// 5. ?study hides every design note, so a participant sees the product only (section 5 below).
//
// Plain ASCII only.
(() => {
    "use strict";
    const kitUrl = new URL(".", document.currentScript.src);
    const params = new URLSearchParams(location.search);
    const problems = [];
    const problem = (msg, el) => {
        problems.push(msg);
        if (el) el.setAttribute("data-kit-problem", msg);
    };

    // ---------- 1. numbers from the fixtures ----------
    const fmt = (v, digits) => {
        if (Array.isArray(v)) return v.map((x) => fmt(x, digits)).join(" to "); // a range
        if (typeof v === "number") {
            if (digits != null && digits !== "") return v.toLocaleString("en-US", { minimumFractionDigits: +digits, maximumFractionDigits: +digits });
            return Number.isInteger(v) ? v.toLocaleString("en-US") : String(v);
        }
        return String(v);
    };
    // The set rule: a count, range or statistic names its set only when that set is not the page's
    // current set (<body data-set>, default "full graph"), or when the same measure appears on the
    // page over a different set. data-fx-set names the element's set; data-fx-measure groups
    // elements that show the same measure (default: the key's last part).
    const fmtSet = (text, set) => `${text}, on: ${set}`;
    const get = (root, path) => path.split(".").reduce((o, k) => (o == null ? undefined : k === "length" && Array.isArray(o) ? o.length : o[k]), root);
    const same = (a, b) => a.replace(/\s+/g, "") === b.replace(/\s+/g, ""); // markup spacing is not a disagreement
    const bound = [];

    async function bindFixtures() {
        const els = [...document.querySelectorAll("[data-fx], [data-fx-attr], [data-fx-if]")];
        if (!els.length) return;
        const load = async (name) => {
            const r = await fetch(new URL(name, kitUrl));
            if (!r.ok) throw new Error(`kit: cannot load kit/${name} (${r.status})`);
            return r.json();
        };
        const needsAlerts = els.some((el) => /alerts:/.test(el.dataset.fx || "") || /alerts:/.test(el.dataset.fxAttr || ""));
        const [fixtures, alerts] = await Promise.all([load("fixtures.json"), needsAlerts ? load("alerts.json") : null]);
        const task = params.get("task");
        if (task && !fixtures.tasks?.[task]) problem(`kit: ?task=${task} is not a task in kit/fixtures.json`);
        const ds = params.get("dataset") || (task && fixtures.tasks?.[task]?.dataset) || document.body.dataset.dataset || "";
        if (params.get("dataset") && !fixtures.datasets[ds]) problem(`kit: ?dataset=${ds} is not a dataset in kit/fixtures.json`);
        // The typed text is the default dataset's; only check it when the page shows that dataset.
        const verify = !params.has("dataset") && !params.has("task");
        const value = (key, el) => {
            const k = key.trim().replace(/\{ds\}/g, ds);
            const v = k.startsWith("alerts:") ? get(alerts, k.slice(7)) : get(fixtures, k);
            if (v === undefined) problem(`kit: fixture key missing: ${k}`, el);
            return v;
        };
        const current = document.body.dataset.set || "full graph";
        const setsOf = new Map();
        for (const el of document.querySelectorAll("[data-fx][data-fx-set], [data-fx][data-fx-measure]")) {
            const m = el.dataset.fxMeasure || el.dataset.fx.split(".").pop();
            setsOf.set(m, (setsOf.get(m) || new Set()).add(el.dataset.fxSet || current));
        }
        for (const el of els) {
            if (el.dataset.fx) {
                const v = value(el.dataset.fx, el);
                if (v === undefined) continue;
                let text = fmt(v, el.dataset.fxDigits);
                const set = el.dataset.fxSet || current;
                const m = el.dataset.fxMeasure || el.dataset.fx.split(".").pop();
                if (set !== current || (setsOf.get(m)?.size ?? 1) > 1) text = fmtSet(text, set);
                const typed = el.textContent;
                if (verify && typed.trim() && !same(typed, text)) problem(`kit: ${location.pathname.split("/").slice(-2).join("/")} types "${typed.trim()}" where ${el.dataset.fx} is "${text}"`, el);
                el.textContent = text;
                bound.push({ key: el.dataset.fx.replace(/\{ds\}/g, ds), set, text });
            }
            for (const pair of (el.dataset.fxAttr || "").split(";").filter((s) => s.trim())) {
                const i = pair.indexOf(":");
                const attr = pair.slice(0, i).trim();
                const v = value(pair.slice(i + 1), el);
                if (v === undefined) continue;
                let text = fmt(v).replace(/\{theme\}/g, el.dataset.fxTheme || "light");
                if ((attr === "src" || attr === "href") && !/^([a-z]+:|\/|\.)/.test(text)) text = new URL(text, kitUrl).href;
                const typed = el.getAttribute(attr);
                const typedAbs = typed && (attr === "src" || attr === "href") ? new URL(typed, location.href).href : typed;
                if (verify && typed && typedAbs !== text) problem(`kit: ${attr}="${typed}" where ${pair.slice(i + 1).trim()} is "${text}"`, el);
                el.setAttribute(attr, text);
            }
            if (el.dataset.fxIf) {
                const v = value(el.dataset.fxIf, el);
                el.hidden = v === undefined || v === null || v === false || v === "" || (Array.isArray(v) && !v.length);
            }
        }
        // A page that builds markup from the fixtures (a legend, a list) listens for this event.
        // expect(el, text) checks the typed text the same way data-fx does.
        const expect = (el, text) => {
            if (verify && el && el.textContent.trim() && !same(el.textContent, text)) problem(`kit: typed "${el.textContent.trim().slice(0, 80)}" where the fixture gives "${text.slice(0, 80)}"`, el);
        };
        document.dispatchEvent(new CustomEvent("kit:fixtures", { detail: { fixtures, alerts, ds, task, get: (k) => value(k), fmt, fmtSet, expect } }));
    }

    // ---------- 2. tooltips ----------
    const TIP_SEL = ".k-icon-btn, .k-tool, .k-tool-caret, .k-help, [data-tip]";
    const ICON = {
        plus: "Add", "chevron-down": "More options", "circle-help": "Help and keyboard shortcuts", "mouse-pointer-2": "Select",
        zap: "Quick actions", route: "Path", "sticky-note": "Note", ellipsis: "More actions", search: "Find", square: "View mode",
        x: "Close", info: "About", funnel: "Filter steps", palette: "Look", "list-filter": "Filter", eye: "Hide", "eye-off": "Show",
        waypoints: "Path", pin: "Pin", "chevron-up": "Show less", users: "Members", "sliders-horizontal": "Options", download: "Download",
        group: "Create set", minus: "Remove", "git-compare-arrows": "Compare", unlink: "Detach", scan: "Select members",
        copy: "Copy", crosshair: "Select painted", split: "Select neighbors", play: "Run", network: "Graph", "arrow-left": "Back",
        "refresh-cw": "Re-run", target: "Zoom to", snowflake: "Freeze", bookmark: "Views", "bookmark-plus": "Save view",
        "chevron-left": "Previous", "chevron-right": "Next", "arrow-up-down": "Reverse", lock: "Lock", trash: "Delete", "trash-2": "Delete",
        pencil: "Edit", undo: "Undo", redo: "Redo", "undo-2": "Undo", "redo-2": "Redo", menu: "Main menu", settings: "Settings",
        maximize: "Fit", "maximize-2": "Fit", "zoom-in": "Zoom in", "zoom-out": "Zoom out", share: "Export", upload: "Open",
        "folder-open": "Open", "grip-vertical": "Drag to move", "arrow-up": "Move up", "arrow-down": "Move down", filter: "Filter",
    };
    const TOOL_KEY = { "mouse-pointer-2": "V", zap: "Ctrl+K", "circle-help": "?" };
    // Verbs that read better with the row or section they act on: "Add to Styles", "About Betweenness".
    const WITH_CONTEXT = { plus: (c) => `Add to ${c}`, ellipsis: (c) => `More actions for ${c}`, info: (c) => `About ${c}`, eye: (c) => `Hide ${c}`, "eye-off": (c) => `Show ${c}`, search: (c) => `Find in ${c}` };
    const iconOf = (el) => (el.querySelector("use")?.getAttribute("href") || "").split("#")[1] || "";
    const contextOf = (el) => {
        const host = el.closest(".k-section-head, .k-item, .k-row, .k-fieldrow, .k-popover-head, .k-data");
        if (!host) return "";
        const clone = host.cloneNode(true);
        clone.querySelectorAll(".k-icon-btn, .k-trail, .k-kind, .k-shortcut, svg, [aria-hidden=true]").forEach((n) => n.remove());
        const t = clone.textContent.replace(/\s+/g, " ").trim();
        return t.length > 40 ? `${t.slice(0, 38)}...` : t;
    };
    const nameOf = (el) => {
        const icon = iconOf(el);
        // A toolbar tool's tooltip is its name and its key (TooltipShortcut), however the page named it.
        const key = el.matches(".k-tool, .k-help") && TOOL_KEY[icon];
        const own = el.dataset.tip || el.getAttribute("aria-label") || el.dataset.kitTitle;
        if (own) return key && !own.includes(key) ? `${own}  ${key}` : own;
        if (el.classList.contains("k-tool-caret")) return /^View/.test(el.previousElementSibling ? nameOf(el.previousElementSibling) : "") ? "View mode options" : "More tools";
        if (!ICON[icon]) return el.textContent.trim() || "";
        const c = WITH_CONTEXT[icon] && contextOf(el);
        const name = c ? WITH_CONTEXT[icon](c) : ICON[icon];
        return TOOL_KEY[icon] && el.matches(".k-tool, .k-help") ? `${name}  ${TOOL_KEY[icon]}` : name;
    };
    let tip = null;
    let tipTimer = 0;
    const makeTip = () => {
        const t = document.createElement("div");
        t.className = "k-tip";
        t.setAttribute("data-kit", "");
        t.setAttribute("role", "tooltip");
        t.addEventListener("mouseleave", () => { clearTimeout(hideTimer); hideTimer = setTimeout(hideTip, 100); });
        document.body.append(t);
        return t;
    };
    const place = (t, el, below = el.getBoundingClientRect().top < innerHeight / 2) => {
        const r = el.getBoundingClientRect();
        t.style.left = "0px";
        t.style.top = "0px";
        const w = t.offsetWidth;
        const h = t.offsetHeight;
        t.style.left = `${Math.max(4, Math.min(innerWidth - w - 4, r.left + r.width / 2 - w / 2))}px`;
        t.style.top = `${below ? r.bottom + 6 : r.top - h - 6}px`;
    };
    const tipText = (el) => {
        const n = nameOf(el);
        return el.matches("[data-kit-dead], [data-not-in-mock]") ? `${n ? `${n}: ` : ""}not working in this mock` : n;
    };
    const showTip = (el) => {
        const text = tipText(el);
        if (!text) return;
        tip ??= makeTip();
        tip.textContent = text;
        tip.toggleAttribute("data-dead", el.matches("[data-kit-dead], [data-not-in-mock]"));
        tip.hidden = false;
        place(tip, el);
    };
    const hideTip = () => {
        clearTimeout(tipTimer);
        if (tip) tip.hidden = true;
    };
    const tipTarget = (e) => e.target instanceof Element && e.target.closest(`${TIP_SEL}, [data-kit-dead], [data-not-in-mock]`);
    document.addEventListener("mouseover", (e) => {
        const el = tipTarget(e);
        if (!el) return;
        clearTimeout(tipTimer);
        tipTimer = setTimeout(() => showTip(el), tip && !tip.hidden ? 0 : 400);
    });
    // The tooltip can be hovered (WCAG 1.4.13): leaving the control waits a moment, and the
    // pointer can cross the gap onto the tooltip and stay there; Esc hides it.
    let hideTimer = 0;
    document.addEventListener("mouseout", (e) => {
        const el = tipTarget(e);
        if (el && !el.contains(e.relatedTarget)) {
            clearTimeout(tipTimer);
            clearTimeout(hideTimer);
            hideTimer = setTimeout(hideTip, 300);
        }
    });
    document.addEventListener("mouseover", (e) => {
        if (tipTarget(e) || (tip && tip.contains(e.target))) clearTimeout(hideTimer);
    });
    document.addEventListener("focusin", (e) => {
        const el = tipTarget(e);
        if (el && el.matches(":focus-visible")) showTip(el);
    });
    document.addEventListener("focusout", hideTip);
    document.addEventListener("keydown", (e) => e.key === "Escape" && hideTip());
    addEventListener("scroll", hideTip, true);

    function nameIconButtons() {
        for (const el of document.querySelectorAll(TIP_SEL)) {
            // The kit draws the tooltip, so a title would show a second, native one.
            if (el.hasAttribute("title")) {
                el.dataset.kitTitle = el.getAttribute("title");
                el.removeAttribute("title");
            }
            const n = nameOf(el);
            if (!n) problem(`kit: an icon button has no name and its icon "${iconOf(el)}" has none in kit.js: give it aria-label`, el);
            else if (!el.getAttribute("aria-label") && !el.textContent.trim()) el.setAttribute("aria-label", n.replace(/\s{2}.*$/, ""));
            if (!el.hasAttribute("role") && el.hasAttribute("aria-label")) el.setAttribute("role", "button"); // a name needs a role to be read
        }
        // A static mock can draw a tooltip open: data-tip-open on the control.
        for (const el of document.querySelectorAll("[data-tip-open]")) {
            const t = makeTip();
            t.textContent = tipText(el);
            place(t, el, true);
            // Pinned to the page, not the window, so it stays by its control when the page scrolls.
            Object.assign(t.style, { position: "absolute", left: `${parseFloat(t.style.left) + scrollX}px`, top: `${parseFloat(t.style.top) + scrollY}px` });
        }
    }

    // ---------- 3. controls that do nothing ----------
    const CONTROL_SEL = [
        ".k-btn", ".k-icon-btn", ".k-tool", ".k-tool-caret", ".k-help", ".k-chip", ".k-check", ".k-switch", ".k-tab", ".k-seg > *",
        ".k-menu-item", ".k-link", ".k-rail-btn", ".k-toast-action", ".k-toast-x", ".k-result", ".k-item", ".k-row", ".k-table tbody tr",
        ".k-notdrawn a", "[role=button]", "[role=menuitem]", "[role=menuitemradio]", "[role=tab]", "[role=checkbox]", "[role=switch]", "[role=option]",
    ].join(", ");
    // Anything that navigates, or is a real form control, is wired by the browser.
    const WIRED = "a[href], label, button, input, select, textarea, summary, [data-wired], [data-kit]";
    const kitOwned = (n) => (n.nodeType === 1 ? n : n.parentElement)?.closest?.("[data-kit]");
    let changed = false;
    new MutationObserver((recs) => {
        for (const r of recs) {
            if (kitOwned(r.target) || (r.type === "attributes" && /^data-kit/.test(r.attributeName))) continue;
            if (r.type === "childList" && [...r.addedNodes, ...r.removedNodes].every((n) => kitOwned(n) || (n.nodeType === 1 && n.hasAttribute("data-kit")))) continue;
            changed = true;
            return;
        }
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
    let flag = null;
    const markDead = (el) => {
        el.setAttribute("data-kit-dead", "");
        flag ??= makeTip();
        flag.setAttribute("data-dead", "");
        flag.textContent = "Not working in this mock";
        flag.hidden = false;
        place(flag, el);
        clearTimeout(markDead.t);
        markDead.t = setTimeout(() => (flag.hidden = true), 2400);
    };
    document.addEventListener("click", (e) => {
        const el = e.target instanceof Element && e.target.closest(CONTROL_SEL);
        if (!el || e.target.closest(WIRED) || el.closest("[aria-disabled=true], [data-disabled]")) return;
        if (el.hasAttribute("data-not-in-mock")) return markDead(el);
        changed = false;
        const hash = location.hash;
        const focus = document.activeElement;
        const scroll = scrollX + scrollY;
        setTimeout(() => {
            const moved = document.activeElement !== focus && document.activeElement !== el && document.activeElement !== document.body;
            if (!changed && !moved && location.hash === hash && scrollX + scrollY === scroll) markDead(el);
        }, 350);
    });

    // ---------- 4. roles, names and keyboard paths ----------
    // The kit's state attributes are real ARIA (kit/README.md, "Roles, names and focus"). This pass
    // gives what a page left out, and never overrides a role, name or tabindex the page wrote:
    // - an element with a state gets the role that owns it, and a control without words a name;
    // - a row that is selected together with its siblings is an option in a listbox, or a row in a
    //   tree when the rows hold their own buttons or checkboxes (an option may not hold controls;
    //   a tree item may, and compact-mantine draws these lists with its Tree);
    // - a control is a Tab stop and answers Enter and Space; tabs, options, rows and menu items are
    //   one Tab stop per group, moved by the arrow keys, Home and End;
    // - a scroll area with nothing focusable in it takes focus, named by its region;
    // - a scaled or cropped copy of a screen in a storyboard is a picture: inert, so Tab and a
    //   screen reader skip its controls and read the caption instead;
    // - while a dialog's backdrop shows, the app behind it is inert;
    // - every app frame gets headings, named regions and a skip-to-drawing first Tab stop, and a
    //   whole-frame screen a page heading for a screen reader.
    const NATIVE = "button, a[href], input, select, textarea, summary, tr, th, td, option, details";
    const DISABLED = "[aria-disabled=true], [data-disabled]";
    const INTERACTIVE = "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1']), [role=button], [role=checkbox], [role=switch], [role=radio], [role=link], [role=combobox], [role=textbox], [role=slider]";
    const ROVING = { tab: "tablist", option: "listbox", treeitem: "tree", menuitem: "menu", menuitemradio: "menu", menuitemcheckbox: "menu", radio: "radiogroup" };
    // Inside a picture (role="img") everything is drawing, never a control.
    const needsRole = (el) => !el.hasAttribute("role") && !el.matches(NATIVE) && !el.closest("[data-kit], svg, [role=img]");
    const setRole = (el, role) => needsRole(el) && (el.setAttribute("role", role), true);
    let labelIds = 0;
    const clip = (t, n = 60) => (t.length > n ? `${t.slice(0, n - 2)}...` : t);
    const words = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
    const regionName = (el) => {
        const host = el.closest(".k-modal, .k-popover, .k-quick, .k-menu, .k-dock, .k-section, .k-right, .k-panel, section, aside, figure") || el.parentElement;
        const head = host?.querySelector(".k-modal-head, .k-popover-head, .k-section-head, .k-dock-tabs [aria-selected=true], .k-typerow .k-name, .k-project, h1, h2, h3, h4, figcaption");
        return clip(words(head), 40);
    };
    const pictures = () => {
        for (const el of document.querySelectorAll("body *")) {
            if (el.closest("[inert], [data-kit]") || !el.querySelector(".k-app, .k-rail-btn, .k-btn, .k-icon-btn, .k-tool, .k-item, .k-row, .k-check")) continue;
            // Scaled or shifted (a storyboard's crop) with the pointer off, or inside a link (a
            // control inside a link is not a control, WCAG 4.1.2), a copy of a screen is a picture.
            if (!el.parentElement?.closest("a[href]")) {
                const s = getComputedStyle(el);
                if (s.transform === "none" || s.pointerEvents !== "none") continue;
            }
            el.inert = true;
            // A link around the picture keeps a name: the frame's caption heading.
            const link = el.parentElement?.closest("a[href], [role=button], button");
            if (link && !link.hasAttribute("aria-label")) {
                const clone = link.cloneNode(true);
                clone.querySelectorAll("[inert]").forEach((n) => n.remove());
                if (!words(clone)) {
                    const cap = link.closest("figure, .wr-frame, .k-frame")?.querySelector(".wr-where, figcaption, h2, h3");
                    link.setAttribute("aria-label", `Open the screen: ${clip(words(cap) || document.title, 80)}`);
                }
            }
        }
    };
    // A child that may not sit in a group of items: a control, or anything with a role of its own.
    const STRUCTURE = `${INTERACTIVE}, table, ul, ol, img, h1, h2, h3, h4, h5, h6`;
    const foreign = (c) => c.matches(STRUCTURE) || !!c.querySelector(STRUCTURE) || (c.hasAttribute("role") && !/^(none|presentation)$/.test(c.getAttribute("role")));
    const groupItems = (el, role) => {
        const parent = el.parentElement;
        const kind = el.classList[0];
        const items = [...parent.children].filter((c) => c === el || (kind && c.classList.contains(kind)) || c.getAttribute("role") === role);
        for (const it of items) {
            if (setRole(it, role) || it.getAttribute("role") === role) {
                if (!it.hasAttribute("aria-selected") && role !== "radio") it.setAttribute("aria-selected", "false");
            }
        }
        if (parent.closest(`[role=${ROVING[role]}]`)) return;
        const others = [...parent.children].filter((c) => !items.includes(c));
        const label = regionName(parent) || (parent.closest(".k-quick") ? "Quick actions" : "") || clip(words(parent.previousElementSibling), 40);
        const own = (g) => {
            g.setAttribute("role", ROVING[role]);
            if (label && !g.hasAttribute("aria-label")) g.setAttribute("aria-label", label);
            if (role !== "tab" && items.filter((i) => i.getAttribute("aria-selected") === "true").length > 1) g.setAttribute("aria-multiselectable", "true");
        };
        if (needsRole(parent) && /^(DIV|UL|OL|SPAN)$/.test(parent.tagName) && !others.some(foreign)) {
            own(parent);
            for (const c of others) if (!c.matches("[hidden], script, template, style")) setRole(c, "presentation");
            return;
        }
        if (parent.tagName === "UL" || parent.tagName === "OL") {
            // A list cannot be wrapped (its children must stay list items). When a row of it holds a
            // control (a "Cancel" line under a running row), the list is a tree, whose items may.
            if ((role === "option" || role === "treeitem") && others.some(foreign)) {
                for (const it of items) if (it.getAttribute("role") === "option") it.setAttribute("role", "treeitem");
                role = "treeitem";
                for (const c of others) setRole(c, /^(UL|OL)$/.test(c.tagName) ? "group" : c.tagName === "LI" && foreign(c) ? "treeitem" : "none");
            } else for (const c of others) setRole(c, "none");
            own(parent);
            return;
        }
        // The group shares its parent with other controls: wrap each run of items, laid out as before.
        let run = [];
        const flush = () => {
            if (!run.length) return;
            const g = document.createElement(/^(SPAN|P)$/.test(parent.tagName) ? "span" : "div");
            g.className = "k-group";
            run[0].before(g);
            g.append(...run);
            for (const c of run) if (!items.includes(c)) setRole(c, "presentation");
            own(g);
            run = [];
        };
        for (const c of [...parent.children]) {
            if (items.includes(c)) run.push(c);
            else if (run.length && !foreign(c) && items.some((i) => c.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING)) run.push(c);
            else flush();
        }
        flush();
    };
    // An open modal (a shown k-backdrop) makes the app behind it inert, as compact-mantine's Modal
    // traps focus: Tab and a screen reader stay in the dialog (WCAG 2.4.3). Redone when a page's
    // #state shows or hides a backdrop.
    const modals = (apply = true) => {
        for (const el of document.querySelectorAll("[data-kit-modal-inert]")) {
            el.inert = false;
            el.removeAttribute("data-kit-modal-inert");
        }
        if (apply) for (const bd of document.querySelectorAll(".k-backdrop")) {
            if (!bd.getClientRects().length || bd.closest("[inert]")) continue;
            for (const d of bd.querySelectorAll("[role=dialog]:not([aria-modal])")) d.setAttribute("aria-modal", "true");
            const behind = [];
            const app = bd.closest(".k-app");
            if (app) {
                for (let n = bd; n !== app; n = n.parentElement) behind.push(...[...n.parentElement.children].filter((c) => c !== n));
            } else {
                let root = bd.parentElement;
                while (root && !root.querySelector(".k-app")) root = root.parentElement;
                if (root) behind.push(...[...root.querySelectorAll(".k-app")].filter((a) => !a.contains(bd)));
            }
            for (const el of behind) {
                if (el.inert) continue;
                el.inert = true;
                el.setAttribute("data-kit-modal-inert", "");
            }
        }
    };
    addEventListener("hashchange", () => requestAnimationFrame(modals));
    function rolesAndKeys() {
        modals(false); // the other passes see the app behind a dialog; modals() at the end makes it inert
        pictures();
        // A drawing's light and dark twins say the same sentence: an empty alt on one twin would
        // leave a screen reader with nothing in that theme (WCAG 1.1.1).
        for (const img of document.querySelectorAll("img.k-dark-only, img.k-light-only")) {
            if (img.getAttribute("alt")) continue;
            const twin = [img.previousElementSibling, img.nextElementSibling].find((t) => t?.matches("img.k-dark-only, img.k-light-only") && t.getAttribute("alt"));
            if (twin) img.setAttribute("alt", twin.getAttribute("alt"));
        }
        // The filter chip (the one with the funnel) is a button with a caret on every page, even
        // one drawn before the chip became a button; a file chip stays a plain chip.
        for (const el of document.querySelectorAll(".k-chip:not(.k-chip-btn)")) {
            const funnel = el.querySelector(':scope > svg use[href$="#funnel"]');
            if (!funnel) continue;
            el.classList.add("k-chip-btn");
            if (!el.querySelector('use[href$="#chevron-down"]')) {
                el.insertAdjacentHTML("beforeend", `<svg class="k-i k-i-sm k-caret" data-kit aria-hidden="true"><use href="${funnel.getAttribute("href").replace(/#funnel$/, "#chevron-down")}"/></svg>`);
            }
        }
        // Too wide for the panel: drop the leading "Filtered: " and keep the full words as the tooltip.
        document.fonts.ready.then(() => {
            for (const num of document.querySelectorAll(".k-chip-btn > .k-num")) {
                const first = num.firstChild;
                if (num.scrollWidth <= num.clientWidth || first?.nodeType !== 3 || !/^\s*Filtered: /.test(first.data)) continue;
                const chip = num.parentElement;
                if (!chip.dataset.tip) chip.dataset.tip = num.textContent.trim();
                first.data = first.data.replace(/^\s*Filtered: /, "");
            }
        });
        for (const el of document.querySelectorAll(".k-field[data-disabled], .k-btn[data-disabled], .k-item[data-disabled], .k-row[data-disabled]")) if (!el.hasAttribute("aria-disabled")) el.setAttribute("aria-disabled", "true");
        for (const el of document.querySelectorAll(".k-check, .k-switch, [aria-checked]")) {
            setRole(el, el.matches(".k-switch") ? "switch" : /radio/.test(el.className) ? "radio" : "checkbox");
            if (!el.hasAttribute("aria-checked") && /^(checkbox|switch|radio)$/.test(el.getAttribute("role"))) el.setAttribute("aria-checked", "false");
            if (!words(el) && !el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby")) {
                const t = words(el.closest(".k-item, .k-row, .k-fieldrow, .k-menu-item, label, li, tr") || el.parentElement);
                if (t) el.setAttribute("aria-label", clip(t));
            }
        }
        for (const el of document.querySelectorAll(".k-btn, .k-rail-btn, .k-tool, .k-tool-caret, .k-chip, .k-help, .k-seg > *, .k-toast-action, .k-toast-x, .k-link:not([href]), [aria-pressed], [aria-expanded]")) {
            setRole(el, "button");
            if (el.getAttribute("role") === "button" && !words(el) && !el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby")) {
                const n = nameOf(el);
                if (n) el.setAttribute("aria-label", n.replace(/\s{2}.*$/, ""));
            }
        }
        for (const el of document.querySelectorAll(".k-tab, [aria-selected], .k-list > .k-item")) {
            if (el.matches(NATIVE) || el.closest("[data-kit], svg") || !el.parentElement) continue;
            let role = el.getAttribute("role");
            if (!role) {
                const kind = el.classList[0];
                const rows = kind ? [...el.parentElement.children].filter((c) => c.classList.contains(kind)) : [el];
                role = el.matches(".k-tab") ? "tab" : rows.some((r) => r.querySelector(INTERACTIVE)) ? "treeitem" : "option";
            }
            if (ROVING[role]) groupItems(el, role);
        }
        for (const el of document.querySelectorAll(".k-menu")) {
            setRole(el, "menu");
            if (el.getAttribute("role") !== "menu") continue; // a page that made it a listbox owns its children
            for (const it of el.querySelectorAll(":scope > .k-menu-item")) setRole(it, it.querySelector(".k-check-col")?.textContent.trim() ? "menuitemcheckbox" : "menuitem");
            for (const it of el.querySelectorAll(':scope > [role="menuitemcheckbox"]')) if (!it.hasAttribute("aria-checked")) it.setAttribute("aria-checked", "true");
            for (const it of el.querySelectorAll(':scope > [role="menuitemradio"]:not([aria-checked])')) it.setAttribute("aria-checked", "false");
            for (const sep of el.querySelectorAll(":scope > .k-menu-sep")) setRole(sep, "separator");
            for (const c of el.querySelectorAll(":scope > :not([role])")) setRole(c, "presentation");
        }
        for (const el of document.querySelectorAll("[data-disabled][role]:not([aria-disabled])")) el.setAttribute("aria-disabled", "true");
        // A checkbox in a disabled row is disabled, and the row's words are its label.
        for (const el of document.querySelectorAll("[data-disabled] [role=checkbox]:not([aria-disabled]), [data-disabled] [role=switch]:not([aria-disabled])")) {
            el.setAttribute("aria-disabled", "true");
            const row = el.closest("[data-disabled]");
            const text = [...row.children].filter((c) => c !== el && c.textContent.trim() && !c.matches(INTERACTIVE));
            if (text.length && !el.hasAttribute("aria-labelledby")) {
                el.setAttribute("aria-labelledby", text.map((w) => (w.id ||= `k-lbl-${++labelIds}`)).join(" "));
                el.removeAttribute("aria-label");
            }
        }
        // Tab stops. A disabled button is skipped; a disabled item stays in its group's arrow order.
        for (const el of document.querySelectorAll("[role]")) {
            const role = el.getAttribute("role");
            if (el.hasAttribute("tabindex") || el.matches(NATIVE) || el.closest("[data-kit], [inert], [role=img]")) continue;
            if (/^(button|checkbox|switch|link)$/.test(role)) {
                if (!el.closest(DISABLED) && !el.closest("[role=menu], [aria-activedescendant]")) el.tabIndex = 0;
                continue;
            }
            const group = ROVING[role] && el.closest(`[role=${ROVING[role]}]`);
            if (!group || group.hasAttribute("aria-activedescendant")) continue;
            const items = [...group.querySelectorAll(`[role=${role}]`)].filter((c) => c.closest(`[role=${ROVING[role]}]`) === group);
            const current = items.find((c) => c.matches("[aria-selected=true], [aria-checked=true]")) || items.find((c) => !c.matches(DISABLED)) || items[0];
            el.tabIndex = el === current ? 0 : -1;
        }
        // The drawing is one Tab stop, as the keyboard walk mock draws it (screens/keyboard-walk.html):
        // Tab reaches the canvas, then its toolbar, then the table.
        for (const stage of document.querySelectorAll(".k-canvas > .k-stage")) {
            const canvas = stage.parentElement;
            if (stage.hasAttribute("tabindex") || stage.closest("[inert], [data-kit]") || canvas.querySelector("[role=application]")) continue;
            const img = [...stage.querySelectorAll("img")].find((i) => i.offsetParent !== null) || stage.querySelector("img");
            if (!img) continue;
            stage.tabIndex = 0;
            stage.setAttribute("role", "application");
            stage.setAttribute("aria-roledescription", "graph drawing");
            stage.setAttribute("aria-label", img.alt || "Graph drawing");
            for (const i of stage.querySelectorAll("img")) i.setAttribute("aria-hidden", "true");
        }
        // A scroll area that overflows and holds no Tab stop becomes one, named by its region. A
        // #state shown alone can make an area overflow only after load, so this runs again then.
        const scrollStops = () => {
            for (const el of document.querySelectorAll("body *")) {
                if (el.hasAttribute("tabindex") || el.closest("[data-kit], [inert]") || el.querySelector(INTERACTIVE) || el.matches("svg, svg *")) continue;
                if (el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1) continue;
                const s = getComputedStyle(el);
                if (!/(auto|scroll)/.test(s.overflowY + s.overflowX)) continue;
                el.tabIndex = 0;
                setRole(el, "region");
                if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", regionName(el) || "Scrollable content");
            }
        };
        scrollStops();
        if (!document.kitScrollStops) {
            document.kitScrollStops = true;
            for (const ev of ["load", "hashchange"]) addEventListener(ev, () => requestAnimationFrame(scrollStops));
        }
        // A label whose tooltip adds words (a statistic's meaning, a chip's full text) is
        // described by them, so a screen reader hears what a sighted reader sees on focus.
        for (const el of document.querySelectorAll("[data-tip]")) {
            if (el.hasAttribute("aria-describedby") || el.closest("[data-kit], [inert]")) continue;
            const t = el.dataset.tip.trim();
            if (!t || !words(el) || words(el) === t || el.getAttribute("aria-label") === t) continue;
            const d = document.createElement("span");
            d.className = "k-sr";
            d.setAttribute("data-kit", "");
            d.id = `k-desc-${++labelIds}`;
            d.textContent = t;
            document.body.append(d);
            el.setAttribute("aria-describedby", d.id);
        }
        // Headings and named regions in every app frame, so a screen reader can move by heading
        // and by region: the project name is the frame's top heading (level 1 on a whole-frame
        // screen, 2 on a document page that has its own h1), and every section, popover and dialog
        // header one level under it. A header that holds its own buttons keeps them beside the
        // heading, never inside it: only its leading words become the heading.
        const docH1 = !!document.querySelector("h1:not([data-kit])");
        const CONTROL = `${INTERACTIVE}, .k-icon-btn, .k-btn, .k-chip, .k-check, .k-switch, .k-seg, .k-tab, .k-grow`;
        const heading = (head, level) => {
            if (head.closest("[inert], [data-kit], [role=img]") || head.querySelector("[role=heading], h1, h2, h3, h4, h5, h6") || head.hasAttribute("role")) return;
            if (!head.querySelector(CONTROL)) {
                if (words(head)) head.setAttribute("role", "heading"), head.setAttribute("aria-level", level);
                return;
            }
            const lead = [];
            for (const n of head.childNodes) {
                if (n.nodeType === 1 && (n.matches(CONTROL) || n.querySelector(CONTROL))) break;
                lead.push(n);
            }
            if (!lead.some((n) => n.textContent.trim())) return;
            const span = document.createElement("span");
            span.setAttribute("role", "heading");
            span.setAttribute("aria-level", level);
            head.insertBefore(span, lead[0]);
            for (const n of lead) span.append(n);
        };
        const top = docH1 ? 2 : 1;
        for (const app of document.querySelectorAll(".k-app")) {
            if (app.closest("[inert], [data-kit]")) continue;
            for (const p of app.querySelectorAll(".k-panel-head .k-project")) heading(p, top);
            for (const h of app.querySelectorAll(".k-section-head, .k-popover-head, .k-modal-head")) heading(h, top + 1);
            const name = (sel, label) => { for (const r of app.querySelectorAll(sel)) if (!r.hasAttribute("aria-label") && !r.hasAttribute("aria-labelledby")) r.setAttribute("aria-label", label); };
            name(":scope > .k-rail", "Main");
            const open = app.querySelector(":scope > .k-rail .k-rail-btn[aria-pressed=true]");
            name(":scope > .k-panel", (open && [...open.childNodes].filter((n) => n.nodeType === 3).map((n) => n.data).join("").trim()) || "Left panel");
            // the names a reader hears on arriving in each region (flows/keyboard-walk.html, "Regions")
            name(":scope > .k-right", "Inspector");
            const dockTab = app.querySelector(".k-dock .k-dock-tabs .k-tab[aria-selected=true]");
            name(".k-dock", dockTab ? `${dockTab.textContent.trim()} table` : "Table");
            name(":scope > .k-main", "Graph drawing");
            // The first Tab stop in the frame skips to the drawing and says how regions are
            // crossed (WCAG 2.4.1); it shows only while focused.
            const stage = app.querySelector(".k-canvas [role=application], .k-canvas .k-stage[tabindex]");
            if (stage && !app.querySelector(":scope > .k-skip")) {
                const a = document.createElement("a");
                a.className = "k-skip";
                a.href = "#";
                a.textContent = "Skip to the graph drawing. F6 moves between regions.";
                a.addEventListener("click", (e) => { e.preventDefault(); stage.focus(); });
                app.prepend(a);
            }
        }
        // A whole-frame screen has no document heading on the page; the product's is the project
        // name, which a screen reader reaches as the page's heading. A page whose own h1 is hidden
        // in the state shown (a #state that shows one frame alone) gets the same one, and loses it
        // again when a state shows the page's h1.
        // (this pass can run more than once; the page keeps one such heading, hidden when unneeded)
        let h1 = document.querySelector("h1.k-sr[data-kit]");
        if (!h1) {
            h1 = document.createElement("h1");
            h1.className = "k-sr";
            h1.setAttribute("data-kit", "");
            h1.textContent = document.title || "graphty";
            document.body.prepend(h1);
            const pageH1 = () => {
                h1.hidden = [...document.querySelectorAll("h1:not([data-kit]), [role=heading][aria-level='1']")].some((h) => h.checkVisibility());
            };
            pageH1();
            // :target can settle only after load, when the browser scrolls to the fragment
            for (const ev of ["load", "hashchange"]) addEventListener(ev, () => requestAnimationFrame(pageH1));
        }
        modals();
    }
    const ACTIVATE = /^(button|checkbox|switch|radio|tab|option|treeitem|menuitem|menuitemcheckbox|menuitemradio|link)$/;
    document.addEventListener("keydown", (e) => {
        const el = e.target instanceof Element ? e.target : null;
        if (!el || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || el.matches(NATIVE)) return;
        const role = el.getAttribute("role") || "";
        if ((e.key === "Enter" || e.key === " ") && ACTIVATE.test(role) && !e.shiftKey) {
            e.preventDefault();
            el.click();
            return;
        }
        const group = ROVING[role] && el.closest(`[role=${ROVING[role]}]`);
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: -Infinity, End: Infinity }[e.key];
        if (!group || step === undefined || e.shiftKey || group.hasAttribute("aria-activedescendant")) return;
        const items = [...group.querySelectorAll(`[role=${role}]`)].filter((c) => c.closest(`[role=${ROVING[role]}]`) === group && !c.closest("[hidden]"));
        const i = items.indexOf(el);
        const next = items[Math.max(0, Math.min(items.length - 1, Number.isFinite(step) ? i + step : step < 0 ? 0 : items.length - 1))];
        if (!next || next === el) return;
        e.preventDefault();
        el.tabIndex = -1;
        next.tabIndex = 0;
        next.focus();
    });

    // A framed mock opened at a #state (a storyboard frame) scrolls its parent page to that state as
    // it loads, so a page with several frames opened at its last frame's place. A page opened with
    // no #fragment starts at its top, until the reader scrolls or presses a key.
    // ponytail: a lazy frame that loads after the reader has scrolled can still move the page; fix
    // by giving framed screens their state another way than a #fragment if that bites.
    if (window === top && !location.hash) {
        let moved = false;
        const own = () => (moved = true);
        for (const t of ["wheel", "keydown", "mousedown", "pointerdown", "touchstart"]) addEventListener(t, own, { capture: true, once: true });
        const back = () => !moved && !location.hash && scrollY && document.querySelector("iframe") && scrollTo(0, 0);
        addEventListener("scroll", back);
        // Lazy frames load in a cascade (each jump brings more into view); guard until frames have
        // stopped loading for two seconds after the page's own load.
        let done = 0;
        const settle = () => {
            clearTimeout(done);
            done = setTimeout(() => removeEventListener("scroll", back), 2000);
        };
        addEventListener("load", settle);
        document.addEventListener("load", (e) => e.target instanceof HTMLIFrameElement && (back(), settle()), true);
    }

    // ---------- 5. the study view: design notes hidden ----------
    // ?study in the URL (kit/shoot.mjs --study sets it) shows a mock as a participant sees it: no
    // numbered steps, callouts, dashed boxes, "proposed" tags or state switchers, which round 2's
    // participants read as broken product. Anything drawn in annotation ink is a design note: the
    // kit's classes by name, and a page's own note classes by their color (the ink is never a product
    // color, kit/README.md). A product element a note outlines keeps itself and loses the outline.
    // "Not working in this mock" marks stay: a participant needs to know a control is dead. They
    // keep their tooltip and cursor but lose the dashed outline, which round 3 read as design chrome.
    // A mock window that is not one of the kit's product classes carries data-kit-frame, and
    // everything inside it is product: nothing in it is hidden as narration.
    // The participant view is ?study, or "study" among a page's #hash states (screens/undo.html's
    // "#s3&study") on a page with no element whose id is "study" (there #study is a section link).
    const hashParts = location.hash.slice(1).split("&");
    const hashStudy = hashParts.includes("study") && !document.getElementById("study");
    const study = params.has("study") || window.__kitStudy === true || hashStudy;
    const hideNotes = () => {
        const probe = document.createElement("i");
        document.body.append(probe);
        const inks = new Set();
        for (const v of ["--k-annot", "--k-annot-ink", "--k-annot-bg"]) {
            probe.style.color = `var(${v})`;
            inks.add(getComputedStyle(probe).color);
        }
        probe.remove();
        const isInk = (c) => inks.has(c);
        // Document narration around the app frames (a state's heading and its description) is for the
        // reader of the mock, not the participant; product overlays keep theirs.
        const PRODUCT = "[data-kit-frame], .k-app, .k-menu, .k-popover, .k-modal, .k-toast, .k-tooltip, .k-tip, .k-canvas-card, .k-quick, .k-backdrop, .k-issue, .k-legend-card, .k-dock";
        const hide = (el) => el.style.setProperty("display", "none", "important");
        for (const el of document.body.querySelectorAll("h1, h2, h3, h4, p, figcaption, .k-lede")) {
            if (!el.closest(PRODUCT) && !el.querySelector(PRODUCT) && !el.matches("[data-kit]")) hide(el);
        }
        // State switchers: the mock's own controls outside every product frame (state tabs and
        // links, the gallery link, annotation and theme toggles, a version select). The box hidden
        // is the largest one around the control that holds no product frame; a page can also mark
        // one with data-kit-switcher.
        // A page marks a design note the ink rule cannot see (a spec table, a key) with data-kit-note.
        for (const el of document.body.querySelectorAll("[data-kit-note]")) hide(el);
        const SWITCH = '[data-kit-switcher], .k-tab, [role="tab"], [role="tablist"], a[href^="#"], a[href$="index.html"], input, select, label';
        for (const el of document.body.querySelectorAll(SWITCH)) {
            if (el.closest(PRODUCT) || el.closest("[data-kit]") || el.querySelector(PRODUCT)) continue;
            let box = el;
            while (box.parentElement && box.parentElement !== document.body && !box.parentElement.querySelector(PRODUCT)) box = box.parentElement;
            hide(box);
        }
        for (const el of document.body.querySelectorAll("*")) {
            if (el.closest("[data-kit-dead], [data-not-in-mock], .k-tip, svg") && !(el instanceof SVGSVGElement)) continue;
            if (el.matches(".k-step, .k-annot-box, .k-annot-note, .k-annot-tag, .k-cursor")) {
                hide(el);
                continue;
            }
            const cs = getComputedStyle(el);
            if (cs.display === "none") continue;
            const edge = cs.borderInlineStartWidth !== "0px" && isInk(cs.borderInlineStartColor);
            if (isInk(cs.backgroundColor) || (isInk(cs.color) && el.textContent.trim()) || edge) {
                el.style.setProperty("display", "none", "important");
                continue;
            }
            if (cs.outlineStyle !== "none" && isInk(cs.outlineColor)) el.style.setProperty("outline", "none", "important");
            if (cs.borderStyle.includes("dashed") && isInk(cs.borderTopColor)) {
                hide(el);
                continue;
            }
            // A solid rule in annotation ink (a state's separator) on an element that stays.
            for (const side of ["top", "right", "bottom", "left"]) {
                const c = cs.getPropertyValue(`border-${side}-color`);
                if (cs.getPropertyValue(`border-${side}-width`) !== "0px" && isInk(c)) el.style.setProperty(`border-${side}-color`, "transparent", "important");
            }
        }
    };
    if (study) document.documentElement.setAttribute("data-study", "");
    // The way out, for the facilitator (an owner on an iPad has no address bar edit to spare): Esc
    // when the page did not use it (a page's own Esc that closes a menu calls preventDefault), or a
    // small, faint control in the bottom-right corner. Not in a scripted render (kit/shoot.mjs).
    const leaveStudy = () => {
        const u = new URL(location.href);
        u.searchParams.delete("study");
        u.hash = hashParts.filter((x) => x && x !== "study").join("&");
        history.replaceState(history.state, "", u.href); // then reload: a page reads its #state on load
        location.reload();
    };
    const studyExit = () => {
        if (!study || window.__kitStudy === true || document.querySelector(".k-study-exit")) return;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "k-study-exit";
        b.setAttribute("data-kit", "");
        b.setAttribute("aria-label", "Leave the participant view (Esc)");
        b.title = "Leave the participant view (Esc)";
        b.innerHTML = '<svg class="k-i k-i-sm" aria-hidden="true"><use href="' + new URL("icons.svg#x", kitUrl).href + '"/></svg>';
        b.addEventListener("click", leaveStudy);
        document.documentElement.append(b); // outside body: a page that scales or clips its body cannot hide it
        // Pinned to the visible corner, at one physical size, however far a tablet is zoomed or panned
        // (a 1440 px mock on a 768 px iPad puts the layout corner off screen).
        const v = window.visualViewport;
        const place = () => {
            if (!v) return;
            b.style.left = `${v.offsetLeft + v.width - 32}px`;
            b.style.top = `${v.offsetTop + v.height - 32}px`;
            b.style.transform = `scale(${1 / v.scale})`;
        };
        place();
        v?.addEventListener("resize", place);
        v?.addEventListener("scroll", place);
        addEventListener("keydown", (e) => e.key === "Escape" && !e.defaultPrevented && leaveStudy());
    };

    // ---------- start ----------
    const report = () => {
        window.kitFx = { bound, problems };
        if (problems.length) {
            for (const p of problems) console.error(p);
            // Thrown outside the promise so the screenshot and check tools see a page error.
            setTimeout(() => {
                throw new Error(`${problems.length} kit problem${problems.length === 1 ? "" : "s"}:\n    ${problems.join("\n    ")}`);
            });
        }
    };
    const start = () => {
        nameIconButtons();
        rolesAndKeys();
        // A page that redraws on a click (a state switcher) gets the same pass on what it drew.
        let queued = 0;
        new MutationObserver((recs) => {
            if (queued || recs.every((r) => [...r.addedNodes].every((n) => n.nodeType !== 1 || n.matches("[data-kit], .k-group")))) return;
            queued = requestAnimationFrame(() => {
                queued = 0;
                nameIconButtons();
                rolesAndKeys();
            });
        }).observe(document.body, { subtree: true, childList: true });
        bindFixtures()
            .catch((err) => problem(String(err.message || err)))
            .finally(() => {
                // Pages that build their markup from the fixtures have it now: give it roles too.
                rolesAndKeys();
                if (study) {
                    // Again whenever the page draws or switches a state, since pages build some of
                    // their markup after this point.
                    let q = 0;
                    const again = () => q || (q = requestAnimationFrame(() => ((q = 0), hideNotes())));
                    hideNotes();
                    addEventListener("hashchange", again);
                    addEventListener("load", again);
                    new MutationObserver(again).observe(document.body, { subtree: true, childList: true });
                    studyExit();
                }
                report();
            });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
})();
