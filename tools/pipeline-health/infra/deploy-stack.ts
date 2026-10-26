import { Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";

/** The CodeBuild project the collector starts when master's tools/pipeline-health changes. */
export const DEPLOY_PROJECT = "graphty-health-deploy";

/** The CDK bootstrap roles (default qualifier) the build may assume, and nothing else. */
export function bootstrapRoleArns(account: string, region: string): string[] {
    return ["deploy", "file-publishing", "lookup"].map(
        (kind) => `arn:aws:iam::${account}:role/cdk-hnb659fds-${kind}-role-${account}-${region}`,
    );
}

const BUILDSPEC = {
    version: "0.2",
    env: { variables: { GIT_LFS_SKIP_SMUDGE: "1" } },
    phases: {
        install: {
            "runtime-versions": { nodejs: "22" },
            commands: [
                'test -n "$COMMIT"',
                'git init "$CODEBUILD_SRC_DIR/src" && cd "$CODEBUILD_SRC_DIR/src"',
                "git remote add origin https://github.com/graphty-org/graphty-monorepo.git",
                'git fetch --depth 1 origin "$COMMIT"',
                "git checkout --detach FETCH_HEAD",
                // tools/pipeline-health is a standalone pnpm workspace with its own lockfile.
                "cd tools/pipeline-health",
                "corepack enable",
                "pnpm install --frozen-lockfile",
            ],
        },
        build: {
            commands: [
                // Absolute: whether a cd carries over between phases is not something to rely on.
                'cd "$CODEBUILD_SRC_DIR/src/tools/pipeline-health"',
                "npx tsc --noEmit -p .",
                "npx vitest run",
                "npx cdk deploy graphty-health --require-approval never",
            ],
        },
    },
};

/**
 * Deploys the graphty-health stack from CodeBuild. The project has no source: the collector Lambda starts a build
 * with COMMIT set to master's head when master's tools/pipeline-health tree changes, and the build clones the
 * public repository at that commit. No GitHub connection or webhook is involved.
 */
export class DeployStack extends Stack {
    constructor(scope: Construct, id: string, props: StackProps) {
        super(scope, id, props);
        const { account, region } = this;

        const role = new iam.Role(this, "BuildRole", {
            assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com", {
                conditions: { StringEquals: { "aws:SourceAccount": account } },
            }),
            description: "graphty-health deploy build: assumes only the CDK bootstrap roles",
        });
        role.addToPolicy(
            new iam.PolicyStatement({ actions: ["sts:AssumeRole"], resources: bootstrapRoleArns(account, region) }),
        );

        const logGroup = new logs.LogGroup(this, "BuildLogs", {
            logGroupName: "/graphty-health/deploy-build",
            retention: logs.RetentionDays.TWO_WEEKS,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        new codebuild.Project(this, "Deploy", {
            projectName: DEPLOY_PROJECT,
            role,
            buildSpec: codebuild.BuildSpec.fromObject(BUILDSPEC),
            environment: {
                buildImage: codebuild.LinuxArmBuildImage.AMAZON_LINUX_2023_STANDARD_3_0,
                computeType: codebuild.ComputeType.SMALL,
            },
            timeout: Duration.minutes(30),
            concurrentBuildLimit: 1,
            logging: { cloudWatch: { logGroup } },
        });
    }
}
