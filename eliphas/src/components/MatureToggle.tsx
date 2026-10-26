"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmAdult, hideAdult } from "@/app/actions/mature";
import { offlineSafe } from "@/lib/use-form-action";

/** Settings switch for 18+ books on this device. Turning it on confirms the person is 18 or older. */
export function MatureToggle({ on }: { on: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(on);
  const [pending, start] = useTransition();
  return (
    <label className="group-row cursor-pointer justify-between gap-4">
      <span>
        <span className="block">Show 18+ books</span>
        <span className="text-sm text-muted">Books with mature themes. Turning this on confirms you are 18 or older. Saved on this device.</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="switch"
        checked={value}
        disabled={pending}
        data-testid="mature-toggle"
        onChange={(e) => {
          const next = e.target.checked;
          setValue(next);
          start(async () => {
            await offlineSafe(next ? confirmAdult() : hideAdult());
            router.refresh();
          });
        }}
      />
    </label>
  );
}
