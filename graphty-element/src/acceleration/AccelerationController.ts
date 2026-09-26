/**
 * @file The acceleration controller: probe, attach, decide, recover, publish.
 *
 * This is the code a consumer would otherwise have written. It looks for a registered
 * accelerator factory, builds one accelerator, attaches it, applies the
 * `acceleration.minNodes` threshold to every piece of work, watches for device loss, tries to
 * come back from one, and publishes a state a status chip can render. A consumer writes none
 * of that: they import the `./webgpu` entry point, or they do not.
 *
 * ## The one rule this file exists to keep
 *
 * Detecting up front that no accelerator is available and running the CPU path is correct and
 * required. Catching an error from an accelerator that was already running and quietly
 * finishing the work on the CPU is not: it turns a real failure into a plausible-looking number
 * and makes a benchmark meaningless.
 *
 * The two are separated structurally rather than by discipline. {@link
 * AccelerationController.plan} decides, before any accelerated work starts, whether this piece
 * of work goes to the accelerator; it is the only thing that can answer `accelerated: false`.
 * {@link AccelerationController.run} calls the accelerated function only after `plan` said yes,
 * and its `catch` has exactly one exit: it throws. There is no branch in this file that turns a
 * failure from a running accelerator into a CPU result, and the tests assert that there is not.
 */

import { ACCELERATION_ERROR_CODES, type AccelerationErrorCode, GraphtyError } from "../errors";
import { type AcceleratorRegistry, acceleratorRegistry } from "./registry";
import {
    ACCELERATION_MIN_NODES_DEFAULT,
    ACCELERATION_MIN_NODES_KEY,
    ACCELERATION_POLICY_DEFAULT,
    type AccelerationCapabilities,
    type AccelerationPolicy,
    type AccelerationPrecision,
    type AccelerationState,
    type AccelerationStatus,
    type AcceleratorDeviceInfo,
    DEFAULT_ACCELERATOR_PRECISION,
    type GraphAccelerator,
} from "./types";

/** A piece of work that has an accelerated implementation, and the graph it is over. */
export interface AcceleratedWork {
    /**
     * The member the accelerator would have to implement: `"forceAtlas2"`, `"pageRank"`.
     *
     * The element feature-tests it rather than assuming it, because the accelerated list grows
     * one algorithm at a time and an accelerator is allowed to implement exactly one.
     */
    readonly capability: string;
    /** How many nodes this work is over. Compared against `acceleration.minNodes`. */
    readonly nodeCount: number;
}

/**
 * Where a piece of work will run, decided before any of it starts.
 *
 * `accelerated: false` is an instruction to the caller: run this on the CPU path. It is only
 * ever produced up front, never from a failure.
 */
type AccelerationDecision =
    | {
          /** The work goes to the accelerator. */
          readonly accelerated: true;
          /** The accelerator to run it on. */
          readonly accelerator: GraphAccelerator;
          /** The arithmetic the result will have been computed in. Belongs on `Caveats.precision`. */
          readonly precision: AccelerationPrecision;
      }
    | {
          /** The work goes to the CPU path. */
          readonly accelerated: false;
          /** Why, in a sentence a person can read. */
          readonly reason: string;
          /** Why, in a string a `switch` can take, when there is a code for it. */
          readonly code?: AccelerationErrorCode;
      };

/**
 * What came back from {@link AccelerationController.run}.
 *
 * `accelerated: false` means nothing was started on the accelerator and the caller still has to
 * do the work on the CPU path. It never means the accelerated attempt failed: a failure throws.
 */
type AccelerationOutcome<T> =
    | {
          /** The work ran on the accelerator. */
          readonly accelerated: true;
          /** What the accelerated function returned. */
          readonly value: T;
          /** The arithmetic it was computed in. Belongs on `Caveats.precision`. */
          readonly precision: AccelerationPrecision;
      }
    | {
          /** Nothing was started on the accelerator; the caller runs the CPU path. */
          readonly accelerated: false;
          /** Why, in a sentence a person can read. */
          readonly reason: string;
          /** Why, in a string a `switch` can take, when there is a code for it. */
          readonly code?: AccelerationErrorCode;
      };

