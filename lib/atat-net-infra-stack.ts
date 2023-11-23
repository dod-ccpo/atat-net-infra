import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import * as iam from "aws-cdk-lib/aws-iam";
import * as pipelines from "aws-cdk-lib/pipelines";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
// import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";
import { AtatContextValue } from "./context-values";
import { NetInfraPipelineStage } from "./atat-net-infra-pipeline-stage"
import * as ssm from 'aws-cdk-lib/aws-ssm'
import { NagSuppressions } from "cdk-nag";

export interface AtatProps {
  environmentName: string;
  vpcCidr?: string;
  //notificationEmail?: string;
  orgARN: string;
  apiDomainName: string;
  //apiDomain?: ApiCertificateOptions;
}

export interface AtatPipelineStackProps extends cdk.StackProps, AtatProps {
  branch: string;
  repository: string;
  githubPatName: string;
}

export class AtatPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatPipelineStackProps) {
    super(scope, id, props);
    this.templateOptions.description = "Creates the necessary infrastructure pipeline for ATAT transit environment";

    const synthParams = [
      AtatContextValue.ENVIRONMENT_ID.toCliArgument(props.environmentName),
      AtatContextValue.VPC_CIDR.toCliArgument(props.vpcCidr),
      AtatContextValue.ORG_ARN.toCliArgument(props.orgARN), 
      AtatContextValue.VERSION_CONTROL_BRANCH.toCliArgument(props.branch),
      AtatContextValue.API_DOMAIN_NAME.toCliArgument(props.apiDomainName),
      //AtatContextValue.NOTIFICATION_EMAIL.toCliArgument(props.notificationEmail),
    ];

    const repo = new codecommit.Repository(this, "ATAT-Repository", {
      repositoryName: "ATAT-CC-" + props.environmentName + "-Repo",
    });

    const user = new iam.User(this, "ATAT-CodeCommit-User", {});

    const policy = new iam.Policy(this, "ATAT-Gitlab-UserPolicy", {
      policyName: "ATAT-Gitlab-UserPolicy",
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["codecommit:GitPull", "codecommit:GitPush"],
          resources: [repo.repositoryArn],
        }),
      ],
    });

    NagSuppressions.addResourceSuppressions(user, [
      {
        id: "NIST.800.53.R4-IAMUserGroupMembership",
        reason: "The IAM user does not belong to any group(s)",
      },
    ]);

    policy.attachToUser(user);

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.codeCommit(repo, props.branch),
        commands: ["npm ci", "npm run build", "npm run -- cdk synth " + synthParams.join(" ")],
      }),
      dockerEnabledForSynth: true,
    });
    pipeline.addStage(
      new NetInfraPipelineStage(this, props.environmentName, {
        vpcCidr: props.vpcCidr,
        environmentName: props.environmentName,
        apiDomain: props.apiDomainName,
        //notificationEmail: props.notificationEmail,
        fullorgARN:  props.orgARN,
        env: {
          region: this.region,
          account: this.account,
        },
      })
    );
  }
}


