interface StackBadgeProps {
  tech: string
}

export default function StackBadge({ tech }: StackBadgeProps) {
  return (
    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-cyan-300 border border-white/10">
      {tech}
    </span>
  )
}
