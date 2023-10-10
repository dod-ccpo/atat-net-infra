import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as ram  from 'aws-cdk-lib/aws-ram';
import * as ssm from 'aws-cdk-lib/aws-ssm'
import * as path from 'path';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { NagSuppressions, NIST80053R4Checks } from 'cdk-nag';

export class TransitGatewayStack extends cdk.Stack {
  public readonly transitGateway: ec2.CfnTransitGateway;
  public readonly internalRouteTable: ec2.CfnTransitGatewayRouteTable
  private readonly firewallRouteTable: ec2.CfnTransitGatewayRouteTable

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.templateOptions.description = "Creates the necessary networking infrastructure for the ATAT transit environment";

    // Transit Gateway configuration
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
          value: 'atat-tgw',
        },
      ],
    });

    // Transit Gateway route table for spoke VPCs
    this.internalRouteTable = new ec2.CfnTransitGatewayRouteTable(
      this,
      'InternalRouteTable',
      {
        transitGatewayId: this.transitGateway.attrId,
        tags: [
          {
            key: 'Name',
            value: 'atat-internal-tgw-rt',
          },
        ],
      }
    );

    // Transit Gateway route table for firewall VPC
    this.firewallRouteTable = new ec2.CfnTransitGatewayRouteTable(
      this,
      'firewallRouteTable',
      {
        transitGatewayId: this.transitGateway.attrId,
        tags: [
          {
            key: 'Name',
            value: 'atat-firewall-tgw-rt',
          },
        ],
      }
    );

    // Create ARN of TGW as it is only retrievable via .attrId from within the stack but we need the ARN
    const transitGatewayArn = `arn:aws-us-gov:ec2:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:transit-gateway/${this.transitGateway.attrId}`;

    // Retrieve the ARN of the principal from the SSM parameter 
    const principalArnPrameterName = '/cdk/RamShare/OrgArn'
    const principalArn = ssm.StringParameter.valueFromLookup(this, principalArnPrameterName)

    // RAM Share to Dev Org 
    const cfnResourceShare  = new ram.CfnResourceShare(this, 'TgwResourceShare', {
      name: 'Infra-Tgw',
      allowExternalPrincipals: false,
      principals: [principalArn],
      resourceArns: [transitGatewayArn],
    });

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

    NagSuppressions.addResourceSuppressions(
      inlinePolicy, [
      {
        id: "NIST.800.53.R4-IAMNoInlinePolicy",
        reason: "Inline policy holds no security threat",
      },
    ]);

    // Lambda function as trigger to event for TGW route table association
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
  
    // Evnet pattern and rule for when there is a CreateTransitGatewayVpcAttachment API call to trigger the lambda function automation
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