// agent-notes: { ctx: "Custom hook for Supabase Realtime Presence tracking online users and role statuses", deps: ["src/supabaseClient.ts", "src/hooks/useUserRole.ts"], state: "active", last: "antigravity@2026-09-07" }

import { useEffect, useState } from 'react';
import { supabase, isMockMode } from '../supabaseClient';
import { useUserRole } from './useUserRole';

export interface OnlineUserPresence {
  user_id: string;
  online_at: string;
  username: string;
  full_name: string;
  role: 'student' | 'coordinator' | 'admin';
  email?: string;
}

export function usePresence() {
  const { user, profile } = useUserRole();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserPresence[]>([]);

  useEffect(() => {
    if (!user) {
      setOnlineUsers([]);
      return;
    }

    const activePresence: OnlineUserPresence = {
      user_id: user.id || 'usr_mock_1',
      online_at: new Date().toISOString(),
      username: profile?.username || user.email?.split('@')[0] || 'user',
      full_name: profile?.full_name || profile?.name || 'Smart User',
      role: (profile?.role as 'student' | 'coordinator' | 'admin') || 'student',
      email: user.email,
    };

    if (isMockMode) {
      setOnlineUsers([activePresence]);
      return;
    }

    try {
      const channel = supabase.channel('online-users', {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          try {
            const state = channel.presenceState();
            const usersList: OnlineUserPresence[] = [];
            Object.keys(state).forEach((key) => {
              const presences = state[key] as any[];
              if (presences && presences.length > 0) {
                usersList.push(presences[0] as OnlineUserPresence);
              }
            });
            setOnlineUsers(usersList.length > 0 ? usersList : [activePresence]);
          } catch (_) {}
        })
        .on('presence', { event: 'join' }, () => {})
        .on('presence', { event: 'leave' }, () => {})
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            try {
              await channel.track(activePresence);
            } catch (_) {}
          }
        });

      return () => {
        try {
          channel.unsubscribe();
        } catch (_) {}
      };
    } catch (_) {
      setOnlineUsers([activePresence]);
    }
  }, [user, profile]);

  return {
    onlineUsers,
    onlineCount: Math.max(1, onlineUsers.length),
  };
}
