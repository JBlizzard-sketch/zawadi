import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const companySettingsTable = pgTable("company_settings", {
  id: text("id").primaryKey().default("singleton"),
  companyName: text("company_name").notNull().default("Zawadi Corporate Gifting"),
  kraPin: text("kra_pin"),
  address: text("address"),
  city: text("city").default("Nairobi"),
  country: text("country").default("Kenya"),
  phone: text("phone"),
  email: text("email"),
  logoUrl: text("logo_url"),
  website: text("website"),
  accountManagerName: text("account_manager_name"),
  accountManagerEmail: text("account_manager_email"),
  accountManagerPhone: text("account_manager_phone"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  bankBranch: text("bank_branch"),
  swiftCode: text("swift_code"),
  defaultPaymentTermsDays: text("default_payment_terms_days").default("30"),
  invoiceFooter: text("invoice_footer"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CompanySettings = typeof companySettingsTable.$inferSelect;
