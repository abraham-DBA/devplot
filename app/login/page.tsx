import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { sanitizeRedirect } from "@/lib/sanitize-redirect";

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirect(params.redirect, "/dashboard");

  // Carry the redirect through to signup so first-time invitees don't lose their invite link
  const signupHref =
    redirectTo !== "/dashboard" ? `/signup?redirect=${encodeURIComponent(redirectTo)}` : "/signup";

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your workspace."
      footerText="New to DevFlow?"
      footerHref={signupHref}
      footerLinkLabel="Create an account"
    >
      <LoginForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
