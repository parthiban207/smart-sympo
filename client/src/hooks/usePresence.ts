// agent-notes: { ctx: "Custom hook for Supabase Realtime Presence tracking online users and role statuses", deps: ["src/supabaseClient.ts", "src/hooks/useUserRole.ts"], state: "active", last: "antigravity@2026-07-31" }

import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
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

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    const activePresence: OnlineUserPresence = {
      user_id: user.id,
      online_at: new Date().toISOString(),
      username: profile?.username || user.email?.split('@')[0] || 'user',
      full_name: profile?.full_name || profile?.name || 'Smart User',
      role: (profile?.role as 'student' | 'coordinator' | 'admin') || 'student',
      email: user.email,
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const usersList: OnlineUserPresence[] = [];
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            usersList.push(presences[0] as OnlineUserPresence);
          }
        });
        setOnlineUsers(usersList);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined presence:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left presence:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(activePresence);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user, profile]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
  };
}
