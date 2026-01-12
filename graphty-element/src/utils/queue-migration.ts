import type { OperationCategory } from "../managers/OperationQueueManager";

export interface QueueableOptions {
    /**
     * Skip the operation queue and execute immediately (for backwards compatibility)
     */
    skipQueue?: boolean;

    /**
     * Custom description for the operation (for debugging/logging)
     */
    description?: string;

    /**
     * Categories that this operation should obsolete
     */
    obsoletes?: OperationCategory[];

    /**
     * Whether to respect progress when obsoleting (don't cancel >90% complete)
     */
    respectProgress?: boolean;
}

/**
 * Algorithm-specific options (source, target, startNode, etc.)
 * These are passed through to the algorithm's configure method.
 */
export interface AlgorithmSpecificOptions {
    source?: string | number;
    target?: string | number;
    startNode?: string | number;
    sink?: string | number;
    [key: string]: unknown;
}

export interface RunAlgorithmOptions extends QueueableOptions {
    /**
     * Automatically apply suggested styles after running the algorithm
     */
    applySuggestedStyles?: boolean;

    /**
     * Algorithm-specific options (source, target, etc.)
     * These are passed to the algorithm's configure method.
     */
    algorithmOptions?: AlgorithmSpecificOptions;
}

