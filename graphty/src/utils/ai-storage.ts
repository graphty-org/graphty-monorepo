/**
 * AI storage utilities - localStorage keys and defaults for AI features.
 */

/** Storage key for the encryption secret in sessionStorage */
export const ENCRYPTION_KEY_STORAGE = "@graphty-ai-encryption-key";

/** Default storage prefix for API keys */
export const DEFAULT_KEY_PREFIX = "@graphty-ai-keys";

/** Default encryption password when user doesn't provide one */
export const DEFAULT_ENCRYPTION_PASSWORD = "graphty-default-key";

/** Storage key for dialog position */
export const DIALOG_POSITION_KEY = "ai-dialog-position";

/** Storage key for default provider preference */
export const DEFAULT_PROVIDER_KEY = "@graphty-ai-default-provider";

/** Dialog dimensions */
export const DIALOG_WIDTH = 400;
export const DIALOG_HEIGHT = 500;
export const DIALOG_MIN_HEIGHT = 300;

/**
 * Get saved dialog position from localStorage.
 * @returns The saved dialog position, or null if not found
 */
export function getSavedDialogPosition(): { x: number; y: number } | null {
    try {
        const saved = localStorage.getItem(DIALOG_POSITION_KEY);
        if (saved) {
            return JSON.parse(saved) as { x: number; y: number };
        }
    } catch {
        // Ignore parsing errors
    }
    return null;
}

/**
 * Save dialog position to localStorage.
 * @param position - The position object to save
 * @param position.x - The x coordinate
 * @param position.y - The y coordinate
 */
export function saveDialogPosition(position: { x: number; y: number }): void {
    localStorage.setItem(DIALOG_POSITION_KEY, JSON.stringify(position));
}

/**
 * Get default dialog position (bottom-right corner).
 * @returns The default dialog position
 */
export function getDefaultDialogPosition(): { x: number; y: number } {
    return {
        x: window.innerWidth - DIALOG_WIDTH - 20,
        y: window.innerHeight - DIALOG_HEIGHT - 20,
    };
}

/**
 * Get saved default provider from localStorage.
 * @returns The saved provider name, or null if not found
 */
export function getSavedDefaultProvider(): string | null {
    return localStorage.getItem(DEFAULT_PROVIDER_KEY);
}

/**
 * Save default provider to localStorage.
 * @param provider - The provider name to save
 */
export function saveDefaultProvider(provider: string): void {
    localStorage.setItem(DEFAULT_PROVIDER_KEY, provider);
}

/**
 * Clear default provider from localStorage.
 */
export function clearDefaultProvider(): void {
    localStorage.removeItem(DEFAULT_PROVIDER_KEY);
}
