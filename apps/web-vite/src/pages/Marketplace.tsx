import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Shield, Search, Star, BadgeCheck, Filter, SlidersHorizontal, ArrowRight, Loader2 } from "lucide-react";
import { usePublicVendors } from "@/lib/hooks/use-api";

interface Vendor {
  alias: string;
  role: string;
  trust_score: number;
  cert_badges: string[];
  skills: string[];
  completed_deals: number;
  response_rate: number;
  joined_at: string;
}

export default function Marketplace() {
  const { data, isLoading, error } = usePublicVendors();
  const vendors = (data || []) as Vendor[];
  const [search, setSearch] = useState("");
  const [minTrust, setMinTrust] = useState(0);
  const [selectedSkill, setSelectedSkill] = useState("All");

  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    vendors.forEach((v) => v.skills?.forEach((s) => skills.add(s)));
    return ["All", ...Array.from(skills).sort()];
  }, [vendors]);

  const filtered = useMemo(() => {
    return vendors.filter((v) => {
      const matchSearch = v.alias.toLowerCase().includes(search.toLowerCase()) ||
        v.skills?.some(s => s.toLowerCase().includes(search.toLowerCase()));
      const matchTrust = v.trust_score >= minTrust;
      const matchSkill = selectedSkill === "All" || v.skills?.includes(selectedSkill);
      return matchSearch && matchTrust && matchSkill;
    });
  }, [vendors, search, minTrust, selectedSkill]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading verified vendors...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center">
        <div className="text-center p-8 bg-slate-50/40 border border-slate-800 rounded-3xl max-w-md mx-auto">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">Error loading marketplace</h3>
          <p className="text-slate-500 text-sm mb-6">{String(error)}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-white hover:bg-slate-700 text-white rounded-xl transition-colors text-sm font-bold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-cyan-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">SHIELD</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Login</Link>
            <Link to="/signup" className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-slate-200 transition-all">Join SHIELD</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-cyan-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-[1.1]">
              Verified <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Security Experts</span> on Demand
            </h1>
            <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-2xl">
              Connect with audited cybersecurity specialists. Every alias is backed by verifiable certifications and a cryptographic trust score.
            </p>

            {/* Search Bar */}
            <div className="relative group max-w-2xl">
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity rounded-2xl" />
              <div className="relative flex items-center p-2 bg-slate-50/80 border border-slate-200 rounded-2xl backdrop-blur-xl ring-1 ring-slate-800/50">
                <Search className="w-5 h-5 ml-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by specialty, skill or alias..."
                  className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-600 px-4 py-2"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-24">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 space-y-8 shrink-0">
            <div className="p-6 bg-slate-50/40 border border-slate-800/60 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-6 text-white font-semibold">
                <Filter className="w-4 h-4 text-cyan-400" />
                <span>Filters</span>
              </div>

              {/* Trust Score Filter */}
              <div className="space-y-4 mb-8">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Min Trust Score: {minTrust}</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="w-full h-1.5 bg-white rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  value={minTrust}
                  onChange={(e) => setMinTrust(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-[10px] text-slate-600 font-medium">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {/* Skill Filter */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Specialty</label>
                <div className="space-y-1">
                  {allSkills.slice(0, 8).map(skill => (
                    <button
                      key={skill}
                      onClick={() => setSelectedSkill(skill)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedSkill === skill
                          ? "bg-cyan-500/10 text-cyan-400 font-medium"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white"
                        }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Platform Stats */}
            <div className="p-6 border border-slate-800/40 rounded-2xl bg-gradient-to-br from-slate-900/20 to-transparent">
              <h4 className="text-white font-medium mb-4 text-sm group-hover:text-cyan-400 transition-colors">SHIELD Verification</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                All vendors on SHIELD are cryptographically verified. Trust scores are calculated based on successful deliveries and certification audit.
              </p>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-400 text-sm font-medium">
                Showing <span className="text-white font-bold">{filtered.length}</span> verified vendors
              </h2>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Sort: <span className="text-slate-300">Highest Trust</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((vendor) => (
                <Link
                  key={vendor.alias}
                  to={`/vendor/${vendor.alias}`}
                  className="group relative p-6 bg-slate-50/40 border border-slate-800/80 rounded-2xl hover:border-slate-200 hover:bg-slate-50/60 transition-all overflow-hidden"
                >
                  {/* Hover Accent */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center ring-2 ring-slate-800 group-hover:ring-cyan-500/50 transition-all">
                        <span className="text-white font-mono font-bold">{vendor.alias.substring(0, 2).toUpperCase()}</span>
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-lg leading-tight group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{vendor.alias}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />
                          <span>Verified Expert</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                        <Star className="w-4 h-4 fill-cyan-400" />
                        <span className="text-xl leading-none">{vendor.trust_score}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Trust Score</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {vendor.skills?.slice(0, 4).map(skill => (
                      <span key={skill} className="px-2 py-1 bg-white border border-slate-200/30 rounded-md text-[10px] font-medium text-slate-300">
                        {skill}
                      </span>
                    ))}
                    {(vendor.skills?.length || 0) > 4 && (
                      <span className="px-2 py-1 text-[10px] text-slate-600 font-bold">
                        +{(vendor.skills?.length || 0) - 4} MORE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/60">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase">Success Rate</p>
                        <p className="text-xs text-slate-300">98%</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-600 uppercase">Response</p>
                        <p className="text-xs text-slate-300">&lt; 2h</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-cyan-400 text-xs font-bold group-hover:gap-2 transition-all">
                      View Profile <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="py-20 text-center bg-slate-50/20 border border-dashed border-slate-800 rounded-3xl">
                <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">No vendors matched your filters</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Try broadening your search criteria or clearing filters to see more profiles.</p>
                <button
                  onClick={() => { setSearch(""); setMinTrust(0); setSelectedSkill("All"); }}
                  className="mt-6 px-6 py-2 bg-white hover:bg-slate-700 text-white rounded-xl transition-colors text-sm font-bold"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
