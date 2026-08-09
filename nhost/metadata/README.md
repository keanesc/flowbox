# Hasura metadata

This is the deployable Hasura CLI v3 layout. `databases/default/tables` contains
one tracked-table/view definition per file; the pre-existing `auth` definitions
were exported from production and retained, while Relay Room's `public`
definitions replace the incomplete production versions. `actions.yaml`,
`cron_triggers.yaml`, and `event_triggers.yaml` contain the Relay Room Action
and trigger configuration.

The `organization_monthly_usage` permission deliberately correlates its
membership lookup with the outer view row using `_ceq: ["$", "org_id"]`, and
also filters on the caller's `X-Hasura-User-Id`. `reserve_org_quota` is tracked
as a mutation. Sensitive step-type checks remain in the Action service because
they require the complete submitted workflow definition.

The source configuration is non-secret. Nhost-managed connection and Auth table
metadata came from the read-only production export; secrets belong only in the
ignored root `.secrets` file or the Nhost dashboard.
