import { Duration, Stack, StackProps } from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";
import { GovCloudCompatibilityAspect } from "./aspects/govcloud-compatibility";
import * as s3 from "aws-cdk-lib/aws-s3";
//import { AtatNetStack } from "./atat-net-stack";
//import { AtatNotificationStack } from "./atat-notification-stack";
//import { ApiCertificateOptions, AtatWebApiStack } from "./atat-web-api-stack";
//import { NagSuppressions, NIST80053R4Checks } from "cdk-nag";
import { AtatContextValue } from "./context-values";
//import { AtatSharedDataStack } from "./atat-shared-data-stack";

// export interface AtatNetInfraStackProps extends cdk.StackProps {
//   environmentName: string;

// }

export class AtatNetInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    let result = null;
    super(scope, id);


const testBucket = new s3.Bucket(this, `NetFirewall-Bucket`, {
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  versioned: true,
  objectLockEnabled: true,
  objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(365)),
}
)}
}

// const api = new AtatRestApi(this, "S3Bucket-Firewall");

// }
