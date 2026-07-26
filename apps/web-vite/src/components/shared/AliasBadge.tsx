// ============================================================
// ALIAS BADGE — Displays user alias with role-based styling
// ============================================================
'use client'

import { Badge } from '@/components/ui/badge'
import { Shield, UserCheck, Crown, Eye } from 'lucide-react'
import type { UserRole } from '@/types'

interface AliasBadgeProps {
  alias: string
  role?: UserRole
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const roleConfig: Record<
  UserRole,
  { icon: typeof Shield; label: string; variant: string }
> = {
  buyer: {
    icon: Shield,
    label: 'Buyer',
    variant: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  },
  vendor: {
    icon: UserCheck,
    label: 'Vendor',
    variant: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  admin: {
    icon: Crown,
    label: 'Admin',
    variant: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  moderator: {
    icon: Eye,
    label: 'Moderator',
    variant: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export function AliasBadge({
  alias,
  role,
  size = 'md',
  showIcon = true,
  className = '',
}: AliasBadgeProps) {
  // Detect role from alias prefix if not provided
  const detectedRole: UserRole =
    role ??
    (alias.startsWith('Vendor')
      ? 'vendor'
      : alias.startsWith('Buyer')
        ? 'buyer'
        : 'admin')

  const config = roleConfig[detectedRole]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 font-mono font-medium ${config.variant} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <span>{alias}</span>
    </Badge>
  )
}
