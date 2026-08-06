// src/lib/storage.js
//
// Drop-in replacement for the artifact's window.storage API, backed by Postgres
// via Supabase. Import this once in main.jsx BEFORE rendering the app and the
// SlipJar component works unchanged.
//
//   import './lib/storage'
//
// Adds one extra method the artifact version didn't have: storage.subscribe(),
// which fires whenever the other person changes something.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const TABLE = 'jar_state'

async function get(key) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error(`No row for key "${key}"`) // matches artifact behaviour
  return { key, value: JSON.stringify(data.value), shared: true }
}

async function set(key, value) {
  // The component hands us a JSON string; store it as real jsonb so you can
  // query it later (see schema.sql for example queries).
  const parsed = typeof value === 'string' ? JSON.parse(value) : value

  const { error } = await supabase
    .from(TABLE)
    .upsert({ key, value: parsed, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) throw error
  return { key, value, shared: true }
}

async function del(key) {
  const { error } = await supabase.from(TABLE).delete().eq('key', key)
  if (error) throw error
  return { key, deleted: true, shared: true }
}

async function list(prefix = '') {
  const { data, error } = await supabase
    .from(TABLE)
    .select('key')
    .like('key', `${prefix}%`)

  if (error) throw error
  return { keys: data.map((r) => r.key), prefix, shared: true }
}

// Live updates: call this and the jar refreshes on his phone the moment you
// add a coin on yours. Returns an unsubscribe function.
function subscribe(key, onChange) {
  const channel = supabase
    .channel(`jar:${key}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `key=eq.${key}` },
      (payload) => onChange(payload.new?.value ?? null)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

window.storage = { get, set, delete: del, list, subscribe }

export default window.storage
