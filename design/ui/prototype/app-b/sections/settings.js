/* Settings (spec section 12.3; replaces Preferences). One wide dialog, aria-modal: a labeled search
   field and a section list on the left, the chosen section on the right. It holds only what belongs
   to the person, kept in this browser; anything a project carries lives on the object it configures.
   Opened by the main menu, Ctrl+,, the start-screen gear, Quick actions and "Change in Settings" links.

   Design notes (not shown in the UI):
   - You > Your name. Open for the owner: the decision says "the project's author setting"; this reads
     it as a per-person name stamped on each note and recipe, so one project can hold several authors.
   - Choice lists (GPU use, reference space, log levels) stand in for lists read from graphty-element.
   - Old links to "#/preferences/<state>" are redirected here by a small alias registered at the end
     of this file, so no other section file had to change. Those links should move to "settings".
   Plain ASCII. Section-local styles are injected below. */
(function () {
    "use strict";
    const CSS = `
.st-modal { width: min(880px, calc(100vw - 32px)); height: min(640px, calc(100vh - 56px)); max-height: none; }
.st-modal .k-modal-body { flex: 1 1 auto; min-height: 0; padding: 0; overflow: hidden; display: grid; grid-template-columns: 216px minmax(0, 1fr); }
.st-side { border-right: 1px solid var(--cm-border); display: flex; flex-direction: column; min-height: 0; }
.st-search { padding: 8px; display: grid; gap: 4px; }
.st-search label { font-size: 11px; color: var(--cm-text-secondary); padding: 0 2px; }
.st-search-box { display: flex; align-items: center; gap: 6px; height: 28px; padding: 0 8px; border-radius: 5px; background: var(--cm-bg-secondary); }
.st-search-box input { flex: 1; min-width: 0; border: 0; background: none; font: inherit; color: var(--cm-text); outline: none; }
.st-search-box:focus-within { outline: 1px solid var(--cm-border-selected); }
.st-count { font-size: 11px; color: var(--cm-text-secondary); padding: 0 2px; min-height: 16px; }
.st-nav { overflow: auto; padding: 0 0 8px; }
.st-nav .k-row { padding: 0 12px; cursor: pointer; }
.st-nav .k-row:hover { background: var(--cm-bg-hover, var(--cm-bg-secondary)); }
.st-nav .k-row[aria-disabled="true"] { color: var(--cm-text-disabled); }
.st-nav-sep { height: 1px; background: var(--cm-border); margin: 6px 12px; }
.st-main { overflow: auto; padding: 12px 24px 24px; min-width: 0; }
.st-main h2 { font-size: 15px; line-height: 20px; font-weight: 600; margin: 4px 0 2px; }
.st-main h3 { font-size: 12px; font-weight: 600; margin: 16px 0 0; color: var(--cm-text-secondary); }
.st-lede { margin: 0 0 8px; color: var(--cm-text-secondary); max-width: 60ch; }
.st-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 24px; align-items: start; padding: 10px 0; border-bottom: 1px solid var(--cm-border); }
.st-row:last-child { border-bottom: 0; }
.st-row-l { min-width: 0; }
.st-label { font-weight: 550; }
.st-help { color: var(--cm-text-secondary); font-size: 11px; line-height: 16px; margin-top: 2px; max-width: 58ch; }
.st-help a, .st-link { color: var(--cm-text-brand); cursor: pointer; }
.st-ctl { justify-self: end; margin-top: 1px; display: flex; align-items: center; gap: 8px; }
.st-wide { grid-column: 1 / -1; }
.st-input, .st-select { height: 24px; min-width: 200px; box-sizing: border-box; padding: 0 8px; border-radius: 5px; border: 0; background: var(--cm-bg-secondary); color: var(--cm-text); font: inherit; }
.st-input:focus, .st-select:focus { outline: 1px solid var(--cm-border-selected); }
/* The select keeps its native list (keyboard and screen readers) but draws as the kit's field with a caret */
.st-select { appearance: none; -webkit-appearance: none; padding-inline-end: 24px; box-shadow: var(--cm-field-shadow); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 4px center; }
.st-input[disabled], .st-select[disabled] { color: var(--cm-text-disabled); opacity: .6; }
.st-seg > button { cursor: pointer; }
.st-seg > button[aria-disabled="true"] { color: var(--cm-text-disabled); cursor: default; }
.st-seg:focus-within { outline: 1px solid var(--cm-border-selected); outline-offset: 1px; }
.st-switch { cursor: pointer; }
.st-status { display: flex; gap: 8px; align-items: flex-start; padding: 8px 10px; border-radius: 6px; background: var(--cm-bg-secondary); margin: 8px 0; }
.st-status .k-icon, .st-status svg { flex: none; margin-top: 1px; }
.st-quote { margin: 6px 0 0; padding: 6px 10px; border-left: 2px solid var(--cm-border-strong); color: var(--cm-text-secondary); font-size: 11px; line-height: 16px; max-width: 60ch; }
.st-details summary { cursor: pointer; color: var(--cm-text-brand); font-size: 11px; margin-top: 6px; }
.st-details ul { margin: 4px 0 0; padding-left: 18px; font-size: 11px; line-height: 16px; color: var(--cm-text-secondary); }
.st-limits .k-data { padding-left: 0; padding-right: 0; }
.st-sub { display: grid; grid-template-columns: 80px 200px; gap: 6px 12px; align-items: center; margin-top: 8px; }
.st-sub span { color: var(--cm-text-secondary); }
.st-hit mark { background: var(--cm-bg-brand-light, var(--cm-bg-secondary)); color: inherit; border-radius: 2px; }
.st-empty { color: var(--cm-text-secondary); padding: 24px 0; }
.st-group { margin-top: 8px; }
.st-group-h { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--cm-text-secondary); margin: 12px 0 0; cursor: pointer; }
.st-disc { cursor: pointer; display: inline-flex; align-items: center; gap: 4px; color: var(--cm-text-brand); margin: 8px 0; }
`;
    if (!document.getElementById("st-style")) document.head.append(h("style", { id: "st-style" }, CSS));

    const LM = () => AB.fx.datasets.lesmis;
    const n = (v) => Number(v).toLocaleString("en-US");

    // What the person has chosen, for this page view (the real app keeps it in this browser)
    const S = {
        name: "", usage: false, theme: "system", numfmt: "system",
        toolbarLabels: (AB.store && AB.store.get("toolbarLabels")) || "auto",
        motion: "system", singleKey: "on", selLook: "off", pinDrag: true,
        gpu: "auto", threshold: "", provider: "anthropic", remember: "device", voice: "system",
        hands: true, controllers: true, nearTouch: true, teleport: true, space: "room", depthBoost: true,
        overview: "general", logging: false, level: "warn", modules: "", profiling: false, fps: false,
        diagOpen: false,
    };
    let query = "";
    let current = "you";

    // ---------- controls ----------
    // A segmented control: one Tab stop, arrow keys move the choice (radio group)
    function seg(label, opts, key, o) {
        o = o || {};
        const g = h("div", { class: "k-seg st-seg", role: "radiogroup", "aria-label": label });
        const pick = (v) => { S[key] = v; if (o.onChange) o.onChange(v); rerender(g, v); };
        opts.forEach(([v, text]) => {
            const dis = o.disabled && o.disabled[v];
            g.append(h("button", {
                type: "button", role: "radio", "aria-checked": String(S[key] === v), tabindex: S[key] === v ? "0" : "-1",
                "aria-disabled": dis ? "true" : null, title: dis || null, "data-v": v,
                on: {
                    click: () => { if (!dis) pick(v); },
                    keydown: (e) => {
                        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
                        if (!d) return;
                        e.preventDefault();
                        const live = opts.filter(([x]) => !(o.disabled && o.disabled[x])).map(([x]) => x);
                        const i = (live.indexOf(S[key]) + d + live.length) % live.length;
                        pick(live[i]);
                    },
                },
            }, text));
        });
        return g;
    }
    // Re-draw the pane after a choice, keeping focus on the control that changed
    function rerender(g, v) {
        const label = g.getAttribute("aria-label");
        paint();
        const again = document.querySelector(`.st-seg[aria-label="${label}"] [data-v="${v}"]`);
        if (again) again.focus();
    }
    function sw(label, key, o) {
        o = o || {};
        return h("span", {
            class: "k-switch st-switch", role: "switch", tabindex: "0", "aria-label": label, "aria-checked": String(!!S[key]),
            on: {
                click: () => { S[key] = !S[key]; if (o.onChange) o.onChange(S[key]); paint(); focusSel(`[role=switch][aria-label="${label}"]`); },
                keydown: (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); e.currentTarget.click(); } },
            },
        });
    }
    const focusSel = (sel) => { const x = document.querySelector(".st-modal " + sel); if (x) x.focus(); };
    function input(label, key, o) {
        o = o || {};
        return h("input", Object.assign({ class: "st-input", type: o.type || "text", "aria-label": label, placeholder: o.placeholder || "", value: o.value != null ? o.value : S[key] || "", on: { input: (e) => { if (key) S[key] = e.target.value; } } }, o.attrs || {}));
    }
    function select(label, key, opts, o) {
        o = o || {};
        const s = h("select", { class: "st-select", "aria-label": label, disabled: o.disabled ? "" : null, on: { change: (e) => { S[key] = e.target.value; if (o.onChange) o.onChange(e.target.value); paint(); focusSel(`select[aria-label="${label}"]`); } } });
        opts.forEach(([v, text]) => s.append(h("option", { value: v, selected: S[key] === v ? "" : null }, text)));
        return s;
    }
    const help = (...kids) => h("div", { class: "st-help" }, ...kids);
    const goLink = (text, id, state) => h("a", { class: "st-link", href: AB.href(id, state) }, text);

    // ---------- the sections ----------
    // Each setting: { label, words (extra search terms), help, ctl, wide }
    function sections() {
        const gpuOff = AB.route && AB.route.state === "performance-gpu-unavailable";
        const L = LM();
        return [
            { id: "you", title: "You", icon: "user", lede: "Kept in this browser. Nothing here is stored in a project.", items: [
                { label: "Your name", stack: true, words: "author name byline", help: help("Stamped on each note and recipe you write. It shows only when a project holds work by more than one person. Blank means your notes carry no name."),
                    ctl: input("Your name", "name", { placeholder: "Not set" }) },
            ] },
            { id: "privacy", title: "Privacy", icon: "lock", items: [
                { label: "Share usage data", words: "telemetry analytics session replay privacy", ctl: sw("Share usage data", "usage"),
                    help: h("div", null,
                        h("blockquote", { class: "st-quote" }, "Your data is yours, but please help us. We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions."),
                        h("details", { class: "st-details", open: S.usage ? "" : null }, h("summary", null, "What is collected"),
                            h("ul", null,
                                h("li", null, "A session replay with every node name, attribute value, label and file content masked"),
                                h("li", null, "Anonymous task events (file loaded, first graph drawn, measure run, result read, style added, export, undo) with timings"),
                                h("li", null, "Errors and performance"),
                                h("li", null, "A feedback widget")),
                            help("No file contents ever leave your computer.")),
                        help(S.usage ? "On. Graph content is masked. " : "Off. Nothing is sent. ", goLink("See what has been sent and saved", "data-place", "sent-and-saved"))) },
            ] },
            { id: "appearance", title: "Appearance", icon: "palette", items: [
                { label: "Theme", words: "dark light mode color scheme", ctl: seg("Theme", [["system", "System"], ["light", "Light"], ["dark", "Dark"]], "theme", { onChange: applyTheme }),
                    help: help("The app's panels and menus. ", AB.needsElement("graphty-element takes no color scheme yet, so the canvas keeps its own background"), " The canvas background is a graph setting, in the graph's Canvas section.") },
                { label: "Number format", words: "locale decimal thousands separator", ctl: select("Number format", "numfmt", [["system", "System (1,234.5)"], ["period", "1,234.5"], ["comma", "1.234,5"], ["space", "1 234,5"]]),
                    help: help("Used in the table, the inspector and legends. Exports keep plain numbers.") },
                { label: "Toolbar labels", words: "toolbar text icons", ctl: seg("Toolbar labels", [["auto", "Auto"], ["always", "Always"], ["never", "Never"]], "toolbarLabels", { onChange: (v) => { AB.store && AB.store.set("toolbarLabels", v); const t = document.getElementById("ab-toolbar"); if (t) t.dataset.labels = v; } }),
                    help: help("Auto shows the words beside the toolbar icons while the window is wide enough.") },
            ] },
            { id: "accessibility", title: "Accessibility", icon: "accessibility", items: [
                { label: "Reduced motion", words: "animation motion camera fly", ctl: seg("Reduced motion", [["on", "On"], ["off", "Off"], ["system", "System"]], "motion"),
                    help: help("Jumps the camera instead of flying it when the app moves it (a saved view, Zoom to fit). ", AB.needsElement("graphty-element has no reduced-motion setting, so its own camera moves and the layout still animate")) },
                { label: "Single-key shortcuts", words: "keyboard keys shortcut wcag", ctl: seg("Single-key shortcuts", [["on", "On"], ["off", "Off"]], "singleKey", { onChange: (v) => AB.store && AB.store.set("singleKeys", v) }),
                    help: help("Off, the app's one-key shortcuts (P, ?, 5) need Ctrl or Cmd with them, so speech input cannot set them off by accident. The canvas's own keys still work on a focused canvas.") },
                { label: "My selection look on this device", words: "selection highlight color scale opacity contrast", ctl: seg("My selection look on this device", [["off", "Off"], ["on", "On"]], "selLook"),
                    help: help(S.selLook === "on" ? "On this device, selected nodes and edges use the values below instead of the project's Selection row. Nothing is filled in for you." : "Off, selections look the way the project's Selection row says."),
                    extra: S.selLook === "on" ? h("div", { class: "st-sub st-wide" },
                        h("span", null, "Color"), input("Selection color", null, { placeholder: "Choose a color" }),
                        h("span", null, "Scale"), input("Selection scale", null, { placeholder: "Not set", type: "number", attrs: { min: "0", step: "0.1" } }),
                        h("span", null, "Opacity"), input("Selection opacity", null, { placeholder: "Not set", type: "number", attrs: { min: "0", max: "1", step: "0.05" } })) : null },
            ] },
            { id: "canvas-input", title: "Canvas input", icon: "mouse-pointer-2", items: [
                { label: "Pin a node when I drag it", words: "drag pin fix position", ctl: sw("Pin a node when I drag it", "pinDrag"),
                    help: help("A dragged node stays where you drop it while the layout keeps running. Unpin it from its menu.") },
            ] },
            { id: "performance", title: "Performance", icon: "cpu", items: [
                { label: "GPU use", words: "gpu webgpu acceleration graphics", ctl: seg("GPU use", [["auto", "When available"], ["never", "Never"], ["required", "Required"]], "gpu"),
                    help: help("When available: large runs use the GPU if this browser has one. Never: everything runs on the CPU. Required: a run that cannot use the GPU stops with the reason instead of running on the CPU.") },
                { label: "GPU status", words: "gpu status device webgpu", wide: true, ctl: null,
                    extra: h("div", { class: "st-status st-wide", role: "status" }, gpuOff ? AB.icon("triangle-alert", "sm") : AB.icon("cpu", "sm"),
                        h("div", null, gpuOff
                            ? [h("b", null, "Unavailable. "), "This browser has no WebGPU, so every run uses the CPU.", S.gpu === "required" ? " With Required, runs will stop instead." : "", help("Reported by graphty-element when it checked this browser.")]
                            : S.gpu === "never" ? [h("b", null, "Off. "), "Every run uses the CPU."]
                                : [h("b", null, "Idle. "), `This graph (${L.title}, ${L.nodes} nodes) is below the threshold, so runs use the CPU.`, help("Reported by graphty-element. It says Checking, Running on the GPU with the device name, Idle, Unavailable with a reason, or Error.")])) },
                { label: "Use the GPU from N nodes", words: "gpu threshold advanced nodes", ctl: input("Use the GPU from N nodes", "threshold", { type: "number", placeholder: "Each algorithm's own", attrs: { min: "0", step: "1000", disabled: gpuOff || S.gpu === "never" ? "" : null } }),
                    help: help("Advanced. Blank uses graphty-element's own starting point for each algorithm.") },
                { label: "Limits", words: "limit maximum nodes edges detail selection sample", wide: true, ctl: null,
                    help: help("graphty-element's limits for this browser. They cannot be changed here."),
                    extra: h("div", { class: "st-limits st-wide" },
                        AB.data("Draws up to", n(50000) + " nodes, " + n(100000) + " edges"),
                        AB.data("Less detail above", n(10000) + " nodes"),
                        AB.data("Selections up to", n(5000) + " elements"),
                        AB.data("Sampled above", n(2000) + " nodes, where an algorithm allows")) },
            ] },
            { id: "assistant", title: "Assistant", icon: "bot", items: [
                { label: "Provider", words: "ai llm openai anthropic google webllm model provider", ctl: select("Provider", "provider", [["openai", "OpenAI"], ["anthropic", "Anthropic"], ["google", "Google"], ["browser", "In this browser"]]),
                    help: help(S.provider === "browser" ? "Runs a model inside this browser. No key, and nothing leaves your computer; the first use downloads the model." : "The Assistant sends your question and a summary of the graph to this provider.") },
                { label: "Model", words: "ai model", ctl: select("Model", "model", [["x", S.provider === "browser" ? "Choose after the download" : "Listed once the key is checked"]], { disabled: true }),
                    help: help("The list comes from the provider.") },
                S.provider === "browser" ? null : { label: "Key", words: "api key secret token", ctl: input("Key for " + provName(), "key_" + S.provider, { type: "password", placeholder: "Paste your " + provName() + " key" }),
                    help: help("One key per provider. Switching provider keeps the others.") },
                { label: "Remember keys", words: "key storage session remember", ctl: seg("Remember keys", [["device", "On this device"], ["session", "Until I close the tab"]], "remember"),
                    help: help("On this device keeps keys in this browser's storage; until I close the tab forgets them when the tab closes.") },
                { label: "Forget all keys", words: "key delete clear forget", ctl: AB.button("Forget all keys", { kind: "secondary", onClick: () => { ["openai", "anthropic", "google"].forEach((p) => (S["key_" + p] = "")); paint(); AB.announce("All keys forgotten"); AB.flash("All keys forgotten"); } }),
                    help: help("Removes every provider's key from this browser.") },
                { label: "Voice input language", words: "voice speech dictation language", ctl: select("Voice input language", "voice", [["system", "System (English, United States)"], ["en-GB", "English, United Kingdom"], ["fr-FR", "French"], ["de-DE", "German"], ["es-ES", "Spanish"]]) },
            ].filter(Boolean) },
            { id: "headset", title: "Headset", icon: "headset", lede: null, items: [
                { label: "Headset status", words: "vr ar xr headset", wide: true, ctl: null,
                    extra: h("div", { class: "st-status st-wide", role: "status" }, AB.icon("info", "sm"), h("div", null, "No headset connected; these apply when one is. Enter VR or AR from the toolbar's View mode.")) },
                { label: "Hand tracking", words: "vr hands xr", ctl: sw("Hand tracking", "hands") },
                { label: "Controllers", words: "vr controller xr", ctl: sw("Controllers", "controllers") },
                { label: "Near-touch", words: "vr touch poke xr", ctl: sw("Near-touch", "nearTouch"), help: help("Touch a node with a fingertip or controller to select it.") },
                { label: "Teleport", words: "vr move locomotion xr", ctl: sw("Teleport", "teleport") },
                { label: "Play space", words: "vr seated room scale reference space xr", ctl: seg("Play space", [["seated", "Seated"], ["room", "Room-scale"]], "space") },
                { label: "Depth boost when dragging", words: "vr drag depth xr", ctl: sw("Depth boost when dragging", "depthBoost"), help: help("Moves a dragged node further for a small hand movement, so far nodes are in reach.") },
            ] },
            { id: "keyboard", title: "Keyboard", icon: "keyboard", items: [
                { label: "Keyboard shortcuts", words: "keys hotkeys shortcuts", ctl: AB.button("Show shortcuts", { kind: "secondary", go: ["commands-and-search", "shortcuts"] }),
                    help: help("The canvas's own keys (graphty-element) come first and cannot be changed. Single-key shortcuts can be turned off in ", h("a", { class: "st-link", href: AB.href("settings", "accessibility") }, "Accessibility"), ".") },
            ] },
            { id: "projects", title: "Projects", icon: "folder-open", items: [
                { label: "Default overview for new projects", words: "overview recipe new project default", ctl: select("Default overview for new projects", "overview", [["general", "General overview"], ["flow", "Flow overview"], ["community", "Community overview"]]),
                    help: help("What a new project's overview computes. An open project keeps its own; change that from the graph's overview.") },
            ] },
            { id: "diagnostics", title: "Diagnostics", icon: "circle-help", lede: "For troubleshooting. Nothing here changes a graph.", items: [
                { label: "Logging", words: "log debug console", ctl: sw("Logging", "logging") },
                { label: "Level", words: "log level debug", ctl: seg("Log level", [["error", "Error"], ["warn", "Warn"], ["info", "Info"], ["debug", "Debug"]], "level", { disabled: S.logging ? null : { error: "Turn logging on", warn: "Turn logging on", info: "Turn logging on", debug: "Turn logging on" } }) },
                { label: "Modules", words: "log modules", ctl: input("Log modules", "modules", { placeholder: "All modules", attrs: { disabled: S.logging ? null : "" } }), help: help("Names separated by commas, for example layout, style.") },
                { label: "Detailed profiling", words: "profile timing cpu gpu performance", ctl: sw("Detailed profiling", "profiling"), help: help("Records CPU and GPU time for each frame and run. Slows the app a little.") },
                { label: "Frame rate readout", words: "fps frame time performance", ctl: sw("Frame rate readout", "fps"), help: help("Shows frames per second and frame time in a corner of the canvas.") },
            ] },
        ];
    }
    function provName() { return { openai: "OpenAI", anthropic: "Anthropic", google: "Google", browser: "In this browser" }[S.provider]; }
    function applyTheme(v) {
        if (v === "system") document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme", v);
        if (AB.store) AB.store.set("theme", v === "system" ? "" : v);
    }
    const matches = (it, q) => (it.label + " " + (it.words || "")).toLowerCase().includes(q);

    // ---------- drawing ----------
    let root = null;
    function itemRow(it) {
        return h("div", { class: "st-row" + (query ? " st-hit" : "") },
            // A text field sits under its label, where the eye reads next; switches and choices sit right
            h("div", { class: "st-row-l" }, h("div", { class: "st-label" }, mark(it.label)), it.stack && it.ctl ? h("div", { style: "margin:6px 0 2px" }, it.ctl) : null, it.help || null),
            it.ctl && !it.stack ? h("div", { class: "st-ctl" }, it.ctl) : null,
            it.extra || null);
    }
    function mark(text) {
        if (!query) return text;
        const i = text.toLowerCase().indexOf(query);
        return i < 0 ? text : [text.slice(0, i), h("mark", null, text.slice(i, i + query.length)), text.slice(i + query.length)];
    }
    function paint() {
        if (!root) return;
        const secs = sections();
        const q = query.trim().toLowerCase();
        const hits = q ? secs.map((s) => ({ s, items: s.items.filter((it) => matches(it, q)) })) : null;
        const total = hits ? hits.reduce((a, x) => a + x.items.length, 0) : 0;

        const nav = root.querySelector(".st-nav");
        nav.replaceChildren();
        secs.forEach((s) => {
            if (s.sep) nav.append(h("div", { class: "st-nav-sep", role: "separator" }));
            const c = hits ? hits.find((x) => x.s === s).items.length : null;
            nav.append(AB.row({ icon: s.icon, label: s.title, trail: c ? String(c) : null, selected: !q && s.id === current,
                onClick: () => { query = ""; root.querySelector("#st-q").value = ""; current = s.id; paint(); AB.announce(s.title); const n = root.querySelector(".st-nav [aria-selected='true']"); if (n) n.focus(); } }));
            const r = nav.lastChild;
            r.setAttribute("role", "tab");
            r.setAttribute("aria-selected", String(!q && s.id === current));
            if (hits && !c) r.setAttribute("aria-disabled", "true");
        });
        // One Tab stop for the section list: the chosen section; Up and Down move and choose
        const tabsEls = [...nav.querySelectorAll("[role='tab']")];
        const on = tabsEls.find((t) => t.getAttribute("aria-selected") === "true") || tabsEls[0];
        tabsEls.forEach((t) => { t.tabIndex = t === on ? 0 : -1; });
        nav.onkeydown = (e) => {
            const i = tabsEls.indexOf(document.activeElement);
            if (i < 0) return;
            const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: tabsEls.length - 1 }[e.key];
            if (to == null) return;
            e.preventDefault();
            const t = tabsEls[(to + tabsEls.length) % tabsEls.length];
            t.click();
        };

        root.querySelector(".st-count").textContent = q ? (total === 1 ? "1 setting matches" : total + " settings match") : "";

        const main = root.querySelector(".st-main");
        main.replaceChildren();
        if (q) {
            main.append(h("h2", { id: "st-h" }, "Settings matching \"" + query.trim() + "\""));
            if (!total) main.append(h("div", { class: "st-empty" }, "No setting matches. Try a shorter word, or pick a section on the left."));
            hits.filter((x) => x.items.length).forEach((x) => {
                main.append(h("h3", null, h("a", { class: "st-link", on: { click: () => { query = ""; root.querySelector("#st-q").value = ""; current = x.s.id; paint(); } } }, x.s.title)));
                main.append(h("div", { class: "st-group" }, x.items.map(itemRow)));
            });
            return;
        }
        const s = secs.find((x) => x.id === current) || secs[0];
        main.append(h("h2", { id: "st-h" }, s.title));
        if (s.lede) main.append(h("p", { class: "st-lede" }, s.lede));
        if (s.collapsed && !S.diagOpen) {
            main.append(h("span", { class: "st-disc", role: "button", tabindex: "0", "aria-expanded": "false", on: { click: () => { S.diagOpen = true; paint(); } } }, AB.icon("chevron-right", "sm"), "Show " + s.items.length + " diagnostic settings"));
            return;
        }
        main.append(h("div", null, s.items.map(itemRow)));
    }

    registerSection({
        id: "settings",
        title: "Settings",
        region: "overlay",
        closeTo: "graph-place",
        states: [
            { id: "you", label: "You" },
            { id: "privacy", label: "Privacy" },
            { id: "privacy-on", label: "Privacy, usage data on" },
            { id: "appearance", label: "Appearance" },
            { id: "accessibility", label: "Accessibility" },
            { id: "canvas-input", label: "Canvas input" },
            { id: "performance", label: "Performance" },
            { id: "performance-gpu-unavailable", label: "Performance, no GPU" },
            { id: "assistant", label: "Assistant" },
            { id: "headset", label: "Headset" },
            { id: "keyboard", label: "Keyboard" },
            { id: "projects", label: "Projects" },
            { id: "diagnostics", label: "Diagnostics" },
            { id: "search", label: "Search: gpu" },
        ],
        render(el, state) {
            state = state || "you";
            current = state.replace(/-(on|gpu-unavailable)$/, "");
            if (state === "privacy") S.usage = false;
            if (state === "privacy-on") S.usage = true;
            if (state === "diagnostics") S.diagOpen = true;
            query = state === "search" ? "gpu" : "";
            if (state === "search") current = "performance";

            const q = h("input", { id: "st-q", type: "search", "aria-label": "Search settings", "aria-describedby": "st-count", placeholder: "Search settings", value: query, autocomplete: "off",
                on: { input: (e) => { query = e.target.value; paint(); const c = root.querySelector(".st-count").textContent; if (c) AB.announce(c); } } });
            const side = h("div", { class: "st-side" },
                h("div", { class: "st-search" },
                    h("div", { class: "st-search-box" }, AB.icon("search", "sm"), q),
                    h("div", { class: "st-count", id: "st-count", "aria-live": "polite" })),
                h("div", { class: "st-nav", role: "tablist", "aria-orientation": "vertical", "aria-label": "Settings sections" }));
            const main = h("div", { class: "st-main", role: "tabpanel", "aria-labelledby": "st-h" });
            const wrap = AB.modal({ title: "Settings", wide: true, body: [side, main] });
            const box = wrap.querySelector(".k-modal");
            box.classList.add("st-modal");
            box.setAttribute("aria-modal", "true");
            root = box;
            paint();
            el.append(wrap);
            // A modal keeps Tab inside itself, and opens on the chosen section in its list
            box.addEventListener("keydown", (e) => {
                if (e.key !== "Tab") return;
                const f = [...box.querySelectorAll("input, button, select, [tabindex='0']")].filter((x) => !x.disabled && x.offsetParent !== null);
                if (!f.length) return;
                const i = f.indexOf(document.activeElement);
                if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
                else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
            });
            if (state !== "search") setTimeout(() => { const cur = box.querySelector(".st-nav [aria-selected='true']"); if (cur) cur.focus(); }, 10);
            if (state === "search") { AB.announce(root.querySelector(".st-count").textContent); setTimeout(() => { q.focus(); q.setSelectionRange(3, 3); }, 0); }
        },
    });

    // Old "Preferences" links (#/preferences/...) open Settings at the matching section
    const OLD = { general: "you" };
    registerSection({
        id: "preferences", title: "Preferences (now Settings)", region: "overlay", closeTo: "graph-place", states: ["general"],
        render(el, state) { location.replace(AB.href("settings", OLD[state] || "you")); },
    });
})();
