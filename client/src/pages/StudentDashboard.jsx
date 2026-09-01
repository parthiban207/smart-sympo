// agent-notes: { ctx: "Academic Symposium Programme & Paper Matrix with three-dots action menus, metrics ribbon, certificate progress tracker, category filters, and TOTP entry pass modal", deps: ["src/context/AppContext.jsx", "src/components/StudentQRModal.jsx", "src/components/RegistrationSuccessModal.jsx", "src/components/SessionDetailsModal.jsx", "src/utils/calendarExport.js", "lucide-react"], state: "active", last: "antigravity@2026-09-01" }

import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import StudentQRModal from '../components/StudentQRModal';
import RegistrationSuccessModal from '../components/RegistrationSuccessModal';
import SessionDetailsModal from '../components/SessionDetailsModal';
import {
  Clock,
  MapPin,
  QrCode,
  CheckCircle2,
  AlertCircle,
  School,
  BookOpen,
  FileText,
  Bookmark,
  MoreVertical,
  Share2,
  Sparkles,
  Search,
  Filter,
  Layers,
  Award,
  Calendar,
  ExternalLink,
  ChevronDown,
  Info,
  Check,
} from 'lucide-react';

export default function StudentDashboard() {
  const { currentUser, events, fetchEvents, registrations, registerForEvent, unregisterForEvent } = useApp();
  const [selectedPassEvent, setSelectedPassEvent] = useState(null);
  const [selectedDetailEvent, setSelectedDetailEvent] = useState(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'registered' | 'available'

  // Active 3-dots popup state
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const menuContainerRef = useRef(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Close card 3-dots menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeMenuId]);

  if (!currentUser) return null;

  const studentRegIds = registrations
    .filter(
      (r) =>
        r.student_id === currentUser.id ||
        (r.student_email && currentUser.email && r.student_email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (r.student_username && currentUser.username && r.student_username.toLowerCase() === currentUser.username.toLowerCase())
    )
    .map((r) => r.event_id);

  const registeredEvents = events
    .filter((e) => studentRegIds.includes(e.id))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const availableEvents = events.filter((e) => !studentRegIds.includes(e.id));

  // Extract unique categories from events
  const categories = ['All', ...Array.from(new Set(events.map((e) => e.category || 'Technical Session').filter(Boolean)))];

  // Filtering Logic
  const filterEventsList = (list) => {
    return list.filter((event) => {
      const matchesSearch =
        searchQuery === '' ||
        (event.title && event.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.hall_number && event.hall_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.category && event.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'All' || (event.category || 'Technical Session') === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  };

  const filteredRegisteredEvents = filterEventsList(registeredEvents);
  const filteredAvailableEvents = filterEventsList(availableEvents);

  const handleRegister = async (eventId) => {
    setActiveMenuId(null);
    const res = await registerForEvent(eventId);
    setFeedback(res);
    if (res?.success) {
      setSuccessModalData({
        event: res.event || events.find((e) => e.id === eventId),
        emailResult: res.emailResult,
        passToken: res.passToken,
      });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUnregister = async (eventId) => {
    setActiveMenuId(null);
    const res = await unregisterForEvent(eventId);
    setFeedback(res);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleOpenQRPass = (event) => {
    setActiveMenuId(null);
    setSelectedPassEvent(event);
    setIsQRModalOpen(true);
  };

  const handleOpenDetails = (event) => {
    setActiveMenuId(null);
    setSelectedDetailEvent(event);
  };

  const handleCopyLink = (event) => {
    const url = `${window.location.origin}/student?session=${event.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status, delayMins) => {
    if (delayMins > 0) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Delayed ({delayMins}m)</span>
        </span>
      );
    }
    switch (status) {
      case 'In Progress':
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
            <span>Live Session</span>
          </span>
        );
      case 'Completed':
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Concluded
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Scheduled
          </span>
        );
    }
  };

  // Certificate Eligibility: 2+ tracks registered = 100% eligibility
  const requiredTracksForCert = 2;
  const certProgress = Math.min(100, Math.round((registeredEvents.length / requiredTracksForCert) * 100));
  const isCertEligible = registeredEvents.length >= requiredTracksForCert;
  const symposiumCredits = registeredEvents.length * 25;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" ref={menuContainerRef}>
      {/* 1. Delegate Credential Header Card */}
      <div className="neo-glass-card p-6 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 text-white flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-indigo-500/25 shrink-0">
            {(currentUser.name || currentUser.full_name || 'A').charAt(0)}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {currentUser.name || currentUser.full_name}
              </h1>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {currentUser.college_id || currentUser.roll_no || 'STU-2026'}
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified Delegate
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap font-medium">
              <span>{currentUser.email}</span>
              {currentUser.college && (
                <>
                  <span>•</span>
                  <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <School className="w-3.5 h-3.5 text-slate-400" />
                    {currentUser.college}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-md">
                {registeredEvents.length} Registered Sessions
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {registeredEvents.length > 0 && (
            <button
              onClick={() => handleOpenQRPass(registeredEvents[0])}
              className="flex-1 md:flex-none px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition cursor-pointer shrink-0 active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Digital Ticket Pass</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Symposium Metrics & Certificate Eligibility Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Registered Tracks */}
        <div className="neo-glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">My Tracks</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {registeredEvents.length}
            </span>
            <span className="text-[11px] font-mono text-slate-400">/ {events.length} total</span>
          </div>
        </div>

        {/* Metric 2: Live Tracks */}
        <div className="neo-glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Live Sessions</span>
            <Clock className="w-4 h-4 text-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {events.filter((e) => e.status === 'In Progress').length}
            </span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              Active Now
            </span>
          </div>
        </div>

        {/* Metric 3: Symposium Credits */}
        <div className="neo-glass-card p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Sympo Credits</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              {symposiumCredits}
            </span>
            <span className="text-[11px] font-mono text-slate-400">Points</span>
          </div>
        </div>

        {/* Metric 4: Certificate Progress */}
        <div className="neo-glass-card p-4 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Certificate</span>
            <Award className={`w-4 h-4 ${isCertEligible ? 'text-emerald-500' : 'text-slate-400'}`} />
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isCertEligible ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
              {isCertEligible ? 'Eligible (Ready)' : `${registeredEvents.length}/${requiredTracksForCert} Tracks`}
            </span>
            <span className="text-[10px] font-mono text-slate-400">{certProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isCertEligible ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${certProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Interactive Search & Category Filter Controls */}
      <div className="neo-glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sessions by title, hall, category, or topic..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Filter Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setViewFilter('all')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All Tracks
            </button>
            <button
              onClick={() => setViewFilter('registered')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewFilter === 'registered'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              My Schedule ({registeredEvents.length})
            </button>
            <button
              onClick={() => setViewFilter('available')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewFilter === 'available'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Available ({availableEvents.length})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" /> Tracks:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-medium border shadow-xs animate-fadeIn ${
            feedback.success
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 4. Programme & Paper Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Registered Session Matrix (7 cols) */}
        {(viewFilter === 'all' || viewFilter === 'registered') && (
          <div className={`${viewFilter === 'registered' ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <span>My Registered Schedule</span>
              </h2>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
                {filteredRegisteredEvents.length} Active Tracks
              </span>
            </div>

            {filteredRegisteredEvents.length === 0 ? (
              <div className="neo-glass-card p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto border border-indigo-500/20">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-900 dark:text-white text-base">
                  {searchQuery || selectedCategory !== 'All'
                    ? 'No matching registered sessions found.'
                    : 'No sessions registered yet.'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Browse available symposium tracks to claim your seat and entry pass.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRegisteredEvents.map((event, idx) => {
                  const regCount = registrations.filter((r) => r.event_id === event.id).length;
                  const maxCap = event.max_capacity || 100;
                  const capPct = Math.min(100, Math.round((regCount / maxCap) * 100));
                  const paperCode = `TRACK-${2026}-${String(idx + 1).padStart(2, '0')}`;
                  const isMenuOpen = activeMenuId === event.id;

                  return (
                    <div
                      key={event.id}
                      className="neo-glass-card p-5 space-y-3.5 hover:border-indigo-500/40 transition-all relative"
                    >
                      {/* Top Row: Track Code, Category, Status & Three-Dots Menu */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {paperCode}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                              {event.category || 'Technical Session'}
                            </span>
                            {getStatusBadge(event.status, event.delay_minutes || 0)}
                          </div>

                          <h3
                            onClick={() => handleOpenDetails(event)}
                            className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight mt-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                          >
                            {event.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleOpenQRPass(event)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold font-mono transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-xs"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Pass</span>
                          </button>

                          {/* Three Dots More Actions Menu */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : event.id);
                              }}
                              title="More Session Options"
                              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                                isMenuOpen
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#121620] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 animate-fadeIn text-xs">
                                <button
                                  onClick={() => handleOpenDetails(event)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer text-left font-medium"
                                >
                                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>View Session Details</span>
                                </button>

                                <button
                                  onClick={() => handleOpenQRPass(event)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer text-left font-medium"
                                >
                                  <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Show Digital QR Pass</span>
                                </button>

                                <button
                                  onClick={() => handleCopyLink(event)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer text-left font-medium"
                                >
                                  {copiedId === event.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="w-3.5 h-3.5 text-purple-500" />
                                      <span>Share Track Link</span>
                                    </>
                                  )}
                                </button>

                                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                                <button
                                  onClick={() => handleUnregister(event.id)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-left font-medium"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Cancel Registration</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {event.description}
                      </p>

                      {/* Meta Bar: Time, Hall, Occupancy & Actions */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 flex-wrap gap-2">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            {formatTime(event.start_time)} – {formatTime(event.end_time)}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[11px] font-medium text-cyan-500 dark:text-cyan-400">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.hall_number}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {capPct}% ({regCount}/{maxCap})
                          </span>
                        </div>

                        <button
                          onClick={() => handleUnregister(event.id)}
                          className="text-[11px] font-mono text-rose-500 hover:text-rose-400 hover:underline font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Right Column: Open Proceedings & Enrolment (5 cols) */}
        {(viewFilter === 'all' || viewFilter === 'available') && (
          <div className={`${viewFilter === 'available' ? 'lg:col-span-12' : 'lg:col-span-5'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-cyan-500" />
                <span>Browse Available Tracks</span>
              </h2>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
                {filteredAvailableEvents.length} Available
              </span>
            </div>

            {filteredAvailableEvents.length === 0 ? (
              <div className="neo-glass-card p-8 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-slate-900 dark:text-white text-sm">
                  {searchQuery || selectedCategory !== 'All'
                    ? 'No matching tracks available.'
                    : 'Registered for all available tracks.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredAvailableEvents.map((event) => {
                  const regCount = registrations.filter((r) => r.event_id === event.id).length;
                  const maxCap = event.max_capacity || 100;
                  const isFull = regCount >= maxCap;
                  const isMenuOpen = activeMenuId === event.id;

                  return (
                    <div
                      key={event.id}
                      className="neo-glass-card p-4 space-y-3 hover:border-indigo-500/30 transition-all relative"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {event.category || 'Technical Session'}
                          </span>
                          <h4
                            onClick={() => handleOpenDetails(event)}
                            className="text-sm font-extrabold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                          >
                            {event.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleRegister(event.id)}
                            disabled={isFull}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0 font-mono shadow-xs ${
                              isFull
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                            }`}
                          >
                            {isFull ? 'Full' : 'Register'}
                          </button>

                          {/* Three Dots Action Menu */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : event.id);
                              }}
                              title="Track Options"
                              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                                isMenuOpen
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#121620] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-40 animate-fadeIn text-xs">
                                <button
                                  onClick={() => handleOpenDetails(event)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer text-left font-medium"
                                >
                                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>View Full Details</span>
                                </button>

                                <button
                                  onClick={() => handleCopyLink(event)}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition cursor-pointer text-left font-medium"
                                >
                                  {copiedId === event.id ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                      <span className="text-emerald-600 dark:text-emerald-400">Link Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Share2 className="w-3.5 h-3.5 text-purple-500" />
                                      <span>Share Track</span>
                                    </>
                                  )}
                                </button>

                                {!isFull && (
                                  <>
                                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                    <button
                                      onClick={() => handleRegister(event.id)}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer text-left font-bold"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Register Now</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {event.description}
                      </p>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-cyan-500 dark:text-cyan-400 font-semibold">{event.hall_number}</span>
                        <span>{formatTime(event.start_time)}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {regCount}/{maxCap} Seats
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedDetailEvent && (
        <SessionDetailsModal
          isOpen={Boolean(selectedDetailEvent)}
          onClose={() => setSelectedDetailEvent(null)}
          event={selectedDetailEvent}
          isRegistered={studentRegIds.includes(selectedDetailEvent.id)}
          onRegister={handleRegister}
          onUnregister={handleUnregister}
          onOpenPass={handleOpenQRPass}
          regCount={registrations.filter((r) => r.event_id === selectedDetailEvent.id).length}
        />
      )}

      {/* Entry Pass Dialog */}
      {selectedPassEvent && (
        <StudentQRModal
          isOpen={isQRModalOpen}
          onClose={() => {
            setIsQRModalOpen(false);
            setSelectedPassEvent(null);
          }}
          event={selectedPassEvent}
          student={currentUser}
        />
      )}

      {/* Registration Success Dialog */}
      {successModalData && (
        <RegistrationSuccessModal
          isOpen={Boolean(successModalData)}
          onClose={() => setSuccessModalData(null)}
          event={successModalData.event}
          emailResult={successModalData.emailResult}
          passToken={successModalData.passToken}
          student={currentUser}
        />
      )}
    </div>
  );
}

