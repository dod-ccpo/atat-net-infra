import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as networkfirewall from 'aws-cdk-lib/aws-networkfirewall';

export class NetworkFirewallRules extends cdk.Stack {
  public readonly fwPolicy: networkfirewall.CfnFirewallPolicy;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fwAllowStatelessRuleGroup = new networkfirewall.CfnRuleGroup(
      this,
      'fwAllowStatelessRuleGroup',
      {
        capacity: 10,
        ruleGroupName: 'AllowStateless',
        type: 'STATELESS',
        ruleGroup: {
          rulesSource: {
            statelessRulesAndCustomActions: {
              statelessRules: [
                {
                  priority: 1,
                  ruleDefinition: {
                    actions: ['aws:pass'],
                    matchAttributes: {
                      protocols: [1],
                      sources: [
                        {
                          addressDefinition: '0.0.0.0/0',
                        },
                      ],
                      destinations: [
                        {
                          addressDefinition: '0.0.0.0/0',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      }
    );

    const fwAllowRuleGroup = new networkfirewall.CfnRuleGroup(
      this,
      'fwAllowRuleGroup',
      {
        capacity: 10,
        ruleGroupName: 'AllowRules',
        type: 'STATEFUL',
        ruleGroup: {
          rulesSource: {
            statefulRules: [
              {
                action: 'PASS',
                header: {
                  destination: 'ANY',
                  destinationPort: '80',
                  source: '10.0.0.0/8',
                  sourcePort: 'ANY',
                  protocol: 'TCP',
                  direction: 'FORWARD',
                },
                ruleOptions: [
                  {
                    keyword: 'sid:1',
                  },
                ],
              },
              {
                action: 'PASS',
                header: {
                  destination: 'ANY',
                  destinationPort: '443',
                  source: '10.0.0.0/8',
                  sourcePort: 'ANY',
                  protocol: 'TCP',
                  direction: 'FORWARD',
                },
                ruleOptions: [
                  {
                    keyword: 'sid:2',
                  },
                ],
              },
            ],
          },
        },
      }
    );

    const fwDenyRuleGroup = new networkfirewall.CfnRuleGroup(
      this,
      'fwDenyRuleGroup',
      {
        capacity: 10,
        ruleGroupName: 'DenyAll',
        type: 'STATEFUL',
        description: 'Deny all other traffice',
        ruleGroup: {
          rulesSource: {
            statefulRules: [
              {
                action: 'DROP',
                header: {
                  destination: 'ANY',
                  destinationPort: 'ANY',
                  source: 'ANY',
                  sourcePort: 'ANY',
                  protocol: 'IP',
                  direction: 'FORWARD',
                },
                ruleOptions: [
                  {
                    keyword: 'sid:100',
                  },
                ],
              },
            ],
          },
        },
      }
    );

    const fwPolicy = new networkfirewall.CfnFirewallPolicy(this, 'FwPolicy', {
      firewallPolicy: {
        statelessDefaultActions: ['aws:forward_to_sfe'],
        statelessFragmentDefaultActions: ['aws:forward_to_sfe'],
        statelessRuleGroupReferences: [
          {
            priority: 1,
            resourceArn: fwAllowStatelessRuleGroup.attrRuleGroupArn,
          },
        ],
        statefulRuleGroupReferences: [
          {
            resourceArn: fwAllowRuleGroup.attrRuleGroupArn,
          },
          {
            resourceArn: fwDenyRuleGroup.attrRuleGroupArn,
          },
        ],
      },
      firewallPolicyName: 'AtatFwPolicy',
    });

    this.fwPolicy = fwPolicy;
  }
}