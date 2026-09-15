import { Suspense } from "react";
import { AuthNavigation } from "./auth-navigation";
import { ShieldCheck } from "lucide-react";
import { AuthForm } from "./auth-form";
const content = {
  register: ["Join the competition", "Create your free player account."],
  login: ["Welcome back", "Your next match is waiting."],
  "forgot-password": [
    "Back in the game",
    "We’ll help you reset your password.",
  ],
  "reset-password": [
    "A fresh start",
    "Choose a new password for your account.",
  ],
  "verify-email": [
    "Make it official",
    "Verify your email to complete your account.",
  ],
} as const;
export function AuthScreen({ kind }: { kind: keyof typeof content }) {
  const [title, description] = content[kind];
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <div className="eyebrow">THE HOME OF COMMUNITY eFOOTBALL</div>
        <h1>
          Your next match.
          <br />
          <span className="lime">Your next moment.</span>
        </h1>
        <p className="muted">
          Find your competition. Take on the community. Turn every match into
          something worth playing for.
        </p>
        <div className="story-detail feedback">
          <ShieldCheck size={22} />
          <span>
            One player identity.
            <br />
            Every tournament. Every result.
          </span>
        </div>
      </section>
      <section className="panel auth-form">
        <h1>{title}</h1>
        <p className="muted small">{description}</p>
        <Suspense fallback={<div role="status" className="skeleton" />}>
          <AuthForm kind={kind} />
        </Suspense>
        <Suspense>
          <AuthNavigation login={kind === "login"} />
        </Suspense>
      </section>
    </div>
  );
}