/** How to build a controller. Every option has a working default. */
interface AccelerationControllerOptions {
    /** What the consumer asked for. Defaults to `"auto"`. */
    readonly policy?: AccelerationPolicy;
    /** The `acceleration.minNodes` threshold. Defaults to 0: accelerate whenever possible. */
    readonly minNodes?: number;
    /** The largest graph an accelerator will be asked to compute exactly, passed to the factory. */
    readonly exactMaxNodes?: number;
    /** Where to look for factories. Defaults to the module-wide registry. */
    readonly registry?: AcceleratorRegistry;
    /** Whether a lost device is followed by an attempt to attach a fresh accelerator. Defaults to true. */
    readonly recoverOnDeviceLoss?: boolean;
    /** How many consecutive recovery attempts to make before giving up. Defaults to 3. */
    readonly maxRecoveryAttempts?: number;
    /**
     * Opens a span around every call-shaped accelerated run, returning what closes it.
     *
     * The element hands in its render manager's `holdFrames`: a GPU readback is delivered as a
     * task and waits behind whatever frame the host is drawing, so a run that is a few
     * milliseconds on the device came back a frame or two later through the element (issue
     * #390). The span covers exactly the accelerated call -- not the decision before it, and not
     * the CPU path -- and is closed however the call ends. A simulation, which steps every frame
     * through {@link AccelerationController.beginWork}, never opens one: it needs the frames.
     */
    readonly whileRunning?: () => () => void;
}

/** One attached accelerator, whether this controller built it, and whether it has finished with it. */
interface Attachment {
    readonly accelerator: GraphAccelerator;
    /**
     * Whether this controller built the accelerator and therefore destroys it.
     *
     * False for one a caller injected: `setAccelerator` promises that whoever built it owns its
     * lifetime, so detaching it -- on a policy change, a device loss, a replacement or the
     * controller's own dispose -- hands it back rather than destroying its device.
     */
    readonly owned: boolean;
    released: boolean;
}

/** The mutable form of the published status, used while assembling it. */
type MutableStatus = {
    -readonly [K in keyof AccelerationStatus]: AccelerationStatus[K];
};

/**
 * Reads the code a failed probe should publish, when the failure carries one.
 *
 * Only the five codes that describe hardware reach `capabilities.acceleration.code`: a factory
 * that failed for some other reason has a sentence but no code, which is what `reason` is for.
 * @param error - The failure, already wrapped.
 * @returns The code when it is one of the five, otherwise undefined.
 */
function accelerationCodeOf(error: GraphtyError): AccelerationErrorCode | undefined {
    return ACCELERATION_ERROR_CODES.find((known) => known === error.code);
}

/**
 * Whether a thrown value is a cancellation rather than a failure.
 *
 * Aborting is not an error code: `AbortController` rejects with a `DOMException` named
 * `AbortError` and `AbortSignal.timeout()` with one named `TimeoutError`. Neither is wrapped,
 * neither is reported as an acceleration failure, and neither means the device is unhealthy.
 * @param error - The thrown value.
 * @returns True when the value is a cancellation.
 */
