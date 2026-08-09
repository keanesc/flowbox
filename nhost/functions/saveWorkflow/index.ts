import { actionInput, json, sessionFromRequest } from "../_shared/http";
import { canEdit, requireRole } from "../_shared/auth";
import { graphql } from "../_shared/graphql";
import { assertSensitiveConfiguration, validateWorkflow } from "../_shared/validation";
import type { Membership, WorkflowDefinition } from "../_shared/types";

type SaveInput = { workflow_id?: string; organization_id: string; name: string; description?: string; active?: boolean; steps: WorkflowDefinition["steps"]; triggers: WorkflowDefinition["triggers"] };
export default async function handler(req: { body: unknown; headers: Record<string, string | string[] | undefined> }, res: { status: (code: number) => { json: (data: unknown) => void } }) {
  try {
    const input = actionInput<SaveInput>(req.body); const session = sessionFromRequest(req);
    const members = await graphql<{ org_members: Membership[] }>(`query SaveMember($orgId: uuid!, $userId: uuid!) { org_members(where: {org_id: {_eq: $orgId}, user_id: {_eq: $userId}}) { org_id user_id role } }`, { orgId: input.organization_id, userId: session.userId }, { "x-hasura-admin-secret": process.env.NHOST_ADMIN_SECRET ?? "" });
    const member = session.isAdmin ? { orgId: input.organization_id, userId: session.userId ?? "admin", role: "owner" as const } : members.org_members[0];
    requireRole(member, ["owner", "editor"]); const workflow: WorkflowDefinition = { id: input.workflow_id ?? "draft", orgId: input.organization_id, name: input.name, active: input.active ?? false, steps: input.steps, triggers: input.triggers };
    const errors = validateWorkflow(workflow); if (errors.length) throw new Error(`INVALID_WORKFLOW: ${errors.join(" ")}`); assertSensitiveConfiguration(workflow, member.role);
    if (input.workflow_id) await graphql(`mutation Save($id: uuid!, $name: String!, $description: String!, $active: Boolean!) { update_workflows_by_pk(pk_columns: {id: $id}, _set: {name: $name, description: $description, active: $active}) { id } }`, { id: input.workflow_id, name: input.name, description: input.description ?? "", active: input.active ?? false }, { "x-hasura-admin-secret": process.env.NHOST_ADMIN_SECRET ?? "" });
    else { const created = await graphql<{ insert_workflows_one: { id: string } }>(`mutation Save($object: workflows_insert_input!) { insert_workflows_one(object: $object) { id } }`, { object: { org_id: input.organization_id, name: input.name, description: input.description ?? "", active: input.active ?? false } }, { "x-hasura-admin-secret": process.env.NHOST_ADMIN_SECRET ?? "" }); input.workflow_id = created.insert_workflows_one.id; }
    return json(res, 200, { workflow_id: input.workflow_id });
  } catch (error) { return json(res, 400, { message: error instanceof Error ? error.message : "Unable to save workflow" }); }
}
