// src/lib/api.js
// Supabase client plus every query the app makes. Nothing passes a user id —
// RLS derives it from the session server-side.
//
// Note that entries are attributed to a *member row*, not an account. That's
// what lets you log a slip against your partner before he's ever signed in.

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const signOut = () => supabase.auth.signOut()

/* ---------------------------------------------------------------- auth --- */

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
  })
  if (error) throw error
}

// A real session with a real auth.uid(), just without an email behind it.
// The jar code is what decides which jar this session can reach.
export async function signInAnonymously() {
  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data
}

export const isAnonymous = (user) => Boolean(user?.is_anonymous)

// Look up a jar by code and see who's in it, before joining.
export async function peekJar(code) {
  const { data, error } = await supabase.rpc('peek_jar', { p_code: code.trim() })
  if (error) throw error
  return data
}

// Take a named slot in that jar. This is the code-as-login step.
export async function claimSlot(code, memberId, name) {
  const { data, error } = await supabase.rpc('claim_slot', {
    p_code: code.trim(), p_member: memberId, p_name: name,
  })
  if (error) throw error
  return data
}

/* ---------------------------------------------------------------- jars --- */

// Every jar this account is in, each with its full roster — so the switcher
// can label them "You & Sam" rather than by an opaque code.
export async function myJars() {
  const { data: mine, error } = await supabase
    .from('jar_members')
    .select('jar_id, jars(id, code, currency, fine)')
    .not('user_id', 'is', null)
    .order('joined_at')
  if (error) throw error
  if (!mine.length) return []

  const ids = mine.map((r) => r.jar_id)
  const { data: people, error: e2 } = await supabase
    .from('jar_members')
    .select('jar_id, id, user_id, display_name')
    .in('jar_id', ids)
    .order('joined_at')
  if (e2) throw e2

  return mine
    .filter((r) => r.jars)
    .map((r) => ({
      jarId: r.jar_id,
      code: r.jars.code,
      currency: r.jars.currency,
      fine: Number(r.jars.fine),
      people: people.filter((p) => p.jar_id === r.jar_id),
    }))
}

export async function createJar(name, partnerName, currency, fine) {
  const { data, error } = await supabase.rpc('create_jar', {
    p_name: name,
    p_partner: partnerName,
    p_currency: currency,
    p_fine: fine,
  })
  if (error) throw error
  return data
}

export async function joinJar(code, name) {
  const { data, error } = await supabase.rpc('join_jar', {
    p_code: code,
    p_name: name,
  })
  if (error) throw error
  return data
}

export async function leaveJar(jarId) {
  const { error } = await supabase.rpc('leave_jar', { p_jar: jarId })
  if (error) throw error
}

export async function getJar(jarId) {
  const { data, error } = await supabase
    .from('jars')
    .select('id, code, currency, fine')
    .eq('id', jarId)
    .single()
  if (error) throw error
  return data
}

export async function updateJar(jarId, patch) {
  const { error } = await supabase.from('jars').update(patch).eq('id', jarId)
  if (error) throw error
}

/* ------------------------------------------------------------- people --- */

export async function getMembers(jarId) {
  const { data, error } = await supabase
    .from('jar_members')
    .select('id, user_id, display_name, joined_at')
    .eq('jar_id', jarId)
    .order('joined_at')
  if (error) throw error
  return data
}

// Adds someone who hasn't signed in yet. They can claim the row later with
// the jar code, and everything logged against them comes with it.
export async function addPerson(jarId, name) {
  const { error } = await supabase
    .from('jar_members')
    .insert({ jar_id: jarId, user_id: null, display_name: name })
  if (error) throw error
}

export async function renamePerson(memberId, name) {
  const { error } = await supabase
    .from('jar_members')
    .update({ display_name: name })
    .eq('id', memberId)
  if (error) throw error
}

/* ------------------------------------------------------------- entries --- */

export async function getEntries(jarId) {
  const { data, error } = await supabase
    .from('entries')
    .select('id, said_by, logged_by, target, text, amount, created_at')
    .eq('jar_id', jarId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((e) => ({ ...e, amount: Number(e.amount) }))
}

// saidBy is a jar_members.id — yours or your partner's, claimed or not.
export async function addEntry(jarId, { saidBy, target, text, amount }) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('entries').insert({
    jar_id: jarId,
    said_by: saidBy,
    logged_by: user.id,
    target,
    text,
    amount,
  })
  if (error) throw error
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw error
}

/* ------------------------------------------------------------ cashouts --- */

export async function getCashouts(jarId) {
  const { data, error } = await supabase
    .from('cashouts')
    .select('id, note, amount, created_at')
    .eq('jar_id', jarId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((c) => ({ ...c, amount: Number(c.amount) }))
}

export async function addCashout(jarId, note, amount) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('cashouts')
    .insert({ jar_id: jarId, note, amount, created_by: user.id })
  if (error) throw error
}

/* ------------------------------------------------------------ realtime --- */

export function watchJar(jarId, onChange) {
  const channel = supabase.channel(`jar:${jarId}`)
  for (const table of ['entries', 'cashouts', 'jars', 'jar_members']) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: table === 'jars' ? `id=eq.${jarId}` : `jar_id=eq.${jarId}`,
      },
      onChange
    )
  }
  channel.subscribe()
  return () => supabase.removeChannel(channel)
}
