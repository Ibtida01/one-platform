import React, { useState, useRef } from 'react';
import VoiceInput from '../components/VoiceInput.jsx';
import TokenCard from '../components/TokenCard.jsx';

const PLACEHOLDERS = [
  'আমি টাকা জমা দিতে চাই এবং একটি FD খুলতে চাই...',
  'I need to renew my passport...',
  'nid correction korte chai...',
  'আমার ট্রেড লাইসেন্স নবায়ন করতে হবে...',
  'I want to open a new bank account...',
];

export default function IntakeTerminal() {
  const [nationalId, setNationalId] = useState('');
  const [rawInput, setRawInput] = useState('');
  const [citizenInfo, setCitizenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('input');
  const [placeholderIdx] = useState(() => Math.floor(Math.random() * PLACEHOLDERS.length));
  const nidRef = useRef(null);

  const handleNidChange = async (val) => {
    setNationalId(val);
    setCitizenInfo(null);
    if (val.length >= 10) {
      setLookingUp(true);
      try {
        const res = await fetch(`/api/citizens/lookup/${val}`);
        if (res.ok) {
          const data = await res.json();
          setCitizenInfo(data);
        }
      } catch (_) {}
      setLookingUp(false);
    }
  };

  const handleVoiceTranscript = (text) => {
    setRawInput((prev) => (prev ? prev + ' ' + text : text));
  };

  const handleSubmit = async () => {
    if (!nationalId.trim() || !rawInput.trim()) {
      setError('Please enter your National ID and describe what you need.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput, nationalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Intake failed');
      setResult(data);
      setStep('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTicket = () => {
    setNationalId('');
    setRawInput('');
    setCitizenInfo(null);
    setResult(null);
    setError(null);
    setStep('input');
    setTimeout(() => nidRef.current?.focus(), 100);
  };

  if (step === 'result' && result) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-gray-50 py-8 px-4">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-6 no-print">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full font-semibold text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Token Generated Successfully
            </div>
          </div>
          <TokenCard
            ticket={{ ...result.ticket, ...result.ticket.citizen }}
            aiResult={result.ai}
            onNewTicket={handleNewTicket}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4">
            <span className="text-blue-900 font-black text-4xl leading-none">1</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">ONE Platform</h1>
          <p className="text-blue-200 mt-2 text-lg">One visit. One token. Everything resolved.</p>
          <p className="text-blue-300 text-sm mt-1">একটি ভিজিট। একটি টোকেন। সব সমাধান।</p>
        </div>

        {/* Intake card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Step indicator */}
          <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 flex items-center gap-4">
            <StepDot n={1} active label="Enter ID" />
            <div className="flex-1 h-px bg-blue-200" />
            <StepDot n={2} active={!!nationalId} label="Describe Need" />
            <div className="flex-1 h-px bg-blue-200" />
            <StepDot n={3} active={false} label="Get Token" />
          </div>

          <div className="p-6 space-y-6">
            {/* NID field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                National ID Number / জাতীয় পরিচয়পত্র নম্বর
              </label>
              <div className="relative">
                <input
                  ref={nidRef}
                  type="text"
                  inputMode="numeric"
                  value={nationalId}
                  onChange={(e) => handleNidChange(e.target.value.replace(/\D/g, '').slice(0, 17))}
                  placeholder="Enter your 10–17 digit NID number"
                  className="input-field text-xl font-mono pr-12"
                  autoFocus
                />
                {lookingUp && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2">
                    <span className="typing-dot w-2 h-2 bg-blue-400 rounded-full inline-block" />
                  </span>
                )}
                {citizenInfo && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>

              {/* Citizen found */}
              {citizenInfo && (
                <div className="mt-2 flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm font-semibold">{citizenInfo.full_name}</span>
                  {citizenInfo.phone && <span className="text-xs text-green-500">· {citizenInfo.phone}</span>}
                  {citizenInfo.visit_count > 0 && (
                    <span className="text-xs text-green-500 ml-auto">{citizenInfo.visit_count} previous visit{citizenInfo.visit_count > 1 ? 's' : ''}</span>
                  )}
                </div>
              )}

              {/* NID not found hint */}
              {nationalId.length >= 10 && !lookingUp && !citizenInfo && (
                <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
                  NID not found in system. A temporary record will be created — officer will verify at desk.
                </p>
              )}
            </div>

            {/* Need description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                What do you need today? / আজকে কী দরকার?
              </label>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={PLACEHOLDERS[placeholderIdx]}
                rows={4}
                className="input-field text-lg resize-none"
              />
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                disabled={loading}
                tokenNumber={result?.ticket?.token_number}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || !nationalId || !rawInput}
              className="w-full btn-primary text-xl py-5 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <span className="flex gap-1.5">
                    <span className="typing-dot w-2.5 h-2.5 bg-white rounded-full" />
                    <span className="typing-dot w-2.5 h-2.5 bg-white rounded-full" />
                    <span className="typing-dot w-2.5 h-2.5 bg-white rounded-full" />
                  </span>
                  AI is processing your request...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get My Token — টোকেন নিন
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-blue-300 text-xs mt-4">
          Powered by ONE Platform · FRICTION Hackathon · Noverse Inc.
        </p>
      </div>
    </div>
  );
}

function StepDot({ n, active, label }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
        active ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-400'
      }`}>
        {n}
      </div>
      <span className="text-xs text-blue-500 whitespace-nowrap hidden sm:block">{label}</span>
    </div>
  );
}
