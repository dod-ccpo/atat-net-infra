import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as cdk from "aws-cdk-lib";
import { Construct } from 'constructs';
import { FirewallVpcStack } from "../atat-net-infra-firewall-vpc";
import { AtatNetStackProps } from "../atat-net-infra-alb";
import { PropagatedTagSource } from "aws-cdk-lib/aws-ecs";
import { AlbStack } from "../atat-net-infra-alb";

export class AtatAlbResource extends elbv2.ApplicationLoadBalancer {
  constructor(scope: Construct, id: string, props: elbv2.ApplicationLoadBalancerProps & AtatNetStackProps) {

    super(scope, id, { 
      ...props,
          vpc: props.atatfirewallVpc.firewallVpc,
          vpcSubnets: { subnetGroupName: 'Alb' },
          internetFacing: true,
          deletionProtection: true,
          dropInvalidHeaderFields: true,
    });
 }
}