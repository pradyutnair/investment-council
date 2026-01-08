'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { DealMemo, DealStatus, DealVerdict, DealCritiques, InterrogationMessage } from '@/types/deals';

export async function getDealMemos(): Promise<DealMemo[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('deal_memos')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching deal memos:', error);
    return [];
  }
  
  return data as DealMemo[];
}

export async function getDealMemo(id: string): Promise<DealMemo | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('deal_memos')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching deal memo:', error);
    return null;
  }
  
  return data as DealMemo;
}

export async function createDealMemo(params: {
  company_name: string;
  ticker?: string;
  thesis: string;
  council_enabled?: boolean;
}): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('deal_memos')
    .insert({
      company_name: params.company_name,
      ticker: params.ticker || null,
      thesis: params.thesis,
      council_enabled: params.council_enabled ?? true,
      status: 'scouting',
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error creating deal memo:', error);
    return { error: error.message };
  }
  
  revalidatePath('/dashboard');
  return { id: data.id };
}

export async function updateDealStatus(
  id: string,
  status: DealStatus
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  
  const updates: Record<string, any> = { status };
  
  // Set timestamps based on status
  if (status === 'researching') {
    updates.research_started_at = new Date().toISOString();
  } else if (status === 'council_review') {
    updates.research_completed_at = new Date().toISOString();
  } else if (status === 'interrogation') {
    updates.council_convened_at = new Date().toISOString();
  } else if (status === 'finalized') {
    updates.finalized_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('deal_memos')
    .update(updates)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating deal status:', error);
    return { success: false };
  }
  
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/deal/${id}`);
  return { success: true };
}

export async function updateResearchReport(
  id: string,
  report: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('deal_memos')
    .update({
      research_report: report,
      research_completed_at: new Date().toISOString(),
      status: 'council_review',
    })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating research report:', error);
    return { success: false };
  }
  
  revalidatePath(`/dashboard/deal/${id}`);
  return { success: true };
}

export async function updateCritiques(
  id: string,
  critiques: DealCritiques
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('deal_memos')
    .update({
      critiques,
      council_convened_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating critiques:', error);
    return { success: false };
  }
  
  revalidatePath(`/dashboard/deal/${id}`);
  return { success: true };
}

export async function updateVerdict(
  id: string,
  verdict: DealVerdict,
  verdict_note?: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('deal_memos')
    .update({
      verdict,
      verdict_note: verdict_note || null,
      status: 'finalized',
      finalized_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) {
    console.error('Error updating verdict:', error);
    return { success: false };
  }
  
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/deal/${id}`);
  return { success: true };
}

export async function deleteDealMemo(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('deal_memos')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting deal memo:', error);
    return { success: false };
  }
  
  revalidatePath('/dashboard');
  return { success: true };
}

// Interrogation messages
export async function getInterrogationMessages(dealId: string): Promise<InterrogationMessage[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('interrogation_messages')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching interrogation messages:', error);
    return [];
  }
  
  return data as InterrogationMessage[];
}

export async function addInterrogationMessage(
  dealId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('interrogation_messages')
    .insert({
      deal_id: dealId,
      role,
      content,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Error adding interrogation message:', error);
    return { error: error.message };
  }
  
  revalidatePath(`/dashboard/deal/${dealId}`);
  return { id: data.id };
}
