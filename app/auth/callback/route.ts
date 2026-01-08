import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_type = searchParams.get('token_type')
  const access_token = searchParams.get('access_token')
  const refresh_token = searchParams.get('refresh_token')

  const supabase = await createClient()

  // Handle OAuth callback (GitHub, Google)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Handle email magic link / OTP
  if (token_type === 'bearer' && access_token) {
    await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    })
  }

  return NextResponse.redirect(new URL('/dashboard', origin))
}
