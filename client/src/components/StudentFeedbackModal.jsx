// agent-notes: { ctx: "Student-to-Admin Application Feedback modal with sender verification, category picker, 5-star rating, and ticket history", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-09-30" }

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MessageSquareHeart,
  Send,
  Star,
  X,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Building2,
  Sparkles,
  History,
  ShieldCheck,
  ArrowRight,
  Bug,
  Lightbulb,
  Laptop,
  HelpCircle,
  Clock,
  Check,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'app_experience', label: 'App Experience', icon: Laptop, desc: 'UI, performance & navigation' },
  { id: 'bug_report', label: 'Bug / Issue', icon: Bug, desc: 'Glitches, scanner or login issue' },
  { id: 'feature_request', label: 'Feature Idea', icon: Lightbulb, desc: 'Suggestions for improvement' },
  { id: 'venue_query', label: 'Venue & Schedule', icon: Building2, desc: 'Session halls & timetable' },
  { id: 'general', label: 'General Feedback', icon: HelpCircle, desc: 'Symposium thoughts & remarks' },
];

const RATING_LABELS = {
  1: 'Needs Improvement 😕',
  2: 'Fair Experience 😐',
  3: 'Good & Functional 🙂',
  4: 'Great & Responsive! 😊',
  5: 'Outstanding Experience! 🌟',
};

