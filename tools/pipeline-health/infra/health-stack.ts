import { fileURLToPath } from "node:url";

import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps, Tags } from "aws-cdk-lib";
import * as apigw from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as budgets from "aws-cdk-lib/aws-budgets";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as scheduler from "aws-cdk-lib/aws-scheduler";
import { LambdaInvoke } from "aws-cdk-lib/aws-scheduler-targets";
import * as sns from "aws-cdk-lib/aws-sns";
import type { Construct } from "constructs";

import { DEPLOY_PROJECT } from "./deploy-stack.ts";

export const PAGE_ORIGIN = "https://health.graphty.app";
export const CI_ISSUER = "https://token.actions.githubusercontent.com";
export const CI_AUDIENCE = "graphty-health";
export const READ_THROTTLE = { rate: 20, burst: 40 };
export const WRITE_THROTTLE = { rate: 50, burst: 100 };
export const MONTHLY_BUDGET_USD = 10;
/**
 * The tag on every resource of the stack. The Budget cannot filter on it: this project's account is
 * a linked account, and Billing refuses to activate cost-allocation tags there ("Linked account
 * doesn't have access to cost allocation tags"), so a tag filter would match no cost and the Budget
 * would never fire. The Budget therefore counts the whole account; a service that moves into this
 * account must get its own project, or this Budget's limit and deny action must be revisited.
 */
export const COST_TAG = { key: "graphty-cost", value: "graphty-health" };
export const CI_ROUTES = [
    "/v1/invocations",
    "/v1/failures",
    "/v1/durations",
    "/v1/verdicts",
    "/v1/sites",
    "/v1/benchmarks",
];
/** The page's Vite dev server, allowed beside the live origin. */
export const DEV_ORIGIN = "http://localhost:5173";

export interface HealthStackProps extends StackProps {
    /** An extra CORS origin for a local dev server of the page (cdk context `devOrigin`). */
    devOrigin?: string;
}

const root = fileURLToPath(new URL("..", import.meta.url));

