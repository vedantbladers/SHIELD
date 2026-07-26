// ============================================================
// ONBOARDING PAGE — Welcome, show alias, complete setup
// ============================================================

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

type ProfileData = {
  alias: string;
  role: string;
  onboarding_complete: boolean;
};

export default function Onboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const { alias, role, isLoading: authLoading, isAuthenticated, profile: authProfile, refreshSession } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    if (authProfile?.onboarding_complete) {
      navigate(`/dashboard/${role}`);
      return;
    }
    setProfile({
      alias: alias || "",
      role: role || "buyer",
      onboarding_complete: false,
    });
    setLoading(false);
  }, [authLoading, isAuthenticated, authProfile, alias, role, navigate]);

  const completeOnboarding = async () => {
    setCompleting(true);
    try {
      // Mark onboarding as complete via API using Axios
      await api.patch('/api/cmp/auth/me', { onboarding_complete: true });
      const userRole = profile?.role || roleParam || "buyer";
      
      // Refresh AuthContext session to make sure the app knows we completed onboarding
      if (refreshSession) {
        await refreshSession();
      }
      
      navigate(`/dashboard/${userRole}`);
    } catch {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-[var(--primary)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-[var(--muted-foreground)]">Loading your profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-lg slide-up">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step ? "w-8 bg-[var(--primary)]" : s < step ? "w-8 bg-[var(--verified)]" : "w-8 bg-[var(--border)]"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] shadow-xl mb-6">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Welcome to SHIELD</h1>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-sm mx-auto">
              Your anonymous account has been created. Let&apos;s set up your secure marketplace identity.
            </p>
            <button
              onClick={() => setStep(2)}
              className="px-8 py-3 rounded-lg gradient-cta text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
            >
              Get Started →
            </button>
          </div>
        )}

        {/* Step 2: Your Anonymous Alias */}
        {step === 2 && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--verified-soft)] mb-6">
              <svg className="w-10 h-10 text-[var(--verified)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Your Anonymous Identity</h2>
            <p className="text-[var(--muted-foreground)] mb-6 max-w-sm mx-auto">
              This is your unique alias on the platform. No one can trace it back to your real identity.
            </p>

            {/* Alias Card */}
            <div className="bg-white rounded-xl border-2 border-[var(--primary)] p-6 mb-6 mx-auto max-w-xs">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold">
                {profile?.alias
                  ? profile.alias.charAt(0).toUpperCase() + profile.alias.split("-")[1]?.charAt(0).toUpperCase()
                  : "??"}
              </div>
              <div className="text-lg font-bold text-[var(--foreground)] mb-1 font-mono">
                {profile?.alias || "generating..."}
              </div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-[var(--verified)]">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                </svg>
                Verified {profile?.role === "vendor" ? "Vendor" : "Buyer"}
              </div>
              <div className="mt-3 text-center">
                <span className="text-xs text-[var(--muted-foreground)]">Trust Score</span>
                <div className="text-2xl font-extrabold text-[var(--primary)]">0</div>
              </div>
            </div>

            <div className="bg-[var(--accent)] rounded-lg p-4 mb-6 text-left max-w-xs mx-auto">
              <div className="flex items-start gap-2.5 text-xs text-[var(--muted-foreground)]">
                <svg className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <span>Your real email and identity are never shared. All communication uses this alias.</span>
              </div>
            </div>

            <button
              onClick={() => setStep(3)}
              className="px-8 py-3 rounded-lg gradient-cta text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-[var(--verified-soft)] mb-6">
              <svg className="w-10 h-10 text-[var(--verified)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">You&apos;re All Set!</h2>
            <p className="text-[var(--muted-foreground)] mb-8 max-w-sm mx-auto">
              Your SHIELD account is ready. {profile?.role === "vendor"
                ? "Start listing your cybersecurity services and get matched with buyers."
                : "Post your cybersecurity requirements and get matched with certified vendors."}
            </p>

            {/* What you can do */}
            <div className="bg-white rounded-xl border border-[var(--border)] p-5 mb-8 text-left max-w-sm mx-auto">
              <h3 className="text-sm font-bold text-[var(--foreground)] mb-3">What you can do now:</h3>
              <div className="space-y-3">
                {(profile?.role === "vendor"
                  ? [
                      { icon: "📋", text: "Upload your certifications for verification" },
                      { icon: "🔍", text: "Browse open requirements from buyers" },
                      { icon: "💼", text: "Submit proposals to matched opportunities" },
                      { icon: "💬", text: "Chat with buyers via encrypted messaging" },
                    ]
                  : [
                      { icon: "📝", text: "Post your cybersecurity requirements" },
                      { icon: "🔍", text: "Browse the vendor marketplace" },
                      { icon: "📊", text: "Review proposals and trust scores" },
                      { icon: "💬", text: "Chat with vendors via encrypted messaging" },
                    ]
                ).map((item) => (
                  <div key={item.text} className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={completeOnboarding}
              disabled={completing}
              className="px-8 py-3 rounded-lg gradient-cta text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md flex items-center justify-center gap-2 mx-auto"
            >
              {completing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Entering Dashboard...
                </>
              ) : (
                <>
                  Enter Dashboard
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
