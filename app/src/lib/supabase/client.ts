'use client'

import { createBrowserClient } from '@supabase/ssr'
import { credencialesSupabase } from './entorno'

export const createClient = () => createBrowserClient(...credencialesSupabase())
