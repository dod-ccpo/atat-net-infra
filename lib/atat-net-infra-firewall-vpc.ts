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
  }

export class FirewallVpcStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AtatNetStackProps) {
      super(scope, id, props);
      this.templateOptions.description = "Creates the firewall VPC for inspection of the ATAT transit environment";

//
// Transit - Egress/Firewall VPC
//
      const egressVpc = new ec2.Vpc(this, 'Egress VPC', {
        ipAddresses: props.vpcCidr ? ec2.IpAddresses.cidr(props.vpcCidr) : undefined,
        maxAzs: 2,
        // natGateways: 2,
        subnetConfiguration: [
        //     {
        //     cidrMask: 28,
        //     name: 'Public',
        //     subnetType: ec2.SubnetType.PUBLIC,
        //   },
          {
            cidrMask: 28,
            name: 'Transit',
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          },
          {
            cidrMask: 28,
            name: 'Private',
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          }
        ]
      });

      if (props.environmentName === 'Dev') {
        // const baseCidr = egressVpc.vpcCidrBlock;
        // const cidrMask = 28;
        for (let i = 0; i < egressVpc.availabilityZones.length; i++) {
            // const subnetCidrBlock = `${baseCidr.slice(0, -3)}.${i * (1 << (32 - cidrMask))}`;
            const subnetCidrBlock = `${egressVpc.vpcCidrBlock}/${28}`;
            
            const albPublicSubnet = new ec2.PublicSubnet(this, `PublicSubnet${i}`, {
                vpcId: egressVpc.vpcId,
                availabilityZone: egressVpc.availabilityZones[i],
                cidrBlock: subnetCidrBlock,
            });
        };
      }
    };
}


// 
// Network Firewall Endpoints
// 
  
//       const privateSubnets = egressVpc.selectSubnets({
//         subnetGroupName: 'Private',
//       });

//       let subnetList: networkfirewall.CfnFirewall.SubnetMappingProperty[] = [];
//       for (const subnet of privateSubnets.subnets) { // Iterate over individual subnets
//           const subnetMappingProperty: networkfirewall.CfnFirewall.SubnetMappingProperty = {
//               subnetId: subnet.subnetId,
//           };
//           subnetList.push(subnetMappingProperty);
//       }
      
//       // Use firewallPolicyArn as needed in this stack
//       // const firewallPolicyArn = cdk.Fn.importValue('FirewallPolicyOutputArn');

//       const firewallRules = new NetworkFirewallRules(
//         this,
//         'NetworkFirewallRules'
//       );
  
      
//       const cfnFirewall = new networkfirewall.CfnFirewall(this, 'MyCfnFirewall', {
//           firewallName: 'AtatFirewall',
//           firewallPolicyArn: firewallRules.fwPolicy.attrFirewallPolicyArn,
//           subnetMappings: subnetList,
//           // the properties below are optional
//           // ipAddressType: 'ipAddressType',
//           vpcId: egressVpc.vpcId,
      
//           // the properties below are optional
//           // deleteProtection: false,
//           // description: 'description',
//           // firewallPolicyChangeProtection: false,
//           // subnetChangeProtection: false,
//           // tags: [{
//           // key: 'key',
//           // value: 'value',
//           // }],
//       });

// // 
// // Custom Resource - Lambda
// // 
//       const routeLambdaRole = new iam.Role(this, 'RouteLambdaRole', {
//         assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
//         managedPolicies: [
//           iam.ManagedPolicy.fromAwsManagedPolicyName(
//             'service-role/AWSLambdaBasicExecutionRole'
//           ),
//         ],
//       });

//       routeLambdaRole.addToPolicy(
//         new iam.PolicyStatement({
//           effect: iam.Effect.ALLOW,
//           actions: ['network-firewall:DescribeFirewall'],
//           resources: [cfnFirewall.attrFirewallArn],
//         })
//       );

//       const customRouteLambda = new nodejs.NodejsFunction(this, 'endpoint', {
//         functionName: 'CustomRouteLambda',
//         role: routeLambdaRole,
//         timeout: Duration.seconds(30),
//       });

//       const provider = new cr.Provider(this, 'Provider', {
//         onEventHandler: customRouteLambda,
//         logRetention: logs.RetentionDays.ONE_DAY,
//       });

    //   egressVpc
    //     .selectSubnets({ subnetGroupName: 'Transit' })
    //     .subnets.forEach((subnet) => {
    //       const subnetName = subnet.node.path.split('/').pop(); // E.g. TransitGatewayStack/InspectionVPC/PublicSubnet1

    //       // Custom resource returns AWS Network Firewall endpoint ID in correct availability zone.
    //       const endpoint = new CustomResource(
    //         this,
    //         `AnfEndpointFor-${subnetName}`,
    //         {
    //           serviceToken: provider.serviceToken,
    //           properties: {
    //             FirewallName: cfnFirewall.firewallName,
    //             AvailabilityZone: subnet.availabilityZone,
    //           },
    //         }
    //       );

          // Create default route towards firewall endpoint from TGW subnets.
        //   new ec2.CfnRoute(this, `${subnetName}AnfRoute`, {
        //     destinationCidrBlock: '0.0.0.0/0',
        //     routeTableId: subnet.routeTable.routeTableId,
        //     vpcEndpointId: endpoint.getAttString('EndpointId'),
        //   });
        // });