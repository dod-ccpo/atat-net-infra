import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from 'constructs';
import { NagSuppressions } from "cdk-nag";
export interface AtatProps extends cdk.StackProps {
  environmentName: string;
}
export class WebApplicationFirewall extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps) {
      super(scope, id, props);
      this.templateOptions.description = "Creates the AWS Web Application Firewall Rules and Web ACL";
      // S3 bucket for WAF access logging
      const wafLogsBucket = new s3.Bucket(this, "AtatWafLogs", {
        // Elastic Load Balancing Log Delivery requires SSE-S3 and _does not_ support
        // SSE-KMS. This still ensures that log data is encrypted at rest.
        // Default retention for object lock is 365 days
        bucketName: `aws-waf-logs-atat-${props.environmentName}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        versioned: true,
        objectLockEnabled: true,
        objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(365)),
      });
    NagSuppressions.addResourceSuppressions(wafLogsBucket, [
      {
        id: "NIST.800.53.R4-S3BucketLoggingEnabled",
        reason: "The ideal bucket for this to log to is itself. That creates complexity with receiving other logs",
      },
    ]);


    }
}