import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { alpacaService } from '@/src/services/alpaca-service';
import type {
  CancelTradeRequest,
  CancelTradeResponse
} from '@/src/types/trading';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as CancelTradeResponse,
        { status: 401 }
      );
    }

    const { tradeId } = await req.json() as CancelTradeRequest;

    if (!tradeId) {
      return NextResponse.json(
        { success: false, error: 'Trade ID is required' } as CancelTradeResponse,
        { status: 400 }
      );
    }

    // Fetch the trade
    const { data: trade, error: tradeError } = await supabase
      .from('simulated_trades')
      .select('*, research_sessions!inner(user_id)')
      .eq('id', tradeId)
      .single();

    if (tradeError || !trade) {
      return NextResponse.json(
        { success: false, error: 'Trade not found' } as CancelTradeResponse,
        { status: 404 }
      );
    }

    // Verify user owns the trade
    if (trade.research_sessions?.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as CancelTradeResponse,
        { status: 403 }
      );
    }

    // Cancel Alpaca order if it exists and is pending
    if (trade.alpaca_order_id && trade.status === 'pending') {
      try {
        await alpacaService.cancelOrder(trade.alpaca_order_id);
      } catch (alpacaError) {
        console.error('Failed to cancel Alpaca order:', alpacaError);
        // Continue to update local status even if Alpaca cancel fails
      }
    }

    // Update trade status
    const { error: updateError } = await supabase
      .from('simulated_trades')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to cancel trade' } as CancelTradeResponse,
        { status: 500 }
      );
    }

    revalidatePath(`/dashboard/research/${trade.session_id}`);

    return NextResponse.json({
      success: true,
      message: 'Trade cancelled successfully',
    } as CancelTradeResponse);

  } catch (error) {
    console.error('Cancel trade error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel trade'
      } as CancelTradeResponse,
      { status: 500 }
    );
  }
}