/** The pipeline health backend (design/ci/health-dashboard.md, sections 10 and 13). */
export class HealthStack extends Stack {
    /**
     * Defines the whole backend.
     * @param scope - the CDK app
     * @param id - the stack name
     * @param props - stack properties and the optional dev origin
     */
    constructor(scope: Construct, id: string, props: HealthStackProps = {}) {
        super(scope, id, props);
        Tags.of(this).add(COST_TAG.key, COST_TAG.value);

        const table = new dynamodb.TableV2(this, "Table", {
            tableName: "graphty-health",
            partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
            sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
            billing: dynamodb.Billing.onDemand(),
            timeToLiveAttribute: "ttl",
            deletionProtection: true,
            removalPolicy: RemovalPolicy.RETAIN,
        });

        const fn = (
            name: string,
            reserved: number,
            timeout: number,
            memorySize = 256,
            entry = name.toLowerCase(),
            functionName?: string,
        ): NodejsFunction => {
            const logGroup = new logs.LogGroup(this, `${name}Logs`, {
                retention: logs.RetentionDays.TWO_WEEKS,
                removalPolicy: RemovalPolicy.DESTROY,
            });
            const f = new NodejsFunction(this, name, {
                entry: `${root}src/handlers/${entry}.ts`,
                functionName,
                projectRoot: root,
                depsLockFilePath: `${root}pnpm-lock.yaml`,
                runtime: lambda.Runtime.NODEJS_22_X,
                architecture: lambda.Architecture.ARM_64,
                memorySize,
                timeout: Duration.seconds(timeout),
                reservedConcurrentExecutions: reserved,
                logGroup,
                environment: { TABLE_NAME: table.tableName },
                bundling: { minify: true },
            });
            f.addToRolePolicy(
                new iam.PolicyStatement({
                    actions: ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
                    resources: [
                        this.formatArn({ service: "ssm", resource: "parameter", resourceName: "graphty-health/*" }),
                    ],
                }),
            );
            f.addToRolePolicy(
                new iam.PolicyStatement({
                    actions: ["kms:Decrypt"],
                    resources: ["*"],
                    conditions: { StringEquals: { "kms:ViaService": `ssm.${this.region}.amazonaws.com` } },
                }),
            );
            return f;
        };
        // 1024 MB for the CPU share (at 256 MB a 200-row local post took 4-10 s); 28 s stays under the HTTP API 30 s.
        const ingest = fn("Ingest", 20, 28, 1024);
        const read = fn("Read", 5, 10);
        // The collector also recomputes rollups, runs the SLA engine and writes about 40 gzipped page items.
        const collector = fn("Collector", 1, 240, 512);
        // The collector's AWS money line (design section 7): Cost Explorer, read once a day.
        collector.addToRolePolicy(new iam.PolicyStatement({ actions: ["ce:GetCostAndUsage"], resources: ["*"] }));
        // The collector starts the deploy build (deploy-stack.ts) when master's tools/pipeline-health changes. The
        // project lives in the other stack: an ARN string, no cross-stack reference.
        collector.addEnvironment("DEPLOY_PROJECT", DEPLOY_PROJECT);
        collector.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ["codebuild:StartBuild", "codebuild:BatchGetBuilds"],
                resources: [
                    this.formatArn({ service: "codebuild", resource: "project", resourceName: DEPLOY_PROJECT }),
                ],
            }),
        );
        table.grantReadWriteData(ingest);
        table.grantReadData(read);
        table.grantReadWriteData(collector);
        // The four-week backfill (section 10.4): the collector's code invoked by hand with {"mode":"backfill"}, in
        // 15-minute slices that resume from a cursor, so it never holds up the scheduled cycle's one slot.
        const backfill = fn("Backfill", 1, 900, 512, "collector", "graphty-health-backfill");
        table.grantReadWriteData(backfill);

        // HTTP API: public reads, CI writes behind the GitHub OIDC JWT authorizer, local writes
        // checked by the ingest Lambda's own token comparison.
        const api = new apigw.HttpApi(this, "Api", {
            apiName: "graphty-health",
            corsPreflight: {
                allowOrigins: [PAGE_ORIGIN, DEV_ORIGIN, ...(props.devOrigin ? [props.devOrigin] : [])],
                allowMethods: [apigw.CorsHttpMethod.GET],
                maxAge: Duration.hours(1),
            },
        });
        const readTarget = new HttpLambdaIntegration("ReadTarget", read);
        const ingestTarget = new HttpLambdaIntegration("IngestTarget", ingest);
        const jwt = new HttpJwtAuthorizer("GitHubOidc", CI_ISSUER, { jwtAudience: [CI_AUDIENCE] });
        const readPaths = ["/v1/health", "/v1/status", "/v1/page/{page}", "/v1/{proxy+}"];
        const routes = [
            ...readPaths.flatMap((path) =>
                api.addRoutes({ path, methods: [apigw.HttpMethod.GET], integration: readTarget }),
            ),
            // CI posts the results service's own paths, so one client sends the same bodies to both.
            ...CI_ROUTES.flatMap((path) =>
                api.addRoutes({ path, methods: [apigw.HttpMethod.POST], integration: ingestTarget, authorizer: jwt }),
            ),
            ...api.addRoutes({ path: "/v1/local/{kind}", methods: [apigw.HttpMethod.POST], integration: ingestTarget }),
        ];
        const stage = (api.defaultStage as apigw.HttpStage).node.defaultChild as apigw.CfnStage;
        const throttle = (t: { rate: number; burst: number }): apigw.CfnStage.RouteSettingsProperty => ({
            throttlingRateLimit: t.rate,
            throttlingBurstLimit: t.burst,
        });
        stage.defaultRouteSettings = throttle(READ_THROTTLE);
        // routeSettings is untyped JSON, so CloudFormation's own (PascalCase) keys go in as is.
        const write = { ThrottlingRateLimit: WRITE_THROTTLE.rate, ThrottlingBurstLimit: WRITE_THROTTLE.burst };
        stage.routeSettings = Object.fromEntries(
            [...CI_ROUTES, "/v1/local/{kind}"].map((path) => [`POST ${path}`, write]),
        );
        for (const route of routes) {
            stage.node.addDependency(route);
        }

        new scheduler.Schedule(this, "CollectorSchedule", {
            schedule: scheduler.ScheduleExpression.rate(Duration.minutes(5)),
            target: new LambdaInvoke(collector, { retryAttempts: 0 }),
            description: "Run the pipeline health collector",
        });

        // Alarms reach the owner through SNS email, subscribed outside the code
        // (tmp/health-alarm-email.sh), so no address sits in the repository.
        const topic = new sns.Topic(this, "Alarms", { topicName: "graphty-health-alarms" });
        for (const service of ["budgets.amazonaws.com", "cloudwatch.amazonaws.com"]) {
            topic.addToResourcePolicy(
                new iam.PolicyStatement({
                    actions: ["sns:Publish"],
                    principals: [new iam.ServicePrincipal(service)],
                    resources: [topic.topicArn],
                    conditions: { StringEquals: { "aws:SourceAccount": this.account } },
                }),
            );
        }

        // Dead-man switch: no successful collector run in 20 minutes (section 13).
        const period = Duration.minutes(5);
        const deadMan = new cloudwatch.Alarm(this, "CollectorDeadMan", {
            alarmName: "graphty-health-collector-dead-man",
            alarmDescription: "No successful pipeline health collector run in 20 minutes",
            metric: new cloudwatch.MathExpression({
                expression: "inv - FILL(err, 0)",
                label: "successful runs",
                period,
                usingMetrics: {
                    inv: collector.metricInvocations({ period, statistic: "Sum" }),
                    err: collector.metricErrors({ period, statistic: "Sum" }),
                },
            }),
            threshold: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            evaluationPeriods: 4,
            datapointsToAlarm: 4,
            treatMissingData: cloudwatch.TreatMissingData.BREACHING,
        });
        deadMan.addAlarmAction(new SnsAction(topic));
        deadMan.addOkAction(new SnsAction(topic));

        // The alert path itself (section 13): sendAlerts never throws, so a revoked Pushover key or a table error
        // shows only in the run's logged result ({"alerts": {state, failed}}). Three runs in a row of that emails.
        const alertsFailing = new logs.MetricFilter(this, "AlertsFailingFilter", {
            logGroup: collector.logGroup,
            filterPattern: logs.FilterPattern.literal(
                '{ ($.alerts.state = "error") || ($.alerts.state = "not set up") || ($.alerts.failed > 0) }',
            ),
            metricNamespace: "graphty-health",
            metricName: "AlertsFailing",
            metricValue: "1",
        });
        const alertsAlarm = new cloudwatch.Alarm(this, "AlertsFailing", {
            alarmName: "graphty-health-alerts-failing",
            alarmDescription: "The pipeline health alerts could not reach Pushover for three collector runs in a row",
            metric: alertsFailing.metric({ period, statistic: "Sum" }),
            threshold: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            evaluationPeriods: 3,
            datapointsToAlarm: 3,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        alertsAlarm.addAlarmAction(new SnsAction(topic));
        alertsAlarm.addOkAction(new SnsAction(topic));

        // Spend protection, layer 2 (section 10.5): a monthly Budget that emails and, at 100%
        // actual, attaches a deny-all policy to the three Lambda roles.
        const budgetName = "graphty-health";
        const notify = (
            notificationType: string,
            threshold: number,
        ): budgets.CfnBudget.NotificationWithSubscribersProperty => ({
            notification: {
                notificationType,
                comparisonOperator: "GREATER_THAN",
                threshold,
                thresholdType: "PERCENTAGE",
            },
            subscribers: [{ subscriptionType: "SNS", address: topic.topicArn }],
        });
        const budget = new budgets.CfnBudget(this, "Budget", {
            budget: {
                budgetName,
                budgetType: "COST",
                timeUnit: "MONTHLY",
                budgetLimit: { amount: MONTHLY_BUDGET_USD, unit: "USD" },
                // Credits would hide the spend until they run out, so count cost before credits.
                // No tag filter: see COST_TAG.
                costTypes: { includeCredit: false, includeRefund: false },
            },
            notificationsWithSubscribers: [notify("ACTUAL", 50), notify("FORECASTED", 100)],
        });
        budget.node.addDependency(topic);

        const denyAll = new iam.ManagedPolicy(this, "DenyAll", {
            description: "Attached by the graphty-health Budget action at 100% of the monthly budget",
            statements: [new iam.PolicyStatement({ effect: iam.Effect.DENY, actions: ["*"], resources: ["*"] })],
        });
        const roles = [ingest, read, collector, backfill].map((f) => f.role as iam.IRole);
        const actionRole = new iam.Role(this, "BudgetActionRole", {
            assumedBy: new iam.ServicePrincipal("budgets.amazonaws.com", {
                conditions: { StringEquals: { "aws:SourceAccount": this.account } },
            }),
        });
        actionRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ["iam:AttachRolePolicy", "iam:DetachRolePolicy"],
                resources: roles.map((r) => r.roleArn),
                conditions: { ArnEquals: { "iam:PolicyARN": denyAll.managedPolicyArn } },
            }),
        );
        const action = new budgets.CfnBudgetsAction(this, "BudgetDenyAction", {
            budgetName,
            notificationType: "ACTUAL",
            actionType: "APPLY_IAM_POLICY",
            actionThreshold: { type: "PERCENTAGE", value: 100 },
            approvalModel: "AUTOMATIC",
            executionRoleArn: actionRole.roleArn,
            definition: {
                iamActionDefinition: { policyArn: denyAll.managedPolicyArn, roles: roles.map((r) => r.roleName) },
            },
            subscribers: [{ type: "SNS", address: topic.topicArn }],
        });
        action.node.addDependency(budget);

        new CfnOutput(this, "ApiUrl", { value: api.apiEndpoint });
        new CfnOutput(this, "TableName", { value: table.tableName });
        new CfnOutput(this, "TopicArn", { value: topic.topicArn });
    }
}
