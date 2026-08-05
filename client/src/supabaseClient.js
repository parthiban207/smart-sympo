import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-supabase-url.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

export const isMockMode =
  supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isValidUUID = (id) =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);


// Initial Mock Seed Data for seamless offline/standalone demonstration
export const initialMockEvents = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'AI & Machine Learning Keynote',
    category: 'Technical',
    hall_number: 'Hall 1 (Main Auditorium)',
    start_time: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    max_capacity: 150,
    status: 'Scheduled',
    delay_minutes: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Algorithmic Hackathon Round 1',
    category: 'Technical',
    hall_number: 'Hall 2 (Lab A)',
    start_time: new Date(Date.now() + 1000 * 60 * 90).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 210).toISOString(),
    max_capacity: 50,
    status: 'Scheduled',
    delay_minutes: 0,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: 'UI/UX Design Masterclass',
    category: 'Non-Technical',
    hall_number: 'Hall 3 (Seminar Room B)',
    start_time: new Date(Date.now() + 1000 * 60 * 180).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 270).toISOString(),
    max_capacity: 80,
    status: 'Scheduled',
    delay_minutes: 0,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    title: 'Symposium Quiz Championship',
    category: 'Non-Technical',
    hall_number: 'Hall 4 (Mini Theater)',
    start_time: new Date(Date.now() + 1000 * 60 * 300).toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 390).toISOString(),
    max_capacity: 100,
    status: 'Scheduled',
    delay_minutes: 0,
  },
];

export const initialMockProfiles = [
  {
    id: '11111111-0000-0000-0000-000000000001',
    name: 'Alex Rivera',
    email: 'alex.rivera@college.edu',
    phone: '+1 555-0192',
    role: 'student',
    college_id: 'CS2026-8941',
  },
  {
    id: '11111111-0000-0000-0000-000000000002',
    name: 'Sarah Chen (Coordinator)',
    email: 'sarah.chen@college.edu',
    phone: '+1 555-0144',
    role: 'coordinator',
    college_id: 'FAC-7712',
  },
  {
    id: '11111111-0000-0000-0000-000000000003',
    name: 'Dr. Marcus Vance (Admin)',
    email: 'marcus.vance@college.edu',
    phone: '+1 555-0100',
    role: 'admin',
    college_id: 'ADM-0001',
  },
];
