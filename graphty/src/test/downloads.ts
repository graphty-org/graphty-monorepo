/**
 * Catches the downloads a real-element test starts, without saving a file.
 */

import { vi } from "vitest";

/**
 * Records every download the element starts, without saving a file.
 * @returns the downloads, filled as they happen.
 */
export function watchDownloads(): { name: string; blob: Blob }[] {
    const downloads: { name: string; blob: Blob }[] = [];
    const blobs = new Map<string, Blob>();
    const create = URL.createObjectURL.bind(URL);
    vi.spyOn(URL, "createObjectURL").mockImplementation((object: Blob | MediaSource) => {
        const url = create(object);
        if (object instanceof Blob) {
            blobs.set(url, object);
        }
        return url;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        const blob = blobs.get(this.href);
        if (this.download !== "" && blob !== undefined) {
            downloads.push({ name: this.download, blob });
        }
    });
    return downloads;
}
