import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://wziprddrflgpzankofad.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6aXByZGRyZmxncHphbmtvZmFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NDMyNjMsImV4cCI6MjA5NDExOTI2M30.hWrdRYH6M6Voii8uo3MmJB8BKNZOOWRhjls7DFg4pcs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
})
