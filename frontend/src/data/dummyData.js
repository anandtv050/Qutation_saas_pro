// Dummy data for development

export const dummyQuotations = [
  {
    id: 1,
    quotation_number: "Q-2024-001",
    customer_name: "Rajesh Kumar",
    customer_phone: "9876543210",
    site_address: "123, MG Road, Bangalore",
    items: [
      { name: "Cement (50kg bags)", qty: 100, rate: 380, amount: 38000 },
      { name: "Steel Rods (12mm)", qty: 50, rate: 65, amount: 3250 },
      { name: "Sand (cubic ft)", qty: 200, rate: 45, amount: 9000 },
    ],
    subtotal: 50250,
    tax_percent: 18,
    tax_amount: 9045,
    discount_amount: 0,
    total_amount: 59295,
    status: "sent",
    created_at: "2024-12-10",
    valid_until: "2024-12-25",
  },
  {
    id: 2,
    quotation_number: "Q-2024-002",
    customer_name: "Priya Sharma",
    customer_phone: "9988776655",
    site_address: "456, Whitefield, Bangalore",
    items: [
      { name: "Tiles (2x2 ft)", qty: 500, rate: 55, amount: 27500 },
      { name: "Tile Adhesive", qty: 20, rate: 450, amount: 9000 },
    ],
    subtotal: 36500,
    tax_percent: 18,
    tax_amount: 6570,
    discount_amount: 500,
    total_amount: 42570,
    status: "approved",
    created_at: "2024-12-08",
    valid_until: "2024-12-23",
  },
  {
    id: 3,
    quotation_number: "Q-2024-003",
    customer_name: "Mohammed Ali",
    customer_phone: "8877665544",
    site_address: "789, Electronic City, Bangalore",
    items: [
      { name: "Electrical Wire (100m)", qty: 10, rate: 2500, amount: 25000 },
      { name: "MCB Switch Box", qty: 5, rate: 1200, amount: 6000 },
      { name: "LED Lights", qty: 50, rate: 350, amount: 17500 },
    ],
    subtotal: 48500,
    tax_percent: 18,
    tax_amount: 8730,
    discount_amount: 1000,
    total_amount: 56230,
    status: "draft",
    created_at: "2024-12-11",
    valid_until: "2024-12-26",
  },
  {
    id: 4,
    quotation_number: "Q-2024-004",
    customer_name: "Anita Desai",
    customer_phone: "7766554433",
    site_address: "321, Koramangala, Bangalore",
    items: [
      { name: "Paint (20L bucket)", qty: 15, rate: 3500, amount: 52500 },
      { name: "Primer (10L)", qty: 10, rate: 1800, amount: 18000 },
      { name: "Brushes Set", qty: 5, rate: 500, amount: 2500 },
    ],
    subtotal: 73000,
    tax_percent: 18,
    tax_amount: 13140,
    discount_amount: 2000,
    total_amount: 84140,
    status: "converted",
    created_at: "2024-12-05",
    valid_until: "2024-12-20",
  },
  {
    id: 5,
    quotation_number: "Q-2024-005",
    customer_name: "Suresh Reddy",
    customer_phone: "6655443322",
    site_address: "654, HSR Layout, Bangalore",
    items: [
      { name: "Plywood Sheets", qty: 20, rate: 1500, amount: 30000 },
      { name: "Hardware Fittings", qty: 1, rate: 8000, amount: 8000 },
    ],
    subtotal: 38000,
    tax_percent: 18,
    tax_amount: 6840,
    discount_amount: 0,
    total_amount: 44840,
    status: "rejected",
    created_at: "2024-12-06",
    valid_until: "2024-12-21",
  },
];

