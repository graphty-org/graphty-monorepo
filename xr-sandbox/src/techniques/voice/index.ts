// Voice with an editable chip sentence (design section 9.8). Hold X on the off-hand controller, or
// hold the mic chip, and speak: "color these by PageRank" shows as chips, gray while the engine may
// still change them and solid once final. Poking a chip offers its three best alternatives and then
// its slot's whole vocabulary; a word that fits nowhere is a red "?" chip; Run executes. The same
// sentence can be built by poking alone, verb first, so voice is never the only path. Every engine
// start and end is logged with its reason, and the session's visibility while listening, so the
// first Galaxy XR try can tell whether starting recognition blurs the immersive session.

import type { Hand } from "../../core/arbiter";
import type { Technique, TechniqueContext } from "../../framework/technique";
import { type ChipRow, type ChipStyle, createChipRow, MAX_ALTS, type RowView } from "./chips";
import {
    type EndReason,
    type EngineEvents,
    type EngineKind,
    type KeyboardEngine,
    pickEngine,
    type SpeechEngine,
    systemKeyboard,
    webSpeech,
} from "./engine";
import {
    choices,
    choose,
    complete,
    intent,
    labelOf,
    type Lexicon,
    parse,
    type SentenceChip,
    sentenceText,
    tokenize,
} from "./grammar";

let ctx: TechniqueContext;
let row: ChipRow;
let lex: Lexicon;
let sentence: SentenceChip[] = [];
/** Words before this index are final; later ones are interim (gray). */
let finalWords = 0;
let open = -1;
let offered: string[] = [];
let topCount = 0;
let engine: SpeechEngine | null = null;
let startedAt = 0;
let hovered = -1;
let status = "";
let lastLogged = "";
let watched: XRSession | null = null;

/**
 * Log the session's visibility and end while listening: whether listening blurs or ends the
 * session is the first thing to learn on Galaxy XR.
 * @param session - the immersive session
 */
const watch = (session: XRSession): void => {
    if (watched === session) {
        return;
    }
    watched = session;
    session.addEventListener("visibilitychange", () => {
        if (engine?.active) {
            ctx.log("visibility", { state: session.visibilityState, engine: engine.kind });
        }
    });
    session.addEventListener("end", () => {
        if (engine?.active) {
            ctx.log("session-ended-while-listening", { engine: engine.kind });
        }
    });
};

const reset = (): void => {
    sentence = parse("", lex);
    finalWords = 0;
    open = -1;
    offered = [];
};

const chipStyle = (c: SentenceChip): ChipStyle => {
    if (c.state !== "ok") {
        return "unparsed";
    }
    return c.to > c.from && c.from >= finalWords ? "interim" : "solid";
};

const render = (): void => {
    const listening = !!engine?.active;
    const chips = sentence.map((c) => ({ text: c.text, style: chipStyle(c) }));
    if (sentence[0]?.state === "ok") {
        chips.push({ text: "Run", style: complete(sentence) && !listening ? "run" : "run-off" });
    }
    const alts: RowView["alts"] =
        open >= 0
            ? offered.map((id, i) => ({
                  text: labelOf(sentence[open].kind, id, lex),
                  style: i < topCount ? "top" : "more",
              }))
            : [];
    row.render({ listening, status, chips, alts });
    const shown = JSON.stringify(chips);
    if (shown !== lastLogged) {
        lastLogged = shown;
        ctx.log("chips", { chips, sentence: sentenceText(sentence) });
    }
};

const events: EngineEvents = {
    text(final, interim, done) {
        sentence = parse(`${final} ${interim}`, lex);
        finalWords = done ? Infinity : tokenize(final).length;
        open = -1;
        ctx.log("heard", { final, interim, done });
        render();
    },
    end(reason, detail) {
        startLogged = false;
        ctx.log("engine.end", {
            engine: engine?.kind,
            reason,
            detail,
            ms: Math.round(performance.now() - startedAt),
            visibility: ctx.xr()?.baseExperience.sessionManager.session?.visibilityState ?? null,
        });
        status = reason === "error" ? `Speech error: ${detail ?? "unknown"}` : status;
        render();
    },
};

/** One engine per kind, made on first use. */
const engines = new Map<EngineKind, SpeechEngine>();
/** Whether this listen's start is logged (the keyboard can open before the mic's press arrives). */
let startLogged = false;

/**
 * The engine of a kind, made on first use.
 * @param kind - the engine kind
 * @returns the engine, or null without XR for the system keyboard
 */
const engineOf = (kind: EngineKind): SpeechEngine | null => {
    const xr = ctx.xr();
    if (!engines.has(kind) && (kind === "web-speech" || xr)) {
        const opened = (): void => {
            engine = engines.get("system-keyboard") ?? null;
            if (!startLogged) {
                logStart("system-keyboard", "mic-chip");
            }
            ctx.log("engine.keyboard-open", { engine: kind });
            status = "Keyboard open: dictate, then close it";
            render();
        };
        engines.set(kind, kind === "web-speech" || !xr ? webSpeech(events) : systemKeyboard(xr, events, opened));
    }
    return engines.get(kind) ?? null;
};

/**
 * Log a listen's start, and note what "these" points at now.
 * @param kind - the engine
 * @param by - what started it
 */
