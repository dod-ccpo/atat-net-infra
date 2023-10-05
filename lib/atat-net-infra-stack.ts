import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
// import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";
import { AtatContextValue } from "./context-values";
import { NetInfraPipelineStage } from "./atat-net-infra-pipeline-stage"
import * as ssm from 'aws-cdk-lib/aws-ssm'

export interface AtatProps {
  environmentName: string;
  vpcCidr?: string;
  notificationEmail?: string;
  orgARN: string;
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
    const synthParams = [
      AtatContextValue.ENVIRONMENT_ID.toCliArgument(props.environmentName),
      // AtatContextValue.VPC_CIDR.toCliArgument(props.vpcCidr),
      AtatContextValue.VERSION_CONTROL_BRANCH.toCliArgument(props.branch),
      // AtatContextValue.NOTIFICATION_EMAIL.toCliArgument(props.notificationEmail),
    ];

    // Retrieve the ARN of the principal from the SSM parameter 
    const principalArnPrameterName = '/cdk/RamShare/OrgArn'
    const principalArn = ssm.StringParameter.valueFromLookup(this, principalArnPrameterName)

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub(props.repository, props.branch, {
          authentication: cdk.SecretValue.secretsManager(props.githubPatName, {
            versionId: AtatContextValue.FORCE_GITHUB_TOKEN_VERSION.resolve(this),
          }),
        }),
        commands: ["npm ci", "npm run build", "npm run -- cdk synth " + synthParams.join(" ")],
      }),
      dockerEnabledForSynth: true,
    });
    pipeline.addStage(
      new NetInfraPipelineStage(this, props.environmentName, {
        // vpcCidr: props.vpcCidr,
        //environmentName: props.environmentName,
        // notificationEmail: props.notificationEmail,
        orgARN:  props.orgARN,
        env: {
          region: this.region,
          account: this.account,
        },
      })
    );
  }
}


