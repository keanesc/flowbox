import { describe, expect, it, vi } from "vitest";
import { canApprove, canEdit, canManageMembers, canUseSensitiveStep, membershipFor, requireRole } from "../nhost/functions/_shared/auth";
import { evaluateBranch } from "../nhost/functions/_shared/conditional";
import { once } from "../nhost/functions/_shared/idempotency";
import { reserveQuota } from "../nhost/functions/_shared/quota";
import { signWebhook, verifyWebhookSignature } from "../nhost/functions/_shared/signature";
import { executeStep } from "../nhost/functions/_shared/executor";

describe("organization and role isolation", () => {
  it("requires both the caller role and the target organization", () => {
    const members = [{ orgId: "a", userId: "owner-a", role: "owner" as const }, { orgId: "b", userId: "owner-b", role: "owner" as const }];
    expect(membershipFor(members, "owner-a", "b")).toBeUndefined();
    expect(() => requireRole(membershipFor(members, "owner-a", "b"), ["owner"])).toThrow("ORGANIZATION_ACCESS_DENIED");
    expect(canEdit("viewer")).toBe(false); expect(canManageMembers("editor")).toBe(false); expect(canApprove("editor")).toBe(true);
  });
  it("keeps sensitive steps owner-only", () => {
    expect(canUseSensitiveStep("editor", "db_write")).toBe(false);
    expect(canUseSensitiveStep("editor", "notify")).toBe(false);
    expect(canUseSensitiveStep("owner", "notify")).toBe(true);
  });
});

describe("execution safety", () => {
  it("reserves quota atomically at the boundary", () => {
    expect(reserveQuota({ used: 2, limit: 3 })).toEqual({ used: 3, limit: 3 });
    expect(() => reserveQuota({ used: 3, limit: 3 })).toThrow("QUOTA_EXHAUSTED");
  });
  it("evaluates only constrained branch expressions", () => {
    expect(evaluateBranch("contains approve", { text: "APPROVE this" })).toBe("true");
    expect(evaluateBranch("equals yes", "no")).toBe("false");
    expect(() => evaluateBranch("value.foo", "anything")).toThrow("Unsupported condition");
  });
  it("retries transient provider failures once", async () => {
    const provider = vi.fn().mockRejectedValueOnce(new Error("temporary")).mockResolvedValue({ ok: true });
    const store = { setStepStatus: vi.fn(async () => undefined), setRunStatus: vi.fn(async () => undefined), createNotification: vi.fn(async () => undefined), writeResult: vi.fn(async () => undefined) };
    const result = await executeStep({ runId: "r", orgId: "o", workflowId: "w", triggerInput: {}, previousOutput: {}, step: { id: "s", workflowId: "w", position: 0, type: "llm_call", config: { prompt: "hello" } } }, store, { llm: provider, http: vi.fn() });
    expect(result.output).toEqual({ ok: true }); expect(provider).toHaveBeenCalledTimes(2);
  });
});

describe("external and approval boundaries", () => {
  it("uses timing-safe webhook signatures and rejects tampering", () => {
    const signature = signWebhook('{"ok":true}', "secret");
    expect(verifyWebhookSignature('{"ok":true}', signature, "secret")).toBe(true);
    expect(verifyWebhookSignature('{"ok":false}', signature, "secret")).toBe(false);
  });
  it("processes a database event once", async () => {
    const seen = new Set<string>(); let calls = 0;
    const store = { has: async (id: string) => seen.has(id), add: async (id: string) => { seen.add(id); } };
    expect(await once("evt-1", store, async () => { calls++; })).toBe(true);
    expect(await once("evt-1", store, async () => { calls++; })).toBe(false);
    expect(calls).toBe(1);
  });
  it("pauses at an approval gate", async () => {
    const store = { setStepStatus: vi.fn(async () => undefined), setRunStatus: vi.fn(async () => undefined), createNotification: vi.fn(async () => undefined), writeResult: vi.fn(async () => undefined) };
    const result = await executeStep({ runId: "r", orgId: "o", workflowId: "w", triggerInput: {}, previousOutput: {}, step: { id: "gate", workflowId: "w", position: 1, type: "approval_gate", config: { reason: "review" } } }, store, { llm: vi.fn(), http: vi.fn() });
    expect(result.output).toEqual({ paused: true }); expect(store.setRunStatus).toHaveBeenCalledWith("r", "paused");
  });
});
