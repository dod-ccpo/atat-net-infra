import * as cdk from "aws-cdk-lib";
import * as utils from "../lib/util";
import { RemovalPolicySetter } from "../lib/aspects/removal-policy";
import { GovCloudCompatibilityAspect } from "../lib/aspects/govcloud-compatibility";
import { AtatContextValue } from "../lib/context-values";
import { AtatPipelineStack } from "../lib/atat-net-infra-stack";

export function createApp(this: any, props?: cdk.AppProps): cdk.App {
  const app = new cdk.App(props);

  const environmentParam = AtatContextValue.ENVIRONMENT_ID.resolve(app);
  const vpcCidrParam = AtatContextValue.VPC_CIDR.resolve(app);
  const deployRegion = AtatContextValue.DEPLOY_REGION.resolve(app);
  const branchParam = AtatContextValue.VERSION_CONTROL_BRANCH.resolve(app);
  const orgArn = AtatContextValue.ORG_ARN.resolve(app);
  const apiDomainParam = AtatContextValue.API_DOMAIN_NAME.resolve(app);


  if (!utils.isString(environmentParam)) {
        const err = `An EnvironmentId must be provided (use the ${AtatContextValue.ENVIRONMENT_ID} context key)`;
        console.error(err);
        throw new Error(err);
      }
      const environmentName = utils.normalizeEnvironmentName(environmentParam);

  if (!utils.isString(vpcCidrParam) || !validateCidr(vpcCidrParam)) {
        const err =
          `A VpcCidr must be provided for non-Sandbox environments (use the ${AtatContextValue.VPC_CIDR} context key) ` +
          "and it must be a valid CIDR block.";
        console.error(err);
        throw new Error(err);
      }

  const pipelineStack = new AtatPipelineStack(app, 'AtatInfraPipeline', {
    environmentName,
    apiDomainName: apiDomainParam,
    orgARN: orgArn,
    vpcCidr: vpcCidrParam,
    repository: AtatContextValue.VERSION_CONTROL_REPO.resolve(app),
    branch: branchParam,
    githubPatName: AtatContextValue.GITHUB_PAT_NAME.resolve(app),
    // notificationEmail: environmentName,
    env: {
      region: deployRegion, 
      // account: process.env.CDK_DEFAULT_ACCOUNT,
    },
  });
return app;
}

function validateCidr(cidr: string): boolean {
    const AWS_MIN_NETMASK = 16;
    const AWS_MAX_NETMASK = 28;
    try {
      const [address, prefix] = cidr.split("/");
      const prefixInt = parseInt(prefix);
      if (!prefixInt || prefixInt < AWS_MIN_NETMASK || prefixInt > AWS_MAX_NETMASK) {
        return false;
      }
      const octets = address
        .split(".")
        .map((oct) => parseInt(oct))
        .filter((oct) => oct >= 0 && oct <= 255);
      return octets.length === 4;
    } catch (err) {
      return false;
    }
}
