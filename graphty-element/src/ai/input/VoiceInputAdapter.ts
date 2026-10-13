/**
 * VoiceInputAdapter - Web Speech API wrapper for voice input.
 * @module ai/input/VoiceInputAdapter
 */

import type { InputAdapter, InputCallback, InputOptions } from "./types";

// Web Speech API types (not available in all browsers)
interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    length: number;
    isFinal: boolean;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    /** Chrome: recognize on the device (`SpeechRecognition.available` says whether it can). */
    processLocally?: boolean;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

/** The recognizer's constructor, with Chrome's on-device availability check where it has one. */
type SpeechRecognitionConstructor = (new () => SpeechRecognition) & {
    available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
};

// Global type declaration for browser speech API
declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

/**
 * Get the SpeechRecognition constructor if available.
 * @returns SpeechRecognition constructor or null if not supported
 */
export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
    if (typeof window === "undefined") {
        return null;
    }

    return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/** Callback for voice input start/error events */
export type VoiceStartCallback = (started: boolean, error?: string) => void;

/** Why a voice session ended: stopped by the caller, ended by the recogniser, or failed. */
type VoiceEndReason = "user" | "timeout" | "error";

/** Callback for a voice session starting (`active` true) or ending (`active` false, with a reason). */
type VoiceActiveCallback = (active: boolean, reason?: VoiceEndReason) => void;

/**
 * Voice input adapter using the Web Speech API.
 * Provides voice-to-text functionality with support for interim and final results.
 */
export class VoiceInputAdapter implements InputAdapter {
    readonly type = "voice" as const;

    private recognition: SpeechRecognition | null = null;
    private _isActive = false;
    private callbacks: InputCallback[] = [];
    private startCallbacks: VoiceStartCallback[] = [];
    private activeCallbacks: VoiceActiveCallback[] = [];
    private errorCallbacks: ((error: string) => void)[] = [];
    private failed = false;
    private ending = false;
    private readonly SpeechRecognitionCtor: SpeechRecognitionConstructor | null = null;

    /**
     * Creates a new VoiceInputAdapter instance.
     */
    constructor() {
        this.SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    }

    /**
     * Check if voice input is supported in this browser.
     * @returns True if Web Speech API is available
     */
    get isSupported(): boolean {
        return this.SpeechRecognitionCtor !== null;
    }

    /**
     * Get whether voice input is currently active.
     * @returns True if listening for voice input
     */
    get isActive(): boolean {
        return this._isActive;
    }

    /**
     * Start listening for voice input.
     * @param options - Optional configuration for the voice input session
     */
    start(options?: InputOptions): void {
        if (!this.SpeechRecognitionCtor) {
            // Not supported, silently return
            return;
        }

        // Stop any existing recognition
        if (this.recognition) {
            this.stop();
        }

        // Create new recognition instance
        this.recognition = new this.SpeechRecognitionCtor();
        this.recognition.continuous = options?.continuous ?? false;
        this.recognition.interimResults = options?.interimResults ?? true;
        this.recognition.lang = options?.language ?? "en-US";
        if (options?.processLocally === true) {
            this.recognition.processLocally = true;
        }

        // Set up event handlers
        this.failed = false;
        this.ending = false;

        this.recognition.onstart = () => {
            this._isActive = true;
            this.notifyActive(true);
            // Notify that recognition started successfully
            this.notifyStart(true);
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            this.handleResult(event);
        };

        this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            this.reportError(event.error, event.message);
            // Some errors (like "no-speech") don't stop recognition
            if (event.error === "aborted" || event.error === "not-allowed") {
                this._isActive = false;
                this.failed = true;
                // Notify that recognition failed to start
                this.notifyStart(false, event.error);
            }
        };

        this.recognition.onend = () => {
            this._isActive = false;
            this.recognition = null;
            let reason: VoiceEndReason = this.ending ? "user" : "timeout";
            if (this.failed) {
                reason = "error";
            }

            this.notifyActive(false, reason);
        };

