/**
 * Enhanced helpers that integrate loader-based event waiting
 * This approach prevents race conditions while maintaining backwards compatibility
 */

import type { Meta } from "@storybook/web-components-vite";
import isChromatic from "chromatic/isChromatic";
import lodash from "lodash";
// Using direct property access instead of destructuring to avoid unbound-method warnings
const deepSet = lodash.set.bind(lodash);

import { LABEL_STYLE_FIELDS } from "../src/catalog/label-style";
import type { Channel, Encoding, LabelStyle, LayerSpec, StaticStyle } from "../src/catalog/types";
import { type GraphBackgroundConfig, NodeShapes, type ViewMode } from "../src/config";
import type { AlgorithmOnLoad } from "../src/config/DataConfig";
import type { Graphty } from "../src/graphty-element";

// Global storage for event promises set up by decorators
const eventWaitingState = new WeakMap<
    HTMLElement,
    {
        promises: Map<string, Promise<void>>;
        resolvers: Map<string, () => void>;
    }
>();

/**
 * Start listening to a graphty-element before a play function can.
 *
 * `data-loaded` fires while the story is still being mounted, so a listener attached inside
 * `play()` can miss it entirely and then wait for an event that has already gone by. Attaching
 * here, from a decorator, turns that event into a promise that is just as true after the fact.
 *
 * ONLY the events something waits for are pre-attached. `graph-settled` was pre-attached too and
 * nothing has read it since the capture wait started asking the element whether the PICTURE is
 * final, and a promise nobody awaits is a device that looks like it is guaranteeing something.
 */
function setupEventListenersForElement(element: HTMLElement): void {
    // Skip if already set up
    if (eventWaitingState.has(element)) {
        return;
    }

    // Create promise infrastructure for this element
    const promises = new Map<string, Promise<void>>();
    const resolvers = new Map<string, () => void>();

    // Note: skybox-loaded is optional and only fires if a skybox is configured, so it is waited
    // for directly by the few stories that configure one.
    const events = ["data-loaded"];
    events.forEach((eventName) => {
        let resolver: (() => void) | undefined;
        const promise = new Promise<void>((resolve) => {
            resolver = resolve;
        });
        promises.set(eventName, promise);
        resolvers.set(eventName, resolver as () => void);

        // Attach listener immediately
        element.addEventListener(
            eventName,
            () => {
                if (resolver) {
                    resolver();
                }
            },
            { once: true },
        );
    });

    // Store state for this element
    eventWaitingState.set(element, { promises, resolvers });
}

/**
 * Enhanced decorator that sets up event listeners before elements are rendered
 * This decorator should be added to the meta configuration
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const eventWaitingDecorator = (story: any): any => {
    // Set up mutation observer to catch graphty-element creation
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeName === "GRAPHTY-ELEMENT") {
                    // Direct match - element was added directly to DOM
                    setupEventListenersForElement(node as HTMLElement);
                } else if (node instanceof Element) {
                    // Check descendants - handles stories that wrap graphty-element in a container
                    // This is critical for stories like Selection that return a container div
                    const graphtyElements = node.querySelectorAll("graphty-element");
                    graphtyElements.forEach((el) => {
                        setupEventListenersForElement(el as HTMLElement);
                    });
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Run the story
    const result = story();

    // Clean up observer after a short delay
    setTimeout(() => {
        observer.disconnect();
    }, 100);

    return result;
};

/**
 * How long a story's data source may take to answer.
 *
 * Only a story that names a data source waits at all, and one that does is waiting on a file,
 * which is why this is measured in seconds rather than in frames.
 */
const DATA_LOAD_TIMEOUT_MS = 15000;

/**
 * Reject when a promise has not settled in time, with a sentence a reader can act on.
 * @param promise - What is being waited for.
 * @param timeoutMs - How long to wait.
 * @param whatWasWaitedFor - Named in the error, so the failure says what did not happen.
 * @returns The promise's own resolution, or a rejection describing the timeout.
 */
