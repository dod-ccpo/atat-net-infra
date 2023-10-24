# ATAT Net Infrastructure

This repository is responsible for deploying the AWS network firewall 
and all the network resources for the ATAT web API in the transit account.
This network design is used to leverage AWS native services to ensure security 
and network functionality. 

## Deploying

`atat-net-infra` is built as an [AWS CDK application](https://docs.aws.amazon.com/cdk/v2/guide/home.html). The
development and deployment process therefore heavily use the `aws-cdk` CLI.

The main requirments for the cdk deployment command are:
 - A full environment managed by a CI/CD pipeline.
 - A CIDR for the firewall vpc.
 - The Org ARN of the environment the repo is being deployed to. 

In general, the steps to deploy each are approximately the same, following the typical `cdk diff`/`cdk deploy`
workflow. Which path is chosen is determined based on the values of a CDK Context variable value.

### Deploying a "full" environment

Because a full environment deployment requires the usage of a full CI/CD pipeline, it also needs additional
configuration values to understand which `git` repository to watch and what credentials should be used to do
so. Like a Sandbox environment, the `atat:EnvironmentId` context value must also be set. Additionally, a
Secret must be created within Secrets Manager to store a GitHub Personal Access Token.

The required context values are:
 - `atat:EnvironmentId`, which should be the unique name used to identify the environment
 - `atat:GitHubPatName`, which should be the name of the Secret that contains the GitHub PAT
 - `atat:VersionControlRepo`, which should be name of the GitHub repository where the code is stored,
    including the organization name (for example, `dod-ccpo/atat-web-api`)
 - `atat:VersionControlBranch`, which should be the branch within the repository to watch for changes