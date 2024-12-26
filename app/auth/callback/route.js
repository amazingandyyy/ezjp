import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Exchange the code for a session
    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!authError && user) {
      // Get user metadata which includes the avatar_url from Google
      const { data: { user: userData }, error: userError } = await supabase.auth.getUser();
      
      if (!userError && userData?.user_metadata?.avatar_url) {
        // Update or create profile with avatar_url
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            avatar_url: userData.user_metadata.avatar_url,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }
      }
    }
  }

  // Redirect to the home page
  return NextResponse.redirect(requestUrl.origin);
} 