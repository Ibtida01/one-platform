import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import IntakeTerminal from './pages/IntakeTerminal.jsx';
import OfficerDashboard from './pages/OfficerDashboard.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import DemoMode from './pages/DemoMode.jsx';
import AppointmentPage from './pages/AppointmentPage.jsx';
import StatusTracker from './pages/StatusTracker.jsx';
import FeedbackPage from './pages/FeedbackPage.jsx';

function NavBar() {
  return (
    <nav className="bg-blue-900 text-white shadow-lg no-print">
      <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-blue-900 font-black text-lg leading-none">1</span>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight">ONE</span>
            <span className="text-blue-300 text-xs ml-2 hidden sm:inline">Unified Citizen Service Platform</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { to: '/intake',      label: 'Intake' },
            { to: '/appointment', label: 'Book Appointment' },
            { to: '/status',      label: 'Track Status' },
            { to: '/officer',     label: 'Officer' },
            { to: '/admin',       label: 'Admin' },
            { to: '/demo',        label: '▶ Demo' },
          ].map(({ to, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-blue-900' : 'text-blue-200 hover:text-white hover:bg-blue-800'
                }`
              }
            >{label}</NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/"           element={<IntakeTerminal />} />
            <Route path="/intake"     element={<IntakeTerminal />} />
            <Route path="/officer"    element={<OfficerDashboard />} />
            <Route path="/admin"      element={<AdminPanel />} />
            <Route path="/demo"       element={<DemoMode />} />
            <Route path="/appointment" element={<AppointmentPage />} />
            <Route path="/status"     element={<StatusTracker />} />
            <Route path="/feedback/:ticketId" element={<FeedbackPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
