/* Preferences dialog (main menu > Preferences..., Ctrl+,). Plain ASCII.
   The reader's own settings, kept in this browser, never in the project.
   States: general (usage data off) and usage-on (the header's privacy line and the Sent and
   saved summary both change). Styles: preferences.css, loaded below (section-local).
   Studio decisions, not the owner's: rows grouped under six headings, Privacy second so the usage-data choice is in view on open so the dialog scans in one
   pass; Theme and Reduced motion offer "System" so the app follows the computer by default. */
(function () {
    if (!document.querySelector("link[data-pf-css]")) {
        document.head.append(h("link", { rel: "stylesheet", href: "sections/preferences.css", "data-pf-css": "" }));
    }

    const oq = (text) => h("span", { class: "pf-oq", title: text }, "Open question: " + text);

    // A one-of-several segmented control that switches in place.
    function seg(label, names, active, onPick) {
        const g = h("span", { class: "k-seg", role: "radiogroup", "aria-label": label });
        names.forEach((n) => {
            const s = h("span", { role: "radio", tabindex: "0", "aria-checked": String(n === active) }, n);
            const pick = () => {
                g.querySelectorAll("[role=radio]").forEach((x) => x.setAttribute("aria-checked", String(x === s)));
                if (onPick) onPick(n);
            };
            s.addEventListener("click", (e) => { e.stopPropagation(); pick(); });
            s.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
            g.append(s);
        });
        return g;
    }

    // One preference: name and help on the left, the control on the right.
    function pref(name, help, control, extra) {
        return h("div", { class: "pf-row" },
            h("div", { class: "pf-label" }, h("div", { class: "pf-name" }, name), help ? h("div", { class: "pf-help k-secondary" }, help) : null),
            h("div", { class: "pf-control" }, control),
            extra ? h("div", { class: "pf-extra" }, extra) : null);
    }

    const COLLECTED = [
        "A replay of each session, with every node name, attribute value, label and file content masked.",
        "Anonymous task events with their timings: file loaded, first graph drawn, measure run, result read, style added, export, undo.",
        "Errors and performance.",
        "A feedback widget.",
    ];

    registerSection({
        id: "preferences",
        title: "Preferences",
        region: "overlay",
        states: [
            { id: "general", label: "Usage data off" },
            { id: "usage-on", label: "Usage data on" },
        ],
        render(el, state) {
            const on = state === "usage-on";

            // The header's privacy line follows the choice (the top bar is drawn before the overlay).
            const privacy = document.querySelector("#ab-top .ab-privacy");
            if (privacy && on) privacy.replaceChildren(icon("share", "sm"), "Usage data on, content masked");

            const usageSwitch = h("span", Object.assign({ class: "k-switch", role: "switch", "aria-checked": String(on), "aria-label": "Share usage data" },
                AB.act({ go: ["preferences", on ? "general" : "usage-on"] })));

            const usageBody = h("div", { class: "pf-usage" },
                h("p", { class: "pf-owner-h" }, "Your data is yours, but please help us."),
                h("p", null, "We will never see the data you analyze, but we would like to collect information about how you use the app so that we can improve the user experience. This data will only ever be used by the author of the application and his Claude Code sessions."),
                h("details", { class: "pf-details" },
                    h("summary", null, icon("chevron-right", "sm"), "What is collected"),
                    h("ul", null, COLLECTED.map((t) => h("li", null, t))),
                    h("p", { class: "pf-strong" }, "No file contents ever leave your computer.")),
                h("div", { class: "pf-status" },
                    icon(on ? "share" : "lock", "sm"),
                    h("span", null, on
                        ? ["On, with content masked. The header reads \"Usage data on, content masked\", and ", AB.link("data-place", "sent-and-saved", "Data > Sent and saved"), " lists each send."]
                        : ["Off. Nothing is sent, and the header reads \"Local only\". ", AB.link("data-place", "sent-and-saved", "Data > Sent and saved"), " shows this too."])),
                h("div", { class: "pf-status k-secondary" }, "You were first asked on the ", AB.link("start-screen", "first-run", "start screen")));

            const body = h("div", { class: "pf-body" },
                AB.section("You",
                    pref("Author", "The name shown on your notes and recipes. There is no account; the name is kept in this browser.",
                        AB.field("Sarah Okafor", { icon: "user", onClick: () => AB.flash("Edit author name (not wired in the skeleton)") }))),

                AB.section("Privacy",
                    pref("Usage data", null, usageSwitch, usageBody)),

                AB.section("Appearance",
                    pref("Theme", null, seg("Theme", ["Light", "Dark", "System"], "System", (n) => {
                        if (n === "System") document.documentElement.removeAttribute("data-theme");
                        else document.documentElement.setAttribute("data-theme", n.toLowerCase());
                    })),
                    pref("Reduced motion", "Camera moves and layout changes jump instead of animating.",
                        seg("Reduced motion", ["On", "Off", "System"], "System", () => AB.flash("Reduced motion (not wired in the skeleton)"))),
                    pref("Number format", "How numbers are grouped and where the decimal point goes.",
                        AB.field("1,234.56", { caret: true, onClick: () => AB.flash("Number format choices (not wired in the skeleton)") }),
                        oq("which formats are offered, and whether it follows the system language"))),

                AB.section("Projects",
                    pref("Default overview", "What a project opens with when it names no overview of its own.",
                        h("span", { class: "pf-pair" },
                            AB.field("General overview", { caret: true, onClick: () => AB.flash("Choose default overview (not wired in the skeleton)") }),
                            AB.button("Reset to default", { kind: "ghost", onClick: () => AB.flash("Reset to General overview (not wired in the skeleton)") })))),

                AB.section("Performance",
                    pref("GPU use", "Whether graphty runs layouts and algorithms on the graphics card. A run never switches engines halfway.",
                        seg("GPU use", ["When available", "Never"], "When available", () => AB.flash("GPU use (not wired in the skeleton)")),
                        h("span", null, h("span", { class: "k-secondary" }, "Engine now: WebGPU. "), oq("the exact choices the graph element's policy exposes")))),

                AB.section("Assistant and keys",
                    pref("AI provider", "The service the Assistant sends questions to. None is set.",
                        AB.button("AI provider...", { kind: "secondary", go: ["assistant-place", "no-provider"] })),
                    pref("Keyboard shortcuts", "Every shortcut, grouped by where it works.",
                        AB.button("Keyboard shortcuts", { kind: "secondary", go: ["commands-and-search", "shortcuts"] }), h("span", { class: "k-secondary" }, "Or press ", h("span", { class: "k-kbd" }, "?")))),

                h("p", { class: "pf-foot k-secondary" }, "Each choice applies at once and is kept in this browser. It never changes what a colleague sees in the same project."));

            const wrap = AB.modal({ title: "Preferences", body, foot: AB.button("Done", { onClick: () => AB.close() }) });
            wrap.querySelector(".k-modal").classList.add("pf-modal");
            el.append(wrap);
        },
    });
})();
