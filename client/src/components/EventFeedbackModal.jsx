// agent-notes: { ctx: "Post-event rating and feedback modal with interactive star ratings, quick topic tags, and review submission", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-09-07" }

import React, { useState } from 'react';
import { Star, X, CheckCircle2, MessageSquare, ThumbsUp, Sparkles, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';

const QUICK_TAGS = [
  'Engaging Speaker 🎤',
  'Clear Presentation 📊',
  'Valuable Q&A 💡',
  'Great Content 📚',
  'Smooth Check-in ⚡',
  'Good Time Management ⏰',
  'Practical Insights 🛠️',
  'Inspiring Session 🌟',
];

export default function EventFeedbackModal({ isOpen, onClose, event, onSubmitted }) {
  const { currentUser, submitEventFeedback } = useApp();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !event) return null;

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const feedbackPayload = {
        event_id: event.id,
        event_title: event.title,
        student_id: currentUser?.id || 'anonymous',
        student_name: currentUser?.name || currentUser?.full_name || 'Student Attendee',
        student_email: currentUser?.email || '',
        rating,
        tags: selectedTags,
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      };

      if (submitEventFeedback) {
        await submitEventFeedback(feedbackPayload);
      }

      setSubmitted(true);
      if (onSubmitted) onSubmitted(feedbackPayload);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('[Feedback Submission Error]:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="inline-flex p-3 rounded-2xl bg-white/20 mb-2 backdrop-blur-xs">
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Session Feedback & Rating</h2>
          <p className="text-xs text-indigo-100 mt-1 max-w-md mx-auto line-clamp-1">
            {event.title}
          </p>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Thank You!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your valuable feedback helps speakers and organizers improve future symposium sessions.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Star Rating Selector */}
            <div className="text-center space-y-2">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                How would you rate this event?
              </label>
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {rating === 5 && '🌟 Outstanding Session!'}
                {rating === 4 && '👍 Very Good Experience'}
                {rating === 3 && '👌 Good / Average'}
                {rating === 2 && '⚠️ Needs Improvement'}
                {rating === 1 && '❌ Unsatisfactory'}
              </p>
            </div>

            {/* Quick Feedback Tags */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5 text-indigo-500" />
                What stood out? (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition cursor-pointer ${
                        active
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Written Comment Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                Additional Comments or Suggestions (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Share your thoughts about the presentation, speaker clarity, or venue arrangement..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
