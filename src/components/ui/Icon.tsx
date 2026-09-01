import {
  Landmark,
  Bot,
  BrainCircuit,
  Wallet,
  ShieldCheck,
  LineChart,
  Cpu,
  Eye,
  GraduationCap,
  type LucideProps,
} from "lucide-react";

const registry = {
  fund: Landmark,
  bots: Bot,
  intelligence: BrainCircuit,
  capital: Wallet,
  professional: ShieldCheck,
  trader: LineChart,
  systems: Cpu,
  ai: BrainCircuit,
  transparency: Eye,
  education: GraduationCap,
} as const;

export type IconName = keyof typeof registry;

export default function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const Component = registry[name];
  return <Component strokeWidth={1.5} {...props} />;
}
