import { useEffect } from 'react'
import { z } from 'zod'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '@/lib/pocketbase'

const searchSchema = z.object({
  code: z.string(),
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/oauth/callback')({
  validateSearch: searchSchema,
  component: OAuthCallback,
})

function OAuthCallback() {
  const navigate = useNavigate()
  const { code, redirect } = Route.useSearch()
  useEffect(() => {
    async function handleOAuthCallback() {
      if (!code) {
        toast.error('Invalid OAuth callback - no code provided')
        navigate({ to: '/sign-in', replace: true })
        return
      }

      try {
        // Exchange the authorization code for a PocketBase token
        const response = await fetch(
          `${import.meta.env.VITE_POCKETBASE_URL}/api/auth/exchange`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
          }
        )

        if (!response.ok) {
          throw new Error('Failed to exchange authorization code')
        }

        const data = await response.json()

        if (data.success && data.user && data.token) {
          // Set user and access token in the auth store
          pb.authStore.save(data.token, data.user)

          toast.success(`Welcome, ${data.user.name || data.user.email}!`)

          // Redirect to the dashboard
          navigate({ to: redirect ?? '/', replace: true })
        } else {
          toast.error(data.error || 'OAuth login failed')
          navigate({ to: '/sign-in', replace: true })
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'OAuth login failed'
        )
        navigate({ to: '/sign-in', replace: true })
      }
    }

    handleOAuthCallback()
  }, [code])

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='flex flex-col items-center gap-4'>
        <Loader2 className='text-primary h-8 w-8 animate-spin' />
        <p className='text-muted-foreground'>Processing OAuth login...</p>
      </div>
    </div>
  )
}
