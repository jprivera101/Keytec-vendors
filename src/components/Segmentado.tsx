/** Control tipo "segmented control": botones exclusivos uno al lado del otro (p.ej.
 * Activa/Anteriores/Todas). */
export function Segmentado<T extends string>({
  valor,
  opciones,
  onChange,
}: {
  valor: T
  opciones: { valor: T; etiqueta: string }[]
  onChange: (valor: T) => void
}) {
  return (
    <div className="flex flex-1 gap-1 rounded-lg bg-slate-100 p-1">
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          onClick={() => onChange(opcion.valor)}
          className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
            valor === opcion.valor ? 'bg-white text-ink-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  )
}
