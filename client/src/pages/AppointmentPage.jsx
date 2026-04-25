import React, { useState, useEffect } from 'react';

const SERVICES_DISPLAY = {
  banking: ['cash_deposit','cash_withdrawal','fd_open','account_open','loan_inquiry','dps_open','card_issue_debit','statement_request'],
  government: ['nid_correction','nid_reissue','passport_new','passport_renewal','trade_license_new','trade_license_renewal','birth_certificate_new','police_clearance','driving_license_new','tax_clearance'],
};

const SERVICE_NAMES = {
  cash_deposit: 'Cash Deposit', cash_withdrawal: 'Cash Withdrawal', fd_open: 'Fixed Deposit Opening',
  account_open: 'Account Opening', loan_inquiry: 'Loan Inquiry', dps_open: 'DPS Opening',
  card_issue_debit: 'Debit Card', statement_request: 'Bank Statement',
  nid_correction: 'NID Correction', nid_reissue: 'NID Reissue',
  passport_new: 'Passport (New)', passport_renewal: 'Passport Renewal',
  trade_license_new: 'Trade License (New)', trade_license_renewal: 'Trade License Renewal',
  birth_certificate_new: 'Birth Certificate', police_clearance: 'Police Clearance',
  driving_license_new: 'Driving License', tax_clearance: 'Tax Clearance',
};

export default function AppointmentPage() {
  const [step, setStep] = useState(1);
  const [nationalId, setNationalId] = useState('');
  const [citizen, setCitizen] = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(null);
  const [error, setError] = useState('');
  const [sectorTab, setSectorTab] = useState('banking');

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  const lookupCitizen = async () => {
    if (nationalId.length < 10) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/citizens/lookup/${nationalId}`);
      if (res.ok) setCitizen(await res.json());
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    if (!selectedDate) return;
    fetch(`/api/appointments/slots?date=${selectedDate}`)
      .then(r => r.json())
      .then(setSlots)
      .catch(() => {});
  }, [selectedDate]);

  const handleBook = async () => {
    if (!nationalId || !selectedService || !selectedDate || !selectedSlot) {
      setError('Please fill all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const scheduledAt = `${selectedDate}T${selectedSlot.replace(':', ':')}:00+06:00`;
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ national_id: nationalId, service_slug: selectedService, scheduled_at: scheduledAt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBooked(data);
      setStep(4);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (step === 4 && booked) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-green-900 to-green-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h2>
          <p className="text-gray-500 mb-6">আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে</p>
          <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-6">
            <Detail label="Service" value={SERVICE_NAMES[selectedService] || selectedService} />
            <Detail label="Date" value={new Date(selectedDate).toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
            <Detail label="Time" value={selectedSlot} />
            <Detail label="NID" value={nationalId} />
            {citizen && <Detail label="Name" value={citizen.full_name} />}
          </div>
          <p className="text-sm text-gray-500 mb-4">Please arrive 10 minutes early with all required documents.</p>
          <button onClick={() => { setStep(1); setBooked(null); setSelectedService(''); setSelectedDate(''); setSelectedSlot(''); }}
            className="btn-primary w-full">Book Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-blue-900 to-blue-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Book an Appointment</h1>
          <p className="text-blue-200 mt-2">Skip the walk-in queue — book your time slot in advance</p>
          <p className="text-blue-300 text-sm">আগেই সময় বুক করুন, লাইনে দাঁড়ানো লাগবে না</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Your ID', 'Service', 'Date & Time', 'Confirm'].map((label, i) => (
            <React.Fragment key={i}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step > i + 1 ? 'bg-green-500 text-white' : step === i + 1 ? 'bg-white text-blue-900' : 'bg-blue-700 text-blue-300'
                }`}>{step > i + 1 ? '✓' : i + 1}</div>
                <span className="text-xs text-blue-300 mt-1 hidden sm:block">{label}</span>
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-green-500' : 'bg-blue-700'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 space-y-5">
          {/* Step 1 — NID */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Enter your National ID</h3>
              <input type="text" inputMode="numeric" value={nationalId}
                onChange={e => { setNationalId(e.target.value.replace(/\D/g,'').slice(0,17)); setCitizen(null); }}
                onBlur={lookupCitizen}
                placeholder="10-17 digit NID number"
                className="input-field text-xl font-mono mb-3"
                autoFocus
              />
              {loading && <p className="text-sm text-gray-400">Looking up...</p>}
              {citizen && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    {citizen.full_name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">{citizen.full_name}</p>
                    <p className="text-xs text-green-600">{citizen.phone} · {citizen.visit_count || 0} previous visits</p>
                  </div>
                </div>
              )}
              {/* Quick fill */}
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2">Demo citizens:</p>
                <div className="flex flex-wrap gap-2">
                  {[['1234567890','Fatema'],['0987654321','Karim'],['1122334455','Rina']].map(([nid,name]) => (
                    <button key={nid} onClick={() => { setNationalId(nid); lookupCitizen(); }}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 rounded-lg transition-colors font-medium">
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => nationalId.length >= 10 && setStep(2)}
                disabled={nationalId.length < 10}
                className="btn-primary w-full mt-5">
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 — Service selection */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">What do you need help with?</h3>
              <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
                {['banking','government'].map(s => (
                  <button key={s} onClick={() => setSectorTab(s)}
                    className={`flex-1 py-2 rounded-md text-sm font-semibold capitalize transition-all ${
                      sectorTab === s ? 'bg-white shadow text-blue-800' : 'text-gray-500 hover:text-gray-700'
                    }`}>{s}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SERVICES_DISPLAY[sectorTab].map(slug => (
                  <button key={slug}
                    onClick={() => setSelectedService(slug)}
                    className={`p-3 rounded-xl border-2 text-left text-sm font-medium transition-all ${
                      selectedService === slug
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700'
                    }`}>
                    {selectedService === slug && <span className="text-blue-500 mr-1">✓</span>}
                    {SERVICE_NAMES[slug] || slug}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1">← Back</button>
                <button onClick={() => selectedService && setStep(3)} disabled={!selectedService}
                  className="btn-primary flex-1">Continue →</button>
              </div>
            </div>
          )}

          {/* Step 3 — Date + Time */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Pick a date and time</h3>
              <div className="mb-5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Date</label>
                <input type="date" value={selectedDate} min={today} max={maxDate}
                  onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(''); }}
                  className="input-field"
                />
              </div>
              {selectedDate && (
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Available Slots</label>
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button key={slot.time} onClick={() => slot.available && setSelectedSlot(slot.time)}
                        disabled={!slot.available}
                        className={`py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                          !slot.available ? 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50' :
                          selectedSlot === slot.time ? 'border-blue-600 bg-blue-50 text-blue-800' :
                          'border-gray-200 hover:border-blue-300 text-gray-700'
                        }`}>
                        {slot.time}
                      </button>
                    ))}
                    {slots.length === 0 && <p className="col-span-4 text-sm text-gray-400">Select a date to see slots</p>}
                  </div>
                </div>
              )}
              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}
              <div className="flex gap-3 mt-5">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1">← Back</button>
                <button onClick={handleBook} disabled={!selectedDate || !selectedSlot || loading}
                  className="btn-primary flex-1">
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}
