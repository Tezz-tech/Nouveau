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
  LayoutGrid,
  ArrowDownToLine,
  ArrowUpFromLine,
  Receipt,
  CandlestickChart,
  CircleUserRound,
  Activity,
  CreditCard,
  LogOut,
  Target,
  Lock,
  TrendingUp,
  CheckCircle2,
  Link2,
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
  // Dashboard nav + stat-tile icons
  overview: LayoutGrid,
  funding: ArrowDownToLine,
  withdraw: ArrowUpFromLine,
  transactions: Receipt,
  history: CandlestickChart,
  profile: CircleUserRound,
  analytics: Activity,
  billing: CreditCard,
  logout: LogOut,
  target: Target,
  custody: Lock,
  atRisk: TrendingUp,
  success: CheckCircle2,
  broker: Link2,
} as const;

export type IconName = keyof typeof registry;

export default function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const Component = registry[name];
  return <Component strokeWidth={1.5} {...props} />;
}
