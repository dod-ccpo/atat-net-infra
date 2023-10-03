import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
// import * as s3 from "aws-cdk-lib/aws-s3";
//import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";
import { AtatContextValue } from "./context-values";
import { NetInfraPipelineStage } from "./atat-net-infra-pipeline-stage"


// export interface NetInfraStackProps extends cdk.StackProps {
//   environmentName: string;
// }



// export class AtatNetInfraStack extends cdk.Stack {
//   constructor(scope: Construct, id: string, props: AtatWebApiStackProps) {
//     let result = null;
//     super(scope, id);


// const testBucket = new s3.Bucket(this, `NetFirewall-Bucket`, {
//   encryption: s3.BucketEncryption.S3_MANAGED,
//   enforceSSL: true,
//   blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
//   versioned: true,
//   objectLockEnabled: true,
//   objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(365)),
// }
// )}
// }


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

// class AtatNetFirewall extends cdk.Stage {
//   constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps) {
//     super(scope, id, props);

//     const atats3 = new AtatNetInfraStack(this, "Dev-Firewall", {
//       environmentName: props.environmentName,
//     });
    
//   }
// }

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
      new NetInfraPipelineStage(this, props.environmentName, {
        // vpcCidr: props.vpcCidr,
        // environmentName: props.environmentName,
        // notificationEmail: props.notificationEmail,
        env: {
          region: this.region,
          account: this.account,
        },
      })
    );
  }
}


