import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { IconMattermost } from '@/assets/brand-icons'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Please enter your password')
    .min(7, 'Password must be at least 7 characters long'),
})

// interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
//   redirectTo?: string
// }

export function UserAuthForm() {
  // const [isLoading, setIsLoading] = useState(false)
  // const navigate = useNavigate()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // async function onSubmit(data: z.infer<typeof formSchema>) {
  //   setIsLoading(true)

  //   try {
  //     // Use PocketBase authentication
  //     const { user, token, success, error } = await auth.loginWithPassword(
  //       data.email,
  //       data.password
  //     )

  //     if (success && user && token) {
  //       // Convert PocketBase user to the format expected by the auth store

  //       // Set user and access token in the auth store
  //       pb.authStore.save(token, user)
  //       // pb.authStore.s
  //       toast.success(`Welcome back, ${user.name || user.email}!`)

  //       // Redirect to the stored location or default to dashboard
  //       const targetPath = redirectTo || '/'
  //       navigate({ to: targetPath, replace: true })
  //     } else {
  //       // Handle authentication failure
  //       toast.error(error || 'Login failed')
  //       // console.error('Login failed:', error)
  //     }
  //   } catch (error) {
  //     // Handle any unexpected errors
  //     const errorMessage =
  //       error instanceof Error ? error.message : 'An unexpected error occurred'
  //     toast.error(errorMessage)
  //     // console.error('Login error:', error)
  //   } finally {
  //     setIsLoading(false)
  //   }
  // }

  const handleMattermostLogin = () => {
    // Redirect to Mattermost OAuth endpoint
    const mattermostOAuthUrl = `${import.meta.env.VITE_POCKETBASE_URL}/api/auth/mattermost/login`
    window.location.href = mattermostOAuthUrl
  }

  return (
    <Form {...form}>
      <div className='flex'>
        <Button
          className='grow'
          // variant='outline'
          type='button'
          // disabled={isLoading}
          onClick={handleMattermostLogin}
        >
          <IconMattermost className='h-4 w-4' fill='#ABC5FFFF' /> Mattermost
        </Button>
      </div>
      <div className='relative my-4'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        {/* <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-background text-muted-foreground px-2'>
            Or continue with
          </span>
        </div> */}
      </div>
      {/* <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='text-muted-foreground absolute end-0 -top-0.5 text-sm font-medium hover:opacity-75'
              >
                Forgot password?
              </Link>
            </FormItem>
          )}
        />
        <Button variant='outline' className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          Sign in
        </Button>
      </form> */}
    </Form>
  )
}
