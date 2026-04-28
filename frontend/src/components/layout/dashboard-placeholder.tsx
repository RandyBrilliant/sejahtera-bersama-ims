import { useState } from 'react'

import { LogoutConfirmModal } from '@/components/auth/logout-confirm-modal'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

type DashboardPlaceholderProps = {
  title: string
  subtitle: string
}

export function DashboardPlaceholder({ title, subtitle }: DashboardPlaceholderProps) {
  const { user } = useAuth()
  const [logoutOpen, setLogoutOpen] = useState(false)

  return (
    <main className="page-enter from-background to-muted/40 flex min-h-screen items-center justify-center bg-gradient-to-b p-6">
      <section className="bg-card w-full max-w-xl rounded-xl border p-6 shadow-sm">
        <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          Sejahtera Bersama IMS
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-2">{subtitle}</p>
        <div className="bg-muted/60 mt-4 rounded-lg p-4 text-sm">
          <p>
            <span className="font-medium">Masuk sebagai:</span> {user?.username}
          </p>
          <p>
            <span className="font-medium">Peran:</span> {user?.role}
          </p>
        </div>
        <Button className="mt-6" onClick={() => setLogoutOpen(true)}>
          Keluar
        </Button>
      </section>
      <LogoutConfirmModal open={logoutOpen} onOpenChange={setLogoutOpen} />
    </main>
  )
}
