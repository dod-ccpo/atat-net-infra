import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from 'constructs';
import { NagSuppressions } from "cdk-nag";
import * as utils from "../lib/util";

export interface AtatProps extends cdk.StackProps {
  environmentName: string;
}
export class WebApplicationFirewall extends cdk.Stack {
    public readonly webACL: string;
    constructor(scope: Construct, id: string, props: cdk.StageProps & AtatProps) {
      super(scope, id, props);
      this.templateOptions.description = "Creates the AWS Web Application Firewall Rules and Web ACL";
      
      const envName = utils.lowerCaseEnvironmentId(props.environmentName);

      // S3 bucket for WAF access logging
      const wafLogsBucket = new s3.Bucket(this, "AtatWafLogs", {
        // AWS WAF Log Delivery requires SSE-S3 
        // This still ensures that log data is encrypted at rest.
        // Default retention for object lock is 365 days
        bucketName: 'aws-waf-logs-atat-' + envName,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        versioned: true,
      });
    NagSuppressions.addResourceSuppressions(wafLogsBucket, [
    {
        id: "NIST.800.53.R4-S3BucketLoggingEnabled",
        reason: "The ideal bucket for this to log to is itself. That creates complexity with receiving other logs",
    },
    ]);

    // WAF Configuration
    if (props.environmentName === 'Dev') {

        //Creating Rules for WAF
        interface WafRule {
            Rule: wafv2.CfnWebACL.RuleProperty;
        }

        const awsManagedRules: WafRule[] = [
            {
                // Common Rule Set aligns with major portions of OWASP Core Rule Set
                Rule: {
                    name: "AWS-AWSManagedRulesCommonRuleSet",
                    priority: 2,
                    statement: {
                    managedRuleGroupStatement: {
                        vendorName: "AWS",
                        name: "AWSManagedRulesCommonRuleSet",
                    },
                    },
                    overrideAction: {
                    none: {},
                    },
                    visibilityConfig: {
                    sampledRequestsEnabled: true,
                    cloudWatchMetricsEnabled: true,
                    metricName: "AWS-AWSManagedRulesCommonRuleSet",
                    },
                },
            },
            {
                // AWS IP Reputation list includes known malicious actors/bots and is regularly updated
                Rule: {
                    name: 'AWS-AWSManagedRulesAmazonIpReputationList',
                    priority: 10,
                    statement: {
                        managedRuleGroupStatement: {
                        vendorName: 'AWS',
                        name: 'AWSManagedRulesAmazonIpReputationList',
                        },
                    },
                    overrideAction: {
                        none: {},
                    },
                    visibilityConfig: {
                        sampledRequestsEnabled: true,
                        cloudWatchMetricsEnabled: true,
                        metricName: 'AWSManagedRulesAmazonIpReputationList',
                    },
                    },
                },
            ]
        //Creating WebACL for WAF
        const webACL = new wafv2.CfnWebACL(this, "AtatWebACL", {
            defaultAction: { allow: {} },
            scope: "REGIONAL",
            visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: "WebACLCDK-Metric",
            sampledRequestsEnabled: true,
            },
            rules: awsManagedRules.map((wafRule) => wafRule.Rule),
        });
        this.webACL = webACL.attrArn

        //Creating WAF ACL Logging
        const cfnLoggingConfiguration = new wafv2.CfnLoggingConfiguration(this, "AtatWafLogging", {
              logDestinationConfigs: [wafLogsBucket.bucketArn],
              resourceArn: webACL.attrArn,
            }
        );

        } else {} // TODO: add logic for prod and pre prod at later point
    }
}