const logStart = (kind: EngineKind, by: string): void => {
    const sm = ctx.xr()?.baseExperience.sessionManager;
    const session = sm?.inXRSession ? sm.session : null;
    if (session) {
        watch(session);
    }
    startLogged = true;
    hovered = ctx.hover(ctx.dominant()).node;
    startedAt = performance.now();
    ctx.log("engine.start", { engine: kind, by, visibility: session?.visibilityState ?? null });
};

/**
 * Start listening.
 * @param by - what started it (x-button, mic-chip)
 */
const talk = (by: string): void => {
    if (engine?.active) {
        return;
    }
    const kind = pickEngine(ctx.settings.str("engine"), ctx.xr());
    if (typeof kind !== "string") {
        status = `No speech: ${kind.why}. Poke the chips.`;
        ctx.log("engine.unavailable", { by, why: kind.why });
        render();
        return;
    }
    engine = engineOf(kind);
    status = kind === "web-speech" ? "Listening (Web Speech)" : "Release, or pull the trigger, to open the keyboard";
    logStart(kind, by);
    engine?.start();
    render();
};

/**
 * Stop listening, if the engine stops on release.
 * @param reason - why
 */
const release = (reason: EndReason): void => {
    if (engine?.active && (engine.pushToTalk || reason !== "user")) {
        engine.stop(reason);
    }
};

/**
 * The hand whose ray is on the UI, for the command's log entry.
 * @returns the hand, if one is on the UI
 */
const uiHand = (): Hand | undefined => (["right", "left"] as const).find((h) => ctx.hover(h).context === "ui");

const runSentence = (): void => {
    const what = intent(sentence, lex, { selection: [...ctx.state.selection], hovered });
    const hand = uiHand();
    ctx.log("run", { sentence: sentenceText(sentence), intent: what });
    if ("error" in what) {
        status = `Cannot run: ${what.error}`;
    } else if (what.code === "undo") {
        ctx.commands.undo(hand);
        status = "";
        reset();
    } else {
        ctx.commands.run(what.code, what.params, hand);
        status = "";
        reset();
    }
    render();
};

const rowEvents = {
    micDown: () => {
        talk("mic-chip");
    },
    micUp: () => {
        release("user");
    },
    clear: () => {
        ctx.log("clear", { sentence: sentenceText(sentence) });
        reset();
        status = "";
        render();
    },
    chip: (i: number) => {
        if (i === sentence.length) {
            runSentence();
            return;
        }
        if (open === i) {
            open = -1;
        } else {
            const { top, all } = choices(sentence, i, lex);
            open = i;
            offered = [...top, ...all].slice(0, MAX_ALTS);
            topCount = top.length;
            ctx.log("alternatives", {
                chip: sentence[i].text,
                top: top.map((v) => labelOf(sentence[i].kind, v, lex)),
                all: all.map((v) => labelOf(sentence[i].kind, v, lex)),
            });
        }
        render();
    },
    alt: (j: number) => {
        if (open < 0 || !offered[j]) {
            return;
        }
        const was = sentence[open].text;
        sentence = choose(sentence, open, offered[j], lex);
        finalWords = Infinity;
        ctx.log("choose", { chip: was, value: offered[j] });
        open = -1;
        render();
    },
};

export const technique: Technique = {
    id: "voice",
    name: "Voice chips",
    color: "#f07178",
    needs: ["microphone"],
    arm: "microphone",
    settings: [
        {
            key: "engine",
            label: "Speech engine",
            kind: "choice",
            choices: ["auto", "web-speech", "system-keyboard", "off"],
            default: "auto",
        },
    ],
    claims: [
        { channel: "button", detail: "x", hand: "off", contexts: "any", priority: 80, note: "push to talk while held" },
    ],
    smoke: { input: "button:x", hand: "off" },
    prepare(c) {
        ctx = c;
        lex = {
            nodes: c.graph.data.names,
            results: Object.entries(c.graph.data.resultNames).map(([id, label]) => ({ id, label })),
        };
        reset();
        row = createChipRow(c, rowEvents);
        c.settings.onChange(() => {
            status = "";
            render();
        });
        // Prime the system keyboard while a ray is on the mic chip, so the select of that press
        // opens it whether the runtime fires select at the start of the press or at its end.
        let onMic = false;
        c.onFrame(() => {
            const xr = c.xr();
            if (!xr?.baseExperience.sessionManager.inXRSession) {
                return;
            }
            const mic = (s: XRInputSource): boolean => {
                const x = xr.input.controllers.find((k) => k.inputSource === s);
                return !!x && xr.pointerSelection.getMeshUnderPointer(x.uniqueId) === row.mic;
            };
            const now = xr.input.controllers.some((x) => mic(x.inputSource));
            if (now && !onMic && pickEngine(c.settings.str("engine"), xr) === "system-keyboard") {
                (engineOf("system-keyboard") as KeyboardEngine | null)?.prime(mic);
            }
            onMic = now;
        });
    },
    activate() {
        status = "";
        render();
        row.show();
    },
    deactivate() {
        release("cancelled");
        row.hide();
    },
    onPress(_p, hand) {
        if (engine?.active) {
            // A second press while still listening (the first was lost to a blur) ends it.
            engine.stop("user");
            return undefined;
        }
        talk("x-button");
        return {
            end: () => {
                release("user");
            },
            cancel: (reason) => {
                // A blur right after the press cancels it; keep listening so the try shows whether
                // recognition survives the blur. The recognizer ends itself after silence.
                ctx.log("press-cancelled", { reason, hand, keepListening: reason === "session blurred" });
                if (reason !== "session blurred") {
                    release("cancelled");
                }
            },
        };
    },
};
