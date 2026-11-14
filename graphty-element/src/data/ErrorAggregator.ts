/**
 * Represents a single error that occurred during data loading
 */
export interface DataLoadingError {
    /** The error message */
    message: string;
    /** Optional row/line number where the error occurred */
    line?: number;
    /** Optional error category for grouping */
    category?: string;
    /** Optional field/column name related to the error */
    field?: string;
    /** Optional facts about the error, without words: what `LoadReport.errors` carries as `params` */
    params?: Readonly<Record<string, unknown>>;
}

/**
 * Summary of errors aggregated by category
 */
export interface ErrorSummary {
    /** Total number of errors */
    totalErrors: number;
    /** Errors grouped by category */
    categories: Map<string, DataLoadingError[]>;
    /** Most common error category */
    primaryCategory?: string;
    /** How many errors each category holds */
    byCategory: Record<string, number>;
    /** The fields or columns the errors name, in the order first met */
    fields: string[];
}

/**
 * Aggregates and groups errors during data loading into counts by category and field; a reader words them
 */
export class ErrorAggregator {
    private errors: DataLoadingError[] = [];
    private readonly maxErrors: number;
    private readonly errorsByCategory = new Map<string, DataLoadingError[]>();
    private readonly errorsByField = new Map<string, DataLoadingError[]>();

    /**
     * Creates a new ErrorAggregator instance.
     * @param maxErrors - Maximum number of errors to collect before stopping
     */
    constructor(maxErrors = 100) {
        this.maxErrors = maxErrors;
    }

    /**
     * Add an error to the aggregator
     * @param error The error to add
     * @returns true if error was added, false if error limit reached
     */
    addError(error: DataLoadingError): boolean {
        if (this.errors.length >= this.maxErrors) {
            return false;
        }

        this.errors.push(error);

        // Group by category
        const category = error.category ?? "unknown";

        if (!this.errorsByCategory.has(category)) {
            this.errorsByCategory.set(category, []);
        }

        const categoryErrors = this.errorsByCategory.get(category);
        if (categoryErrors) {
            categoryErrors.push(error);
        }

        // Group by field
        if (error.field) {
            if (!this.errorsByField.has(error.field)) {
                this.errorsByField.set(error.field, []);
            }

            const fieldErrors = this.errorsByField.get(error.field);
            if (fieldErrors) {
                fieldErrors.push(error);
            }
        }

        return true;
    }

    /**
     * Get the total number of errors
     * @returns The count of accumulated errors
     */
    getErrorCount(): number {
        return this.errors.length;
    }

    /**
     * Get the number of errors this aggregator collects before it stops
     * @returns The error limit
     */
    getErrorLimit(): number {
        return this.maxErrors;
    }

    /**
     * Check if error limit has been reached
     * @returns True if the maximum error count has been reached
     */
    hasReachedLimit(): boolean {
        return this.errors.length >= this.maxErrors;
    }

    /**
     * Get all errors
     * @returns Array of all accumulated errors
     */
    getErrors(): DataLoadingError[] {
        return [...this.errors];
    }

    /**
     * Get a summary of all errors
     * @returns Error summary: counts by category and the fields concerned
     */
    getSummary(): ErrorSummary {
        const totalErrors = this.errors.length;

        // Count each category and find the most common one
        let primaryCategory: string | undefined;
        let maxCategoryCount = 0;
        const byCategory: Record<string, number> = {};
        for (const [category, errors] of this.errorsByCategory) {
            byCategory[category] = errors.length;
            if (errors.length > maxCategoryCount) {
                maxCategoryCount = errors.length;
                primaryCategory = category;
            }
        }

        return {
            totalErrors,
            categories: new Map(this.errorsByCategory),
            primaryCategory,
            byCategory,
            fields: [...this.errorsByField.keys()],
        };
    }

    /**
     * Clear all errors
     */
    clear(): void {
        this.errors = [];

        this.errorsByCategory.clear();
        this.errorsByField.clear();
    }
}
