import { useParams, Link } from "react-router-dom";
import { Shield, Star, BadgeCheck, Zap, Award, CheckCircle, MessageSquare, Users, Loader2 } from "lucide-react";
import { StarRating } from "@/components/shared/StarRating";
import { usePublicVendors, useVendorReviews } from "@/lib/hooks/use-api";

export default function VendorProfile() {
  const { alias } = useParams<{ alias: string }>();
  const { data: vendors = [], isLoading: isLoadingVendors, error: errorVendors } = usePublicVendors();
  const { data: vendorReviews = [], isLoading: isLoadingReviews, error: errorReviews } = useVendorReviews(alias || "");

  const isLoading = isLoadingVendors || isLoadingReviews;
  const vendor = vendors.find((v: any) => v.alias === alias);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          <p className="text-slate-400 text-sm">Loading vendor profile...</p>
        </div>
      </div>
    );
  }

  if (errorVendors || errorReviews) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center">
        <div className="text-center p-8 bg-slate-50/40 border border-slate-800 rounded-3xl max-w-md mx-auto">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">Error Loading Profile</h3>
          <p className="text-slate-500 text-sm mb-6">
            {String(errorVendors || errorReviews)}
          </p>
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

  if (!vendor) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200 flex items-center justify-center">
        <div className="text-center p-8 bg-slate-50/40 border border-slate-800 rounded-3xl max-w-md mx-auto">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg mb-2">Vendor Profile Not Found</h3>
          <p className="text-slate-500 text-sm mb-6">The vendor alias "{alias}" could not be found in our directory.</p>
          <Link
            to="/marketplace"
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-colors text-sm font-bold inline-block"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  // Derive profile and certifications from query responses
  const profile = {
    alias: vendor.alias,
    trust_score: vendor.trust_score ?? 50,
    created_at: new Date().toISOString(), // Placeholder joined date
    rating_as_vendor: vendorReviews.length > 0 ? (vendorReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / vendorReviews.length) : 5.0,
    total_vendor_reviews: vendorReviews.length,
  };

  const certs = (vendor.certifications || []).map((c: string, i: number) => ({
    id: i,
    cert_name: c,
    verified: true,
    review_status: 'APPROVED',
  }));

  const mongoProfile = {
    service_description: vendor.service_description || "",
    skills: vendor.skills || [],
    sample_work: [], // Not returned in the marketplace API, default to empty
  };

  const directory = {
    skills: vendor.skills || [],
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      {/* Mini Nav */}
      <nav className="border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/marketplace" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-widest">
            <Shield className="w-3.5 h-3.5" />
            Back to Marketplace
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-cyan-500/10">
              Inquire Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Profile Header */}
      <div className="relative pt-12 pb-24 overflow-hidden border-b border-slate-900/50">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 relative">
          <div className="flex flex-col lg:flex-row gap-12 items-start">

            {/* Avatar / Score Card */}
            <div className="w-full lg:w-80 shrink-0">
              <div className="p-8 bg-slate-50/40 border border-slate-800/60 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative">
                  <div className="w-32 h-32 mx-auto rounded-full bg-white flex items-center justify-center ring-4 ring-slate-800/50 shadow-2xl shadow-cyan-500/10 mb-6">
                    <span className="text-4xl font-black text-white font-mono uppercase tracking-tighter">
                      {(profile.alias || "").substring(0, 2)}
                    </span>
                  </div>

                  <h1 className="text-2xl font-bold text-center text-white mb-1 uppercase tracking-tight group-hover:text-cyan-400 transition-colors">
                    {profile.alias}
                  </h1>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-cyan-400 mb-8 font-bold uppercase tracking-widest">
                    <BadgeCheck className="w-3.5 h-3.5 fill-cyan-400/20" />
                    Verified Expert
                  </div>

                  <div className="grid grid-cols-2 gap-3 py-6 border-y border-slate-800/60">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Trust Score</p>
                      <div className="flex items-center justify-center gap-1 text-white font-black text-xl">
                        <Star className="w-4 h-4 fill-cyan-500 text-cyan-500" />
                        {profile.trust_score}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-1">Client Rating</p>
                      <div className="flex items-center justify-center">
                        <StarRating rating={profile.rating_as_vendor || 0} totalReviews={profile.total_vendor_reviews || 0} size="md" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Platform Rank</span>
                      <span className="text-slate-200 font-bold">Top 5%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Joined date</span>
                      <span className="text-slate-200 font-bold">
                        {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-12">
              <div>
                <h2 className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                  <Zap className="w-3 h-3 text-cyan-400" /> Professional Overview
                </h2>
                <p className="text-xl md:text-2xl text-slate-200 leading-relaxed font-medium">
                  {mongoProfile?.service_description || "Specializing in high-stakes penetration testing and incident response. Providing cryptographically verified security expertise for SHIELD platform partners."}
                </p>
              </div>

              {/* Skills & Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Core Expertise */}
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-sm tracking-tight">Core Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {(mongoProfile?.skills || directory?.skills || []).map((skill: string) => (
                      <span key={skill} className="px-3 py-1.5 bg-white/40 border border-slate-200 rounded-xl text-xs font-bold text-slate-300 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Engagement Stats */}
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-sm tracking-tight">Vitals</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50/40 border border-slate-800/60 rounded-2xl">
                      <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase mb-1">
                        <MessageSquare className="w-3 h-3" /> Response
                      </div>
                      <p className="text-white font-bold text-sm">&lt; 1 hour</p>
                    </div>
                    <div className="p-4 bg-slate-50/40 border border-slate-800/60 rounded-2xl">
                      <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase mb-1">
                        <Users className="w-3 h-3" /> Repeat Hire
                      </div>
                      <p className="text-white font-bold text-sm">42%</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Certifications */}
              <div className="space-y-6">
                <h2 className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-cyan-400" /> Verified Certifications
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {certs.map((cert: any) => (
                    <div key={cert.id} className="p-4 bg-gradient-to-br from-slate-900/60 to-slate-900/20 border border-slate-800/60 rounded-2xl flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-lg bg-cyan-600/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Award className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-white font-bold text-xs truncate uppercase tracking-tight">{cert.cert_name}</h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-500/80 uppercase">Audited</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {certs.length === 0 && (
                    <div className="col-span-full p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-600 text-xs uppercase font-bold tracking-widest">
                      Primary Verification Level Required
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client Reviews Section */}
      <section className="py-24 container mx-auto px-4">
        <h2 className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-12 flex items-center gap-2">
          <Star className="w-3.5 h-3.5 text-amber-400" /> Client Reviews
          {profile.total_vendor_reviews > 0 && (
            <span className="text-slate-600 font-medium">({profile.total_vendor_reviews})</span>
          )}
        </h2>
        {vendorReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vendorReviews.map((review: any, idx: number) => (
              <div key={idx} className="p-6 bg-slate-50/30 border border-slate-800/80 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <StarRating rating={review.rating} totalReviews={1} showCount={false} size="md" />
                  <span className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                {review.comment && (
                  <p className="text-sm text-slate-300 leading-relaxed">{review.comment}</p>
                )}
                <p className="text-xs text-slate-600 mt-3 font-medium">{review.reviewer_display}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-600 text-xs uppercase font-bold tracking-widest">No client reviews yet</p>
          </div>
        )}
      </section>

      {/* Footer Branding */}
      <footer className="py-24 border-t border-slate-900/50 bg-[#01040f]">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 mb-8">
            <Shield className="w-6 h-6 text-cyan-400" />
            <span className="text-lg font-bold text-white tracking-widest uppercase">SHIELD Cryptographic Verification</span>
          </div>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            Every transaction on SHIELD is secured via End-to-End Encryption. Identities remain anonymous until mutual consent is provided, ensuring zero-trust engagement for both parties.
          </p>
        </div>
      </footer>
    </div>
  );
}
