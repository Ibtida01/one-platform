import React, { useState, useEffect, useCallback } from 'react';
import QueuePanel from '../components/QueuePanel.jsx';
import DocChecklist from '../components/DocChecklist.jsx';
import FormDataTable from '../components/FormDataTable.jsx';

const SECTOR_LABEL = {
  banking: { label: 'Banking', cls: 'sector-pill-banking' },
  government: { label: 'Government', cls: 'sector-pill-government' },
  mixed: { label: 'Mixed', cls: 'sector-pill-mixed' },
};

const SERVICE_LABELS = {
  cash_deposit: 'Cash Deposit', cash_withdrawal: 'Cash Withdrawal', fd_open: 'FD Opening',
  fd_close: 'FD Closure', fd_renew: 'FD Renewal', account_open: 'Account Opening',
  account_close: 'Account Closure', cheque_book_request: 'Cheque Book', statement_request: 'Statement',
  loan_inquiry: 'Loan Inquiry', utility_bill_payment: 'Utility Payment', dps_open: 'DPS Opening',
  dps_close: 'DPS Closure', pay_order: 'Pay Order', card_issue: 'Card Issue',
  card_block: 'Card Block', card_replacement: 'Card Replace', nid_correction: 'NID Correction',
  nid_reissue: 'NID Reissue', birth_certificate_new: 'Birth Cert (New)',
  birth_certificate_correction: 'Birth Cert Fix', passport_new: 'Passport (New)',
  passport_renewal: 'Passport Renewal', passport_correction: 'Passport Fix',
  trade_license_new: 'Trade License (New)', trade_license_renewal: 'Trade License Renewal',
  land_mutation: 'Land Mutation', tax_clearance: 'Tax Clearance', police_clearance: 'Police Clearance',
  utility_connection_gas: 'Gas Connection', utility_connection_water: 'Water Connection',
  utility_connection_electricity: 'Electricity Connection', marriage_certificate: 'Marriage Cert',
  death_certificate: 'Death Cert',
};

export default function OfficerDashboard() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('briefing'); // briefing | forms | docs

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/queue');
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        // If selected ticket was updated, refresh it
        if (selectedTicket) {
          const updated = data.find((t) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (_) {}
    setLoading(false);
  }, [selectedTicket?.id]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setNotes('');
    setActiveTab('briefing');
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchQueue();
        if (status === 'done') setSelectedTicket(null);
      }
    } catch (_) {}
    setUpdatingStatus(false);
  };

  const handleSaveNotes = async () => {
    if (!selectedTicket || !notes.trim()) return;
    setSavingNotes(true);
    try {
      await fetch(`/api/tickets/${selectedTicket.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      setNotes('');
    } catch (_) {}
    setSavingNotes(false);
  };

  const parseJSON = (val, fallback = []) => {
    if (!val) return fallback;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return fallback; }
    }
    return val;
  };

  const services = selectedTicket ? parseJSON(selectedTicket.detected_services, []) : [];
  const docChecklist = selectedTicket ? parseJSON(selectedTicket.doc_checklist, []) : [];
  const generatedForms = selectedTicket ? parseJSON(selectedTicket.generated_forms, {}) : {};

  return (
    <div className="h-[calc(100vh-56px)] flex overflow-hidden bg-gray-100">
      {/* Left: Queue Panel */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <QueuePanel
          tickets={tickets}
          selectedId={selectedTicket?.id}
          onSelect={handleSelectTicket}
          loading={loading}
        />
      </div>

      {/* Right: Ticket Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selectedTicket ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-semibold">Select a ticket from the queue</p>
              <p className="text-sm mt-1">Click any ticket on the left to view details</p>
            </div>
          </div>
        ) : (
          <div className="p-6 max-w-4xl mx-auto space-y-5">
            {/* Ticket header */}
            <div className="card p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    selectedTicket.status === 'serving' ? 'bg-blue-600' : 'bg-gray-700'
                  }`}>
                    <span className="text-white font-black font-mono text-xl leading-none text-center">
                      {selectedTicket.token_number}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedTicket.full_name || 'Unknown Citizen'}
                    </h2>
                    <p className="text-sm text-gray-500 font-mono">{selectedTicket.national_id}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={SECTOR_LABEL[selectedTicket.sector]?.cls || 'sector-pill-mixed'}>
                        {SECTOR_LABEL[selectedTicket.sector]?.label || selectedTicket.sector}
                      </span>
                      <span className={`status-${selectedTicket.status}`}>
                        {selectedTicket.status}
                      </span>
                      {selectedTicket.needs_manual_review && (
                        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                          ⚠ Manual Review
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {selectedTicket.status === 'waiting' && (
                    <button
                      onClick={() => handleStatusUpdate('serving')}
                      disabled={updatingStatus}
                      className="btn-warning text-sm px-4 py-2 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Mark Serving
                    </button>
                  )}
                  {selectedTicket.status === 'serving' && (
                    <button
                      onClick={() => handleStatusUpdate('done')}
                      disabled={updatingStatus}
                      className="btn-success text-sm px-4 py-2 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark Done
                    </button>
                  )}
                </div>
              </div>

              {/* Citizen details row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                <Detail label="Phone" value={selectedTicket.phone || '—'} />
                <Detail label="Address" value={selectedTicket.address || '—'} />
                <Detail label="Date of Birth" value={selectedTicket.dob ? new Date(selectedTicket.dob).toLocaleDateString('en-BD') : '—'} />
                <Detail label="Arrived" value={new Date(selectedTicket.created_at).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })} />
              </div>
            </div>

            {/* Services pills */}
            {services.length > 0 && (
              <div className="card p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detected Services</h3>
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <span key={s} className="bg-blue-800 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">
                      {SERVICE_LABELS[s] || s.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Raw input */}
            {selectedTicket.raw_input && (
              <div className="card p-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Citizen Said</h3>
                <p className="text-gray-700 italic">"{selectedTicket.raw_input}"</p>
              </div>
            )}

            {/* Tabs: Briefing / Forms / Docs */}
            <div className="card overflow-hidden">
              <div className="flex border-b border-gray-200">
                {[
                  { id: 'briefing', label: 'Officer Briefing' },
                  { id: 'forms', label: `Pre-filled Forms (${Object.keys(generatedForms).length})` },
                  { id: 'docs', label: `Documents (${docChecklist.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-800 text-white'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === 'briefing' && (
                  <div>
                    {selectedTicket.officer_briefing ? (
                      <div className="bg-blue-50 border-l-4 border-blue-600 px-5 py-4 rounded-r-xl">
                        <p className="text-sm font-semibold text-blue-800 mb-2 uppercase tracking-wide">AI Briefing for Officer</p>
                        <p className="text-gray-800 leading-relaxed">{selectedTicket.officer_briefing}</p>
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-sm">No briefing generated — manual review needed.</p>
                    )}
                    {selectedTicket.ai_summary && (
                      <div className="mt-4 flex items-center gap-2 text-gray-500">
                        <span className="text-xs font-bold uppercase tracking-wider">Queue Summary:</span>
                        <span className="text-sm">{selectedTicket.ai_summary}</span>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'forms' && <FormDataTable generatedForms={generatedForms} />}
                {activeTab === 'docs' && <DocChecklist checklist={docChecklist} />}
              </div>
            </div>

            {/* Officer notes */}
            <div className="card p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Officer Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this ticket..."
                rows={3}
                className="input-field text-sm resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes || !notes.trim()}
                  className="btn-primary text-sm px-4 py-2"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
    </div>
  );
}
