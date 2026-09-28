import { defineLogDestination } from "@graphty/graphty-element/extend";
import { GraphtyLogger } from "@graphty/graphty-element/logging";

/**
 * Show what the element says about its layouts, one line per record, in a panel on the page.
 * @param panel - Where the lines go.
 * @returns A function that stops it.
 */
export async function showLayoutLog(panel: HTMLElement): Promise<() => void> {
    const stop = defineLogDestination({
        id: "acme-layout-panel",
        level: "info",
        categories: ["layout"],
        write: (record) => {
            panel.append(`${record.level}: ${record.message}\n`);
        },
    });

    await GraphtyLogger.configure({ enabled: true });
    return stop;
}
