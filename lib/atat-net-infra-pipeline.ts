import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { Construct } from "constructs";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import { AtatContextValue } from "./context-values";
import { AtatNetInfraStack } from "../lib/atat-net-infra-stack";
// import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";

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

class AtatNetFirewall extends cdk.Stage {
  constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps) {
    super(scope, id, props);
    // const net = new AtatNetStack(this, "AtatNetworking", {
    //   vpcCidr: props.vpcCidr,
    //   vpcFlowLogBucket: props.vpcFlowLogBucket,
    // });
    const atat = new AtatNetInfraStack(this, "AtatHothApi", {
      environmentName: props.environmentName,
    });
    // const sharedData = new AtatSharedDataStack(this, "AtatSharedData");
    // const monitoredStacks: cdk.Stack[] = [net, atat];
    // if (props.notificationEmail) {
    //   monitoredStacks.push(
    //     new AtatNotificationStack(this, "AtatNotifications", {
    //       notificationEmail: props.notificationEmail,
    //       topicEncryptionKey: sharedData.encryptionKey,
    //     })
    //   );
    // }
    // cdk.Aspects.of(this).add(new GovCloudCompatibilityAspect());
    // cdk.Aspects.of(atat).add(new NIST80053R4Checks({ verbose: true }));
    // NagSuppressions.addStackSuppressions(atat, [
    //   {
    //     id: "NIST.800.53.R4-IAMNoInlinePolicy",
    //     reason: "Inline policies are used in a large number of situations by CDK constructs.",
    //   },
    // ]);
  }
}

export class AtatPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AtatPipelineStackProps) {
    super(scope, id, props);
    const synthParams = [
      AtatContextValue.ENVIRONMENT_ID.toCliArgument(props.environmentName),
      // AtatContextValue.VPC_CIDR.toCliArgument(props.vpcCidr),
      AtatContextValue.VERSION_CONTROL_BRANCH.toCliArgument(props.branch),
      AtatContextValue.NOTIFICATION_EMAIL.toCliArgument(props.notificationEmail),
    ];

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
    pipeline.addStage(
      new AtatNetFirewall(this, props.environmentName, {
        // vpcCidr: props.vpcCidr,
        environmentName: props.environmentName,
        // notificationEmail: props.notificationEmail,
        env: {
          region: this.region,
          account: this.account,
        },
      })
    );
  }
}