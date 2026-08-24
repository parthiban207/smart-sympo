// agent-notes: { ctx: "In-App Notification Center & Activity Feed drawer with unread badge counter, filtering, and instant event pass access", deps: ["src/context/AppContext.jsx", "lucide-react"], state: "active", last: "antigravity@2026-08-24" }

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  X,
  CheckCheck,
  Trash2,
  QrCode,
  MapPin,
  Radio,
  ExternalLink,
  Inbox
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
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case 'emergency':
        return (
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200 animate-pulse">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'delay':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
            <Clock className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200">
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-2xs animate-fadeIn">
      {/* Slide-over panel */}
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 text-left animate-slideInRight text-slate-900">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                Notification Center
                {unreadNotificationCount > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                    {unreadNotificationCount} New
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500">Live registrations, passes & venue alerts</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar & Actions */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white gap-2 text-xs">
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1 font-semibold rounded-md transition-all cursor-pointer ${
                activeFilter === 'unread'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unread ({unreadNotificationCount})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadNotificationCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                title="Mark all as read"
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                title="Clear notifications"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Inbox className="w-10 h-10 stroke-1 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No notifications in this view</p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                Event registrations, pass confirmations, and schedule updates will appear here.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const matchedEvent = notif.eventId ? events.find((e) => e.id === notif.eventId) : null;

              return (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition-all cursor-pointer border ${
                    notif.read
                      ? 'bg-white border-transparent hover:bg-slate-50'
                      : 'bg-indigo-50/40 border-indigo-100 hover:bg-indigo-50/70 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getNotifIcon(notif.type)}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <h4
                          className={`text-xs leading-snug truncate ${
                            notif.read ? 'font-semibold text-slate-800' : 'font-extrabold text-slate-900'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1"></span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">{notif.message}</p>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-medium">
                        <span>{formatNotifTime(notif.created_at)}</span>

                        {matchedEvent && onOpenQRPass && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              onOpenQRPass(matchedEvent);
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                          >
                            <QrCode className="w-3 h-3" />
                            <span>View Pass</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/60 text-center text-[10px] text-slate-400 font-mono">
          SmartSympo Real-Time Notification Stream • Connected
        </div>
      </div>
    </div>
  );
}
