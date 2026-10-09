// "Everything you need, in one app" — every line here was checked against the code (2026-10-07).
// Not claimed on purpose (not in the app): report export, invoice payment tracking,
// amount in words on quotations/invoices, a standalone receipt not linked to a quotation,
// a drag-and-drop template builder, self-service print settings (admin-only page), built-in WhatsApp/email sending, stock tracking.
import { ListPlus, Package, Copy, Sparkles, Receipt, Wallet, Shield, FileText, SlidersHorizontal, ChartBar } from "lucide-react";

export const APP_FEATURES = [
  {
    icon: ListPlus,
    title: "Item-wise quotations",
    desc: "Every line has item, quantity, unit, rate and amount. Totals are calculated for you, and you can drag lines to reorder them.",
  },
  {
    icon: Package,
    title: "Item catalogue",
    desc: "Save your items once with code, name, category, unit, price and default warranty period. They fill in automatically on new quotations.",
  },
  {
    icon: Copy,
    title: "Copy quotation",
    desc: "Open any saved quotation and copy its items into a new one. Change only the customer, quantities or rates.",
  },
  {
    icon: Sparkles,
    title: "AI Quick Create",
    desc: "Type what you need in plain words, and AI picks the matching items, quantities and prices from your saved catalogue, so a quotation is ready in seconds.",
  },
  {
    icon: Receipt,
    title: "Quotation to invoice",
    desc: "When the customer agrees, open the quotation as a new invoice with the customer and items already filled in.",
  },
  {
    icon: Wallet,
    title: "Advance and payment receipts",
    desc: "Advance and payment receipts linked to your quotation (cash, UPI, cheque, bank). The receipt PDF shows the amount in words and the balance due.",
  },
  {
    icon: Shield,
    title: "Warranty certificates",
    desc: "Issue a warranty certificate for installed items with warranty period, start date and expiry date. Reports list warranties by expiry, for AMC follow-up.",
  },
  {
    icon: FileText,
    title: "Branded PDFs",
    desc: "Quotations, invoices, warranty certificates and receipts carry your logo, colours, terms, footer note, signature, bank or UPI details and a payment QR code.",
  },
  {
    icon: SlidersHorizontal,
    title: "Print layout set up for you",
    desc: "When we set up your account, we configure each document type for you: table columns and their order, company details, totals, header title, logo, signature and payment QR.",
  },
  {
    icon: ChartBar,
    title: "Reports and dashboard",
    desc: "Search quotations, invoices, warranties and receipts by number, customer or date. The dashboard shows your quotation and invoice totals at a glance.",
  },
];
