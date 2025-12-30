/**
 * Stub for @mlc-ai/web-llm
 *
 * This is a placeholder module that provides helpful error messages when
 * WebLLM functionality is accessed without the @mlc-ai/web-llm package
 * being installed.
 *
 * To use WebLLM for local AI processing, install the package:
 *   npm install @mlc-ai/web-llm
 */

function throwNotInstalledError(): never {
    throw new Error(
        "@mlc-ai/web-llm is not installed. " +
        "To use WebLLM for local AI processing, install it with: npm install @mlc-ai/web-llm",
    );
}

// Stub implementations that throw helpful errors
// Using factory functions instead of classes to avoid lint errors
export const MLCEngine = function MLCEngine(): never {
    return throwNotInstalledError();
};

export const CreateMLCEngine = function CreateMLCEngine(): never {
    return throwNotInstalledError();
};

export function prebuiltAppConfig(): never {
    return throwNotInstalledError();
}

export function hasModelInCache(): never {
    return throwNotInstalledError();
}

export function deleteModelAllInfoInCache(): never {
    return throwNotInstalledError();
}

// Default export for any other access patterns
export default {
    MLCEngine,
    CreateMLCEngine,
    prebuiltAppConfig,
    hasModelInCache,
    deleteModelAllInfoInCache,
};
