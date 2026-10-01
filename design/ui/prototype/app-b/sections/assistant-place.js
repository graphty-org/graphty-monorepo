/* Assistant place: the rail's last place. With no AI provider: one empty line linking to
   Settings > Assistant, and nothing else. With one: a switcher row (the open conversation, a
   chevron listing the others and New conversation), the conversation, and the composer pinned at
   the bottom (microphone and Send). A tool line is one sentence with the object as a chip, the
   same chip Notes uses for its targets. A failed answer carries Retry inside it; the composer stays
   empty. Layers the assistant adds are ordinary rows marked "from the assistant". Plain ASCII. */
(function () {
    const CSS = `
.as-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; }
.as-conv { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 12px; font-size: 12px; line-height: 18px; }
.as-q { align-self: flex-end; max-width: 85%; padding: 6px 10px; border-radius: 8px; background: var(--cm-bg-secondary); color: var(--cm-text); }
.as-a { color: var(--cm-text); display: flex; flex-direction: column; gap: 6px; }
.as-a ol { margin: 0; padding-left: 18px; }
.as-tools { display: flex; flex-direction: column; gap: 2px; }
.as-tool { display: flex; align-items: center; gap: 6px; min-width: 0; min-height: 22px; white-space: nowrap; color: var(--cm-text-secondary); }
.as-tool > svg { flex: none; }
.as-tool.is-running > svg { animation: as-spin 1s linear infinite; }
.as-tool.is-failed > svg { color: var(--cm-text-danger); }
@keyframes as-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .as-tool.is-running > svg { animation: none; } }
/* The object chip: the same look as a note's target chip in the Notes place. */
.as-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 20px; padding: 0 6px; border-radius: 5px; background: var(--cm-bg-secondary); color: var(--cm-text); box-shadow: inset 0 0 0 1px var(--cm-border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
.as-chip:hover { background: var(--cm-bg-hover); }
.as-chip .k-i { color: var(--cm-icon-secondary); flex: none; }
.as-caret::after { content: ""; display: inline-block; width: 6px; height: 12px; margin-left: 2px; vertical-align: -2px; background: var(--cm-text-secondary); animation: as-blink 1s steps(2) infinite; }
@keyframes as-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .as-caret::after { animation: none; } }
.as-err { display: flex; gap: 6px; align-items: flex-start; color: var(--cm-text-danger); }
.as-err > svg { flex: none; margin-top: 3px; }
.as-composer { flex: none; border-top: 1px solid var(--cm-border); padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.as-composer textarea { font: inherit; font-size: 12px; resize: none; min-height: 56px; padding: 6px 8px; border-radius: 5px; border: 0; background: var(--cm-bg-secondary); color: var(--cm-text); }
.as-composer textarea:disabled { opacity: 0.6; }
.as-composer-foot { display: flex; align-items: center; gap: 6px; }
.as-mic { border: 0; background: none; padding: 0; font: inherit; }
.as-mic:disabled { opacity: 0.4; }
.as-mic[aria-pressed="true"] { color: var(--cm-text-danger); }
`;
    if (!document.getElementById("as-css")) document.head.append(h("style", { id: "as-css" }, CSS));

    /* The kit's sprite has no microphone; this is lucide's "mic", drawn inline. */
    function micIcon() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("width", "16"); svg.setAttribute("height", "16"); svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "2");
        svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round"); svg.setAttribute("aria-hidden", "true");
        for (const d of ["M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z", "M19 10v2a7 7 0 0 1-14 0v-2", "M12 19v3"]) {
            const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); svg.append(p);
        }
        return svg;
    }

    const CONVERSATIONS = [
        "Who holds the story's groups together?",
        "Explain the Louvain groups",
        "Why is Myriel's group so far from the rest?",
    ];
    const LAYER = "Size by betweenness";

    /* The object chip: a kind icon and the object's name; a click selects it. */
    function chip(iconName, label, target) {
        const c = h("span", Object.assign({ class: "as-chip", role: "link" }, AB.act({ go: target })), icon(iconName, "sm"), label);
        return AB.tip(c, "Select " + label, { label: false });
    }
    const CHIPS = {
        graph: () => chip("table", "Les Miserables", ["data-place", "attributes"]),
        run: () => chip(AB.ICON.run, "Betweenness", ["inspector-measure-row", "data"]),
        layer: () => chip(AB.ICON.run, LAYER, ["graph-place", "at-rest"]),
    };

    /* One tool line: a status icon and one sentence. status: "done", "running", "failed". */
    function tool(status, ...words) {
        const ic = { done: "circle-check", running: "loader-circle", failed: "circle-x" }[status];
        return h("div", { class: "as-tool is-" + status }, icon(ic, "sm"), words);
    }

    /* The switcher row: the open conversation; its menu lists the others and New conversation. */
    function switcher() {
        const btn = h("span", { class: "ab-switch-btn", role: "button", tabindex: "0", "aria-haspopup": "menu", "aria-expanded": "false" },
            icon(AB.ICON.note), h("span", { class: "k-ellipsis" }, CONVERSATIONS[0]), icon("chevron-down", "sm"));
        const open = () => AB.openMenu(btn, [
            ...CONVERSATIONS.map((t, i) => ({ label: t, check: i === 0, onClick: () => i && AB.flash("Open conversation: " + t) })),
            { sep: true },
            { label: "New conversation", onClick: () => AB.flash("New conversation") },
        ]);
        btn.addEventListener("click", open);
        btn.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " " || (e.altKey && e.key === "ArrowDown")) && (e.preventDefault(), open()));
        return h("div", { class: "ab-switcher" }, btn);
    }

    /* mode: "idle", "streaming" */
    function composer(mode) {
        const busy = mode === "streaming";
        const ta = h("textarea", { "aria-label": "Ask the Assistant", placeholder: "Ask about this graph", disabled: busy ? "" : null });
        const mic = h("button", {
            class: "k-icon-btn as-mic", type: "button", "aria-pressed": "false", disabled: busy ? "" : null,
            on: {
                click: () => {
                    const on = mic.getAttribute("aria-pressed") !== "true";
                    mic.setAttribute("aria-pressed", String(on));
                    ta.placeholder = on ? "Listening..." : "Ask about this graph";
                    AB.announce(on ? "Listening" : "Stopped listening");
                },
            },
        }, micIcon());
        AB.tip(mic, "Voice input");
        const action = busy
            ? AB.button("Stop", { icon: "square", kind: "secondary", go: ["assistant-place", "conversation"] })
            : AB.button("Send", { icon: "arrow-right", key: "Enter", go: ["assistant-place", "streaming"] });
        return h("div", { class: "as-composer" }, ta, h("div", { class: "as-composer-foot" }, mic, h("span", { class: "k-grow" }), action));
    }

    function nodeLink(n) {
        return h("span", null, AB.link("inspector-node", "why-this-look", n.label, { class: "k-link" }), " (" + n.betweenness + ")");
    }

    /* stage: "done", "streaming", "failed" */
    function conversation(stage) {
        const top = AB.fx.datasets.lesmis.topByBetweenness.slice(0, 3);
        const valjean = top[0];
        const read = tool("done", "Read ", CHIPS.graph());
        const tools = {
            done: [read, tool("done", "Ran ", CHIPS.run()), tool("done", "Added ", CHIPS.layer())],
            streaming: [read, tool("done", "Ran ", CHIPS.run()), tool("running", "Adding ", CHIPS.layer())],
            failed: [read, tool("failed", "Betweenness did not run")],
        }[stage];
        const answer = {
            done: [
                h("div", null, "By betweenness, these characters lie on the most shortest paths between the others:"),
                h("ol", null, top.map((n) => h("li", null, nodeLink(n)))),
                h("div", null, valjean.label + " also has the most connections, " + valjean.degree + "."),
            ],
            streaming: [
                h("div", { class: "as-caret" }, "By betweenness, these characters lie on the most shortest paths between the others:"),
                h("div", null, AB.openQuestion("When Stop lands mid-answer, do layers already added stay?")),
            ],
            failed: [
                h("div", { class: "as-err", role: "alert" }, icon("triangle-alert", "sm"),
                    h("span", null, "The AI provider stopped responding. Nothing was added to the graph.")),
                h("div", null, AB.button("Retry", { icon: "refresh-cw", kind: "secondary", go: ["assistant-place", "streaming"] })),
            ],
        }[stage];
        return h("div", { class: "as-conv", "aria-live": stage === "streaming" ? "polite" : null },
            h("div", { class: "as-q" }, CONVERSATIONS[0]),
            h("div", { class: "as-a" }, h("div", { class: "as-tools", "aria-label": "Tool calls" }, tools), answer),
        );
    }

    registerSection({
        id: "assistant-place",
        title: "Assistant place",
        region: "left",
        rail: "assistant",
        states: [
            { id: "no-provider", label: "No AI provider set" },
            { id: "conversation", label: "One conversation open" },
            { id: "streaming", label: "Answer streaming" },
            { id: "failed-retry", label: "Answer failed, Retry" },
        ],
        render(el, state) {
            if (state === "no-provider") {
                el.append(AB.placeHead("Assistant"),
                    AB.empty("The Assistant needs an AI provider.", { verb: "Set one up in Settings", go: ["settings", "assistant"] }));
                return;
            }
            const stage = state === "streaming" ? "streaming" : state === "failed-retry" ? "failed" : "done";
            el.append(
                AB.placeHead("Assistant"),
                switcher(),
                h("div", { class: "as-body" }, conversation(stage)),
                composer(stage === "streaming" ? "streaming" : "idle"),
            );
        },
    });
})();
