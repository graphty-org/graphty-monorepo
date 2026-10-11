// Boot: read the URL, start logging, install the emulator when asked, load the graph and its
// results, build the scene and the framework, prepare every technique, then wait for Enter VR.

import { Color4, Engine, HemisphericLight, Scene, UniversalCamera, Vector3 } from "@babylonjs/core";

import { createCommands } from "./core/commands";
import { createState } from "./core/state";
import { STEP_LISTS } from "./core/steps";
import { mixUrl, parseParams, resolvePreset } from "./core/url";
import { createFlag } from "./framework/flag";
import { createGearPanel } from "./framework/gear-panel";
import { createLogPanel } from "./framework/log-panel";
import { startLogging } from "./framework/logging";
import { createFramework } from "./framework/runtime";
import { createSettings, FRAMEWORK_SETTINGS } from "./framework/settings";
import { createStepsPanel } from "./framework/steps-panel";
import type { SettingSpec } from "./framework/technique";
import { PRESETS } from "./presets";
import { createFrameStats } from "./scene/frame-stats";
import { loadGraph } from "./scene/graph-data";
import { createGraphView } from "./scene/graph-view";
import { probe } from "./scene/probe";
import { createXR, enterSession, type XRSettings } from "./scene/xr";
import { createZones, placeGraph } from "./scene/zones";
import { TECHNIQUES } from "./techniques";

declare const __BUILD_TIME__: string;

const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

