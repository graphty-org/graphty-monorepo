import { GraphtyError, type GraphtyErrorCode } from "../errors";

/**
 * The error a screenshot, a video or a clipboard copy fails with: a `GraphtyError` from the view,
 * so a consumer catches one kind of error around every capture call.
 * @param code - The machine-readable reason.
 * @param message - A sentence for logs; not part of the contract.
 * @param details - The facts behind the failure.
 * @param cause - The original failure, when this wraps one.
 * @returns The error, to throw or to return.
 */
export function captureError(
    code: GraphtyErrorCode,
    message: string,
    details?: Record<string, unknown>,
    cause?: unknown,
): GraphtyError {
    return new GraphtyError({
        code,
        message,
        source: "view",
        recoverable: code === "E_CAPTURE_FAILED" || code === "E_NOT_SETTLED",
        details,
        cause,
    });
}
