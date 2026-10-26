import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { CfnConnection } from "aws-cdk-lib/aws-codeconnections";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";

export interface DeployStackProps extends StackProps {
    /**
     * Create the CodeBuild webhook. CodeBuild refuses a webhook while the connection is
     * PENDING, so this stays false until the owner approves the connection in the console.
     */
    webhook: boolean;
}

/** The CDK bootstrap roles (default qualifier) the build may assume, and nothing else. */
export function bootstrapRoleArns(account: string, region: string): string[] {
    return ["deploy", "file-publishing", "lookup"].map(
        (kind) => `arn:aws:iam::${account}:role/cdk-hnb659fds-${kind}-role-${account}-${region}`,
    );
}

const BUILDSPEC = {
    version: "0.2",
    phases: {
        install: {
            "runtime-versions": { nodejs: "22" },
            commands: ["cd tools/pipeline-health", "corepack enable", "pnpm install --frozen-lockfile"],
        },
        build: {
            commands: [
                "npx tsc --noEmit -p .",
                "npx vitest run",
                "npx cdk deploy graphty-health --require-approval never",
            ],
        },
    },
};

/**
 * Deploys the graphty-health stack from CodeBuild on every master push that touches
 * tools/pipeline-health/. Source auth is a CodeConnections GitHub connection, which the
 * L2 GitHub source cannot express, so Source.Auth is set by a property override.
 */
export class DeployStack extends Stack {
    constructor(scope: Construct, id: string, props: DeployStackProps) {
        super(scope, id, props);
        const { account, region } = this;

        const connection = new CfnConnection(this, "GitHubConnection", {
            connectionName: "graphty-health-github",
            providerType: "GitHub",
        });

        const role = new iam.Role(this, "BuildRole", {
            assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com", {
                conditions: { StringEquals: { "aws:SourceAccount": account } },
            }),
            description: "graphty-health deploy build: assumes only the CDK bootstrap roles",
        });
        role.addToPolicy(
            new iam.PolicyStatement({ actions: ["sts:AssumeRole"], resources: bootstrapRoleArns(account, region) }),
        );
        role.addToPolicy(
            new iam.PolicyStatement({
                actions: [
                    "codeconnections:GetConnection",
                    "codeconnections:GetConnectionToken",
                    "codestar-connections:GetConnection",
                    "codestar-connections:GetConnectionToken",
                    "codestar-connections:UseConnection",
                ],
                resources: [connection.attrConnectionArn],
            }),
        );

        const logGroup = new logs.LogGroup(this, "BuildLogs", {
            logGroupName: "/graphty-health/deploy-build",
            retention: logs.RetentionDays.TWO_WEEKS,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const project = new codebuild.Project(this, "Deploy", {
            projectName: "graphty-health-deploy",
            role,
            source: codebuild.Source.gitHub({
                owner: "graphty-org",
                repo: "graphty-monorepo",
                branchOrRef: "master",
                webhook: props.webhook,
                webhookFilters: props.webhook
                    ? [
                          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH)
                              .andBranchIs("master")
                              .andFilePathIs("^tools/pipeline-health/"),
                      ]
                    : undefined,
                cloneDepth: 1,
                reportBuildStatus: false,
            }),
            buildSpec: codebuild.BuildSpec.fromObject(BUILDSPEC),
            environment: {
                buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
                computeType: codebuild.ComputeType.SMALL,
            },
            timeout: Duration.minutes(30),
            concurrentBuildLimit: 1,
            logging: { cloudWatch: { logGroup } },
        });
        (project.node.defaultChild as codebuild.CfnProject).addPropertyOverride("Source.Auth", {
            Type: "CODECONNECTIONS",
            Resource: connection.attrConnectionArn,
        });
    }
}
