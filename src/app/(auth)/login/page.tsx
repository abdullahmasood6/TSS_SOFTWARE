import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginRoute() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-tss-navy-deep text-white">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
