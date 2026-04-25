import React, { useState } from 'react';
import TokenCard from '../components/TokenCard.jsx';

const SCENARIOS = [
  {
    id: 'banking-bd',
    title: 'Banking: Deposit + FD',
    subtitle: 'Bengali Input',
    flag: '🇧🇩',
    color: 'from-blue-700 to-blue-900',
    badge: 'BANKING',
    badgeCls: 'bg-blue-600',
    nid: '1234567890',
    citizen: 'Fatema Begum',
    input: 'আমি টাকা জমা দিতে চাই আর একটা FD খুলতে চাই তিন বছরের জন্য',
    expected: 'cash_deposit + fd_open · 3-year tenure · Bengali intake',
    icon: '🏦',
  },
  {
    id: 'govt-en',
    title: 'Govt: Passport Renewal',
    subtitle: 'English Input',
    flag: '🇬🇧',
    color: 'from-green-700 to-green-900',
    badge: 'GOVERNMENT',
    badgeCls: 'bg-green-700',
    nid: '0987654321',
    citizen: 'Mohammad Karim',
    input: 'I need to renew my passport, it expired last month',
    expected: 'passport_renewal · urgency noted · expired passport',
    icon: '🛂',
  },
  {
    id: 'mixed-en',
    title: 'Mixed: Account + Trade License',
    subtitle: 'English Input',
    flag: '🇬🇧',
    color: 'from-purple-700 to-purple-900',
    badge: 'MIXED',
    badgeCls: 'bg-purple-600',
    nid: '1122334455',
    citizen: 'Rina Akter',
    input: 'I want to open a new bank account and also get my trade license renewed',
    expected: 'account_open + trade_license_renewal · sector = mixed · M- token',
    icon: '🔀',
  },
];

