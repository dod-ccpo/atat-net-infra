import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as path from 'path';
import {  aws_networkfirewall as networkfirewall } from 'aws-cdk-lib';
import { CustomResource, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { NagSuppressions, NIST80053R4Checks } from 'cdk-nag';

export interface AtatNetStackProps extends cdk.StackProps {
    /**
     * The CIDR block to use for the VPC.
     *
     * If this is not provided, the default value from the CDK's VPC construct
     * will be used. VPCs with overlapping ranges may cause routing issues for
     * the application. This value should almost always be provided.
     **/
    vpcCidr?: string;
    vpcFlowLogBucket?: string;
    environmentName?: string;
    tgwId: string;
    fwPolicy: string;
    internalRouteTableId: string;
    orgARN: string;
  }
export class FirewallVpcStack extends cdk.Stack {
    public readonly firewallVpc: ec2.IVpc;
    tgwSubnets: any;
    constructor(scope: Construct, id: string, props: AtatNetStackProps) {
      super(scope, id, props);
      this.templateOptions.description = "Creates the firewall VPC for inspection of the ATAT transit environment";
//
// Transit - Firewall VPC
//
      if (props.environmentName === 'Dev') {
        const firewallVpc = new ec2.Vpc(this, 'Firewall-Vpc', {
            ipAddresses: props.vpcCidr ? ec2.IpAddresses.cidr(props.vpcCidr) : undefined,
            restrictDefaultSecurityGroup: true,
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
        this.firewallVpc = firewallVpc;
    } else { const firewallVpc = new ec2.Vpc(this, 'Firewall-Vpc', {
            ipAddresses: props.vpcCidr ? ec2.IpAddresses.cidr(props.vpcCidr) : undefined,
            restrictDefaultSecurityGroup: true,
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
        this.firewallVpc = firewallVpc;
        }

        this.firewallVpc.addFlowLog("AllFlowLogs", {
        logFormat: [
            ec2.LogFormat.VERSION,
            ec2.LogFormat.custom("${vpc-id}"),
            ec2.LogFormat.custom("${subnet-id}"),
            ec2.LogFormat.custom("${instance-id}"),
            ec2.LogFormat.custom("${interface-id}"),
            ec2.LogFormat.custom("${account-id}"),
            ec2.LogFormat.custom("${type}"),
            ec2.LogFormat.SRC_ADDR,
            ec2.LogFormat.DST_ADDR,
            ec2.LogFormat.SRC_PORT,
            ec2.LogFormat.DST_PORT,
            ec2.LogFormat.PKT_SRC_ADDR,
            ec2.LogFormat.PKT_DST_ADDR,
            ec2.LogFormat.PROTOCOL,
            ec2.LogFormat.BYTES,
            ec2.LogFormat.PACKETS,
            ec2.LogFormat.custom("${start}"),
            ec2.LogFormat.custom("${end}"),
            ec2.LogFormat.custom("${action}"),
            ec2.LogFormat.custom("${tcp-flags}"),
            ec2.LogFormat.custom("${log-status}"),
            /* eslint-enable no-template-curly-in-string */
        ],
        destination: ec2.FlowLogDestination.toCloudWatchLogs(
            new logs.LogGroup(this, "Atat-firewall-vpc-logs", {
            retention: logs.RetentionDays.INFINITE,
            //encryptionKey: 
            })
        ),
        });

        // S3 bucket for VCP Flow logs
        const accessLogsBucket = new s3.Bucket(this, "VPC-Flow-Logs", {
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            versioned: true,
            objectLockEnabled: true,
            objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(365)),
          });

          this.firewallVpc.addFlowLog("S3FlowLogs", {
            destination: ec2.FlowLogDestination.toS3(
                accessLogsBucket
                )
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

        // TGW VPC Attachment        
        const tgwAttachment = new ec2.CfnTransitGatewayAttachment(this, 'tgwAttachment', {
            transitGatewayId: props.tgwId,
            subnetIds: this.firewallVpc.selectSubnets({
                subnetGroupName: 'Transit',
              }).subnetIds,
            vpcId: this.firewallVpc.vpcId,
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

        // Default route in  internal TGW Route Table pointing to firewall vpc attachment
        const defaultRouteTgw = new ec2.CfnTransitGatewayRoute(this, 'TGWRoute', {
            destinationCidrBlock: '0.0.0.0/0',
            transitGatewayAttachmentId: tgwAttachment.attrId,
            transitGatewayRouteTableId: props.internalRouteTableId,
        });

        // CloudWatch log group for Network Firewall logs
        const fwFlowLogsGroup = new logs.LogGroup(this, 'FwFlowLogsGroup', {
            logGroupName: 'NetworkFirewallFlowLogs',
            retention: logs.RetentionDays.INFINITE
        });
        NagSuppressions.addResourceSuppressions(
            fwFlowLogsGroup, [
            {
              id: "NIST.800.53.R4-IAMNoInlinePolicy",
              reason: "CloudWatch logs are encrypted by default",
            },
        ]);

        // Network Firewall Endpoints
        const firewallSubnets = this.firewallVpc.selectSubnets({
            subnetGroupName: 'Firewall',
        });

        let subnetList: networkfirewall.CfnFirewall.SubnetMappingProperty[] = [];
        for (const subnet of firewallSubnets.subnets) { // Iterate over individual subnets
            const subnetMappingProperty: networkfirewall.CfnFirewall.SubnetMappingProperty = {
                subnetId: subnet.subnetId,
            };
            subnetList.push(subnetMappingProperty);
        }
        
        const cfnFirewall = new networkfirewall.CfnFirewall(this, 'AtatNetFirewall', {
            firewallName: 'AtatFirewall',
            firewallPolicyArn: props.fwPolicy,
            subnetMappings: subnetList,
            vpcId: this.firewallVpc.vpcId,
        });

        // Network Firewall Logging
        const cfnLoggingConfiguration = new networkfirewall.CfnLoggingConfiguration(this, 'FirewallLoggingConfg', {
            firewallArn: cfnFirewall.ref,
            loggingConfiguration: {
              logDestinationConfigs: [
                {
                  logDestination: {
                    logGroup: fwFlowLogsGroup.logGroupName,
                  },
                  logDestinationType: 'CloudWatchLogs',
                  logType: 'FLOW',
                },
              ],
            },
        });

        /**
        * Custom Resource - Lambda to find network firewall endpoint IDs to use in subnet rouet tables
        *
        * The reason a custom reasoure is need to find the network firewall endpoint IDs is outlined in 
        * below link:
        * https://github.com/aws-cloudformation/aws-cloudformation-resource-providers-networkfirewall/issues/15
        * 
        **/

        const routeLambdaRole = new iam.Role(this, 'RouteLambdaRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName(
                'service-role/AWSLambdaBasicExecutionRole'
            ),
            ],
        });
        // Create an inline policy for the IAM role
        const inlinePolicy = new iam.Policy(this, 'routeLambdaRoleInlinePolicy   ', {
            statements: [
              new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['network-firewall:DescribeFirewall'],
                resources: ['*'],
              }),
            ],
          });

        NagSuppressions.addResourceSuppressions(
            inlinePolicy, [
            {
              id: "NIST.800.53.R4-IAMNoInlinePolicy",
              reason: "Inline policy holds no security threat",
            },
        ]);

        // Attach the inline policy to the IAM role
        routeLambdaRole.attachInlinePolicy(inlinePolicy);

        const customRouteLambda = new nodejs.NodejsFunction(this, 'endpoint', {
            description: 'Lambda function as Custom Resource to fetch Network Firewall endpoint IDs',
            entry: path.join(__dirname, 'lambda/firewall/net-firewall-custom-resource.ts'),
            functionName: 'CustomRouteLambda',
            role: routeLambdaRole,
            timeout: Duration.seconds(30),
        });

        NagSuppressions.addResourceSuppressions(customRouteLambda, [
            {
              id: "NIST.800.53.R4-LambdaInsideVPC",
              reason: "Testing lambda, will add VPC in the future",
            }
          ]);

        const provider = new cr.Provider(this, 'Provider', {
            onEventHandler: customRouteLambda,
        });
        provider.node.addDependency(cfnFirewall);

        this.firewallVpc
            .selectSubnets({ subnetGroupName: 'Transit' })
            .subnets.forEach((subnet) => {
            const subnetName = subnet.node.path.split('/').pop(); // E.g. TransitGatewayStack/InspectionVPC/PublicSubnet1

            // Custom resource returns AWS Network Firewall endpoint ID in correct availability zone.
            const endpoint = new CustomResource(
                this,
                `AnfEndpointFor-${subnetName}`,
                {
                serviceToken: provider.serviceToken,
                properties: {
                    FirewallName: cfnFirewall.firewallName,
                    AvailabilityZone: subnet.availabilityZone,
                },
                }
            );

            NagSuppressions.addResourceSuppressionsByPath(
                this,
                `/${this.node.path}/Provider/framework-onEvent/Resource`,
                [
                    {
                    id: "NIST.800.53.R4-LambdaInsideVPC",
                    reason:
                        "The AwsCustomResource type does not support being placed in a VPC. " +
                        "This can only ever make limited-permissions calls that will appear in CloudTrail.",
                    },
                ]
            );

            NagSuppressions.addResourceSuppressionsByPath(
                this, 
                `/${this.node.path}/Provider/framework-onEvent/ServiceRole/DefaultPolicy/Resource`,
                [
                    {
                    id: "NIST.800.53.R4-IAMNoInlinePolicy",
                    reason: "Inline policy holds no security threat",
                    },
            ]);
    
            // Create default route towards firewall endpoint from TGW subnets.
            const ec2CfnRoute = new ec2.CfnRoute(this, `${subnetName}AnfRoute`, {
                destinationCidrBlock: '0.0.0.0/0',
                routeTableId: subnet.routeTable.routeTableId,
                vpcEndpointId: endpoint.getAttString('EndpointId'),
                });
            });

          this.firewallVpc
          .selectSubnets({ subnetGroupName: 'Firewall' })
          .subnets.forEach((subnet) => {
          const subnetName = subnet.node.path.split('/').pop(); // E.g. TransitGatewayStack/InspectionVPC/PublicSubnet1
  
          // Create summary route towards the TGW Id from firewall subnets.
          const ec2CfnRoute = new ec2.CfnRoute(this, `${subnetName}AnfRoute`, {
              destinationCidrBlock: '10.0.0.0/8',
              routeTableId: subnet.routeTable.routeTableId,
              transitGatewayId: props.tgwId,
              }).addDependency(tgwAttachment);
          });

          if (props.environmentName === 'Dev') {
            this.firewallVpc
            .selectSubnets({ subnetGroupName: 'Alb' })
            .subnets.forEach((subnet) => {
            const subnetName = subnet.node.path.split('/').pop(); // E.g. TransitGatewayStack/InspectionVPC/PublicSubnet1
    
            // Create summary route towards the TGW Id from firewall subnets.
            const ec2CfnRoute = new ec2.CfnRoute(this, `${subnetName}AnfRoute`, {
                destinationCidrBlock: '10.0.0.0/8',
                routeTableId: subnet.routeTable.routeTableId,
                transitGatewayId: props.tgwId,
                }).addDependency(tgwAttachment);
            });
          } else {} //do nothing
    }
}

