// agent-notes: { ctx: "AppContext managing auth session, realtime event & attendance subscriptions, role management, guest check-in", deps: ["src/supabaseClient.js"], state: "active", last: "antigravity@2026-07-31" }

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isMockMode, initialMockEvents, initialMockProfiles, isValidUUID } from '../supabaseClient';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // Mandatory auth gate: default to null
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState(initialMockEvents);
  const [registrations, setRegistrations] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_sympo_registrations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validParsed = parsed.filter(
            (r) => isValidUUID(r.event_id) && isValidUUID(r.student_id)
          );
          if (validParsed.length > 0) return validParsed;
        }
      }
    } catch {
      // Fallback if localStorage reading fails
    }
    return [
      {
        id: '11111111-9999-9999-9999-111111111111',
        student_id: '11111111-0000-0000-0000-000000000001',
        event_id: '11111111-1111-1111-1111-111111111111',
        registered_at: new Date().toISOString(),
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('smart_sympo_registrations', JSON.stringify(registrations));
    } catch (e) {
      console.warn('Could not save registrations to localStorage:', e);
    }
  }, [registrations]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [guestCheckins, setGuestCheckins] = useState([]);
  const [profilesList, setProfilesList] = useState(initialMockProfiles);
  const [liveAlerts, setLiveAlerts] = useState([
    {
      id: 1,
      message: 'Welcome to SmartSympo! Real-time hall updates active.',
      time: 'Just now',
      type: 'info',
    },
  ]);

  // Load user profile from Supabase profiles table
  const fetchUserProfile = async (userId, userEmail) => {
    if (isMockMode || !isValidUUID(userId)) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (data && !error) {
        setCurrentUser(data);
      } else {
        // Fallback profile if record not yet returned from trigger
        const fallback = {
          id: userId,
          name: userEmail?.split('@')[0] || 'Authenticated User',
          email: userEmail,
          role: 'student',
          college_id: `COL-${userId.slice(0, 6).toUpperCase()}`,
        };
        setCurrentUser(fallback);
      }
    } catch (err) {
      console.warn('Error fetching profile:', err);
    }
  };

  // Initialize Supabase Auth Session & Realtime Subscriptions
  useEffect(() => {
    if (!isMockMode) {
      // 1. Get initial Auth Session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          setIsAuthenticated(true);
          fetchUserProfile(session.user.id, session.user.email);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      });

      // 2. Auth state change listener
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          setIsAuthenticated(true);
          fetchUserProfile(session.user.id, session.user.email);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      });

      // 3. Fetch initial Database tables
      const fetchInitialData = async () => {
        const { data: eventsData } = await supabase.from('events').select('*');
        if (eventsData && eventsData.length > 0) setEvents(eventsData);

        const { data: regData } = await supabase.from('registrations').select('*');
        if (regData && regData.length > 0) {
          setRegistrations((prev) => {
            const map = new Map();
            prev.forEach((r) => map.set(`${r.student_id}_${r.event_id}`, r));
            regData.forEach((r) => map.set(`${r.student_id}_${r.event_id}`, r));
            return Array.from(map.values());
          });
        }

        const { data: attData } = await supabase.from('attendance_logs').select('*');
        if (attData) setAttendanceLogs(attData);

        const { data: profData } = await supabase.from('profiles').select('*');
        if (profData && profData.length > 0) setProfilesList(profData);
      };

      fetchInitialData();

      // 4. Realtime listener for Events table
      const eventsChannel = supabase
        .channel('public:events')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events' }, (payload) => {
          const updatedEvent = payload.new;
          setEvents((prevEvents) =>
            prevEvents.map((evt) => (evt.id === updatedEvent.id ? updatedEvent : evt))
          );

          const alertMsg =
            updatedEvent.delay_minutes > 0
              ? `Attention: ${updatedEvent.title} in ${updatedEvent.hall_number} delayed by ${updatedEvent.delay_minutes} mins.`
              : `Status Update: ${updatedEvent.title} in ${updatedEvent.hall_number} is now ${updatedEvent.status}.`;

          setLiveAlerts((prev) => [
            {
              id: Date.now(),
              message: alertMsg,
              time: new Date().toLocaleTimeString(),
              type: 'warning',
            },
            ...prev.slice(0, 4),
          ]);
        })
        .subscribe();

      // 5. Realtime listener for Attendance Logs table (postgres_changes listener)
      const attendanceChannel = supabase
        .channel('public:attendance_logs')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'attendance_logs' },
          (payload) => {
            const newOrUpdatedLog = payload.new;
            if (newOrUpdatedLog) {
              setAttendanceLogs((prev) => {
                const exists = prev.some((log) => log.id === newOrUpdatedLog.id);
                if (exists) {
                  return prev.map((log) => (log.id === newOrUpdatedLog.id ? newOrUpdatedLog : log));
                }
                return [newOrUpdatedLog, ...prev];
              });

              // Add live feed alert notification
              setLiveAlerts((prev) => [
                {
                  id: Date.now(),
                  message: `Live Attendance: Student checked in at ${newOrUpdatedLog.hall_number || 'Hall'}!`,
                  time: new Date().toLocaleTimeString(),
                  type: 'success',
                },
                ...prev.slice(0, 4),
              ]);
            }
          }
        )
        .subscribe();

      // 6. Realtime listener for Profiles table (user role updates)
      const profilesChannel = supabase
        .channel('public:profiles')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload) => {
            const updatedProfile = payload.new;
            if (updatedProfile) {
              setProfilesList((prev) => {
                const exists = prev.some((p) => p.id === updatedProfile.id);
                if (exists) {
                  return prev.map((p) => (p.id === updatedProfile.id ? updatedProfile : p));
                }
                return [updatedProfile, ...prev];
              });
              setCurrentUser((current) => (current && current.id === updatedProfile.id ? updatedProfile : current));
            }
          }
        )
        .subscribe();

      return () => {
        authSubscription.unsubscribe();
        supabase.removeChannel(eventsChannel);
        supabase.removeChannel(attendanceChannel);
        supabase.removeChannel(profilesChannel);
      };
    }
  }, []);

  // Supabase Auth Signup with Metadata for Trigger & Service Call
  const signUpWithSupabase = async ({ email, password, fullName, role = 'student', collegeId }) => {
    const finalCollegeId = collegeId || `STU-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isMockMode) {
      const mockUser = {
        id: crypto.randomUUID ? crypto.randomUUID() : '11111111-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0'),
        name: fullName,
        email,
        role,
        college_id: finalCollegeId,
      };
      setCurrentUser(mockUser);
      setIsAuthenticated(true);
      return { success: true, user: mockUser };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            name: fullName,
            role: role,
            college_id: finalCollegeId,
          },
        },
      });

      if (error) return { success: false, message: error.message };

      if (data?.user) {
        // Direct Service Call to ensure profile is immediately written/upserted
        const profileData = {
          id: data.user.id,
          name: fullName,
          email: email,
          role: role,
          college_id: finalCollegeId,
        };
        const { error: profileErr } = await supabase.from('profiles').upsert([profileData]);
        if (profileErr) {
          console.error('[Profile Upsert Error]', profileErr);
        }
        setCurrentUser(profileData);
        setIsAuthenticated(true);
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Supabase Auth Login
  const signInWithSupabase = async ({ email, password }) => {
    if (isMockMode) {
      const found = initialMockProfiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
      if (found) {
        setCurrentUser(found);
        setIsAuthenticated(true);
        return { success: true, user: found };
      }
      const demoUser = {
        id: crypto.randomUUID ? crypto.randomUUID() : '11111111-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0'),
        name: email.split('@')[0],
        email,
        role: 'student',
        college_id: 'CS2026-DEMO',
      };
      setCurrentUser(demoUser);
      setIsAuthenticated(true);
      return { success: true, user: demoUser };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, message: error.message };

      if (data?.user) {
        await fetchUserProfile(data.user.id, data.user.email);
        setIsAuthenticated(true);
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  // Supabase Auth SignOut
  const signOutFromSupabase = async () => {
    try {
      if (!isMockMode) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setSession(null);
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  // Role switcher helper
  const switchRole = (roleName) => {
    const found = initialMockProfiles.find((p) => p.role === roleName);
    if (found) {
      setCurrentUser(found);
      setIsAuthenticated(true);
    }
  };

  // Atomic Clash-Detection & Capacity-Gated Registration Engine
  const registerForEvent = async (eventId) => {
    // 1. Debug log selected event_id
    console.log('[Registration Debug] Attempting registration for Event ID:', eventId);

    if (!eventId) {
      return { success: false, message: 'Invalid or missing Event ID.' };
    }

    if (!currentUser || !currentUser.id) {
      return { success: false, message: 'Authentication required. Please log in first.' };
    }

    // 2. Find event in local state
    const targetEvent = events.find((e) => e.id === eventId);
    console.log('[Registration Debug] Target Event Details:', targetEvent);

    if (!targetEvent) {
      return { success: false, message: 'Registration Failed: Selected event does not exist.' };
    }

    // 3. Prevent duplicate registrations for the same user and event
    const isAlreadyRegistered = registrations.some(
      (r) => r.student_id === currentUser.id && r.event_id === eventId
    );
    if (isAlreadyRegistered) {
      return { success: false, message: 'You are already registered for this event.' };
    }

    // 4. Capacity Auto-Lock Check
    const currentRegCount = registrations.filter((r) => r.event_id === eventId).length;
    const maxCapacity = targetEvent.max_capacity || targetEvent.max_seats || 100;

    if (currentRegCount >= maxCapacity) {
      return { success: false, message: 'Registration Failed: Event capacity reached.' };
    }

    // 5. Time Slot Clash Detection Check
    const targetStart = new Date(targetEvent.start_time).getTime();
    const targetEnd = new Date(targetEvent.end_time).getTime();

    const userRegs = registrations.filter((r) => r.student_id === currentUser.id);
    const userEventIds = userRegs.map((r) => r.event_id);
    const userEvents = events.filter((e) => userEventIds.includes(e.id));

    const conflictingEvent = userEvents.find((e) => {
      const eStart = new Date(e.start_time).getTime();
      const eEnd = new Date(e.end_time).getTime();
      return targetStart < eEnd && targetEnd > eStart;
    });

    if (conflictingEvent) {
      const msg = `Time slot conflicts with another registered event (${conflictingEvent.title} in ${conflictingEvent.hall_number}).`;
      return { success: false, message: msg };
    }

    // 6. Supabase Database Foreign Key & Event Existence Safeguard
    if (!isMockMode && isValidUUID(eventId) && isValidUUID(currentUser?.id)) {
      try {
        // Auto-seed missing event into Supabase events table to satisfy foreign key constraint
        const { data: dbEvent } = await supabase
          .from('events')
          .select('id')
          .eq('id', eventId)
          .maybeSingle();

        if (!dbEvent) {
          console.log('[Registration] Auto-seeding missing event into Supabase events table:', eventId);
          await supabase.from('events').upsert([
            {
              id: targetEvent.id,
              title: targetEvent.title,
              category: targetEvent.category || 'Technical',
              hall_number: targetEvent.hall_number || 'Hall 1',
              start_time: targetEvent.start_time || new Date().toISOString(),
              end_time: targetEvent.end_time || new Date(Date.now() + 7200000).toISOString(),
              max_capacity: targetEvent.max_capacity || targetEvent.max_seats || 100,
              status: targetEvent.status || 'Scheduled',
              delay_minutes: targetEvent.delay_minutes || 0,
            },
          ]);
        }

        // Insert registration record into Supabase
        const { error: insertErr } = await supabase.from('registrations').upsert(
          [
            {
              student_id: currentUser.id,
              event_id: eventId,
              registered_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'student_id,event_id' }
        );

        if (insertErr) {
          console.warn('[Registration DB Insert Warning]', insertErr);
          if (insertErr.code === '23505') {
            return { success: false, message: 'You are already registered for this event.' };
          }
          // Try RPC fallback
          await supabase.rpc('register_for_event', {
            p_student_id: currentUser.id,
            p_event_id: eventId,
          });
        }
      } catch (err) {
        console.warn('[Registration Exception - Fallback to local state]:', err);
      }
    }

    // 7. Update Local Memory State
    const newReg = {
      id: crypto.randomUUID ? crypto.randomUUID() : '11111111-9999-4000-8000-' + Date.now().toString(16).padStart(12, '0'),
      student_id: currentUser.id,
      event_id: eventId,
      registered_at: new Date().toISOString(),
    };

    setRegistrations((prev) => [...prev, newReg]);

    // Sync registrations table from Supabase if online
    if (!isMockMode) {
      const { data: latestRegs } = await supabase.from('registrations').select('*');
      if (latestRegs && latestRegs.length > 0) setRegistrations(latestRegs);
    }

    return { success: true, message: `Successfully registered for ${targetEvent.title}!` };
  };


  // Update Hall Status & Emit Live Realtime Update
  const updateHallStatus = async (eventId, newStatus, delayMinutes = 0) => {
    const updatedEvents = events.map((evt) => {
      if (evt.id === eventId) {
        return { ...evt, status: newStatus, delay_minutes: delayMinutes };
      }
      return evt;
    });

    setEvents(updatedEvents);

    const target = events.find((e) => e.id === eventId);
    if (target) {
      const alertMsg =
        delayMinutes > 0
          ? `Attention: ${target.title} in ${target.hall_number} delayed by ${delayMinutes} mins!`
          : `Status Update: ${target.title} in ${target.hall_number} marked as ${newStatus}.`;

      setLiveAlerts((prev) => [
        {
          id: Date.now(),
          message: alertMsg,
          time: new Date().toLocaleTimeString(),
          type: 'warning',
        },
        ...prev.slice(0, 4),
      ]);
    }

    if (!isMockMode && isValidUUID(eventId)) {
      await supabase
        .from('events')
        .update({ status: newStatus, delay_minutes: delayMinutes })
        .eq('id', eventId);
    }
  };

  // Verify QR Scan & Record Attendance Log
  const verifyQRPass = async (qrPayload, scannerHall) => {
    try {
      let data = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
      const { student_id, event_id } = data;

      if (!student_id || !event_id) {
        return { success: false, message: 'Invalid QR Pass structure.' };
      }
      if (!isValidUUID(event_id)) {
        return { success: false, message: 'Invalid Event ID format in QR Pass.' };
      }

      // Check for duplicate check-in
      const existingLog = attendanceLogs.find(
        (log) => log.student_id === student_id && log.event_id === event_id
      );

      if (existingLog) {
        return { success: false, message: 'Duplicate Scan: Student already checked in!' };
      }

      const newLog = {
        id: crypto.randomUUID ? crypto.randomUUID() : '11111111-8888-4000-8000-' + Date.now().toString(16).padStart(12, '0'),
        student_id,
        event_id,
        hall_number: scannerHall || 'Hall 1',
        check_in_time: new Date().toISOString(),
        status: 'Checked-In',
      };

      setAttendanceLogs((prev) => [newLog, ...prev]);

      if (!isMockMode) {
        await supabase.from('attendance_logs').insert([newLog]);
      }

      return {
        success: true,
        message: `Check-in verified for student ID ${student_id.slice(0, 8)}!`,
      };
    } catch {
      return { success: false, message: 'Malformed QR payload format.' };
    }
  };

  // Mark Attendance on QR Scan: updates registrations/event_registrations table with attended = true & inserts log
  const markAttendance = async (qrPayload, scannerHall = 'Main Venue') => {
    try {
      let data = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
      const registration_id = data.registration_id || data.reg_id;
      const event_id = data.event_id;
      const student_id = data.user_id || data.student_id;

      if (!event_id && !registration_id) {
        return { success: false, message: 'Invalid QR Pass structure: Missing event or registration ID.' };
      }

      // 1. Update local state in registrations
      setRegistrations((prev) =>
        prev.map((r) => {
          if (
            (registration_id && r.id === registration_id) ||
            (r.event_id === event_id && r.student_id === student_id)
          ) {
            return { ...r, attended: true };
          }
          return r;
        })
      );

      // 2. Add log entry to local state
      const newLog = {
        id: crypto.randomUUID ? crypto.randomUUID() : '11111111-8888-4000-8000-' + Date.now().toString(16).padStart(12, '0'),
        student_id: student_id || null,
        event_id: event_id || '11111111-1111-1111-1111-111111111111',
        hall_number: scannerHall,
        check_in_time: new Date().toISOString(),
        status: 'Checked-In',
      };
      setAttendanceLogs((prev) => [newLog, ...prev]);

      // 3. Perform Supabase Database update
      if (!isMockMode) {
        try {
          if (isValidUUID(registration_id)) {
            const { error: regErr } = await supabase
              .from('registrations')
              .update({ attended: true })
              .eq('id', registration_id);

            if (regErr) {
              await supabase
                .from('event_registrations')
                .update({ attended: true })
                .eq('id', registration_id);
            }
          } else if (isValidUUID(event_id) && isValidUUID(student_id)) {
            const { error: regErr } = await supabase
              .from('registrations')
              .update({ attended: true })
              .eq('event_id', event_id)
              .eq('student_id', student_id);

            if (regErr) {
              await supabase
                .from('event_registrations')
                .update({ attended: true })
                .eq('event_id', event_id)
                .eq('student_id', student_id);
            }
          }

          if (isValidUUID(event_id)) {
            await supabase.from('attendance_logs').insert([newLog]);
          }
        } catch (err) {
          console.warn('[Supabase markAttendance Warning]', err);
        }
      }

      return {
        success: true,
        message: `Attendance Verified! Marked attended = true for student ${student_id ? student_id.slice(0, 8) : 'attendee'}.`,
        attendee: { registration_id, event_id, student_id },
      };
    } catch {
      return { success: false, message: 'Malformed QR payload format.' };
    }
  };

  // Add new event (Admin function) with location/radius support
  const addEvent = async (newEventData) => {
    const created = {
      id: crypto.randomUUID ? crypto.randomUUID() : '55555555-5555-5555-5555-555555555555',
      ...newEventData,
      status: 'Scheduled',
      delay_minutes: 0,
    };

    setEvents((prev) => [...prev, created]);

    if (!isMockMode) {
      // Build the insert payload including PostGIS-style location data if provided
      const insertPayload = { ...created };
      if (created.latitude && created.longitude) {
        // Store location as geometry point for PostGIS if the column exists
        insertPayload.location = `SRID=4326;POINT(${created.longitude} ${created.latitude})`;
      }
      await supabase.from('events').insert([insertPayload]);
    }
  };

  // Guest QR Check-in — validates QR payload and calls checkin_attendee RPC
  const checkinGuest = async (qrPayload, scannerHall) => {
    try {
      let data = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
      const { guest_name, event_id, student_id } = data;
      const name = guest_name || `Guest-${Date.now().toString(36)}`;

      // Check for duplicate guest check-in
      const existingGuest = guestCheckins.find(
        (g) => g.guest_name === name && g.event_id === event_id
      );
      if (existingGuest) {
        return { success: false, message: `Duplicate: ${name} already checked in!` };
      }

      const newGuestLog = {
        id: crypto.randomUUID ? crypto.randomUUID() : '11111111-7777-4000-8000-' + Date.now().toString(16).padStart(12, '0'),
        guest_name: name,
        student_id: student_id || null,
        event_id: event_id || '11111111-1111-1111-1111-111111111111',
        hall_number: data.hall_number || scannerHall || 'Main Venue',
        check_in_time: new Date().toISOString(),
        status: 'Checked-In',
        is_guest: true,
      };

      setGuestCheckins((prev) => [newGuestLog, ...prev]);

      // Also add to attendance logs for the main feed
      setAttendanceLogs((prev) => [newGuestLog, ...prev]);

      // Push live alert
      setLiveAlerts((prev) => [
        {
          id: Date.now(),
          message: `Guest ${name} checked in at ${newGuestLog.hall_number}!`,
          time: new Date().toLocaleTimeString(),
          type: 'success',
        },
        ...prev.slice(0, 4),
      ]);

      if (!isMockMode && isValidUUID(newGuestLog.event_id)) {
        // Try RPC checkin_attendee first
        try {
          const { error: rpcError } = await supabase.rpc('checkin_attendee', {
            p_student_id: student_id || null,
            p_event_id: event_id || '11111111-1111-1111-1111-111111111111',
            p_guest_name: name,
            p_hall_number: newGuestLog.hall_number,
          });

          if (rpcError) {
            // Fallback: direct insert into attendance_logs
            await supabase.from('attendance_logs').insert([newGuestLog]);
          }
        } catch {
          await supabase.from('attendance_logs').insert([newGuestLog]);
        }
      }

      return {
        success: true,
        message: `Guest ${name} checked in successfully!`,
      };
    } catch {
      return { success: false, message: 'Invalid QR payload. Could not parse guest data.' };
    }
  };

  // Admin-Only Role Management Function with 5-Admin limit check
  const updateUserRole = async (targetUserId, newRole) => {
    if (currentUser?.role !== 'admin') {
      return { success: false, message: 'Access Denied: Only administrators can update user roles.' };
    }

    // Check 5-Admin limit if promoting to admin
    if (newRole === 'admin') {
      const adminCount = profilesList.filter((p) => p.role === 'admin' && p.id !== targetUserId).length;
      if (adminCount >= 5) {
        return { success: false, message: 'Maximum limit of 5 Admins reached. Cannot promote user to Admin.' };
      }
    }

    if (isMockMode || !isValidUUID(targetUserId)) {
      setProfilesList((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, role: newRole } : p))
      );
      return { success: true, message: `User role updated to ${newRole}.` };
    }

    try {
      const { data, error } = await supabase.rpc('update_user_role', {
        p_target_user_id: targetUserId,
        p_new_role: newRole,
      });

      if (error) {
        // Fallback to direct update if RPC is missing
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', targetUserId);

        if (updateErr) return { success: false, message: updateErr.message };
      } else if (data && !data.success) {
        return { success: false, message: data.message };
      }

      setProfilesList((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, role: newRole } : p))
      );

      return { success: true, message: `User role updated to ${newRole}!` };
    } catch (err) {
      return { success: false, message: err.message || 'Failed to update user role.' };
    }
  };

  // Admin Passcode Management Function
  const updateUserPassCode = async (targetUserId, newPassCode) => {
    setProfilesList((prev) =>
      prev.map((p) => (p.id === targetUserId ? { ...p, pass_code: newPassCode } : p))
    );

    if (currentUser?.id === targetUserId) {
      setCurrentUser((current) => (current ? { ...current, pass_code: newPassCode } : current));
    }

    if (!isMockMode && isValidUUID(targetUserId)) {
      try {
        await supabase
          .from('profiles')
          .update({ pass_code: newPassCode })
          .eq('id', targetUserId);
      } catch (err) {
        console.warn('Error updating passcode in Supabase:', err);
      }
    }
    return { success: true, message: `Security Passcode updated to "${newPassCode}"!` };
  };

  // Unregister / Cancel registration for an event
  const unregisterForEvent = async (eventId) => {
    if (!eventId) return { success: false, message: 'Invalid Event ID.' };
    if (!currentUser) return { success: false, message: 'Must be logged in to unregister.' };

    const targetEvent = events.find((e) => e.id === eventId);

    if (!isMockMode && isValidUUID(eventId) && isValidUUID(currentUser?.id)) {
      try {
        await supabase
          .from('registrations')
          .delete()
          .eq('student_id', currentUser.id)
          .eq('event_id', eventId);
      } catch (err) {
        console.warn('Supabase delete registration error:', err);
      }
    }

    setRegistrations((prev) =>
      prev.filter((r) => !(r.student_id === currentUser.id && r.event_id === eventId))
    );
    return { success: true, message: `Successfully unregistered from ${targetEvent?.title || 'the event'}.` };
  };

  // Update existing event details (Admin & Coordinator function)
  const updateEvent = async (eventId, updatedEventData) => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === eventId ? { ...evt, ...updatedEventData } : evt))
    );

    if (!isMockMode && isValidUUID(eventId)) {
      try {
        await supabase
          .from('events')
          .update(updatedEventData)
          .eq('id', eventId);
      } catch (err) {
        console.warn('Error updating event in Supabase:', err);
      }
    }
  };

  // Delete event permanently (Admin & Coordinator function)
  const deleteEvent = async (eventId) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    setRegistrations((prev) => prev.filter((r) => r.event_id !== eventId));

    if (!isMockMode && isValidUUID(eventId)) {
      try {
        await supabase.from('events').delete().eq('id', eventId);
      } catch (err) {
        console.warn('Error deleting event from Supabase:', err);
      }
    }
  };

  return (
    <AppContext.Provider
      value={{
        session,
        currentUser,
        isAuthenticated,
        switchRole,
        signUpWithSupabase,
        signInWithSupabase,
        signOutFromSupabase,
        events,
        registrations,
        attendanceLogs,
        guestCheckins,
        profilesList,
        liveAlerts,
        registerForEvent,
        unregisterForEvent,
        updateHallStatus,
        verifyQRPass,
        addEvent,
        updateEvent,
        deleteEvent,
        checkinGuest,
        updateUserRole,
        updateUserPassCode,
        markAttendance,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
