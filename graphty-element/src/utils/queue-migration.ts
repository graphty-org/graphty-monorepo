import type { ScopeInput } from "../catalog/types";
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
 * What `setLayout` accepts as its third argument: the queue options, and what the layout runs over.
 */
export interface SetLayoutOptions extends QueueableOptions {
    /**
     * What the layout runs over. The scope's nodes move and every other node is held still; a node
     * added after the layout starts is held too, because the members are the ones the scope had
     * when the layout started.
     *
     * CARRIED: absent keeps the scope the last layout ran over, so changing one option never
     * un-scopes a layout; `"graph"` clears it. Only a live simulation accepts one -- a layout
     * whose catalogue entry reads `scoped: false` refuses it with `E_UNSUPPORTED` -- and a scope
     * that is malformed or names a removed set is refused with `E_BAD_COMMAND`.
     */
    scope?: ScopeInput;
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

