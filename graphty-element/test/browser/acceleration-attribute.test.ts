/**
 * Browser coverage for the `acceleration` attribute on `<graphty-element>`.
 *
 * The controller's own logic is covered by Node tests. What is covered here is the custom
 * element wiring, which only exists in a browser: the attribute parsing Lit drives from
 * `attributeChangedCallback`, the reflection back to the attribute, the probe started from
 * `connectedCallback`, the `graphty-capabilities-change` DOM event, and the release on
 * `disconnectedCallback`.
 *
 * The hazard the unrecognised-value test exists for: Lit calls the property setter from
 * `attributeChangedCallback`, and a throw there during an upgrade marks the custom element
 * "failed", so `connectedCallback` never runs and the element never renders. A typo in markup
 * would take the whole graph down. `<graphty-element acceleration="yes">` must therefore render
 * a graph, keep the policy it had, and say something on the console.
 *
 * No real GPU is involved. A fake accelerator factory is registered in the same registry the
 * element reads, so these tests pass on a machine with no WebGPU.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test, vi } from "vitest";

import type { Graphty } from "../../index.js";
import {
    type AccelerationCapabilities,
    type AccelerationStatus,
    acceleratorRegistry,
    type GraphAccelerator,
} from "../../src/acceleration";

/** The event the element publishes every time the acceleration status changes. */
type CapabilitiesEvent = CustomEvent<{ capabilities: AccelerationCapabilities }>;

/** How long the element needs to connect, finish its first update and settle its probe. */
const ELEMENT_READY_MS = 300;

/** How long to wait before concluding that something which must not happen did not happen. */
const NEVER_HAPPENS_MS = 250;

/** The name the fake accelerator is registered under. */
const FAKE_NAME = "fake-test-accelerator";

/** What the fake factory did, so a test can tell "attached" from "never looked". */
const fake = { built: 0, disposed: 0 };

/** Containers mounted by a test, removed after it. */
const containers: HTMLDivElement[] = [];

/**
 * Registers a fake accelerator with the registry the element reads.
 *
 * A new accelerator per call, so that disposal counts across a disconnect and a reconnect.
 */
function registerFake(): void {
    acceleratorRegistry.register({
        name: FAKE_NAME,
        backend: "webgpu",
        factory: (): Promise<GraphAccelerator> => {
            fake.built += 1;
            return Promise.resolve({
                name: FAKE_NAME,
                backend: "webgpu",
                device: { vendor: "acme", architecture: "gen-1", description: "Acme Fake GPU" },
                dispose: (): void => {
                    fake.disposed += 1;
                },
                forceAtlas2: (): string => "gpu",
            });
        },
    });
}

/**
 * Waits for a number of milliseconds.
 * @param ms - How long to wait.
 * @returns A promise that settles after the wait.
 */
function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls until the page has settled where the test expects it.
 * @param predicate - What the test is waiting for.
 * @param what - Named in the failure message when it never becomes true.
 */
async function until(predicate: () => boolean, what: string): Promise<void> {
    for (let attempt = 0; attempt < 300; attempt += 1) {
        if (predicate()) {
            return;
        }

        await wait(10);
    }

    throw new Error(`timed out waiting for ${what}`);
}

/**
 * Records every capabilities event a target sees.
 * @param target - The element or its container.
 * @param into - Where to collect them.
 */
function watch(target: EventTarget, into: CapabilitiesEvent[]): void {
    target.addEventListener("graphty-capabilities-change", (event: Event) => {
        into.push(event as CapabilitiesEvent);
    });
}

/**
 * The acceleration status from the most recent event.
 * @param events - The collected events.
 * @returns The status the element published last.
 */
function latest(events: CapabilitiesEvent[]): AccelerationStatus {
    const event = events.at(-1);
    if (event === undefined) {
        throw new Error("no graphty-capabilities-change event was published");
    }

    return event.detail.capabilities.acceleration;
}

/**
 * A sized container in the document, cleaned up after the test.
 * @returns The container.
 */
function makeContainer(): HTMLDivElement {
    const container = document.createElement("div");

    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    containers.push(container);

    return container;
}

/** A mounted element and everything a test reads about it. */
interface Mounted {
    /** The element under test. */
    element: Graphty;
    /** The element's parent, which is where bubbled events are collected. */
    container: HTMLDivElement;
    /** Capabilities events seen on the element itself. */
    events: CapabilitiesEvent[];
    /** Capabilities events seen on the parent, which proves they bubble. */
    bubbled: CapabilitiesEvent[];
}

