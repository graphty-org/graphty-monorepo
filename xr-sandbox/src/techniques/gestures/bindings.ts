// The binding table (design section 9.1): which pose or microgesture runs which command. Built from
// the gear panel's settings plus extra definitions from the URL (`s.gestures.extra`), each checked
// at load: a definition that needs a palm-toward-face or palm-forward pinch is refused (design
// section 5.7, those are the operating systems' own gestures), and so is any other definition the
// recognizer could never fire. Pure apart from `runCommand`, which only goes through the context.

import type { Hand } from "../../core/arbiter";
import type { TechniqueContext } from "../../framework/technique";

/** What a binding can do. */
export const COMMANDS = ["none", "next color", "previous color", "undo", "redo", "clear selection"] as const;
/** One of COMMANDS. */
export type Command = (typeof COMMANDS)[number];

/** Quest thumb microgestures, as Babylon's oculus-hand profile names them (gamepad buttons 5 to 9). */
export const MICRO = ["swipe-left", "swipe-right", "swipe-forward", "swipe-backward", "tap-thumb"] as const;

/** Paired swipe settings and what each choice binds. */
export const SWIPES_LR: Record<string, [Command, Command]> = {
    "previous / next color": ["previous color", "next color"],
    "undo / redo": ["undo", "redo"],
    none: ["none", "none"],
};
export const SWIPES_FB: Record<string, [Command, Command]> = {
    "redo / undo": ["redo", "undo"],
    "next / previous color": ["next color", "previous color"],
    none: ["none", "none"],
};

/** A palm direction a pose binding may require. */
type Palm = "up" | "face";

/** One binding. */
export interface Binding {
    gesture: string;
    kind: "pose" | "micro";
    /** Fires only with the palm this way (from the framework's pose layer). */
    palm?: Palm;
    command: Command;
    /** Where it came from: the gear panel or the URL's extra definitions. */
    from: "settings" | "extra";
}

/** A definition refused at load, and why. */
export interface Refusal {
    definition: string;
    reason: string;
}

const PALM_PINCH: Record<string, string> = {
    face: "palm toward the face then a pinch is Quest's system gesture (on the left hand it leaves the session)",
    forward: "palm forward then a pinch reaches Galaxy XR's navigation icons (Back, Home, Recents)",
};

/**
 * Why one parsed extra definition is refused.
 * @param gesture - the gesture name
 * @param palm - the palm direction, if any
 * @param pinch - "+pinch" when the definition asks for a pinch
 * @param command - the command name
 * @param micro - whether the gesture is a microgesture
 * @param poses - the pose names a template exists for
 * @returns the reason, or null when the definition is accepted
 */
function refusal(
    gesture: string,
    palm: string | undefined,
    pinch: string | undefined,
    command: string,
    micro: boolean,
    poses: readonly string[],
): string | null {
    if (!(COMMANDS as readonly string[]).includes(command)) {
        return `unknown command "${command}"; one of ${COMMANDS.join(", ")}`;
    }
    if (gesture === "fist") {
        return "the fist is the squeeze channel (grab), never a pose binding";
    }
    if (!micro && !poses.includes(gesture)) {
        return `unknown gesture "${gesture}"; one of ${[...poses, ...MICRO].join(", ")}`;
    }
    if (micro && (palm || pinch)) {
        return "a microgesture takes no palm or pinch";
    }
    if (pinch && palm && PALM_PINCH[palm]) {
        return `needs a palm-${palm} pinch: ${PALM_PINCH[palm]}`;
    }
    if (pinch) {
        return "poses are suppressed while the hand pinches (the pinch is the select channel)";
    }
    if (palm && palm !== "up" && palm !== "face") {
        return `palm ${palm} is not detected; the pose layer has palm up and palm toward the face`;
    }
    return null;
}

/**
 * Parse and check extra definitions: `<gesture>[@palm-<up|face|forward|down>][+pinch]:<command>`,
 * separated by `;` (for example `shaka@palm-up:redo`).
 * @param text - the definitions
 * @param poses - the pose names a template exists for
 * @returns the accepted bindings and the refused definitions with their reasons
 */
