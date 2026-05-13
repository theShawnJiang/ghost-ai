import type { ReactNode } from "react";
import { FileText, Share2, Sparkles, type LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: Sparkles,
    title: "AI Architecture Generation",
    description: "Describe your system, AI maps it to nodes and edges on a live canvas.",
  },
  {
    icon: Share2,
    title: "Real-time Collaboration",
    description: "Live cursors, presence indicators, and shared node editing across your team.",
  },
  {
    icon: FileText,
    title: "Instant Spec Generation",
    description: "Export a complete Markdown technical spec directly from the canvas graph.",
  },
];

interface AuthPanelProps {
  children: ReactNode;
}

export function AuthPanel({ children }: AuthPanelProps) {
  return (
    <div className="grid min-h-screen w-full bg-base lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-surface px-14 py-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 rounded-xl bg-brand" aria-hidden />
          <span className="text-base font-semibold tracking-tight text-copy-primary">
            Ghost AI
          </span>
        </div>

        <div className="space-y-10">
          <div className="max-w-md space-y-5">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-copy-primary">
              Design systems at the speed of thought.
            </h1>
            <p className="text-base leading-relaxed text-copy-secondary">
              Describe your architecture in plain English. Ghost AI maps it to a shared
              canvas your whole team can refine in real time.
            </p>
          </div>

          <ul className="space-y-6">
            {features.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-brand">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="space-y-1">
                  <h2 className="text-sm font-medium text-copy-primary">{title}</h2>
                  <p className="whitespace-nowrap text-sm leading-relaxed text-copy-muted">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-copy-faint">
          © {new Date().getFullYear()} Ghost AI. All rights reserved.
        </p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">{children}</main>
    </div>
  );
}
