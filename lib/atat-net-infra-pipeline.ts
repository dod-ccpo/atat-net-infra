import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
//import { AtatNetStack } from "./atat-net-stack";
//import { AtatNotificationStack } from "./atat-notification-stack";
//import { ApiCertificateOptions, AtatWebApiStack } from "./atat-web-api-stack";
import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";
import { AtatContextValue } from "./context-values";
//import { AtatSharedDataStack } from "./atat-shared-data-stack";

export interface AtatProps {
  environmentName: string;
  vpcCidr?: string;
  notificationEmail?: string;
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
      AtatContextValue.VPC_CIDR.toCliArgument(props.vpcCidr),
      AtatContextValue.VERSION_CONTROL_BRANCH.toCliArgument(props.branch),
      AtatContextValue.NOTIFICATION_EMAIL.toCliArgument(props.notificationEmail),
    ];
    // if (props.apiDomain) {
    //   synthParams.push(
    //     AtatContextValue.API_DOMAIN_NAME.toCliArgument(props.apiDomain.domainName),
    //     AtatContextValue.API_CERTIFICATE_ARN.toCliArgument(props.apiDomain.acmCertificateArn)
    //   );
    // }

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      synth: new pipelines.ShellStep("Synth", {
        input: pipelines.CodePipelineSource.gitHub(props.repository, props.branch, {
          authentication: cdk.SecretValue.secretsManager(props.githubPatName, {
            versionId: AtatContextValue.FORCE_GITHUB_TOKEN_VERSION.resolve(this),
          }),
        }),
        commands: ["npm ci", "npm run build", "npm run -- cdk synth " + synthParams.join(" ")],
      }),
    });

    // pipeline.addStage(
    //   new AtatApplication(this, props.environmentName, {
    //     vpcCidr: props.vpcCidr,
    //     environmentName: props.environmentName,
    //     notificationEmail: props.notificationEmail,
    //     apiDomain: props.apiDomain,
    //     env: {
    //       region: this.region,
    //       account: this.account,
    //     },
    //   })
    // );
  }
}