export interface QuotaState { used: number; limit: number; }
export function reserveQuota(state: QuotaState): QuotaState {
  if (state.used >= state.limit) throw new Error("QUOTA_EXHAUSTED");
  return { ...state, used: state.used + 1 };
}
