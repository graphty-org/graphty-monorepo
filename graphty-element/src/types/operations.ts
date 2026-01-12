/**
 * Progress information for an operation
 */
export interface OperationProgress {
    /**
     * Progress percentage (0-100)
     */
    percent: number;

    /**
     * Optional message describing current operation state
     */
    message?: string;

    /**
     * Optional phase identifier for multi-phase operations
     */
    phase?: string;

    /**
     * Timestamp when the operation started (milliseconds)
     */
    startTime: number;

    /**
     * Timestamp of last progress update (milliseconds)
     */
    lastUpdate?: number;
}

/**
 * Metadata associated with an operation
 */
export interface OperationMetadata {
    /**
     * Human-readable description of the operation
     */
    description?: string;

    /**
     * Timestamp when the operation was queued
     */
    timestamp?: number;

    /**
     * Source component or method that initiated the operation
     */
    source?: string;

    /**
     * Whether to skip automatic triggers for this operation
     */
    skipTriggers?: boolean;

    /**
     * Operation categories that this operation makes obsolete
     */
    obsoletes?: string[];

    /**
     * Function to determine if an operation should be obsoleted
     */
    shouldObsolete?: (operation: { category: string; id: string; metadata?: OperationMetadata }) => boolean;

    /**
     * Skip obsoleting running operations (only obsolete queued)
     */
    skipRunning?: boolean;

    /**
     * Don't cancel operations that are >90% complete
     */
    respectProgress?: boolean;

    /**
     * Apply obsolescence rules to cascading dependent operations
     */
    cascading?: boolean;

    /**
     * Node selector for style operations
     */
    nodeSelector?: string;

    /**
     * Edge selector for style operations
     */
    edgeSelector?: string;
}

