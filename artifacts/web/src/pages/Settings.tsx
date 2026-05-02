import { useState, useEffect } from "react";
import {
  Settings2, Building2, CreditCard, User2, Globe, Save,
  FileText, Landmark, Phone, Mail, MapPin, Hash, Link as LinkIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Layout from "@/components/layout/Layout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SETTINGS_KEY = ["settings"];

const EMPTY: Record<string, string> = {
  companyName: "", kraPin: "", address: "", city: "Nairobi", country: "Kenya",
  phone: "", email: "", logoUrl: "", website: "",
  accountManagerName: "", accountManagerEmail: "", accountManagerPhone: "",
  bankName: "", bankAccount: "", bankBranch: "", swiftCode: "",
  defaultPaymentTermsDays: "30", invoiceFooter: "",
};

function Field({
  label, icon: Icon, value, onChange, placeholder, type = "text", mono = false,
}: {
  label: string; icon?: any; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={11} />} {label}
      </label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={mono ? "font-mono" : ""}
      />
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-2 pb-3 border-b border-border">
        <Icon size={15} className="text-primary" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY });
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery<any>({
    queryKey: SETTINGS_KEY,
    queryFn: () => fetch(`${BASE}/api/settings`).then(r => r.json()),
  });

  useEffect(() => {
    if (settings) {
      setForm(f => ({
        ...f,
        companyName: settings.companyName ?? "",
        kraPin: settings.kraPin ?? "",
        address: settings.address ?? "",
        city: settings.city ?? "Nairobi",
        country: settings.country ?? "Kenya",
        phone: settings.phone ?? "",
        email: settings.email ?? "",
        logoUrl: settings.logoUrl ?? "",
        website: settings.website ?? "",
        accountManagerName: settings.accountManagerName ?? "",
        accountManagerEmail: settings.accountManagerEmail ?? "",
        accountManagerPhone: settings.accountManagerPhone ?? "",
        bankName: settings.bankName ?? "",
        bankAccount: settings.bankAccount ?? "",
        bankBranch: settings.bankBranch ?? "",
        swiftCode: settings.swiftCode ?? "",
        defaultPaymentTermsDays: settings.defaultPaymentTermsDays ?? "30",
        invoiceFooter: settings.invoiceFooter ?? "",
      }));
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () =>
      fetch(`${BASE}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const set = (key: string) => (v: string) => setForm(f => ({ ...f, [key]: v }));

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-card-border rounded-xl p-6 h-48 animate-pulse" />
          ))}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold text-foreground flex items-center gap-2">
              <Settings2 size={22} className="text-primary" /> Company Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Used on invoices, quotes, and correspondence
            </p>
          </div>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="gap-2"
            data-testid="button-save-settings"
          >
            {save.isPending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <Save size={14} />
            )}
            {saved ? "Saved!" : "Save Settings"}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Company Identity */}
          <Section title="Company Identity" icon={Building2}>
            <Field label="Company Name" icon={Building2} value={form.companyName} onChange={set("companyName")} placeholder="Zawadi Corporate Gifting Ltd" />
            <Field label="KRA PIN" icon={Hash} value={form.kraPin} onChange={set("kraPin")} placeholder="P051234567A" mono />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" icon={MapPin} value={form.city} onChange={set("city")} placeholder="Nairobi" />
              <Field label="Country" value={form.country} onChange={set("country")} placeholder="Kenya" />
            </div>
            <Field label="Physical Address" icon={MapPin} value={form.address} onChange={set("address")} placeholder="Westlands Road, Nairobi" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" icon={Phone} value={form.phone} onChange={set("phone")} placeholder="+254 700 000 000" />
              <Field label="Email" icon={Mail} value={form.email} onChange={set("email")} placeholder="hello@zawadi.co.ke" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Website" icon={Globe} value={form.website} onChange={set("website")} placeholder="https://zawadi.co.ke" />
              <Field label="Logo URL" icon={LinkIcon} value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://…/logo.png" />
            </div>
            {form.logoUrl && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg">
                <img src={form.logoUrl} alt="Logo preview" className="h-10 object-contain rounded" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <p className="text-xs text-muted-foreground">Logo preview — appears on printed invoices</p>
              </div>
            )}
          </Section>

          {/* Account Manager */}
          <Section title="Account Manager" icon={User2}>
            <p className="text-xs text-muted-foreground -mt-2 mb-1">Shown on quotes and correspondence sent to clients</p>
            <Field label="Full Name" icon={User2} value={form.accountManagerName} onChange={set("accountManagerName")} placeholder="Jane Mwangi" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" icon={Mail} value={form.accountManagerEmail} onChange={set("accountManagerEmail")} placeholder="jane@zawadi.co.ke" type="email" />
              <Field label="Phone" icon={Phone} value={form.accountManagerPhone} onChange={set("accountManagerPhone")} placeholder="+254 722 000 000" />
            </div>
          </Section>

          {/* Banking Details */}
          <Section title="Banking Details" icon={Landmark}>
            <p className="text-xs text-muted-foreground -mt-2 mb-1">Printed on invoices to facilitate payment</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank Name" icon={Landmark} value={form.bankName} onChange={set("bankName")} placeholder="Equity Bank Kenya" />
              <Field label="Branch" value={form.bankBranch} onChange={set("bankBranch")} placeholder="Westlands" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Account Number" icon={CreditCard} value={form.bankAccount} onChange={set("bankAccount")} placeholder="0123456789" mono />
              <Field label="SWIFT Code" value={form.swiftCode} onChange={set("swiftCode")} placeholder="EQBLKENA" mono />
            </div>
          </Section>

          {/* Invoice Defaults */}
          <Section title="Invoice Defaults" icon={FileText}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <FileText size={11} /> Default Payment Terms (days)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={form.defaultPaymentTermsDays}
                  onChange={e => set("defaultPaymentTermsDays")(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Invoice Footer Text</label>
              <textarea
                rows={2}
                value={form.invoiceFooter}
                onChange={e => set("invoiceFooter")(e.target.value)}
                placeholder="Thank you for your business. Payment is due within 30 days of the invoice date."
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </Section>

          {/* VAT Notice */}
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 flex gap-3 items-start">
            <Hash size={14} className="text-amber-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-0.5">KRA VAT Rate</p>
              <p className="text-xs text-amber-700 leading-relaxed">
                VAT is fixed at <strong>16%</strong> as per KRA regulations and is automatically applied to all orders and invoices. This cannot be changed from here.
              </p>
            </div>
          </div>

          {/* Bottom save */}
          <div className="flex justify-end pt-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2" size="lg">
              <Save size={15} />
              {saved ? "Saved!" : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
