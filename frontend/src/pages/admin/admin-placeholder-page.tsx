type AdminPlaceholderPageProps = {
  title: string
  description: string
}

export function AdminPlaceholderPage({ title, description }: AdminPlaceholderPageProps) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-on-surface font-heading text-2xl font-semibold tracking-tight md:text-[24px] md:leading-8">
          {title}
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl text-sm leading-relaxed">{description}</p>
      </div>
      <div className="border-outline-variant bg-surface-container-lowest ambient-shadow rounded-xl border p-6">
        <p className="text-on-surface-variant text-sm">
          Konten fitur akan dihubungkan ke backend pada iterasi berikutnya. Silakan lanjutkan penyusunan
          desain komponen di halaman ini.
        </p>
      </div>
    </div>
  )
}
