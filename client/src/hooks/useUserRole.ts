// agent-notes: { ctx: "Custom hook to fetch and return logged-in user role from profiles table", deps: ["src/supabaseClient.ts"], state: "active", last: "antigravity@2026-07-31" }

import { useState, useEffect, useCallback } from 'react';
import { supabase, isValidUUID } from '../supabaseClient';

export type UserRole = 'student' | 'coordinator' | 'admin';

export interface UserProfile {
  id: string;
  full_name?: string;
  name?: string;
  username?: string;
  email?: string;
  role: UserRole;
  college_id?: string;
  pass_code?: string;
}

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  const fetchRoleAndProfile = useCallback(async (userId: string, userEmail?: string, userObj?: any) => {
    setLoading(true);
    try {
      const meta = userObj?.user_metadata || {};
      const fallbackRole: UserRole = (userEmail?.toLowerCase().includes('admin') || meta.username === 'admin')
        ? 'admin'
        : (meta.role as UserRole) || (typeof localStorage !== 'undefined' ? localStorage.getItem('smart_sympo_active_role') as UserRole : null) || (userEmail?.toLowerCase().includes('coord') ? 'coordinator' : 'student');
      const fallbackName = meta.full_name || meta.name || userEmail?.split('@')[0] || 'User';

      setRole(fallbackRole);
      setProfile({
        id: userId,
        full_name: fallbackName,
        name: fallbackName,
        email: userEmail,
        role: fallbackRole,
        college_id: meta.college_id,
      });

      if (!isValidUUID(userId)) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (data && !error) {
          const fetchedRole = (userEmail?.toLowerCase().includes('admin') || meta.username === 'admin')
            ? 'admin'
            : ((data.role as UserRole) || fallbackRole);
          setRole(fetchedRole);
          setProfile({
            id: data.id,
            full_name: data.full_name || data.name || fallbackName,
            name: data.name || data.full_name || fallbackName,
            email: data.email || userEmail,
            role: fetchedRole,
            college_id: data.college_id,
          });
        }
      } catch (_) {}
    } catch (err) {
      console.warn('useUserRole fallback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchRoleAndProfile(session.user.id, session.user.email, session.user);
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Listen to Auth state changes (only refetch if user ID changed)
    let currentUserId: string | null = null;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (session.user.id !== currentUserId) {
          currentUserId = session.user.id;
          setUser(session.user);
          fetchRoleAndProfile(session.user.id, session.user.email, session.user);
        }
      } else {
        currentUserId = null;
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchRoleAndProfile]);

  return {
    role,
    loading,
    user,
    profile,
    refetch: () => user && fetchRoleAndProfile(user.id, user.email),
  };
}
