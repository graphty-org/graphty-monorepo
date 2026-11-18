/**
 * Capture Commands Module - the command for capturing a screenshot.
 * @module ai/commands/CaptureCommands
 */

import { z } from "zod";

import type { Graph } from "../../Graph";
import type { CommandResult, GraphCommand } from "./types";

/**
 * Command to capture a screenshot of the graph.
 */
export const captureScreenshot: GraphCommand = {
    name: "captureScreenshot",
    description:
        "Capture a screenshot of the current graph visualization. Returns a data URL that can be displayed or downloaded. Supports PNG and JPEG formats with configurable size and quality.",
    parameters: z.object({
        format: z.enum(["png", "jpeg"]).optional().describe("Image format (default: png)"),
        width: z.number().positive().optional().describe("Width of the screenshot in pixels"),
        height: z.number().positive().optional().describe("Height of the screenshot in pixels"),
        quality: z.number().min(0).max(1).optional().describe("JPEG quality 0-1 (default: 0.92)"),
        download: z.boolean().optional().describe("Whether to trigger a download (default: false)"),
    }),
    examples: [
        { input: "Take a screenshot", params: {} },
        { input: "Capture the graph as PNG", params: { format: "png" } },
        { input: "Screenshot in JPEG format", params: { format: "jpeg", quality: 0.9 } },
        { input: "High resolution screenshot", params: { width: 1920, height: 1080 } },
        { input: "Download screenshot", params: { download: true } },
    ],

    async execute(graph: Graph, params: Record<string, unknown>): Promise<CommandResult> {
        const {
            format = "png",
            width,
            height,
            quality,
            download = false,
        } = params as {
            format?: "png" | "jpeg";
            width?: number;
            height?: number;
            quality?: number;
            download?: boolean;
        };

        try {
            // Capture the screenshot using captureScreenshot
            const screenshotResult = await graph.captureScreenshot({
                format,
                width,
                height,
                quality,
            });

            // Get the data URL from the blob
            const dataUrl = await blobToDataUrl(screenshotResult.blob);

            // If download requested and we're in a browser context, trigger download
            if (download && typeof document !== "undefined") {
                const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
                const filename = `graph-screenshot-${timestamp}.${format}`;
                triggerDownload(dataUrl, filename);
            }

            return {
                success: true,
                message: `Screenshot captured successfully${download ? " and download initiated" : ""}.`,
                data: {
                    dataUrl,
                    format,
                    width,
                    height,
                    downloaded: download,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to capture screenshot: ${(error as Error).message}`,
            };
        }
    },
};

/**
 * Convert a Blob to a data URL.
 * @param blob - The blob to convert
 * @returns Promise resolving to data URL string
 */
function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result as string);
        };
        reader.onerror = () => {
            reject(new Error("Failed to convert blob to data URL"));
        };
        reader.readAsDataURL(blob);
    });
}

/**
 * Trigger a file download in the browser.
 * @param dataUrl - The data URL to download
 * @param filename - The filename for the download
 */
function triggerDownload(dataUrl: string, filename: string): void {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
}
