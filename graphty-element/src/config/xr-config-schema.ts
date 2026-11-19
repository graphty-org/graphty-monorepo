import { z } from "zod";

/**
 * Zod schema for XR configuration validation
 *
 * This schema validates and provides type-safe defaults for all XR-related configuration.
 * Used by graphty-element to ensure configuration is valid before initializing XR features.
 *
 * Example usage:
 * ```typescript
 * import { xrConfigSchema } from "./config/xr-config-schema";
 *
 * const userConfig = { enabled: true };
 * const validatedConfig = xrConfigSchema.parse(userConfig);
 * // validatedConfig now has all defaults applied
 * ```
 */

/** A Quest Touch face button. */
const xrControllerButton = z.enum(["a", "b", "x", "y"]);

export const xrConfigSchema = z
    .object({
        /**
         * Enable/disable XR functionality globally. Off by default: asking a headless browser
         * which XR modes it supports can hang.
         * @default false
         */
        enabled: z.boolean().default(false),

        /**
         * XR UI button configuration
         */
        ui: z
            .object({
                /**
                 * Show VR/AR entry buttons
                 * @default true
                 */
                enabled: z.boolean().default(true),

                /**
                 * Button position on screen
                 * @default "bottom-right"
                 */
                position: z.enum(["bottom-left", "bottom-right", "top-left", "top-right"]).default("bottom-right"),

                /**
                 * Duration to show "not available" message (ms)
                 * @default 5000
                 */
                unavailableMessageDuration: z.number().positive().default(5000),

                /**
                 * Show the `unavailableLabel` message when XR is not available
                 * When false, no message is displayed if AR/VR aren't available
                 * @default false
                 */
                showAvailabilityWarning: z.boolean().default(false),

                /**
                 * Text of the button that enters VR
                 * @default "VR"
                 */
                vrLabel: z.string().default("VR"),

                /**
                 * Text of the button that enters AR
                 * @default "AR"
                 */
                arLabel: z.string().default("AR"),

                /**
                 * Text of the message shown when `showAvailabilityWarning` is on and neither VR
                 * nor AR is available
                 * @default "VR / AR NOT AVAILABLE"
                 */
                unavailableLabel: z.string().default("VR / AR NOT AVAILABLE"),
            })
            .prefault({}),

        /**
         * VR mode configuration
         */
        vr: z
            .object({
                /**
                 * Enable VR mode
                 * @default true
                 */
                enabled: z.boolean().default(true),

                /**
                 * WebXR reference space type for VR
                 * - "local": Seated/standing experience, no room bounds
                 * - "local-floor": Floor-level origin, no room bounds
                 * - "bounded-floor": Room-scale with bounds
                 * - "unbounded": Unlimited tracking space
                 * @default "local-floor"
                 */
                referenceSpaceType: z
                    .enum(["local", "local-floor", "bounded-floor", "unbounded"])
                    .default("local-floor"),

                /**
                 * Optional WebXR features to request when a VR session starts, such as "anchors".
                 * The session gets each one the device supports; the rest are skipped.
                 * @default []
                 */
                optionalFeatures: z.array(z.string()).default([]),
            })
            .prefault({}),

        /**
         * AR mode configuration
         */
        ar: z
            .object({
                /**
                 * Enable AR mode
                 * @default true
                 */
                enabled: z.boolean().default(true),

                /**
                 * WebXR reference space type for AR
                 * @default "local-floor"
                 */
                referenceSpaceType: z
                    .enum(["local", "local-floor", "bounded-floor", "unbounded"])
                    .default("local-floor"),

                /**
                 * Optional WebXR features to request when an AR session starts, such as "hit-test".
                 * The session gets each one the device supports; the rest are skipped.
                 * @default []
                 */
                optionalFeatures: z.array(z.string()).default([]),
            })
            .prefault({}),

        /**
         * XR input and interaction configuration
         */
        input: z
            .object({
                /**
                 * Enable hand tracking
                 * @default true
                 */
                handTracking: z.boolean().default(true),

                /**
                 * Enable near interaction: hands and controllers touch and grab up close, each
                 * drawing a touch orb
                 * @default true
                 */
                nearInteraction: z.boolean().default(true),

                /**
                 * Z-axis movement amplification factor
                 * Multiplies Z-axis delta during a node drag (a headset pinch or trigger drag, or a
                 * pointer drag) to make depth manipulation practical in VR. X and Y follow the hand.
                 *
                 * Example: With zAxisAmplification = 10, moving controller 0.1 units in Z
                 * will move the node 1.0 units in Z
                 * @default 10.0
                 */
                zAxisAmplification: z.number().positive().default(10),

                /**
                 * Enable Z-axis amplification in desktop mode
                 * Normally amplification only applies in XR mode, but this can enable it for desktop too
                 * @default false
                 */
                enableZAmplificationInDesktop: z.boolean().default(false),
            })
            .prefault({}),

        /**
         * The assistant in an immersive session (XRAiConfig). Optional with no default, so a
         * configuration that leaves it out parses exactly as before; its defaults apply where it
         * is read.
         */
        ai: z
            .object({
                /** Holding talk. */
                pushToTalk: z
                    .object({
                        /** The buttons held to talk; default `["b", "y"]`, empty for none. */
                        buttons: z.array(xrControllerButton).optional(),
                        /** With hands, pinch and hold a microphone orb on the wrist to talk; default true. */
                        wristOrb: z.boolean().optional(),
                    })
                    .optional(),
                /** The buttons that answer a pending approval. */
                pendingButtons: z
                    .object({
                        /** The buttons that approve; default `["a"]`, empty for none. */
                        approve: z.array(xrControllerButton).optional(),
                        /** The buttons that deny; default `["x"]`, empty for none. */
                        deny: z.array(xrControllerButton).optional(),
                    })
                    .optional(),
                /** Draw approve and deny, or one control per question choice, in the scene; default true. */
                pendingControl: z.boolean().optional(),
                /** Draw the transcript and the answer in the scene; default true. */
                panel: z.boolean().optional(),
                /** The words drawn in the scene, keyed by code; a code with no label is drawn as its icon only. */
                labels: z.record(z.string(), z.string()).optional(),
            })
            .optional(),

        /**
         * The in-headset menu (XRMenuItem): one pressable card per item, drawn beside the reader
         * when a session starts. Pressing one emits `xr-menu-select` with its `id`. Optional with
         * no default; absent or empty, no menu is drawn.
         */
        menu: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
    })
    .prefault({});

/**
 * Type for partial XR configuration (user input)
 * All fields are optional since defaults will be applied
 */
export type PartialXRConfig = z.input<typeof xrConfigSchema>;
