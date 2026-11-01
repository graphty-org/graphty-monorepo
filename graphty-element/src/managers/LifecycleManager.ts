import type { GraphStartedEvent } from "../events";
import { GraphtyLogger, type Logger } from "../logging/GraphtyLogger.js";
import type { EventManager } from "./EventManager";
import type { Manager } from "./interfaces";

// Type guard for render managers with startRenderLoop method
type RenderManagerWithStartLoop = Manager & { startRenderLoop(callback: (frameMs: number) => void): void };

function hasStartRenderLoop(manager: Manager): manager is RenderManagerWithStartLoop {
    return "startRenderLoop" in manager;
}

/**
 * Manages the lifecycle of all other managers
 * Ensures proper initialization order and cleanup
 */
export class LifecycleManager implements Manager {
    private initialized = false;
    private initializing = false;
    /**
     * Set by {@link dispose} and cleared by {@link init}. Disposal is keyed on this rather than on
     * `initialized`, so a graph shut down before it finished initialising -- one never attached,
     * or detached while it was opening -- still disposes its managers, and with them its Babylon
     * engine and WebGL context (issue #1977).
     */
    private disposed = false;
    private readonly logger: Logger = GraphtyLogger.getLogger(["graphty", "lifecycle"]);

    /**
     * Creates a new lifecycle manager for coordinating manager initialization and disposal
     * @param managers - Map of manager names to manager instances
     * @param eventManager - Event manager for emitting lifecycle events
     * @param initOrder - Array of manager names defining initialization order
     */
    constructor(
        private readonly managers: Map<string, Manager>,
        private readonly eventManager: EventManager,
        private readonly initOrder: string[],
    ) {}

    /**
     * Initialize all managers in the specified order
     */
    async init(): Promise<void> {
        if (this.initialized || this.initializing) {
            return;
        }

        this.initializing = true;
        this.disposed = false;
        const startTime = performance.now();

        this.logger.info("Initializing managers", {
            managerCount: this.managers.size,
            initOrder: this.initOrder,
        });

        try {
            // Initialize managers in specified order
            for (const managerName of this.initOrder) {
                const manager = this.managers.get(managerName);
                if (!manager) {
                    throw new Error(`Manager '${managerName}' not found in manager map`);
                }

                if (!(await this.initManager(managerName, manager, startTime))) {
                    return;
                }
            }

            this.initialized = true;
            this.initializing = false;

            const totalTime = performance.now() - startTime;
            this.logger.info("All managers initialized", {
                totalTime: totalTime.toFixed(2),
                managerCount: this.managers.size,
            });

            // Emit overall initialization complete event
            this.eventManager.emit("lifecycle-initialized", {
                totalTime,
                managerCount: this.managers.size,
            });
        } catch (error) {
            this.initializing = false;

            const err = error instanceof Error ? error : new Error(String(error));
            this.eventManager.emitGraphError(null, err, "init", { component: "LifecycleManager" });

            throw error;
        }
    }