async function within(promise: Promise<void>, timeoutMs: number, whatWasWaitedFor: string): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
        await Promise.race([
            promise,
            new Promise<never>((_resolve, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(`${whatWasWaitedFor} within ${String(timeoutMs)} ms.`));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}

/**
 * Wait for a story's DATA SOURCE to finish loading, when it has one.
 *
 * `data-loaded` is emitted by a data source completing a load and by nothing else, so a story
 * that hands the element its nodes and edges directly never sees it. Waiting for it anyway is
 * what put a silent five second wait in front of every such story -- a wait that ended in the
 * story being captured regardless of whether anything had loaded. A story that DOES name a source
 * and never gets an answer now fails and says which source it was, because the alternative is
 * photographing an empty canvas and calling it a snapshot.
 * @param canvasElement - The story's root element.
 */
async function waitForDataLoaded(canvasElement: HTMLElement): Promise<void> {
    const graphtyElement = canvasElement.querySelector<Graphty>("graphty-element");
    if (!graphtyElement) {
        return;
    }

    const source = graphtyElement.dataSource;

    if (source === undefined) {
        return;
    }

    const state = eventWaitingState.get(graphtyElement);
    const loaded =
        state?.promises.get("data-loaded") ??
        new Promise<void>((resolve) => {
            graphtyElement.addEventListener("data-loaded", () => {
                resolve();
            });
        });

    await within(loaded, DATA_LOAD_TIMEOUT_MS, `the ${source} data source did not finish loading`);
}

/**
 * How long a story may take to reach a picture that will not change again.
 *
 * Generous against the 2.5 seconds every story here has been measured to need, and well inside
 * the 30 second timeout the Storybook test project allows, so the element's own message -- which
 * names what was still moving -- is what a reader sees rather than a bare harness timeout.
 */
const STABLE_FRAME_TIMEOUT_MS = 15000;

/**
 * Wait until the story's graph is drawing a picture that will not change again.
 *
 * WHAT IT WAITS FOR IS THE FRAME, not the `graph-settled` event. That event fires the instant the
 * layout engine converges, one update pass before the element has even asked for the final
 * framing, so a snapshot taken on it is a snapshot of a camera still in motion -- measured at
 * 27,914 projected pixels from the final picture on a force layout. `waitForStableFrame` is the
 * element's own answer to "is this the finished picture", and every consumer has it, not just
 * these stories.
 *
 * IT THROWS RATHER THAN GIVING UP. What stood here before raced the settle event against a five
 * second timer and resolved either way, so a story that had not finished moving was photographed
 * anyway and said nothing about it -- a determinism device that failed silently, which is the
 * same defect as a waiver that hides a bug. A story that cannot reach a final frame now fails,
 * with the element's account of what was still moving.
 * @param canvasElement - The story's root element.
 */
export async function waitForGraphSettled(canvasElement: HTMLElement): Promise<void> {
    const graphtyElement = canvasElement.querySelector<Graphty>("graphty-element");
    if (!graphtyElement) {
        return;
    }

    // First, wait for data to load (important for URL-based data sources): a graph that has not
    // been given anything to draw yet is trivially finished, and waiting for its frame would
    // answer about the wrong picture.
    await waitForDataLoaded(canvasElement);

    await graphtyElement.waitForStableFrame({ timeoutMs: STABLE_FRAME_TIMEOUT_MS });
}

// Helper to wait for skybox to load - only call this if your story actually uses a skybox
export async function waitForSkyboxLoaded(canvasElement: HTMLElement): Promise<void> {
    const graphtyElement = canvasElement.querySelector("graphty-element");
    if (!graphtyElement) {
        // No element to wait for
        return;
    }

    // Since skybox-loaded is not in the default decorator events, we always use direct listener
    await new Promise<void>((resolve) => {
        let resolved = false;

        // Short timeout - if skybox hasn't loaded quickly, it's probably not configured
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                // This is only called by stories that explicitly configure a skybox,
                // so a timeout here might indicate a real issue
                console.warn("[Warning] skybox-loaded event timeout (2s) - skybox may have failed to load");
                resolve();
            }
        }, 2000);

        const handleSkyboxLoaded = (): void => {
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve();
            }
        };

        graphtyElement.addEventListener("skybox-loaded", handleSkyboxLoaded, { once: true });

        // Check if the skybox might have already loaded
        // Give it a tiny delay to see if the event fires immediately
        setTimeout(() => {
            if (!resolved) {
                // Still waiting - skybox is probably loading
            }
        }, 10);
    });
}