export function parseExtra(text: string, poses: readonly string[]): { bindings: Binding[]; refused: Refusal[] } {
    const bindings: Binding[] = [];
    const refused: Refusal[] = [];
    for (const definition of text
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)) {
        const m = /^([a-z-]+)(?:@palm-([a-z]+))?(\+pinch)?:(.+)$/.exec(definition);
        const refuse = (reason: string): void => {
            refused.push({ definition, reason });
        };
        if (!m) {
            refuse("not <gesture>[@palm-<up|face|forward|down>][+pinch]:<command>");
            continue;
        }
        const [, gesture, palm, pinch, command] = m;
        const micro = (MICRO as readonly string[]).includes(gesture);
        const why = refusal(gesture, palm, pinch, command, micro, poses);
        if (why) {
            refuse(why);
        } else {
            bindings.push({
                gesture,
                kind: micro ? "micro" : "pose",
                palm: palm as Palm | undefined,
                command: command as Command,
                from: "extra",
            });
        }
    }
    return { bindings, refused };
}

/**
 * The bindings the gear panel's settings make.
 * @param get - reads one of this technique's settings as a string
 * @param poses - the bindable pose names (each is a setting key)
 * @returns the bindings, "none" included
 */
export function fromSettings(get: (key: string) => string, poses: readonly string[]): Binding[] {
    const cmd = (v: string): Command => ((COMMANDS as readonly string[]).includes(v) ? (v as Command) : "none");
    const out: Binding[] = poses.map((gesture) => ({
        gesture,
        kind: "pose",
        command: cmd(get(gesture)),
        from: "settings",
    }));
    const [left, right] = SWIPES_LR[get("swipesLR")] ?? SWIPES_LR.none;
    const [forward, backward] = SWIPES_FB[get("swipesFB")] ?? SWIPES_FB.none;
    const micro: [string, Command][] = [
        ["swipe-left", left],
        ["swipe-right", right],
        ["swipe-forward", forward],
        ["swipe-backward", backward],
        ["tap-thumb", cmd(get("tap-thumb"))],
    ];
    for (const [gesture, command] of micro) {
        out.push({ gesture, kind: "micro", command, from: "settings" });
    }
    return out;
}

/**
 * The binding a gesture fires now: one that needs the palm the hand has wins over a plain one, and
 * extra definitions over the gear panel's.
 * @param list - every binding
 * @param gesture - the pose or microgesture
 * @param palm - the hand's palm now
 * @param palm.up - palm up
 * @param palm.face - palm toward the face
 * @returns the binding, or null when it does nothing
 */
export function bindingFor(
    list: readonly Binding[],
    gesture: string,
    palm: { up: boolean; face: boolean },
): Binding | null {
    let best: Binding | null = null;
    let score = -1;
    for (const b of list) {
        if (b.gesture !== gesture || b.command === "none" || (b.palm && !palm[b.palm])) {
            continue;
        }
        const s = (b.palm ? 2 : 0) + (b.from === "extra" ? 1 : 0);
        if (s > score) {
            best = b;
            score = s;
        }
    }
    return best;
}

/**
 * Run a binding's command through the command layer, so undo names the step and the log has it.
 * @param ctx - the technique context
 * @param command - the command
 * @param hand - the hand that made the gesture
 * @returns a short label for the hand's chip
 */
export function runCommand(ctx: TechniqueContext, command: Command, hand: Hand): string {
    const results = Object.keys(ctx.graph.data.resultNames);
    const step = (by: number): string => {
        // From no coloring, next is the first result and previous the last.
        const i = results.indexOf(ctx.state.colorBy ?? "");
        let from = i;
        if (i < 0) {
            from = by > 0 ? -1 : 0;
        }
        const next = results[(from + by + results.length) % results.length];
        return ctx.commands.run("colorBy", { result: next }, hand).label;
    };
    switch (command) {
        case "next color":
            return step(1);
        case "previous color":
            return step(-1);
        case "undo": {
            const label = ctx.commands.undoLabel();
            ctx.commands.undo(hand);
            return label ?? "Nothing to undo";
        }
        case "redo":
            ctx.commands.redo(hand);
            return "Redo";
        case "clear selection":
            return ctx.commands.run("select", { ids: [] }, hand).label;
        default:
            return "";
    }
}