/**
 * Mounts an element with the given attributes, listening before it connects.
 *
 * The listener has to be attached while the element is still detached: the probe starts in
 * `connectedCallback`, and a listener added afterwards can miss the first transition.
 * @param attributes - Attributes to set before connecting.
 * @returns The mounted element and its collected events.
 */
async function mount(attributes: Record<string, string> = {}): Promise<Mounted> {
    const container = makeContainer();
    const element = document.createElement("graphty-element");

    element.style.width = "100%";
    element.style.height = "100%";
    element.style.display = "block";

    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, value);
    }

    const events: CapabilitiesEvent[] = [];
    const bubbled: CapabilitiesEvent[] = [];

    watch(element, events);
    watch(container, bubbled);
    container.appendChild(element);

    await element.updateComplete;
    await wait(ELEMENT_READY_MS);

    return { element, container, events, bubbled };
}

afterEach(async () => {
    while (containers.length > 0) {
        containers.pop()?.remove();
    }

    await wait(0);
    acceleratorRegistry.clear();
    fake.built = 0;
    fake.disposed = 0;
    vi.restoreAllMocks();
});

describe("the acceleration attribute: the policy", () => {
    test("no attribute means auto, and auto looks for an accelerator", async () => {
        registerFake();

        const { element, events } = await mount();

        assert.equal(element.acceleration, "auto");
        // The default is reflected like any other value, so the policy in force is always
        // readable from the markup -- a page that set nothing still shows acceleration="auto".
        assert.equal(element.getAttribute("acceleration"), "auto");

        await until(() => events.length >= 1, "the first capabilities event");
        assert.equal(fake.built, 1);
        assert.equal(latest(events).state, "idle");
    });

    test('acceleration="auto" in markup reaches the policy and attaches', async () => {
        registerFake();

        const { element, events } = await mount({ acceleration: "auto" });

        assert.equal(element.acceleration, "auto");
        await until(() => events.length >= 1, "the first capabilities event");
        assert.equal(fake.built, 1);
        assert.equal(latest(events).state, "idle");
    });

    test('acceleration="off" in markup reaches the policy, and the element never looks', async () => {
        registerFake();

        const { element, events } = await mount({ acceleration: "off" });

        assert.equal(element.acceleration, "off");

        await wait(NEVER_HAPPENS_MS);
        assert.equal(fake.built, 0, "a switched-off element must not build an accelerator");
        // "off" is where a switched-off element starts, so there is no transition to publish.
        assert.equal(events.length, 0);
    });

    test('acceleration="required" in markup reaches the policy and attaches', async () => {
        registerFake();

        const { element, events } = await mount({ acceleration: "required" });

        assert.equal(element.acceleration, "required");
        await until(() => events.length >= 1, "the first capabilities event");
        assert.equal(fake.built, 1);
        assert.equal(latest(events).state, "idle");
    });

    test('acceleration="required" with nothing registered says why, and keeps the element alive', async () => {
        const { element, events } = await mount({ acceleration: "required" });

        await until(() => events.length >= 1, "the unavailable capabilities event");

        const status = latest(events);

        assert.equal(status.state, "unavailable");
        assert.match(status.reason ?? "", /@graphty\/graphty-element\/webgpu/);
        // Asking for hardware that is not there does not take the element down.
        assert.equal(element.acceleration, "required");
        assert.isOk(element.graph);
    });

    test("setting the attribute after mount reaches the controller", async () => {
        registerFake();

        const { element, events } = await mount();

        await until(() => events.length >= 1, "the first capabilities event");
        assert.equal(latest(events).state, "idle");

        element.setAttribute("acceleration", "off");
        await until(() => latest(events).state === "off", 'the controller to switch to "off"');
        assert.equal(element.acceleration, "off");
        assert.equal(fake.disposed, 1, "switching off must release the accelerator");

        element.setAttribute("acceleration", "auto");
        await until(() => latest(events).state === "idle", "the controller to probe again");
        assert.equal(element.acceleration, "auto");
        assert.equal(fake.built, 2);
    });

    test("setting the property to required keeps the attached accelerator", async () => {
        registerFake();

        const { element, events } = await mount();

        await until(() => events.length >= 1, "the first capabilities event");

        element.acceleration = "required";
        await element.updateComplete;
        await wait(NEVER_HAPPENS_MS);

        assert.equal(element.acceleration, "required");
        assert.equal(fake.disposed, 0, "tightening the policy must not drop a healthy accelerator");
        assert.equal(latest(events).state, "idle");
    });
});