export default function StudentFeedbackModal({ isOpen, onClose }) {
  const { currentUser, submitAppFeedback, appFeedbacks } = useApp();

  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'history'
  const [category, setCategory] = useState('app_experience');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal'); // 'normal' | 'high'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [formError, setFormError] = useState('');

  if (!isOpen) return null;

  // Filter feedbacks sent by this student
  const studentEmail = currentUser?.email || 'student@college.edu';
  const studentRoll = currentUser?.college_id || currentUser?.roll_no || 'STU-2026-001';
  const myFeedbacks = (appFeedbacks || []).filter(
    (fb) => fb.student_email === studentEmail || fb.roll_no === studentRoll || fb.student_id === currentUser?.id
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!message.trim() || message.trim().length < 5) {
      setFormError('Please enter at least 5 characters describing your feedback.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        student_id: currentUser?.id,
        student_name: currentUser?.name || currentUser?.full_name || 'Student Delegate',
        student_email: currentUser?.email || 'student@college.edu',
        roll_no: currentUser?.college_id || currentUser?.roll_no || 'STU-2026-001',
        college: currentUser?.college || 'College of Engineering',
        department: currentUser?.department || 'Computer Science & Engineering',
        category,
        rating,
        title: title.trim(),
        message: message.trim(),
        priority,
      };

      const result = await submitAppFeedback(payload);
      setIsSubmitting(false);

      if (result?.success) {
        setSubmittedData(result.feedback);
        setTitle('');
        setMessage('');
        setRating(5);
      } else {
        setFormError('Could not submit feedback. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting student feedback:', err);
      setIsSubmitting(false);
      setFormError('Failed to dispatch feedback. Local draft saved.');
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    setFormError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* 1. Modal Top Bar */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Student Feedback Desk
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Direct to Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Share your application experience, issues, or suggestions directly with event leadership
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            title="Close Feedback Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Sender -> Receiver Route Verification Ribbon */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3 text-xs">
            {/* Sender Identification */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Sender:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {currentUser?.name || currentUser?.full_name || 'Student Delegate'}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {currentUser?.college_id || currentUser?.roll_no || 'STU-2026'}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Arrow */}
            <div className="flex items-center gap-1 text-slate-400 shrink-0 font-mono text-[11px]">
              <span className="hidden sm:inline text-[10px] font-semibold text-slate-400">Routes to</span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            </div>

            {/* Receiver Identification */}
            <div className="flex items-center gap-2 min-w-0 text-right justify-end">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 justify-end flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Receiver:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    Administrator Desk
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Navigation Tabs: Submit vs My Submissions */}
        <div className="px-6 pt-3 pb-0 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-bold shrink-0">
          <button
            onClick={() => { setActiveTab('write'); handleReset(); }}
            className={`pb-2.5 transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'write'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Feedback</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>My Submitted Feedback</span>
            {myFeedbacks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                {myFeedbacks.length}
              </span>
            )}
          </button>
        </div>

        {/* 4. Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'write' ? (
            submittedData ? (
              /* Success Confirmation Screen */
              <div className="py-8 px-4 text-center space-y-5 animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    Feedback Dispatched to Admin!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Your feedback has been safely recorded and routed to the central administration desk. The administrator can view your message along with your delegate profile.
                  </p>
                </div>

                <div className="max-w-md mx-auto p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-400 font-mono">Reference Ticket:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{submittedData.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-bold capitalize text-slate-800 dark:text-slate-200">{submittedData.category.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Rating Given:</span>
                    <span className="font-bold text-amber-500">{'★'.repeat(submittedData.rating)} ({submittedData.rating}/5)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Status:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      Pending Admin Review
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Submit Another Feedback
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/25 transition cursor-pointer"
                  >
                    View My Submissions
                  </button>
                </div>
              </div>
            ) : (
              /* Feedback Form */
              <form onSubmit={handleSubmit} className="space-y-5">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* 1. Category Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>What is your feedback about?</span>
                    <span className="text-[10px] text-slate-400 font-normal">Select a category</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => {
                      const IconComp = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                              : 'bg-slate-50/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <IconComp className={`w-4 h-4 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                            {isSelected && <Check className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold leading-tight">{cat.label}</div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{cat.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Interactive Star Rating */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Overall Application Satisfaction
                    </span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {RATING_LABELS[hoverRating || rating]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const isFilled = starValue <= (hoverRating || rating);
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setRating(starValue)}
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                          title={`Rate ${starValue} of 5`}
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              isFilled
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-600'
                            }`}
                          />
                        </button>
                      );
                    })}
                    <span className="text-xs font-mono font-bold text-slate-500 ml-2">
                      {hoverRating || rating} / 5
                    </span>
                  </div>
                </div>

                {/* 3. Feedback Subject / Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Subject / Headline (Optional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Brief summary</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Loved the TOTP entry pass / QR scanner took 2 tries"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* 4. Feedback Message Content */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Feedback Message <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {message.length} / 1000 characters
                    </span>
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your feedback, suggestion, or issue in detail so the admin team can address it..."
                    rows={4}
                    maxLength={1000}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                {/* 5. Priority / Urgency */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">Urgency Level</div>
                    <div className="text-[10px] text-slate-400">Mark high if this impacts your current event participation</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPriority('normal')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        priority === 'normal'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriority('high')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        priority === 'high'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-slate-400 hover:text-rose-600'
                      }`}
                    >
                      High Priority
                    </button>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-60 active:scale-95"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Feedback to Admin</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Submissions History */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Your Past Feedback to Admin ({myFeedbacks.length})
                </span>
                <button
                  onClick={() => { setActiveTab('write'); handleReset(); }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>New Feedback</span>
                </button>
              </div>

              {myFeedbacks.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <MessageSquareHeart className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    No feedback submitted yet
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Whenever you share feedback or report an issue, it will be listed here along with review status by the administration.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myFeedbacks.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                              {item.title || item.category.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              {item.category.replace('_', ' ')}
                            </span>
                            {item.priority === 'high' && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/30">
                                High Priority
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                            <span>ID: {item.id}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {item.status === 'resolved' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolved
                            </span>
                          ) : item.status === 'reviewed' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Reviewed by Admin
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Pending Review
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-amber-500 text-xs">
                        {'★'.repeat(item.rating || 5)}{'☆'.repeat(5 - (item.rating || 5))}
                        <span className="text-slate-400 font-mono text-[10px] ml-1">({item.rating || 5}/5)</span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 whitespace-pre-wrap">
                        {item.message}
                      </p>

                      {item.admin_notes && (
                        <div className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-start gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Admin Response: </span>
                            <span>{item.admin_notes}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