async function boot(): Promise<void> {
    const params = parseParams(location.search);
    const log = startLogging();
    $("session").textContent = log.sessionId;
    const resolved = resolvePreset(
        PRESETS,
        params,
        TECHNIQUES.map((t) => t.id),
    );
    const quest = /OculusBrowser|Quest/.test(navigator.userAgent);

    // The emulator goes in before the XR experience asks the runtime what it supports.
    let device: import("iwer").XRDevice | null = null;
    if (params.emulate) {
        const { installEmulation } = await import("./framework/emulate");
        device = installEmulation(params.emulate);
    }

    const specs = new Map<string, SettingSpec>();
    for (const s of FRAMEWORK_SETTINGS) {
        specs.set(`framework.${s.key}`, s);
    }
    for (const t of TECHNIQUES) {
        for (const s of t.settings) {
            specs.set(`${t.id}.${s.key}`, s);
        }
    }
    const settings = createSettings(specs, resolved.preset.id, resolved.settings, params.settings);
    let runIndex = 1;
    try {
        runIndex = Number(localStorage.getItem(`xr-sandbox.runs.${resolved.preset.id}`) ?? 0) + 1;
        localStorage.setItem(`xr-sandbox.runs.${resolved.preset.id}`, String(runIndex));
    } catch {
        // storage blocked: every run is run 1
    }
    log.context = {
        preset: resolved.preset.id,
        enabled: resolved.techniques,
        settingsHash: settings.hash(),
        build: __BUILD_TIME__,
        device: params.emulate ? `emulated ${params.emulate}` : navigator.userAgent.slice(0, 120),
        mode: params.mode,
        graph: resolved.graph,
        runIndex,
    };
    landing(params, resolved.preset.id);

    const data = loadGraph(resolved.graph, params.n, params.seed);
    log.log("load", { graph: data.kind, nodes: data.nodeCount, edges: data.src.length, ms: Math.round(data.loadMs) });

    const canvas = $("scene") as HTMLCanvasElement;
    const engine = new Engine(canvas, true, { stencil: true, xrCompatible: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.06, 0.07, 0.1, 1);
    const camera = new UniversalCamera("desktop-camera", new Vector3(0, 1.6, 0), scene);
    camera.setTarget(new Vector3(0, 1.48, 0.75));
    camera.minZ = 0.05;
    camera.attachControl(canvas, true);
    new HemisphericLight("light", new Vector3(0.3, 1, -0.4), scene).intensity = 1.1;

    const state = createState(data.results);
    const commands = createCommands(state, {
        nodeName: (i) => data.names[i],
        resultName: (id) => data.resultNames[id] ?? id,
        noun: data.noun,
        nodeCount: data.nodeCount,
        neighbors: (id, hops) => data.neighbors(id, hops),
        onRecord: (r) => {
            log.log("command", { ...r });
        },
        onChange: () => {
            graph.markDirty();
            gear.refreshUndo();
        },
    });
    const graph = createGraphView(scene, data, state, () => commands.preview, scene.clearColor);
    placeGraph(graph.root, camera.position, new Vector3(0, 0, 1), true);
    graph.setLabelsVisible(settings.get("framework.labels") === true);

    const stats = createFrameStats(scene, (s) => {
        log.log("frames", { ...s });
    });
    const fw = createFramework(scene, graph, commands, settings, log, stats, TECHNIQUES);
    const zones = createZones(scene);
    const gear = createGearPanel(scene, zones, fw);
    const steps = createStepsPanel(
        scene,
        zones,
        log,
        {
            names: data.names,
            pagerankOrder: data.order.pagerank,
            pagerank: data.results.pagerank,
            resultNames: Object.values(data.resultNames),
        },
        params.still,
    );
    const logPanel = createLogPanel(scene, zones, log);
    let xr: Awaited<ReturnType<typeof createXR>> = null;

    const head = (): { pos: Vector3; fwd: Vector3 } => {
        const cam = xr?.baseExperience.sessionManager.inXRSession ? xr.baseExperience.camera : camera;
        return { pos: cam.globalPosition.clone(), fwd: cam.getDirection(Vector3.Forward()) };
    };
    const save = (): void => {
        commands.run("save", {}, { technique: "framework" });
        const json = JSON.stringify({
            preset: resolved.preset.id,
            time: new Date().toISOString(),
            selection: [...state.selection].map((i) => data.names[i]),
            hidden: [...state.hidden].map((i) => data.names[i]),
            shown: [...state.shown],
            colorBy: state.colorBy,
            sizeBy: state.sizeBy,
            filter: state.filter,
            notes: state.notes,
            history: commands.history.map((h) => h.label),
        });
        log.log("save", JSON.parse(json) as Record<string, unknown>);
        try {
            localStorage.setItem("xr-sandbox.save", json);
        } catch {
            // the log has it
        }
    };
    fw.actions = {
        toggleGear: () => {
            gear.toggle();
        },
        toggleSteps: () => {
            steps.toggle();
        },
        recenter() {
            const h = head();
            placeGraph(graph.root, h.pos, h.fwd, false);
            zones.place(h.pos, h.fwd);
            log.log("recenter", {});
        },
        resetView() {
            const h = head();
            placeGraph(graph.root, h.pos, h.fwd, true);
            log.log("resetView", {});
        },
        flag: createFlag(fw, (id) => {
            steps.notice(id);
        }),
        saveAsPreset() {
            const url = mixUrl(
                resolved.preset,
                fw.techniques.filter((t) => fw.isOn(t.id)).map((t) => t.id),
                settings.changed(),
            );
            try {
                const saved = JSON.parse(localStorage.getItem("xr-sandbox.presets") ?? "[]") as {
                    name: string;
                    url: string;
                }[];
                saved.push({ name: `Saved ${saved.length + 1} (${resolved.preset.name})`, url });
                localStorage.setItem("xr-sandbox.presets", JSON.stringify(saved));
            } catch {
                // the log has it
            }
            log.log("preset.saved", { url });
            steps.notice("Saved");
        },
        save,
    };
    settings.onChange("framework", (key) => {
        const sm = xr?.baseExperience.sessionManager;
        if (key === "labels") {
            graph.setLabelsVisible(settings.get("framework.labels") === true);
        } else if (key === "logPanel") {
            logPanel.setOn(settings.get("framework.logPanel") === true);
        } else if (key === "foveation" && sm?.isFixedFoveationSupported) {
            sm.fixedFoveation = Number(settings.get("framework.foveation"));
        } else if (key === "frameRate" && sm?.inXRSession) {
            const rate = frameRate();
            if (rate) {
                void sm.updateTargetFrameRate(rate).catch((e: unknown) => {
                    log.log("frameRate refused", { rate, error: String(e) }, "WARN");
                });
            }
        }
    });
    logPanel.setOn(settings.get("framework.logPanel") === true);

    const frameRate = (): number => {
        const v = String(settings.get("framework.frameRate"));
        if (v === "auto") {
            return quest ? 72 : 0;
        }
        return Number(v);
    };
    const xrSettings = (): XRSettings => ({
        referenceSpace: settings.get("framework.referenceSpace") === "local" ? "local" : "local-floor",
        frameRate: frameRate(),
        foveation: Number(settings.get("framework.foveation")),
        multiview: settings.get("framework.multiview") === true,
        framebufferScale: Number(settings.get("framework.framebufferScale")) || 1,
    });

    await fw.start(resolved.techniques);
    scene.onBeforeRenderObservable.add(() => {
        graph.update();
    });
    engine.runRenderLoop(() => {
        scene.render();
    });
    addEventListener("resize", () => {
        engine.resize();
    });

    xr = await createXR(scene, xrSettings());
    const enter = $("enter-vr") as HTMLButtonElement;
    const status = $("status");
    if (!xr) {
        enter.textContent = "No WebXR here";
        status.textContent =
            "This browser has no immersive WebXR. Open this page in Quest Browser or Chrome on Galaxy XR.";
        log.log("probe", await probe(null, "load"));
        return;
    }
    const x = xr;
    fw.attachXR(x);
    const sm = x.baseExperience.sessionManager;
    let space = "";
    let placeOnNextFrame = false;
    sm.onXRFrameObservable.add(() => {
        const now = performance.now();
        stats.xrFrame(now);
        if (placeOnNextFrame) {
            placeOnNextFrame = false;
            fw.actions.resetView();
            fw.actions.recenter();
            void probe(x, "session").then((p) => {
                log.log("probe", { ...p, referenceSpace: space });
            });
        }
        fw.frame(now);
    });
    sm.onXRSessionInit.add(() => {
        placeOnNextFrame = true;
        log.context.inputMode = "pending";
        log.log("session.start", { mode: params.mode });
        if (params.steps) {
            steps.open(params.steps);
        }
    });
    sm.onXRReferenceSpaceChanged.add(() => {
        log.log("input", { event: "reference space changed" });
        placeOnNextFrame = true;
    });
    sm.onXRSessionEnded.add(() => {
        log.log("session.end", { cause: "ended" });
        enter.disabled = false;
        enter.textContent = "Enter VR";
        scene.clearColor.a = 1;
    });

    const mode = $("mode") as HTMLSelectElement;
    mode.value = params.mode === "immersive-ar" ? "ar" : "vr";
    const supported = await navigator.xr?.isSessionSupported("immersive-vr");
    enter.disabled = !supported;
    enter.textContent = supported ? "Enter VR" : "Immersive VR not supported";
    enter.addEventListener("click", () => {
        const m: XRSessionMode = mode.value === "ar" ? "immersive-ar" : "immersive-vr";
        log.context.mode = m;
        scene.clearColor.a = m === "immersive-ar" ? 0 : 1;
        enter.disabled = true;
        enter.textContent = "In session";
        enterSession(x, m, xrSettings())
            .then((s) => {
                space = s;
            })
            .catch((e: unknown) => {
                log.log("session.error", { error: String(e) }, "ERROR");
                enter.disabled = false;
                enter.textContent = "Enter VR";
            });
    });
    ($("arm-mic") as HTMLInputElement).addEventListener("change", (ev) => {
        const box = ev.target as HTMLInputElement;
        if (!box.checked) {
            fw.armed.microphone = false;
            return;
        }
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                stream.getTracks().forEach((t) => {
                    t.stop();
                });
                fw.armed.microphone = true;
                log.log("arm", { microphone: true });
                // The preset's techniques that waited for the microphone switch on now.
                for (const id of resolved.techniques) {
                    fw.setOn(id, true);
                }
            })
            .catch((e: unknown) => {
                box.checked = false;
                log.log("arm", { microphone: false, error: String(e) }, "WARN");
            });
    });

    log.log("preset", { techniques: resolved.techniques, settings: settings.changed() });
    log.log("probe", await probe(x, "load"));
    if (device) {
        const { installTestHooks } = await import("./framework/test-hooks");
        installTestHooks({
            device,
            scene,
            xr: x,
            fw,
            graph,
            stats,
            gear,
            preset: resolved.preset.id,
            presets: PRESETS.map((p) => p.id),
        });
    }
}