describe("the acceleration attribute: reflection", () => {
    test("the property reflects back to the attribute", async () => {
        registerFake();

        const { element } = await mount();

        element.acceleration = "off";
        await element.updateComplete;
        assert.equal(element.getAttribute("acceleration"), "off");

        element.acceleration = "required";
        await element.updateComplete;
        assert.equal(element.getAttribute("acceleration"), "required");

        element.acceleration = "auto";
        await element.updateComplete;
        assert.equal(element.getAttribute("acceleration"), "auto");
    });

    test("a policy set through the session reflects to the attribute and fires one event", async () => {
        registerFake();

        const { element, events } = await mount();
        await until(() => events.length >= 1 && latest(events).state === "idle", "the accelerator to attach");
        const seenBefore = events.length;

        element.session.acceleration = "required";
        await element.updateComplete;

        assert.equal(element.getAttribute("acceleration"), "required");
        assert.equal(element.acceleration, "required");
        assert.equal(events.length, seenBefore + 1, "one event for the one policy change");
        assert.equal(latest(events).policy, "required");
        assert.equal(latest(events).state, "idle", "the state did not move, and the event still fired");
    });

    test("an attribute the element was given is read back from the property", async () => {
        registerFake();

        const { element } = await mount({ acceleration: "off" });

        assert.equal(element.getAttribute("acceleration"), "off");
        assert.equal(element.acceleration, "off");
    });
});

describe("the acceleration attribute: an unrecognised value", () => {
    test("does not throw, keeps the previous policy, and reports on the console", async () => {
        registerFake();

        const { element, events } = await mount();

        await until(() => events.length >= 1, "the first capabilities event");

        const reported = vi.spyOn(console, "error").mockImplementation(() => undefined);

        element.setAttribute("acceleration", "yes");
        await element.updateComplete;
        await wait(NEVER_HAPPENS_MS);

        assert.equal(element.acceleration, "auto", "an unrecognised value leaves the previous policy in force");
        assert.equal(fake.disposed, 0, "an unrecognised value must not release the accelerator");
        assert.equal(latest(events).state, "idle");

        const said = reported.mock.calls.map((call) => String(call[0]));

        assert.isTrue(
            said.some((message) => message.includes("acceleration must be")),
            `expected a console report about the bad value, saw: ${said.join(" | ")}`,
        );
        assert.isTrue(said.some((message) => message.includes('Keeping "auto"')));
    });

    test("in markup does not stop the element from rendering", async () => {
        registerFake();

        const container = makeContainer();
        const events: CapabilitiesEvent[] = [];

        watch(container, events);
        container.innerHTML =
            '<graphty-element acceleration="yes" style="width:100%;height:100%;display:block"></graphty-element>';

        const element = container.firstElementChild as Graphty;

        await wait(ELEMENT_READY_MS);

        // A throw from the setter during an upgrade would mark the element "failed": no
        // accessor, no connectedCallback, no probe, no graph.
        assert.equal(element.acceleration, "auto");
        assert.isOk(element.graph, "the element must still have a graph");
        await until(() => fake.built === 1, "the probe that connectedCallback starts");
        await until(() => events.length >= 1, "the capabilities event from a rendered element");
        assert.equal(latest(events).state, "idle");
    });
});

describe("the acceleration attribute: the capabilities event", () => {
    test("graphty-capabilities-change carries the capabilities, and bubbles", async () => {
        registerFake();

        const { element, events, bubbled } = await mount();

        await until(() => events.length >= 1, "the first capabilities event");

        const event = events.at(-1);

        assert.isOk(event);
        assert.instanceOf(event, CustomEvent);
        assert.equal(event?.type, "graphty-capabilities-change");
        assert.isTrue(event?.bubbles);
        assert.isTrue(event?.composed);
        assert.equal(event?.target, element);

        const status = latest(events);

        assert.equal(status.state, "idle");
        assert.equal(status.backend, "webgpu");
        assert.equal(status.vendor, "acme");
        assert.equal(status.architecture, "gen-1");
        assert.equal(status.device, "Acme Fake GPU");
        assert.isUndefined(status.code);

        assert.isAtLeast(bubbled.length, 1, "the event must reach a listener on the host page");
        assert.equal(latest(bubbled).state, "idle");
    });

    test("a late registration reaches an element that had already given up", async () => {
        const { events } = await mount();

        await until(
            () => events.length >= 1 && latest(events).state === "unavailable",
            "the unavailable capabilities event",
        );

        registerFake();

        await until(() => latest(events).state === "idle", "the re-probe after a late registration");
        assert.equal(fake.built, 1);
    });
});

