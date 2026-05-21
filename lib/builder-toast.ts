/** Query key for `/builder?toast=…` after redirects from builder-only routes. */
export const BUILDER_TOAST_MESSAGES: Record<string, string> = {
  not_grantee: 'You are not the grantee on this grant',
  grant_not_found: 'Grant not found',
  milestone_not_found: 'Milestone not found',
  milestone_not_pending: 'This milestone is not open for submission',
  connect_wallet: 'Connect your wallet to continue',
  milestone_status_error: 'Unable to verify milestone status',
  not_committee: 'You are not a committee member.',
  complete_verification: 'Complete identity verification to receive grants.',
  already_verified: 'You are already verified.',
  identity_verified: 'Identity verified on-chain. Your builder profile is ready.',
};
