import React from 'react';

const SECTOR_DOT = {
  banking: 'bg-blue-500',
  government: 'bg-green-500',
  mixed: 'bg-purple-500',
};

export default function QueuePanel({ tickets, selectedId, onSelect, loading }) {
  const waiting = tickets.filter((t) => t.status === 'waiting');
  const serving = tickets.filter((t) => t.status === 'serving');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-blue-900 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm uppercase tracking-widest">Live Queue</h2>
          {loading && (
            <span className="flex gap-1 items-center">
              <span className="typing-dot w-1.5 h-1.5 bg-blue-300 rounded-full" />
              <span className="typing-dot w-1.5 h-1.5 bg-blue-300 rounded-full" />
              <span className="typing-dot w-1.5 h-1.5 bg-blue-300 rounded-full" />
            </span>
          )}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-blue-200">
          <span><span className="font-bold text-white">{serving.length}</span> serving</span>
          <span><span className="font-bold text-white">{waiting.length}</span> waiting</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Currently serving */}
        {serving.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Now Serving</span>
            </div>
            {serving.map((ticket) => (
              <QueueItem
                key={ticket.id}
                ticket={ticket}
                selected={selectedId === ticket.id}
                onClick={() => onSelect(ticket)}
              />
            ))}
          </div>
        )}

        {/* Waiting */}
        {waiting.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Waiting</span>
            </div>
            {waiting.map((ticket) => (
              <QueueItem
                key={ticket.id}
                ticket={ticket}
                selected={selectedId === ticket.id}
                onClick={() => onSelect(ticket)}
              />
            ))}
          </div>
        )}

        {tickets.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-medium">Queue is empty</p>
            <p className="text-xs mt-1">New tickets will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}

function QueueItem({ ticket, selected, onClick }) {
  const dotColor = SECTOR_DOT[ticket.sector] || 'bg-gray-400';
  const timeAgo = getTimeAgo(ticket.created_at);
  const services = Array.isArray(ticket.detected_services)
    ? ticket.detected_services
    : (typeof ticket.detected_services === 'string' ? JSON.parse(ticket.detected_services) : []);

  return (
    <button
      onClick={onClick}
      className={`queue-item-enter w-full text-left px-4 py-3 border-b border-gray-100 transition-all hover:bg-blue-50 ${
        selected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${
          ticket.status === 'serving' ? 'bg-blue-600' : 'bg-gray-700'
        } flex items-center justify-center`}>
          <span className="text-white font-black font-mono text-xs leading-none text-center">
            {ticket.token_number}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-sm text-gray-800 truncate">
              {ticket.full_name || 'Unknown'}
            </span>
            <span className={`flex-shrink-0 w-2 h-2 rounded-full ${dotColor}`} />
          </div>
          <p className="text-xs text-gray-500 truncate">
            {ticket.ai_summary || services.slice(0, 2).map(s => s.replace(/_/g, ' ')).join(', ') || 'No summary'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">{timeAgo}</span>
            {ticket.needs_manual_review && (
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Review</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
