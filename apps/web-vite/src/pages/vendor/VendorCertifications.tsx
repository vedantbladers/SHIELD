import { useState } from 'react';
import { useVendorCertifications } from '@/lib/hooks/use-api';
import { Shield, Upload, CheckCircle, Clock, AlertCircle, X, FileText } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const CERT_TYPES = ['OSCP', 'CEH', 'CISSP', 'CISM', 'ISO27001', 'CompTIA_Security', 'GPEN', 'GWAPT', 'eJPT', 'other'] as const;

export default function VendorCertifications() {
  const { data: certs, isLoading } = useVendorCertifications() as { data: any[]; isLoading: boolean };
  const [showUpload, setShowUpload] = useState(false);
  const [certName, setCertName] = useState('');
  const [certType, setCertType] = useState<string>('OSCP');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const handleUpload = async () => {
    if (!certName.trim()) { setError('Certificate name is required'); return; }
    if (file && file.size > 5 * 1024 * 1024) { setError('File must be under 5MB'); return; }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.set('cert_name', certName);
      formData.set('cert_type', certType);
      if (file) formData.set('file', file);

      const res = await fetch('/api/cmp/vendor/certifications/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setShowUpload(false);
      setCertName('');
      setFile(null);
      qc.invalidateQueries({ queryKey: ['vendor-certifications'] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="w-7 h-7 text-purple-400" /> Certifications</h1>
          <p className="text-slate-400 mt-1">Upload and manage your security certifications</p>
        </div>
        <button onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Upload className="w-4 h-4" /> Add Certification
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white border border-slate-200 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Add Certification</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Certificate Name *</label>
                <input type="text" value={certName} onChange={e => setCertName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none"
                  placeholder="e.g. OSCP - Offensive Security" />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Certificate Type *</label>
                <select value={certType} onChange={e => setCertType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none">
                  {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Certificate File (PDF/Image, max 5MB)</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:text-sm file:font-medium file:cursor-pointer hover:file:bg-purple-500" />
              </div>
              {error && <p className="text-red-400 text-sm flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
              <button onClick={handleUpload} disabled={uploading}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {uploading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading...
                  </>
                ) : 'Upload Certification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certifications List */}
      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="animate-pulse h-24 bg-white rounded-xl" />)}</div>
      ) : certs && certs.length > 0 ? (
        <div className="grid gap-4">
          {certs.map((cert: any) => {
            const isPending = cert.review_status === 'PENDING';
            const isApproved = cert.review_status === 'APPROVED';
            const isRejected = cert.review_status === 'REJECTED';
            return (
              <div key={cert.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isApproved ? 'bg-emerald-500/20' :
                      isRejected ? 'bg-red-500/20' :
                      'bg-amber-500/20'
                    }`}>
                      {isApproved ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
                       isRejected ? <AlertCircle className="w-5 h-5 text-red-400" /> :
                       <Clock className="w-5 h-5 text-amber-400" />}
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{cert.cert_name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">{cert.cert_type}</span>
                        {isPending && (
                          <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Under Moderator Review
                          </span>
                        )}
                        {isApproved && (
                          <>
                            <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Verified ✓
                            </span>
                            <span className="text-xs text-emerald-400 font-medium">+{cert.verification_score} trust pts</span>
                          </>
                        )}
                        {isRejected && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Not Approved
                          </span>
                        )}
                      </div>
                      {isPending && (
                        <p className="text-xs text-slate-500 mt-1">Submitted for review. You will be notified.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {cert.signed_url && (
                      <a href={cert.signed_url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> View
                      </a>
                    )}
                    {isRejected && (
                      <button onClick={() => setShowUpload(true)}
                        className="px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs hover:bg-purple-500/30 flex items-center gap-1">
                        <Upload className="w-3 h-3" /> Upload Replacement
                      </button>
                    )}
                  </div>
                </div>
                {/* Rejection reason */}
                {isRejected && cert.rejection_reason && (
                  <div className="mt-3 px-3 py-2 bg-red-500/5 border border-red-500/20 rounded-lg">
                    <p className="text-xs text-red-400">
                      <span className="font-medium">Reason:</span> {cert.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white/30 rounded-xl border border-slate-200">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No certifications</h3>
          <p className="text-slate-400 mb-4">Upload your first certification to boost your trust score.</p>
          <button onClick={() => setShowUpload(true)} className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-medium">Upload Certification</button>
        </div>
      )}
    </div>
  );
}
