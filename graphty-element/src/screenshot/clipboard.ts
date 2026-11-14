import { captureError } from "./captureError.js";
import type { ClipboardStatus } from "./types.js";

interface ClipboardResult {
    status: ClipboardStatus;
    error?: Error;
}

/**
 * Copy image to clipboard. Accepts either a Blob or a Promise<Blob>.
 * When using Promise<Blob>, the clipboard write starts immediately (preserving user gesture),
 * and the promise resolves asynchronously.
 * @param blobOrPromise - Image blob or promise that resolves to a blob
 * @returns Clipboard operation result with status and any errors
 */
export async function copyToClipboard(blobOrPromise: Blob | Promise<Blob>): Promise<ClipboardResult> {
    // Check if we're in a secure context
    if (!globalThis.isSecureContext) {
        return {
            status: "not-secure-context",
            error: captureError("E_UNSUPPORTED", "Clipboard API requires a secure context (HTTPS)", {
                reason: "clipboard-insecure-context",
            }),
        };
    }

    // Check if clipboard API is available

    if (!navigator.clipboard) {
        return {
            status: "not-supported",
            error: captureError("E_UNSUPPORTED", "Clipboard API not supported in this browser", {
                reason: "clipboard",
            }),
        };
    }

    if (!navigator.clipboard.write) {
        return {
            status: "not-supported",
            error: captureError("E_UNSUPPORTED", "Clipboard write API not supported in this browser", {
                reason: "clipboard",
            }),
        };
    }

    // Check clipboard-write permission
    try {
        if (navigator.permissions?.query) {
            const permission = await navigator.permissions.query({
                // @ts-expect-error - clipboard-write is not yet in TypeScript types
                name: "clipboard-write",
            });

            if (permission.state === "denied") {
                return {
                    status: "permission-denied",
                    error: captureError("E_UNSUPPORTED", "Clipboard permission is denied", {
                        reason: "clipboard-permission",
                    }),
                };
            }
        }
    } catch {
        // Permission query not supported, continue anyway
    }

    try {
        // Resolve blob type - if it's a Promise, we need to determine the MIME type upfront
        const blobPromise = blobOrPromise instanceof Blob ? Promise.resolve(blobOrPromise) : blobOrPromise;

        // For promises, we assume PNG format (most common for screenshots)
        // The promise will provide the actual blob with correct type
        const mimeType = blobOrPromise instanceof Blob ? blobOrPromise.type : "image/png";

        // Create ClipboardItem with promise - this allows clipboard write to start
        // immediately while blob is still being generated
        const clipboardItem = new ClipboardItem({
            [mimeType]: blobPromise,
        });

        // Start clipboard write immediately (preserves user gesture context)
        await navigator.clipboard.write([clipboardItem]);

        return { status: "success" };
    } catch (error) {
        // Check if it's a permission error
        if (error instanceof Error && error.name === "NotAllowedError") {
            return {
                status: "permission-denied",
                error: captureError(
                    "E_UNSUPPORTED",
                    "Clipboard permission denied",
                    { reason: "clipboard-permission" },
                    error,
                ),
            };
        }

        // Other error
        return {
            status: "failed",
            error: captureError(
                "E_CAPTURE_FAILED",
                "Failed to write to clipboard",
                { media: "image", destination: "clipboard" },
                error,
            ),
        };
    }
}
