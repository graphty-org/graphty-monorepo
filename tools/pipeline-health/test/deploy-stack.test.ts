import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";

import { bootstrapRoleArns, DeployStack } from "../infra/deploy-stack.ts";

const env = { account: "494945606241", region: "us-east-2" };
const synth = (webhook: boolean) => Template.fromStack(new DeployStack(new App(), "deploy", { env, webhook }));

describe("deploy stack", () => {
    const t = synth(true);

    it("creates the GitHub CodeConnections connection", () => {
        t.hasResourceProperties("AWS::CodeConnections::Connection", {
            ConnectionName: "graphty-health-github",
            ProviderType: "GitHub",
        });
    });

    it("builds graphty-monorepo through the connection, one build at a time, 30 minutes", () => {
        t.hasResourceProperties("AWS::CodeBuild::Project", {
            Name: "graphty-health-deploy",
            ConcurrentBuildLimit: 1,
            TimeoutInMinutes: 30,
            Source: Match.objectLike({
                Type: "GITHUB",
                Location: "https://github.com/graphty-org/graphty-monorepo.git",
                Auth: { Type: "CODECONNECTIONS", Resource: { "Fn::GetAtt": [Match.anyValue(), "ConnectionArn"] } },
                BuildSpec: Match.stringLikeRegexp("cdk deploy graphty-health --require-approval never"),
            }),
        });
        t.hasResourceProperties("AWS::Logs::LogGroup", { RetentionInDays: 14 });
    });

    it("triggers only on master pushes under tools/pipeline-health/", () => {
        t.hasResourceProperties("AWS::CodeBuild::Project", {
            Triggers: {
                Webhook: true,
                FilterGroups: [
                    Match.arrayWith([
                        { Type: "EVENT", Pattern: "PUSH" },
                        { Type: "HEAD_REF", Pattern: "refs/heads/master" },
                        { Type: "FILE_PATH", Pattern: "^tools/pipeline-health/" },
                    ]),
                ],
            },
        });
    });

    it("has no webhook while the connection is not approved", () => {
        const project = Object.values(synth(false).findResources("AWS::CodeBuild::Project"))[0];
        expect(project.Properties.Triggers ?? { Webhook: false }).toEqual({ Webhook: false });
    });

    it("lets the build role assume only the CDK bootstrap roles", () => {
        const statements = Object.values(t.findResources("AWS::IAM::Policy")).flatMap(
            (p) => p.Properties.PolicyDocument.Statement as { Action: string | string[]; Resource: unknown }[],
        );
        const assume = statements.filter((s) => [s.Action].flat().some((a) => a.startsWith("sts:")));
        expect(assume).toHaveLength(1);
        expect(assume[0].Resource).toEqual(bootstrapRoleArns(env.account, env.region));
        const actions = statements.flatMap((s) => [s.Action].flat());
        expect(actions.filter((a) => !/^(logs|codebuild|codeconnections|codestar-connections|sts):/.test(a))).toEqual(
            [],
        );
    });
});
