import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const CERTIFICATIONS = [
  { name: "OSCP", class: "cert-oscp", full: "Offensive Security Certified Professional" },
  { name: "CISSP", class: "cert-cissp", full: "Certified Information Systems Security Professional" },
  { name: "CEH", class: "cert-ceh", full: "Certified Ethical Hacker" },
  { name: "AWS-SEC", class: "cert-aws", full: "AWS Security Specialty" },
  { name: "GPEN", class: "cert-gpen", full: "GIAC Penetration Tester" },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Anonymous Aliases",
    description: "Every user gets a unique cryptographic alias. Your real identity is never exposed to other marketplace participants.",
    badge: "Privacy First",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: "E2E Encryption",
    description: "All messages encrypted with TweetNaCl. Zero-knowledge architecture — even we can't read your communications.",
    badge: "256-bit",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      </svg>
    ),
    title: "Trust Engine",
    description: "Dynamic trust scores calculated from deal history, response time, quality ratings, and verified certifications.",
    badge: "AI-Powered",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
      </svg>
    ),
    title: "Reveal Protocol",
    description: "Dual-consent identity reveal only after deal completion. Both parties must agree before any personal data is shared.",
    badge: "Consent-Based",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Post Requirement", desc: "Describe your cybersecurity needs anonymously. Set budget and timeline." },
  { step: "02", title: "Get Matched", desc: "Our engine matches you with certified vendors who fit your requirements." },
  { step: "03", title: "Review & Select", desc: "Compare proposals, trust scores, and certifications. Pick the best fit." },
  { step: "04", title: "Complete & Reveal", desc: "After delivery, optionally reveal identities with dual-consent protocol." },
];

function CertBadge({ name, className }: { name: string; className: string }) {
  return (
    <span className={`cert-badge ${className}`}>
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      {name}
    </span>
  );
}

