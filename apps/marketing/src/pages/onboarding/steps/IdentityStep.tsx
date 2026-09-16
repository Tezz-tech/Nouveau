import { useState, type FormEvent } from "react";
import { TextField, SelectField, SubmitButton, ErrorBanner } from "@/components/ui/FormField";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function IdentityStep() {
  const { refresh } = useAuth();
  const [form, setForm] = useState({ fullName: "", dateOfBirth: "", idType: "passport", idNumber: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<{ verified: boolean; reason?: string }>("/onboarding/identity", form);
      if (!result.verified) {
        setError(result.reason ?? "We couldn't verify your identity from what was submitted.");
        return;
      }
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <p className="text-body text-slate">
        We need to confirm you are who you say you are, as required by law before you can trade.
      </p>
      {error && <ErrorBanner message={error} />}
      <TextField
        label="Full legal name"
        name="fullName"
        required
        value={form.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
      />
      <TextField
        label="Date of birth"
        name="dateOfBirth"
        type="date"
        required
        value={form.dateOfBirth}
        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
      />
      <SelectField
        label="ID type"
        name="idType"
        value={form.idType}
        onChange={(e) => setForm({ ...form, idType: e.target.value })}
        options={[
          { value: "passport", label: "Passport" },
          { value: "national_id", label: "National ID" },
          { value: "drivers_license", label: "Driver's license" },
        ]}
      />
      <TextField
        label="ID number"
        name="idNumber"
        required
        value={form.idNumber}
        onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
      />
      <SubmitButton disabled={submitting}>{submitting ? "Verifying…" : "Verify identity"}</SubmitButton>
    </form>
  );
}
