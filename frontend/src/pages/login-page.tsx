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
      response?: { data?: { detail?: string; message?: string } }
    }).response
    return response?.data?.detail || response?.data?.message || 'Username atau password salah.'
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
    <main className="page-enter flex min-h-screen w-full">
      <MarketingPanel />

      <section className="bg-background flex w-full flex-col items-center justify-center p-4 md:p-8 lg:w-1/2">
        <LoginForm
          isSubmitting={isSubmitting}
          onSubmit={async (values) => {
            setIsSubmitting(true)
            try {
              const route = await login(values.username, values.password)
              navigate(route, { replace: true })
            } catch (error: unknown) {
              alert.error('Login gagal', getErrorMessage(error))
            } finally {
              setIsSubmitting(false)
            }
          }}
        />

        <footer className="mt-14 w-full max-w-md text-center">
          <p className="text-muted-foreground mt-2 text-[11px]">
            © {new Date().getFullYear()} Sejahtera Bersama IMS. Seluruh hak cipta dilindungi.
          </p>
        </footer>
      </section>
    </main>
  )
}