/**
 * What a story asks the element to draw, beyond the data it loads.
 *
 * ONE STACK, ONE DOCUMENT. `node`, `edge`, `nodeEncode`, `edgeEncode` and `layers` become layers
 * on `session.styles`, which is the only style stack there is; the rest are the element's own
 * configuration properties. What used to sit here instead was a 1.x style template, which
 * carried both halves in one object and replaced the whole of it every time a story applied one.
 */
interface StorySetup {
    /** Channels every node is painted with, such as `{"node.color": "red"}`. */
    node?: StaticStyle;
    /** Node channels bound to a value in the data, such as a label read from a column. */
    nodeEncode?: Encoding;
    /** Channels every edge is painted with. */
    edge?: StaticStyle;
    /** Edge channels bound to a value in the data. */
    edgeEncode?: Encoding;
    /** Layers beyond the two above, in paint order: the last one listed paints over the rest. */
    layers?: readonly LayerSpec[];
    /** 2D or 3D. */
    viewMode?: ViewMode;
    /** What the graph is drawn against: a colour, or a photo-dome skybox. */
    background?: GraphBackgroundConfig;
    /** How far the camera starts from the graph. */
    startingCameraDistance?: number;
    /** Algorithms to run once the data has loaded: names, or `{ algorithm, style, ... }` entries. */
    algorithms?: readonly AlgorithmOnLoad[];
    /** How many layout steps to run before the first frame is drawn. */
    preSteps?: number;
    /** Hide labels whose words would overlap: the element's `labels.declutter` behaviour. */
    declutterLabels?: boolean;
}

/**
 * What a story's args are: the element's own properties, plus the setup above.
 *
 * `StoryObj<StoryArgs>` alone types `args` as a partial element, which `setup` is not part of --
 * it is this package's own way of describing a story, not something a consumer sets on a tag.
 */
export type StoryArgs = Graphty & { setup: StorySetup };

/**
 * Fill in the defaults every story shares.
 *
 * The only one is the layout pre-step count, which is what makes a Chromatic snapshot the same
 * picture twice: a physics layout that has not been stepped is a graph in mid-flight, and how far
 * it has flown depends on when the screenshot was taken.
 * @param opts - What this story wants.
 * @returns The setup to hand the element.
 */
export function storySetup(opts: StorySetup = {}): StorySetup {
    return { preSteps: isChromatic() ? 2000 : 0, ...opts };
}

/**
 * The label fields a `node.labelStyle` or `edge.labelStyle` control writes.
 *
 * A control named `node.labelStyle.font` writes the `font` field of that channel's value.
 *
 * READ OFF THE VOCABULARY, NEVER RESTATED. This was a hand-written list of seven, and it stayed
 * seven while the renderer went on drawing pointers, badges, shadows, margins, gradients and
 * depth fade that no control could reach. Deriving it means a field added to `LabelStyle` is
 * offered by every story control that names it, on the next reload, with nothing edited here.
 */
const LABEL_FIELDS = new Set<keyof LabelStyle>(LABEL_STYLE_FIELDS);

/**
 * Write one control's value into the setup it belongs to.
 *
 * A control is named after the channel it writes -- `node.color`, `edge.width` -- or after one
 * field of a label style, as `node.labelStyle.font`. Anything else is a control for a property of
 * the element rather than for a style channel, and is left to the caller.
 * @param setup - The setup being built.
 * @param name - The control's name.
 * @param value - What the reader set it to.
 * @returns True when the control was a style channel and has been written.
 */
function writeChannelControl(setup: StorySetup, name: string, value: unknown): boolean {
    let target: "node" | "edge" | null = null;
    if (name.startsWith("node.")) {
        target = "node";
    } else if (name.startsWith("edge.")) {
        target = "edge";
    }

    if (target === null) {
        return false;
    }

    const style: StaticStyle = { ...(target === "node" ? setup.node : setup.edge) };
    const labelStyleChannel = `${target}.labelStyle`;

    if (name.startsWith(`${labelStyleChannel}.`)) {
        const field = name.slice(labelStyleChannel.length + 1) as keyof LabelStyle;

        if (!LABEL_FIELDS.has(field)) {
            return false;
        }

        style[labelStyleChannel as Channel] = {
            ...(style[labelStyleChannel as Channel] as LabelStyle | undefined),
            [field]: value,
        };
    } else {
        style[name as Channel] = value as StaticStyle[Channel];
    }

    if (target === "node") {
        setup.node = style;
    } else {
        setup.edge = style;
    }

    return true;
}

