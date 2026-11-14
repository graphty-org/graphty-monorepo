/**
 * @file What a picture shows, counted from its pixels: how much of it is drawn (not transparent)
 * and how much of it is one strong color. The model variant tests check a thumbnail with these.
 */

/** A strong color a fixture is drawn in. */
export type PictureColor = "red" | "green" | "blue";

const CHANNEL: Readonly<Record<PictureColor, number>> = { red: 0, green: 1, blue: 2 };

/**
 * The RGBA pixels of a picture.
 * @param url - A data URL or any URL an image loads from.
 * @returns The pixels.
 */
async function pixels(url: string): Promise<Uint8ClampedArray> {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = new OffscreenCanvas(img.width, img.height);
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("no 2D context");
    }
    context.drawImage(img, 0, 0);
    return context.getImageData(0, 0, img.width, img.height).data;
}

/**
 * The share of a picture's pixels that are drawn: not fully transparent.
 * @param url - The picture.
 * @returns 0 to 1.
 */
export async function drawnShare(url: string): Promise<number> {
    const data = await pixels(url);
    let drawn = 0;
    for (let at = 3; at < data.length; at += 4) {
        drawn += data[at] > 0 ? 1 : 0;
    }
    return drawn / (data.length / 4);
}

/**
 * The share of a picture's pixels dominated by a color: drawn, with that channel at least 40
 * above each of the other two.
 * @param url - The picture.
 * @param color - The color.
 * @returns 0 to 1.
 */
export async function colorShare(url: string, color: PictureColor): Promise<number> {
    const data = await pixels(url);
    const c = CHANNEL[color];
    let matched = 0;
    for (let at = 0; at < data.length; at += 4) {
        const [o1, o2] = [0, 1, 2].filter((k) => k !== c).map((k) => data[at + k]);
        matched += data[at + 3] > 0 && data[at + c] >= o1 + 40 && data[at + c] >= o2 + 40 ? 1 : 0;
    }
    return matched / (data.length / 4);
}
