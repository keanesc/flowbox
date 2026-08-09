# Hasura metadata

Apply `metadata.json` after running the SQL migrations. The metadata tracks every table, relationship, role permission, Action, cron event, and database event trigger used by Relay Room. The permission expressions always begin with membership in the row's owning organization; step-level sensitive-type checks stay in the Action service because Hasura cannot inspect a pending execution decision safely.