/**
 * How many layout steps to run before the first frame is drawn.
 *
 * Stories with a render function of their own call this, because they build the element
 * themselves and so do not pass through {@link applyConfiguration}.
 * @param element - The element to configure.
 * @param preSteps - How many steps to run before the first frame.
 */
export function setLayoutPreSteps(element: Graphty, preSteps: number): void {
    element.layoutBehavior = { layout: { preSteps } };
}

/**
 * Turn a story's setup into layers on the element's own style stack.
 *
 * Added before the data is, which is deliberate: a layer is a standing instruction rather than a
 * pass over what happens to be loaded, so the rows a later load adds are painted by it too.
 * @param element - The element to style.
 * @param setup - What the story asked for.
 */
function applyStyleLayers(element: Graphty, setup: StorySetup): void {
    const layers: LayerSpec[] = [];

    if (setup.node !== undefined || setup.nodeEncode !== undefined) {
        layers.push({
            name: "Story - nodes",
            target: "node",
            selector: { match: "everything" },
            ...(setup.node === undefined ? {} : { set: setup.node }),
            ...(setup.nodeEncode === undefined ? {} : { encode: setup.nodeEncode }),
        });
    }

    if (setup.edge !== undefined || setup.edgeEncode !== undefined) {
        layers.push({
            name: "Story - edges",
            target: "edge",
            selector: { match: "everything" },
            ...(setup.edge === undefined ? {} : { set: setup.edge }),
            ...(setup.edgeEncode === undefined ? {} : { encode: setup.edgeEncode }),
        });
    }

    layers.push(...(setup.layers ?? []));

    for (const layer of layers) {
        // Fired and forgotten: a style edit is a queued run that reports its own refusal, and a
        // render function cannot await one.
        void element.session.styles.add(layer);
    }
}

/**
 * Apply the configuration half of a story's setup to the element.
 *
 * TWO OF THESE REACH THROUGH `graph`, AND SHOULD NOT HAVE TO. The layout pre-step count and the
 * list of algorithms to run on load were reachable only through the style template, and when that
 * was removed nothing replaced them: every other setting it carried has a property on
 * `<graphty-element>` -- `viewMode`, `background`, `startingCameraDistance`, `layout` -- and these
 * two have none. Until the element grows them, a story writes the configuration document.
 * @param element - The element to configure.
 * @param setup - What the story asked for.
 */
function applyConfiguration(element: Graphty, setup: StorySetup): void {
    if (setup.viewMode !== undefined) {
        element.viewMode = setup.viewMode;
    }

    if (setup.background !== undefined) {
        element.background = setup.background;
    }

    if (setup.startingCameraDistance !== undefined) {
        element.startingCameraDistance = setup.startingCameraDistance;
    }

    if (setup.preSteps !== undefined) {
        element.layoutBehavior = { layout: { preSteps: setup.preSteps } };
    }

    if (setup.algorithms !== undefined) {
        element.algorithmsOnLoad = setup.algorithms;
    }

    if (setup.declutterLabels !== undefined) {
        element.layoutBehavior = { labels: { declutter: setup.declutterLabels } };
    }
}

export const nodeData = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];

export const edgeData = [
    { src: 0, dst: 1 },
    { src: 0, dst: 2 },
    { src: 2, dst: 3 },
    { src: 3, dst: 0 },
    { src: 3, dst: 4 },
    { src: 3, dst: 5 },
];

/**
 * Element properties a story sets directly, which this render function must hand over itself.
 *
 * Storybook's DEFAULT web-components renderer assigns every arg as a property, so a story that
 * routes through a render function loses any arg the function does not forward. These are the
 * element's own data-shape properties: which field of a record carries a node's id, and which two
 * carry an edge's ends. A story reading a document that names them anything other than `id`,
 * `src` and `dst` cannot load without them.
 */
