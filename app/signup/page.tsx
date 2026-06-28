import { AuthShell } from "@/components/auth/AuthShell";

const signupFields = [
  {
    label: "Name",
    name: "name",
    type: "text",
    placeholder: "Abraham Okonkwo",
  },
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

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Start coordinating in under a minute."
      fields={signupFields}
      submitLabel="Create account"
      footerText="Already have an account?"
      footerHref="/login"
      footerLinkLabel="Sign in"
    />
  );
}
