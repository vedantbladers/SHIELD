import { useEffect, useState } from 'react'
import {
  BadgeCheck, Clock, CheckCircle, XCircle, Eye,
  ChevronLeft, ChevronRight, FileText, ExternalLink,
  Loader2, AlertTriangle
} from 'lucide-react'
import { useModeratorCertifications, useReviewCertification } from '@/lib/hooks/use-api'

interface Certification {
  id: string
  vendor_alias: string
  cert_name: string
  cert_type: string
  file_url: string | null
  verified: boolean
  verification_score: number
  review_status: string
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  uploaded_at: string
  vendor: { alias: string; role: string; trust_score: number }
}

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'all'

const PRESET_SCORES = [20, 15, 10, 5] as const

export default function ModeratorCertifications() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<StatusFilter>('PENDING')

  // Review state
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null)
  const [score, setScore] = useState(15)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Document viewer state
  const [fileBlob, setFileBlob] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState(false)

  const { data: responseData, isLoading } = useModeratorCertifications({
    status,
    page,
    limit: 10,
  })

  const certsResponse = responseData?.data
  const certs: Certification[] = certsResponse?.items ?? []
  const total = certsResponse?.total ?? 0
  const pages = certsResponse?.pages ?? 1

  const reviewMutation = useReviewCertification()

  // Load file when a cert is selected
  useEffect(() => {
    if (!selectedCert?.file_url) {
      setFileBlob(null)
      setFileError(false)
      return
    }

    let cancelled = false
    setFileLoading(true)
    setFileError(false)
    setFileBlob(null)

    fetch(selectedCert.file_url, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then(blob => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        setFileBlob(url)
        setFileLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setFileError(true)
        setFileLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCert?.id, selectedCert?.file_url])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (fileBlob) URL.revokeObjectURL(fileBlob)
    }
  }, [fileBlob])

  const selectCert = (cert: Certification) => {
    // Revoke old blob
    if (fileBlob) URL.revokeObjectURL(fileBlob)

    if (selectedCert?.id === cert.id) {
      // Deselect
      setSelectedCert(null)
      setReviewAction(null)
      setReason('')
    } else {
      setSelectedCert(cert)
      setReviewAction(null)
      setScore(15)
      setReason('')
    }
  }

  const handleReview = async () => {
    if (!selectedCert || !reviewAction) return
    setSubmitting(true)

    try {
      const body: Record<string, unknown> = { action: reviewAction }
      if (reviewAction === 'approve') body.score = score
      if (reviewAction === 'reject') body.reason = reason
      if (reviewAction === 'approve' && reason) body.reason = reason

      await reviewMutation.mutateAsync({
        id: selectedCert.id,
        body: body as any,
      })

      if (fileBlob) URL.revokeObjectURL(fileBlob)
      setSelectedCert(null)
      setReviewAction(null)
      setScore(15)
      setReason('')
      setFileBlob(null)
    } catch { /* empty */ }
    setSubmitting(false)
  }

  const statusTabs: { label: string; value: StatusFilter; color: string }[] = [
    { label: 'Pending', value: 'PENDING', color: 'text-amber-400 border-amber-400' },
    { label: 'Approved', value: 'APPROVED', color: 'text-emerald-400 border-emerald-400' },
    { label: 'Rejected', value: 'REJECTED', color: 'text-red-400 border-red-400' },
    { label: 'All', value: 'all', color: 'text-slate-300 border-slate-300' },
  ]

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const isPdf = (url: string | null) => url?.toLowerCase().endsWith('.pdf')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BadgeCheck className="w-7 h-7 text-amber-400" />
          Certification Review
        </h1>
        <p className="text-slate-400 mt-1">Review and manage vendor certifications</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-slate-800 pb-0">
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); setSelectedCert(null) }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              status === tab.value
                ? tab.color
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto text-sm text-slate-500 self-center">{total} total</div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-lg animate-pulse" />
          ))}
        </div>
      ) : certs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <BadgeCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No certifications found for this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column — Cert List */}
          <div className="space-y-2">
            {certs.map(cert => (
              <button
                key={cert.id}
                onClick={() => selectCert(cert)}
                className={`w-full text-left rounded-xl bg-white border p-4 transition-all ${
                  selectedCert?.id === cert.id
                    ? 'border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-200/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      cert.review_status === 'APPROVED' ? 'bg-emerald-500/10' :
                      cert.review_status === 'REJECTED' ? 'bg-red-500/10' :
                      'bg-amber-500/10'
                    }`}>
                      {cert.review_status === 'APPROVED' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
                       cert.review_status === 'REJECTED' ? <XCircle className="w-5 h-5 text-red-400" /> :
                       <Clock className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{cert.cert_name}</h3>
                      <p className="text-xs text-slate-500">
                        <span className="font-mono text-slate-400">{cert.vendor_alias}</span>
                        <span className="mx-1.5">·</span>
                        {cert.cert_type}
                        <span className="mx-1.5">·</span>
                        {getTimeAgo(cert.uploaded_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cert.review_status !== 'PENDING' && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        cert.review_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {cert.review_status === 'APPROVED' ? `+${cert.verification_score} pts` : 'Rejected'}
                      </span>
                    )}
                    {selectedCert?.id === cert.id && (
                      <Eye className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right Column — Document Viewer + Review Panel */}
          {selectedCert ? (
            <div className="space-y-4 lg:sticky lg:top-6">
              {/* Header */}
              <div className="rounded-xl bg-white border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                      {selectedCert.cert_type}
                    </span>
                    <h2 className="text-base font-bold text-white">{selectedCert.cert_name}</h2>
                  </div>
                  <span className="text-xs text-slate-500">{getTimeAgo(selectedCert.uploaded_at)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="font-mono bg-slate-700/50 px-2 py-0.5 rounded">{selectedCert.vendor_alias}</span>
                  <span>Trust: {selectedCert.vendor.trust_score}</span>
                </div>
              </div>

              {/* Document Viewer */}
              <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Document Preview</span>
                  </div>
                  {selectedCert.file_url && (
                    <a
                      href={selectedCert.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in new tab
                    </a>
                  )}
                </div>

                <div className="p-4">
                  {!selectedCert.file_url ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                      <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">No file attached to this certification.</p>
                    </div>
                  ) : fileLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Loader2 className="w-8 h-8 mb-3 animate-spin text-amber-400" />
                      <p className="text-sm">Loading document...</p>
                    </div>
                  ) : fileError ? (
                    <div className="flex flex-col items-center justify-center py-16 text-red-400">
                      <AlertTriangle className="w-8 h-8 mb-2" />
                      <p className="text-sm mb-3">Could not load file preview.</p>
                      <a
                        href={selectedCert.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-lg text-sm hover:bg-amber-500/20 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open file directly
                      </a>
                    </div>
                  ) : fileBlob ? (
                    isPdf(selectedCert.file_url) ? (
                      <iframe
                        src={fileBlob}
                        className="w-full rounded-lg border border-slate-200/30"
                        style={{ height: '500px', border: 'none' }}
                        title={`${selectedCert.cert_name} document`}
                      />
                    ) : (
                      <img
                        src={fileBlob}
                        alt={selectedCert.cert_name}
                        className="max-w-full rounded-lg border border-slate-200/30"
                      />
                    )
                  ) : null}
                </div>
              </div>

              {/* Review Panel — only for PENDING certs */}
              {selectedCert.review_status === 'PENDING' && (
                <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-4">
                  {/* Action Selection */}
                  {!reviewAction && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setReviewAction('approve')}
                        className="flex-1 py-3 text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setReviewAction('reject')}
                        className="flex-1 py-3 text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}

                  {/* Approve Panel */}
                  {reviewAction === 'approve' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-slate-400 block block mb-2">
                          Trust Score Points
                        </label>
                        <div className="flex gap-2 mb-2">
                          {PRESET_SCORES.map(ps => (
                            <button
                              key={ps}
                              onClick={() => setScore(ps)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                                score === ps
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {ps} pts
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Custom:</span>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={score}
                            onChange={e => setScore(Math.max(1, Math.min(20, Number(e.target.value))))}
                            className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none"
                          />
                          <span className="text-xs text-slate-500">pts (1-20)</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-400 block mb-1">
                          Notes (optional)
                        </label>
                        <textarea
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          placeholder="Optional review notes..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none resize-none h-16"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReview}
                          disabled={submitting}
                          className="flex-1 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all disabled:opacity-50"
                        >
                          {submitting ? 'Processing...' : `Approve — +${score} pts`}
                        </button>
                        <button
                          onClick={() => { setReviewAction(null); setReason('') }}
                          className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reject Panel */}
                  {reviewAction === 'reject' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-medium text-slate-400 block mb-1">
                          Rejection Reason (required)
                        </label>
                        <textarea
                          value={reason}
                          onChange={e => setReason(e.target.value)}
                          placeholder="Explain why this certification is being rejected..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none resize-none h-20"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleReview}
                          disabled={submitting || !reason.trim()}
                          className="flex-1 px-4 py-2.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-500 transition-all disabled:opacity-50"
                        >
                          {submitting ? 'Processing...' : 'Confirm Rejection'}
                        </button>
                        <button
                          onClick={() => { setReviewAction(null); setReason('') }}
                          className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Already reviewed info */}
              {selectedCert.review_status !== 'PENDING' && (
                <div className={`rounded-xl border p-4 ${
                  selectedCert.review_status === 'APPROVED'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedCert.review_status === 'APPROVED'
                      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />
                    }
                    <span className={`text-sm font-medium ${
                      selectedCert.review_status === 'APPROVED' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {selectedCert.review_status === 'APPROVED'
                        ? `Approved — +${selectedCert.verification_score} pts`
                        : 'Rejected'
                      }
                    </span>
                  </div>
                  {selectedCert.reviewed_by && (
                    <p className="text-xs text-slate-500">
                      By <span className="font-mono text-slate-400">{selectedCert.reviewed_by}</span>
                      {selectedCert.reviewed_at && ` · ${getTimeAgo(selectedCert.reviewed_at)}`}
                    </p>
                  )}
                  {selectedCert.rejection_reason && (
                    <p className="text-xs text-red-400/80 mt-2 leading-relaxed">
                      {selectedCert.rejection_reason}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <Eye className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Select a certification to preview</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-400">Page {page} of {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