        // Start recognition
        try {
            this.recognition.start();
        } catch (error) {
            this._isActive = false;
            this.reportError("start-failed", error);
        }
    }

    /**
     * Stop listening for voice input.
     */
    stop(): void {
        if (this.recognition) {
            // Ended here, so the recogniser's own end is not reported a second time.
            this.recognition.onend = null;

            try {
                this.recognition.stop();
            } catch {
                // Ignore errors when stopping
            }

            this.recognition = null;
            this.notifyActive(false, "user");
        }

        this._isActive = false;
    }

    /**
     * Stop listening, but keep the results the recognizer still has to deliver: they arrive through
     * {@link VoiceInputAdapter.onInput}, and the session ends through
     * {@link VoiceInputAdapter.onActiveChange} with reason `"user"` once the recognizer has finished.
     */
    end(): void {
        if (this.recognition) {
            this.ending = true;
            try {
                this.recognition.stop();
            } catch {
                // Already stopped: its end still arrives.
            }
        }
    }

    /**
     * Register a callback for every recognizer error, by the recognizer's own error name
     * (`"network"`, `"not-allowed"`, `"service-not-allowed"`, ...), and `"start-failed"` when the
     * recognizer threw on start. With one registered, errors are no longer logged to the console.
     * @param callback - Called with the error's name
     */
    onError(callback: (error: string) => void): void {
        this.errorCallbacks.push(callback);
    }

    /**
     * Register a callback for input events.
     * @param callback - Function called when voice input is received
     */
    onInput(callback: InputCallback): void {
        this.callbacks.push(callback);
    }

    /**
     * Register a callback for start/error events.
     * Called when recognition successfully starts or fails to start.
     * @param callback - Function called with (started: boolean, error?: string)
     */
    onStart(callback: VoiceStartCallback): void {
        this.startCallbacks.push(callback);
    }

    /**
     * Register a callback for every voice session starting and ending.
     * Unlike {@link VoiceInputAdapter.onStart} it stays registered across sessions.
     * @param callback - Called with (true) on start and (false, reason) on end
     */
    onActiveChange(callback: VoiceActiveCallback): void {
        this.activeCallbacks.push(callback);
    }

    /**
     * Clean up resources and remove all callbacks.
     */
    dispose(): void {
        this.stop();
        this.callbacks = [];
        this.startCallbacks = [];
        this.activeCallbacks = [];
        this.errorCallbacks = [];
    }

    /**
     * Hand an error to the error callbacks, or log it when there are none.
     * @param error - The recognizer's error name, or `"start-failed"`
     * @param detail - The recognizer's message, or what start threw
     */
    private reportError(error: string, detail: unknown): void {
        if (this.errorCallbacks.length === 0) {
            if (error === "start-failed") {
                console.error("Failed to start speech recognition:", detail);
            } else {
                console.error("Speech recognition error:", error, detail);
            }

            return;
        }

        for (const callback of this.errorCallbacks) {
            callback(error);
        }
    }

    /**
     * Notify active-change callbacks.
     * @param active - Whether a session is now running
     * @param reason - Why it ended, when it did
     */
    private notifyActive(active: boolean, reason?: VoiceEndReason): void {
        for (const callback of this.activeCallbacks) {
            callback(active, reason);
        }
    }

    /**
     * Notify start callbacks and clear them (one-shot).
     * @param started - Whether voice input started successfully
     * @param error - Optional error message if start failed
     */
    private notifyStart(started: boolean, error?: string): void {
        for (const callback of this.startCallbacks) {
            callback(started, error);
        }
        // Clear start callbacks - they're one-shot per start attempt
        this.startCallbacks = [];
    }

    /**
     * Handle speech recognition results.
     * @param event - Speech recognition event containing results
     */
    private handleResult(event: SpeechRecognitionEvent): void {
        // Process results starting from the new ones
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const { transcript } = result[0];
            const { isFinal } = result;

            // Notify all callbacks
            for (const callback of this.callbacks) {
                callback(transcript, isFinal);
            }
        }
    }
}