    /**
     * Initialize one manager, in order, for `init`.
     * @param managerName - The manager's name.
     * @param manager - The manager.
     * @param startTime - When `init` started, for the event's elapsed time.
     * @returns False when the lifecycle was disposed while the manager initialized: stop there.
     */
    private async initManager(managerName: string, manager: Manager, startTime: number): Promise<boolean> {
        try {
            const managerStartTime = performance.now();
            this.logger.debug(`Initializing manager: ${managerName}`);
            await manager.init();
            // Disposed while this manager was initialising: the rest are disposed too.
            if (this.disposed) {
                this.initializing = false;
                return false;
            }

            const managerDuration = performance.now() - managerStartTime;

            this.logger.debug(`Manager initialized: ${managerName}`, {
                duration: managerDuration.toFixed(2),
            });

            this.eventManager.emit("manager-initialized", {
                managerName,
                elapsedTime: performance.now() - startTime,
            });
            return true;
        } catch (error) {
            // Log the failure
            this.logger.error(
                `Manager initialization failed: ${managerName}`,
                error instanceof Error ? error : new Error(String(error)),
                { managerName },
            );

            // Clean up any managers that were already initialized
            this.cleanup(managerName);

            throw new Error(
                `Failed to initialize manager '${managerName}': ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
    }

    /**
     * Start the graph system after initialization
     * This coordinates starting the render loop and other post-init setup
     * @param updateCallback - Callback function to execute on each render frame, given the
     *     previous frame's duration in milliseconds
     */
    startGraph(updateCallback: (frameMs: number) => void): void {
        if (!this.initialized) {
            throw new Error("Cannot start graph before initialization");
        }

        try {
            // Get the render manager and start the render loop
            const renderManager = this.managers.get("render");
            if (renderManager && hasStartRenderLoop(renderManager)) {
                renderManager.startRenderLoop(updateCallback);
            }

            // Emit graph started event
            this.eventManager.emit("graph-started", {
                timestamp: Date.now(),
            } satisfies Omit<GraphStartedEvent, "type">);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.eventManager.emitGraphError(null, err, "init", {
                component: "LifecycleManager",
                operation: "startGraph",
            });
            throw new Error(`Failed to start graph: ${err.message}`);
        }
    }

    /**
     * Dispose all managers in reverse initialization order
     */
    dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;

        this.logger.info("Disposing managers", {
            managerCount: this.managers.size,
        });

        // Dispose managers in reverse order
        const reverseOrder = [...this.initOrder].reverse();

        // The event manager is held back until `lifecycle-disposed` has gone out: disposing it
        // clears the observable that `graph.on` listeners and the element's DOM forwarder hang
        // on, so an event emitted after it reaches nobody (#1645).
        for (const managerName of reverseOrder) {
            const manager = this.managers.get(managerName);
            if (manager && manager !== this.eventManager) {
                try {
                    this.logger.debug(`Disposing manager: ${managerName}`);
                    manager.dispose();
                } catch (error) {
                    // Log error but continue disposing other managers
                    this.logger.error(
                        `Error disposing manager: ${managerName}`,
                        error instanceof Error ? error : new Error(String(error)),
                        { managerName },
                    );

                    this.eventManager.emitGraphError(
                        null,
                        error instanceof Error ? error : new Error(String(error)),
                        "other",
                        { component: "LifecycleManager", operation: "dispose", managerName },
                    );
                }
            }
        }

        this.initialized = false;

        this.logger.info("All managers disposed", {
            managerCount: this.managers.size,
        });

        this.eventManager.emit("lifecycle-disposed", {
            managerCount: this.managers.size,
        });

        // Only when it was registered as one of the managers: one handed in alone is not ours.
        if ([...this.managers.values()].includes(this.eventManager)) {
            this.eventManager.dispose();
        }
    }

    /**
     * Clean up managers that were initialized before the given manager failed
     * @param failedManager - Name of the manager that failed to initialize
     */
    private cleanup(failedManager: string): void {
        const failedIndex = this.initOrder.indexOf(failedManager);
        if (failedIndex === -1) {
            return;
        }

        // Dispose all managers that were initialized before the failure -- except the event
        // manager: the failure is reported through it after this returns, and `dispose` (which
        // a failed graph still gets) disposes it last (#1645).
        for (let i = failedIndex - 1; i >= 0; i--) {
            const managerName = this.initOrder[i];
            const manager = this.managers.get(managerName);

            if (manager && manager !== this.eventManager) {
                try {
                    manager.dispose();
                } catch (error) {
                    this.logger.error(
                        `Error during cleanup of manager: ${managerName}`,
                        error instanceof Error ? error : new Error(String(error)),
                        { managerName },
                    );
                }
            }
        }
    }

    /**
     * Check if all managers are initialized
     * @returns True if initialization is complete, false otherwise
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Add a new manager to the lifecycle. Only before init() starts: it throws after.
     * @param name - Unique name for the manager
     * @param manager - Manager instance to add
     * @param position - Optional position in initialization order (defaults to end)
     */
    addManager(name: string, manager: Manager, position?: number): void {
        if (this.initialized || this.initializing) {
            throw new Error("Cannot add managers after initialization has started");
        }

        this.managers.set(name, manager);

        if (position !== undefined) {
            this.initOrder.splice(position, 0, name);
        } else {
            this.initOrder.push(name);
        }
    }

    /**
     * Get a manager by name
     * @param name - Name of the manager to retrieve
     * @returns The manager instance or undefined if not found
     */
    getManager(name: string): Manager | undefined {
        return this.managers.get(name);
    }
}