describe("the acceleration attribute: connection lifecycle", () => {
    test("disconnecting releases the accelerator, and reconnecting rebuilds nothing", async () => {
        registerFake();

        const { element, container, events } = await mount();

        await until(() => events.length >= 1, "the first capabilities event");
        assert.equal(fake.built, 1);
        assert.equal(fake.disposed, 0);

        const seenBeforeRemoval = events.length;

        element.remove();

        await until(() => fake.disposed === 1, "the accelerator to be released on disconnect");

        // A Graph is built once, in the element's constructor, and never rebuilt: disconnecting
        // shuts it down, and with it the one controller the element, the Graph and the session
        // share. So re-attaching must throw nothing and must probe nothing.
        assert.doesNotThrow(() => container.appendChild(element));

        await wait(NEVER_HAPPENS_MS);

        assert.equal(fake.built, 1, "no second accelerator was built");
        assert.equal(events.length, seenBeforeRemoval, "and nothing was published from a dead controller");
    });

    test("setting the attribute on a removed element starts no probe", async () => {
        registerFake();

        const { element } = await mount({ acceleration: "off" });
        assert.equal(fake.built, 0, "off never looks");

        element.remove();
        await wait(0);

        element.setAttribute("acceleration", "required");
        await wait(NEVER_HAPPENS_MS);

        assert.equal(fake.built, 0, "a disposed controller must not request a device it can never use");
    });

    test("a disconnected element publishes nothing more", async () => {
        registerFake();

        const { element, events } = await mount();

        await until(() => events.length >= 1, "the first capabilities event");

        element.remove();
        await wait(0);

        const seenAfterRemoval = events.length;

        acceleratorRegistry.clear();
        registerFake();
        await wait(NEVER_HAPPENS_MS);

        assert.equal(events.length, seenAfterRemoval, "a disposed controller must not keep publishing");
    });
});

describe("the acceleration attribute: one controller", () => {
    test("element.session.capabilities is the same document the DOM event carried", async () => {
        registerFake();

        const { element, events } = await mount();

        await until(() => events.length >= 1 && latest(events).state === "idle", "the attached capabilities event");

        const event = events.at(-1);

        assert.isDefined(event);
        assert.strictEqual(
            event?.detail.capabilities,
            element.session.capabilities,
            "the DOM mirror and the session read one controller, not two",
        );
    });

    test("acceleration=off on the tag reaches session.capabilities", async () => {
        registerFake();

        const { element } = await mount({ acceleration: "off" });

        assert.equal(element.session.capabilities.acceleration.state, "off");
        assert.equal(element.session.acceleration, "off");
        assert.equal(fake.built, 0, "nothing was probed");
    });

    test("acceleration-min-nodes reflects and reaches session.config.acceleration.minNodes", async () => {
        const { element } = await mount({ "acceleration-min-nodes": "5000" });

        assert.equal(element.accelerationMinNodes, 5_000);
        assert.equal(element.session.config.acceleration.minNodes, 5_000);

        element.accelerationMinNodes = 2_500;
        await element.updateComplete;

        assert.equal(element.getAttribute("acceleration-min-nodes"), "2500", "the property reflects back");
        assert.equal(element.session.config.acceleration.minNodes, 2_500);
    });

    test("an unparsable acceleration-min-nodes keeps the old value and reports", async () => {
        const reported = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const { element } = await mount({ "acceleration-min-nodes": "many" });

        assert.equal(element.accelerationMinNodes, 0, "the default is kept");
        assert.equal(element.session.config.acceleration.minNodes, 0);
        assert.isAtLeast(reported.mock.calls.length, 1, "and the typo is not silent");
        assert.include(
            String(reported.mock.calls[0]?.[0]),
            '"many"',
            "the report names what was written in the markup, not the NaN the converter made of it",
        );

        // The whole point of not throwing: the element still renders.
        assert.isDefined(element.shadowRoot);

        // A bad PROPERTY write names the value that was written, not the last good attribute.
        reported.mockClear();
        element.accelerationMinNodes = -5;

        assert.equal(element.accelerationMinNodes, 0, "the old threshold is kept");
        assert.include(String(reported.mock.calls[0]?.[0]), '"-5"', "the report names what was written");
    });
});
