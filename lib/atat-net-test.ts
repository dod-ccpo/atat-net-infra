import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";
import { FirewallVpcStack } from "./atat-net-infra-firewall-vpc";
import { aws_elasticloadbalancingv2_targets as elasticloadbalancingv2_targets } from 'aws-cdk-lib';
import { IpTarget } from "aws-cdk-lib/aws-elasticloadbalancingv2-targets";
import { ValidationMethod } from "aws-cdk-lib/aws-certificatemanager";

export interface AtatNetStackProps extends cdk.StackProps {
} 

export class S3Stack extends cdk.Stack {
    public readonly firewallVpc: ec2.IVpc;
    constructor(scope: Construct, id: string, props: AtatNetStackProps) {
        super(scope, id, props);
        this.templateOptions.description = "Creates the Application Load Balancer in the firewall VPC for inspection of the ATAT transit environment";

        // S3 bucket for ALB access logging
        const accessLogsBucket = new s3.Bucket(this, "test", {
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