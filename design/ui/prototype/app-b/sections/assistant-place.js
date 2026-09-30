/* Assistant place: the rail's last place. A list of conversations, the open conversation and a
   composer. Provider setup lives only in Settings > Assistant; with no provider set, this place
   links there one way and has no provider control of its own. The composer sends, stops while an
   answer streams, retries after a failure, and takes voice input. Tool calls show as they stream.
   Layers the assistant adds are ordinary rows whose provenance reads "from the assistant".
   Conversations are app state, not project objects. Plain ASCII. */
(function () {
    const CSS = `
.as-body { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; }
.as-empty { padding: 24px 16px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; font-size: 12px; line-height: 18px; color: var(--cm-text-secondary); }
.as-empty .k-strong { color: var(--cm-text); font-size: 13px; }
.as-conv { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 12px; font-size: 12px; line-height: 18px; }
.as-q { align-self: flex-end; max-width: 85%; padding: 6px 10px; border-radius: 8px; background: var(--cm-bg-secondary); color: var(--cm-text); }
.as-a { color: var(--cm-text); display: flex; flex-direction: column; gap: 6px; }
.as-a ol { margin: 0; padding-left: 18px; }
.as-a .k-link { cursor: pointer; }
.as-tools { display: flex; flex-direction: column; gap: 2px; border-left: 2px solid var(--cm-border); padding-left: 8px; }
.as-tool { display: flex; align-items: center; gap: 6px; min-height: 20px; color: var(--cm-text-secondary); font-size: 11px; line-height: 16px; }
.as-tool svg { flex: none; }
.as-tool.is-running svg { animation: as-spin 1s linear infinite; }
.as-tool.is-failed { color: var(--cm-text-danger); }
.as-tool .k-link { font-size: 11px; }
@keyframes as-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .as-tool.is-running svg { animation: none; } }
.as-caret::after { content: ""; display: inline-block; width: 6px; height: 12px; margin-left: 2px; vertical-align: -2px; background: var(--cm-text-secondary); animation: as-blink 1s steps(2) infinite; }
@keyframes as-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .as-caret::after { animation: none; } }
.as-err { display: flex; gap: 6px; align-items: flex-start; color: var(--cm-text-danger); }
.as-err svg { flex: none; margin-top: 3px; }
.as-open { display: inline-block; align-self: flex-start; padding: 2px 6px; border-radius: 5px; font-size: 11px; line-height: 16px; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border-strong); }
.as-composer { flex: none; border-top: 1px solid var(--cm-border); padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.as-composer textarea { font: inherit; font-size: 12px; resize: none; min-height: 56px; padding: 6px 8px; border-radius: 5px; border: 0; background: var(--cm-bg-secondary); color: var(--cm-text); }
.as-composer textarea:disabled { opacity: 0.6; }
.as-composer-foot { display: flex; align-items: center; gap: 6px; min-width: 0; }
.as-composer-foot .k-caption { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.as-mic { border: 0; background: none; padding: 0; font: inherit; }
.as-mic:disabled { opacity: 0.4; }
.as-mic[aria-pressed="true"] { color: var(--cm-text-danger); }
`;
    if (!document.getElementById("as-css")) document.head.append(h("style", { id: "as-css" }, CSS));

    const openQ = (text) => h("span", { class: "as-open", title: text }, "Open question: " + text);

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

    /* mode: "off" (no provider), "idle", "streaming", "failed" */
    function composer(mode) {
        const off = mode === "off";
        const ta = h("textarea", {
            "aria-label": "Ask the Assistant",
            placeholder: off ? "Set up the Assistant in Settings to ask a question" : "Ask about this graph",
            disabled: off || mode === "streaming" ? "" : null,
        });
        if (mode === "failed") ta.value = CONVERSATIONS[0];
        const mic = h("button", {
            class: "k-icon-btn as-mic", type: "button", "aria-label": "Voice input", "aria-pressed": "false",
            title: off ? "Voice input needs an AI provider" : "Voice input",
            disabled: off || mode === "streaming" ? "" : null,
            on: {
                click: () => {
                    const on = mic.getAttribute("aria-pressed") !== "true";
                    mic.setAttribute("aria-pressed", String(on));
                    ta.placeholder = on ? "Listening... speak your question" : "Ask about this graph";
                    AB.announce(on ? "Listening" : "Stopped listening");
                },
            },
        }, micIcon());
        const caption = {
            off: "No AI provider",
            idle: "Les Miserables, 77 nodes, 254 edges",
            streaming: "Answering...",
            failed: "The answer did not finish",
        }[mode];
        const action = {
            off: AB.button("Send", { icon: "arrow-right", disabled: true }),
            idle: AB.button("Send", { icon: "arrow-right", go: ["assistant-place", "streaming"] }),
            streaming: AB.button("Stop", { icon: "square", kind: "secondary", go: ["assistant-place", "conversation"] }),
            failed: AB.button("Retry", { icon: "refresh-cw", go: ["assistant-place", "streaming"] }),
        }[mode];
        return h("div", { class: "as-composer" },
            ta,
            h("div", { class: "as-composer-foot" },
                mic,
                h("span", { class: "k-caption" }, caption),
                h("span", { class: "k-grow" }),
                action,
            ),
        );
    }

    function list(active) {
        return AB.section({ title: "Conversations", count: active == null ? 0 : CONVERSATIONS.length },
            active == null
                ? h("div", { class: "as-empty" }, "No conversations yet.")
                : CONVERSATIONS.map((t, i) => AB.row({
                    icon: "message-square", label: t, selected: i === active,
                    onClick: i === active ? undefined : () => AB.flash("Open conversation (not wired in the skeleton)"),
                })),
        );
    }

    function nodeLink(n) {
        return h("span", null, AB.link("inspector-node", "why-this-look", n.label, { class: "k-link" }), " (" + n.betweenness + ")");
    }

    /* One tool call line. status: "done", "running", "failed", "stopped". */
    function tool(status, label, extra) {
        const ic = { done: "circle-check", running: "loader-circle", failed: "circle-x", stopped: "circle-x" }[status];
        return h("div", { class: "as-tool is-" + status },
            icon(ic, "sm"), h("span", null, label), extra ? [h("span", null, " -- "), extra] : null);
    }

    const layerLink = () => AB.link("graph-place", "at-rest", LAYER + ", from the assistant", { class: "k-link" });

    /* stage: "done", "streaming", "failed" */
    function conversation(stage) {
        const top = AB.fx.datasets.lesmis.topByBetweenness.slice(0, 3);
        const valjean = top[0];
        const tools = {
            done: [
                tool("done", "Read the graph's attributes"),
                tool("done", "Ran Betweenness"),
                tool("done", "Added a layer", layerLink()),
            ],
            streaming: [
                tool("done", "Read the graph's attributes"),
                tool("done", "Ran Betweenness"),
                tool("running", "Adding a layer: " + LAYER),
            ],
            failed: [
                tool("done", "Read the graph's attributes"),
                tool("failed", "Run Betweenness"),
            ],
        }[stage];
        const answer = {
            done: [
                h("div", null, "By betweenness, these characters lie on the most shortest paths between the others:"),
                h("ol", null, top.map((n) => h("li", null, nodeLink(n)))),
                h("div", null, valjean.label + " also has the most connections, " + valjean.degree + "."),
                h("div", { class: "k-caption" }, "The layer is a row in the Graph tree like any other. Hide, edit or delete it there."),
            ],
            streaming: [
                h("div", { class: "as-caret" }, "By betweenness, these characters lie on the most shortest paths between the others:"),
                openQ("when Stop lands mid-answer, do layers already added stay?"),
            ],
            failed: [
                h("div", { class: "as-err", role: "alert" }, icon("triangle-alert", "sm"),
                    h("span", null, "The AI provider stopped responding before the answer finished. Nothing was added to the graph.")),
                h("div", { class: "k-caption" }, "Retry sends the same question again. To change the provider, go to ",
                    AB.link("settings", "assistant", "Settings > Assistant", { class: "k-link" }), "."),
            ],
        }[stage];
        return h("div", { class: "as-conv", "aria-live": stage === "streaming" ? "polite" : null },
            h("div", { class: "as-q" }, CONVERSATIONS[0]),
            h("div", { class: "as-a" }, h("div", { class: "as-tools", "aria-label": "Tool calls" }, tools), answer),
        );
    }

    function noProvider() {
        return h("div", { class: "as-empty" },
            icon("bot", "lg"),
            h("span", { class: "k-strong" }, "What can I ask?"),
            h("span", null, "Ask about the graph in plain words: who connects the groups, why a node looks the way it does, what a run found. The Assistant can run algorithms and add layers for you; each one lands in the Graph tree marked from the assistant."),
            h("span", null, "It needs an AI provider first. ",
                AB.link("settings", "assistant", "Set one up in Settings > Assistant", { class: "k-link" }), "."),
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
            const off = state === "no-provider";
            const mode = off ? "off" : state === "streaming" ? "streaming" : state === "failed-retry" ? "failed" : "idle";
            const stage = mode === "streaming" ? "streaming" : mode === "failed" ? "failed" : "done";
            const plus = AB.iconButton("plus", "New conversation", {
                onClick: () => AB.flash(off ? "New conversation needs an AI provider" : "New conversation (not wired in the skeleton)"),
            });
            if (off) { plus.setAttribute("aria-disabled", "true"); plus.title = "New conversation needs an AI provider"; }
            el.append(
                AB.placeHead("Assistant", plus),
                h("div", { class: "as-body" },
                    list(off ? null : 0),
                    off ? noProvider() : conversation(stage),
                ),
                composer(mode),
            );
        },
    });
})();