/**
 * Fill the landing page's lists: presets, one link per technique alone, step lists, saved mixes.
 * @param params - the page parameters (emulate and still carry over into every link)
 * @param current - the preset this page runs
 */
function landing(params: ReturnType<typeof parseParams>, current: string): void {
    const carry = (q: URLSearchParams): string => {
        if (params.emulate) {
            q.set("emulate", params.emulate);
        }
        return `?${q.toString()}`;
    };
    const li = (list: string, href: string, text: string, note?: string, cls?: string): void => {
        const item = document.createElement("li");
        const a = document.createElement("a");
        a.href = href;
        a.textContent = text;
        if (cls) {
            a.className = cls;
        }
        item.append(a);
        if (note) {
            const small = document.createElement("small");
            small.textContent = note;
            item.append(small);
        }
        $(list).append(item);
    };
    for (const p of PRESETS) {
        li(
            "presets",
            carry(new URLSearchParams({ preset: p.id })),
            p.name,
            p.question,
            p.id === current ? "current" : undefined,
        );
    }
    try {
        for (const s of JSON.parse(localStorage.getItem("xr-sandbox.presets") ?? "[]") as {
            name: string;
            url: string;
        }[]) {
            li("presets", s.url, s.name, "saved in the headset");
        }
        const last = localStorage.getItem("xr-sandbox.save");
        if (last) {
            const a = $("download") as HTMLAnchorElement;
            a.href = URL.createObjectURL(new Blob([last], { type: "application/json" }));
            a.hidden = false;
        }
    } catch {
        // storage blocked
    }
    for (const t of TECHNIQUES) {
        li("solo", carry(new URLSearchParams({ preset: "empty", on: t.id })), t.name, t.unavailable);
    }
    for (const s of STEP_LISTS) {
        li("steps", carry(new URLSearchParams({ preset: current, steps: s })), s);
    }
}

try {
    await boot();
} catch (e: unknown) {
    console.error("boot failed", e);
    const status = document.getElementById("status");
    if (status) {
        status.textContent = `Boot failed: ${String(e)}`;
    }
}
