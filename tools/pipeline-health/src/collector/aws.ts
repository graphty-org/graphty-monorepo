// The AWS side of the collector: SSM parameters, Cost Explorer and the deploy build (the table is src/dynamo.ts).

import { BatchGetBuildsCommand, CodeBuildClient, StartBuildCommand } from "@aws-sdk/client-codebuild";
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
