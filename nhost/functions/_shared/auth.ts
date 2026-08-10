import type { Membership, Role, Session } from "./types";

export const canRead = (role: Role | undefined) => Boolean(role);
export const canEdit = (role: Role | undefined) =>
  role === "owner" || role === "editor";
export const canManageMembers = (role: Role | undefined) => role === "owner";
export const canApprove = (role: Role | undefined) =>
  role === "owner" || role === "editor";
export const canUseSensitiveStep = (role: Role | undefined, type: string) =>
  type === "db_write" || type === "notify" ? role === "owner" : canEdit(role);
export const canConfigureTrigger = (role: Role | undefined, type: string) =>
  type === "webhook" ? role === "owner" : canEdit(role);

export function requireSession(session: Session): string {
  if (!session.userId && !session.isAdmin)
    throw new Error("AUTHENTICATION_REQUIRED");
  return session.userId ?? "admin";
}

export function membershipFor(
  memberships: Membership[],
  userId: string,
  orgId: string,
): Membership | undefined {
  return memberships.find(
    (member) => member.userId === userId && member.orgId === orgId,
  );
}

export function requireRole(
  membership: Membership | undefined,
  allowed: Role[],
): Membership {
  if (!membership || !allowed.includes(membership.role))
    throw new Error("ORGANIZATION_ACCESS_DENIED");
  return membership;
}