function isCancellation(error: unknown): error is Error {
    return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

/**
 * Whether two published statuses say the same thing.
 * @param a - The previous status.
 * @param b - The next status.
 * @returns True when every member matches, so no change needs announcing.
 */
function sameStatus(a: AccelerationStatus, b: AccelerationStatus): boolean {
    return (
        a.state === b.state &&
        a.backend === b.backend &&
        a.vendor === b.vendor &&
        a.architecture === b.architecture &&
        a.device === b.device &&
        a.reason === b.reason &&
        a.code === b.code
    );
}

/**
 * Owns hardware acceleration for one session: whether there is any, what it is, and whether a
 * given piece of work uses it.
 *
 * A consumer holds one of these only through the element. They read {@link status}, they set
 * {@link setPolicy}, and that is the whole surface they touch. Probing, constructing,
 * attaching, device loss and recovery happen here.
 * @example Reading the state
 * ```ts
 * controller.onChange((status) => {
 *     chip.textContent = status.state === "unavailable" ? status.reason ?? "no GPU" : status.state;
 * });
 * ```
 * @example Running work that has an accelerated implementation
 * ```ts
 * const outcome = await controller.run(
 *     { capability: "forceAtlas2", nodeCount: graph.nodeCount },
 *     (accelerator) => runOnAccelerator(accelerator, graph),
 * );
 * const result = outcome.accelerated ? outcome.value : runOnCpu(graph);
 * ```
 */
export class AccelerationController {
    readonly #registry: AcceleratorRegistry;
    readonly #listeners = new Set<(status: AccelerationStatus) => void>();
    readonly #unsubscribeRegistry: () => void;
    readonly #exactMaxNodes: number | undefined;
    readonly #recoverOnDeviceLoss: boolean;
    readonly #maxRecoveryAttempts: number;
    readonly #whileRunning: (() => () => void) | undefined;

    #policy: AccelerationPolicy;
    #minNodes: number;
    #state: AccelerationState;
    #reason: string | undefined;
    #code: AccelerationErrorCode | undefined;
    #backend: string | undefined;
    #device: AcceleratorDeviceInfo | undefined;
    #attachment: Attachment | null = null;
    #injected = false;
    #busy = 0;
    #probe: Promise<AccelerationStatus> | null = null;
    #probeSettled = false;
    #recoveryAttempts = 0;
    #disposed = false;
    #status: AccelerationStatus;
    #capabilities: AccelerationCapabilities;

    /**
     * Builds a controller. Nothing is probed until {@link start} is called.
     * @param options - The policy, the threshold, the registry and the recovery behaviour.
     */
    constructor(options: AccelerationControllerOptions = {}) {
        this.#registry = options.registry ?? acceleratorRegistry;
        this.#exactMaxNodes = options.exactMaxNodes;
        this.#recoverOnDeviceLoss = options.recoverOnDeviceLoss ?? true;
        this.#maxRecoveryAttempts = options.maxRecoveryAttempts ?? 3;
        this.#whileRunning = options.whileRunning;
        this.#policy = options.policy ?? ACCELERATION_POLICY_DEFAULT;
        this.#minNodes = options.minNodes ?? ACCELERATION_MIN_NODES_DEFAULT;
        this.#state = this.#policy === "off" ? "off" : "probing";
        this.#status = this.#buildStatus();
        this.#capabilities = Object.freeze({ acceleration: this.#status });
        this.#unsubscribeRegistry = this.#registry.onChange(() => {
            this.#onRegistryChanged();
        });
    }

    /**
     * Where acceleration stands right now, as frozen, serialisable data.
     * @returns The published status.
     */
    get status(): AccelerationStatus {
        return this.#status;
    }

    /**
     * The published capabilities subset, which is the `graphty-capabilities-change` detail.
     *
     * The same object is returned until the next transition, so `prev === next` is a valid
     * staleness test for a reader that caches it.
     * @returns The capabilities the acceleration subsystem publishes.
     */
    get capabilities(): AccelerationCapabilities {
        return this.#capabilities;
    }

    /**
     * Whether {@link dispose} has already run, so a caller can skip {@link start} on a
     * controller whose graph has been shut down.
     * @returns True once the controller has been disposed.
     */
    get disposed(): boolean {
        return this.#disposed;
    }

    /**
     * The one-word state, for a caller that wants only that.
     * @returns The state.
     */
    get state(): AccelerationState {
        return this.#state;
    }

    /**
     * What the consumer asked for.
     * @returns The policy in force.
     */
    get policy(): AccelerationPolicy {
        return this.#policy;
    }

    /**
     * The `acceleration.minNodes` threshold in force.
     * @returns The node count at or above which accelerated work uses the accelerator.
     */
    get minNodes(): number {
        return this.#minNodes;
    }

    /**
     * The attached accelerator, or null when there is none.
     * @returns The accelerator.
     */
    get accelerator(): GraphAccelerator | null {
        return this.#attachment?.accelerator ?? null;
    }

    /**
     * Subscribes to state changes.
     *
     * Called on every transition and never for an unchanged state, so a chip that re-renders on
     * each call does not re-render on a no-op.
     * @param listener - Called with the new status.
     * @returns The unsubscribe function.
     */
    onChange(listener: (status: AccelerationStatus) => void): () => void {
        this.#listeners.add(listener);
        return () => {
            this.#listeners.delete(listener);
        };
    }

    /**
     * Changes what the consumer asked for.
     *
     * Switching to `"off"` releases the accelerator, because holding a device nobody is allowed
     * to use is a cost with no benefit. Switching back to `"auto"` or `"required"` probes again.
     * @param policy - The new policy.
     */
    setPolicy(policy: AccelerationPolicy): void {
        if (policy === this.#policy) {
            return;
        }

        this.#policy = policy;

        if (policy === "off") {
            this.#detach();
            this.#injected = false;
            this.#probe = null;
            this.#probeSettled = true;
            this.#transition("off", undefined, undefined);
            return;
        }

        if (this.#attachment !== null) {
            this.#transition(this.#busy > 0 ? "active" : "idle", undefined, undefined);
            return;
        }

        this.#probe = null;
        this.#probeSettled = false;
        this.#transition("probing", undefined, undefined);
        void this.start();
    }

    /**
     * Changes the `acceleration.minNodes` threshold.
     * @param minNodes - The node count at or above which accelerated work uses the accelerator.
     * @throws A `GraphtyError` with `E_OPTION_RANGE` when the value is negative or not a finite
     * integer.
     */
    setMinNodes(minNodes: number): void {
        if (!Number.isInteger(minNodes) || minNodes < 0) {
            throw new GraphtyError({
                code: "E_OPTION_RANGE",
                message: `${ACCELERATION_MIN_NODES_KEY} must be an integer of 0 or more, not ${String(minNodes)}`,
                source: "config",
                details: { key: ACCELERATION_MIN_NODES_KEY, min: 0, value: minNodes },
            });
        }

        this.#minNodes = minNodes;
    }

    /**
     * Attaches an accelerator the caller built, or detaches the current one with `null`.
     *
     * This is how a test injects a fake and how a third party supplies an implementation the
     * element does not ship. An injected accelerator is never replaced by a probe.
     * @param accelerator - The accelerator to attach, or null to detach.
     */
    setAccelerator(accelerator: GraphAccelerator | null): void {
        this.#assertLive();

        if (accelerator === null) {
            this.#detach();
            this.#injected = false;
            this.#probeSettled = true;
            this.#transition(this.#policy === "off" ? "off" : "unavailable", "the accelerator was detached", undefined);
            return;
        }

        this.#injected = true;
        this.#probeSettled = true;
        this.#recoveryAttempts = 0;
        this.#attach(accelerator, false);
    }

    /**
     * Looks for an accelerator, once.
     *
     * Idempotent: the first call starts the probe and every later call awaits the same one. The
     * element calls it; a consumer does not have to.
     * @returns The status the probe settled on.
     */
    start(): Promise<AccelerationStatus> {
        if (this.#probe === null) {
            this.#probe = this.#probeNow();
        }

        return this.#probe;
    }

    /**
     * Waits for the probe to settle, and refuses to continue quietly when the consumer asked
     * for acceleration and there is none.
     * @returns The settled status.
     * @throws A `GraphtyError` with `E_NO_ACCELERATOR` when the policy is `"required"` and no
     * accelerator could be attached, or `E_DISPOSED` when the controller has been disposed.
     */
    async ready(): Promise<AccelerationStatus> {
        this.#assertLive();
        const status = await this.start();
        this.#assertLive();

        if (this.#policy === "required" && this.#attachment === null) {
            throw this.#noAcceleratorError();
        }

        return status;
    }

    /**
     * Decides where one piece of work runs, before any of it starts.
     *
     * The decision is the only place a CPU answer can come from, and there are four of them:
     * the policy is `"off"`, no accelerator is attached, the graph is below
     * `acceleration.minNodes`, or the attached accelerator does not implement this capability.
     *
     * Under `"required"` two of them throw instead of answering quietly -- no accelerator, and
     * an accelerator without this capability -- because both are absence, and absence is what
     * `"required"` exists to make loud. The threshold is the one case where `"required"` still
     * runs on the CPU: an accelerator IS attached and healthy, and the threshold is a statement
     * about what pays, not about what is possible. `"off"` cannot arise under `"required"`,
     * because a policy is one of three.
     * @param work - The capability the work needs and the size of the graph it is over.
     * @returns Where the work runs.
     * @throws A `GraphtyError` with `E_NO_ACCELERATOR` when the policy is `"required"` and the
     * work cannot be accelerated, or `E_DISPOSED` when the controller has been disposed.
     */
    plan(work: AcceleratedWork): AccelerationDecision {
        this.#assertLive();
        const required = this.#policy === "required";

        if (this.#policy === "off") {
            // Not a "required" case: a policy is one of three, and "off" is the consumer saying
            // they do not want the accelerator even if there is one.
            return { accelerated: false, reason: "acceleration is switched off" };
        }

        const { accelerator } = this;
        if (accelerator === null) {
            if (required) {
                throw this.#noAcceleratorError(work);
            }

            return {
                accelerated: false,
                reason: this.#reason ?? this.#missingAcceleratorReason(),
                ...(this.#code === undefined ? {} : { code: this.#code }),
            };
        }

        if (work.nodeCount < this.#minNodes) {
            return {
                accelerated: false,
                reason:
                    `the graph has ${String(work.nodeCount)} nodes, below the ` +
                    `${ACCELERATION_MIN_NODES_KEY} threshold of ${String(this.#minNodes)}`,
            };
        }

        if (typeof accelerator[work.capability] !== "function") {
            if (required) {
                throw this.#noAcceleratorError(work);
            }

            return {
                accelerated: false,
                reason: `the ${accelerator.name} accelerator does not implement "${work.capability}"`,
            };
        }

        return { accelerated: true, accelerator, precision: accelerator.precision ?? DEFAULT_ACCELERATOR_PRECISION };
    }

    /**
     * Runs one piece of work on the accelerator when {@link plan} says it belongs there.
     *
     * An `accelerated: false` outcome means nothing was started and the caller runs the CPU
     * path. A failure from the accelerated function is thrown, always: there is no argument for
     * a CPU result here, because the caller asked for hardware that then broke, and a number
     * that silently came from somewhere else is worse than no number.
     * @param work - The capability the work needs and the size of the graph it is over.
     * @param fn - Runs the work on the accelerator. Called only after the decision said yes.
     * @returns The accelerated value, or the instruction to run the CPU path.
     * @throws Whatever the accelerated function throws, as a `GraphtyError` with the backend's
     * code -- `E_DEVICE_LOST`, `E_TOO_LARGE` -- and the original as `cause`. A cancellation
     * (`AbortError`, `TimeoutError`) propagates unchanged.
     */
    async run<T>(
        work: AcceleratedWork,
        fn: (accelerator: GraphAccelerator) => T | Promise<T>,
    ): Promise<AccelerationOutcome<T>> {
        await this.ready();

        const decision = this.plan(work);
        if (!decision.accelerated) {
            return decision.code === undefined
                ? { accelerated: false, reason: decision.reason }
                : { accelerated: false, reason: decision.reason, code: decision.code };
        }

        const attachment = this.#attachment;
        this.#enterWork();
        // Opened after the decision, so the CPU path above never holds the host's frames, and
        // closed in the `finally` below, so a throw releases them too.
        const endSpan = this.#whileRunning?.();

        try {
            const value = await fn(decision.accelerator);
            return { accelerated: true, value, precision: decision.precision };
        } catch (error) {
            // The one exit. Nothing below this line may produce a CPU result: the accelerator
            // was already running when it failed, and finishing the work somewhere else would
            // hide that.
            throw this.#failedRun(error, work, decision.accelerator, attachment);
        } finally {
            endSpan?.();
            this.#leaveWork();
        }
    }

    /**
     * Marks the start of a span of accelerated work that this controller does not itself drive.
     *
     * {@link run} covers work shaped like a call: one function, one promise, `"active"` for as
     * long as it takes. A simulation is not shaped like that -- the element hands the graph to
     * the accelerator once and then steps it every frame until the arrangement settles -- so the
     * layout bridge marks the span instead. Without it the state a consumer reads would say
     * `"idle"`, which its own documentation defines as nothing using the accelerator, for the
     * whole of a GPU layout.
     *
     * Counted the way `run()` is: spans overlap freely and the state falls back to `"idle"` when
     * the last one ends. The returned function is idempotent, so a caller may end its span at a
     * settle and again at a dispose without counting out twice. On a disposed controller the
     * call is a no-op rather than a throw: there is no state left to publish, and a frame loop is
     * the wrong place for a shutdown to surface.
     * @returns Ends the span.
     */
    beginWork(): () => void {
        if (this.#disposed) {
            return (): void => {
                // Nothing was counted in, so there is nothing to count out.
            };
        }

        this.#enterWork();
        let ended = false;

        return (): void => {
            if (ended) {
                return;
            }

            ended = true;
            this.#leaveWork();
        };
    }

    /**
     * Releases the accelerator and stops publishing.
     *
     * The controller is not reusable afterwards; every call that could produce a wrong answer
     * throws `E_DISPOSED` instead.
     */
    dispose(): void {
        if (this.#disposed) {
            return;
        }

        this.#disposed = true;
        this.#unsubscribeRegistry();
        this.#detach();
        this.#listeners.clear();
    }

    /**
     * Probes the registry and attaches the first accelerator a factory returns.
     * @returns The status the probe settled on.
     */
    async #probeNow(): Promise<AccelerationStatus> {
        if (this.#policy === "off") {
            this.#probeSettled = true;
            this.#transition("off", undefined, undefined);
            return this.#status;
        }

        if (this.#attachment !== null) {
            this.#probeSettled = true;
            return this.#status;
        }

        this.#transition("probing", undefined, undefined);
        const attached = await this.#tryFactories();
        this.#probeSettled = true;

        if (!attached) {
            this.#transition("unavailable", this.#reason, this.#code);
        }

        return this.#status;
    }

    /**
     * Calls each registered factory in registration order until one builds an accelerator.
     *
     * A factory that declines costs nothing; a factory that throws contributes its code and its
     * sentence to the reported reason, which is how "requires a secure context (https or
     * localhost)" reaches a status chip instead of being swallowed.
     * @returns True when an accelerator was attached.
     */
    async #tryFactories(): Promise<boolean> {
        const registrations = this.#registry.list();

        if (registrations.length === 0) {
            this.#reason =
                'no accelerator is registered. Import "@graphty/graphty-element/webgpu" to use WebGPU, ' +
                "or register your own accelerator factory.";
            this.#code = undefined;
            return false;
        }

        const declined: string[] = [];
        let code: AccelerationErrorCode | undefined;

        for (const registration of registrations) {
            try {
                const accelerator = await registration.factory({
                    exactMaxNodes: this.#exactMaxNodes,
                    acceptSoftware: this.#policy === "required",
                });

                if (accelerator !== null) {
                    await this.#verify(accelerator);
                }

                if (this.#disposed) {
                    accelerator?.dispose?.();
                    return false;
                }

                if (accelerator !== null) {
                    this.#attach(accelerator, true);
                    return true;
                }

                declined.push(`${registration.name}: declined`);
            } catch (error) {
                const failure = GraphtyError.wrap(error, {
                    code: "E_INTERNAL",
                    source: "acceleration",
                    details: { accelerator: registration.name },
                });
                code = accelerationCodeOf(failure) ?? code;
                declined.push(`${registration.name}: ${failure.message}`);
            }
        }

        this.#reason = declined.join("; ");
        this.#code = code;
        return false;
    }

    /**
     * Asks a freshly built accelerator to prove it computes correctly, before it is attached.
     *
     * This is capability detection and belongs here with the rest of it. Hardware that answers
     * is not the same thing as hardware that answers correctly, and a backend that can tell the
     * difference costs a few milliseconds once to say so. Finding out on the first layout frame
     * instead would put the discovery in the middle of a repaint, where it reads as a rendering
     * failure rather than as the machine's answer to "is there an accelerator here".
     *
     * A backend with no self-check omits {@link GraphAccelerator.verify} and nothing runs, so a
     * host with no accelerator at all pays nothing: this is reached only after a factory has
     * already built one.
     *
     * A rejection leaves by the same door a factory's does -- it is thrown to
     * {@link AccelerationController.#tryFactories}, which records its code and its sentence and
     * moves on to the next factory -- so a device that computes incorrectly ends where a missing
     * adapter ends: `"unavailable"`, with the reason published, and the CPU path running.
     * @param accelerator - The accelerator this controller has just built.
     * @throws Whatever the accelerator's self-check rejected with.
     */
    async #verify(accelerator: GraphAccelerator): Promise<void> {
        try {
            await accelerator.verify?.();
        } catch (error) {
            // Built here and not usable: releasing it is this controller's job, and nothing has
            // been attached, so there is no state to unwind.
            this.#disposeAccelerator(accelerator);
            throw error;
        }
    }

    /**
     * Attaches an accelerator and starts watching it for device loss.
     * @param accelerator - The accelerator to attach.
     * @param owned - True when this controller built it, so this controller disposes it. False for
     * an injected one, whose lifetime belongs to whoever built it.
     */
    #attach(accelerator: GraphAccelerator, owned: boolean): void {
        this.#detach();

        const attachment: Attachment = { accelerator, owned, released: false };
        this.#attachment = attachment;
        this.#backend = accelerator.backend;
        this.#device = accelerator.device;
        this.#recoveryAttempts = 0;

        const { lost } = accelerator;
        if (lost !== undefined) {
            void lost.then(
                (info) => {
                    this.#onDeviceLost(attachment, info.reason);
                },
                (error: unknown) => {
                    this.#onDeviceLost(attachment, error instanceof Error ? error.message : String(error));
                },
            );
        }

        this.#transition(this.#busy > 0 ? "active" : "idle", undefined, undefined);
    }

    /**
     * Releases the attached accelerator, if any, without announcing a state.
     *
     * The device facts go with it: `backend`, `vendor`, `architecture` and `device` describe the
     * accelerator that is attached right now, and there is no accelerator attached after this.
     *
     * An accelerator this controller BUILT is disposed here; an injected one is only let go of,
     * because `setAccelerator` promises its lifetime to whoever built it -- a test that injects a
     * fake, or a third party that hands the element a device it goes on using elsewhere.
     */
    #detach(): void {
        const attachment = this.#attachment;
        if (attachment === null) {
            return;
        }

        attachment.released = true;
        this.#attachment = null;
        this.#backend = undefined;
        this.#device = undefined;

        if (attachment.owned) {
            this.#disposeAccelerator(attachment.accelerator);
        }
    }

    /**
     * Disposes an accelerator, never letting its cleanup throw into the caller.
     * @param accelerator - The accelerator to dispose.
     */
    #disposeAccelerator(accelerator: GraphAccelerator): void {
        try {
            accelerator.dispose?.();
        } catch (error) {
            console.warn("graphty: an accelerator threw while being disposed", error);
        }
    }

    /**
     * Handles a lost device: says so, then tries to come back.
     *
     * Ignored when this attachment is not the live one, which is what keeps the element's own
     * `dispose()` -- which destroys the device and therefore resolves `lost` -- from being
     * reported as a hardware failure.
     * @param attachment - The attachment whose device was lost.
     * @param reason - What the backend said about the loss.
     */
    #onDeviceLost(attachment: Attachment, reason: string): void {
        if (this.#disposed || attachment.released || this.#attachment !== attachment) {
            return;
        }

        this.#detach();
        this.#transition("error", `the accelerator's device was lost: ${reason}`, "E_DEVICE_LOST");

        if (
            !this.#recoverOnDeviceLoss ||
            this.#policy === "off" ||
            this.#recoveryAttempts >= this.#maxRecoveryAttempts
        ) {
            return;
        }

        this.#recoveryAttempts += 1;
        void this.#recover(reason);
    }

    /**
     * Tries to attach a fresh accelerator after a device loss.
     *
     * The state stays `"error"` while this runs and when it fails: an accelerator that worked
     * and then died is a different thing from one that was never there, and flattening the two
     * would hide a real hardware failure behind "unavailable".
     * @param lossReason - What the backend said about the loss, kept for the failure message.
     */
    async #recover(lossReason: string): Promise<void> {
        const recovered = await this.#tryFactories();

        if (this.#disposed || recovered) {
            return;
        }

        const why = this.#reason ?? "no accelerator available";
        this.#transition(
            "error",
            `the accelerator's device was lost: ${lossReason}; reattaching failed: ${why}`,
            "E_DEVICE_LOST",
        );
    }

    /**
     * Re-probes when a factory is registered after this controller gave up.
     *
     * `import "@graphty/graphty-element/webgpu"` can be evaluated after the element exists --
     * a lazy chunk, a dynamic import, hot module replacement -- and a consumer should not have
     * to know that to get a GPU.
     */
    #onRegistryChanged(): void {
        if (this.#disposed || this.#policy === "off" || this.#injected || this.#attachment !== null) {
            return;
        }

        if (this.#state !== "unavailable") {
            return;
        }

        this.#probe = null;
        this.#probeSettled = false;
        void this.start();
    }

    /** Counts one piece of accelerated work in, moving the state to `"active"`. */
    #enterWork(): void {
        this.#busy += 1;
        if (this.#attachment !== null && this.#state === "idle") {
            this.#transition("active", undefined, undefined);
        }
    }

    /** Counts one piece of accelerated work out, moving the state back to `"idle"`. */
    #leaveWork(): void {
        this.#busy = Math.max(0, this.#busy - 1);
        if (this.#busy === 0 && this.#attachment !== null && this.#state === "active") {
            this.#transition("idle", undefined, undefined);
        }
    }

    /**
     * Turns a failure from a running accelerator into the error to throw.
     *
     * Never into a CPU result. A device loss noticed this way also moves the state, because the
     * `lost` promise may resolve a frame later and a consumer should not see a healthy state in
     * between.
     * @param error - What the accelerated function threw.
     * @param work - The work that failed.
     * @param accelerator - The accelerator it was running on.
     * @param attachment - The attachment it was running on, for the device-loss path.
     * @returns The error to throw.
     */
    #failedRun(
        error: unknown,
        work: AcceleratedWork,
        accelerator: GraphAccelerator,
        attachment: Attachment | null,
    ): Error {
        if (isCancellation(error)) {
            return error;
        }

        const failure = GraphtyError.wrap(error, {
            code: "E_INTERNAL",
            source: "acceleration",
            details: {
                capability: work.capability,
                nodeCount: work.nodeCount,
                accelerator: accelerator.name,
                backend: accelerator.backend,
            },
        });

        if (failure.code === "E_DEVICE_LOST" && attachment !== null) {
            this.#onDeviceLost(attachment, failure.message);
        }

        if (failure.code === "E_DEVICE_INCORRECT" && attachment !== null) {
            this.#refuseDevice(attachment, failure.message);
        }

        return failure;
    }

    /**
     * Stops using an accelerator caught computing incorrectly while work was already on it.
     *
     * A backend that checks itself is refused at attach and never gets here. One that does not
     * -- or one whose own guard fires deeper than its self-check reaches -- says so the first
     * time it is asked for numbers, and this is what the element does with that: it lets go of
     * the accelerator and publishes the reason, so the state a consumer reads stops claiming a
     * healthy device and the next piece of work is planned onto the CPU up front.
     *
     * The run that discovered it still throws. That is the whole distinction this file exists to
     * keep: the failed work fails, and only work that has not started yet is planned elsewhere.
     *
     * `"unavailable"` rather than `"error"`, and no recovery attempt: an accelerator that was
     * lost might come back, and reattaching is worth a try. One that computes wrong answers was
     * never trustworthy, the same hardware is what a fresh probe would find, and it ends where a
     * missing adapter ends.
     * @param attachment - The attachment the failing work was running on.
     * @param reason - What the accelerator said about the disagreement.
     */
    #refuseDevice(attachment: Attachment, reason: string): void {
        if (this.#disposed || attachment.released || this.#attachment !== attachment) {
            return;
        }

        this.#detach();
        this.#transition("unavailable", reason, "E_DEVICE_INCORRECT");
    }

    /**
     * What to say when there is no accelerator and no factory said why.
     * @returns The sentence: an unfinished probe is not the same as a finished one that found
     * nothing, and a consumer reading a status chip needs to be able to tell them apart.
     */
    #missingAcceleratorReason(): string {
        return this.#probeSettled ? "no accelerator is attached" : "the accelerator probe has not finished";
    }

    /**
     * The error a `"required"` policy produces when the work cannot be accelerated.
     * @param work - The work that could not be accelerated, when there was one.
     * @returns The error to throw.
     */
    #noAcceleratorError(work?: AcceleratedWork): GraphtyError {
        const detail = this.#reason ?? this.#missingAcceleratorReason();
        return new GraphtyError({
            code: "E_NO_ACCELERATOR",
            message: `acceleration is required and unavailable: ${detail}`,
            source: "acceleration",
            recoverable: !this.#probeSettled,
            details: {
                policy: this.#policy,
                state: this.#state,
                ...(this.#code === undefined ? {} : { acceleration: this.#code }),
                ...(work === undefined ? {} : { capability: work.capability, nodeCount: work.nodeCount }),
            },
        });
    }

    /**
     * Refuses to answer once disposed, rather than answering with a stale state.
     * @throws A `GraphtyError` with `E_DISPOSED`.
     */
    #assertLive(): void {
        if (this.#disposed) {
            throw new GraphtyError({
                code: "E_DISPOSED",
                message: "this acceleration controller has been disposed",
                source: "acceleration",
            });
        }
    }

    /**
     * Moves to a state and announces it, unless nothing changed.
     * @param state - The new state.
     * @param reason - The sentence a person reads, or undefined to clear it.
     * @param code - The code a `switch` takes, or undefined to clear it.
     */
    #transition(state: AccelerationState, reason: string | undefined, code: AccelerationErrorCode | undefined): void {
        this.#state = state;
        this.#reason = reason;
        this.#code = code;

        const next = this.#buildStatus();
        if (sameStatus(this.#status, next)) {
            return;
        }

        this.#status = next;
        this.#capabilities = Object.freeze({ acceleration: next });
        for (const listener of [...this.#listeners]) {
            // A listener is consumer code, and one that throws must not stop the others from
            // hearing the change or reject the promise this transition runs inside. The element
            // starts probing from its constructor without awaiting it, so an escaping throw
            // here surfaces as an unhandled rejection at element construction -- far from the
            // listener that caused it, and fatal-looking for something that is not.
            try {
                listener(next);
            } catch (error: unknown) {
                console.error("<graphty-element>: an acceleration status listener threw.", error);
            }
        }
    }

    /**
     * Assembles the frozen status a consumer reads.
     * @returns The status.
     */
    #buildStatus(): AccelerationStatus {
        const status: MutableStatus = { state: this.#state };

        if (this.#backend !== undefined) {
            status.backend = this.#backend;
        }

        if (this.#device !== undefined) {
            /* An accelerator hands over three strings that are always present, with `""` for
               what its driver did not name; this status publishes each one only when the backend
               named it. This is the one place that converts between the two shapes, so an empty
               string is dropped here rather than published.

               It used to be copied straight through, and every consumer that tested the field
               the way {@link AccelerationStatus} promises -- `status.device ?? status.backend` -- got the
               empty string instead of its fallback. The graphty app's chip tooltip read
               ". Layouts and algorithms with a GPU path run on it." on every browser that masks
               the device string, which is most of them, and its chip label would have read
               "on (nvidia )" wherever the architecture was the masked one. */
            if (this.#device.vendor !== "") {
                status.vendor = this.#device.vendor;
            }

            if (this.#device.architecture !== "") {
                status.architecture = this.#device.architecture;
            }

            if (this.#device.description !== "") {
                status.device = this.#device.description;
            }
        }

        if (this.#reason !== undefined) {
            status.reason = this.#reason;
        }

        if (this.#code !== undefined) {
            status.code = this.#code;
        }

        return Object.freeze(status);
    }
}
