import { assert, describe, expect, test, vi } from "vitest";

/*
 * The three mocks below are constructor functions, so each one's `this` needs a type: a plain
 * `function` expression has an implicitly-any `this`, which is an error under this package's
 * strict settings. These interfaces say what each fake builds, and nothing more -- they exist to
 * annotate `this`, not to mirror Babylon's real classes.
 */

/** What the fake ActionManager assembles on itself. */
interface MockActionManagerInstance {
    scene: unknown;
    actions: unknown[];
    registerAction: (action: unknown) => void;
}

/** The three observables the fake drag behaviour exposes. */
interface MockDragBehaviorInstance {
    onDragStartObservable: { add: (cb: unknown) => void };
    onDragEndObservable: { add: (cb: unknown) => void };
    onPositionChangedObservable: { add: (cb: unknown) => void };
}

/** What the fake ExecuteCodeAction records, so a test can read back what it was registered with. */
interface MockExecuteCodeActionInstance {
    _trigger: unknown;
    _func: unknown;
}

/** The object form of the trigger argument, which carries the trigger under a key. */
interface TriggerOptions {
    trigger?: unknown;
}

// Use vi.hoisted to define mock values before vi.mock is hoisted
const { mockActionManager, mockSixDofDragBehavior, mockExecuteCodeAction, DOUBLE_PICK_TRIGGER } = vi.hoisted(() => ({
    DOUBLE_PICK_TRIGGER: 6,
    mockActionManager: Object.assign(
        vi.fn().mockImplementation(function (this: MockActionManagerInstance, scene: unknown) {
            this.scene = scene;
            this.actions = [];
            this.registerAction = vi.fn((action: unknown) => {
                this.actions.push(action);
            });
        }),
        { OnDoublePickTrigger: 6 },
    ),
    mockSixDofDragBehavior: vi.fn().mockImplementation(function (this: MockDragBehaviorInstance) {
        this.onDragStartObservable = { add: vi.fn() };
        this.onDragEndObservable = { add: vi.fn() };
        this.onPositionChangedObservable = { add: vi.fn() };
    }),
    mockExecuteCodeAction: vi.fn().mockImplementation(function (
        this: MockExecuteCodeActionInstance,
        triggerOrOptions: unknown,
        func: unknown,
    ) {
        if (typeof triggerOrOptions === "object" && (triggerOrOptions as TriggerOptions | null)?.trigger) {
            this._trigger = (triggerOrOptions as TriggerOptions).trigger;
        } else {
            this._trigger = triggerOrOptions;
        }

        this._func = func;
    }),
}));

// Mock @babylonjs/core - this will be merged with the global mock from setup.ts
vi.mock("@babylonjs/core", async (importOriginal) => {
    // `importOriginal` is typed as returning `unknown`, and a spread needs an object type.
    const actual = await importOriginal<Record<string, unknown>>();
    return {
        ...actual,
        ActionManager: mockActionManager,
        SixDofDragBehavior: mockSixDofDragBehavior,
        ExecuteCodeAction: mockExecuteCodeAction,
    };
});

// Import after mock is set up
const { NodeBehavior } = await import("../../src/NodeBehavior");

