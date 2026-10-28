/**
 * @file The input system: BabylonInputSystem, the adapter the element reads Babylon's scene input
 * through, driven by real mouse, wheel and keyboard input on the canvas (test/helpers/real-input.ts,
 * `userEvent`), and MockDeviceInputSystem, the scripted stand-in, through its own simulate methods.
 */

import { Scene } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { Graph } from "../../src/Graph";
import { BabylonInputSystem } from "../../src/input/babylon-input-system";
import { MockDeviceInputSystem } from "../../src/input/mock-device-input-system";
import {
    DeviceType,
    type KeyboardInfo,
    MouseButton,
    type PointerInfo as InputPointerInfo,
    type TouchPoint,
    type WheelInfo,
} from "../../src/input/types";
import { click, hover, moveHeld, type Point, press, release, wheel } from "../helpers/real-input";
import { cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

/** A spot on the canvas, well inside it. */
const AT: Point = { x: 100, y: 80 };
/** Another spot on the canvas. */
const TO: Point = { x: 150, y: 130 };

describe("Input System Architecture", () => {
    let graph: Graph;
    let scene: Scene;
    let canvas: HTMLCanvasElement;

    beforeEach(async () => {
        graph = await createTestGraph();
        scene = graph.getScene();
        ({ canvas } = graph);
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    /**
     * Where a point on the canvas lands in the page's client coordinates, which pointer events carry.
     * @param point - The point, in CSS pixels from the canvas's top-left corner.
     * @returns Its clientX and clientY.
     */
    function clientOf(point: Point): Point {
        const rect = canvas.getBoundingClientRect();
        return { x: rect.left + point.x, y: rect.top + point.y };
    }

    describe("BabylonInputSystem", () => {
        let inputSystem: BabylonInputSystem;

        beforeEach(() => {
            inputSystem = new BabylonInputSystem(scene);
        });

        afterEach(() => {
            inputSystem.dispose();
        });

        test("has all required observables and methods", () => {
            // Verify all required observables exist
            assert.isDefined(inputSystem.onPointerMove, "onPointerMove observable should exist");
            assert.isDefined(inputSystem.onPointerDown, "onPointerDown observable should exist");
            assert.isDefined(inputSystem.onPointerUp, "onPointerUp observable should exist");
            assert.isDefined(inputSystem.onWheel, "onWheel observable should exist");
            assert.isDefined(inputSystem.onTouchStart, "onTouchStart observable should exist");
            assert.isDefined(inputSystem.onTouchMove, "onTouchMove observable should exist");
            assert.isDefined(inputSystem.onTouchEnd, "onTouchEnd observable should exist");
            assert.isDefined(inputSystem.onKeyDown, "onKeyDown observable should exist");
            assert.isDefined(inputSystem.onKeyUp, "onKeyUp observable should exist");

            // Verify state query methods exist
            assert.isFunction(inputSystem.getPointerPosition, "getPointerPosition should be a function");
            assert.isFunction(inputSystem.isPointerDown, "isPointerDown should be a function");
            assert.isFunction(inputSystem.getActiveTouches, "getActiveTouches should be a function");

            // Verify lifecycle methods exist
            assert.isFunction(inputSystem.attach, "attach should be a function");
            assert.isFunction(inputSystem.detach, "detach should be a function");
            assert.isFunction(inputSystem.dispose, "dispose should be a function");
        });

        test("converts Babylon.js pointer events", async () => {
            const recorded: { type: string; info: InputPointerInfo }[] = [];
            inputSystem.onPointerDown.add((info) => recorded.push({ type: "down", info }));
            inputSystem.onPointerMove.add((info) => recorded.push({ type: "move", info }));
            inputSystem.onPointerUp.add((info) => recorded.push({ type: "up", info }));

            // Press, move with the button held, release: real mouse input on the canvas
            await press(canvas, AT);
            await moveHeld(canvas, TO);
            await release(canvas, TO);
            const from = clientOf(AT);
            const to = clientOf(TO);

            // From the press on: `press` moves the pointer to its start first, a move of its own
            const pointerEvents = recorded.slice(recorded.findIndex((e) => e.type === "down"));

            // Verify events were converted and emitted
            assert.equal(pointerEvents.length, 3, "Should have received 3 pointer events");

            const downEvent = pointerEvents[0];
            assert.equal(downEvent.type, "down", "First event should be pointer down");
            assert.closeTo(downEvent.info.x, from.x, 1, "Down event X coordinate should be correct");
            assert.closeTo(downEvent.info.y, from.y, 1, "Down event Y coordinate should be correct");
            assert.equal(downEvent.info.button, MouseButton.Left, "Down event button should be Left");
            assert.equal(downEvent.info.deviceType, DeviceType.Mouse, "Down event device type should be Mouse");

            const moveEvent = pointerEvents[1];
            assert.equal(moveEvent.type, "move", "Second event should be pointer move");
            assert.closeTo(moveEvent.info.x, to.x, 1, "Move event X coordinate should be correct");
            assert.closeTo(moveEvent.info.y, to.y, 1, "Move event Y coordinate should be correct");

            const upEvent = pointerEvents[2];
            assert.equal(upEvent.type, "up", "Third event should be pointer up");
            assert.equal(upEvent.info.pressure, 0, "Up event pressure should be 0");
        });

        test("converts Babylon.js keyboard events", async () => {
            const keyboardEvents: { type: string; info: KeyboardInfo }[] = [];
            // Only the W key's events: holding Ctrl makes events of its own
            inputSystem.onKeyDown.add((info) => {
                if (info.key === "w") {
                    keyboardEvents.push({ type: "down", info });
                }
            });
            inputSystem.onKeyUp.add((info) => {
                if (info.key === "w") {
                    keyboardEvents.push({ type: "up", info });
                }
            });

            // Real key presses on the focused canvas: W down, Ctrl down, W up with Ctrl held
            canvas.focus();
            await userEvent.keyboard("{w>}{Control>}{/w}{/Control}");

            // Verify events were converted and emitted
            assert.equal(keyboardEvents.length, 2, "Should have received 2 keyboard events");

            const downEvent = keyboardEvents[0];
            assert.equal(downEvent.type, "down", "First event should be key down");
            assert.equal(downEvent.info.key, "w", "Down event key should be 'w'");
            assert.equal(downEvent.info.code, "KeyW", "Down event code should be 'KeyW'");
            assert.isFalse(downEvent.info.ctrlKey, "Down event ctrlKey should be false");

            const upEvent = keyboardEvents[1];
            assert.equal(upEvent.type, "up", "Second event should be key up");
            assert.isTrue(upEvent.info.ctrlKey, "Up event ctrlKey should be true");
        });

        // A turn on two axes, as a trackpad sends: Babylon raises one POINTERWHEEL per changed axis,
        // each carrying the same WheelEvent, and it must still arrive once (issue #2937).
        test("handles wheel events", async () => {
            const wheelEvents: WheelInfo[] = [];
            inputSystem.onWheel.add((info) => wheelEvents.push(info));

            // A real wheel turn over the canvas
            await wheel(canvas, AT, -100, 10);
            await vi.waitFor(() => {
                assert.isNotEmpty(wheelEvents, "the wheel event arrived");
            });

            assert.equal(wheelEvents.length, 1, "Should have received 1 wheel event");
            assert.equal(wheelEvents[0].deltaX, 10, "Wheel deltaX should be correct");
            assert.equal(wheelEvents[0].deltaY, -100, "Wheel deltaY should be correct");
            assert.equal(wheelEvents[0].deltaZ, 0, "Wheel deltaZ should be 0");
            assert.equal(wheelEvents[0].deltaMode, 0, "Wheel deltaMode should be correct");
        });

        test("tracks pointer state", async () => {
            // Initially no pointer should be down
            assert.isFalse(inputSystem.isPointerDown(), "No pointer should be down initially");
            assert.isFalse(inputSystem.isPointerDown(MouseButton.Left), "Left button should not be down initially");

            // Real mouse: press the left button on the canvas
            await press(canvas, AT);

            assert.isTrue(inputSystem.isPointerDown(), "Some pointer should be down after pointer down event");
            assert.isTrue(
                inputSystem.isPointerDown(MouseButton.Left),
                "Left button should be down after pointer down event",
            );
            assert.isFalse(inputSystem.isPointerDown(MouseButton.Right), "Right button should not be down");

            // Release it
            await release(canvas, AT);

            assert.isFalse(inputSystem.isPointerDown(), "No pointer should be down after pointer up event");
            assert.isFalse(
                inputSystem.isPointerDown(MouseButton.Left),
                "Left button should not be down after pointer up event",
            );
        });

        test("tracks pointer position", async () => {
            const initialPosition = inputSystem.getPointerPosition();
            assert.equal(initialPosition.x, 0, "Initial pointer X should be 0");
            assert.equal(initialPosition.y, 0, "Initial pointer Y should be 0");

            // Real mouse move over the canvas
            await hover(canvas, TO);
            const to = clientOf(TO);

            const newPosition = inputSystem.getPointerPosition();
            assert.closeTo(newPosition.x, to.x, 1, "Pointer X should be updated");
            assert.closeTo(newPosition.y, to.y, 1, "Pointer Y should be updated");
        });

        test("attach and detach lifecycle", () => {
            const mockElement = document.createElement("div");

            // Spy on addEventListener/removeEventListener
            const addEventListenerSpy = vi.spyOn(mockElement, "addEventListener");
            const removeEventListenerSpy = vi.spyOn(mockElement, "removeEventListener");

            // Attach should add touch event listeners
            inputSystem.attach(mockElement);

            assert.equal(addEventListenerSpy.mock.calls.length, 4, "Should add 4 touch event listeners");
            assert.isTrue(
                addEventListenerSpy.mock.calls.some((call) => call[0] === "touchstart"),
                "Should add touchstart listener",
            );
            assert.isTrue(
                addEventListenerSpy.mock.calls.some((call) => call[0] === "touchmove"),
                "Should add touchmove listener",
            );
            assert.isTrue(
                addEventListenerSpy.mock.calls.some((call) => call[0] === "touchend"),
                "Should add touchend listener",
            );
            assert.isTrue(
                addEventListenerSpy.mock.calls.some((call) => call[0] === "touchcancel"),
                "Should add touchcancel listener",
            );

            // Detach should remove event listeners
            inputSystem.detach();

            assert.equal(removeEventListenerSpy.mock.calls.length, 4, "Should remove 4 touch event listeners");
            assert.isTrue(
                removeEventListenerSpy.mock.calls.some((call) => call[0] === "touchstart"),
                "Should remove touchstart listener",
            );
            assert.isTrue(
                removeEventListenerSpy.mock.calls.some((call) => call[0] === "touchmove"),
                "Should remove touchmove listener",
            );
            assert.isTrue(
                removeEventListenerSpy.mock.calls.some((call) => call[0] === "touchend"),
                "Should remove touchend listener",
            );
            assert.isTrue(
                removeEventListenerSpy.mock.calls.some((call) => call[0] === "touchcancel"),
                "Should remove touchcancel listener",
            );
        });
    });

    describe("MockDeviceInputSystem", () => {
        let mockInputSystem: MockDeviceInputSystem;

        beforeEach(() => {
            mockInputSystem = new MockDeviceInputSystem();
            mockInputSystem.attach(canvas);
        });

        afterEach(() => {
            mockInputSystem.dispose();
        });

        test("has all required observables and methods", () => {
            // Same tests as BabylonInputSystem
            assert.isDefined(mockInputSystem.onPointerMove, "onPointerMove observable should exist");
            assert.isDefined(mockInputSystem.onPointerDown, "onPointerDown observable should exist");
            assert.isDefined(mockInputSystem.onPointerUp, "onPointerUp observable should exist");
            assert.isDefined(mockInputSystem.onWheel, "onWheel observable should exist");
            assert.isDefined(mockInputSystem.onTouchStart, "onTouchStart observable should exist");
            assert.isDefined(mockInputSystem.onTouchMove, "onTouchMove observable should exist");
            assert.isDefined(mockInputSystem.onTouchEnd, "onTouchEnd observable should exist");
            assert.isDefined(mockInputSystem.onKeyDown, "onKeyDown observable should exist");
            assert.isDefined(mockInputSystem.onKeyUp, "onKeyUp observable should exist");

            assert.isFunction(mockInputSystem.getPointerPosition, "getPointerPosition should be a function");
            assert.isFunction(mockInputSystem.isPointerDown, "isPointerDown should be a function");
            assert.isFunction(mockInputSystem.getActiveTouches, "getActiveTouches should be a function");
            assert.isFunction(mockInputSystem.attach, "attach should be a function");
            assert.isFunction(mockInputSystem.detach, "detach should be a function");
            assert.isFunction(mockInputSystem.dispose, "dispose should be a function");
        });

        test("simulates mouse events", () => {
            const events: { type: string; info: InputPointerInfo }[] = [];
            mockInputSystem.onPointerMove.add((info) => events.push({ type: "move", info }));
            mockInputSystem.onPointerDown.add((info) => events.push({ type: "down", info }));
            mockInputSystem.onPointerUp.add((info) => events.push({ type: "up", info }));

            // Simulate mouse interaction
            mockInputSystem.simulateMouseMove(100, 200);
            mockInputSystem.simulateMouseDown(MouseButton.Left);
            mockInputSystem.simulateMouseMove(150, 250);
            mockInputSystem.simulateMouseUp(MouseButton.Left);

            assert.equal(events.length, 4, "Should have received 4 mouse events");

            assert.equal(events[0].type, "move", "First event should be move");
            assert.equal(events[0].info.x, 100, "First move X should be correct");
            assert.equal(events[0].info.y, 200, "First move Y should be correct");

            assert.equal(events[1].type, "down", "Second event should be down");
            assert.equal(events[1].info.button, MouseButton.Left, "Down event button should be Left");
            assert.equal(events[1].info.deviceType, DeviceType.Mouse, "Down event device type should be Mouse");

            assert.equal(events[2].type, "move", "Third event should be move");
            assert.equal(events[2].info.x, 150, "Second move X should be correct");
            assert.equal(events[2].info.y, 250, "Second move Y should be correct");

            assert.equal(events[3].type, "up", "Fourth event should be up");
            assert.equal(events[3].info.button, MouseButton.Left, "Up event button should be Left");
        });

        test("simulates keyboard events", () => {
            const events: { type: string; info: KeyboardInfo }[] = [];
            mockInputSystem.onKeyDown.add((info) => events.push({ type: "down", info }));
            mockInputSystem.onKeyUp.add((info) => events.push({ type: "up", info }));

            // Simulate keyboard interaction
            mockInputSystem.simulateKeyDown("w");
            mockInputSystem.simulateKeyUp("w");
            mockInputSystem.simulateKeyDown("ctrl", { ctrlKey: true });

            assert.equal(events.length, 3, "Should have received 3 keyboard events");

            assert.equal(events[0].type, "down", "First event should be key down");
            assert.equal(events[0].info.key, "w", "Key should be 'w'");
            assert.equal(events[0].info.code, "KeyW", "Code should be 'KeyW'");
            assert.isFalse(events[0].info.ctrlKey, "CtrlKey should be false by default");

            assert.equal(events[1].type, "up", "Second event should be key up");
            assert.equal(events[1].info.key, "w", "Key should be 'w'");

            assert.equal(events[2].type, "down", "Third event should be key down");
            assert.equal(events[2].info.key, "ctrl", "Key should be 'ctrl'");
            assert.isTrue(events[2].info.ctrlKey, "CtrlKey should be true when specified");
        });

        test("simulates wheel events", () => {
            const events: WheelInfo[] = [];
            mockInputSystem.onWheel.add((info) => events.push(info));

            mockInputSystem.simulateWheel(-100, 10);

            assert.equal(events.length, 1, "Should have received 1 wheel event");
            assert.equal(events[0].deltaY, -100, "Wheel deltaY should be correct");
            assert.equal(events[0].deltaX, 10, "Wheel deltaX should be correct");
            assert.equal(events[0].deltaZ, 0, "Wheel deltaZ should be 0");
            assert.equal(events[0].deltaMode, 0, "Wheel deltaMode should be 0");
        });

        test("simulates touch events", () => {
            const touchStartEvents: TouchPoint[][] = [];
            const touchMoveEvents: TouchPoint[][] = [];
            const touchEndEvents: number[][] = [];

            mockInputSystem.onTouchStart.add((touches) => touchStartEvents.push(touches));
            mockInputSystem.onTouchMove.add((touches) => touchMoveEvents.push(touches));
            mockInputSystem.onTouchEnd.add((touchIds) => touchEndEvents.push(touchIds));

            // Simulate touch interaction
            mockInputSystem.simulateTouchStart([{ id: 1, x: 100, y: 200 }]);
            mockInputSystem.simulateTouchMove([{ id: 1, x: 150, y: 250 }]);
            mockInputSystem.simulateTouchEnd([1]);

            assert.equal(touchStartEvents.length, 1, "Should have received 1 touch start event");
            assert.equal(touchStartEvents[0].length, 1, "Touch start should have 1 touch");
            assert.equal(touchStartEvents[0][0].id, 1, "Touch ID should be correct");
            assert.equal(touchStartEvents[0][0].x, 100, "Touch X should be correct");
            assert.equal(touchStartEvents[0][0].y, 200, "Touch Y should be correct");

            assert.equal(touchMoveEvents.length, 1, "Should have received 1 touch move event");
            assert.equal(touchMoveEvents[0][0].x, 150, "Touch move X should be correct");
            assert.equal(touchMoveEvents[0][0].y, 250, "Touch move Y should be correct");

            assert.equal(touchEndEvents.length, 1, "Should have received 1 touch end event");
            assert.equal(touchEndEvents[0].length, 1, "Touch end should have 1 touch ID");
            assert.equal(touchEndEvents[0][0], 1, "Touch end ID should be correct");
        });

        test("tracks pointer state", () => {
            assert.isFalse(mockInputSystem.isPointerDown(), "No pointer should be down initially");

            mockInputSystem.simulateMouseDown(MouseButton.Left);
            assert.isTrue(mockInputSystem.isPointerDown(), "Pointer should be down after mouse down");
            assert.isTrue(mockInputSystem.isPointerDown(MouseButton.Left), "Left button should be down");
            assert.isFalse(mockInputSystem.isPointerDown(MouseButton.Right), "Right button should not be down");

            mockInputSystem.simulateMouseUp(MouseButton.Left);
            assert.isFalse(mockInputSystem.isPointerDown(), "No pointer should be down after mouse up");
        });

        test("tracks active touches", () => {
            assert.equal(mockInputSystem.getActiveTouches().length, 0, "No touches should be active initially");

            mockInputSystem.simulateTouchStart([
                { id: 1, x: 100, y: 200 },
                { id: 2, x: 300, y: 400 },
            ]);

            const activeTouches = mockInputSystem.getActiveTouches();
            assert.equal(activeTouches.length, 2, "Should have 2 active touches");
            assert.isTrue(
                activeTouches.some((t) => t.id === 1),
                "Touch 1 should be active",
            );
            assert.isTrue(
                activeTouches.some((t) => t.id === 2),
                "Touch 2 should be active",
            );

            mockInputSystem.simulateTouchEnd([1]);
            const remainingTouches = mockInputSystem.getActiveTouches();
            assert.equal(remainingTouches.length, 1, "Should have 1 remaining touch");
            assert.equal(remainingTouches[0].id, 2, "Touch 2 should remain active");
        });

        test("helper methods for common gestures", () => {
            const events: { type: string; info: InputPointerInfo }[] = [];
            mockInputSystem.onPointerMove.add((info) => events.push({ type: "move", info }));
            mockInputSystem.onPointerDown.add((info) => events.push({ type: "down", info }));
            mockInputSystem.onPointerUp.add((info) => events.push({ type: "up", info }));

            // Test drag simulation
            mockInputSystem.simulateDrag(0, 0, 100, 100, 5);

            // Should generate: 1 move + 1 down + 5 move steps + 1 up = 8 events
            assert.equal(events.length, 8, "Drag simulation should generate correct number of events");
            assert.equal(events[0].type, "move", "First event should be initial move");
            assert.equal(events[1].type, "down", "Second event should be mouse down");
            assert.equal(events[events.length - 1].type, "up", "Last event should be mouse up");
        });

        test("requires attachment for operation", () => {
            const unattachedSystem = new MockDeviceInputSystem();

            assert.throws(
                () => {
                    unattachedSystem.simulateMouseMove(100, 200);
                },
                "Input system not attached",
                "Should throw when not attached",
            );

            assert.throws(
                () => {
                    unattachedSystem.simulateMouseDown();
                },
                "Input system not attached",
                "Should throw for mouse down when not attached",
            );

            // Attach and verify it works
            unattachedSystem.attach(canvas);
            assert.doesNotThrow(() => {
                unattachedSystem.simulateMouseMove(100, 200);
            }, "Should not throw when attached");

            unattachedSystem.dispose();
        });

        test("reset functionality", () => {
            // Set up some state
            mockInputSystem.simulateMouseMove(100, 200);
            mockInputSystem.simulateMouseDown(MouseButton.Left);
            mockInputSystem.simulateTouchStart([{ id: 1, x: 50, y: 50 }]);
            mockInputSystem.simulateKeyDown("w");

            // Verify state exists
            const position = mockInputSystem.getPointerPosition();
            assert.equal(position.x, 100, "Pointer position should be set");
            assert.isTrue(mockInputSystem.isPointerDown(MouseButton.Left), "Mouse button should be down");
            assert.equal(mockInputSystem.getActiveTouches().length, 1, "Should have active touch");

            // Reset and verify state is cleared
            mockInputSystem.reset();

            const resetPosition = mockInputSystem.getPointerPosition();
            assert.equal(resetPosition.x, 0, "Pointer position should be reset");
            assert.equal(resetPosition.y, 0, "Pointer position Y should be reset");
            assert.isFalse(mockInputSystem.isPointerDown(), "No pointer should be down after reset");
            assert.equal(mockInputSystem.getActiveTouches().length, 0, "No touches should be active after reset");
        });
    });

    describe("Input System Interoperability", () => {
        test("Both systems implement same interface", () => {
            const babylonSystem = new BabylonInputSystem(scene);
            const mockSystem = new MockDeviceInputSystem();

            const testInterfaceCompliance = (system: BabylonInputSystem | MockDeviceInputSystem): void => {
                // Test that both systems can be used interchangeably
                assert.isDefined(system.onPointerMove, "Should have onPointerMove");
                assert.isDefined(system.onPointerDown, "Should have onPointerDown");
                assert.isDefined(system.onPointerUp, "Should have onPointerUp");
                assert.isDefined(system.onWheel, "Should have onWheel");
                assert.isDefined(system.onTouchStart, "Should have onTouchStart");
                assert.isDefined(system.onTouchMove, "Should have onTouchMove");
                assert.isDefined(system.onTouchEnd, "Should have onTouchEnd");
                assert.isDefined(system.onKeyDown, "Should have onKeyDown");
                assert.isDefined(system.onKeyUp, "Should have onKeyUp");

                assert.isFunction(system.getPointerPosition, "Should have getPointerPosition method");
                assert.isFunction(system.isPointerDown, "Should have isPointerDown method");
                assert.isFunction(system.getActiveTouches, "Should have getActiveTouches method");
                assert.isFunction(system.attach, "Should have attach method");
                assert.isFunction(system.detach, "Should have detach method");
                assert.isFunction(system.dispose, "Should have dispose method");
            };

            testInterfaceCompliance(babylonSystem);
            testInterfaceCompliance(mockSystem);

            babylonSystem.dispose();
            mockSystem.dispose();
        });

        test("Event data structures are compatible", async () => {
            const babylonSystem = new BabylonInputSystem(scene);
            const mockSystem = new MockDeviceInputSystem();
            mockSystem.attach(canvas);

            let babylonPointerInfo: InputPointerInfo | undefined;
            let mockPointerInfo: InputPointerInfo | undefined;

            babylonSystem.onPointerDown.add((info) => {
                babylonPointerInfo = info;
            });

            mockSystem.onPointerDown.add((info) => {
                mockPointerInfo = info;
            });

            // Trigger events from both systems: a real click for Babylon's, a scripted one for the mock
            await click(canvas, AT);

            mockSystem.simulateMouseDown(MouseButton.Left);

            // Both should have similar structure
            assert.isDefined(babylonPointerInfo, "Babylon system should emit pointer info");
            assert.isDefined(mockPointerInfo, "Mock system should emit pointer info");

            assert.equal(typeof babylonPointerInfo.x, "number", "Babylon pointer info should have numeric x");
            assert.equal(typeof babylonPointerInfo.y, "number", "Babylon pointer info should have numeric y");
            assert.equal(typeof babylonPointerInfo.button, "number", "Babylon pointer info should have numeric button");
            assert.equal(
                typeof babylonPointerInfo.deviceType,
                "number",
                "Babylon pointer info should have numeric deviceType",
            );

            assert.equal(typeof mockPointerInfo.x, "number", "Mock pointer info should have numeric x");
            assert.equal(typeof mockPointerInfo.y, "number", "Mock pointer info should have numeric y");
            assert.equal(typeof mockPointerInfo.button, "number", "Mock pointer info should have numeric button");
            assert.equal(
                typeof mockPointerInfo.deviceType,
                "number",
                "Mock pointer info should have numeric deviceType",
            );

            babylonSystem.dispose();
            mockSystem.dispose();
        });
    });
});
