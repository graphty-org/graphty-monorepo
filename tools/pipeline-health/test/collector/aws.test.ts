import type { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { describe, expect, it } from "vitest";

import { costExplorerDaily } from "../../src/collector/aws.js";

const group = (service: string, usd: string) => ({ Keys: [service], Metrics: { UnblendedCost: { Amount: usd } } });

describe("costExplorerDaily", () => {
    it("splits each day by service and sums the services into the day's total, across pages", async () => {
        const pages = [
            {
                ResultsByTime: [
                    { TimePeriod: { Start: "2026-11-01" }, Groups: [group("Amazon DynamoDB", "0.5")] },
                    { TimePeriod: { Start: "2026-11-02" }, Groups: [group("AWS Lambda", "0.1")] },
                ],
                NextPageToken: "p2",
            },
            {
                // The second page continues 2026-11-02's groups.
                ResultsByTime: [
                    {
                        TimePeriod: { Start: "2026-11-02" },
                        Groups: [group("Amazon DynamoDB", "0.25"), group("Tax", "0")],
                    },
                ],
            },
        ];
        const sent: unknown[] = [];
        const client = {
            send: (cmd: { input: unknown }) => {
                sent.push(cmd.input);
                return Promise.resolve(pages[sent.length - 1]);
            },
        } as unknown as CostExplorerClient;
        const days = await costExplorerDaily(client)("2026-11-01", "2026-11-03");
        expect(days).toEqual([
            { day: "2026-11-01", usd: 0.5, services: { "Amazon DynamoDB": 0.5 } },
            { day: "2026-11-02", usd: 0.35, services: { "AWS Lambda": 0.1, "Amazon DynamoDB": 0.25 } },
        ]);
        expect(sent[0]).toMatchObject({ GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }] });
        expect(sent[1]).toMatchObject({ NextPageToken: "p2" });
    });
});
