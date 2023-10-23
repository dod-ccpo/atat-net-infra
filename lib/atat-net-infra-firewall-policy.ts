import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { Construct } from 'constructs';
import * as networkfirewall from 'aws-cdk-lib/aws-networkfirewall';

export class NetworkFirewallRules extends cdk.Stack {
  public readonly fwPolicy: string;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.templateOptions.description = "Creates the AWS Network Firewall Policy, Rule Group and Rules for ATAT AWS Network Firewall";

    // Network Firewall Stateless Rule Group
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

    // Network Firewall Stateful Rule Group for allow rules
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

    // Network Firewall Stateful Rule Group to deny all traffic not matching an allow rule
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

    // Network Firewall Policy referencing the above rule groups
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

    this.fwPolicy = fwPolicy.attrFirewallPolicyArn;

    const eventbus = new events.EventBus(this, 'Hell-Bus-Event', {
      eventBusName: 'ATAT-Event-Bus'
    });
    
    eventbus.archive('MyArchive', {
      archiveName: 'MyCustomEventBusArchive',
      description: 'MyCustomerEventBus Archive',
      eventPattern: {
        account: [cdk.Stack.of(this).account],
      },
      retention: cdk.Duration.days(365),
    });
  }
}