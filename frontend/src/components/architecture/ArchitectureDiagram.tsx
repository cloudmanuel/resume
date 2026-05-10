interface BoxProps {
  label: string
  sublabel?: string
  color?: 'cyan' | 'indigo' | 'emerald' | 'slate' | 'amber'
}

const colorMap = {
  cyan: 'border-cyan-400/40 text-cyan-300 bg-cyan-400/5',
  indigo: 'border-indigo-400/40 text-indigo-300 bg-indigo-400/5',
  emerald: 'border-emerald-400/40 text-emerald-300 bg-emerald-400/5',
  slate: 'border-white/15 text-slate-300 bg-white/5',
  amber: 'border-amber-400/40 text-amber-300 bg-amber-400/5',
}

function Box({ label, sublabel, color = 'slate' }: BoxProps) {
  return (
    <div
      className={`inline-flex flex-col items-center justify-center px-3 py-2 border rounded-lg text-xs font-medium min-w-[100px] ${colorMap[color]}`}
    >
      <span>{label}</span>
      {sublabel && <span className="text-[10px] opacity-60 mt-0.5">{sublabel}</span>}
    </div>
  )
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 px-1">
      <div className="flex items-center">
        <div className="w-6 h-px bg-slate-600" />
        <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-t-transparent border-b-transparent border-l-slate-500" />
      </div>
      {label && <span className="text-[9px] text-slate-600">{label}</span>}
    </div>
  )
}

function DownArrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <div className="flex flex-col items-center">
        <div className="w-px h-5 bg-slate-600" />
        <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-500" />
      </div>
      {label && <span className="text-[9px] text-slate-600">{label}</span>}
    </div>
  )
}

export default function ArchitectureDiagram() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 overflow-x-auto">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-6">
        System Architecture — Resume Platform
      </p>

      {/* Main request path */}
      <div className="flex flex-col items-center gap-0 min-w-[520px]">
        {/* Row 1: Browser → Route53 → CloudFront → S3 */}
        <div className="flex items-center gap-0 flex-wrap justify-center">
          <Box label="Browser" sublabel="User" color="slate" />
          <Arrow label="DNS" />
          <Box label="Route 53" sublabel="DNS + Cert" color="indigo" />
          <Arrow label="HTTPS" />
          <Box label="CloudFront" sublabel="CDN + WAF" color="cyan" />
          <Arrow label="Static" />
          <Box label="S3" sublabel="Private bucket" color="emerald" />
        </div>

        {/* Down from CloudFront */}
        <div className="flex items-start gap-0 mt-0">
          {/* Spacer to align arrow under CloudFront */}
          <div style={{ width: '280px' }} />
          <div className="flex flex-col items-center">
            <DownArrow label="API calls" />
            <Box label="API Gateway" sublabel="REST API" color="indigo" />
            <DownArrow />
            <Box label="Lambda" sublabel="Python 3.12" color="cyan" />
            <DownArrow />
            <Box label="DynamoDB" sublabel="On-demand" color="emerald" />
          </div>
          <div className="flex flex-col items-start pt-10 ml-4">
            <div className="h-px w-8 bg-slate-600 mt-3" />
          </div>
        </div>

        {/* CloudWatch row */}
        <div className="flex items-center gap-4 mt-4 flex-wrap justify-center">
          <Box label="CloudWatch" sublabel="Metrics + Logs" color="amber" />
          <Box label="ACM" sublabel="TLS Cert" color="slate" />
          <Box label="IAM + OIDC" sublabel="Zero long-lived keys" color="slate" />
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-white/10 w-full flex flex-wrap gap-4 justify-center text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-cyan-400/30 border border-cyan-400/40" />
            Compute / Delivery
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-indigo-400/30 border border-indigo-400/40" />
            Networking / API
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-emerald-400/30 border border-emerald-400/40" />
            Storage / Data
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-amber-400/30 border border-amber-400/40" />
            Observability
          </span>
        </div>
      </div>
    </div>
  )
}
