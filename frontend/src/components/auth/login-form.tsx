import { ArrowRight, Box, Lock, User } from 'lucide-react'
import { useEffect, useRef, type FormEvent } from 'react'

import { APP_FULL_NAME } from '@/constants/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginFormProps = {
  isSubmitting?: boolean
  onSubmit?: (values: {
    username: string
    password: string
  }) => boolean | void | Promise<boolean | void>
}

export function LoginForm({ isSubmitting = false, onSubmit }: LoginFormProps) {
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const focusPasswordAfterSubmit = useRef(false)

  useEffect(() => {
    usernameRef.current?.focus()
  }, [])

  useEffect(() => {
    if (isSubmitting || !focusPasswordAfterSubmit.current) return
    focusPasswordAfterSubmit.current = false
    const passwordInput = passwordRef.current
    if (!passwordInput) return
    passwordInput.value = ''
    passwordInput.focus()
  }, [isSubmitting])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    let succeeded = false
    try {
      const result = await onSubmit?.({
        username: String(formData.get('username') ?? ''),
        password: String(formData.get('password') ?? ''),
      })
      succeeded = result !== false
    } catch {
      succeeded = false
    }

    if (!succeeded) {
      if (passwordRef.current) {
        passwordRef.current.value = ''
      }
      focusPasswordAfterSubmit.current = true
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <header className="text-center lg:text-left">
        <div className="mb-6 inline-flex items-center gap-2">
          <div className="rounded-lg bg-primary p-2 text-primary-foreground">
            <Box className="size-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-primary">
            {APP_FULL_NAME}
          </span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Selamat datang kembali</h1>
        <p className="mt-1 text-sm text-muted-foreground">Masuk ke akun Anda</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <User className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              ref={usernameRef}
              id="username"
              name="username"
              forceUppercase={false}
              required
              disabled={isSubmitting}
              className="pl-10"
              placeholder="Username Anda"
              autoComplete="username"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              forceUppercase={false}
              required
              disabled={isSubmitting}
              className="pl-10"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Sedang masuk...' : 'Masuk'}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </form>
    </div>
  )
}
