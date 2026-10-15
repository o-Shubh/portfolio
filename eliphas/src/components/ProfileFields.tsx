import { INDIAN_STATES } from "@/lib/india";
import type { Profile } from "@/lib/auth";

export function ProfileFields({ profile }: { profile: Profile }) {
  return (
    <>
      <div>
        <label htmlFor="full_name" className="label">
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          className="field"
          autoComplete="name"
          defaultValue={profile.full_name ?? ""}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className="label">
            City
          </label>
          <input
            id="city"
            name="city"
            className="field"
            autoComplete="address-level2"
            defaultValue={profile.city ?? ""}
            required
          />
        </div>
        <div>
          <label htmlFor="state" className="label">
            State / region
          </label>
          <input
            id="state"
            name="state"
            className="field"
            list="state-suggestions"
            autoComplete="address-level1"
            defaultValue={profile.state ?? ""}
            required
          />
          <datalist id="state-suggestions">
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="sm:w-1/2">
        <label htmlFor="pincode" className="label">
          Postal code <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="pincode"
          name="pincode"
          className="field"
          autoComplete="postal-code"
          maxLength={10}
          defaultValue={profile.pincode ?? ""}
        />
      </div>
      {(profile.role === "author" || profile.role === "admin") && (
        <div className="sm:w-1/2">
          <label htmlFor="payout_upi" className="label">
            UPI ID for payouts
          </label>
          <input
            id="payout_upi"
            name="payout_upi"
            className="field"
            placeholder="yourname@okbank"
            autoComplete="off"
            defaultValue={profile.payout_upi ?? ""}
          />
          <p className="mt-1 text-sm text-muted">Your earnings are sent here.</p>
        </div>
      )}
    </>
  );
}
