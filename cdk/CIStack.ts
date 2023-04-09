import { App, CfnOutput, Duration, aws_iam as IAM, Stack } from 'aws-cdk-lib'
import { CI_STACK_NAME } from './stackConfig.js'

export class CIStack extends Stack {
	public constructor(
		parent: App,
		{
			repository: r,
			gitHubOICDProviderArn,
		}: {
			repository: {
				owner: string
				repo: string
			}
			gitHubOICDProviderArn: string
		},
	) {
		super(parent, CI_STACK_NAME)

		const gitHubOIDC = IAM.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
			this,
			'gitHubOICDProvider',
			gitHubOICDProviderArn,
		)

		const ghRole = new IAM.Role(this, 'ghRole', {
			roleName: `${CI_STACK_NAME}-github-actions`,
			assumedBy: new IAM.WebIdentityPrincipal(
				gitHubOIDC.openIdConnectProviderArn,
				{
					StringEquals: {
						'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
						'token.actions.githubusercontent.com:sub': `repo:${r.owner}/${r.repo}:environment:ci`,
					},
				},
			),
			description: `This role is used by GitHub Actions for CI of ${r.owner}/${r.repo}`,
			maxSessionDuration: Duration.hours(1),
			managedPolicies: [
				IAM.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
			],
		})

		new CfnOutput(this, 'roleArn', {
			exportName: `${this.stackName}:roleArn`,
			description: 'Role to use in GitHub Actions',
			value: ghRole.roleArn,
		})
	}
}

export type StackOutputs = {
	roleArn: string
}