describe("NodeBehavior Unit Tests", () => {
    test("addDefaultBehaviors makes node pickable", () => {
        const mockScene = {
            onPointerObservable: { add: vi.fn(), remove: vi.fn() },
            onPrePointerObservable: { add: vi.fn(), remove: vi.fn() },
            pointerX: 0,
            pointerY: 0,
            activeCamera: { position: { x: 0, y: 0, z: 10 } },
            createPickingRay: vi.fn(),
        } as unknown as Parameters<typeof NodeBehavior.addDefaultBehaviors>[1];

        const mockNode = {
            mesh: {
                isPickable: false,
                addBehavior: vi.fn(),
                actionManager: null,
                getScene: () => mockScene,
                position: { x: 0, y: 0, z: 0 },
            },
            parentGraph: {
                getStyles: vi.fn(),
                getScene: () => mockScene,
                setRunning: vi.fn(),
                getConfig: vi.fn().mockReturnValue({ xr: undefined }),
                getLayoutManager: () => ({
                    layoutEngine: { setNodePosition: vi.fn() },
                }),
                getDataManager: () => ({
                    addNodes: vi.fn(),
                    addEdges: vi.fn(),
                }),
            },
        } as unknown as Parameters<typeof NodeBehavior.addDefaultBehaviors>[0];

        NodeBehavior.addDefaultBehaviors(mockNode);

        expect(mockNode.mesh.isPickable).toBe(true);
    });

    test("addDefaultBehaviors sets pinOnDrag from options", () => {
        const mockScene = {
            onPointerObservable: { add: vi.fn(), remove: vi.fn() },
            onPrePointerObservable: { add: vi.fn(), remove: vi.fn() },
            pointerX: 0,
            pointerY: 0,
            activeCamera: { position: { x: 0, y: 0, z: 10 } },
            createPickingRay: vi.fn(),
        } as unknown as Parameters<typeof NodeBehavior.addDefaultBehaviors>[1];

        const mockNode = {
            mesh: {
                isPickable: false,
                addBehavior: vi.fn(),
                actionManager: null,
                getScene: () => mockScene,
                position: { x: 0, y: 0, z: 0 },
            },
            parentGraph: {
                getStyles: vi.fn(),
                getScene: () => mockScene,
                setRunning: vi.fn(),
                getConfig: vi.fn().mockReturnValue({ xr: undefined }),
                getLayoutManager: () => ({
                    layoutEngine: { setNodePosition: vi.fn() },
                }),
                getDataManager: () => ({
                    addNodes: vi.fn(),
                    addEdges: vi.fn(),
                }),
            },
        } as unknown as Parameters<typeof NodeBehavior.addDefaultBehaviors>[0];

        // Test with pinOnDrag true
        NodeBehavior.addDefaultBehaviors(mockNode, { pinOnDrag: true });
        expect(mockNode.pinOnDrag).toBe(true);

        // Test with pinOnDrag false
        (mockNode as { pinOnDrag?: boolean }).pinOnDrag = undefined;
        NodeBehavior.addDefaultBehaviors(mockNode, { pinOnDrag: false });
        expect((mockNode as { pinOnDrag?: boolean }).pinOnDrag).toBe(false);

        // Test default (should be true)
        (mockNode as { pinOnDrag?: boolean }).pinOnDrag = undefined;
        NodeBehavior.addDefaultBehaviors(mockNode, {});
        expect((mockNode as { pinOnDrag?: boolean }).pinOnDrag).toBe(true);
    });

    test("addDefaultBehaviors creates action manager for click behavior", () => {
        const mockScene = {
            onPointerObservable: { add: vi.fn(), remove: vi.fn() },
            onPrePointerObservable: { add: vi.fn(), remove: vi.fn() },
            pointerX: 0,
            pointerY: 0,
            activeCamera: { position: { x: 0, y: 0, z: 10 } },
            createPickingRay: vi.fn(),
        } as unknown as Parameters<typeof NodeBehavior.addDefaultBehaviors>[1];

        const mockNode = {
            mesh: {
                isPickable: false,
                addBehavior: vi.fn(),
                actionManager: null,
                getScene: () => mockScene,
                position: { x: 0, y: 0, z: 0 },
            },
            parentGraph: {
                getStyles: vi.fn(),
                getScene: () => mockScene,
                setRunning: vi.fn(),
                getConfig: vi.fn().mockReturnValue({ xr: undefined }),
                getLayoutManager: () => ({
                    layoutEngine: { setNodePosition: vi.fn() },
                }),
                getDataManager: () => ({
                    addNodes: vi.fn(),
                    addEdges: vi.fn(),
                }),
                // Add fetch functions to trigger double-click behavior
                fetchNodes: vi.fn(),
                fetchEdges: vi.fn(),
            },
        } as unknown as Parameters<typeof NodeBehavior.addDefaultBehaviors>[0];

        NodeBehavior.addDefaultBehaviors(mockNode);

        expect(mockNode.mesh.actionManager).toBeDefined();
        expect(mockNode.mesh.actionManager?.registerAction).toHaveBeenCalled();

        // Check that double-click action was registered
        const registered = mockNode.mesh.actionManager as unknown as { actions: { _trigger: number }[] } | null;
        assert.isNotNull(registered, "the product should have assigned an action manager");
        const doubleClickAction = registered.actions.find((action) => action._trigger === DOUBLE_PICK_TRIGGER);
        expect(doubleClickAction).toBeDefined();
    });

    test("a double-click with no fetch functions adds nothing to the graph", () => {
        const dataManager = { addNodes: vi.fn(), addEdges: vi.fn() };
        const mockScene = {
            onPointerObservable: { add: vi.fn(), remove: vi.fn() },
            onPrePointerObservable: { add: vi.fn(), remove: vi.fn() },
            pointerX: 0,
            pointerY: 0,
            activeCamera: { position: { x: 0, y: 0, z: 10 } },
            createPickingRay: vi.fn(),
        } as unknown as Parameters<typeof NodeBehavior.addDefaultBehaviors>[1];

        const mockNode = {
            mesh: {
                isPickable: false,
                addBehavior: vi.fn(),
                actionManager: null,
                getScene: () => mockScene,
                position: { x: 0, y: 0, z: 0 },
            },
            parentGraph: {
                getStyles: vi.fn(),
                getScene: () => mockScene,
                setRunning: vi.fn(),
                getConfig: vi.fn().mockReturnValue({ xr: undefined }),
                getLayoutManager: () => ({
                    layoutEngine: { setNodePosition: vi.fn() },
                }),
                // ONE object, not a fresh one per call: the assertions below are about the calls
                // the handler makes, and a factory that mints a new pair of spies each time makes
                // "was not called" true whatever the product does.
                getDataManager: () => dataManager,
                // NO fetch functions
            },
        } as unknown as Parameters<typeof NodeBehavior.addDefaultBehaviors>[0];

        NodeBehavior.addDefaultBehaviors(mockNode);

        const manager = mockNode.mesh.actionManager as unknown as
            { registerAction: unknown; actions: { _trigger: number; execute?: () => void }[] } | null;
        assert.isNotNull(manager, "an action manager should still have been created");

        // The handler is registered on EVERY node and reads the fetchers when the reader
        // double-clicks, so that expansion switched on after a graph is drawn reaches the nodes
        // already on screen. "Does nothing" is therefore about what the double-click DOES, which
        // is what this test was always for: with no fetchers, nothing reaches the data manager.
        const doubleClick = manager.actions.find((action) => action._trigger === DOUBLE_PICK_TRIGGER);
        assert.isDefined(doubleClick, "the double-click handler is registered whatever the fetchers say");

        assert.doesNotThrow(() => {
            doubleClick.execute?.();
        });
        expect(dataManager.addNodes).not.toHaveBeenCalled();
        expect(dataManager.addEdges).not.toHaveBeenCalled();
    });
});
