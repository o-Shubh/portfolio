"use client";

import { buyPro, confirmProPayment } from "@/app/actions/pro";
import { PayButton } from "@/components/PayButton";

export function BuyProButton({ label }: { label: string }) {
  return <PayButton label={label} start={buyPro} confirm={confirmProPayment} />;
}
