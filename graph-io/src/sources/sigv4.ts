/**
 * The AWS Signature Version 4 signer, loaded by `credentials.awsSigV4` on first use. Not built yet:
 * the Neptune work fills it in. Until then signing rejects with E_SOURCE_UNSUPPORTED.
 */

import { failAlone } from "./fail.js";

/**
 * Sign a request with AWS SigV4.
 * @param _request - the request
 * @param _options - region, service and credentials
 * @returns never yet; rejects with E_SOURCE_UNSUPPORTED (`feature: "aws-sigv4"`)
 */
export function signRequest(_request: Request, _options: unknown): Promise<Request> {
    // throwing inside the executor rejects the promise
    return new Promise<Request>(() =>
        failAlone("E_SOURCE_UNSUPPORTED", "AWS SigV4 signing is not available yet", { feature: "aws-sigv4" }),
    );
}
