import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import {  aws_networkfirewall as networkfirewall } from 'aws-cdk-lib';
import { CustomResource, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { vpc } from 'cdk-nag/lib/rules';
import { SubnetCidrBlockStateCode, VpcCidrBlockStateCode } from '@aws-sdk/client-ec2';
// import { NetworkFirewallRules } from './network-firewall-policy-stack'

export interface AtatNetStackProps extends cdk.StackProps {
    /**
     * The CIDR block to use for the VPC.
     *
     * If this is not provided, the default value from the CDK's VPC construct
     * will be used. VPCs with overlapping ranges may cause routing issues for
     * the application. This value should almost always be provided.
     */
    vpcCidr?: string;
    vpcFlowLogBucket?: string;
    environmentName?: string;
    tgwId: string;
  }
export class FirewallVpcStack extends cdk.Stack {
    public readonly egressVpc: ec2.IVpc;
    tgwSubnets: any;
    constructor(scope: Construct, id: string, props: AtatNetStackProps) {
      super(scope, id, props);
      this.templateOptions.description = "Creates the firewall VPC for inspection of the ATAT transit environment";
//
// Transit - Egress/Firewall VPC
//
      if (props.environmentName === 'Dev') {
        const egressVpc = new ec2.Vpc(this, 'Egress VPC', {
            ipAddresses: props.vpcCidr ? ec2.IpAddresses.cidr(props.vpcCidr) : undefined,
            maxAzs: 2,
            natGateways: 2,
            subnetConfiguration: [
                {
                cidrMask: 28,
                name: 'Public',
                subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                cidrMask: 27,
                name: 'Alb',
                subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                cidrMask: 28,
                name: 'Firewall',
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
                {
                cidrMask: 28,
                name: 'Transit',
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                }
            ]
        });
        this.egressVpc = egressVpc;
    } else { const egressVpc = new ec2.Vpc(this, 'Egress VPC', {
            ipAddresses: props.vpcCidr ? ec2.IpAddresses.cidr(props.vpcCidr) : undefined,
            maxAzs: 2,
            subnetConfiguration: [
                {
                cidrMask: 28,
                name: 'Transit',
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
                {
                cidrMask: 28,
                name: 'Firewall',
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ]
        });
        this.egressVpc = egressVpc;
        }
        
        const tgwAttachment = new ec2.CfnTransitGatewayAttachment(this, 'tgwAttachment', {
            transitGatewayId: props.tgwId,
            subnetIds: this.egressVpc.selectSubnets({
                subnetGroupName: 'Transit',
              }).subnetIds,
            vpcId: this.egressVpc.vpcId,
            options: {
                "ApplianceModeSupport": "enable",
            },
            tags: [
                {
                    key: 'routeTable',
                    value: 'firewall',
                },
            ],
            }
        );
    }
}