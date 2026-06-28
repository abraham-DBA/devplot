import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start coordinating in under a minute."
      footerText="Already have an account?"
      footerHref="/login"
      footerLinkLabel="Sign in"
    >
      <SignupForm />
    </AuthShell>
  );
}
