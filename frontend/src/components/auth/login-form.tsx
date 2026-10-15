import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

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
  const formRef = useRef<HTMLFormElement>(null)
  const focusPasswordAfterSubmit = useRef(false)
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)

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

  function handlePasswordKey(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState('CapsLock'))
  }

  function replayShake() {
    const form = formRef.current
    if (!form) return
    form.classList.remove('auth-shake')
    // Force a reflow so the animation restarts on repeated failures.
    void form.offsetWidth
    form.classList.add('auth-shake')
  }

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
      replayShake()
    }
  }

  return (
    <div className="w-full max-w-[380px]">
      <header className="auth-rise">
        <h1 className="text-[2rem] leading-tight font-bold tracking-[-0.025em] text-foreground">Masuk</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">Gunakan akun yang diberikan admin.</p>
      </header>

      <form ref={formRef} onSubmit={handleSubmit} className="mt-9 space-y-5">
        <div className="auth-rise space-y-2" style={{ animationDelay: '60ms' }}>
          <Label htmlFor="username" className="text-[13px]">
            Username
          </Label>
          <Input
            ref={usernameRef}
            id="username"
            name="username"
            forceUppercase={false}
            required
            disabled={isSubmitting}
            className="auth-input h-12 px-4 text-[15px]"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>

        <div className="auth-rise space-y-2" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[13px]">
              Password
            </Label>
            <span
              aria-live="polite"
              className={cn(
                'text-[12px] font-medium text-amber-600 transition-opacity duration-200',
                capsLock ? 'opacity-100' : 'opacity-0'
              )}
            >
              {capsLock ? 'Caps Lock aktif' : ''}
            </span>
          </div>
          <div className="relative">
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              forceUppercase={false}
              required
              disabled={isSubmitting}
              className="auth-input h-12 pr-12 pl-4 text-[15px]"
              autoComplete="current-password"
              onKeyDown={handlePasswordKey}
              onKeyUp={handlePasswordKey}
              onBlur={() => setCapsLock(false)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </div>

        <div className="auth-rise pt-2" style={{ animationDelay: '180ms' }}>
          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="group h-12 w-full rounded-lg text-[15px] font-semibold transition-[transform,background-color,box-shadow] duration-200 active:scale-[0.985]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Memeriksa…
              </>
            ) : (
              <>
                Masuk
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