const FORWARDED_ELEMENT_PROPERTIES = ["nodeIdPath", "edgeSrcIdPath", "edgeDstIdPath"] as const;

type RenderArg1 = Parameters<NonNullable<Meta["render"]>>[0];
type RenderArg2 = Parameters<NonNullable<Meta["render"]>>[1];

export const renderFn = (args: RenderArg1, storyConfig: RenderArg2): Element => {
    const g = document.createElement("graphty-element") as Graphty;

    // Set runAlgorithmsOnLoad BEFORE setting data, because data loading triggers
    // the algorithm-run operation which checks this property
    if (args.runAlgorithmsOnLoad !== undefined) {
        g.runAlgorithmsOnLoad = args.runAlgorithmsOnLoad;
    }

    // The story's own setup, with whatever the reader has moved a control to written over it. A
    // control is named after the thing it sets: a style channel, a layout option, or a property
    // of the element.
    const setup: StorySetup = { ...((args.setup as StorySetup | undefined) ?? {}) };
    const layoutConfig: Record<string, unknown> = { ...(args.layoutConfig as Record<string, unknown> | undefined) };

    for (const arg of Object.getOwnPropertyNames(args)) {
        const name = storyConfig.argTypes[arg]?.name;

        if (!name) {
            continue;
        }

        const value = args[arg];

        if (writeChannelControl(setup, name, value)) {
            continue;
        }

        // The two background controls build the element's own background value: one names a
        // colour and the other the image a photo dome is built from.
        if (name === "background.color" && typeof value === "string" && value !== "") {
            setup.background = { backgroundType: "color", color: value };
            continue;
        }

        if (name === "background.skybox" && typeof value === "string" && value !== "") {
            setup.background = { backgroundType: "skybox", data: value };
            continue;
        }

        if (name.startsWith("layoutConfig.")) {
            if (value !== undefined) {
                layoutConfig[name.slice("layoutConfig.".length)] = value;
            }

            continue;
        }

        if (
            ![
                "dataSource",
                "dataSourceConfig",
                "layout",
                "layoutConfig",
                "setup",
                "nodeData",
                "edgeData",
                "runAlgorithmsOnLoad",
                "onGraphSettled",
                "onSkyboxLoaded",
                "xr",
            ].includes(arg)
        ) {
            deepSet(setup, name, value);
        }
    }

    applyConfiguration(g, setup);
    applyStyleLayers(g, setup);

    // BEFORE the data, because these say how a record is read and the reading happens as the rows
    // arrive. See FORWARDED_ELEMENT_PROPERTIES.
    for (const property of FORWARDED_ELEMENT_PROPERTIES) {
        const value = args[property];

        if (typeof value === "string") {
            g[property] = value;
        }
    }

    // Now add data - this will trigger data-add, which runs the algorithms the setup named
    if (args.dataSource) {
        // Set dataSourceConfig BEFORE dataSource, because setting dataSource
        // triggers addDataFromSource which needs the config
        g.dataSourceConfig = args.dataSourceConfig;
        g.dataSource = args.dataSource;
    } else {
        // Use story-specific data if provided, otherwise use defaults
        g.nodeData = args.nodeData ?? nodeData;
        g.edgeData = args.edgeData ?? edgeData;
    }

    // Set layout properties if provided
    // IMPORTANT: Set layoutConfig BEFORE layout so that when layout triggers
    // setLayout(), it already has access to the seed value for deterministic layouts
    if (Object.keys(layoutConfig).length > 0) {
        g.layoutConfig = layoutConfig;
    }

    if (args.layout) {
        g.layout = args.layout;
    }

    // Set XR config if provided
    if (args.xr) {
        g.xr = args.xr;
    }

    return g;
};

/**
 * Decorator that enables remote logging for XR debugging.
 * Logs are sent to the server specified in VITE_REMOTE_LOG_URL env var (default: https://localhost:9077/log)
 * Start the server with: npm run dev:xr
 *
 * Usage:
 * ```
 * export default {
 *     decorators: [eventWaitingDecorator, remoteLoggingDecorator],
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const remoteLoggingDecorator = (story: any): any => {
    // Only enable in browser environment
    if (typeof window !== "undefined") {
        enableRemoteLoggingInBrowser();
    }

    return story();
};

/**
 * Enable remote logging in the browser.
 * Intercepts console.log/warn/error/info and sends to remote server.
 */
