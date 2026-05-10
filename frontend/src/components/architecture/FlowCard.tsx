interface FlowStep {
  step: number
  label: string
  detail?: string
}

interface FlowCardProps {
  title: string
  description: string
  steps: FlowStep[]
}

export default function FlowCard({ title, description, steps }: FlowCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-base font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed">{description}</p>
      <ol className="space-y-2">
        {steps.map((s) => (
          <li key={s.step} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-cyan-400">
              {s.step}
            </span>
            <div>
              <span className="text-sm text-slate-200 font-medium">{s.label}</span>
              {s.detail && (
                <span className="text-xs text-slate-500 block mt-0.5">{s.detail}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
