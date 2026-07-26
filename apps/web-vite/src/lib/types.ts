// ============================================================
// SHARED TYPES for MongoDB collections + Supabase
// ============================================================
type ObjectId = string;

// --- MongoDB Collections ---

export interface BuyerRequirement {
  _id?: ObjectId
  alias: string
  title: string
  description: string
  service_type: string[]
  budget_range: { min: number; max: number }
  timeline_weeks: number
  compliance_needs: string[]
  tech_stack: string[]
  engagement_type: 'one-time' | 'ongoing' | 'retainer'
  urgency: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'matched' | 'in-progress' | 'closed'
  matched_vendor_aliases: string[]
  proposal_count: number
  created_at: Date
  updated_at: Date
}

export interface Proposal {
  _id?: ObjectId
  requirement_id: string
  buyer_alias: string
  vendor_alias: string
  cover_note: string
  proposed_price: number
  proposed_timeline_weeks: number
  methodology: string
  relevant_experience: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  created_at: Date
  updated_at: Date
}

export interface VendorProfile {
  _id?: ObjectId
  alias: string
  service_description: string
  categories: string[]
  skills: string[]
  experience_years: number
  compliance_expertise: string[]
  tools_used: string[]
  rate_range: { min: number; max: number }
  sample_work: SampleWork[]
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface SampleWork {
  title: string
  description: string
  outcome: string
}

export interface MatchCache {
  _id?: ObjectId
  requirement_id: string
  vendor_alias: string
  scores: {
    jaccard: number
    semantic: number
    budget: number
    trust_boost: number
    final: number
  }
  computed_at: Date
}

// --- Supabase types (mirrors DB schema) ---

export interface Profile {
  id: string
  alias: string
  role: 'buyer' | 'vendor' | 'admin'
  trust_score: number
  onboarding_complete: boolean
  created_at: string
  updated_at: string
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

export interface DealEvent {
  id: string
  deal_id: string
  event_type: string
  from_status: string | null
  to_status: string | null
  actor_alias: string
  note: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Notification {
  id: string
  recipient_alias: string
  type: string
  content: string
  ref_id: string | null
  read: boolean
  created_at: string
}

export interface Certification {
  id: string
  vendor_alias: string
  cert_name: string
  cert_type: string
  file_url: string | null
  verified: boolean
  verification_score: number
  uploaded_at: string
  verified_at: string | null
}

export interface AliasDirectory {
  alias: string
  role: 'buyer' | 'vendor'
  trust_score: number
  cert_badges: string[]
  skills: string[]
  completed_deals: number
  response_rate: number
  joined_at: string
}

// --- API Response ---
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  status: number
}

// --- Deal state machine ---
export const DEAL_TRANSITIONS: Record<string, { to: DealStatus; allowedRoles: ('buyer' | 'vendor' | 'admin')[] }[]> = {
  POSTED: [{ to: 'MATCHED', allowedRoles: ['admin'] }],
  MATCHED: [{ to: 'NEGOTIATING', allowedRoles: ['buyer'] }],
  NEGOTIATING: [
    { to: 'CONTRACTED', allowedRoles: ['buyer', 'vendor'] },
    { to: 'CANCELLED', allowedRoles: ['buyer', 'vendor'] },
  ],
  CONTRACTED: [{ to: 'IN_PROGRESS', allowedRoles: ['vendor'] }],
  IN_PROGRESS: [{ to: 'REVIEW', allowedRoles: ['vendor'] }],
  REVIEW: [
    { to: 'CLOSED', allowedRoles: ['buyer'] },
    { to: 'IN_PROGRESS', allowedRoles: ['buyer'] },
    { to: 'DISPUTED', allowedRoles: ['buyer'] },
  ],
  DISPUTED: [
    { to: 'CLOSED', allowedRoles: ['admin'] },
    { to: 'IN_PROGRESS', allowedRoles: ['admin'] },
  ],
}

// --- Cert verification scores ---
export const CERT_SCORES: Record<string, number> = {
  OSCP: 20,
  CISSP: 20,
  CISM: 18,
  CEH: 15,
  GPEN: 15,
  GWAPT: 14,
  ISO27001: 12,
  CompTIA_Security: 10,
  eJPT: 8,
  other: 5,
}
