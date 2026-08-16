import { supabase } from './supabaseClient'

const UNCATEGORIZED_NAME = '未分類'
const UNCATEGORIZED_SORT_ORDER = 9999

async function ensureUncategorizedCategory(userId) {
  const { data: existing, error: selectError } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', UNCATEGORIZED_NAME)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) return existing.id

  const { data: created, error: insertError } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: UNCATEGORIZED_NAME, sort_order: UNCATEGORIZED_SORT_ORDER })
    .select('id')
    .single()

  if (insertError) throw insertError
  return created.id
}

// Makes sure a securities row exists for this ticker so a transaction can
// always resolve a category. If the ticker has never been seen before, it's
// registered under "未分類" — the user can reassign it later in 股票管理
// without needing to fix anything on the transaction itself.
export async function ensureSecurity(userId, ticker) {
  const { data: existing, error: selectError } = await supabase
    .from('securities')
    .select('id, category_id')
    .eq('user_id', userId)
    .eq('ticker', ticker)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing) return existing

  const categoryId = await ensureUncategorizedCategory(userId)
  const { data: created, error: insertError } = await supabase
    .from('securities')
    .insert({ user_id: userId, ticker, category_id: categoryId })
    .select('id, category_id')
    .single()

  if (insertError) throw insertError
  return created
}
