export function PoweredByPenthouse({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-center justify-center gap-1.5 text-xs text-slate-400 ${className}`}>
      Powered by Penthouse Consulting
      <img src="/ph-logo.png" alt="" width={14} height={14} className="inline-block shrink-0" />
    </p>
  )
}
