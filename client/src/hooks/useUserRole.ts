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

  const fetchRoleAndProfile = useCallback(async (userId: string, userEmail?: string) => {
    setLoading(true);
    try {
      if (!isValidUUID(userId)) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        const fetchedRole = (data.role as UserRole) || 'student';
        setRole(fetchedRole);
        setProfile({
          id: data.id,
          full_name: data.full_name || data.name || userEmail?.split('@')[0],
          name: data.name || data.full_name,
          email: data.email || userEmail,
          role: fetchedRole,
          college_id: data.college_id,
        });
      } else {
        setRole('student');
      }
    } catch (err) {
      console.warn('Error in useUserRole:', err);
      setRole('student');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchRoleAndProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // Listen to Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchRoleAndProfile(session.user.id, session.user.email);
      } else {
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
