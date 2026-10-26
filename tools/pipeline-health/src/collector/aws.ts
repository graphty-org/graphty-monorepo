// The AWS side of the collector: SSM parameters and Cost Explorer (the table is src/dynamo.ts).

import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";

/** SecureString parameters by name; missing ones are absent from the result. */
export function ssmGetParams(client = new SSMClient({})) {
    return async (names: string[]): Promise<Record<string, string>> => {
        const r = await client.send(new GetParametersCommand({ Names: names, WithDecryption: true }));
        return Object.fromEntries((r.Parameters ?? []).flatMap((p) => (p.Name && p.Value ? [[p.Name, p.Value]] : [])));
    };
}

/** Daily unblended cost of the account from `from` (inclusive) to `to` (exclusive), ISO days. Cost Explorer lives in us-east-1. */
export function costExplorerDaily(client = new CostExplorerClient({ region: "us-east-1" })) {
    return async (from: string, to: string): Promise<{ day: string; usd: number }[]> => {
        const out: { day: string; usd: number }[] = [];
        let token: string | undefined;
        do {
            const r = await client.send(
                new GetCostAndUsageCommand({
                    TimePeriod: { Start: from, End: to },
                    Granularity: "DAILY",
                    Metrics: ["UnblendedCost"],
                    NextPageToken: token,
                }),
            );
            for (const t of r.ResultsByTime ?? [])
                if (t.TimePeriod?.Start)
                    out.push({ day: t.TimePeriod.Start, usd: Number(t.Total?.UnblendedCost?.Amount ?? 0) });
            token = r.NextPageToken;
        } while (token);
        return out;
    };
}
