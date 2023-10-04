import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import { NagSuppressions, NIST80053R4Checks, AwsSolutionsChecks } from 'cdk-nag';


export class AtatNetS3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    let result = null;
    super(scope, id);


const testBucket = new s3.Bucket(this, `Jesse-Pipeline-Test-Bucket`, {
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  versioned: true,
  objectLockEnabled: true,
  objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(365)),
});
NagSuppressions.addResourceSuppressions(testBucket, [
  {
    id: "NIST.800.53.R4-S3BucketLoggingEnabled",
    reason: "The ideal bucket for this to log to is itself. That creates complexity with receiving other logs",
  },
  {
    id: "NIST.800.53.R4-S3BucketReplicationEnabled",
    reason: "Cross region replication is not required for this use case",
  },
  {
    id: "NIST.800.53.R4-S3BucketDefaultLockEnabled",
    reason: "Server Access Logs cannot be delivered to a bucket with Object Lock enabled",
  },
]);
}
}