export const dummyInvoices = [
  {
    id: 1,
    invoice_number: "INV-2024-001",
    quotation_id: 4,
    customer_name: "Anita Desai",
    customer_phone: "7766554433",
    site_address: "321, Koramangala, Bangalore",
    items: [
      { name: "Paint (20L bucket)", qty: 15, rate: 3500, amount: 52500 },
      { name: "Primer (10L)", qty: 10, rate: 1800, amount: 18000 },
      { name: "Brushes Set", qty: 5, rate: 500, amount: 2500 },
    ],
    subtotal: 73000,
    tax_percent: 18,
    tax_amount: 13140,
    discount_amount: 2000,
    total_amount: 84140,
    payment_status: "paid",
    payment_date: "2024-12-10",
    created_at: "2024-12-05",
    due_date: "2024-12-20",
  },
  {
    id: 2,
    invoice_number: "INV-2024-002",
    quotation_id: null,
    customer_name: "Vikram Singh",
    customer_phone: "9911223344",
    site_address: "111, Indiranagar, Bangalore",
    items: [
      { name: "Cement (50kg bags)", qty: 200, rate: 380, amount: 76000 },
      { name: "Bricks (1000 pcs)", qty: 5, rate: 6000, amount: 30000 },
    ],
    subtotal: 106000,
    tax_percent: 18,
    tax_amount: 19080,
    discount_amount: 5000,
    total_amount: 120080,
    payment_status: "pending",
    payment_date: null,
    created_at: "2024-12-08",
    due_date: "2024-12-23",
  },
  {
    id: 3,
    invoice_number: "INV-2024-003",
    quotation_id: null,
    customer_name: "Lakshmi Menon",
    customer_phone: "8899001122",
    site_address: "222, Jayanagar, Bangalore",
    items: [
      { name: "Plumbing Pipes", qty: 100, rate: 250, amount: 25000 },
      { name: "Fittings Set", qty: 2, rate: 5000, amount: 10000 },
    ],
    subtotal: 35000,
    tax_percent: 18,
    tax_amount: 6300,
    discount_amount: 0,
    total_amount: 41300,
    payment_status: "partial",
    paid_amount: 20000,
    created_at: "2024-12-09",
    due_date: "2024-12-24",
  },
  {
    id: 4,
    invoice_number: "INV-2024-004",
    quotation_id: null,
    customer_name: "Arun Nair",
    customer_phone: "7788990011",
    site_address: "333, BTM Layout, Bangalore",
    items: [
      { name: "Granite Slabs", qty: 50, rate: 800, amount: 40000 },
    ],
    subtotal: 40000,
    tax_percent: 18,
    tax_amount: 7200,
    discount_amount: 1500,
    total_amount: 45700,
    payment_status: "overdue",
    payment_date: null,
    created_at: "2024-11-25",
    due_date: "2024-12-05",
  },
];

export const dummyUser = {
  id: 1,
  name: "Quotely Demo",
  email: "demo@quotely.com",
  business_name: "Quotely Construction Supplies",
  gst_number: "29ABCDE1234F1Z5",
  phone: "9876543210",
  address: "100, Commercial Street, Bangalore - 560001",
};

// Helper functions
export const getQuotationStats = () => {
  const total = dummyQuotations.length;
  const draft = dummyQuotations.filter(q => q.status === "draft").length;
  const sent = dummyQuotations.filter(q => q.status === "sent").length;
  const approved = dummyQuotations.filter(q => q.status === "approved").length;
  const converted = dummyQuotations.filter(q => q.status === "converted").length;
  const totalValue = dummyQuotations.reduce((sum, q) => sum + q.total_amount, 0);

  return { total, draft, sent, approved, converted, totalValue };
};

export const getInvoiceStats = () => {
  const total = dummyInvoices.length;
  const pending = dummyInvoices.filter(i => i.payment_status === "pending").length;
  const partial = dummyInvoices.filter(i => i.payment_status === "partial").length;
  const paid = dummyInvoices.filter(i => i.payment_status === "paid").length;
  const overdue = dummyInvoices.filter(i => i.payment_status === "overdue").length;
  const totalValue = dummyInvoices.reduce((sum, i) => sum + i.total_amount, 0);
  const paidValue = dummyInvoices
    .filter(i => i.payment_status === "paid")
    .reduce((sum, i) => sum + i.total_amount, 0);

  return { total, pending, partial, paid, overdue, totalValue, paidValue };
};
