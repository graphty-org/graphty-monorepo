import { type Scene, type TransformNode, type WebXRDefaultExperience, WebXRState } from "@babylonjs/core";

import { GraphtyLogger, type Logger } from "../logging";
import { PivotController } from "./PivotController";
import { XRInputHandler } from "./XRInputHandler";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "camera", "xr"]);

/**
 * XRPivotCameraController manages XR camera interactions using a pivot-based system.
 *
 * This controller:
 * - Creates a PivotController to manage scene transformation
 * - Parents the XR camera to the pivot when entering XR
 * - Processes input via XRInputHandler for thumbstick and gesture controls
 *
 * The pivot-based approach allows intuitive manipulation:
 * - Rotation rotates the scene around the pivot
 * - Zoom scales the scene uniformly
 * - Pan translates the scene
 */
export class XRPivotCameraController {
    private pivotController: PivotController;
    private inputHandler: XRInputHandler;
    private xr: WebXRDefaultExperience;
    private scene: Scene;
    private frameCount = 0;

    /**
     * Creates a new XRPivotCameraController instance.
     * @param scene - The Babylon.js scene
     * @param xr - The WebXR experience instance
     */
    constructor(scene: Scene, xr: WebXRDefaultExperience) {
        this.scene = scene;
        this.xr = xr;
        this.pivotController = new PivotController(scene);
        this.inputHandler = new XRInputHandler(this.pivotController, xr);

        logger.debug("Created");

        this.setupXRListeners();
    }

    /**
     * Setup listeners for XR state changes.
     * When entering XR, parents camera to pivot and enables input.
     * When exiting XR, disables input and unparents camera.
     */
    private setupXRListeners(): void {
        logger.debug("Setting up XR state listeners");

        // Check if we're already in XR (can happen if controller is created after session started)
        const currentState = this.xr.baseExperience.state;
        logger.debug("Current XR state", { state: WebXRState[currentState] });

        if (currentState === WebXRState.IN_XR) {
            logger.debug("Already in XR, enabling immediately");
            this.enableXRMode();
        }

        this.xr.baseExperience.onStateChangedObservable.add((state) => {
            const stateName = WebXRState[state];
            logger.debug("XR state changed", { state: stateName });

            if (state === WebXRState.IN_XR) {
                this.enableXRMode();
            } else if (state === WebXRState.NOT_IN_XR) {
                this.disableXRMode();
            }
        });

        // Also listen for initial XR pose to log camera position
        this.xr.baseExperience.onInitialXRPoseSetObservable.add((xrCamera) => {
            logger.debug("Initial XR pose set", {
                cameraName: xrCamera.name,
                position: { x: xrCamera.position.x, y: xrCamera.position.y, z: xrCamera.position.z },
            });
        });
    }

    /**
     * Enable XR mode - parent camera to pivot and enable input.
     */
    private enableXRMode(): void {
        // Parent XR camera to pivot
        const { camera } = this.xr.baseExperience;
        camera.parent = this.pivotController.pivot;
        logger.debug("XR camera parented to pivot", {
            pivotName: this.pivotController.pivot.name,
            cameraName: camera.name,
        });

        // Parent hand tracking meshes to the pivot as well
        // This ensures hand meshes move with the camera when pivot transforms
        this.parentHandMeshesToPivot();

        this.inputHandler.enable();
        logger.debug("Input handler enabled");
    }

    /**
     * Parent hand tracking joint meshes to the pivot.
     * This is needed because hand meshes are created in world space,
     * but we need them to move with the camera when the pivot transforms.
     */
    private parentHandMeshesToPivot(): void {
        try {
            const { featuresManager } = this.xr.baseExperience;
            const handTracking = featuresManager.getEnabledFeature("xr-hand-tracking") as unknown;

            if (!handTracking) {
                logger.debug("No hand tracking feature to parent");
                return;
            }

            const htFeature = handTracking as {
                leftHand?: { handMesh?: { parent: unknown } };
                rightHand?: { handMesh?: { parent: unknown } };
            };

            // Parent left hand mesh if exists
            if (htFeature.leftHand?.handMesh) {
                htFeature.leftHand.handMesh.parent = this.pivotController.pivot;
                logger.debug("Left hand mesh parented to pivot");
            }

            // Parent right hand mesh if exists
            if (htFeature.rightHand?.handMesh) {
                htFeature.rightHand.handMesh.parent = this.pivotController.pivot;
                logger.debug("Right hand mesh parented to pivot");
            }

            // Also try to find and parent joint meshes
            // Joint meshes might be named "xr-hand-joint-*"
            const meshes = this.scene.meshes.filter((m) => m.name.includes("hand") || m.name.includes("Hand"));
            if (meshes.length > 0) {
                logger.debug("Found hand-related meshes", { count: meshes.length });
                for (const mesh of meshes) {
                    if (!mesh.parent) {
                        mesh.parent = this.pivotController.pivot;
                        logger.debug("Parented mesh", { name: mesh.name });
                    }
                }
            }
        } catch (error) {
            logger.warn("Error parenting hand meshes", { error: String(error) });
        }
    }

    /**
     * Disable XR mode - unparent camera and disable input.
     */
    private disableXRMode(): void {
        logger.debug("Exiting XR, disabling input");
        this.inputHandler.disable();
        this.xr.baseExperience.camera.parent = null;
    }

    /**
     * Update input handling.
     * Call this every frame in the render loop.
     */
    update(): void {
        this.frameCount++;

        // Heartbeat logging every 5 seconds (assuming ~60fps)
        if (this.frameCount % 300 === 0) {
            const { camera } = this.xr.baseExperience;
            const { pivot } = this.pivotController;
            logger.trace("Heartbeat", {
                frame: this.frameCount,
                inputEnabled: this.inputHandler.isEnabled(),
                cameraParent: camera.parent ? camera.parent.name : "null",
                pivotPos: { x: pivot.position.x, y: pivot.position.y, z: pivot.position.z },
                pivotScale: pivot.scaling.x,
            });
        }

        this.inputHandler.update();
    }

    /**
     * Get the pivot TransformNode.
     * Can be used to parent scene objects that should move with the camera.
     * @returns The pivot TransformNode
     */
    get pivot(): TransformNode {
        return this.pivotController.pivot;
    }

    /**
     * Get the PivotController instance for direct manipulation.
     * @returns The pivot controller instance
     */
    getPivotController(): PivotController {
        return this.pivotController;
    }

    /**
     * Get the XRInputHandler instance.
     * @returns The XR input handler instance
     */
    getInputHandler(): XRInputHandler {
        return this.inputHandler;
    }

    /**
     * Reset the pivot to its initial state.
     */
    reset(): void {
        this.pivotController.reset();
    }

    /**
     * Dispose of resources.
     */
    dispose(): void {
        this.inputHandler.disable();
        this.pivotController.pivot.dispose();
    }
}
