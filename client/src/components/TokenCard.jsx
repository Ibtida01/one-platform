import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

const SECTOR_COLORS = {
  banking: { bg: 'from-blue-800 to-blue-900', badge: 'BANKING', badgeBg: 'bg-blue-700' },
  government: { bg: 'from-green-700 to-green-900', badge: 'GOVERNMENT', badgeBg: 'bg-green-700' },
  mixed: { bg: 'from-purple-700 to-purple-900', badge: 'MIXED', badgeBg: 'bg-purple-600' },
};

export default function TokenCard({ ticket, aiResult, onPrint, onNewTicket }) {
  const qrRef = useRef(null);
  const sector = ticket?.sector || 'mixed';
  const colors = SECTOR_COLORS[sector] || SECTOR_COLORS.mixed;
  const tokenNumber = ticket?.token_number;

  useEffect(() => {
    if (qrRef.current && tokenNumber) {
      QRCode.toCanvas(qrRef.current, `ONE-TOKEN:${tokenNumber}:${ticket?.id || ''}`, {
        width: 120,
        margin: 1,
        color: { dark: '#1e3a5f', light: '#ffffff' },
      });
    }
  }, [tokenNumber, ticket?.id]);

  if (!ticket) return null;

  const services = ticket.detected_services || aiResult?.detected_services || [];
  const docChecklist = ticket.doc_checklist || aiResult?.doc_checklist || [];
  const mandatoryMissing = docChecklist.filter((d) => d.mandatory && !d.likely_have);

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Main token card */}
      <div className={`bg-gradient-to-br ${colors.bg} rounded-2xl shadow-2xl text-white overflow-hidden`}>
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center border-b border-white/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <span className="text-blue-900 font-black text-sm leading-none">1</span>
            </div>
            <span className="font-bold tracking-widest text-sm uppercase text-white/80">ONE Platform</span>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${colors.badgeBg} text-white/90 tracking-widest`}>
            {colors.badge}
          </span>
        </div>

        {/* Token number */}
        <div className="px-8 py-8 text-center">
          <p className="text-white/60 text-sm font-medium mb-2 tracking-widest uppercase">Your Token Number</p>
          <div className="token-pulse text-9xl font-black tracking-tighter leading-none font-mono mb-4">
            {tokenNumber}
          </div>
          <p className="text-white/70 text-sm">
            {new Date().toLocaleDateString('en-BD', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
            {' · '}
            {new Date().toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Citizen info */}
        <div className="px-8 py-4 bg-black/20">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Citizen</p>
              <p className="font-semibold text-lg">{ticket.full_name || ticket.citizen?.full_name || 'Verify at desk'}</p>
              <p className="text-white/70 text-sm font-mono">{ticket.national_id || ticket.citizen?.national_id}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Services</p>
              <p className="font-bold text-2xl">{services.length || '—'}</p>
            </div>
          </div>
        </div>

        {/* Services detected */}
        {services.length > 0 && (
          <div className="px-8 py-4 bg-black/10">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Services Requested</p>
            <div className="flex flex-wrap gap-1.5">
              {services.map((s) => (
                <span key={s} className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Summary */}
        {(ticket.ai_summary || aiResult?.ai_summary) && (
          <div className="px-8 py-3 bg-black/10 text-center">
            <p className="text-white/80 text-sm italic">
              "{ticket.ai_summary || aiResult?.ai_summary}"
            </p>
          </div>
        )}

        {/* QR code + wait info */}
        <div className="px-8 py-6 flex items-center justify-between border-t border-white/20">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Est. Wait</p>
            <p className="font-bold text-xl">~{Math.max(5, services.length * 8)} min</p>
            <p className="text-white/60 text-xs mt-1">Please keep this token safe</p>
          </div>
          <div className="bg-white rounded-xl p-2">
            <canvas ref={qrRef} className="block" />
          </div>
        </div>

        {/* Alert if docs missing */}
        {mandatoryMissing.length > 0 && (
          <div className="mx-8 mb-6 bg-amber-500/30 border border-amber-400/50 rounded-xl p-4">
            <p className="text-amber-200 font-semibold text-sm mb-2">⚠ Please bring these documents:</p>
            <ul className="space-y-1">
              {mandatoryMissing.map((d) => (
                <li key={d.doc} className="text-amber-100 text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                  {d.doc}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6 no-print">
        <button
          onClick={() => window.print()}
          className="flex-1 btn-secondary flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Token
        </button>
        <button onClick={onNewTicket} className="flex-1 btn-primary flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Intake
        </button>
      </div>

      {/* Doc checklist summary */}
      {docChecklist.length > 0 && (
        <div className="mt-6 card p-5">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Document Checklist
          </h3>
          <div className="space-y-2">
            {docChecklist.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  {item.mandatory && <span className="text-red-500 text-xs font-bold">REQ</span>}
                  {item.doc}
                </span>
                <span className={`text-sm font-medium ${item.likely_have ? 'text-green-600' : 'text-amber-600'}`}>
                  {item.likely_have ? '✓ Likely have' : '? Bring with you'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
