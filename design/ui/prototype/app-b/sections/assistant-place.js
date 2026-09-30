/* Assistant place: the rail's last place. A list of conversations, the open conversation and a
   composer. With no AI provider set, a pointer to Preferences > AI provider... instead.
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
.as-card { border: 1px solid var(--cm-border); border-radius: 6px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.as-open { display: inline-block; align-self: flex-start; padding: 2px 6px; border-radius: 5px; font-size: 11px; line-height: 16px; background: var(--cm-bg-secondary); color: var(--cm-text-secondary); box-shadow: inset 0 0 0 1px var(--cm-border-strong); }
.as-composer { flex: none; border-top: 1px solid var(--cm-border); padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.as-composer textarea { font: inherit; font-size: 12px; resize: none; min-height: 56px; padding: 6px 8px; border-radius: 5px; border: 0; background: var(--cm-bg-secondary); color: var(--cm-text); }
.as-composer textarea:disabled { opacity: 0.6; }
.as-composer-foot { display: flex; align-items: center; gap: 6px; }
`;
    if (!document.getElementById("as-css")) document.head.append(h("style", { id: "as-css" }, CSS));

    const openQ = (text) => h("span", { class: "as-open", title: text }, "Open question: " + text);

    const CONVERSATIONS = [
        "Who holds the story's groups together?",
        "Explain the Louvain groups",
        "Why is Myriel's group so far from the rest?",
    ];

    function composer(enabled) {
        return h("div", { class: "as-composer" },
            h("textarea", {
                "aria-label": "Ask the Assistant",
                placeholder: enabled ? "Ask about this graph" : "Set an AI provider to ask a question",
                disabled: enabled ? null : "",
            }),
            h("div", { class: "as-composer-foot" },
                h("span", { class: "k-caption" }, enabled ? "Les Miserables, 77 nodes, 254 edges" : "No AI provider"),
                h("span", { class: "k-grow" }),
                AB.button("Send", { icon: "arrow-right", disabled: !enabled, onClick: () => AB.flash("Send (not wired in the skeleton)") }),
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

    function conversation() {
        const top = AB.fx.datasets.lesmis.topByBetweenness.slice(0, 3);
        const valjean = top[0];
        return h("div", { class: "as-conv" },
            h("div", { class: "as-q" }, CONVERSATIONS[0]),
            h("div", { class: "as-a" },
                h("div", null, "By betweenness, these characters lie on the most shortest paths between the others:"),
                h("ol", null, top.map((n) => h("li", null, nodeLink(n)))),
                h("div", null, valjean.label + " also has the most connections, " + valjean.degree + "."),
                h("div", { class: "as-card" },
                    h("span", { class: "k-strong" }, "Show this on the graph"),
                    h("span", { class: "k-caption" }, "Run Betweenness and size nodes by it. It paints only the nodes it scores."),
                    h("div", { class: "as-composer-foot" },
                        AB.button("Run", { icon: "play", onClick: () => AB.flash("Run Betweenness (not wired in the skeleton)") }),
                        AB.link("graph-place", "at-rest", "Open the tree", { class: "k-link" }),
                    ),
                    openQ("does a run the Assistant starts land in the tree as an ordinary run row?"),
                ),
            ),
        );
    }

    function noProvider() {
        return h("div", { class: "as-empty" },
            icon("bot", "lg"),
            h("span", { class: "k-strong" }, "What can I ask?"),
            h("span", null, "Ask about the graph in plain words: who connects the groups, why a node looks the way it does, what a run found. The Assistant needs an AI provider first."),
            AB.button("AI provider...", { icon: "settings", go: ["preferences", "general"] }),
            h("span", { class: "k-caption" }, "Set in Preferences."),
            openQ("which providers are offered, and whether a local model counts"),
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
        ],
        render(el, state) {
            const on = state === "conversation";
            el.append(
                AB.placeHead("Assistant", AB.iconButton("plus", "New conversation", {
                    onClick: on ? () => AB.flash("New conversation (not wired in the skeleton)") : () => AB.go("preferences", "general"),
                })),
                h("div", { class: "as-body" },
                    list(on ? 0 : null),
                    on ? conversation() : noProvider(),
                ),
                composer(on),
            );
        },
    });
})();
