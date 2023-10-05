
import * as cdk from "aws-cdk-lib";
import { Tags } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { UserPermissionBoundary } from "./aspects/user-only-permission-boundary";
import { NagSuppressions } from "cdk-nag";
import * as cr from "aws-cdk-lib/custom-resources";

export interface ApiCertificateOptions {
  domainName: string;
  acmCertificateArn: string;
}

export interface AtatWebApiStackProps extends cdk.StackProps {
  environmentName: string;
}

export class AtatS3Bucket extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    let result = null;
    super(scope, id, props);

const accessLogsBucket = new s3.Bucket(this, "LoadBalancerAccessLogs", {
  // Elastic Load Balancing Log Delivery requires SSE-S3 and _does not_ support
  // SSE-KMS. This still ensures that log data is encrypted at rest.
  // Default retention for object lock is 365 days
  encryption: s3.BucketEncryption.S3_MANAGED,
  enforceSSL: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  versioned: true,
  objectLockEnabled: true,
  objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(365)),
});

enum Classification {
  // Used on the Cloud Trail Logs, Cloud Trail S3 bucket, and LoadBalancerAccessLogs s3 bucket
  UNCLASSIFIED = "UNCLASS",
}
Tags.of(accessLogsBucket).add("Classification", Classification.UNCLASSIFIED);

NagSuppressions.addResourceSuppressions(accessLogsBucket, [
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