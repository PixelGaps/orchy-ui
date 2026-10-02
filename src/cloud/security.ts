export type PrivilegedSecretName =
  | "JIRA_API_TOKEN"
  | "GITHUB_TOKEN"
  | "SUPABASE_SECRET_KEY"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "POSTHOG_PERSONAL_API_KEY"

export interface CloudControlEnv {
  JIRA_API_TOKEN?: string
  JIRA_BASE_URL?: string
  JIRA_EMAIL?: string
  GITHUB_TOKEN?: string
  GITHUB_REPOSITORY?: string
  SUPABASE_URL?: string
  SUPABASE_SECRET_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  TESTOPS_TARGET?: string
  POSTHOG_PERSONAL_API_KEY?: string
  POSTHOG_SUMMARY_URL?: string
  ORCHY_OPERATOR_SUBJECT?: string
  ORCHY_OPERATOR_EMAIL?: string
}

export interface AccessIdentity {
  subject: string
  email: string | null
  issuer: "operator-mediator"
}

export class CloudSecurityError extends Error {
  constructor(
    readonly code: string,
    readonly status: 403 | 503,
  ) {
    super(code)
    this.name = "CloudSecurityError"
  }
}

export function requirePrivilegedSecret(
  env: CloudControlEnv,
  name: PrivilegedSecretName,
): string {
  const value = env[name]?.trim()
  if (!value) throw new CloudSecurityError(`CLOUD_SECRET_MISSING_${name}`, 503)
  return value
}

export function cloudControlEnvFromProcess(
  source: NodeJS.ProcessEnv = process.env,
): CloudControlEnv {
  return {
    JIRA_API_TOKEN: source.JIRA_API_TOKEN,
    JIRA_BASE_URL: source.JIRA_BASE_URL,
    JIRA_EMAIL: source.JIRA_EMAIL,
    GITHUB_TOKEN: source.GITHUB_TOKEN,
    GITHUB_REPOSITORY: source.GITHUB_REPOSITORY,
    SUPABASE_URL: source.SUPABASE_URL,
    SUPABASE_SECRET_KEY: source.SUPABASE_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: source.SUPABASE_SERVICE_ROLE_KEY,
    TESTOPS_TARGET: source.TESTOPS_TARGET,
    POSTHOG_PERSONAL_API_KEY: source.POSTHOG_PERSONAL_API_KEY,
    POSTHOG_SUMMARY_URL: source.POSTHOG_SUMMARY_URL,
    ORCHY_OPERATOR_SUBJECT: source.ORCHY_OPERATOR_SUBJECT,
    ORCHY_OPERATOR_EMAIL: source.ORCHY_OPERATOR_EMAIL,
  }
}

export function operatorIdentity(
  env: CloudControlEnv,
): AccessIdentity {
  return {
    subject: env.ORCHY_OPERATOR_SUBJECT?.trim() || "orchy-operator",
    email: env.ORCHY_OPERATOR_EMAIL?.trim() || null,
    issuer: "operator-mediator",
  }
}

