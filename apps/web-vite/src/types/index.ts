// ============================================================
// SHARED TYPESCRIPT TYPES — CYBERSECURITY MARKETPLACE
// ============================================================

export type UserRole = 'buyer' | 'vendor' | 'admin' | 'moderator'

export type DealStatus =
  | 'POSTED'
  | 'MATCHED'
  | 'NEGOTIATING'
  | 'CONTRACTED'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'CLOSED'
  | 'CANCELLED'
  | 'DISPUTED'

export type CertType =
  | 'OSCP'
  | 'CEH'
  | 'CISSP'
  | 'CISM'
  | 'ISO27001'
  | 'CompTIA_Security'
  | 'GPEN'
  | 'GWAPT'
  | 'eJPT'
  | 'other'

export type TrustEventType =
  | 'deal_completed'
  | 'deal_cancelled'
  | 'cert_verified'
  | 'review_received'
  | 'response_fast'
  | 'response_slow'
  | 'dispute_raised'
  | 'dispute_resolved_win'
  | 'dispute_resolved_loss'
  | 'platform_milestone'

// ============================================================
// SUPABASE TABLE TYPES
// ============================================================

export interface Profile {
  id: string
  alias: string
  role: UserRole
  trust_score: number
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface AliasDirectory {
  alias: string
  role: UserRole
  trust_score: number
  cert_badges: string[]
  skills: string[]
  completed_deals: number
  response_rate: number
  joined_at: string
}

export interface Deal {
  id: string
  buyer_alias: string
  vendor_alias: string | null
  requirement_id: string | null
  status: DealStatus
  agreed_price: number | null
  currency: string
  payment_intent_id: string | null
  buyer_consented_reveal: boolean
  vendor_consented_reveal: boolean
  identity_revealed: boolean
  created_at: string
  updated_at: string
  closed_at: string | null
}

export interface TrustEvent {
  id: string
  alias: string
  event_type: TrustEventType
  score_delta: number
  deal_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Message {
  id: string
  deal_id: string
  sender_alias: string
  encrypted_content: string
  message_type: 'text' | 'file' | 'system'
  file_url: string | null
  read_at: string | null
  created_at: string
}

export interface Certification {
  id: string
  vendor_alias: string
  cert_name: string
  cert_type: CertType
  file_url: string | null
  verified: boolean
  verification_score: number
  uploaded_at: string
  verified_at: string | null
}

export interface AuditLog {
  id: string
  action_type: string
  actor_alias: string | null
  target_alias: string | null
  deal_id: string | null
  metadata: Record<string, unknown>
  ip_hash: string | null
  created_at: string
}

// ============================================================
// MONGODB DOCUMENT TYPES
// ============================================================

export interface SampleWork {
  title: string
  industry: string
  outcome: string
  duration_weeks: number
}

export interface VendorProfile {
  _id?: string
  alias: string
  categories: string[]
  skills: string[]
  experience_years: number
  rate_range: { min: number; max: number; currency: string }
  availability: 'full-time' | 'part-time' | 'project-based'
  service_description: string
  compliance_expertise: string[]
  tools_used: string[]
  sample_work: SampleWork[]
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface BuyerRequirement {
  _id?: string
  alias: string
  title: string
  description: string
  service_type: string[]
  budget_range: { min: number; max: number; currency: string }
  timeline_weeks: number
  compliance_needs: string[]
  tech_stack: string[]
  engagement_type: 'one-time' | 'ongoing' | 'retainer'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'matched' | 'in-progress' | 'closed'
  matched_vendor_aliases: string[]
  created_at: Date
  updated_at: Date
}

export interface Proposal {
  _id?: string
  requirement_id: string
  vendor_alias: string
  buyer_alias: string
  cover_note: string
  proposed_price: number
  proposed_timeline_weeks: number
  methodology: string
  relevant_experience: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  deal_id: string | null
  created_at: Date
  updated_at: Date
}

// ============================================================
// APP STATE TYPES
// ============================================================

export interface OnboardingState {
  step: number
  role: UserRole | null
  vendorData: Partial<VendorProfile>
  buyerData: Partial<BuyerRequirement>
}

export interface AuthState {
  user: { id: string; email: string } | null
  profile: Profile | null
  alias: string | null
  role: UserRole | null
  isLoading: boolean
  isAuthenticated: boolean
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  pageSize: number
}
