import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as ram  from 'aws-cdk-lib/aws-ram';
import * as path from 'path';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { NagSuppressions, NIST80053R4Checks } from 'cdk-nag';


export interface AtatSharedProps extends cdk.StackProps {
  orgARN: string;
}

export class SharedCoreStack extends cdk.Stack {
    public readonly firewallVpc: ec2.IVpc;
    tgwSubnets: any;
    constructor(scope: Construct, id: string, props: AtatSharedProps) {
      super(scope, id, props);

    const tgweventbus = new events.EventBus(this, 'TGW-Event-Bus', {
        eventBusName: 'ATA-TGW-Event-Bus'
      });
      tgweventbus.addToResourcePolicy(new iam.PolicyStatement({
        sid: 'TransitBusEventPolicy',
        effect: iam.Effect.ALLOW,
        actions: ['events:PutEvents'],
        principals: [new iam.ServicePrincipal('events.amazonaws.com')],
        resources: [tgweventbus.eventBusArn],
        conditions: {
          'StringEquals': {
            'aws:PrincipalOrgID': props.orgARN,
      },
    },
    }));


    const rule = new events.Rule(this, 'TGW-Association-rule', {
      eventPattern: {
        source: ["aws.ec2"],
        detail: {
          'eventName': ['CreateTransitGatewayVpcAttachment']
        }
      },
      eventBus: tgweventbus
    });
  }
}