function formatStat(value: number, suffix: string = ""): string {
  if (value >= 10000) return `${(value / 1000).toFixed(0)}K+`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K+`;
  if (value >= 100) return `${value}+`;
  if (value > 0) return `${value}${suffix}`;
  return "—";
}

export default function LandingPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [stats, setStats] = useState({ vendors: 0, deals: 0 });

  useEffect(() => {
    api
      .get("/api/marketplace/public/landing")
      .then((resp) => {
        if (resp && resp.data) {
          setVendors(resp.data.vendors || []);
          setStats(resp.data.stats || { vendors: 0, deals: 0 });
        }
      })
      .catch(() => {});
  }, []);

  const STATS = [
    { value: formatStat(stats.vendors), label: "Verified Vendors" },
    { value: formatStat(stats.deals), label: "Completed Deals" },
    { value: "99.9%", label: "Uptime SLA" },
    { value: "E2E", label: "Encrypted Comms" },
  ];

  const heroVendor = vendors[0] || null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[var(--foreground)]">SHIELD</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Features</a>
            <a href="#vendors" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">Vendors</a>
            <a href="#how-it-works" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">How It Works</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors px-4 py-2">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-sm font-semibold text-white px-5 py-2.5 rounded-lg gradient-cta hover:opacity-90 transition-opacity shadow-md"
            >
              Get Protected
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="gradient-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-[var(--primary)] rounded-full blur-[128px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-[var(--verified)] rounded-full blur-[160px]" />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-[var(--verified)] animate-pulse" />
                {stats.vendors > 0 ? `Trusted by ${formatStat(stats.vendors)} verified professionals` : "Anonymous cybersecurity marketplace"}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                Verified security professionals.{" "}
                <span className="text-[var(--primary)]">Certified protection.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 max-w-xl leading-relaxed">
                Connect with OSCP, CISSP, and CEH certified cybersecurity experts — completely anonymously.
                Your identity stays hidden until you choose to reveal it.
              </p>
              <div className="flex flex-wrap gap-4 mb-8">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg gradient-cta text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg glow-pulse"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  Get Protected
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-colors"
                >
                  Learn More
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </a>
              </div>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATIONS.map((cert) => (
                  <CertBadge key={cert.name} name={cert.name} className={cert.class} />
                ))}
              </div>
            </div>

            {/* Vendor Card Preview — from real data */}
            <div className="hidden lg:block slide-up stagger-2">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{heroVendor?.alias || "Your-Alias-Here"}</span>
                        <svg className="w-4 h-4 text-[var(--verified)]" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-xs text-slate-400">Trust Score: {heroVendor?.trust_score || 0}/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-[var(--verified)]">{heroVendor?.trust_score || "—"}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Trust</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(heroVendor?.cert_badges || ["OSCP", "CISSP"]).slice(0, 3).map((cert: string) => {
                    const certClass = `cert-${cert.toLowerCase().replace("-", "")}`;
                    return <CertBadge key={cert} name={cert} className={certClass} />;
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {(heroVendor?.skills || ["Penetration Testing", "Security Audit"]).slice(0, 3).map((skill: string) => (
                    <span key={skill} className="px-2.5 py-1 rounded-md bg-white/10 text-xs font-medium text-slate-300">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-xs text-slate-400">{heroVendor?.completed_deals || 0} deals completed</span>
                  <span className="text-xs font-semibold text-[var(--warning)]">★ {heroVendor?.response_rate || 100}% response</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-white border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-[var(--primary)]">{stat.value}</div>
                <div className="text-sm text-[var(--muted-foreground)] mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="py-20 md:py-28 gradient-shield">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary-hover)] text-xs font-semibold mb-4">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              Security Architecture
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--foreground)] mb-4">
              Built for Zero-Trust Security
            </h2>
            <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto">
              Every layer of SHIELD is designed to protect your identity while enabling trusted cybersecurity transactions.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="card-hover bg-white rounded-xl border border-[var(--border)] p-7 hover:border-[var(--primary)] group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)] flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-[var(--foreground)]">{feature.title}</h3>
                      <span className="px-2 py-0.5 rounded-md bg-[var(--verified-soft)] text-[var(--verified-foreground)] text-[10px] font-bold uppercase tracking-wider">
                        {feature.badge}
                      </span>
                    </div>
                    <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vendor Previews ── */}
      <section id="vendors" className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--verified-soft)] text-[var(--verified-foreground)] text-xs font-semibold mb-4">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
              Verified Professionals
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--foreground)] mb-4">
              Top-Rated Security Experts
            </h2>
            <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto">
              Every vendor is verified through our certification validation system. Browse by expertise, rating, and trust score.
            </p>
          </div>
          {vendors.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-6">
              {vendors.map((vendor: any) => (
                <div
                  key={vendor.alias}
                  className="card-hover bg-[var(--background)] rounded-xl border border-[var(--border)] p-6 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-[var(--verified)] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                    Verified
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white font-bold text-sm">
                      {vendor.alias.charAt(0).toUpperCase()}{vendor.alias.includes("-") ? vendor.alias.split("-")[1]?.charAt(0)?.toUpperCase() || "" : ""}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-[var(--foreground)] text-sm">{vendor.alias}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{vendor.completed_deals} deals · {vendor.response_rate}% response rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-extrabold text-[var(--verified)]">{vendor.trust_score}</div>
                      <div className="text-[9px] text-[var(--muted-foreground)] uppercase tracking-widest">Trust</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(vendor.cert_badges || []).slice(0, 3).map((cert: string) => {
                      const certClass = `cert-${cert.toLowerCase().replace("-", "")}`;
                      return <CertBadge key={cert} name={cert} className={certClass} />;
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(vendor.skills || []).slice(0, 3).map((skill: string) => (
                      <span key={skill} className="px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--accent-foreground)] text-[11px] font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <Link
                    to={`/vendor/${vendor.alias}`}
                    className="w-full block text-center py-2.5 rounded-lg border border-[var(--primary)] text-[var(--primary)] text-sm font-semibold hover:bg-[var(--primary)] hover:text-white transition-colors"
                  >
                    View Profile
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[var(--background)] rounded-xl border border-[var(--border)]">
              <svg className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">Be the First Vendor</h3>
              <p className="text-[var(--muted-foreground)] mb-4">Join SHIELD as a verified security professional.</p>
              <Link to="/signup?role=vendor" className="inline-flex px-6 py-2.5 rounded-lg gradient-cta text-white text-sm font-semibold">Join Now</Link>
            </div>
          )}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 md:py-28 gradient-shield">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary-hover)] text-xs font-semibold mb-4">
              Process
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[var(--foreground)] mb-4">
              How SHIELD Works
            </h2>
            <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto">
              From requirement to delivery — your identity stays private at every step.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative">
                <div className="bg-white rounded-xl border border-[var(--border)] p-6 h-full card-hover">
                  <div className="text-4xl font-black text-[var(--primary)]/20 mb-3">{step.step}</div>
                  <h3 className="text-lg font-bold text-[var(--foreground)] mb-2">{step.title}</h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{step.desc}</p>
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <svg className="w-6 h-6 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-20 md:py-28 gradient-hero text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 text-sm font-medium mb-8">
            🛡️ {stats.vendors > 0 ? `Join ${formatStat(stats.vendors)} verified security professionals` : "Join the anonymous cybersecurity marketplace"}
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
            Ready to secure your operations{" "}
            <span className="text-[var(--primary)]">anonymously?</span>
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Whether you need cybersecurity services or want to offer your expertise — SHIELD protects your identity while building trust.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/signup?role=buyer"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg gradient-cta text-white font-bold text-lg hover:opacity-90 transition-opacity shadow-xl"
            >
              I Need Security Services
            </Link>
            <Link
              to="/signup?role=vendor"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg border-2 border-white/40 text-white font-bold text-lg hover:bg-white/10 transition-colors"
            >
              I'm a Security Professional
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[var(--foreground)] text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                </div>
                <span className="text-white font-bold">SHIELD</span>
              </div>
              <p className="text-sm leading-relaxed">Anonymous cybersecurity marketplace with verified professionals and end-to-end encryption.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#vendors" className="hover:text-white transition-colors">Vendors</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                <li><Link to="/signup" className="hover:text-white transition-colors">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Security</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="hover:text-white transition-colors cursor-default">E2E Encryption</span></li>
                <li><span className="hover:text-white transition-colors cursor-default">Zero-Knowledge Architecture</span></li>
                <li><span className="hover:text-white transition-colors cursor-default">SOC 2 Compliant</span></li>
                <li><span className="hover:text-white transition-colors cursor-default">GDPR Ready</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Certifications Supported</h4>
              <div className="flex flex-wrap gap-1.5">
                {CERTIFICATIONS.map((cert) => (
                  <CertBadge key={cert.name} name={cert.name} className={cert.class} />
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs">© 2026 SHIELD Marketplace. All rights reserved.</p>
            <div className="flex gap-6 text-xs">
              <span className="hover:text-white transition-colors cursor-default">Privacy Policy</span>
              <span className="hover:text-white transition-colors cursor-default">Terms of Service</span>
              <span className="hover:text-white transition-colors cursor-default">Security</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
