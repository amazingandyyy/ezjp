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
        // First check if user already has a custom avatar
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();

        // Only update avatar if there isn't a custom one set
        const updates = {
          id: user.id,
          updated_at: new Date().toISOString()
        };

        if (!existingProfile?.avatar_url) {
          updates.avatar_url = userData.user_metadata.avatar_url;
        }

        // Update or create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(updates, {
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