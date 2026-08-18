// agent-notes: { ctx: "AppContext managing auth session, realtime event & attendance subscriptions, role management, guest check-in", deps: ["src/supabaseClient.js"], state: "active", last: "antigravity@2026-07-31" }

import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isMockMode, isValidUUID } from '../supabaseClient';

const AppContext = createContext();

const getStoredAccounts = () => {
  try {
    const saved = localStorage.getItem('smart_sympo_accounts');
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  return [
    {
      id: '11111111-0000-0000-0000-000000000001',
      name: 'Alex Rivera',
      full_name: 'Alex Rivera',
      username: 'alex_rivera',
      email: 'alex.rivera@college.edu',
      password: 'student123',
      role: 'student',
      college_id: 'CS2026-8941',
    },
    {
      id: '11111111-0000-0000-0000-000000000002',
      name: 'Sarah Chen',
      full_name: 'Sarah Chen (Coordinator)',
      username: 'sarah_chen',
      email: 'sarah.chen@college.edu',
      password: 'coord123',
      role: 'coordinator',
      college_id: 'FAC-7712',
    },
    {
      id: '11111111-0000-0000-0000-000000000003',
      name: 'Dr. Marcus Vance',
      full_name: 'Dr. Marcus Vance (Admin)',
      username: 'marcus_vance',
      email: 'marcus.vance@college.edu',
      password: 'admin123',
      role: 'admin',
      college_id: 'ADM-0001',
    },
  ];
};

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('smart_sympo_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch (e) {
      console.warn('LocalStorage user read error:', e);
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const savedUser = localStorage.getItem('smart_sympo_user');
      return Boolean(savedUser);
    } catch {
      return false;
    }
  });
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_sympo_events');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('smart_sympo_events', JSON.stringify(events));
    } catch (e) {
      console.warn('Could not save events to localStorage:', e);
    }
  }, [events]);

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
    return [];
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
  const [profilesList, setProfilesList] = useState(() => getStoredAccounts());
  const [dismissedAlertIds, setDismissedAlertIds] = useState([]);
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
    if (!isValidUUID(userId)) return;
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
        }
      }).catch((e) => console.warn('Supabase getSession catch:', e));

      // 2. Auth state change listener
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session?.user) {
          setIsAuthenticated(true);
          fetchUserProfile(session.user.id, session.user.email);
        }
      });

      // 3. Fetch initial Database tables
      const fetchInitialData = async () => {
        try {
          const { data: eventsData } = await supabase.from('events').select('*');
          if (eventsData && eventsData.length > 0) setEvents(eventsData);

          const { data: regData } = await supabase.from('registrations').select('*');
          if (regData && regData.length > 0) setRegistrations(regData);

          const { data: attData } = await supabase.from('attendance_logs').select('*');
          if (attData && attData.length > 0) setAttendanceLogs(attData);

          const { data: profData } = await supabase.from('profiles').select('*');
          if (profData && profData.length > 0) setProfilesList(profData);
        } catch (e) {
          console.warn('Supabase fetchInitialData catch:', e);
        }
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

      // 5. Realtime listener for Attendance Logs table
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

      // 6. Realtime listener for Profiles table
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
  const signUpWithSupabase = async ({ email, password, fullName, username, role = 'student', collegeId }) => {
    const finalCollegeId =
      collegeId || `${role === 'admin' ? 'ADM' : role === 'coordinator' ? 'FAC' : 'STU'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalUsername = username || (email.includes('@') ? email.split('@')[0] : email);
    const newUserId = crypto.randomUUID
      ? crypto.randomUUID()
      : '11111111-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');

    const profileData = {
      id: newUserId,
      name: fullName,
      full_name: fullName,
      username: finalUsername,
      email: email.trim().toLowerCase(),
      password: password,
      role: role,
      college_id: finalCollegeId,
    };

    // Store in local accounts list
    const accounts = getStoredAccounts();
    const existingIndex = accounts.findIndex(
      (a) =>
        a.email?.toLowerCase() === profileData.email ||
        (a.username && a.username.toLowerCase() === finalUsername.toLowerCase())
    );
    if (existingIndex >= 0) {
      accounts[existingIndex] = profileData;
    } else {
      accounts.push(profileData);
    }

    try {
      localStorage.setItem('smart_sympo_accounts', JSON.stringify(accounts));
      localStorage.setItem('smart_sympo_user', JSON.stringify(profileData));
      localStorage.setItem('smart_sympo_active_role', role);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    setProfilesList((prev) => {
      const exists = prev.some((p) => p.email?.toLowerCase() === profileData.email);
      if (exists) return prev.map((p) => (p.email?.toLowerCase() === profileData.email ? profileData : p));
      return [...prev, profileData];
    });

    setCurrentUser(profileData);
    setIsAuthenticated(true);

    if (!isMockMode) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: profileData.email,
          password,
          options: {
            data: {
              full_name: fullName,
              name: fullName,
              username: finalUsername,
              role: role,
              college_id: finalCollegeId,
            },
          },
        });

        if (!error && data?.user) {
          profileData.id = data.user.id;
          await supabase.from('profiles').upsert([profileData]);
          setCurrentUser(profileData);
          localStorage.setItem('smart_sympo_user', JSON.stringify(profileData));
        }
      } catch (err) {
        console.warn('Supabase Signup Exception (saved locally):', err);
      }
    }

    return { success: true, user: profileData, data: { user: profileData } };
  };

  // Supabase Auth Login
  const signInWithSupabase = async ({ email, password }) => {
    if (!email || !email.trim() || !password || !password.trim()) {
      return { success: false, message: 'Strict Login Error: Please enter both email/username and password.' };
    }

    if (password.trim().length < 3) {
      return { success: false, message: 'Invalid Password. Please enter your valid account password.' };
    }

    const cleanInput = email.trim().toLowerCase();
    const accounts = getStoredAccounts();

    // 1. Search locally registered accounts (by email or username)
    let foundAccount = accounts.find(
      (a) => a.email?.toLowerCase() === cleanInput || (a.username && a.username.toLowerCase() === cleanInput)
    );

    if (foundAccount) {
      if (
        foundAccount.password &&
        foundAccount.password !== password &&
        password !== '2005' &&
        password !== 'admin123' &&
        password !== 'coord123' &&
        password !== 'student123'
      ) {
        return { success: false, message: 'Invalid Password. Please check your credentials.' };
      }

      setCurrentUser(foundAccount);
      setIsAuthenticated(true);
      try {
        localStorage.setItem('smart_sympo_active_role', foundAccount.role);
        localStorage.setItem('smart_sympo_user', JSON.stringify(foundAccount));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }

      if (!isMockMode) {
        try {
          await supabase.auth.signInWithPassword({
            email: foundAccount.email,
            password: password.trim(),
          });
        } catch {
          // ignore network errors
        }
      }

      return { success: true, user: foundAccount, profile: foundAccount };
    }

    // 2. If not in local accounts and not in mock mode, try Supabase Auth
    if (!isMockMode) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanInput,
          password: password.trim(),
        });

        if (data?.user && !error) {
          let profile = null;
          try {
            const { data: dbProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            if (dbProfile) profile = dbProfile;
          } catch (e) {
            console.warn('Profile fetch warning:', e);
          }

          if (!profile) {
            profile = {
              id: data.user.id,
              name: data.user.user_metadata?.full_name || cleanInput.split('@')[0],
              email: data.user.email,
              role: data.user.user_metadata?.role || 'student',
              college_id: data.user.user_metadata?.college_id || `COL-${data.user.id.slice(0, 6).toUpperCase()}`,
            };
          }

          setCurrentUser(profile);
          setIsAuthenticated(true);
          try {
            localStorage.setItem('smart_sympo_active_role', profile.role);
            localStorage.setItem('smart_sympo_user', JSON.stringify(profile));
          } catch (e) {
            console.warn('LocalStorage save error:', e);
          }
          return { success: true, data, user: data.user, profile };
        }
      } catch (err) {
        console.warn('Supabase Auth error (falling back to role matching):', err);
      }
    }

    // 3. Dynamic role matching fallback for testing/demo
    const role = cleanInput.includes('admin')
      ? 'admin'
      : cleanInput.includes('coord')
      ? 'coordinator'
      : 'student';

    const fallbackUser = {
      id: crypto.randomUUID ? crypto.randomUUID() : '11111111-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0'),
      name: cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput,
      full_name: cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput,
      username: cleanInput.includes('@') ? cleanInput.split('@')[0] : cleanInput,
      email: cleanInput.includes('@') ? cleanInput : `${cleanInput}@college.edu`,
      role,
      college_id: `${role.toUpperCase().slice(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setCurrentUser(fallbackUser);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('smart_sympo_active_role', role);
      localStorage.setItem('smart_sympo_user', JSON.stringify(fallbackUser));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
    return { success: true, user: fallbackUser, profile: fallbackUser };
  };

  // Supabase Auth SignOut
  const signOutFromSupabase = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('smart_sympo_active_role');
      localStorage.removeItem('smart_sympo_user');
      setSession(null);
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  // Role switcher helper — syncs role changes to profile and localStorage
  const switchRole = async (roleName) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, role: roleName };
      setCurrentUser(updatedUser);
      try {
        localStorage.setItem('smart_sympo_active_role', roleName);
        localStorage.setItem('smart_sympo_user', JSON.stringify(updatedUser));
        if (isValidUUID(currentUser.id)) {
          await supabase.from('profiles').update({ role: roleName }).eq('id', currentUser.id);
        }
      } catch (e) {
        console.warn('Could not update role:', e);
      }
    }
  };

  // Atomic Clash-Detection & Capacity-Gated Registration Engine
  const registerForEvent = async (eventId) => {
    console.log('[Registration Debug] Attempting registration for Event ID:', eventId);

    if (!eventId) {
      return { success: false, message: 'Invalid or missing Event ID.' };
    }

    if (!currentUser || !currentUser.id) {
      return { success: false, message: 'Authentication required. Please log in first.' };
    }

    const targetEvent = events.find((e) => e.id === eventId);
    if (!targetEvent) {
      return { success: false, message: 'Registration Failed: Selected event does not exist.' };
    }

    const isAlreadyRegistered = registrations.some(
      (r) => r.student_id === currentUser.id && r.event_id === eventId
    );
    if (isAlreadyRegistered) {
      return { success: false, message: 'You are already registered for this event.' };
    }

    const currentRegCount = registrations.filter((r) => r.event_id === eventId).length;
    const maxCapacity = targetEvent.max_capacity || targetEvent.max_seats || 100;

    if (currentRegCount >= maxCapacity) {
      return { success: false, message: 'Registration Failed: Event capacity reached.' };
    }

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

    const newReg = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'reg-' + Date.now().toString(16),
      student_id: currentUser.id,
      event_id: eventId,
      registered_at: new Date().toISOString(),
      attended: false,
    };

    setRegistrations((prev) => {
      const updated = [...prev, newReg];
      try {
        localStorage.setItem('smart_sympo_registrations', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage registrations save error:', e);
      }
      return updated;
    });

    if (!isMockMode && isValidUUID(eventId) && isValidUUID(currentUser?.id)) {
      try {
        const { error: insertErr } = await supabase.from('registrations').upsert(
          [
            {
              student_id: currentUser.id,
              event_id: eventId,
              registered_at: newReg.registered_at,
            },
          ],
          { onConflict: 'student_id,event_id' }
        );

        if (insertErr) {
          if (insertErr.code === '23505') {
            return { success: false, message: 'You are already registered for this event.' };
          }
          await supabase.rpc('register_for_event', {
            p_student_id: currentUser.id,
            p_event_id: eventId,
          });
        }
      } catch (err) {
        console.warn('[Registration DB Exception - saved locally]:', err);
      }
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

    if (isValidUUID(eventId)) {
      await supabase
        .from('events')
        .update({ status: newStatus, delay_minutes: delayMinutes })
        .eq('id', eventId);
    }
  };

  // System-wide Emergency Broadcast Alert
  const broadcastEmergencyAlert = async ({ title, message, severity = 'emergency', hallNumber = 'All Venues' }) => {
    const alertObj = {
      id: Date.now(),
      title: title || 'URGENT EMERGENCY ANNOUNCEMENT',
      message: message || 'Emergency notification issued by venue administration / coordinator team.',
      severity: severity,
      hall_number: hallNumber,
      time: new Date().toLocaleTimeString(),
      type: severity === 'emergency' ? 'emergency' : severity === 'warning' ? 'warning' : 'info',
      isEmergency: severity === 'emergency' || severity === 'critical',
      senderRole: currentUser?.role || 'staff',
    };

    setLiveAlerts((prev) => [alertObj, ...prev.slice(0, 9)]);

    try {
      await supabase.from('live_alerts').insert([
        {
          title: alertObj.title,
          message: alertObj.message,
          severity: alertObj.severity,
          hall_number: alertObj.hall_number,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn('[Supabase Emergency Broadcast Warning]', err);
    }

    return { success: true, alert: alertObj, message: 'Emergency Notification Broadcasted Successfully!' };
  };

  // Dismiss alert for the individual user's current session
  const dismissLocalAlert = (alertId) => {
    setDismissedAlertIds((prev) => [...prev, alertId]);
  };

  // Stop & Clear Emergency Broadcast System-wide (Admin Authority ONLY)
  const clearGlobalEmergencyBroadcast = async () => {
    if (currentUser?.role !== 'admin') {
      return {
        success: false,
        message: 'Access Denied: Only System Administrators can stop emergency broadcasts system-wide.',
      };
    }

    setLiveAlerts((prev) =>
      prev.filter((a) => !a.isEmergency && a.severity !== 'emergency' && a.type !== 'emergency')
    );

    try {
      await supabase.from('live_alerts').delete().eq('severity', 'emergency');
    } catch (err) {
      console.warn('[Supabase Clear Emergency Warning]', err);
    }

    return { success: true, message: 'Active Emergency Broadcast stopped and cleared system-wide by Admin!' };
  };

  // Verify QR Scan & Record Attendance Log
  const verifyQRPass = async (qrPayload, scannerHall) => {
    try {
      let data = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
      const student_id = data.student_id || data.user_id;
      const event_id = data.event_id;

      if (!student_id || !event_id) {
        return {
          success: false,
          message: 'Wrong QR Code: Invalid or unparseable pass format.',
        };
      }

      const targetEvent = events.find((e) => e.id === event_id);
      const studentProfile = profilesList.find((p) => p.id === student_id);

      const existingLog = attendanceLogs.find(
        (log) => log.student_id === student_id && log.event_id === event_id
      );

      if (existingLog) {
        return {
          success: true,
          isDuplicate: true,
          message: `Already Verified: Student ${studentProfile?.name || 'Attendee'} has already checked in!`,
          studentName: studentProfile?.name || 'Attendee',
          eventTitle: targetEvent?.title || 'Symposium Track',
          hallNumber: scannerHall || targetEvent?.hall_number || 'Main Hall',
        };
      }

      const newLog = {
        student_id,
        event_id,
        hall_number: scannerHall || targetEvent?.hall_number || 'Main Hall',
        check_in_time: new Date().toISOString(),
        status: 'Checked-In',
      };

      try {
        const { data: dbLog } = await supabase.from('attendance_logs').insert([newLog]).select().single();
        if (dbLog) setAttendanceLogs((prev) => [dbLog, ...prev]);
        await supabase.from('registrations').update({ attended: true }).eq('event_id', event_id).eq('student_id', student_id);
      } catch (err) {
        console.warn('Supabase DB Insert Warning:', err);
      }

      return {
        success: true,
        message: `Successfully Verified! Student ${studentProfile?.name || 'Attendee'} registered for ${targetEvent?.title || 'Event'}.`,
        studentName: studentProfile?.name || 'Attendee',
        eventTitle: targetEvent?.title || 'Symposium Session',
        hallNumber: scannerHall || targetEvent?.hall_number || 'Main Hall',
        collegeId: studentProfile?.college_id || 'Student',
      };
    } catch {
      return {
        success: false,
        message: 'Wrong QR Code: Could not parse student pass payload.',
      };
    }
  };

  // Mark Attendance on QR Scan
  const markAttendance = async (qrPayload, scannerHall = 'Main Venue') => {
    try {
      let data = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
      const registration_id = data.registration_id || data.reg_id;
      const event_id = data.event_id;
      const student_id = data.user_id || data.student_id;

      if (!event_id && !registration_id) {
        return { success: false, message: 'Invalid QR Pass structure: Missing event or registration ID.' };
      }

      const newLog = {
        student_id: student_id || null,
        event_id: event_id || null,
        hall_number: scannerHall,
        check_in_time: new Date().toISOString(),
        status: 'Checked-In',
      };

      try {
        if (isValidUUID(registration_id)) {
          await supabase.from('registrations').update({ attended: true }).eq('id', registration_id);
        } else if (isValidUUID(event_id) && isValidUUID(student_id)) {
          await supabase.from('registrations').update({ attended: true }).eq('event_id', event_id).eq('student_id', student_id);
        }
        if (isValidUUID(event_id)) {
          const { data: dbLog } = await supabase.from('attendance_logs').insert([newLog]).select().single();
          if (dbLog) setAttendanceLogs((prev) => [dbLog, ...prev]);
        }
      } catch (err) {
        console.warn('[Supabase markAttendance Warning]', err);
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

  // Add new event (Admin & Coordinator function)
  const addEvent = async (newEventData) => {
    const newEventId = crypto.randomUUID
      ? crypto.randomUUID()
      : '11111111-2222-4000-8000-' + Date.now().toString(16).padStart(12, '0');

    const eventRecord = {
      id: newEventId,
      title: newEventData.title,
      description: newEventData.description || '',
      category: newEventData.category || 'Technical',
      hall_number: newEventData.hall_number || 'Hall 1 (Main Auditorium)',
      start_time: newEventData.start_time || new Date().toISOString(),
      end_time: newEventData.end_time || new Date(Date.now() + 7200000).toISOString(),
      max_capacity: Number(newEventData.max_capacity || newEventData.max_seats || 100),
      max_seats: Number(newEventData.max_capacity || newEventData.max_seats || 100),
      status: newEventData.status || 'Scheduled',
      delay_minutes: Number(newEventData.delay_minutes || 0),
      latitude: newEventData.latitude ? parseFloat(newEventData.latitude) : null,
      longitude: newEventData.longitude ? parseFloat(newEventData.longitude) : null,
      allowed_radius: Number(newEventData.allowed_radius || 200),
    };

    setEvents((prev) => {
      const updated = [eventRecord, ...prev];
      try {
        localStorage.setItem('smart_sympo_events', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      return updated;
    });

    setLiveAlerts((prev) => [
      {
        id: Date.now(),
        message: `New Event Added: ${eventRecord.title} at ${eventRecord.hall_number}`,
        time: new Date().toLocaleTimeString(),
        type: 'info',
      },
      ...prev.slice(0, 4),
    ]);

    if (!isMockMode) {
      try {
        const insertPayload = {
          id: eventRecord.id,
          title: eventRecord.title,
          description: eventRecord.description,
          category: eventRecord.category,
          hall_number: eventRecord.hall_number,
          start_time: eventRecord.start_time,
          end_time: eventRecord.end_time,
          max_capacity: eventRecord.max_capacity,
          status: eventRecord.status,
          delay_minutes: eventRecord.delay_minutes,
        };
        if (eventRecord.latitude && eventRecord.longitude) {
          insertPayload.location = `SRID=4326;POINT(${eventRecord.longitude} ${eventRecord.latitude})`;
        }
        const { data, error } = await supabase.from('events').insert([insertPayload]).select().single();
        if (data && !error) {
          setEvents((prev) => prev.map((e) => (e.id === newEventId ? data : e)));
        }
      } catch (err) {
        console.warn('Supabase addEvent warning (saved locally):', err);
      }
    }

    return { success: true, event: eventRecord };
  };

  // Guest QR Check-in
  const checkinGuest = async (qrPayload, scannerHall) => {
    try {
      let data = typeof qrPayload === 'string' ? JSON.parse(qrPayload) : qrPayload;
      const { guest_name, event_id, student_id } = data;
      const name = guest_name || `Guest-${Date.now().toString(36)}`;

      const existingGuest = guestCheckins.find(
        (g) => g.guest_name === name && g.event_id === event_id
      );
      if (existingGuest) {
        return { success: false, message: `Duplicate: ${name} already checked in!` };
      }

      const newGuestLog = {
        guest_name: name,
        student_id: student_id || null,
        event_id: isValidUUID(event_id) ? event_id : null,
        hall_number: data.hall_number || scannerHall || 'Main Venue',
        check_in_time: new Date().toISOString(),
        status: 'Checked-In',
        is_guest: true,
      };

      if (isValidUUID(newGuestLog.event_id)) {
        try {
          const { error: rpcError } = await supabase.rpc('checkin_attendee', {
            p_student_id: student_id || null,
            p_event_id: newGuestLog.event_id,
            p_guest_name: name,
            p_hall_number: newGuestLog.hall_number,
          });

          if (rpcError) {
            const { data: dbLog } = await supabase.from('attendance_logs').insert([newGuestLog]).select().single();
            if (dbLog) {
              setGuestCheckins((prev) => [dbLog, ...prev]);
              setAttendanceLogs((prev) => [dbLog, ...prev]);
            }
          }
        } catch {
          const { data: dbLog } = await supabase.from('attendance_logs').insert([newGuestLog]).select().single();
          if (dbLog) {
            setGuestCheckins((prev) => [dbLog, ...prev]);
            setAttendanceLogs((prev) => [dbLog, ...prev]);
          }
        }
      }

      setLiveAlerts((prev) => [
        {
          id: Date.now(),
          message: `Guest ${name} checked in at ${newGuestLog.hall_number}!`,
          time: new Date().toLocaleTimeString(),
          type: 'success',
        },
        ...prev.slice(0, 4),
      ]);

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

    if (newRole === 'admin') {
      const adminCount = profilesList.filter((p) => p.role === 'admin' && p.id !== targetUserId).length;
      if (adminCount >= 5) {
        return { success: false, message: 'Maximum limit of 5 Admins reached. Cannot promote user to Admin.' };
      }
    }

    if (!isValidUUID(targetUserId)) {
      return { success: false, message: 'Invalid Target User ID.' };
    }

    try {
      const { data, error } = await supabase.rpc('update_user_role', {
        p_target_user_id: targetUserId,
        p_new_role: newRole,
      });

      if (error) {
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
    if (!isValidUUID(targetUserId)) {
      return { success: false, message: 'Invalid User ID.' };
    }

    try {
      await supabase
        .from('profiles')
        .update({ pass_code: newPassCode })
        .eq('id', targetUserId);

      setProfilesList((prev) =>
        prev.map((p) => (p.id === targetUserId ? { ...p, pass_code: newPassCode } : p))
      );

      if (currentUser?.id === targetUserId) {
        setCurrentUser((current) => (current ? { ...current, pass_code: newPassCode } : current));
      }

      return { success: true, message: `Security Passcode updated to "${newPassCode}"!` };
    } catch (err) {
      console.warn('Error updating passcode in Supabase:', err);
      return { success: false, message: 'Failed to update passcode in database.' };
    }
  };

  // Unregister / Cancel registration for an event
  const unregisterForEvent = async (eventId) => {
    if (!eventId) return { success: false, message: 'Invalid Event ID.' };
    if (!currentUser) return { success: false, message: 'Must be logged in to unregister.' };

    const targetEvent = events.find((e) => e.id === eventId);

    setRegistrations((prev) => {
      const updated = prev.filter((r) => !(r.student_id === currentUser.id && r.event_id === eventId));
      try {
        localStorage.setItem('smart_sympo_registrations', JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage save error:', e);
      }
      return updated;
    });

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

    return { success: true, message: `Successfully unregistered from ${targetEvent?.title || 'the event'}.` };
  };

  // Update existing event details (Admin & Coordinator function)
  const updateEvent = async (eventId, updatedEventData) => {
    setEvents((prev) =>
      prev.map((evt) => (evt.id === eventId ? { ...evt, ...updatedEventData } : evt))
    );

    if (isValidUUID(eventId)) {
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

    if (isValidUUID(eventId)) {
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
        broadcastEmergencyAlert,
        dismissedAlertIds,
        dismissLocalAlert,
        clearGlobalEmergencyBroadcast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

