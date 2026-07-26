import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDealDetail, useDealTransition, useConsentReveal, useCloseDeal, useSubmitReview, useUpdateDealPrice, useDealReviews } from '@/lib/hooks/use-api'
import { ArrowLeft, Shield, Clock, DollarSign, MessageSquare, CheckCircle, RefreshCw, AlertTriangle, Unlock, Star, Pencil, X } from 'lucide-react'
import { StarRating } from '@/components/shared/StarRating'

const STATUS_COLORS: Record<string, string> = {
  NEGOTIATING: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CONTRACTED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  IN_PROGRESS: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  REVIEW: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  CLOSED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  DISPUTED: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const EVENT_ICONS: Record<string, any> = {
  deal_created: CheckCircle,
  status_change: RefreshCw,
  deal_closed: CheckCircle,
  price_updated: DollarSign,
}

const STAR_LABELS = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent']

export default function BuyerDealDetail() {
  const { id } = useParams() as { id: string }
  const { data, isLoading } = useDealDetail(id) as { data: any; isLoading: boolean }
  const transition = useDealTransition(id)
  const consentReveal = useConsentReveal(id)
  const closeDeal = useCloseDeal(id)
  const submitReview = useSubmitReview(id)
  const updatePrice = useUpdateDealPrice(id)
  const { data: reviews } = useDealReviews(id)

  const [disputeReason, setDisputeReason] = useState('')
  const [userRole, setUserRole] = useState<'buyer' | 'vendor'>('buyer')

  // Price edit state
  const [editingPrice, setEditingPrice] = useState(false)
  const [newPrice, setNewPrice] = useState('')

  // Close deal confirmation
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingSuccess, setRatingSuccess] = useState(false)

  useEffect(() => {
    if (window.location.pathname.includes('/vendor/')) setUserRole('vendor')
    else setUserRole('buyer')
  }, [])

  // Auto-show rating modal after deal closes
  useEffect(() => {
    if (!data?.deal || !reviews) return
    const deal = data.deal
    if (deal.status === 'CLOSED') {
      const myReviewRole = userRole
      const alreadyReviewed = reviews.some((r: any) => r.reviewer_role === myReviewRole)
      if (!alreadyReviewed && !ratingSuccess) {
        setShowRatingModal(true)
      }
    }
  }, [data?.deal?.status, reviews, userRole, ratingSuccess, data?.deal])

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-white rounded-xl" /><div className="h-64 bg-white rounded-xl" /></div>

  const deal = data?.deal
  if (!deal) return <p className="text-slate-400">Deal not found.</p>

  const handleTransition = async (action: string, note?: string) => {
    if (!confirm(`Change deal status to ${action}?`)) return
    try { await transition.mutateAsync({ action, note }) } catch (err: any) { alert(err.message) }
  }

  const handleCloseDeal = async () => {
    try {
      await closeDeal.mutateAsync()
      setShowCloseConfirm(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handlePriceUpdate = async () => {
    const price = parseFloat(newPrice)
    if (isNaN(price) || price <= 0) return
    try {
      await updatePrice.mutateAsync({ agreed_price: price })
      setEditingPrice(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleSubmitReview = async () => {
    if (ratingValue === 0) return
    try {
      await submitReview.mutateAsync({ rating: ratingValue, comment: ratingComment || undefined })
      setShowRatingModal(false)
      setRatingSuccess(true)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const myReview = reviews?.find((r: any) => r.reviewer_role === userRole)
  const otherReview = reviews?.find((r: any) => r.reviewer_role !== userRole)

  return (
    <div className="space-y-6">
      <Link to={`/dashboard/${userRole}/deals`} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-400">
        <ArrowLeft className="w-4 h-4" /> Back to Deals
      </Link>

      {/* Deal Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[deal.status]}`}>{deal.status}</span>
            <p className="text-xs text-slate-500 mt-2">Deal #{deal.id.slice(0, 8)}</p>
          </div>
          <Link to={`/deal/${deal.id}/chat`}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <MessageSquare className="w-4 h-4" /> Open Chat
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-3">
            <Shield className="w-4 h-4 text-cyan-400 mb-1" />
            <p className="text-xs text-slate-500">Buyer</p>
            <p className="text-white font-mono text-sm">{deal.buyer_alias}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <Shield className="w-4 h-4 text-purple-400 mb-1" />
            <p className="text-xs text-slate-500">Vendor</p>
            <p className="text-white font-mono text-sm">{deal.vendor_alias}</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <DollarSign className="w-4 h-4 text-emerald-400 mb-1" />
            <p className="text-xs text-slate-500">Agreed Price</p>
            <p className="text-white font-medium">${deal.agreed_price?.toLocaleString() || '—'}</p>
            {deal.original_price && Number(deal.original_price) !== Number(deal.agreed_price) && (
              <p className="text-xs text-slate-500 line-through">Original: ${Number(deal.original_price).toLocaleString()}</p>
            )}
          </div>
          <div className="bg-white rounded-lg p-3">
            <Clock className="w-4 h-4 text-amber-400 mb-1" />
            <p className="text-xs text-slate-500">Created</p>
            <p className="text-white text-sm">{new Date(deal.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Price Edit Section — buyer only, NEGOTIATING/CONTRACTED */}
      {userRole === 'buyer' && ['NEGOTIATING', 'CONTRACTED'].includes(deal.status) && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" /> Price Negotiation
          </h2>
          {!editingPrice ? (
            <div className="flex items-center gap-3">
              <p className="text-white text-lg font-bold">${Number(deal.agreed_price).toLocaleString()}</p>
              <button onClick={() => { setNewPrice(String(deal.agreed_price)); setEditingPrice(true) }}
                className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">New Agreed Price (USD)</label>
                <input type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                  className="w-full max-w-xs bg-white border border-slate-200 rounded-lg px-4 py-2 text-white focus:border-cyan-500 outline-none" />
                <p className="text-xs text-slate-500 mt-1">Both parties must agree on price changes via chat</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingPrice(false)} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm">Cancel</button>
                <button onClick={handlePriceUpdate} disabled={updatePrice.isPending}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                  {updatePrice.isPending ? 'Updating...' : 'Update Price'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vendor price change notice */}
      {userRole === 'vendor' && ['NEGOTIATING', 'CONTRACTED'].includes(deal.status) && deal.price_updated_at && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-400 text-sm">
            <strong>Price Updated:</strong> Vendor updated the agreed price to ${Number(deal.agreed_price).toLocaleString()}. Confirm you accept this via chat.
          </p>
        </div>
      )}

      {/* Vendor REVIEW status banner */}
      {userRole === 'vendor' && deal.status === 'REVIEW' && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
          <p className="text-cyan-400 text-sm">
            The buyer is reviewing your submission. You&apos;ll be notified when the deal is closed.
          </p>
        </div>
      )}

      {/* Action Buttons (role-specific) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          {/* Buyer actions */}
          {userRole === 'buyer' && deal.status === 'NEGOTIATING' && (
            <button onClick={() => handleTransition('CONTRACTED')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Confirm Terms
            </button>
          )}
          {userRole === 'buyer' && deal.status === 'REVIEW' && (
            <>
              <button onClick={() => setShowCloseConfirm(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Approve & Close Deal
              </button>
              <button onClick={() => handleTransition('IN_PROGRESS', 'Changes requested')} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Request Changes
              </button>
              <button onClick={() => { if (disputeReason.trim()) handleTransition('DISPUTED', disputeReason) }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Raise Dispute
              </button>
            </>
          )}

          {/* Vendor actions */}
          {userRole === 'vendor' && deal.status === 'CONTRACTED' && (
            <button onClick={() => handleTransition('IN_PROGRESS')} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              Start Work
            </button>
          )}
          {userRole === 'vendor' && deal.status === 'IN_PROGRESS' && (
            <button onClick={() => handleTransition('REVIEW')} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              Submit for Review
            </button>
          )}

          {/* Cancel (both) */}
          {deal.status === 'NEGOTIATING' && (
            <button onClick={() => handleTransition('CANCELLED', 'Cancelled by ' + userRole)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
              Cancel Deal
            </button>
          )}

          {/* Identity reveal after CLOSED */}
          {['CLOSED', 'CANCELLED'].includes(deal.status) && !deal.identity_revealed && deal.status === 'CLOSED' && (
            <div className="w-full bg-white rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2"><Unlock className="w-4 h-4 text-purple-400" /> Identity Reveal</h3>
              <p className="text-xs text-slate-400 mb-3">Both parties must consent to reveal their real identities.</p>
              <button onClick={() => consentReveal.mutateAsync()} disabled={consentReveal.isPending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {consentReveal.isPending ? 'Sending consent...' : 'I Consent to Reveal My Identity'}
              </button>
              {deal.identity_revealed && <p className="text-emerald-400 text-sm mt-2">✓ Identities revealed! Check your email.</p>}
            </div>
          )}
        </div>

        {deal.status === 'REVIEW' && userRole === 'buyer' && (
          <div className="mt-3">
            <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Reason for dispute (required)..."
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-white text-sm focus:border-red-500 outline-none" rows={2} />
          </div>
        )}
      </div>

      {/* Reviews Display — CLOSED deals */}
      {deal.status === 'CLOSED' && reviews && reviews.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" /> Reviews
          </h2>
          <div className="space-y-4">
            {myReview && (
              <div className="bg-white rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">Your review</p>
                <StarRating rating={myReview.rating} totalReviews={1} showCount={false} />
                {myReview.comment && <p className="text-sm text-slate-300 mt-2">{myReview.comment}</p>}
                <p className="text-xs text-slate-500 mt-2">Submitted {new Date(myReview.created_at).toLocaleDateString()}</p>
              </div>
            )}
            {otherReview && (
              <div className="bg-white rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-2">{userRole === 'buyer' ? "Vendor's review of you" : "Buyer's review of you"}</p>
                <StarRating rating={otherReview.rating} totalReviews={1} showCount={false} />
                {otherReview.comment && <p className="text-sm text-slate-300 mt-2">{otherReview.comment}</p>}
                <p className="text-xs text-slate-500 mt-2">Submitted {new Date(otherReview.created_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deal Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Timeline</h2>
        {data?.events?.length > 0 ? (
          <div className="space-y-4">
            {data.events.map((event: any, i: number) => {
              const Icon = EVENT_ICONS[event.event_type] || Clock
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <Icon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    {i < data.events.length - 1 && <div className="w-px flex-1 bg-slate-700 mt-2" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm text-white font-medium">{event.note || event.event_type}</p>
                    <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                      {event.from_status && <span>{event.from_status} → {event.to_status}</span>}
                      <span>{new Date(event.created_at).toLocaleString()}</span>
                      <span className="font-mono">{event.actor_alias}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No events recorded yet.</p>
        )}
      </div>

      {/* Close Deal Confirmation Dialog */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Close this deal?</h3>
            <p className="text-sm text-slate-400 mb-6">
              Confirm that <span className="text-cyan-400 font-mono">{deal.vendor_alias}</span> has completed the work to your satisfaction. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCloseConfirm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCloseDeal} disabled={closeDeal.isPending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                {closeDeal.isPending ? 'Closing...' : 'Yes, Close Deal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                Rate your experience with <span className="text-cyan-400 font-mono">{userRole === 'buyer' ? deal.vendor_alias : deal.buyer_alias}</span>
              </h3>
              <button onClick={() => setShowRatingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Star Selection */}
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star}
                  onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)}
                  onClick={() => setRatingValue(star)}
                  className="text-3xl transition-colors focus:outline-none"
                  style={{ color: star <= (ratingHover || ratingValue) ? '#F59E0B' : '#475569' }}>
                  ★
                </button>
              ))}
            </div>
            {(ratingHover || ratingValue) > 0 && (
              <p className="text-sm text-amber-400 font-medium mb-4">{STAR_LABELS[ratingHover || ratingValue]}</p>
            )}

            {/* Comment */}
            <div className="mb-4">
              <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value.slice(0, 500))}
                placeholder="Share your experience (optional)"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-white text-sm focus:border-cyan-500 outline-none resize-none"
                rows={3} />
              <p className="text-xs text-slate-500 text-right mt-1">{ratingComment.length}/500</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowRatingModal(false)} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm">
                Skip for now
              </button>
              <button onClick={handleSubmitReview} disabled={ratingValue === 0 || submitReview.isPending}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
