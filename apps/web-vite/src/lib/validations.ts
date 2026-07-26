// ============================================================
// ZOD VALIDATION SCHEMAS — used on both client and server
// ============================================================
import { z } from 'zod'

export const requirementSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(100),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000),
  service_type: z.array(z.string()).min(1, 'Select at least one service type'),
  budget_range: z.object({
    min: z.number().positive('Min budget must be positive'),
    max: z.number().positive('Max budget must be positive'),
  }).refine(d => d.max > d.min, { message: 'Max budget must be greater than min' }),
  timeline_weeks: z.number().int().min(1).max(52),
  compliance_needs: z.array(z.string()).optional().default([]),
  tech_stack: z.array(z.string()).optional().default([]),
  engagement_type: z.enum(['one-time', 'ongoing', 'retainer']),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
})

export type RequirementInput = z.infer<typeof requirementSchema>

export const proposalSchema = z.object({
  requirement_id: z.string().min(1),
  cover_note: z.string().min(100, 'Cover note must be at least 100 characters'),
  proposed_price: z.number().positive(),
  proposed_timeline_weeks: z.number().int().min(1).max(52),
  methodology: z.string().min(50, 'Methodology must be at least 50 characters'),
  relevant_experience: z.string().min(20, 'Experience must be at least 20 characters'),
})

export type ProposalInput = z.infer<typeof proposalSchema>

export const vendorProfileSchema = z.object({
  service_description: z.string().min(50).max(2000),
  categories: z.array(z.string()).min(1),
  skills: z.array(z.string()).min(1),
  experience_years: z.number().int().min(0).max(50),
  compliance_expertise: z.array(z.string()).optional().default([]),
  tools_used: z.array(z.string()).optional().default([]),
  rate_range: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }).refine(d => d.max > d.min, { message: 'Max rate must be greater than min' }),
  sample_work: z.array(z.object({
    title: z.string(),
    description: z.string(),
    outcome: z.string(),
  })).optional().default([]),
})

export type VendorProfileInput = z.infer<typeof vendorProfileSchema>

export const dealTransitionSchema = z.object({
  action: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  note: z.string().optional(),
})

export const certUploadSchema = z.object({
  cert_name: z.string().min(3, 'Certificate name is required'),
  cert_type: z.enum([
    'OSCP', 'CEH', 'CISSP', 'CISM', 'ISO27001',
    'CompTIA_Security', 'GPEN', 'GWAPT', 'eJPT', 'other'
  ]),
})

export type CertUploadInput = z.infer<typeof certUploadSchema>

// Service type options for forms
export const SERVICE_TYPES = [
  'Penetration Testing',
  'Vulnerability Assessment',
  'Security Audit',
  'Incident Response',
  'Red Team',
  'Blue Team',
  'Cloud Security',
  'Application Security',
  'Network Security',
  'Compliance Consulting',
  'Security Architecture',
  'Threat Modeling',
  'Digital Forensics',
  'Malware Analysis',
  'Security Training',
] as const

export const COMPLIANCE_OPTIONS = [
  'SOC 2', 'ISO 27001', 'PCI DSS', 'HIPAA', 'GDPR',
  'NIST', 'FedRAMP', 'CCPA', 'SOX', 'CMMC',
] as const
