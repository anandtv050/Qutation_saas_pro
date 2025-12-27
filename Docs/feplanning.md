Dashboard Layout (Post-Login Landing)
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo] Quotely                    🔔  👤 User ▼                    │
├────────────┬────────────────────────────────────────────────────────┤
│            │                                                        │
│  SIDEBAR   │  Good Morning, {Name}! 👋                             │
│            │                                                        │
│  🏠 Home   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  📝 Quote  │  │ ₹45,000 │ │   12    │ │    5    │ │    3    │      │
│  📄 Invoice│  │ Today   │ │ Quotes  │ │Invoices │ │ Pending │      │
│  📦 Items  │  │ Revenue │ │ (This   │ │ (This   │ │ Payments│      │
│  📊 Reports│  └─────────┘ │ Month)  │ │ Month)  │ └─────────┘      │
│  ⚙️ Setting│              └─────────┘ └─────────┘                   │
│            │                                                        │
│            │  ┌─────────────────────────────────────────────────┐  │
│            │  │  QUICK ACTIONS                                  │  │
│            │  │  [ + New Quotation ]  [ + New Invoice ]         │  │
│            │  └─────────────────────────────────────────────────┘  │
│            │                                                        │
│            │  RECENT QUOTATIONS                    [View All →]    │
│            │  ┌──────────────────────────────────────────────┐     │
│            │  │ #Q-001 | ABC Corp | ₹25,000 | 🟡 Sent        │     │
│            │  │ #Q-002 | XYZ Ltd  | ₹18,500 | 🟢 Approved    │     │
│            │  │ #Q-003 | PQR Inc  | ₹32,000 | 🔴 Draft       │     │
│            │  └──────────────────────────────────────────────┘     │
│            │                                                        │
│            │  PENDING PAYMENTS                     [View All →]    │
│            │  ┌──────────────────────────────────────────────┐     │
│            │  │ #I-001 | ABC Corp | ₹25,000 | Due: 15 Dec    │     │
│            │  │ #I-002 | XYZ Ltd  | ₹18,500 | Due: 20 Dec    │     │
│            │  └──────────────────────────────────────────────┘     │
│            │                                                        │
└────────────┴────────────────────────────────────────────────────────┘










Page Flow (User Journey)
                         ┌──────────────┐
                         │    LOGIN     │
                         └──────┬───────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │      DASHBOARD        │  ← HOME (after every login)
                    │  • Stats Cards        │
                    │  • Quick Actions      │
                    │  • Recent Quotations  │
                    │  • Pending Invoices   │
                    └───────────┬───────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   QUOTATIONS    │  │    INVOICES     │  │   INVENTORY     │
│   (List View)   │  │   (List View)   │  │   (List View)   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Create/Edit     │  │ Create/Edit     │  │ Add/Edit        │
│ Quotation Form  │  │ Invoice Form    │  │ Inventory Item  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
         │  ← CONVERT
         ▼
┌─────────────────┐
│ Convert to      │
│ Invoice Modal   │
└─────────────────┘



Priority	Module	Why First
1	Dashboard	First thing user sees - overview & quick actions
2	Quotation Create/Edit	Core value proposition
3	Quotation List	Manage existing quotes
4	Invoice Create (from Quotation)	Natural workflow progression
5	Invoice List	Track payments
6	Inventory	Supporting feature - speeds up quotation creation
7	Reports	Analytics - nice to have