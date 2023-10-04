

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { NagSuppressions, NIST80053R4Checks } from 'cdk-nag';
import { AtatProps } from './atat-net-infra-stack'

export interface AtatWebApiStackProps extends cdk.StackProps {
  environmentName: string;
  // network?: AtatNetStack;
  // isSandbox?: boolean;
  // apiDomain?: ApiCertificateOptions;
  // vpcFlowLogBucket?: AtatNetStack;
}

export class TransitGatewayStack extends cdk.Stack {
  public readonly transitGateway: ec2.CfnTransitGateway;
  public readonly internalRouteTable: ec2.CfnTransitGatewayRouteTable
  private readonly firewallRouteTable: ec2.CfnTransitGatewayRouteTable

  constructor(scope: Construct, id: string, props?: cdk.StackProps & AtatWebApiStackProps) {
    super(scope, id, props);

    // const atatKey = environmentName

    this.transitGateway = new ec2.CfnTransitGateway(this, 'TransitGateway', {
      amazonSideAsn: 65224,
      autoAcceptSharedAttachments: 'enable',
      description: 'TransitGateway-' + this.region,
      defaultRouteTableAssociation: 'disable',
      defaultRouteTablePropagation: 'disable',
      dnsSupport: 'enable',

      tags: [
        {
          key: 'Name',
          value: `props.environmentName-Transit-Gateway`,
        },
      ],
    });

    this.internalRouteTable = new ec2.CfnTransitGatewayRouteTable(
      this,
      'InternalRouteTable',
      {
        transitGatewayId: this.transitGateway.attrId,
        tags: [
          {
            key: 'Name',
            value: 'internal-tgw-rt',
          },
        ],
      }
    );

    this.firewallRouteTable = new ec2.CfnTransitGatewayRouteTable(
      this,
      'firewallRouteTable',
      {
        transitGatewayId: this.transitGateway.attrId,
        tags: [
          {
            key: 'Name',
            value: 'firewall-tgw-rt',
          },
        ],
      }
    );

    this.createEventHandling();
  }

  private createEventHandling() {
    const attachmentLambdaRole = new iam.Role(this, 'AttachmentLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole'
        ),
      ],

    });

    // Create an inline policy for the IAM role
    const inlinePolicy = new iam.Policy(this, 'attachmentLambdaInlinePolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
                  'ec2:AssociateTransitGatewayRouteTable',
                  'ec2:DescribeTransitGatewayAttachments',
                  'ec2:DisassociateTransitGatewayRouteTable',
                  'ec2:EnableTransitGatewayRouteTablePropagation',
                ],
          effect: iam.Effect.ALLOW,
          resources: ['*'],
        }),
      ],
    });
    // Attach the inline policy to the IAM role
    attachmentLambdaRole.attachInlinePolicy(inlinePolicy);

    // attachmentLambdaRole.addToPolicy(
    //   new iam.PolicyStatement({
    //     actions: [
    //       'ec2:AssociateTransitGatewayRouteTable',
    //       'ec2:DescribeTransitGatewayAttachments',
    //       'ec2:DisassociateTransitGatewayRouteTable',
    //       'ec2:EnableTransitGatewayRouteTablePropagation',
    //     ],
    //     effect: iam.Effect.ALLOW,
    //     resources: ['*'],
    //   }),
    // );

    NagSuppressions.addResourceSuppressions(
      inlinePolicy, [
      {
        id: "NIST.800.53.R4-IAMNoInlinePolicy",
        reason: "Inline policy holds no security threat",
      },
    ]);


    const tgwRouteLambda = new NodejsFunction(this, 'TGWAttachmentFunction', {
      entry: path.join(__dirname, 'lambda/attachment/index.ts'),
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'handler',
      role: attachmentLambdaRole,
      timeout: cdk.Duration.seconds(120),
      environment: {
        internalRouteTableID: this.internalRouteTable.ref,
        firewallRouteTableID: this.firewallRouteTable.ref,
      }
    });

    NagSuppressions.addResourceSuppressions(tgwRouteLambda, [
      {
        id: "NIST.800.53.R4-LambdaInsideVPC",
        reason: "Testing lambda, will add VPC in the future",
      }
    ]);
  

    const eventPattern = {
      source: ['aws.ec2'],
      detail: {
        eventName: ['CreateTransitGatewayVpcAttachment'],
      },
    };

    const tgwEventRule = new events.Rule(this, 'TGWAttachmentCreated', {
      eventPattern: eventPattern,
      targets: [new targets.LambdaFunction(tgwRouteLambda)],
    });
  }
}