export default function DemoMode() {
  const [running, setRunning] = useState(null);
  const [results, setResults] = useState({});
  const [errors, setErrors] = useState({});

  const runScenario = async (scenario) => {
    setRunning(scenario.id);
    setErrors((prev) => ({ ...prev, [scenario.id]: null }));
    setResults((prev) => ({ ...prev, [scenario.id]: null }));
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: scenario.input, nationalId: scenario.nid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Intake failed');
      setResults((prev) => ({ ...prev, [scenario.id]: data }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [scenario.id]: err.message }));
    }
    setRunning(null);
  };

  const resetScenario = (id) => {
    setResults((prev) => ({ ...prev, [id]: null }));
    setErrors((prev) => ({ ...prev, [id]: null }));
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">▶</span>
            <h1 className="text-3xl font-black tracking-tight">Live Demo Mode</h1>
          </div>
          <p className="text-blue-200 text-lg max-w-2xl">
            Three real scenarios processed live through the AI. Watch the system detect services, 
            pre-fill forms, and generate officer briefings in real time.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-blue-300">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Real Claude API calls
            </span>
            <span className="flex items-center gap-1 ml-4">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Live database writes
            </span>
            <span className="flex items-center gap-1 ml-4">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Bengali + English NLP
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {SCENARIOS.map((scenario) => {
          const result = results[scenario.id];
          const error = errors[scenario.id];
          const isRunning = running === scenario.id;

          return (
            <div key={scenario.id} className="card overflow-hidden">
              {/* Scenario header */}
              <div className={`bg-gradient-to-r ${scenario.color} text-white px-6 py-5`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl">{scenario.icon}</span>
                      <h2 className="text-xl font-bold">{scenario.title}</h2>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scenario.badgeCls} text-white/90 tracking-widest`}>
                        {scenario.badge}
                      </span>
                    </div>
                    <p className="text-white/70 text-sm">{scenario.flag} {scenario.subtitle}</p>
                  </div>

                  <div className="flex gap-2">
                    {result && (
                      <button
                        onClick={() => resetScenario(scenario.id)}
                        className="text-white/70 hover:text-white text-sm px-3 py-1.5 border border-white/30 rounded-lg transition-colors"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={() => runScenario(scenario)}
                      disabled={isRunning}
                      className="bg-white text-blue-900 font-bold px-5 py-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-60 flex items-center gap-2"
                    >
                      {isRunning ? (
                        <>
                          <span className="flex gap-1">
                            <span className="typing-dot w-2 h-2 bg-blue-600 rounded-full" />
                            <span className="typing-dot w-2 h-2 bg-blue-600 rounded-full" />
                            <span className="typing-dot w-2 h-2 bg-blue-600 rounded-full" />
                          </span>
                          Processing...
                        </>
                      ) : result ? (
                        '▶ Run Again'
                      ) : (
                        '▶ Run Scenario'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Input display */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Citizen</p>
                    <p className="font-semibold text-gray-800">{scenario.citizen}</p>
                    <p className="text-gray-500 font-mono text-xs">{scenario.nid}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Input to AI</p>
                    <p className="text-gray-800 font-medium leading-relaxed">"{scenario.input}"</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Expected Output</p>
                  <p className="text-xs text-gray-600 font-mono bg-gray-100 px-3 py-1.5 rounded-lg inline-block">{scenario.expected}</p>
                </div>
              </div>

              {/* Result */}
              <div className="p-6">
                {!result && !error && !isRunning && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-4xl mb-3">▶</p>
                    <p className="font-medium">Click "Run Scenario" to process this live through the AI</p>
                    <p className="text-sm mt-1">Real API call · Real database write · Real token generated</p>
                  </div>
                )}

                {isRunning && (
                  <div className="text-center py-12">
                    <div className="flex justify-center gap-3 mb-4">
                      <span className="typing-dot w-4 h-4 bg-blue-600 rounded-full" />
                      <span className="typing-dot w-4 h-4 bg-blue-600 rounded-full" />
                      <span className="typing-dot w-4 h-4 bg-blue-600 rounded-full" />
                    </div>
                    <p className="font-semibold text-gray-700">Claude is analyzing the request...</p>
                    <p className="text-sm text-gray-500 mt-1">Detecting services · Pre-filling forms · Writing officer briefing</p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-700 font-semibold text-sm">Error: {error}</p>
                    <p className="text-red-500 text-xs mt-1">Make sure the server is running and ANTHROPIC_API_KEY is configured.</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-6">
                    {/* Token + AI output side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Token card (compact) */}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Generated Token</p>
                        <TokenCard
                          ticket={{ ...result.ticket, ...result.ticket.citizen }}
                          aiResult={result.ai}
                          onNewTicket={() => resetScenario(scenario.id)}
                        />
                      </div>

                      {/* AI output breakdown */}
                      <div className="space-y-4">
                        <AIOutputBlock label="Sector Detected" value={
                          <span className={`sector-pill-${result.ai?.sector}`}>{result.ai?.sector}</span>
                        } />
                        <AIOutputBlock label="Services Detected" value={
                          <div className="flex flex-wrap gap-1.5">
                            {(result.ai?.detected_services || []).map((s) => (
                              <span key={s} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                                {s.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        } />
                        <AIOutputBlock label={`AI Confidence: ${result.ai?.confidence || 0}%`} value={
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-1000"
                              style={{ width: `${result.ai?.confidence || 0}%` }}
                            />
                          </div>
                        } />
                        <AIOutputBlock label="Officer Briefing" value={
                          <p className="text-sm text-gray-700 leading-relaxed italic">
                            "{result.ai?.officer_briefing}"
                          </p>
                        } />
                        {result.ai?.clarification_needed && (
                          <AIOutputBlock label="Clarification Needed" value={
                            <p className="text-sm text-amber-700">{result.ai.clarification_needed}</p>
                          } />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer note */}
        <div className="text-center py-4 text-gray-400 text-sm">
          <p>All scenarios make real API calls to Claude and write to the database.</p>
          <p className="mt-1">Check the Officer Dashboard to see these tickets in the live queue.</p>
        </div>
      </div>
    </div>
  );
}

function AIOutputBlock({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div>{value}</div>
    </div>
  );
}
