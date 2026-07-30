'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)
  if (error) { redirect('/login?error=Invalid login credentials') }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const name = formData.get('name') as string

  const { error } = await supabase.auth.signUp({
    ...data,
    options: {
      data: {
        full_name: name,
      }
    }
  })
  if (error) { redirect('/signup?error=Could not authenticate user') }
  revalidatePath('/', 'layout')
  redirect('/login?message=Check your email to confirm your account before logging in.')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  })

  if (error) {
    redirect('/forgot-password?error=Could not send reset password email')
  }

  redirect('/forgot-password?message=Check your email for the password reset link')
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const supabase = await createClient()
  
  const { error } = await supabase.auth.updateUser({
    password: password
  })

  if (error) {
    redirect('/reset-password?error=Could not update password')
  }

  redirect('/login?message=Password updated successfully, you can now log in')
}
