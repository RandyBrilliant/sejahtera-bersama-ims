export function MarketingPanel() {
  return (
    <section className="relative hidden overflow-hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-end lg:p-8">
      <img
        src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=80"
        alt="Warehouse racks and logistics operations"
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />

      <div className="relative z-10 mb-8 max-w-lg rounded-xl border border-white/25 bg-white/10 p-6 shadow-2xl backdrop-blur-md">
        <p className="text-[11px] font-semibold tracking-widest text-primary-foreground/80 uppercase">
          Intelijen Bisnis
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Menyederhanakan Operasional
        </h2>
        <p className="mt-3 text-sm leading-6 text-primary-foreground/85">
          Pantau persediaan secara real-time, cegah selisih stok, dan hubungkan pembelian,
          produksi, serta pemenuhan pesanan dalam satu sistem.
        </p>
      </div>
    </section>
  )
}
