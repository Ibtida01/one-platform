import React, { useState, useEffect } from 'react';

const STATUS_CONFIG = {
  waiting:  { color: 'bg-amber-100 border-amber-300', dot: 'bg-amber-500', label: 'Waiting in queue', labelBn: 'অপেক্ষায় আছেন', icon: '⏳' },
  serving:  { color: 'bg-blue-100 border-blue-300',   dot: 'bg-blue-500 animate-pulse', label: 'Now being served!', labelBn: 'এখন সেবা পাচ্ছেন!', icon: '🔔' },
  done:     { color: 'bg-green-100 border-green-300', dot: 'bg-green-500', label: 'Service completed', labelBn: 'সেবা সম্পন্ন হয়েছে', icon: '✅' },
};

export default function StatusTracker() {
  const [tokenNumber, setTokenNumber] = useState('');
  const [ticketData, setTicketData] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const lookupToken = async (token) => {
    if (!token || token.length < 4) return;
    setLoading(true);
    setError('');
    try {
      // Get full queue to find position
      const [queueRes] = await Promise.all([
        fetch('/api/queue'),
      ]);
      const queue = await queueRes.json();
      const ticket = queue.find(t => t.token_number.toUpperCase() === token.toUpperCase());

      if (!ticket) {
        // Try completed tickets — check all tickets for the day
        setError('Token not found. Please check the number and try again.');
        setTicketData(null);
        setLoading(false);
        return;
      }

      const waitingAhead = queue.filter(t =>
        t.status === 'waiting' && new Date(t.created_at) < new Date(ticket.created_at)
      ).length;

      setTicketData(ticket);
      setQueuePosition(ticket.status === 'waiting' ? waitingAhead + 1 : null);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Could not connect. Please try again.');
    }
    setLoading(false);
  };

  // Auto-refresh every 5 seconds when tracking
  useEffect(() => {
    if (!ticketData) return;
    const interval = setInterval(() => lookupToken(tokenNumber), 5000);
    return () => clearInterval(interval);
  }, [ticketData, tokenNumber]);

  const status = ticketData ? STATUS_CONFIG[ticketData.status] || STATUS_CONFIG.waiting : null;
  const services = ticketData ? (typeof ticketData.detected_services === 'string'
    ? JSON.parse(ticketData.detected_services) : ticketData.detected_services) || [] : [];

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Track Your Token</h1>
          <p className="text-blue-200 mt-2">Real-time status of your service request</p>
          <p className="text-blue-300 text-sm">আপনার টোকেনের অবস্থান জানুন</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={tokenNumber}
              onChange={e => setTokenNumber(e.target.value.toUpperCase())}
              placeholder="Enter token e.g. B-001 or G-012"
              className="input-field font-mono text-xl flex-1"
              onKeyDown={e => e.key === 'Enter' && lookupToken(tokenNumber)}
            />
            <button onClick={() => lookupToken(tokenNumber)} disabled={loading}
              className="btn-primary px-6">
              {loading ? '...' : 'Track'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {ticketData && status && (
            <div className="space-y-4">
              {/* Big status display */}
              <div className={`rounded-2xl border-2 p-6 text-center ${status.color}`}>
                <div className="text-5xl mb-3">{status.icon}</div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${status.dot}`} />
                  <span className="font-bold text-lg text-gray-800">{status.label}</span>
                </div>
                <p className="text-gray-500 text-sm">{status.labelBn}</p>

                {ticketData.status === 'waiting' && queuePosition !== null && (
                  <div className="mt-4 bg-white rounded-xl p-4">
                    <p className="text-4xl font-black text-blue-800">{queuePosition}</p>
                    <p className="text-sm text-gray-500">
                      {queuePosition === 1 ? 'You are next!' : `people ahead of you`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Est. wait: ~{Math.max(5, queuePosition * 8)} minutes
                    </p>
                  </div>
                )}

                {ticketData.status === 'serving' && (
                  <div className="mt-4 bg-white rounded-xl p-4">
                    <p className="text-lg font-bold text-blue-800">Please proceed to the counter now!</p>
                    <p className="text-sm text-gray-500">অনুগ্রহ করে কাউন্টারে আসুন</p>
                  </div>
                )}

                {ticketData.status === 'done' && (
                  <div className="mt-4">
                    <p className="text-sm text-green-700 font-medium">
                      Completed at {ticketData.completed_at
                        ? new Date(ticketData.completed_at).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                    <a href={`/feedback/${ticketData.id}`}
                      className="mt-3 inline-block bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors">
                      ⭐ Rate your experience
                    </a>
                  </div>
                )}
              </div>

              {/* Token info */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center">
                      <span className="text-white font-black font-mono text-sm">{ticketData.token_number}</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{ticketData.full_name || 'Citizen'}</p>
                      <p className="text-xs text-gray-400">
                        Issued at {new Date(ticketData.created_at).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`sector-pill-${ticketData.sector}`}>{ticketData.sector}</span>
                </div>
                {services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {services.map(s => (
                      <span key={s} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {lastUpdated && (
                <p className="text-xs text-center text-gray-400">
                  Last updated: {lastUpdated.toLocaleTimeString()} · Auto-refreshes every 5 seconds
                </p>
              )}
            </div>
          )}

          {!ticketData && !error && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-3">🎫</p>
              <p className="font-medium">Enter your token number above</p>
              <p className="text-sm mt-1">e.g. B-001, G-023, M-005</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
