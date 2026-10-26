import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";

import { bootstrapRoleArns, DeployStack } from "../infra/deploy-stack.ts";

const env = { account: "494945606241", region: "us-east-2" };
const t = Template.fromStack(new DeployStack(new App(), "deploy", { env }));

describe("deploy stack", () => {
    it("has no GitHub connection and no webhook", () => {
        t.resourceCountIs("AWS::CodeConnections::Connection", 0);
        const [project] = Object.values(t.findResources("AWS::CodeBuild::Project"));
        expect(project.Properties.Triggers).toBeUndefined();
    });

    it("builds with no source, cloning the public repository at COMMIT, one build at a time, 30 minutes", () => {
        t.hasResourceProperties("AWS::CodeBuild::Project", {
            Name: "graphty-health-deploy",
            ConcurrentBuildLimit: 1,
            TimeoutInMinutes: 30,
            Environment: Match.objectLike({ Type: "ARM_CONTAINER", ComputeType: "BUILD_GENERAL1_SMALL" }),
            Source: Match.objectLike({
                Type: "NO_SOURCE",
                BuildSpec: Match.stringLikeRegexp(
                    'git fetch --depth 1 origin \\\\"\\$COMMIT\\\\"[\\s\\S]*cdk deploy graphty-health --require-approval never',
                ),
            }),
        });
        const [project] = Object.values(t.findResources("AWS::CodeBuild::Project"));
        const spec = JSON.parse(project.Properties.Source.BuildSpec as string);
        expect(spec.env.variables.GIT_LFS_SKIP_SMUDGE).toBe("1");
        expect(spec.phases.install.commands.join("\n")).toContain(
            "https://github.com/graphty-org/graphty-monorepo.git",
        );
        t.hasResourceProperties("AWS::Logs::LogGroup", { RetentionInDays: 14 });
    });

    it("lets the build role assume only the CDK bootstrap roles", () => {
        const statements = Object.values(t.findResources("AWS::IAM::Policy")).flatMap(
            (p) => p.Properties.PolicyDocument.Statement as { Action: string | string[]; Resource: unknown }[],
        );
        const assume = statements.filter((s) => [s.Action].flat().some((a) => a.startsWith("sts:")));
        expect(assume).toHaveLength(1);
        expect(assume[0].Resource).toEqual(bootstrapRoleArns(env.account, env.region));
        const actions = statements.flatMap((s) => [s.Action].flat());
        expect(actions.filter((a) => !/^(logs|codebuild|sts):/.test(a))).toEqual([]);
    });
});
