// The AWS side of the collector: SSM parameters, Cost Explorer and the deploy build (the table is src/dynamo.ts).

import { BatchGetBuildsCommand, CodeBuildClient, StartBuildCommand } from "@aws-sdk/client-codebuild";
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";

/**
 * SecureString parameters by name; missing ones are absent from the result.
 * @param client - the SSM client to read with
 * @returns a reader that takes parameter names and resolves to a name-to-value record
 */
export function ssmGetParams(client = new SSMClient({})): (names: string[]) => Promise<Record<string, string>> {
    return async (names: string[]): Promise<Record<string, string>> => {
        const r = await client.send(new GetParametersCommand({ Names: names, WithDecryption: true }));
        return Object.fromEntries((r.Parameters ?? []).flatMap((p) => (p.Name && p.Value ? [[p.Name, p.Value]] : [])));
    };
}

/** One day's AWS cost: the total and its split by AWS service (Cost Explorer's SERVICE names). */
export interface AwsCostDay {
    day: string;
    usd: number;
    /** Absent from a reader that does not split it. */
    services?: Record<string, number>;
}

/**
 * Daily unblended cost of the account by service, credits and refunds left out, from `from` (inclusive) to `to`
 * (exclusive), ISO days. Cost Explorer lives in us-east-1.
 * @param client - the Cost Explorer client to read with
 * @returns a reader that takes the day range and resolves to one cost row per day
 */
export function costExplorerDaily(
    client = new CostExplorerClient({ region: "us-east-1" }),
): (from: string, to: string) => Promise<AwsCostDay[]> {
    return async (from: string, to: string): Promise<AwsCostDay[]> => {
        const out = new Map<string, AwsCostDay>();
        let token: string | undefined;
        do {
            const r = await client.send(
                new GetCostAndUsageCommand({
                    TimePeriod: { Start: from, End: to },
                    Granularity: "DAILY",
                    Metrics: ["UnblendedCost"],
                    // Cost before credits and refunds, as the dashboard's AWS Budget counts it (health-stack.ts).
                    Filter: { Not: { Dimensions: { Key: "RECORD_TYPE", Values: ["Credit", "Refund"] } } },
                    // Grouped, Total is empty: the day's total is the sum of its services.
                    GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
                    NextPageToken: token,
                }),
            );
            for (const t of r.ResultsByTime ?? []) {
                const day = t.TimePeriod?.Start;
                if (!day) {
                    continue;
                }
                // A page can end inside a day's groups; the next page continues the same day.
                const row = out.get(day) ?? { day, usd: 0, services: {} };
                const services = (row.services ??= {});
                out.set(day, row);
                for (const g of t.Groups ?? []) {
                    const usd = Number(g.Metrics?.UnblendedCost?.Amount ?? 0);
                    const name = g.Keys?.[0];
                    row.usd += usd;
                    if (name && usd !== 0) {
                        services[name] = (services[name] ?? 0) + usd;
                    }
                }
            }
            token = r.NextPageToken;
        } while (token);
        return [...out.values()];
    };
}

/** The deploy build the collector starts (see `deploy` in collect.ts). */
export interface DeployBuilds {
    /** Starts a build of `commit`; returns the build id. */
    start(commit: string): Promise<string>;
    /** The build's CodeBuild status: IN_PROGRESS, SUCCEEDED, FAILED, FAULT, STOPPED or TIMED_OUT. */
    status(buildId: string): Promise<string | undefined>;
}

/**
 * The deploy build through CodeBuild.
 * @param projectName - the CodeBuild project (deploy-stack.ts)
 * @param client - the CodeBuild client
 * @returns start and status of its builds
 */
export function codeBuildDeploy(projectName: string, client = new CodeBuildClient({})): DeployBuilds {
    return {
        async start(commit) {
            const r = await client.send(
                new StartBuildCommand({
                    projectName,
                    environmentVariablesOverride: [{ name: "COMMIT", value: commit, type: "PLAINTEXT" }],
                }),
            );
            if (!r.build?.id) {
                throw new Error("StartBuild returned no build id");
            }
            return r.build.id;
        },
        async status(buildId) {
            const r = await client.send(new BatchGetBuildsCommand({ ids: [buildId] }));
            return r.builds?.[0]?.buildStatus;
        },
    };
}
