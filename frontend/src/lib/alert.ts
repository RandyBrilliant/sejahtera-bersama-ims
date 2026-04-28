import { toast as sonnerToast } from 'sonner'

const DEFAULT_DURATION = 4500

export const alert = {
  success: (title: string, description?: string) =>
    sonnerToast.success(title, { description, duration: DEFAULT_DURATION }),
  error: (title: string, description?: string) =>
    sonnerToast.error(title, { description, duration: DEFAULT_DURATION }),
  warning: (title: string, description?: string) =>
    sonnerToast.warning(title, { description, duration: DEFAULT_DURATION }),
  info: (title: string, description?: string) =>
    sonnerToast.info(title, { description, duration: DEFAULT_DURATION }),
  loading: (title: string) => sonnerToast.loading(title, { duration: DEFAULT_DURATION }),
}
