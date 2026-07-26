import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

async function fetcher<T>(url: string): Promise<T> {
  return api.get(url);
}

async function poster<T>(url: string, body: unknown): Promise<T> {
  return api.post(url, body);
}

async function patcher<T>(url: string, body: unknown): Promise<T> {
  return api.patch(url, body);
}

// --- Buyer hooks ---
export function useBuyerStats() {
  return useQuery({
    queryKey: ["buyer-stats"],
    queryFn: () => fetcher<any>("/api/cmp/buyer/dashboard/stats"),
    refetchInterval: 60_000,
  });
}

export function useBuyerRequirements(page = 1) {
  return useQuery({
    queryKey: ["buyer-requirements", page],
    queryFn: () => fetcher<any>(`/api/cmp/buyer/requirements?page=${page}`),
  });
}

export function useBuyerRequirementDetail(id: string) {
  return useQuery({
    queryKey: ["buyer-requirement", id],
    queryFn: () => fetcher<any>(`/api/cmp/buyer/requirements/${id}`),
    enabled: !!id,
  });
}

export function useCreateRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => poster<any>("/api/cmp/buyer/requirements", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buyer-requirements"] });
    },
  });
}

export function useUpdateRequirement(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      patcher<any>(`/api/cmp/buyer/requirements/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buyer-requirements"] });
      qc.invalidateQueries({ queryKey: ["buyer-requirement", id] });
    },
  });
}

export function useDeleteRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/cmp/buyer/requirements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buyer-requirements"] });
    },
  });
}

// --- Vendor hooks ---
export function useVendorStats() {
  return useQuery({
    queryKey: ["vendor-stats"],
    queryFn: () => fetcher<any>("/api/cmp/vendor/dashboard/stats"),
    refetchInterval: 60_000,
  });
}

export function useMarketplace(page = 1, sort = "newest") {
  return useQuery({
    queryKey: ["marketplace", page, sort],
    queryFn: () =>
      fetcher<any>(`/api/cmp/vendor/marketplace?page=${page}&sort=${sort}`),
  });
}

export function useMarketplaceDetail(id: string) {
  return useQuery({
    queryKey: ["marketplace-detail", id],
    queryFn: () => fetcher<any>(`/api/cmp/vendor/marketplace/${id}`),
    enabled: !!id,
  });
}

export function usePublicVendors() {
  return useQuery({
    queryKey: ["public-vendors"],
    queryFn: async () => {
      const res = await fetcher<any>("/api/marketplace/public/vendors");
      return res.data || [];
    },
  });
}

export function useVendorProposals() {
  return useQuery({
    queryKey: ["vendor-proposals"],
    queryFn: () => fetcher<any>("/api/cmp/vendor/proposals"),
  });
}

export function useSubmitProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => poster<any>("/api/cmp/vendor/proposals", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-proposals"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
}

export function useVendorProfile() {
  return useQuery({
    queryKey: ["vendor-profile"],
    queryFn: () => fetcher<any>("/api/cmp/vendor/profile"),
  });
}

export function useUpdateVendorProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) => patcher<any>("/api/cmp/vendor/profile", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-profile"] });
    },
  });
}

export function useVendorCertifications() {
  return useQuery({
    queryKey: ["vendor-certifications"],
    queryFn: () => fetcher<any>("/api/cmp/vendor/certifications"),
  });
}

export function useTrustEvents() {
  return useQuery({
    queryKey: ["trust-events"],
    queryFn: () => fetcher<any>("/api/cmp/vendor/trust/events"),
  });
}

// --- Deal hooks ---
export function useDealDetail(id: string) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: () => fetcher<any>(`/api/cmp/deals/${id}`),
    enabled: !!id,
    refetchInterval: 30_000,
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { proposal_id: string }) =>
      poster<any>("/api/cmp/deals/create", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["buyer-requirements"] });
      qc.invalidateQueries({ queryKey: ["buyer-stats"] });
    },
  });
}

export function useDealTransition(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { action: string; note?: string }) =>
      poster<any>(`/api/cmp/deals/${dealId}/transition`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
    },
  });
}

export function useConsentReveal(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => poster<any>(`/api/cmp/deals/${dealId}/consent-reveal`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
    },
  });
}

// --- Notifications hook ---
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetcher<any[]>("/api/cmp/notifications"),
    refetchInterval: 30_000,
  });
}

// --- Deal closing, reviews, and price hooks ---
export function useCloseDeal(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => poster<any>(`/api/cmp/deals/${dealId}/close`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
    },
  });
}

export function useSubmitReview(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { rating: number; comment?: string }) =>
      poster<any>(`/api/cmp/deals/${dealId}/review`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
      qc.invalidateQueries({ queryKey: ["deal-reviews", dealId] });
    },
  });
}

export function useUpdateDealPrice(dealId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { agreed_price: number }) =>
      patcher<any>(`/api/cmp/deals/${dealId}/price`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deal", dealId] });
    },
  });
}

export function useDealReviews(dealId: string) {
  return useQuery({
    queryKey: ["deal-reviews", dealId],
    queryFn: () => fetcher<any[]>(`/api/cmp/deals/${dealId}/reviews`),
    enabled: !!dealId,
  });
}

export function useVendorReviews(alias: string) {
  return useQuery({
    queryKey: ["vendor-reviews", alias],
    queryFn: async () => {
      const res = await api.get(`/api/vendor/${alias}/reviews`) as any;
      return res.data || [];
    },
    enabled: !!alias,
  });
}

// --- Moderator hooks ---
export function useModeratorStats() {
  return useQuery({
    queryKey: ["moderator-stats"],
    queryFn: () => fetcher<any>("/api/cmp/moderator/dashboard/stats"),
    refetchInterval: 60_000,
  });
}

export function useModeratorActions(params: { page: number; limit?: number; action_type?: string }) {
  return useQuery({
    queryKey: ["moderator-actions", params],
    queryFn: () => {
      const qps = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit ?? 50),
      });
      if (params.action_type) qps.set("action_type", params.action_type);
      return fetcher<any>(`/api/cmp/moderator/actions?${qps.toString()}`);
    },
  });
}

export function useModeratorAuditLog(params: { page: number; limit?: number; action_type?: string; actor_alias?: string }) {
  return useQuery({
    queryKey: ["moderator-audit-log", params],
    queryFn: () => {
      const qps = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit ?? 50),
      });
      if (params.action_type) qps.set("action_type", params.action_type);
      if (params.actor_alias) qps.set("actor_alias", params.actor_alias);
      return fetcher<any>(`/api/cmp/moderator/audit-log?${qps.toString()}`);
    },
  });
}

export function useModeratorCertifications(params: { status: string; page: number; limit?: number }) {
  return useQuery({
    queryKey: ["moderator-certifications", params],
    queryFn: () => {
      const qps = new URLSearchParams({
        status: params.status,
        page: String(params.page),
        limit: String(params.limit ?? 10),
      });
      return fetcher<any>(`/api/cmp/moderator/certifications?${qps.toString()}`);
    },
  });
}

export function useReviewCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { action: 'approve' | 'reject'; score?: number; reason?: string } }) =>
      poster<any>(`/api/cmp/moderator/certifications/${id}/review`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderator-certifications"] });
      qc.invalidateQueries({ queryKey: ["moderator-stats"] });
    },
  });
}

export function useModeratorDisputes(params: { status: string; page: number; limit?: number }) {
  return useQuery({
    queryKey: ["moderator-disputes", params],
    queryFn: () => {
      const qps = new URLSearchParams({
        status: params.status,
        page: String(params.page),
        limit: String(params.limit ?? 20),
      });
      return fetcher<any>(`/api/cmp/moderator/disputes?${qps.toString()}`);
    },
  });
}

export function useResolveDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dealId, body }: { dealId: string; body: { resolution: string; reason: string; buyer_trust_adjustment: number; vendor_trust_adjustment: number } }) =>
      poster<any>(`/api/cmp/moderator/disputes/${dealId}/resolve`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderator-disputes"] });
      qc.invalidateQueries({ queryKey: ["moderator-stats"] });
    },
  });
}

export function useModeratorUsers(params: { role: string; search?: string; page: number; limit?: number; sort?: string; order?: string }) {
  return useQuery({
    queryKey: ["moderator-users", params],
    queryFn: () => {
      const qps = new URLSearchParams({
        role: params.role,
        page: String(params.page),
        limit: String(params.limit ?? 20),
      });
      if (params.search) qps.set("search", params.search);
      if (params.sort) qps.set("sort", params.sort);
      if (params.order) qps.set("order", params.order);
      return fetcher<any>(`/api/cmp/moderator/users?${qps.toString()}`);
    },
  });
}

export function useAdjustTrust() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alias, body }: { alias: string; body: { adjustment: number; reason: string } }) =>
      poster<any>(`/api/cmp/moderator/users/${alias}/trust`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["moderator-users"] });
      qc.invalidateQueries({ queryKey: ["moderator-stats"] });
    },
  });
}