function enableRemoteLoggingInBrowser(): void {
    // Don't enable twice
    if ((window as unknown as { __remoteLoggingEnabled?: boolean }).__remoteLoggingEnabled) {
        return;
    }

    (window as unknown as { __remoteLoggingEnabled?: boolean }).__remoteLoggingEnabled = true;

    // Use VITE_REMOTE_LOG_URL env var or fall back to localhost
    const SERVER_URL = (import.meta.env.VITE_REMOTE_LOG_URL as string | undefined) ?? "https://localhost:9077/log";
    const SESSION_ID = `storybook-${Date.now().toString(36)}`;
    const LOG_BUFFER: { time: string; level: string; message: string }[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    // Throttling for repeated messages
    const lastMessages = new Map<string, number>();
    const THROTTLE_MS = 5000;
    const THROTTLE_PATTERNS = [/Max number of touches/, /Max touches exceeded/];

    function shouldThrottle(message: string): boolean {
        for (const pattern of THROTTLE_PATTERNS) {
            if (pattern.test(message)) {
                const key = pattern.source;
                const lastTime = lastMessages.get(key) ?? 0;
                const now = Date.now();
                if (now - lastTime < THROTTLE_MS) {
                    return true;
                }

                lastMessages.set(key, now);
                return false;
            }
        }
        return false;
    }

    function flushLogs(): void {
        if (LOG_BUFFER.length === 0) {
            return;
        }

        const logsToSend = LOG_BUFFER.splice(0, LOG_BUFFER.length);
        fetch(SERVER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: SESSION_ID, logs: logsToSend }),
        }).catch(() => {
            // Put logs back on failure
            LOG_BUFFER.unshift(...logsToSend);
        });
    }

    function formatArgs(args: unknown[]): string {
        return args
            .map((arg) => {
                if (typeof arg === "object" && arg !== null) {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch {
                        return "[Circular or non-serializable object]";
                    }
                }

                return String(arg);
            })
            .join(" ");
    }

    function queueLog(level: string, args: unknown[]): void {
        const message = formatArgs(args);
        if (shouldThrottle(message)) {
            return;
        }

        LOG_BUFFER.push({
            time: new Date().toISOString(),
            level,
            message,
        });
        if (flushTimer) {
            clearTimeout(flushTimer);
        }

        flushTimer = setTimeout(flushLogs, 100);
    }

    // Store original console methods and override them with remote logging wrappers
    // This is intentional - the remote logging system intercepts console.* calls
    /* eslint-disable no-console */
    const originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        info: console.info.bind(console),
    };

    // Override console methods
    console.log = (...args: unknown[]) => {
        originalConsole.log(...args);
        queueLog("LOG", args);
    };
    console.warn = (...args: unknown[]) => {
        originalConsole.warn(...args);
        queueLog("WARN", args);
    };
    console.error = (...args: unknown[]) => {
        originalConsole.error(...args);
        queueLog("ERROR", args);
    };
    console.info = (...args: unknown[]) => {
        originalConsole.info(...args);
        queueLog("INFO", args);
    };

    originalConsole.log(`[RemoteLogging] Enabled with session: ${SESSION_ID}`);
    /* eslint-enable no-console */
}

/**
 * Every node shape the element can draw, in the order the schema declares them.
 *
 * READ OFF `NodeShapes`, NEVER RETYPED. The hand-written copy of this list held twenty-four
 * names while the schema held twenty-five, so `torus` -- added to the schema with a paragraph
 * explaining why -- was drawn by no story and seen by nobody. A list derived from the enum
 * cannot fall behind it.
 */
export const nodeShapes = NodeShapes.options;

/** Every arrow cap a layer can ask for, which is what `edge.arrowHead` and `edge.arrowTail` take. */
export const arrowTypes = [
    "normal",
    "inverted",
    "dot",
    "sphere-dot",
    "open-dot",
    "none",
    "tee",
    "open-normal",
    "diamond",
    "open-diamond",
    "crow",
    "box",
    "half-open",
    "vee",
] as const;
