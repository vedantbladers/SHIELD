import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Search, CheckCircle } from 'lucide-react'

const CATEGORIES = [
  "All", "Penetration Testing", "Cloud Security", "Compliance",
  "Incident Response", "Vulnerability Assessment", "Web App Security",
  "Application Security", "Network Security",
]

export default function BuyerMarketplace() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('trust')

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendor-marketplace', category],
    queryFn: async () => {
      const res = await api.get(`/api/cmp/marketplace/vendors?category=${encodeURIComponent(category)}`) as any
      return res.data || []
    },
  })

  const filtered = (vendors || []).filter((v: any) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return v.alias?.toLowerCase().includes(q) ||
      v.skills?.some((s: string) => s.toLowerCase().includes(q)) ||
      v.categories?.some((c: string) => c.toLowerCase().includes(q))
  })

  const sorted = [...filtered].sort((a: any, b: any) => {
    if (sort === 'trust') return (b.trust_score || 0) - (a.trust_score || 0)
    if (sort === 'deals') return (b.completed_deals || 0) - (a.completed_deals || 0)
    return 0
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Marketplace</h1>
        <p className="text-slate-400 mt-1">Browse verified cybersecurity professionals</p>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by skill, certification, or alias..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-white placeholder-slate-500 text-sm focus:border-cyan-500 focus:outline-none" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-300 focus:outline-none">
          <option value="trust">Sort: Trust Score</option>
          <option value="deals">Sort: Most Deals</option>
        </select>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                : "bg-white border border-slate-200 text-slate-400 hover:border-slate-500"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Vendor Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl h-64 border border-slate-200" />
          ))}
        </div>
      ) : sorted.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((vendor: any) => (
            <div key={vendor.alias} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-cyan-500/30 transition-all group">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                      {vendor.alias?.charAt(0)?.toUpperCase()}{vendor.alias?.split("-")[1]?.charAt(0)?.toUpperCase() || ""}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white font-mono">{vendor.alias}</span>
                        {vendor.is_verified && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-xs text-slate-500">
                        {vendor.completed_deals || 0} deals · {vendor.experience_years || 0}yr exp
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-extrabold text-cyan-400">{vendor.trust_score || 0}</div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest">Trust</div>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">{vendor.service_description || "No description provided."}</p>

                {/* Certifications */}
                {vendor.certifications?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {vendor.certifications.slice(0, 4).map((cert: string) => (
                      <span key={cert} className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-medium border border-purple-500/20">
                        {cert}
                      </span>
                    ))}
                  </div>
                )}

                {/* Skills */}
                <div className="flex flex-wrap gap-1">
                  {(vendor.skills || []).slice(0, 4).map((skill: string) => (
                    <span key={skill} className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300 text-[10px] font-medium">
                      {skill}
                    </span>
                  ))}
                  {(vendor.skills || []).length > 4 && (
                    <span className="px-2 py-0.5 text-slate-500 text-[10px]">+{vendor.skills.length - 4} more</span>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/30 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {vendor.rate_range && (
                    <span>${vendor.rate_range.min?.toLocaleString()} – ${vendor.rate_range.max?.toLocaleString()}</span>
                  )}
                </div>
                <Link to={`/dashboard/buyer/post-requirement`}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold hover:bg-cyan-500 transition-colors">
                  Request Proposal
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white/30 rounded-xl border border-slate-200">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No vendors found</h3>
          <p className="text-slate-400">Try a different search term or category.</p>
        </div>
      )}
    </div>
  )
}
