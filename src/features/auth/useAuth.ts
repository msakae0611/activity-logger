import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase/client'
import { db } from '../../lib/db/db'

async function seedLocalDb(userId: string) {
  const [cats, recs, dashes] = await Promise.all([
    supabase.from('categories').select('*').eq('user_id', userId),
    supabase.from('records').select('*').eq('user_id', userId),
    supabase.from('dashboards').select('*').eq('user_id', userId),
  ])
  if (cats.data?.length) await db.categories.bulkPut(cats.data)
  if (recs.data?.length) await db.records.bulkPut(recs.data.map(r => ({ ...r, synced: true })))
  if (dashes.data?.length) await db.dashboards.bulkPut(dashes.data)
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) await seedLocalDb(data.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) await seedLocalDb(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
