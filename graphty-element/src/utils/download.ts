/**
 * How long an object URL handed to a download outlives the click. Revoking it in the same task
 * as `click()` cancels the download on iOS and iPadOS WebKit, which reads the URL after the click
 * returns; 40 seconds is FileSaver.js's figure for the slowest engine to start reading.
 */
export const DOWNLOAD_URL_LIFETIME_MS = 40_000;

/**
 * Hand a Blob to the reader as a file download: append an anchor, click it, remove it, and
 * revoke the object URL on a later task. Every download the element starts goes through here.
 * @param blob - The file's contents.
 * @param fileName - The name the browser saves it under.
 * @internal
 */
export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, DOWNLOAD_URL_LIFETIME_MS);
}
