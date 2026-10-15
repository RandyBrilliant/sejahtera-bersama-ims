import { APP_BRAND_NAME, APP_FULL_NAME } from '@/constants/brand'
import { LoginForm } from '@/components/auth/login-form'
import { MarketingPanel } from '@/components/auth/marketing-panel'
import { alert } from '@/lib/alert'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDashboardRouteForRole } from '@/types/auth'

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  ) {
    const response = (error as {
      response?: { data?: { detail?: string; message?: string }; status?: number }
    }).response
    if (response?.status === 403 && response?.data?.detail) {
      return response.data.detail
    }
    return response?.data?.detail || response?.data?.message || 'Username atau password salah.'
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Username atau password salah.'
}

export function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, user, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && user) {
      navigate(getDashboardRouteForRole(user.role), { replace: true })
    }
  }, [isLoading, navigate, user])

  return (
    <main className="flex min-h-svh w-full bg-background">
      <MarketingPanel />

      <section className="flex min-h-svh flex-1 flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="auth-rise flex items-center gap-2.5 lg:invisible">
          <span className="grid size-8 place-items-center rounded-[9px] bg-primary text-[12px] font-bold tracking-tight text-primary-foreground">
            SB
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-foreground">{APP_BRAND_NAME}</span>
        </div>

        <div className="flex flex-1 items-center justify-center py-12">
          <LoginForm
            isSubmitting={isSubmitting}
            onSubmit={async (values) => {
              setIsSubmitting(true)
              try {
                const route = await login(values.username, values.password)
                navigate(route, { replace: true })
                return true
              } catch (error: unknown) {
                alert.error('Login gagal', getErrorMessage(error))
                return false
              } finally {
                setIsSubmitting(false)
              }
            }}
          />
        </div>

        <footer className="text-center text-[12px] text-muted-foreground">
          © {new Date().getFullYear()} {APP_FULL_NAME}
        </footer>
      </section>
    </main>
  )
}
