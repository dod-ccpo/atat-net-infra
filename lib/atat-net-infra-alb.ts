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
    atatfirewallVpc: FirewallVpcStack;
    apiDomain: string;
}

export class AlbStack extends cdk.Stack {
    public readonly firewallVpc: ec2.IVpc;
    constructor(scope: Construct, id: string, props: AtatNetStackProps) {
        super(scope, id, props);
        this.templateOptions.description = "Creates the Application Load Balancer in the firewall VPC for inspection of the ATAT transit environment";

        // S3 bucket for ALB access logging
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

      // ACM Certificate for ALB
      const certificate = new acm.Certificate(this, "AlbDomainCertificate", {          
        domainName: props.apiDomain,
        validation: acm.CertificateValidation.fromDns()
      });

      // Target group for ALB
      const targetGroup = new elbv2.ApplicationTargetGroup(this, "TargetGroup", {
        vpc: props.atatfirewallVpc.firewallVpc,
        protocol: elbv2.ApplicationProtocol.HTTPS,
        targetType: elbv2.TargetType.IP,
        healthCheck: {
          // Unfortunately, there is not a great way to actually invoke a health route
          // on the AWS API Gateway because we would need to send some kind of header in
          // order to successfully hit our API via the endpoint. We would hve to send
          // either the Host or x-apigw-api-id headers and we can only specify paths.
          // If we at least get a response and that response is either a 200 or it's a
          // 403 (which is what API Gateway will return when we've failed to provide the
          // header), then we should be all good.
          // TODO: Perhaps mitigate this by closely monitoring the number of 4xx or 5xx
          // returned from the ALB or if the ALB receives a large number of requests that
          // never make it to the API Gateway? Other solutions may be available.
          healthyHttpCodes: "200,403",
          },
        });

      const addApplicationTargetGroupsProps: elbv2.AddApplicationTargetGroupsProps = {
          targetGroups: [targetGroup],
      };

      // ALB confirguration
      const loadBalancer = new elbv2.ApplicationLoadBalancer(this, "LoadBalancer", {
        vpc: props.atatfirewallVpc.firewallVpc,
        vpcSubnets: { subnetGroupName: 'Alb' },
        internetFacing: true,
        deletionProtection: false,
        dropInvalidHeaderFields: true,
        });
        loadBalancer.logAccessLogs(accessLogsBucket);
        loadBalancer.setAttribute("routing.http.drop_invalid_header_fields.enabled", "true");

      const listener = loadBalancer.addListener('Listener', {
          port: 443,
          open: true,
          sslPolicy: elbv2.SslPolicy.FORWARD_SECRECY_TLS12_RES_GCM,
          certificates: [certificate],
      });
      listener.addTargetGroups('VpcEndpointTg', addApplicationTargetGroupsProps )
    }
}