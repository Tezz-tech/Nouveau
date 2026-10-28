import { BotPlan, MasterStrategy, type BotPlanDocument } from "@nouveau/db";
import { HttpError } from "../middleware/errorHandler";

export interface CreateBotPlanInput {
  name: string;
  masterStrategyId: string;
  priceCents: string;
  currency?: string;
  interval?: "monthly";
  defaultMultiplier?: number;
}

export async function createBotPlan(input: CreateBotPlanInput): Promise<BotPlanDocument> {
  const strategy = await MasterStrategy.findById(input.masterStrategyId);
  if (!strategy) {
    throw new HttpError(404, "That master strategy doesn't exist.");
  }
  return BotPlan.create({
    name: input.name,
    masterStrategyId: strategy._id,
    priceCents: input.priceCents,
    currency: input.currency,
    interval: input.interval,
    defaultMultiplier: input.defaultMultiplier,
  });
}

export function listBotPlans(): Promise<BotPlanDocument[]> {
  return BotPlan.find().sort({ createdAt: -1 });
}

/** No price-editing endpoint on purpose — changing a Paystack-linked plan's
 *  price out from under subscribers who already bought it at the old price
 *  is a real billing-correctness hazard, not just an API-design choice.
 *  Retiring a plan and creating a new one at the new price is the
 *  deliberately-only path. */
export async function setBotPlanStatus(id: string, status: "active" | "retired"): Promise<BotPlanDocument> {
  const plan = await BotPlan.findById(id);
  if (!plan) throw new HttpError(404, "Bot plan not found.");
  plan.status = status;
  await plan.save();
  return plan;
}
