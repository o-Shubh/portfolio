import "server-only";
import { ruleFromPlanVersion } from "@/lib/commission";
import type { CalculatorPlan } from "@/components/PrintCalculator";
import { authorRule, getCurrentPlans } from "@/lib/plans";

const LABEL = { legacy: "Your original terms", free: "Free plan", pro: "Pro plan" } as const;

/** Plans to compare in the calculator: the author's own rule first, then the others worth seeing. */
export async function calculatorPlans(authorId?: string): Promise<CalculatorPlan[]> {
  const plans = await getCurrentPlans();
  const free = { key: "free", label: LABEL.free, rule: ruleFromPlanVersion(plans.free) };
  const pro = {
    key: "pro",
    label: LABEL.pro,
    rule: ruleFromPlanVersion(plans.pro),
    note: "Subscription is separate: ₹" + plans.pro.price_paise / 100 + "/month + GST. Not included in these numbers.",
  };
  if (!authorId) return [free, pro];
  const { rule, version } = await authorRule(authorId);
  const mine: CalculatorPlan = { key: "mine", label: `Your plan: ${LABEL[version.plan as keyof typeof LABEL]}`, rule };
  if (version.plan === "pro") return [mine, free];
  if (version.plan === "free") return [mine, pro];
  return [mine, free, pro];
}
