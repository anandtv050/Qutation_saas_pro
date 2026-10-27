import { Copy, Package, FileText, Send } from "lucide-react";

const BENEFITS = [
  { icon: Copy, label: "Copy any old quotation" },
  { icon: Package, label: "Your items and rates saved" },
  { icon: FileText, label: "Branded PDF with your logo" },
  { icon: Send, label: "Send on WhatsApp in a minute" },
];

// Desktop-only brand panel shared by /login and /signup.
export default function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-black relative overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-neutral-950 to-black" />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-3xl" />

      <div className="flex flex-col justify-between w-full px-16 py-14 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm">
            <span className="text-black text-xl font-bold">Q</span>
          </div>
          <span className="text-white text-xl font-semibold">Quotely Pro</span>
        </div>

        <h1 className="text-white text-5xl font-bold leading-tight tracking-tight max-w-xl">
          Create professional quotes in seconds
        </h1>

        <ul className="space-y-3">
          {BENEFITS.map((f) => (
            <li key={f.label} className="flex items-center gap-3">
              <f.icon className="w-4 h-4 text-white/60 shrink-0" strokeWidth={2} />
              <span className="text-white text-sm font-medium">{f.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
