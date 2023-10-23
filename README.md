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