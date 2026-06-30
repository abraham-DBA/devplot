import { AuthShell } from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/SignupForm";
import { sanitizeRedirect } from "@/lib/sanitize-redirect";

type Props = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirect(params.redirect, "/onboarding");

  // Carry the redirect through to login so it isn't lost if the user already has an account
  const loginHref =
    redirectTo !== "/onboarding" ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start coordinating in under a minute."
      footerText="Already have an account?"
      footerHref={loginHref}
      footerLinkLabel="Sign in"
    >
      <SignupForm redirectTo={redirectTo} />
    </AuthShell>
  );
}
