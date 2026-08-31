// agent-notes: { ctx: "In-App Notification Center drawer with unread counter, status filter tabs, and direct pass shortcuts", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-31" }

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  AlertTriangle,
  Clock,
  Sparkles,
  X,
  CheckCheck,
  Trash2,
  QrCode,
  Inbox,
} from 'lucide-react';

export default function NotificationCenter({ isOpen, onClose, onOpenQRPass }) {
  const {
    notifications = [],
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearAllNotifications,
    unreadNotificationCount = 0,
    events = [],
  } = useApp();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread'

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    return true;
  });

  const getNotifIcon = (type) => {
    switch (type) {
      case 'registration':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200 shadow-2xs">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case 'emergency':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'delay':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-2xs">
            <Clock className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200 shadow-2xs">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  const formatNotifTime = (isoString) => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
      {/* Slide-over panel */}
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 text-left animate-slideInRight text-slate-900">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                Notification Feed
                {unreadNotificationCount > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                    {unreadNotificationCount} New
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Live registrations, passes & venue alerts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Filters */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'unread'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unread ({unreadNotificationCount})
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {unreadNotificationCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                title="Mark all as read"
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                title="Clear notifications"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
          {filteredNotifications.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center shadow-xs">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">No notifications to show</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                You're completely up to date. You will receive updates here for registrations, schedule updates, and live announcements.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const matchedEvent = notif.event_id ? events.find((e) => e.id === notif.event_id) : null;

              return (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    notif.read
                      ? 'bg-white border-slate-200/80 hover:border-slate-300 opacity-80'
                      : 'bg-white border-indigo-200 hover:border-indigo-300 shadow-2xs ring-1 ring-indigo-500/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getNotifIcon(notif.type)}

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">
                          {notif.title || 'Notification'}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatNotifTime(notif.created_at || notif.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                      {/* Event Pass Shortcut Button if applicable */}
                      {matchedEvent && onOpenQRPass && (
                        <div className="pt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenQRPass(matchedEvent);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 transition-colors cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>View Pass</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5"></span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
