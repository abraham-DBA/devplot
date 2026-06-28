import { AuthShell } from "@/components/auth/AuthShell";

const loginFields = [
  {
    label: "Email",
    name: "email",
    type: "email",
    placeholder: "you@team.io",
  },
  {
    label: "Password",
    name: "password",
    type: "password",
    placeholder: "••••••••",
  },
] as const;

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your workspace."
      fields={loginFields}
      submitLabel="Sign in"
      footerText="New to DevFlow?"
      footerHref="/signup"
      footerLinkLabel="Create an account"
    />
  );
}
