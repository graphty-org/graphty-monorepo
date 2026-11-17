import { type QuickAction, QuickActions } from "@graphty/compact-mantine";
import type React from "react";

import type { CommandContext, PaletteRow } from "../commands/registry";
import { formatKey } from "../keys/keys";
import { errorWords } from "../project/words";
import { useWorkspace } from "../state/WorkspaceContext";

/** The order Quick actions lists the command homes in (tier1-design.md 2.3). */
const GROUP_ORDER = [
    "Go to",
    "Graph tree",
    "Analyze",
    "Data",
    "Notes",
    "View",
    "Layout",
    "Selection",
    "Project",
    "Settings and help",
] as const;

/**
 * Where a heading is listed: a command home in its place, and a package's own heading (Analyze's
 * "Find groups") just after Analyze, in the order the package gave it.
 * @param group - the heading.
 * @returns its rank, lower first.
 */
function groupRank(group: string): number {
    const index = (GROUP_ORDER as readonly string[]).indexOf(group);
    return index < 0 ? GROUP_ORDER.indexOf("Analyze") + 0.5 : index;
}

/**
 * Whether a row matches what was typed: the typed text is part of its label or a keyword, or the
 * typed words hold one of its keywords whole, so a question ("who is most connected") finds the row
 * whose keyword it names.
 * @param action - the row.
 * @param query - what was typed.
 * @returns true when it matches.
 */
function matchesQuery(action: QuickAction, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (q === "") {
        return true;
    }
    const words = [action.label, ...(action.keywords ?? [])].map((word) => word.toLowerCase());
    if (words.some((word) => word.includes(q))) {
        return true;
    }
    const typed = ` ${q.replaceAll(/\W+/g, " ")} `;
    return (action.keywords ?? []).some((keyword) => {
        const whole = keyword.toLowerCase().replaceAll(/\W+/g, " ").trim();
        return whole.length > 2 && typed.includes(` ${whole} `);
    });
}

/**
 * Runs a package's row, unless it cannot run now, reporting a failure in the notice.
 * @param row - the row.
 * @param ctx - what it reads.
 */
function runRow(row: PaletteRow, ctx: CommandContext): void {
    if ((row.disabled?.(ctx) ?? null) !== null) {
        return;
    }
    const outcome = row.run(ctx);
    if (outcome instanceof Promise) {
        outcome.catch((error: unknown) => {
            ctx.workspace.set({ notice: { message: errorWords(`${row.label} failed`, error) } });
        });
    }
}

/**
 * Quick actions (tier1-design.md 2.3): every built command by its one label, grouped by its home,
 * with its key; a disabled command is listed with its reason but cannot be run. Running one closes
 * the palette first, so a command that opens another popover opens it in the freed slot. After the
 * Analyze commands come the packages' own rows for what is loaded (one per algorithm), each under
 * its own heading.
 * @param props - Component props
 * @param props.onClose - Closes the palette
 * @returns The palette
 */
export function QuickActionsPalette({ onClose }: Readonly<{ onClose: () => void }>): React.JSX.Element {
    const workspace = useWorkspace();
    const rows = workspace.registry.paletteRows(workspace);
    const actions = [...workspace.registry.live, ...rows]
        .filter((command) => command.id !== "quick-actions.open" && command.shown?.(workspace) !== false)
        .sort((a, b) => groupRank(a.group) - groupRank(b.group))
        .map((command) => {
            const reason = command.disabled?.(workspace) ?? null;
            const key = command.keys?.[0];
            return {
                value: command.id,
                label: command.label,
                section: command.group,
                shortcut: key === undefined ? undefined : formatKey(key),
                keywords: command.keywords,
                disabled: reason !== null,
                description: reason ?? undefined,
            };
        });
    return (
        <QuickActions
            actions={actions}
            placeholder="Search commands"
            filter={matchesQuery}
            onClose={onClose}
            onRun={(id) => {
                onClose();
                const row = rows.find((each) => each.id === id);
                if (row === undefined) {
                    workspace.run(id);
                } else {
                    runRow(row, workspace);
                }
            }}
        />
    );
}
