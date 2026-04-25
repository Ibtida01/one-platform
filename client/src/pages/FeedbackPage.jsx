import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

const RATINGS = [
  { value: 1, emoji: '😞', label: 'Very Poor' },
  { value: 2, emoji: '😐', label: 'Poor' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🤩', label: 'Excellent' },
];

export default function FeedbackPage() {
  const { ticketId } = useParams();
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!rating) { setError('Please select a rating'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-green-800 to-green-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-sm w-full text-center">
          <div className="text-6xl mb-4">🙏</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-500 mb-1">Your feedback helps us serve better.</p>
          <p className="text-gray-400 text-sm">আপনার মতামত আমাদের উন্নত সেবার সুযোগ দেয়</p>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-4xl">{RATINGS.find(r => r.value === rating)?.emoji}</p>
            <p className="text-sm text-gray-500 mt-1">You rated: {RATINGS.find(r => r.value === rating)?.label}</p>
          </div>
          <a href="/intake" className="btn-primary block mt-6 text-center">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gradient-to-b from-blue-900 to-blue-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⭐</div>
          <h2 className="text-2xl font-bold text-gray-900">How was your experience?</h2>
          <p className="text-gray-500 mt-1 text-sm">আজকের সেবা কেমন ছিল?</p>
        </div>

        {/* Star rating */}
        <div className="flex justify-center gap-3 mb-6">
          {RATINGS.map(r => (
            <button key={r.value} onClick={() => setRating(r.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                rating === r.value
                  ? 'border-blue-500 bg-blue-50 scale-110'
                  : 'border-gray-200 hover:border-blue-300'
              }`}>
              <span className="text-3xl">{r.emoji}</span>
              <span className="text-xs text-gray-500 font-medium">{r.label}</span>
            </button>
          ))}
        </div>

        {/* Comment */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Any comments? (optional)
          </label>
          <textarea value={comment} onChange={e => setComment(e.target.value)}
            placeholder="Tell us how we can improve... / আপনার পরামর্শ লিখুন..."
            rows={3} className="input-field resize-none text-sm"
          />
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}

        <button onClick={handleSubmit} disabled={loading || !rating} className="btn-primary w-full">
          {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          Your feedback is anonymous and helps improve service quality.
        </p>
      </div>
    </div>
  );
}
