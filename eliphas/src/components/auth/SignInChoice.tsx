"use client";

import { useState } from "react";
import { EmailForm } from "@/app/login/EmailForm";
import { LoginForm } from "@/app/login/LoginForm";

/** Mobile number and/or email sign-in, whichever are switched on; a toggle when both are. */
export function SignInChoice({
  phone,
  email,
  codes,
  next,
  audience,
  mode,
}: {
  phone: boolean;
  email: boolean;
  codes: boolean;
  next: string;
  audience: "reader" | "author";
  mode: "login" | "signup";
}) {
  const [use, setUse] = useState<"phone" | "email">(phone ? "phone" : "email");
  return (
    <>
      {phone && email && (
        <div className="segmented mt-6 w-full" role="group" aria-label="Sign in with">
          {(["phone", "email"] as const).map((m) => (
            <button key={m} type="button" className="segment flex-1" aria-pressed={use === m} onClick={() => setUse(m)}>
              {m === "phone" ? "Mobile number" : "Email"}
            </button>
          ))}
        </div>
      )}
      {use === "phone" ? (
        <LoginForm next={next} audience={audience} submitLabel={mode === "signup" ? "Sign up: send code" : "Send code"} />
      ) : (
        <EmailForm next={next} audience={audience} mode={mode} codes={codes} />
      )}
    </>
  );
}
