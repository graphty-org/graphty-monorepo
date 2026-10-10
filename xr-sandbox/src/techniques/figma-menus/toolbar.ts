// The floating toolbar (design section 9.4): a strip below the graph whose items run a command or
// hand the owner a tool, and never switch a mode. "Show <result>" runs the result and colors by it;
// Sieve and Probe hand over a tool through the framework's tools seam, or are grayed with the
// reason; Note asks the text seam for a line (a keyboard, or canned chips when text entry is off).

import { type Button, Control, StackPanel, type TextBlock } from "@babylonjs/gui";

import type { TechniqueContext } from "../../framework/technique";
import { guiButton, guiText, type Panel } from "../../scene/ui";

/** The toolbar. */
export interface Toolbar {
    panel: Panel;
    /** Gray or ungray the tool items; returns a key that changes when they change. */
    refresh(): string;
    /** Why a tool item cannot be used now, or null. */
    reason(tool: string): string | null;
}

const SHOWS = { pagerank: "PageRank", degree: "Degree", betweenness: "Betweenness", community: "Community" } as const;
const TOOLS = ["sieve", "probe"] as const;
const H = 64;

/**
 * Build the toolbar, hidden.
 * @param ctx - the technique context
 * @returns the toolbar
 */
export function createToolbar(ctx: TechniqueContext): Toolbar {
    const panel = ctx.ui.panel("toolbar", 0.44, 0.085, 768);
    const { data } = ctx.graph;
    const status: TextBlock = guiText("Toolbar: show a result, take a tool, leave a note", 48, "#9fb3d9");
    status.name = "figma-tb-status";
    const say = (text: string): void => {
        status.text = text;
    };
    const label = (tool: string): string => (tool === "sieve" ? "Sieve" : "Probe");
    const reason = (tool: string): string | null => {
        const why = ctx.tools.reason(tool);
        return why ? `${label(tool)}: ${why}` : null;
    };

    const row = new StackPanel("figma-tb-row");
    row.isVertical = false;
    row.height = `${H + 8}px`;
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    const add = (b: Button): Button => {
        b.paddingLeft = "3px";
        b.paddingRight = "3px";
        b.fontSize = 20;
        row.addControl(b);
        return b;
    };

    for (const [id, text] of Object.entries(SHOWS)) {
        add(
            guiButton(
                `figma-tb-${id}`,
                text,
                () => {
                    ctx.log("click", { item: `show ${id}` });
                    if (!ctx.state.shown.has(id)) {
                        ctx.commands.run("run", { result: id });
                    }
                    ctx.commands.run("colorBy", { result: id });
                    say(`Showing ${data.resultNames[id]}: see Layers`);
                },
                H,
                128,
            ),
        );
    }
    const toolButtons = TOOLS.map((tool) =>
        add(
            guiButton(
                `figma-tb-${tool}`,
                label(tool),
                () => {
                    const why = ctx.tools.take(tool, ctx.dominant());
                    ctx.log("click", { item: tool, reason: why });
                    say(why ? `${label(tool)}: ${why}` : `${label(tool)} in your ${ctx.dominant()} hand`);
                },
                H,
                80,
            ),
        ),
    );
    add(
        guiButton(
            "figma-tb-note",
            "Note",
            () => {
                const [first = -1] = ctx.state.selection;
                const target: number | "graph" = first >= 0 ? first : "graph";
                const where = target === "graph" ? "the graph" : data.names[target];
                ctx.log("click", { item: "note" });
                void ctx.text.request({ label: `Note on ${where}`, hand: ctx.dominant() }).then((text) => {
                    if (text) {
                        ctx.commands.run("note", { target, text });
                        say(`Noted "${text}" on ${where}`);
                    }
                });
            },
            H,
            80,
        ),
    );
    panel.stack.addControl(row);
    panel.stack.addControl(status);

    let key = "";
    return {
        panel,
        reason,
        refresh() {
            const k = TOOLS.map((t) => (reason(t) ? "0" : "1")).join("");
            if (k !== key) {
                key = k;
                toolButtons.forEach((b, i) => {
                    const off = k[i] === "0";
                    b.background = off ? "#272c38" : "#34405a";
                    b.color = off ? "#7d8597" : "#e8ecf4";
                });
            }
            return key;
        },
    };
}
