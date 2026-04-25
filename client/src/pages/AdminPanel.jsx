import React, { useState, useEffect } from 'react';

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [authErr, setAuthErr] = useState('');
  const [stats, setStats] = useState(null);
  const [services, setServices] = useState({});
  const [loadingStats, setLoadingStats] = useState(false);
  const [toggling, setToggling] = useState(null);

  const handleLogin = () => {
    if (user === 'admin' && pass === 'demo2024') {
      setAuthed(true);
      setAuthErr('');
    } else {
      setAuthErr('Invalid credentials. Hint: admin / demo2024');
    }
  };

  useEffect(() => {
    if (!authed) return;
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [authed]);

  const fetchAll = async () => {
    setLoadingStats(true);
    try {
      const [statsRes, servicesRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/services'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
    } catch (_) {}
    setLoadingStats(false);
  };

  const toggleService = async (slug, currentActive) => {
    setToggling(slug);
    try {
      const res = await fetch(`/api/services/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });
      if (res.ok) {
        setServices((prev) => {
          const updated = { ...prev };
          for (const sector of Object.keys(updated)) {
            updated[sector] = updated[sector].map((s) =>
              s.slug === slug ? { ...s, is_active: !currentActive } : s
            );
          }
          return updated;
        });
      }
    } catch (_) {}
    setToggling(null);
  };

  if (!authed) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-gray-50 flex items-center justify-center px-4">
        <div className="card w-full max-w-sm p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-800 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Admin Access</h2>
            <p className="text-sm text-gray-500 mt-1">ONE Platform Administration</p>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Username"
              className="input-field"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Password"
              className="input-field"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {authErr && (
              <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{authErr}</p>
            )}
            <button onClick={handleLogin} className="w-full btn-primary">
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const today = stats?.today || {};

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {loadingStats && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <span className="typing-dot w-1.5 h-1.5 bg-gray-400 rounded-full" />
                Refreshing...
              </span>
            )}
            <button onClick={() => setAuthed(false)} className="text-sm text-gray-500 hover:text-red-600 transition-colors">
              Sign Out
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Today"
            value={today.total || 0}
            icon="📋"
            color="blue"
          />
          <StatCard
            label="Completed"
            value={today.completed || 0}
            icon="✅"
            color="green"
          />
          <StatCard
            label="In Queue"
            value={(Number(today.waiting) || 0) + (Number(today.serving) || 0)}
            icon="⏳"
            color="amber"
          />
          <StatCard
            label="Avg. Time"
            value={stats?.avg_service_time_minutes ? `${stats.avg_service_time_minutes}m` : '—'}
            icon="⏱"
            color="purple"
          />
        </div>

        {/* Sector breakdown */}
        {stats?.by_sector?.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Tickets by Sector</h2>
            <div className="flex gap-6 flex-wrap">
              {stats.by_sector.map((s) => (
                <div key={s.sector} className="flex items-center gap-3">
                  <span className={`sector-pill-${s.sector}`}>{s.sector}</span>
                  <span className="text-2xl font-bold text-gray-800">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent tickets */}
        {stats?.recent_tickets?.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Recent Tickets</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Token', 'Citizen', 'Sector', 'Summary', 'Status', 'Time'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recent_tickets.map((t) => (
                    <tr key={t.token_number} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-800">{t.token_number}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{t.full_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`sector-pill-${t.sector}`}>{t.sector}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{t.ai_summary || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`status-${t.status}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {new Date(t.created_at).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Service management */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Service Management</h2>
            <p className="text-xs text-gray-400 mt-1">Toggle services on/off for this service center</p>
          </div>
          {Object.keys(services).length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading services...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {Object.entries(services).map(([sector, sectorServices]) => (
                <div key={sector}>
                  <div className="px-5 py-3 bg-gray-50">
                    <span className={`sector-pill-${sector}`}>{sector}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100">
                    {sectorServices.map((service) => (
                      <div key={service.slug} className="bg-white px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{service.name}</p>
                          <p className="text-xs text-gray-400 font-mono">{service.slug}</p>
                        </div>
                        <button
                          onClick={() => toggleService(service.slug, service.is_active)}
                          disabled={toggling === service.slug}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            service.is_active ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                              service.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-800',
    green: 'bg-green-50 text-green-800',
    amber: 'bg-amber-50 text-amber-800',
    purple: 'bg-purple-50 text-purple-800',
  };
  return (
    <div className={`card p-5 ${colors[color]}`}>
      <p className="text-2xl mb-1">{icon}</p>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide mt-1 opacity-70">{label}</p>
    </div>
  );
}
