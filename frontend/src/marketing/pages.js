// Content for every public landing page, rendered by MarketingPage.jsx.
// To add an industry: add one entry here. It is picked up automatically by the
// router, prerender, sitemap, llms.txt, footer and homepage links.
//
// Rules for copy:
// - Only claim what Quotely Pro actually does (see site.js header).
// - No GST/HSN/CGST/SGST claims about the app. Sample tables may show GST
//   the way a normal Indian quotation would.
// - Every page must be genuinely different. No industry-name swapping.
//
// Inline links in paragraphs/answers: [link text](/path)
//
// sample.items: { name, qty, unit, rate, gst } — totals are calculated by the template.

export const GENERAL_PAGES = [
  {
    slug: "quotation-format",
    kind: "guide",
    navLabel: "Quotation format",
    title: "Quotation Format: Sample & Checklist | Quotely Pro",
    description:
      "What a professional quotation includes: business details, item table, tax, validity and terms. See a filled sample and the mistakes to avoid.",
    h1: "Quotation Format: What a Professional Quotation Includes",
    intro: [
      "A quotation is the first document your customer sees with your name on it. Before they have seen your work, they judge you by how clear the quotation is. A neat, item-wise quotation tells them you know your job and you will not surprise them with extra charges later.",
      "This page explains the standard quotation format used by small businesses in India, section by section, with a filled sample you can copy. It works for traders, installers, contractors, service providers and freelancers. If you want a format made for your trade, see the industry pages at the end.",
    ],
    sections: [
      {
        heading: "The 8 parts of a standard quotation format",
        paragraphs: [
          "Every professional quotation, whatever the business, has the same basic parts. Missing even one of them is the most common reason a customer calls back with doubts.",
        ],
        orderedList: [
          "Your business details: business name, address, phone number, email and logo. If you are GST registered, add your GSTIN.",
          "Document title and number: write \"Quotation\" clearly at the top, with a unique quotation number (for example QT/2026-27/045) and the date.",
          "Customer details: customer or company name, contact person, phone number and site or delivery address.",
          "Subject or project line: one line saying what the quotation is for, such as \"Supply of office chairs for 2nd floor\".",
          "Item table: serial number, item description, quantity, unit, rate and amount for every line. This is the heart of the quotation.",
          "Totals: subtotal, discount if any, tax, and the final amount. Write the grand total in words as well as figures.",
          "Terms and conditions: validity, payment terms, delivery or completion time, warranty and what is not included.",
          "Payment details and signature: bank account or UPI ID, and your signature or stamp.",
        ],
      },
      {
        heading: "Writing the item table properly",
        paragraphs: [
          "Customers compare quotations line by line, so the item table decides whether you win the job. Write each item the way the customer will recognise it. \"Office chair\" is weak; \"Mesh back office chair with arms, adjustable height\" leaves no room for argument.",
          "Always give a unit with the quantity: Nos, Pcs, Set, Mtr, Sq ft, Kg, Box, Job or Hour. A rate without a unit is the cause of many payment disputes. If labour is charged separately, put it as its own line, not hidden inside material rates. Customers trust a quotation more when they can see what they are paying for.",
          "Keep the rate and the amount in separate columns. Amount is quantity multiplied by rate. If you give a discount, show it as a separate line below the subtotal rather than quietly reducing rates. The customer sees the saving, and you keep your standard rates on record for the next job.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Terms that save you from disputes later",
        paragraphs: [
          "Most quotation problems come from what was not written. A short terms section protects both you and the customer. Keep each term to one line in simple language.",
        ],
        list: [
          "Validity: \"This quotation is valid for 15 days from the date above.\" Prices of material change, so never leave validity open.",
          "Payment: say how much advance you need and when the balance is due, for example \"50% advance, balance on delivery\".",
          "Delivery or completion: give a realistic time from the date of the order or advance, not from the quotation date.",
          "Exclusions: list what you are not doing. Civil work, transport, or permissions are common exclusions.",
          "Warranty: mention the manufacturer warranty and any service warranty you give yourself.",
        ],
      },
      {
        heading: "Common quotation format mistakes",
        list: [
          "No quotation number, so neither side can refer to it later.",
          "One lumpsum figure with no breakup. Customers assume you are hiding margin.",
          "No validity date, so a customer comes back after three months expecting the old price.",
          "Tax not mentioned, so the customer thinks your price includes GST and then disputes the bill.",
          "Sending a photo of a handwritten page. It works, but it looks less professional than a clean PDF.",
        ],
      },
      {
        heading: "Making this format without Word or Excel",
        paragraphs: [
          "You can build this format in Word or Excel, but keeping totals correct and the layout neat on a phone is slow. [Quotely Pro](/quotation-maker-app) is a quotation maker that works in your phone browser. You add items with quantity, unit and rate, the totals are calculated for you, and you download a branded PDF with your logo, terms and signature. Then you send that PDF to your customer on WhatsApp.",
          "Once a customer accepts, you can turn the same quotation into an invoice. If you are not sure about the difference between the two documents, read [quotation vs invoice](/quotation-vs-invoice).",
        ],
      },
    ],
    sample: {
      heading: "Sample quotation (trader supplying office furniture)",
      from: "Sharma Office Solutions, Pune",
      to: "Brightline Accounting Services, Baner, Pune",
      subject: "Supply of furniture for new office cabin",
      items: [
        { name: "Mesh back office chair with arms, height adjustable", qty: 6, unit: "Nos", rate: 4850, gst: 18 },
        { name: "Executive table 5 ft x 2.5 ft, with side drawer unit", qty: 1, unit: "Nos", rate: 14500, gst: 18 },
        { name: "Workstation table 4 ft x 2 ft, laminate top", qty: 4, unit: "Nos", rate: 6200, gst: 18 },
        { name: "Steel storage cupboard, 4 shelves, with lock", qty: 2, unit: "Nos", rate: 9800, gst: 18 },
        { name: "Visitor chair, cushioned, fixed base", qty: 3, unit: "Nos", rate: 2350, gst: 18 },
        { name: "Delivery and assembly at site", qty: 1, unit: "Job", rate: 2500, gst: 18 },
      ],
      terms: [
        "Valid for 15 days from the quotation date.",
        "50% advance with order, balance on delivery.",
        "Delivery within 7 working days of advance.",
        "Manufacturer warranty: 1 year on chairs against manufacturing defects.",
      ],
    },
    ctaContext: "making quotations",
    faqs: [
      {
        q: "What is the correct format of a quotation?",
        a: "A correct quotation has your business details, the word \"Quotation\" with a number and date, the customer's details, a subject line, an item table with quantity, unit, rate and amount, the totals with tax, terms such as validity and payment, and your payment details and signature.",
      },
      {
        q: "Is a quotation legally binding in India?",
        a: "A quotation is an offer, not a bill. Once the customer accepts it, for example by giving a purchase order or paying an advance, it can become a contract under the Indian Contract Act, 1872. That is why the validity date, terms and exclusions on a quotation matter.",
      },
      {
        q: "Should I show GST on a quotation?",
        a: "Yes, if you are GST registered, show the tax rate and amount on the quotation so the customer knows the final payable figure. A quotation is not a tax invoice, so no GST is actually charged until you issue the invoice. If you are not registered, write that prices are without GST.",
      },
      {
        q: "How long should a quotation be valid?",
        a: "Most small businesses keep quotations valid for 7 to 30 days. Use a shorter period when your material prices change often, such as metals, cables or electronics, and always write the validity on the quotation itself.",
      },
      {
        q: "How should I number my quotations?",
        a: "Use a simple running series that includes the financial year, such as QT/2026-27/001, QT/2026-27/002. The Indian financial year runs from April to March, so start a new series every April. A clear number lets you and the customer refer to the right quotation later.",
      },
      {
        q: "Can I send a quotation on WhatsApp?",
        a: "Yes. Most customers in India prefer a PDF quotation on WhatsApp. Send a PDF rather than a photo or typed message, because a PDF keeps the layout, looks professional, and can be forwarded to the person who approves the payment.",
      },
    ],
  },
  {
    slug: "quotation-maker-app",
    kind: "guide",
    navLabel: "Quotation maker app",
    title: "Quotation Maker App for Small Businesses | Quotely Pro",
    description:
      "Make item-wise quotations on your phone, download a branded PDF and send it on WhatsApp. Quotely Pro is a quotation maker for small businesses in India.",
    h1: "Quotation Maker App for Small Businesses in India",
    intro: [
      "Quotely Pro is a quotation maker that runs in your phone's browser. You add the items, quantities and rates, and it gives you a clean, branded PDF quotation. You download the PDF and send it to your customer on WhatsApp while you are still at the site.",
      "It is quotation-first, with invoices included. When the customer accepts, you turn the quotation into an invoice with the customer and items already filled in. Quotely Pro does not do accounting or GST returns, so keep Tally, Vyapar, myBillBook, Zoho or your CA's system for books and GST returns if you need them.",
    ],
    sections: [
      {
        heading: "How it works",
        orderedList: [
          "Open Quotely Pro in Chrome or any browser on your phone, tablet or computer. There is nothing to install.",
          "Add your items. Pick them from your saved item list so names and rates fill in automatically, or type new ones with quantity, unit and rate.",
          "Check the totals. Line amounts and the total are calculated for you, and you can drag items to change their order.",
          "Download the PDF. It carries your logo, colours, terms and conditions, signature and, if you want, a payment QR code.",
          "Send it on WhatsApp. Attach the PDF in your customer's chat, or email it, the same way you send any file.",
        ],
      },
      {
        heading: "Why small businesses lose jobs on quotations",
        paragraphs: [
          "In most small businesses, the quotation is made at night after site work. The customer asked in the morning, a competitor sent a figure by afternoon, and by the time your neat Excel sheet is ready the customer has already decided. Speed wins more small jobs than price does.",
          "The other problem is repetition. An installer or contractor sends nearly the same quotation again and again with small changes in quantity. Retyping the same 15 lines every time is where mistakes and delays come from. Quotely Pro is built around reusing what you have already typed.",
        ],
      },
      {
        heading: "Everything you need, in one app",
        paragraphs: [
          "Quotely Pro covers the whole quotation stage of a job, from the first quotation to the advance, the invoice and the warranty. Every feature below is in the app today.",
        ],
        features: true,
      },
      {
        heading: "Who it is for",
        paragraphs: [
          "Quotely Pro suits any small business that sends quotations with a list of items. Installers use it for [CCTV](/cctv-quotation-format), [solar](/solar-installation-quotation-format) and [electrical](/electrical-work-quotation-format) jobs. Contractors and designers use it for site work such as [interiors](/interior-design-quotation-format). Traders use it to price supplies for shops and offices, and freelancers use it to quote projects and services.",
          "If your quotation is a single line with one price, you may not need a tool at all. Quotely Pro is most useful when you send many quotations with 5 to 50 line items each, and many of them look alike.",
        ],
      },
      {
        heading: "What Quotely Pro does not do",
        paragraphs: [
          "It helps to be clear. Quotely Pro does not do accounting. It does not maintain your books or ledgers, manage stock, use HSN codes or split CGST, SGST and IGST, and it does not file GST returns. It does not send WhatsApp messages for you; you download the PDF and share it yourself. There is no Play Store or App Store app; it is a web app that works in the browser on any phone.",
          "If you need books and GST returns, keep your accounting software for those. If you mainly send quotations and simple invoices, Quotely Pro can be enough on its own.",
        ],
      },
      {
        heading: "Getting started",
        paragraphs: [
          "Accounts are set up personally right now. Message us on WhatsApp and we set up your account with your logo and terms. 7-day free trial. No payment needed. After the trial, plans start at ₹999 per month. Final price. No hidden charges. To see what goes into a good quotation first, read our [quotation format guide](/quotation-format).",
        ],
      },
    ],
    ctaContext: "my business",
    faqs: [
      {
        q: "Is Quotely Pro an Android or iPhone app?",
        a: "Quotely Pro is a web app. You open quotelypro.in in Chrome, Safari or any browser on your Android phone, iPhone, tablet or computer and sign in. There is nothing to download from the Play Store or App Store.",
      },
      {
        q: "How do I send a quotation to my customer on WhatsApp?",
        a: "In Quotely Pro you download the quotation as a PDF to your phone. Then open your customer's WhatsApp chat, tap attach, choose Document, and select the PDF. The app does not send WhatsApp messages on its own.",
      },
      {
        q: "Does Quotely Pro replace Tally, Vyapar or myBillBook?",
        a: "Partly. It covers quotations and invoices. It does not do accounting, GST returns or stock, so GST-registered businesses usually keep Tally, Vyapar or myBillBook for those.",
      },
      {
        q: "Can I reuse an old quotation?",
        a: "Yes. Open any saved quotation and use Copy to start a new quotation with the same items. Change the customer, quantities or rates, and save it as a new quotation with its own number.",
      },
      {
        q: "Does the AI decide my prices?",
        a: "No. AI Quick Create picks matching items, quantities and prices from your saved catalogue. It uses the prices you have saved and does not suggest new ones. If an item is not in your catalogue, you add it yourself.",
      },
      {
        q: "Is there a free trial?",
        a: "Yes. 7-day free trial. No payment needed. Message us on WhatsApp and we set up your account.",
      },
    ],
  },
  {
    slug: "quotation-vs-invoice",
    kind: "guide",
    navLabel: "Quotation vs invoice",
    title: "Quotation vs Invoice: Key Differences | Quotely Pro",
    description:
      "A quotation is a price offer before the work; an invoice is a bill after it. Learn the differences, the order to send them in, and where GST applies.",
    h1: "Quotation vs Invoice: What Is the Difference?",
    intro: [
      "A quotation is the price you offer before the customer agrees to buy. An invoice is the bill you raise after the goods are supplied or the work is done. One asks \"Do you want this at this price?\"; the other says \"Please pay this amount.\"",
      "Small business owners often mix them up, especially when the same items appear on both. This page explains the difference in plain words, the order in which the documents are used, and the related documents you will come across: estimates, proforma invoices and receipts.",
    ],
    sections: [
      {
        heading: "Quotation vs invoice at a glance",
        compare: {
          columns: ["", "Quotation", "Invoice"],
          rows: [
            ["When it is sent", "Before the sale, after an enquiry", "After delivery or completion of work"],
            ["Purpose", "To offer a price and win the job", "To ask for payment"],
            ["Can it change?", "Yes, it can be revised and resent", "Should not be edited once issued; issue a credit or debit note instead"],
            ["Validity", "Valid for a stated period, like 15 days", "Has a due date for payment"],
            ["Tax", "Shows estimated tax; no tax is charged yet", "A tax invoice is the document on which GST is charged"],
            ["Numbering", "Own series, e.g. QT/2026-27/014", "Separate, continuous series, e.g. INV/2026-27/009"],
            ["Customer's action", "Accepts, negotiates or rejects", "Pays"],
          ],
        },
      },
      {
        heading: "The order in which you use them",
        paragraphs: [
          "For most small businesses the flow is the same, whether you sell goods, services or both.",
        ],
        orderedList: [
          "The customer enquires and tells you what they need.",
          "You send a quotation with items, quantities, rates and terms.",
          "The customer accepts, sometimes with changes. Larger customers send a purchase order.",
          "If you take an advance, you give a receipt for it.",
          "You deliver the goods or finish the work.",
          "You raise the invoice for the final amount, adjusting any advance already paid.",
          "The customer pays the balance.",
        ],
      },
      {
        heading: "Why the difference matters for GST",
        paragraphs: [
          "If you are GST registered, the tax invoice is the legal document for charging GST. Its number, date and contents are reported in your GST returns. A quotation is never reported; it only tells the customer what the tax is likely to be.",
          "This is why you should not hand over a quotation as a final bill, or keep editing an invoice the way you revise a quotation. Keep the two in separate number series and let your accountant handle invoice compliance. The quotation, meanwhile, is your sales tool, and you can change it as many times as you need to close the deal.",
        ],
      },
      {
        heading: "Estimate, proforma invoice and receipt",
        list: [
          "Estimate: an approximate cost when you cannot fix the final quantity yet, such as repair work. A quotation is a firmer offer.",
          "Proforma invoice: looks like an invoice but is sent before supply, often so a company can release an advance or arrange funds. It is not a tax invoice.",
          "Receipt: confirms money you have received, for example an advance against a quotation.",
        ],
      },
      {
        heading: "Moving from quotation to invoice without retyping",
        paragraphs: [
          "Retyping the same items from a quotation into an invoice wastes time and invites mistakes. In [Quotely Pro](/quotation-maker-app) you can convert an accepted quotation into an invoice so the customer and items carry over. If the customer pays a booking amount, you can give an advance receipt as well. All three documents are downloaded as PDFs that you can send on WhatsApp.",
          "To get the first document right, see the [quotation format](/quotation-format) checklist.",
        ],
      },
    ],
    ctaContext: "quotations and invoices",
    faqs: [
      {
        q: "What is the main difference between a quotation and an invoice?",
        a: "A quotation is a price offer sent before the customer agrees to buy. An invoice is a bill sent after the goods or services are delivered, asking for payment. A quotation can be revised; an invoice is a final record of the sale.",
      },
      {
        q: "Can a quotation be used as an invoice?",
        a: "No. A quotation does not record a completed sale, so it cannot be used to collect payment or claim tax. Once the customer accepts and the work is done, issue a proper invoice.",
      },
      {
        q: "Is GST charged on a quotation?",
        a: "No. GST is charged on the tax invoice, not on the quotation. A quotation from a GST-registered business usually shows the expected tax so the customer knows the full amount they will pay.",
      },
      {
        q: "What is the difference between a proforma invoice and a quotation?",
        a: "Both are sent before supply. A quotation offers a price and waits for acceptance. A proforma invoice is usually sent after the customer has agreed, to confirm the amount and help them release an advance or arrange payment. Neither is a tax invoice.",
      },
      {
        q: "Should quotations and invoices have separate numbers?",
        a: "Yes. Keep a separate series for each, such as QT/2026-27/001 for quotations and INV/2026-27/001 for invoices. Invoice numbers should be continuous and unique within a financial year.",
      },
    ],
  },
  {
    slug: "free-quotation-maker",
    kind: "guide",
    navLabel: "Free quotation maker",
    title: "Free Quotation Maker for Small Businesses | Quotely Pro",
    description:
      "Quotely Pro has a 7-day free trial with no payment needed, then plans from ₹999/month. What you get, how it works, and free options.",
    h1: "Free Quotation Maker: 7-Day Free Trial, No Payment Needed",
    intro: [
      "If you searched for a free quotation maker, here is the honest answer up front. Quotely Pro has a 7-day free trial, and no payment is needed. After the trial it is a paid tool, from ₹999 per month. There is no free-forever plan.",
      "This page explains exactly what you get in the free trial, how to make your first quotation, what happens when the trial ends, and which free options make more sense if you only send a few quotations a year.",
    ],
    sections: [
      {
        heading: "What you get in the 7-day free trial",
        list: [
          "Unlimited quotations, each with item, quantity, unit, rate and amount.",
          "Your saved item catalogue and copy quotation, so repeat quotations take seconds.",
          "Your logo, colours, terms and conditions, signature and payment QR code on every PDF.",
          "Account setup on WhatsApp: we create your account and add your logo and terms.",
          "No payment needed. You do not enter any payment details to start.",
        ],
      },
      {
        heading: "What happens after the 7 days",
        paragraphs: [
          "When the trial ends, you choose a paid plan to keep creating quotations. Basic is ₹999 per month or ₹9,999 per year, Pro is ₹1,499 per month or ₹14,999 per year, and Business is ₹2,999 per month or ₹29,999 per year. Final price. No hidden charges. If you do not renew, your quotations and data stay saved, and you can pick a plan any time to continue.",
          "We would rather you know this now than feel surprised later. A quotation tool is worth paying for only if you send quotations often. Use the 7 days for real customer quotations, not test ones, and you will know whether it is faster than your current method.",
        ],
      },
      {
        heading: "How to make your first quotation",
        orderedList: [
          "Message us on WhatsApp. We create your account and add your logo and terms.",
          "Open Quotely Pro in your phone browser and add the items you sell most, with your rates. This is a one-time step.",
          "Start a new quotation, pick the items, and enter quantities. Totals are calculated for you.",
          "Download the PDF and send it to your customer on WhatsApp.",
          "Next time, copy that quotation or use AI Quick Create: type what you need in plain words, and AI picks the matching items, quantities and prices from your saved catalogue.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "When a free template is the better choice",
        paragraphs: [
          "If you send one or two quotations a month, you probably do not need a paid quotation maker. A Word or Excel template, or a free spreadsheet in Google Sheets, will do the job. Copy the layout from our [quotation format](/quotation-format) guide and keep one master file.",
          "A dedicated tool starts paying for itself when you send quotations every week, when your quotations have many line items, or when you are quoting from a site on your phone. That is when retyping items, fixing totals and formatting a document on a small screen eat into your day. See [Quotely Pro vs Excel](/quotely-pro-vs-excel-quotations) for a fair comparison.",
        ],
      },
      {
        heading: "Free quotation maker vs free accounting software",
        paragraphs: [
          "Some billing and accounting apps include quotations among many other features. If you already use one for invoices and books, try its quotation option first. Quotely Pro is built around quotations and turns them into invoices, so it is quicker for the quote-to-invoice flow; for books and GST returns, keep your accounting software. Our guide on [quotation vs invoice](/quotation-vs-invoice) explains where each document fits.",
        ],
      },
    ],
    sample: {
      heading: "Sample quotation made during the free trial (pest control service)",
      from: "GreenShield Pest Control, Hyderabad",
      to: "Sunrise Apartments Welfare Association, Kondapur",
      subject: "General pest control and termite treatment for common areas",
      items: [
        { name: "General pest control (cockroach, ants), common areas and basement", qty: 1, unit: "Service", rate: 6500, gst: 18 },
        { name: "Rodent control with bait stations", qty: 12, unit: "Stations", rate: 350, gst: 18 },
        { name: "Anti-termite drill-fill-seal treatment, ground floor", qty: 1800, unit: "Sq ft", rate: 9, gst: 18 },
        { name: "Mosquito fogging, outdoor areas", qty: 4, unit: "Visits", rate: 1200, gst: 18 },
        { name: "Follow-up inspection after 30 days", qty: 1, unit: "Visit", rate: 0, gst: 18 },
      ],
      terms: [
        "Valid for 15 days.",
        "Termite treatment carries a 1-year service warranty.",
        "Residents to keep food covered during treatment.",
        "Payment: full amount after the first service visit.",
      ],
    },
    ctaContext: "the 7-day free trial",
    faqs: [
      {
        q: "Is Quotely Pro a free quotation maker?",
        a: "Quotely Pro has a 7-day free trial, and no payment is needed. After that it is a paid tool, with plans from ₹999 per month. Final price. No hidden charges. There is no permanent free plan.",
      },
      {
        q: "Do I need to pay anything for the free trial?",
        a: "No. You start by messaging us on WhatsApp. We set up your account without any payment details, and you decide at the end of the 7 days whether to choose a paid plan.",
      },
      {
        q: "Are quotations limited during the free trial?",
        a: "No. You can make unlimited quotations during the 7-day free trial.",
      },
      {
        q: "What is the best free option if I only send a few quotations?",
        a: "If you send only a few quotations a month, a Word, Excel or Google Sheets template is usually enough. Use a standard quotation format with your business details, an item table, totals, terms and validity, and keep one master file to copy.",
      },
      {
        q: "Can I make quotations online for free on my phone?",
        a: "Yes, during the 7-day free trial of Quotely Pro. It runs in your phone browser, so you make the quotation, download the PDF and send it on WhatsApp without installing anything.",
      },
    ],
  },
];

export const INDUSTRY_PAGES = [
  {
    slug: "cctv-quotation-format",
    kind: "industry",
    navLabel: "CCTV installation",
    title: "CCTV Quotation Format (Free Sample + Excel)",
    description:
      "CCTV quotation format with a sample for an IP camera job: cameras, NVR, hard disk, cabling and installation. What to write, and what to leave out.",
    h1: "CCTV Quotation Format",
    intro: [
      "A CCTV quotation is easy to get wrong because the customer usually knows only one number: how many cameras they want. Everything else, such as the recorder, storage, cable length and power points, is invisible to them until something goes wrong. A good CCTV quotation explains the full system on one page so the customer can compare you fairly with a cheaper installer.",
      "Below is what to include, a sample quotation for a 6-camera IP system for a shop, and answers to the questions customers ask most.",
    ],
    sections: [
      {
        heading: "What a good CCTV quotation includes",
        list: [
          "System type: say clearly whether it is an IP system with an NVR or an HD analog system with a DVR. They need different cameras, cables and recorders, and customers often compare one with the other without knowing.",
          "Camera details: resolution (2MP, 4MP, 5MP), dome or bullet, indoor or outdoor, night vision range, and whether audio or colour night vision is included. Mention the brand and model if you can.",
          "Recorder and channels: an 8-channel NVR for 6 cameras leaves room to add two more later. Customers value being told this.",
          "Storage: hard disk size and roughly how many days of recording it gives for this setup.",
          "Cabling: cable type (Cat6 for IP, coaxial for analog) and quantity in metres. State whether it is measured at site or estimated.",
          "Accessories and power: PoE switch or PoE NVR, connectors, junction boxes, conduit, power supply and rack.",
          "Installation and setup: fixing, cabling, configuration and mobile viewing setup on the customer's phone.",
          "Exclusions and warranty: what you are not providing, and the warranty on cameras, recorder and hard disk.",
        ],
      },
      {
        heading: "Quoting cable length without surprises",
        paragraphs: [
          "Cable is where most CCTV quotations go wrong. If you quote 100 metres and use 160, either you lose money or you have an awkward call asking for more. If you visited the site, measure each camera's route back to the recorder and add 10 to 15 percent for bends and drops. If you are quoting from a phone call, say so: write \"Cable estimated at 180 m; billed as per actual\" and give the per-metre rate.",
          "Also state the route. Surface conduit along the wall is cheaper and faster than concealed wiring that needs chasing. If the customer expects concealed work, quote it as a separate line so they can see the cost difference.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "How many days of recording to promise",
        paragraphs: [
          "Customers often ask \"How many days of recording will I get?\" and the honest answer depends on the number of cameras, resolution, compression (H.264, H.265) and whether recording is continuous or motion-based. As a rough guide, six 4MP cameras recording all the time on H.265 fill a 2TB disk in about 8 to 15 days. Motion-based recording stretches that much further.",
          "Write the number you expect on the quotation, with \"approximately\". If the customer needs 30 days for insurance or a society rule, quote a bigger disk now rather than explaining later why footage is missing.",
        ],
      },
      {
        heading: "Exclusions worth writing down",
        list: [
          "Electrical power points near the NVR and outdoor cameras.",
          "Internet connection and router, needed for remote viewing on mobile.",
          "Civil work such as wall chasing, false ceiling opening or painting.",
          "Monitor or TV for local display, unless quoted.",
          "Ladder or scaffolding for heights above a normal ladder.",
        ],
      },
      {
        heading: "Make your CCTV quotations faster",
        paragraphs: [
          "Most CCTV jobs use the same 10 to 15 items in different quantities. In [Quotely Pro](/quotation-maker-app) you save your cameras, recorders, disks and cable once with your rates. For the next job you copy a previous quotation, change the camera count and cable metres, and download the PDF to send on WhatsApp from the site itself. After installation you can issue a warranty certificate for the cameras and recorder, and track when warranties end so you can offer an AMC on time.",
          "CCTV jobs often come with [networking](/networking-quotation-format) and [electrical work](/electrical-work-quotation-format). Keep those as separate sections or separate quotations so the customer can approve them independently.",
        ],
      },
    ],
    sample: {
      heading: "Sample CCTV quotation (6 IP cameras for a retail shop)",
      from: "SecureView Systems, Kochi",
      to: "Lakshmi Textiles, MG Road, Kochi",
      subject: "Supply and installation of IP CCTV system (6 cameras)",
      items: [
        { name: "4MP IP dome camera, PoE, 30 m IR night vision, indoor", qty: 4, unit: "Nos", rate: 2450, gst: 18 },
        { name: "4MP IP bullet camera, PoE, 40 m IR, IP67 outdoor", qty: 2, unit: "Nos", rate: 2750, gst: 18 },
        { name: "8-channel NVR with 8 PoE ports, H.265", qty: 1, unit: "Nos", rate: 7800, gst: 18 },
        { name: "2TB surveillance hard disk", qty: 1, unit: "Nos", rate: 5600, gst: 18 },
        { name: "Cat6 cable, copper (estimated, billed as per actual)", qty: 180, unit: "Mtr", rate: 24, gst: 18 },
        { name: "PVC conduit, bends, clamps and junction boxes", qty: 1, unit: "Lot", rate: 1800, gst: 18 },
        { name: "RJ45 connectors and boots", qty: 12, unit: "Pcs", rate: 25, gst: 18 },
        { name: "Installation, configuration and mobile app setup", qty: 6, unit: "Points", rate: 650, gst: 18 },
      ],
      terms: [
        "Valid for 10 days. Camera prices may change after that.",
        "Approx. 8 to 15 days continuous recording on the 2TB disk.",
        "Warranty: cameras and NVR 2 years, hard disk as per manufacturer.",
        "Excludes power points, internet connection and civil work.",
      ],
      // Real screenshot: add frontend/public/screenshots/cctv-quotation-pdf.png and set ready: true
      // (width/height = the file's pixel size).
      productImage: {
        src: "/screenshots/cctv-quotation-pdf.png",
        width: 1240,
        height: 1754,
        alt: "The CCTV sample quotation above, as a PDF made in Quotely Pro",
        caption: "This quotation made in Quotely Pro",
        ready: false,
      },
    },
    ctaContext: "CCTV quotations",
    faqs: [
      {
        q: "What should a CCTV quotation include?",
        a: "A CCTV quotation should state whether the system is IP or analog, then list each camera with resolution and type, the NVR or DVR with channel count, hard disk size, cable type and metres, accessories, installation charges, approximate recording days, warranty and exclusions such as power points and internet.",
      },
      {
        q: "How do I quote cable for CCTV if I have not visited the site?",
        a: "Give an estimated length, mark it \"estimated, billed as per actual\", and show the per-metre rate. This keeps your quotation competitive and avoids a loss if the actual run is longer. After a site visit, replace the estimate with measured lengths plus 10 to 15 percent extra.",
      },
      {
        q: "Should installation charges be shown separately in a CCTV quotation?",
        a: "Yes. Show installation as its own line, usually per camera point or as one job charge. Customers compare equipment prices online, and a separate installation line shows your equipment rates are fair and explains what the labour covers.",
      },
      {
        q: "How many days of recording does a 2TB hard disk give?",
        a: "It depends on camera count, resolution, compression and recording mode. As a rough guide, six 4MP cameras recording continuously on H.265 fill 2TB in about 8 to 15 days. Motion-only recording lasts longer. Write the expected number of days on the quotation.",
      },
      {
        q: "What GST rate applies to CCTV cameras and installation?",
        a: "CCTV cameras, recorders, hard disks, cables and installation services are commonly billed at 18% GST. Rates can change, so confirm the current rate for each item with your accountant before quoting.",
      },
    ],
    related: ["networking-quotation-format", "electrical-work-quotation-format", "ac-installation-service-quotation-format", "solar-installation-quotation-format"],
  },
  {
    slug: "solar-installation-quotation-format",
    kind: "industry",
    navLabel: "Solar installation",
    title: "Solar Installation Quotation Format (Free Sample + Excel)",
    description:
      "Solar quotation format for a 3 kW rooftop on-grid system: panels, inverter, structure, BOS, net metering, subsidy and generation estimate, with a sample.",
    h1: "Solar Installation Quotation Format",
    intro: [
      "A rooftop solar quotation is a bigger decision for the customer than most quotations. They are spending lakhs, comparing three or four installers, and trying to work out subsidy, savings and payback. The installer who explains this clearly on paper usually wins, even at a slightly higher price.",
      "This page covers what to include in a solar installation quotation for a home or small business, with a sample for a 3 kW on-grid rooftop system.",
    ],
    sections: [
      {
        heading: "What a solar quotation must explain",
        list: [
          "System size and type: total capacity in kWp, and whether it is on-grid, off-grid or hybrid. On-grid systems need net metering; off-grid and hybrid need batteries.",
          "Panels: wattage per panel, number of panels, technology (mono PERC, TOPCon, bifacial), brand, and whether they are DCR panels if the customer wants the government subsidy.",
          "Inverter: capacity, brand, phase (single or three phase) and warranty.",
          "Mounting structure: GI or aluminium, height of the elevated structure, and whether it is designed for the local wind speed.",
          "Balance of system: DC and AC cables, ACDB and DCDB with surge protection, earthing and lightning arrester.",
          "Net metering and approvals: who handles the DISCOM application, meter change and inspection, and whether the fee is included.",
          "Generation and savings: an estimated units per day or per year, and what that means for the electricity bill.",
          "Subsidy: what subsidy the customer may get and how it is paid. Keep it separate from your price.",
          "Warranty and service: panel product and performance warranty, inverter warranty, workmanship warranty, and any free cleaning or service visits.",
        ],
      },
      {
        heading: "Show subsidy separately, not as a discount",
        paragraphs: [
          "Under the PM Surya Ghar Muft Bijli Yojana for homes, the central subsidy is credited to the customer's bank account after the system is installed, inspected and commissioned. It is not something the installer deducts from the bill. If you reduce your quotation by the subsidy amount, the customer expects to pay that lower figure upfront, and you end up in an argument at handover.",
          "The clean way is to show the full system price, then a separate note: \"Expected central subsidy for 3 kW residential: up to Rs. 78,000, credited by the government to your account after commissioning. Effective cost after subsidy: Rs. X.\" Subsidy amounts and rules change, so ask the customer to check the national portal and mention that the subsidy needs DCR panels and a registered vendor.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Generation estimate: keep it honest",
        paragraphs: [
          "Customers buy solar for the bill saving, so they will ask how many units the system makes. In most of India, a well-placed rooftop system produces roughly 4 units per kWp per day on average across the year, more in summer and less in the monsoon. A 3.27 kWp system therefore gives about 12 to 14 units a day, or around 4,000 to 4,700 units a year, depending on location, shading and orientation.",
          "Write the estimate as a range, mention shading if there is any, and avoid promising a \"zero bill\". Fixed charges on the electricity bill continue even with solar. An honest estimate protects your reputation when the customer compares bills six months later.",
        ],
      },
      {
        heading: "GST on solar: the 70:30 rule for combined contracts",
        paragraphs: [
          "When you supply the solar system and install it under one contract, GST is usually not worked out line by line. Under the GST rules for solar power generating systems supplied with installation, 70% of the total contract value is treated as goods and 30% as services. The goods part is taxed at 5% and the services part at 18%. That works out to an effective rate of about 8.9% on the whole contract (70% x 5% + 30% x 18% = 3.5% + 5.4%).",
          "A simple worked example: a rooftop system is quoted at Rs. 2,00,000 before tax for supply plus installation. The goods portion is 70%, or Rs. 1,40,000, and GST at 5% on it is Rs. 7,000. The services portion is 30%, or Rs. 60,000, and GST at 18% on it is Rs. 10,800. Total GST is Rs. 17,800, which is 8.9% of Rs. 2,00,000, and the customer pays Rs. 2,17,800.",
          "Show this split clearly in the totals of your quotation, as in the sample above, so the customer understands why the GST is not a single round rate. If you only supply panels without installation, or only do installation for material the customer bought, the 70:30 split does not apply in the same way. GST rates on solar have changed more than once in recent years, so confirm the current treatment with your accountant before you quote.",
        ],
      },
      {
        heading: "Payment terms that work for solar",
        paragraphs: [
          "Solar jobs involve a large material purchase before installation, so stage-wise payment is normal. A common pattern is an advance at order, a major payment when material reaches the site, and the balance after installation, with a small part held until net meter installation if the customer insists. Write the stages and percentages in the quotation so there are no doubts later.",
        ],
      },
      {
        heading: "Preparing solar quotations faster",
        paragraphs: [
          "Most residential solar quotations differ only in system size: the number of panels, the inverter rating and the structure. In [Quotely Pro](/quotation-maker-app) you save your panels, inverters and BOS items with your rates, copy a previous 3 kW quotation to make a 5 kW one, change the quantities, and download a branded PDF to send on WhatsApp. When a customer pays the booking amount, you can give an advance receipt from the same app. After commissioning, issue a warranty certificate listing the panels and inverter with their warranty periods and expiry dates, and see in Reports when each warranty ends so you can offer a cleaning or maintenance contract.",
          "For the wiring side of a solar job, see the [electrical work quotation format](/electrical-work-quotation-format). For the general layout of any quotation, see the [quotation format](/quotation-format) checklist.",
        ],
      },
    ],
    sample: {
      heading: "Sample solar quotation (3.27 kWp on-grid rooftop, residential)",
      from: "SunPath Energy Solutions, Coimbatore",
      to: "Mr. R. Karthik, Saibaba Colony, Coimbatore",
      subject: "Supply and installation of 3.27 kWp on-grid rooftop solar system",
      items: [
        { name: "545 Wp mono PERC DCR solar panel", qty: 6, unit: "Nos", rate: 15200 },
        { name: "3 kW single-phase on-grid inverter with Wi-Fi monitoring", qty: 1, unit: "Nos", rate: 32000 },
        { name: "Hot-dip GI elevated mounting structure", qty: 3.27, unit: "kWp", rate: 8500 },
        { name: "DC solar cable 4 sq mm (red + black)", qty: 40, unit: "Mtr", rate: 75 },
        { name: "AC cable 4 sq mm, inverter to ACDB to meter", qty: 25, unit: "Mtr", rate: 95 },
        { name: "ACDB and DCDB with SPD, MCB and isolator", qty: 1, unit: "Set", rate: 6500 },
        { name: "Chemical earthing kit", qty: 3, unit: "Nos", rate: 2800 },
        { name: "Lightning arrester with earthing", qty: 1, unit: "Nos", rate: 3200 },
        { name: "Net metering application and DISCOM liaison", qty: 1, unit: "Job", rate: 3500 },
        { name: "Installation, testing and commissioning", qty: 1, unit: "Job", rate: 12000 },
      ],
      // One combined supply + installation contract: GST on the 70:30 split, not per line.
      gstSplit: [
        { label: "GST @ 5% on 70% (goods portion)", share: 0.7, rate: 5 },
        { label: "GST @ 18% on 30% (services portion)", share: 0.3, rate: 18 },
      ],
      terms: [
        "Expected generation: approx. 12 to 14 units/day (annual average).",
        "Subsidy is credited by the government after commissioning; not deducted from this quotation.",
        "Payment: 30% with order, 60% on material delivery, 10% after installation.",
        "Warranty: panels 25-year performance, inverter as per manufacturer, workmanship 5 years.",
      ],
    },
    gstNote:
      "GST shown uses the 70:30 split for a combined supply and installation contract (effective about 8.9%). Confirm the current treatment with your accountant.",
    ctaContext: "solar quotations",
    faqs: [
      {
        q: "What should be included in a solar installation quotation?",
        a: "A solar quotation should include system size in kWp and type (on-grid, off-grid or hybrid), panel wattage, count and brand, inverter details, mounting structure, cables, ACDB/DCDB, earthing and lightning arrester, net metering work, installation charges, expected generation, subsidy information, payment stages and warranties.",
      },
      {
        q: "Should the solar subsidy be deducted in the quotation?",
        a: "No. For residential rooftop solar under PM Surya Ghar, the central subsidy is paid by the government into the customer's bank account after commissioning. Show the full price and mention the expected subsidy separately, along with the effective cost after subsidy.",
      },
      {
        q: "How many units does a 3 kW solar system generate per day?",
        a: "In most parts of India a 3 kW rooftop system generates roughly 12 units a day on average across the year, based on about 4 units per kW per day. Actual generation depends on location, season, shading, tilt and panel cleaning.",
      },
      {
        q: "What GST applies to a rooftop solar system?",
        a: "For a combined contract to supply and install a solar system, 70% of the contract value is treated as goods taxed at 5% and 30% as services taxed at 18%, an effective rate of about 8.9%. On a Rs. 2,00,000 contract that is Rs. 7,000 plus Rs. 10,800, or Rs. 17,800 GST. Confirm the current rules with your accountant before quoting.",
      },
      {
        q: "What are DCR solar panels and why do they matter in a quotation?",
        a: "DCR (Domestic Content Requirement) panels use solar cells made in India. Residential subsidy schemes require DCR panels, so if the customer wants the subsidy, the quotation must specify DCR panels. Non-DCR panels can be cheaper but do not qualify.",
      },
      {
        q: "What payment terms are common for solar installation?",
        a: "A common structure is an advance with the order, a larger payment when panels and inverter are delivered to the site, and the balance after installation and testing. Write the percentages for each stage in the quotation.",
      },
    ],
    related: ["electrical-work-quotation-format", "construction-quotation-format", "cctv-quotation-format"],
  },
  {
    slug: "electrical-work-quotation-format",
    kind: "industry",
    navLabel: "Electrical work",
    title: "Electrical Work Quotation Format (Free Sample + Excel)",
    description:
      "Electrical quotation format for house wiring: wire sizes, points, DB, MCB and RCCB, labour per point and exclusions, with a sample for a 2BHK flat.",
    h1: "Electrical Work Quotation Format",
    intro: [
      "Electrical work is one of the hardest jobs to quote because the customer cannot see most of it. Once the walls are plastered, nobody knows whether you used 1.5 sq mm or 2.5 sq mm wire, or a branded MCB or a cheap one. A detailed quotation is how a good electrician proves the quality of work the customer will never see.",
      "This page explains how to write an electrical work quotation, the different ways electricians charge, and gives a sample for rewiring a 2BHK flat.",
    ],
    sections: [
      {
        heading: "Three ways to price electrical work",
        paragraphs: [
          "Choose the pricing method before you write the quotation, and say which one you are using. Customers get confused when one electrician quotes per point and another quotes per square foot.",
        ],
        list: [
          "Per point: a rate for each light, fan, socket or switch point. Most common for house wiring, and easy for the customer to check by counting points.",
          "Per square foot: a single rate multiplied by the built-up area. Simple, but customers cannot see what is included, so list the number of points it covers.",
          "Material plus labour: material listed item by item at your rates, with labour as a separate figure. Best for repairs, renovation and commercial jobs where quantities vary.",
        ],
      },
      {
        heading: "What an electrical quotation should include",
        list: [
          "Wire sizes and brand: 1.5 sq mm for lights and fans, 2.5 sq mm for 6A and 16A sockets, 4 sq mm or more for AC and geyser circuits. Name the brand and say FR or FRLS insulation.",
          "Point count: lights, fans, 6A sockets, 16A sockets, AC and geyser points, TV and data points, listed by room if possible.",
          "Distribution board and protection: number of ways in the DB, MCB ratings, and an RCCB for shock protection.",
          "Conduit and boxes: PVC conduit size, concealed or surface, and modular boxes.",
          "Switches and plates: modular range and brand, or \"customer to supply\".",
          "Earthing: whether new earthing is included, or connection to existing earth.",
          "Testing: insulation resistance and earth continuity checks before handover.",
          "Exclusions: civil chasing and plaster patching, painting, light fittings and fans supply, and DISCOM load enhancement.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Writing safety into the quotation",
        paragraphs: [
          "An RCCB costs a little more and is the one item most likely to save a life in a home. Put it in your standard quotation instead of offering it as an option, and explain in one line what it does: it cuts power when current leaks to earth, for example through a person. Customers rarely remove it once they understand.",
          "Similarly, write the wire size against heavy loads. If the customer later adds a 1.5 ton AC to a socket wired in 1.5 sq mm, the quotation shows that the circuit was designed for a lighter load. That protects you.",
        ],
      },
      {
        heading: "Renovation and repair jobs",
        paragraphs: [
          "For partial rewiring or repair, you often cannot know the full scope until you open the boards. Quote the known work clearly, then add a line such as \"Additional points or faults found during work will be charged at Rs. 450 per point after approval.\" This keeps your quotation honest and gives you a fair way to charge for surprises.",
        ],
      },
      {
        heading: "Faster electrical quotations",
        paragraphs: [
          "Electricians quote the same wires, switches and MCBs again and again. In [Quotely Pro](/quotation-maker-app) you save your materials and per-point labour rate once. For each new job, copy a similar quotation, change the coil count and point count, and download the PDF to send to the customer on WhatsApp. When the job is done, convert the quotation into an invoice without retyping.",
          "If the same customer also wants cameras or panels, see the [CCTV quotation format](/cctv-quotation-format) and [solar installation quotation format](/solar-installation-quotation-format).",
        ],
      },
    ],
    sample: {
      heading: "Sample electrical quotation (concealed rewiring of a 2BHK flat)",
      from: "Shree Ganesh Electricals, Nagpur",
      to: "Mrs. Priya Deshmukh, Dharampeth, Nagpur",
      subject: "Complete concealed rewiring of 2BHK flat (42 points)",
      items: [
        { name: "FR copper wire 1.5 sq mm, 90 m coil (lights and fans)", qty: 4, unit: "Coil", rate: 1950, gst: 18 },
        { name: "FR copper wire 2.5 sq mm, 90 m coil (sockets)", qty: 3, unit: "Coil", rate: 3100, gst: 18 },
        { name: "FR copper wire 4 sq mm, 90 m coil (AC and geyser)", qty: 1, unit: "Coil", rate: 4900, gst: 18 },
        { name: "PVC conduit 25 mm, 3 m length, with bends", qty: 40, unit: "Pcs", rate: 85, gst: 18 },
        { name: "Modular switches and sockets, 6A and 16A", qty: 38, unit: "Nos", rate: 120, gst: 18 },
        { name: "Modular boxes with cover plates", qty: 14, unit: "Nos", rate: 210, gst: 18 },
        { name: "8-way SPN distribution board", qty: 1, unit: "Nos", rate: 2300, gst: 18 },
        { name: "MCB 6A to 32A, single pole", qty: 8, unit: "Nos", rate: 280, gst: 18 },
        { name: "RCCB 40A, 30 mA, double pole", qty: 1, unit: "Nos", rate: 2400, gst: 18 },
        { name: "Wiring labour per point, including testing", qty: 42, unit: "Points", rate: 450, gst: 18 },
      ],
      terms: [
        "Wall chasing included; plaster patching and painting excluded.",
        "Fans, lights and fittings to be supplied by customer.",
        "Extra points after approval: Rs. 450 per point.",
        "Workmanship warranty: 1 year from handover.",
      ],
    },
    ctaContext: "electrical quotations",
    faqs: [
      {
        q: "What should an electrical work quotation include?",
        a: "An electrical quotation should state the pricing method, wire sizes and brand, the number and type of points, distribution board with MCB and RCCB ratings, conduit and switch details, earthing, testing, labour charges, exclusions such as civil work and fittings, and the workmanship warranty.",
      },
      {
        q: "What is per point rate in electrical work?",
        a: "Per point rate is a labour charge for each electrical outlet, such as a light, fan, socket or switch point. Customers can check the bill by counting points. In many Indian cities, house wiring labour is quoted per point, with material charged separately or included at a higher point rate.",
      },
      {
        q: "Which wire size should I use for house wiring?",
        a: "Commonly, 1.5 sq mm copper wire is used for lights and fans, 2.5 sq mm for sockets, and 4 sq mm or higher for air conditioners and geysers. Larger loads or long runs may need heavier wire. Write the wire size against each circuit in your quotation.",
      },
      {
        q: "Should an RCCB be included in a house wiring quotation?",
        a: "Yes. An RCCB trips when current leaks to earth, such as through a person touching a faulty appliance, and protects against electric shock. Include it in the standard quotation rather than as an optional extra.",
      },
      {
        q: "How do I quote electrical repair work when the fault is unknown?",
        a: "Quote the inspection and known work clearly, then add a line stating the rate for extra points or repairs found during work, chargeable after customer approval. This avoids underquoting and gives the customer a fair basis for extra charges.",
      },
    ],
    related: ["solar-installation-quotation-format", "ac-installation-service-quotation-format", "plumbing-quotation-format", "cctv-quotation-format"],
  },
  {
    slug: "interior-design-quotation-format",
    kind: "industry",
    navLabel: "Interior design",
    title: "Interior Design Quotation Format (Free Sample + Excel)",
    description:
      "Interior design quotation format for a 2BHK: modular kitchen, wardrobes, TV unit, false ceiling and design fee, with materials and payment stages.",
    h1: "Interior Design Quotation Format",
    intro: [
      "Two interior quotations for the same flat can differ by lakhs, and the customer usually cannot tell why. The difference is almost always in materials, finishes and hardware that were never written down. A clear interior design quotation turns your price into a specification the customer can compare, so you compete on quality instead of only on the final number.",
      "This page shows how to structure an interior design quotation, which material details to always specify, and a sample for a 2BHK flat.",
    ],
    sections: [
      {
        heading: "Organise the quotation room by room",
        paragraphs: [
          "Customers think in rooms, not in materials. Group your quotation by kitchen, master bedroom, second bedroom, living room and so on, with a subtotal for each. When the budget is tight, the customer can drop or postpone a room without asking you to rework the whole quotation. Add common items such as design fee, false ceiling and site supervision at the end.",
        ],
      },
      {
        heading: "Material details that must be written",
        list: [
          "Carcass material: BWP (boiling water proof) plywood, MR plywood, HDHMR or particle board. Kitchens and bathrooms need BWP or a water-resistant board.",
          "Thickness: 18 mm for carcass and shutters, 6 mm or 8 mm for back panels is common. Thinner boards are a usual way to cut cost unseen.",
          "Finish: laminate, acrylic, PU paint, veneer or membrane, with the thickness of laminate (for example 1 mm).",
          "Hardware: hinges, channels, lift-ups and baskets, with brand and whether soft-close. Hardware is often a large share of the cost.",
          "Countertop: granite, quartz or other, with thickness and edge profile.",
          "Measurement basis: say whether furniture is priced on front (elevation) area in square feet, on running feet, or as a unit price.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Design fee, revisions and 3D views",
        paragraphs: [
          "State how you charge for design: a fixed fee, a per square foot fee, or included in execution. Mention how many 3D views and revisions are included. Customers who change the kitchen layout five times should know in advance that revisions beyond the included number are charged, and what each costs.",
          "If the design fee is adjusted against execution when the customer gives you the full job, write that clearly. It is a strong reason for them to give you the work rather than take your drawings to a cheaper carpenter.",
        ],
      },
      {
        heading: "Payment stages and timeline",
        paragraphs: [
          "Interior jobs are usually paid in stages tied to progress. A common pattern is a booking amount at signing, a large payment before production of modular units, a payment when material reaches the site, and the balance at handover. Write the percentage and the trigger for each stage.",
          "Give a timeline in weeks from design sign-off, not from the quotation date, and list what the customer must do on time, such as approving designs and clearing the site, so delays are not blamed on you.",
        ],
      },
      {
        heading: "Common exclusions",
        list: [
          "Civil work: breaking walls, plumbing changes, tiling and waterproofing.",
          "Appliances: chimney, hob, oven and sinks unless listed.",
          "Painting of walls and ceilings outside the false ceiling scope.",
          "Loose furniture, curtains, decor items and lights unless quoted.",
          "Society deposits, lift charges and debris removal permits.",
        ],
      },
      {
        heading: "Quote interiors faster",
        paragraphs: [
          "Interior quotations are long and change often as the customer adjusts the design. In [Quotely Pro](/quotation-maker-app) you save your standard units and per square foot rates, copy a previous 2BHK quotation, adjust the areas and download a branded PDF with your terms to send on WhatsApp. When the booking amount comes in, you can give an advance receipt. The electrical side of interior work is covered in the [electrical work quotation format](/electrical-work-quotation-format).",
        ],
      },
    ],
    sample: {
      heading: "Sample interior design quotation (2BHK flat, selected work)",
      from: "Nest & Form Interiors, Bengaluru",
      to: "Mr. and Mrs. Iyer, Whitefield, Bengaluru",
      subject: "Interior work for 2BHK: kitchen, wardrobes, TV unit and ceiling",
      items: [
        { name: "Design, 2D layout and 3D views (2 revisions)", qty: 1, unit: "Job", rate: 15000, gst: 18 },
        { name: "Modular kitchen, BWP plywood 18 mm, 1 mm laminate", qty: 110, unit: "Sq ft", rate: 1450, gst: 18 },
        { name: "Quartz countertop, 20 mm, with backsplash strip", qty: 24, unit: "Rft", rate: 850, gst: 18 },
        { name: "Sliding wardrobes, MR plywood 18 mm, laminate finish", qty: 84, unit: "Sq ft", rate: 1350, gst: 18 },
        { name: "TV unit with open shelves and back panel", qty: 32, unit: "Sq ft", rate: 1200, gst: 18 },
        { name: "Hardware: soft-close hinges, channels, tandem baskets", qty: 1, unit: "Set", rate: 18500, gst: 18 },
        { name: "Gypsum false ceiling with cove, living and bedroom", qty: 420, unit: "Sq ft", rate: 95, gst: 18 },
        { name: "Site supervision and installation", qty: 1, unit: "Job", rate: 12000, gst: 18 },
      ],
      terms: [
        "Payment: 10% booking, 50% before production, 30% on delivery, 10% at handover.",
        "Timeline: 6 to 8 weeks from final design sign-off.",
        "Appliances, civil work and painting are excluded.",
        "Warranty on modular units against manufacturing defects as per agreement.",
      ],
    },
    ctaContext: "interior design quotations",
    faqs: [
      {
        q: "What should an interior design quotation include?",
        a: "An interior design quotation should list work room by room, with carcass material and thickness, finish, hardware brand, countertop, measurement basis, design fee and number of revisions, payment stages, timeline from design sign-off, exclusions such as civil work and appliances, and warranty terms.",
      },
      {
        q: "How do interior designers charge for modular kitchens?",
        a: "Most interior designers in India price modular kitchens per square foot of front area, with countertops per running foot and hardware listed separately. Some quote a fixed unit price. The quotation should state which basis is used so customers can compare correctly.",
      },
      {
        q: "What is the difference between BWP and MR plywood in a quotation?",
        a: "BWP (boiling water proof) plywood resists water and is used for kitchens and wet areas. MR (moisture resistant) plywood is cheaper and suits wardrobes and dry areas. Writing the plywood grade in the quotation prevents disputes about material quality.",
      },
      {
        q: "What are typical payment terms for interior design work?",
        a: "A common structure is a booking amount at signing, a large payment before modular production starts, a payment when material reaches the site, and the balance at handover. Write the percentage and trigger for each stage in the quotation.",
      },
      {
        q: "Should the design fee be shown separately?",
        a: "Yes. Show the design fee as its own line with what it covers, such as 2D layouts, 3D views and number of revisions. If you adjust it against execution when the customer gives you the full job, mention that in the terms.",
      },
    ],
    related: ["carpentry-quotation-format", "painting-quotation-format", "electrical-work-quotation-format", "plumbing-quotation-format"],
  },
  {
    slug: "plumbing-quotation-format",
    kind: "industry",
    navLabel: "Plumbing",
    title: "Plumbing Quotation Format (Free Sample + Excel)",
    description:
      "Plumbing quotation format for bathrooms: CPVC and SWR pipes, fittings, labour per bathroom, pressure testing and exclusions, with a sample quotation.",
    h1: "Plumbing Quotation Format",
    intro: [
      "Plumbing is buried in walls and floors within days of being done. If a joint leaks after the tiles are laid, someone pays for breaking good tiles, and the customer will look at your quotation to decide who. A clear plumbing quotation protects you by stating what pipe you used, how it was tested, and what you were not responsible for.",
      "This page covers how to quote plumbing work for homes and small buildings, with a sample for concealed plumbing in two bathrooms.",
    ],
    sections: [
      {
        heading: "What a plumbing quotation should state",
        list: [
          "Pipe type and size for each line: CPVC for hot and cold water, uPVC for cold water, SWR or PVC for drainage, and GI only where the customer insists. Give the brand and pressure class (for example SDR 11).",
          "Concealed or exposed: concealed work needs wall chasing and is priced higher. Say who does the chasing and the patching.",
          "Fixtures: list concealed bodies, diverters, valves and floor traps you are supplying. For taps, showers and sanitaryware, write clearly if the customer is buying them.",
          "Drainage: pipe sizes for wash basin, floor trap and WC lines, and the connection to the main stack or chamber.",
          "Testing: the pressure test you will do before the tiler closes the walls.",
          "Labour basis: per point, per bathroom, or a lumpsum for the job.",
          "Exclusions: tiling, waterproofing, civil work, and repairs to existing lines outside the scope.",
        ],
      },
      {
        heading: "Per point, per bathroom or lumpsum?",
        paragraphs: [
          "Plumbers price labour in three common ways. Per point is a rate for each water outlet or drain point, which works well for new construction where the customer can count points. Per bathroom is a single labour figure for a standard bathroom with a fixed number of points, which customers find easy to compare. Lumpsum suits repairs and odd jobs where the work is hard to break into points.",
          "Whichever you choose, write what one unit includes. A \"per bathroom\" rate should list the points it covers, such as one WC, one wash basin, one shower mixer, one geyser connection and one floor trap. Anything beyond that is an extra point at a stated rate.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Pressure testing: write it into the quotation",
        paragraphs: [
          "The single most useful line in a plumbing quotation is the pressure test. Before tiles go on, fill the system, pressurise it with a hand test pump, and leave it for a fixed time while watching the gauge. If the pressure holds, take a photo of the gauge with the date and share it with the customer on WhatsApp.",
          "Put this in your terms: \"System will be pressure tested before tiling. Leaks found after tiling, without a failed test, are not covered.\" It shows you work carefully, and it settles the most common dispute in bathroom renovation before it starts.",
        ],
      },
      {
        heading: "Repair and leak-fixing jobs",
        paragraphs: [
          "For leak repairs you often find the cause only after opening the wall. Quote a visit and inspection charge, then the known repair, and add a line such as \"If further leaks are found, additional work will be charged after approval at Rs. 600 per point plus material.\" Customers accept this when it is written down before work starts.",
        ],
      },
      {
        heading: "Faster plumbing quotations",
        paragraphs: [
          "Most bathroom jobs use the same pipes, fittings and labour lines. In [Quotely Pro](/quotation-maker-app) you save your pipes, valves, traps and labour rates once, copy a previous two-bathroom quotation for the next customer, change the quantities, and download a PDF to send on WhatsApp. If plumbing is part of a bigger renovation, the [construction quotation format](/construction-quotation-format) and [interior design quotation format](/interior-design-quotation-format) cover the rest of the job.",
        ],
      },
    ],
    sample: {
      heading: "Sample plumbing quotation (concealed plumbing, 2 bathrooms)",
      from: "Aqua Line Plumbing Works, Chennai",
      to: "Mr. S. Venkatesh, Anna Nagar, Chennai",
      subject: "Concealed plumbing for 2 bathrooms (renovation)",
      items: [
        { name: "CPVC pipe 3/4 inch, SDR 11, 3 m length", qty: 12, unit: "Lengths", rate: 420, gst: 18 },
        { name: "CPVC pipe 1/2 inch, SDR 11, 3 m length", qty: 18, unit: "Lengths", rate: 260, gst: 18 },
        { name: "CPVC fittings: elbows, tees, couplers, adaptors", qty: 1, unit: "Lot", rate: 3800, gst: 18 },
        { name: "Concealed diverter body (trim and shower by customer)", qty: 2, unit: "Nos", rate: 2400, gst: 18 },
        { name: "Ball valve 3/4 inch, brass", qty: 4, unit: "Nos", rate: 380, gst: 18 },
        { name: "SWR pipes 75 mm and 110 mm with fittings", qty: 1, unit: "Lot", rate: 4600, gst: 18 },
        { name: "Floor trap with stainless steel grating", qty: 4, unit: "Nos", rate: 450, gst: 18 },
        { name: "Plumbing labour per bathroom (up to 6 points)", qty: 2, unit: "Bathroom", rate: 9500, gst: 18 },
        { name: "Fixing of WC, wash basin and accessories", qty: 2, unit: "Set", rate: 2200, gst: 18 },
        { name: "Pressure testing before tiling, with photo record", qty: 1, unit: "Job", rate: 1500, gst: 18 },
      ],
      terms: [
        "Wall chasing by plumber; patching, tiling and waterproofing by others.",
        "Taps, showers and sanitaryware supplied by customer.",
        "Extra points: Rs. 600 per point plus material.",
        "Workmanship warranty: 1 year, subject to a passed pressure test.",
      ],
    },
    ctaContext: "plumbing quotations",
    faqs: [
      {
        q: "What should a plumbing quotation include?",
        a: "A plumbing quotation should include the pipe type, size and brand for water and drainage lines, whether work is concealed or exposed, the fixtures you supply, the labour basis (per point, per bathroom or lumpsum), pressure testing, exclusions such as tiling and waterproofing, and your workmanship warranty.",
      },
      {
        q: "Which pipe is better for bathroom plumbing, CPVC or uPVC?",
        a: "CPVC handles both hot and cold water, so it is the usual choice for bathroom supply lines with geysers. uPVC is suitable for cold water only. Drainage uses SWR or PVC pipes. Write the pipe type for each line in the quotation.",
      },
      {
        q: "How do plumbers charge for bathroom plumbing?",
        a: "Plumbers usually charge per point, per bathroom, or as a lumpsum. A per-bathroom rate should list the points included, such as WC, basin, shower mixer, geyser and floor trap, with a separate rate for extra points.",
      },
      {
        q: "Why is pressure testing important before tiling?",
        a: "A pressure test before tiling proves the concealed pipes do not leak. If you skip it and a joint leaks later, good tiles have to be broken to fix it. Recording the test with a dated photo also protects the plumber in any dispute.",
      },
      {
        q: "Should material and labour be shown separately in a plumbing quotation?",
        a: "Yes. Listing material and labour separately lets the customer see the pipe brand and quantities, compare rates, and understand that the labour charge covers installation and testing, not just fitting.",
      },
    ],
    related: ["construction-quotation-format", "interior-design-quotation-format", "electrical-work-quotation-format"],
  },
  {
    slug: "networking-quotation-format",
    kind: "industry",
    navLabel: "Networking",
    title: "Networking Quotation Format (Free Sample + Excel)",
    description:
      "Networking quotation format for an office LAN: Cat6 cabling, switches, rack, patch panel, Wi-Fi access points, per-node labour, testing and labelling.",
    h1: "Networking Quotation Format",
    intro: [
      "A networking quotation competes against a customer's assumption that \"it is only some cables and a switch\". The work that makes a network reliable, such as proper termination, a tidy rack, labels and test results, is invisible unless you write it down. A good networking quotation shows the customer exactly what they get for each network point.",
      "This page explains how to quote structured cabling and small office networks, with a sample for a 24-node office with Wi-Fi.",
    ],
    sections: [
      {
        heading: "Quote by node, and say what a node includes",
        paragraphs: [
          "Most network installers price labour per node: one cable run from the rack to a wall or floor outlet, terminated at both ends. Define a node in the quotation: \"Each node includes laying up to 40 m of Cat6 cable in casing, termination on the patch panel and the I/O outlet, testing and labelling.\" Runs longer than that, or through difficult routes, can be charged extra.",
          "Material is easier to quote by box and piece. Cat6 cable comes in 305 m boxes; estimate total cable by multiplying the number of nodes by the average run length and adding 10 percent, then round up to whole boxes.",
        ],
      },
      {
        heading: "What to include in a networking quotation",
        list: [
          "Cable: category (Cat6 or Cat6A), UTP or shielded, indoor or outdoor, and brand.",
          "Active equipment: switch port count, gigabit or faster, managed or unmanaged, and PoE budget if it powers cameras or access points.",
          "Passive equipment: patch panel, I/O modules, face plates, patch cords and cable manager.",
          "Rack: size in U, wall or floor mounted, with shelves, fans and a power distribution unit.",
          "Wi-Fi: number and type of access points, mounting, and whether a coverage check is included.",
          "Containment: PVC casing, conduit or cable tray, in metres.",
          "Testing and documentation: continuity or certification testing, port labels and a port map handed over to the customer.",
          "Exclusions: internet connection, ISP router, electrical power points, civil and false ceiling work.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Labelling and the port map",
        paragraphs: [
          "Six months after installation, the office will call you because a desk has no network. If every outlet and patch panel port carries the same label and the customer has a simple port map, you or their IT person can trace the fault in minutes. Without labels, it can take hours.",
          "Include labelling and a port map as a named line in the quotation, even if the amount is small. It separates you from installers who leave a tangle of unmarked blue cables, and it is a real reason to choose you over a cheaper quote.",
        ],
      },
      {
        heading: "Wi-Fi: avoid promising coverage you have not checked",
        paragraphs: [
          "Walls, glass partitions and the number of users change how far Wi-Fi reaches. If you have not walked the site with a phone or a survey app, write \"Access point locations are proposed and may change after site check\" and quote a rate for any extra access point. That is better than promising \"full coverage\" and adding units later at your own cost.",
        ],
      },
      {
        heading: "Faster networking quotations",
        paragraphs: [
          "Networking quotations change mainly in node count and cable boxes. In [Quotely Pro](/quotation-maker-app) you save your switches, cable, modules and per-node labour once, copy a previous office quotation, change the counts, and send the PDF on WhatsApp. After handover, you can issue a warranty certificate for the switch, access points and cabling work, with expiry dates you can track in Reports for AMC renewals. Networking often comes together with cameras, so see the [CCTV quotation format](/cctv-quotation-format) too, and quote the two as separate sections so the customer can approve each.",
        ],
      },
    ],
    sample: {
      heading: "Sample networking quotation (24-node office LAN with Wi-Fi)",
      from: "NetLink Infra Solutions, Ahmedabad",
      to: "Patel & Associates, Chartered Accountants, Navrangpura",
      subject: "Structured cabling and Wi-Fi for new office (24 nodes)",
      items: [
        { name: "24-port gigabit smart switch with 4 SFP uplinks", qty: 1, unit: "Nos", rate: 14500, gst: 18 },
        { name: "Cat6 UTP cable, 305 m box", qty: 3, unit: "Box", rate: 9800, gst: 18 },
        { name: "24-port Cat6 patch panel, loaded", qty: 1, unit: "Nos", rate: 4200, gst: 18 },
        { name: "Cat6 I/O module with face plate and box", qty: 24, unit: "Nos", rate: 280, gst: 18 },
        { name: "Cat6 patch cords, 1 m and 2 m", qty: 48, unit: "Nos", rate: 120, gst: 18 },
        { name: "9U wall-mount rack with shelf, fan and PDU", qty: 1, unit: "Nos", rate: 8500, gst: 18 },
        { name: "Wi-Fi 6 ceiling access point, PoE", qty: 2, unit: "Nos", rate: 7800, gst: 18 },
        { name: "PVC casing and capping, 25 mm", qty: 120, unit: "Mtr", rate: 45, gst: 18 },
        { name: "Cable laying and termination per node (up to 40 m)", qty: 24, unit: "Nodes", rate: 350, gst: 18 },
        { name: "Testing, labelling and port map documentation", qty: 1, unit: "Job", rate: 3000, gst: 18 },
      ],
      terms: [
        "Access point locations subject to site check; extra AP at quoted rate.",
        "Internet connection and ISP router by customer.",
        "Power points near rack and access points by customer's electrician.",
        "Warranty: active equipment as per manufacturer; cabling workmanship 1 year.",
      ],
    },
    ctaContext: "networking quotations",
    faqs: [
      {
        q: "What should a networking quotation include?",
        a: "A networking quotation should list cable category and quantity, switch details, patch panel, I/O outlets and patch cords, rack size and accessories, Wi-Fi access points, casing or conduit, per-node labour, testing and labelling, and exclusions such as the internet connection and power points.",
      },
      {
        q: "How is network cabling charged per node?",
        a: "A node is one cable run from the rack to an outlet, terminated at both ends and tested. Installers usually charge a fixed labour rate per node for runs up to a stated length, with extra charges for longer or difficult runs. Material is charged separately.",
      },
      {
        q: "How do I calculate Cat6 cable quantity for a quotation?",
        a: "Multiply the number of nodes by the average cable run length, add about 10 percent for routing and termination, and round up to whole 305 m boxes. For 24 nodes averaging 35 m, that is about 924 m, or 3 boxes.",
      },
      {
        q: "Should I use a managed or unmanaged switch for a small office?",
        a: "An unmanaged switch is enough for a simple office network. A smart or managed switch is useful when you need VLANs to separate cameras or guests, or want to monitor ports. State the switch type clearly so the customer can compare quotations fairly.",
      },
      {
        q: "Why include labelling and a port map in a networking quotation?",
        a: "Labels on every outlet and patch panel port, with a port map handed to the customer, make faults quick to trace later. Listing it in the quotation shows the customer the quality of work they are paying for.",
      },
    ],
    related: ["cctv-quotation-format", "electrical-work-quotation-format", "web-design-quotation-format"],
  },
  {
    slug: "construction-quotation-format",
    kind: "industry",
    navLabel: "Construction",
    title: "Construction Quotation Format (Free Sample + Excel)",
    description:
      "Construction quotation format with an item-rate BOQ sample: excavation, PCC, RCC, steel, masonry, plaster and flooring, plus stage payments.",
    h1: "Construction Quotation Format",
    intro: [
      "Construction quotations involve the largest amounts most small contractors handle, and the longest timelines. Prices of steel and cement move during the job, quantities change as drawings change, and payments come in stages. A quotation that does not handle these three things clearly will cause trouble, however good the work.",
      "This page explains the main ways to quote construction work, how to write an item-rate BOQ, and gives a sample for a ground-floor room extension.",
    ],
    sections: [
      {
        heading: "Three ways to quote construction",
        list: [
          "Per square foot: a single rate multiplied by built-up area, common for complete houses. Simple to compare, but it hides specifications, so attach a list of what is included: cement and steel brands, flooring, doors, electrical and plumbing allowances.",
          "Item-rate BOQ (bill of quantities): each item of work with a quantity, unit and rate, such as cubic metres of concrete or square metres of plaster. Final billing is on measured quantities. Best for extensions, renovations and commercial work.",
          "Labour contract: you supply labour only and the owner buys material. Quote labour per square foot or per item, and list the material the owner must provide and when.",
        ],
      },
      {
        heading: "Writing an item-rate BOQ",
        paragraphs: [
          "Each BOQ line should describe the work fully enough that another contractor could price it: the item, the mix or grade, thickness, and what is included. \"RCC M20 in slab, 125 mm thick, including shuttering and curing, excluding steel\" is a proper description; \"Slab work\" is not. Keep reinforcement steel as a separate line in kilograms, since the steel quantity changes with the structural drawing.",
          "Use standard units: cubic metres for excavation, concrete and masonry; kilograms for steel; square metres or square feet for plaster, flooring and painting; running metres for skirting and drains. State that quantities are estimated and final billing will be on actual measurement.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Material price escalation",
        paragraphs: [
          "Steel and cement prices can change noticeably over a few months. For jobs longer than a month or two, add an escalation clause: \"Rates are based on steel at Rs. X per kg and cement at Rs. Y per bag on the quotation date. Changes of more than 5% at the time of purchase will be adjusted at actual.\" This is fair to both sides and avoids you absorbing a price rise you could not control.",
        ],
      },
      {
        heading: "Stage-wise payments",
        paragraphs: [
          "Tie payments to visible stages, not to dates. A typical schedule is an advance at start, then payments on completion of foundation, plinth, each roof slab, brickwork, plastering and handover. Customers are comfortable paying when they can see the stage is done, and you keep a steady cash flow for material.",
        ],
      },
      {
        heading: "Responsibilities and exclusions",
        list: [
          "Building approvals and permits, and the structural drawing, unless you are providing them.",
          "Water and electricity for construction: who provides them and who pays.",
          "Curing period and who is responsible for watering.",
          "Debris removal and disposal outside the plot.",
          "Electrical, plumbing, doors, windows and painting if quoted separately.",
        ],
      },
      {
        heading: "Faster construction quotations",
        paragraphs: [
          "Construction BOQs are long, and rates for the same items repeat from job to job. In [Quotely Pro](/quotation-maker-app) you save your standard items with descriptions, units and rates, copy a previous BOQ, adjust quantities for the new drawing, and download a PDF to send on WhatsApp. Collect each stage payment with an advance receipt. For the finishing work, see the [painting](/painting-quotation-format) and [plumbing](/plumbing-quotation-format) quotation formats.",
        ],
      },
    ],
    sample: {
      heading: "Sample construction quotation (ground-floor room extension, about 250 sq ft)",
      from: "Sri Lakshmi Builders, Mysuru",
      to: "Mr. Prakash Gowda, Vijayanagar, Mysuru",
      subject: "Construction of one room extension, ground floor (item-rate BOQ)",
      items: [
        { name: "Excavation for foundation in ordinary soil, including disposal within plot", qty: 18, unit: "Cu m", rate: 450, gst: 18 },
        { name: "PCC 1:4:8 below footings, 100 mm", qty: 2.5, unit: "Cu m", rate: 5800, gst: 18 },
        { name: "RCC M20 footings, columns and plinth beam, incl. shuttering (excl. steel)", qty: 4.5, unit: "Cu m", rate: 7800, gst: 18 },
        { name: "Reinforcement steel Fe 500D, cutting, bending and placing", qty: 780, unit: "Kg", rate: 82, gst: 18 },
        { name: "Brick masonry 230 mm in CM 1:6", qty: 12, unit: "Cu m", rate: 6900, gst: 18 },
        { name: "RCC M20 roof slab 125 mm with beams, incl. shuttering (excl. steel)", qty: 3.6, unit: "Cu m", rate: 8200, gst: 18 },
        { name: "Internal plaster 12 mm in CM 1:4, walls and ceiling", qty: 85, unit: "Sq m", rate: 320, gst: 18 },
        { name: "External plaster 20 mm in CM 1:4", qty: 65, unit: "Sq m", rate: 420, gst: 18 },
        { name: "Vitrified tile flooring 600x600 mm, tile up to Rs. 45/sq ft", qty: 250, unit: "Sq ft", rate: 95, gst: 18 },
      ],
      terms: [
        "Final billing on actual measured quantities.",
        "Steel and cement price changes above 5% adjusted at actual.",
        "Payments: 15% advance, then stage-wise on foundation, slab, plaster and handover.",
        "Approvals, water and electricity for construction by owner.",
      ],
    },
    gstNote:
      "GST on construction depends on the type of contract and property; works contracts are often at 18%. Confirm with your accountant.",
    ctaContext: "construction quotations",
    faqs: [
      {
        q: "What is the format of a construction quotation?",
        a: "A construction quotation has your company and client details, project description, a bill of quantities with item description, quantity, unit, rate and amount, totals with tax, payment stages, timeline, escalation clause, responsibilities such as approvals and utilities, and exclusions.",
      },
      {
        q: "What is a BOQ in a construction quotation?",
        a: "A BOQ (bill of quantities) lists each item of work, such as excavation, concrete, steel, masonry and plaster, with its quantity, unit and rate. Final billing is usually on measured quantities, so the BOQ is an estimate that becomes the basis for the bill.",
      },
      {
        q: "Should steel be quoted separately in a construction quotation?",
        a: "Yes. Quote reinforcement steel as a separate line in kilograms, and write concrete rates as excluding steel. Steel quantity depends on the structural drawing and steel prices change often, so keeping it separate makes the quotation fair and easy to adjust.",
      },
      {
        q: "How do I handle cement and steel price changes in a quotation?",
        a: "Add an escalation clause stating the steel and cement prices your rates are based on, and that changes above a set percentage at the time of purchase will be adjusted at actual. This protects both contractor and owner on longer jobs.",
      },
      {
        q: "What payment schedule is common for construction work?",
        a: "Most contractors take an advance at start and then stage payments on completion of foundation, plinth, each slab, brickwork, plastering and handover. Linking payments to visible stages keeps both sides comfortable.",
      },
    ],
    related: ["plumbing-quotation-format", "painting-quotation-format", "electrical-work-quotation-format", "carpentry-quotation-format"],
  },
  {
    slug: "painting-quotation-format",
    kind: "industry",
    navLabel: "Painting",
    title: "Painting Quotation Format (Free Sample + Excel)",
    description:
      "Painting quotation format for an interior repaint: paintable area, preparation, putty, primer, coats, paint brand and texture, with a sample.",
    h1: "Painting Quotation Format",
    intro: [
      "Painting quotations are easy to undercut. A painter who skips putty, uses one coat instead of two, or quotes an economy emulsion can always come in cheaper. The only way to compete fairly is to write down exactly what you will do to each surface and which paint you will use, so the customer can see the difference.",
      "This page explains how to measure and quote painting work, and gives a sample for repainting the interior of a 3BHK flat.",
    ],
    sections: [
      {
        heading: "Measure paintable area, not carpet area",
        paragraphs: [
          "Customers often quote their flat by carpet area, but you paint walls and ceilings. As a rough guide, the wall area of a home is about three times the carpet area, and the ceiling area is about the same as the carpet area. A 1,100 sq ft 3BHK may have around 2,600 sq ft of wall and 1,150 sq ft of ceiling to paint.",
          "Measure on site when you can, deduct large openings like windows and wardrobes, and write the areas in the quotation room by room or as totals. If you quote per sq ft of carpet area instead, say so clearly, so the customer does not compare your rate with someone who quoted on paint area.",
        ],
      },
      {
        heading: "What to include in a painting quotation",
        list: [
          "Surface preparation: scraping loose paint, sanding, crack filling, and how much of it is included.",
          "Putty: full putty or only touch-up where needed, and number of coats.",
          "Primer: one coat, and the type (interior, exterior, wood or metal).",
          "Finish paint: brand, product name and finish (matt, satin, sheen), and number of coats, usually two.",
          "Ceilings, doors, windows and grills: listed separately, since they use different paints and take more time.",
          "Special finishes: texture, stencil or accent walls priced on their own.",
          "Protection and cleaning: covering furniture and floors, masking, and cleaning up at the end.",
          "Exclusions: dampness or seepage repair, false ceiling repair and moving heavy furniture.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Labour-only or with material?",
        paragraphs: [
          "Some customers buy paint themselves and want a labour-only quotation. If you agree, list the exact material they must buy, with brand, product and litres, and state that delays due to late material are not your responsibility. If you supply material, name the product so the customer can check the price; vague lines like \"premium emulsion\" make customers suspicious.",
          "Changing from a dark colour to a light one usually needs an extra coat. Mention it in the quotation if the customer is changing colours, or quote it as an optional line.",
        ],
      },
      {
        heading: "Dampness: say it before you paint",
        paragraphs: [
          "Fresh paint on a damp wall will peel within months, and the customer will blame the painter. If you see seepage marks, write in the quotation that the area needs waterproofing or plumbing repair first, and that peeling caused by dampness is not covered. It protects your work and often wins you the waterproofing job too.",
        ],
      },
      {
        heading: "Faster painting quotations",
        paragraphs: [
          "Once you have measured, painting quotations are mostly the same lines with different areas. In [Quotely Pro](/quotation-maker-app) you save your rates for preparation, putty, primer, emulsion, enamel and texture, copy a previous flat's quotation, update the areas, and send the PDF on WhatsApp. For new construction, see the [construction quotation format](/construction-quotation-format); for full home makeovers, the [interior design quotation format](/interior-design-quotation-format).",
        ],
      },
    ],
    sample: {
      heading: "Sample painting quotation (interior repaint, 3BHK flat)",
      from: "ColourCraft Painting Services, Pune",
      to: "Mrs. Neha Kulkarni, Kothrud, Pune",
      subject: "Interior repainting of 3BHK flat (walls, ceilings, doors)",
      items: [
        { name: "Surface preparation: scraping, sanding and crack filling", qty: 2600, unit: "Sq ft", rate: 4, gst: 18 },
        { name: "Wall putty, 2 coats, on patchy areas only", qty: 900, unit: "Sq ft", rate: 14, gst: 18 },
        { name: "Interior primer, 1 coat", qty: 2600, unit: "Sq ft", rate: 6, gst: 18 },
        { name: "Premium interior emulsion, 2 coats (brand and shade as approved)", qty: 2600, unit: "Sq ft", rate: 18, gst: 18 },
        { name: "Ceiling: 1 coat primer and 2 coats ceiling white", qty: 1150, unit: "Sq ft", rate: 12, gst: 18 },
        { name: "Enamel paint on doors and grills, 2 coats", qty: 180, unit: "Sq ft", rate: 28, gst: 18 },
        { name: "Texture finish on living room feature wall", qty: 120, unit: "Sq ft", rate: 85, gst: 18 },
        { name: "Furniture covering, masking and final cleaning", qty: 1, unit: "Job", rate: 3500, gst: 18 },
      ],
      terms: [
        "Areas measured on site; final bill on actual area.",
        "Dark-to-light colour change may need an extra coat, charged at Rs. 7/sq ft.",
        "Dampness and seepage repair not included.",
        "Work completed in about 8 working days.",
      ],
    },
    ctaContext: "painting quotations",
    faqs: [
      {
        q: "What should a painting quotation include?",
        a: "A painting quotation should include the areas to be painted, surface preparation, putty and primer details, the paint brand, product and finish, the number of coats, separate lines for ceilings, doors and special finishes, protection and cleaning, timeline and exclusions such as dampness repair.",
      },
      {
        q: "How do I calculate the paintable area of a house?",
        a: "As a rough guide, wall area is about three times the carpet area and ceiling area is about equal to the carpet area. For accurate quotations, measure each room's walls (perimeter x height), deduct large openings, and add the ceilings.",
      },
      {
        q: "How many coats of paint should a quotation include?",
        a: "A standard interior job is one coat of primer and two coats of emulsion. Changing from a dark to a light colour may need a third coat. Write the number of coats in the quotation so the customer can compare fairly.",
      },
      {
        q: "Should a painting quotation mention the paint brand?",
        a: "Yes. Name the brand and the exact product, not just \"premium emulsion\". Paint products within one brand vary a lot in price and durability, and naming the product shows the customer what they are paying for.",
      },
      {
        q: "Can painting be quoted labour only?",
        a: "Yes. In a labour-only quotation, list the exact paint and material the customer must buy, with quantities, and state that delays caused by late material delivery are not the painter's responsibility.",
      },
    ],
    related: ["interior-design-quotation-format", "construction-quotation-format", "carpentry-quotation-format"],
  },
  {
    slug: "ac-installation-service-quotation-format",
    kind: "industry",
    navLabel: "AC installation & service",
    title: "AC Installation and Service Quotation Format + Free Excel",
    description:
      "AC installation and service quotation format: installation, extra copper pipe, stands, core cutting, gas and AMC, with a sample for 3 split ACs.",
    h1: "AC Installation and Service Quotation Format",
    intro: [
      "Most complaints in AC installation are about extra charges the customer did not expect: more copper pipe, a stand, core cutting, a drain extension. Each one is fair, but when it appears only on the final bill, the customer feels cheated. A clear AC quotation lists these extras with rates before the technician climbs the ladder.",
      "This page shows how to quote AC installation, repairs and annual maintenance contracts (AMC), with a sample for installing three split ACs and an AMC.",
    ],
    sections: [
      {
        heading: "Standard installation vs extras",
        paragraphs: [
          "Brands and dealers usually supply a standard installation kit with a split AC, typically including a few metres of copper pipe and a drain pipe. Anything beyond that is extra. Start your quotation by saying what the standard installation includes, then list each possible extra with its rate: per metre of additional copper pipe, outdoor unit stand, core cutting through walls, drain pipe extension, and electrical work.",
          "Even if the customer bought the AC from a shop that promised \"free installation\", your quotation for the extras keeps the conversation simple: free installation covers the standard kit, and these are the rates for anything more.",
        ],
      },
      {
        heading: "What to include in an AC quotation",
        list: [
          "AC details: indoor and outdoor unit type (split, window, cassette), capacity in tons, and who is supplying the AC.",
          "Installation charge per unit, and what it covers.",
          "Copper pipe: size and rate per metre beyond the standard length, with insulation.",
          "Outdoor unit mounting: wall stand, floor stand or roof, and the stand material.",
          "Core cutting and drain routing.",
          "Electrical: whether a separate power point, MCB or stabiliser is needed, and whether you provide it.",
          "Gas charging: only when a leak is found and repaired, with the refrigerant type (R32, R410A) and rate.",
          "Old unit removal and disposal, if requested.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Writing an AMC quotation",
        paragraphs: [
          "An annual maintenance contract brings steady income between installation seasons. Spell out the AMC type. A non-comprehensive AMC covers scheduled services and breakdown visits, with spare parts and gas charged extra. A comprehensive AMC also covers listed spare parts, at a higher price. List the number of scheduled services per year (for example 3 wet services), what each service includes, the response time for breakdown calls, and exclusions such as compressor replacement or physical damage.",
          "AMC quotations are usually per unit per year. If the customer has many ACs, a per-unit rate with a small reduction for larger counts is easy to understand.",
        ],
      },
      {
        heading: "Repair quotations",
        paragraphs: [
          "For repairs, quote the visit and diagnosis charge first, then the repair after you find the fault. Write the part name, rate and labour separately, and if gas is needed, say what leak you are fixing. Customers distrust a gas top-up with no leak repair, because the gas will escape again.",
        ],
      },
      {
        heading: "Track warranties and AMC renewals",
        paragraphs: [
          "AC work creates repeat business only if you remember to call back. In [Quotely Pro](/quotation-maker-app) you save your installation rates and extras once, copy a previous quotation for the next customer, and send the PDF on WhatsApp. After installation you can issue a warranty certificate for your workmanship and see in Reports which warranties are ending, so you can offer an AMC on time. For the power point and wiring, see the [electrical work quotation format](/electrical-work-quotation-format).",
        ],
      },
    ],
    sample: {
      heading: "Sample AC quotation (installation of 3 split ACs with AMC)",
      from: "CoolCare AC Services, Lucknow",
      to: "Mr. Arvind Srivastava, Gomti Nagar, Lucknow",
      subject: "Installation of 3 split ACs (customer-supplied) and annual maintenance",
      items: [
        { name: "Installation of 1.5 ton split AC with standard kit", qty: 3, unit: "Nos", rate: 1500, gst: 18 },
        { name: "Additional copper pipe 1/4 + 1/2 inch with insulation", qty: 12, unit: "Mtr", rate: 750, gst: 18 },
        { name: "Drain pipe extension", qty: 10, unit: "Mtr", rate: 40, gst: 18 },
        { name: "Outdoor unit wall stand, MS powder-coated", qty: 3, unit: "Nos", rate: 900, gst: 18 },
        { name: "Core cutting 65 mm for pipe routing", qty: 3, unit: "Nos", rate: 600, gst: 18 },
        { name: "Uninstallation of old window AC", qty: 1, unit: "Nos", rate: 600, gst: 18 },
        { name: "Non-comprehensive AMC, 3 wet services per year", qty: 3, unit: "Units", rate: 1800, gst: 18 },
      ],
      terms: [
        "Standard kit: 3 m copper pipe and drain pipe per unit, as supplied by brand.",
        "Gas charging only after leak repair, at Rs. 2,500 (R32) per unit.",
        "Power point and MCB near indoor unit by customer.",
        "AMC excludes spare parts, gas and compressor.",
      ],
    },
    ctaContext: "AC installation and service quotations",
    faqs: [
      {
        q: "What should an AC installation quotation include?",
        a: "An AC installation quotation should include the AC type and capacity, who supplies the unit, the installation charge and what the standard kit covers, rates for extra copper pipe, stands, core cutting and drain extension, electrical requirements, gas charging terms, and warranty.",
      },
      {
        q: "Why do AC installers charge extra for copper pipe?",
        a: "The standard installation kit includes only a few metres of copper pipe. When the outdoor unit is farther away, extra pipe is needed, and copper is costly. A good quotation states the per-metre rate before installation so the customer is not surprised.",
      },
      {
        q: "What is the difference between comprehensive and non-comprehensive AMC?",
        a: "A non-comprehensive AMC covers scheduled services and breakdown visits, with spare parts and gas charged extra. A comprehensive AMC also covers listed spare parts and costs more. The quotation should list services per year, response time and exclusions.",
      },
      {
        q: "Should gas charging be included in an AC service quotation?",
        a: "Only when needed. An AC loses gas only through a leak, so gas charging should come with a leak repair. Quote the refrigerant type and rate separately and state that gas is charged only after the leak is fixed.",
      },
      {
        q: "How often should an AC be serviced under AMC?",
        a: "Many AMCs include two to four scheduled services a year, depending on usage and climate. In hot regions with long summers, three wet services a year is common. Write the number of services in the AMC quotation.",
      },
    ],
    related: ["electrical-work-quotation-format", "plumbing-quotation-format", "cctv-quotation-format"],
  },
  {
    slug: "carpentry-quotation-format",
    kind: "industry",
    navLabel: "Carpentry",
    title: "Carpentry Quotation Format (Free Sample + Excel)",
    description:
      "Carpentry quotation format for furniture and repairs: per-item pricing, plywood grade, laminate, hardware, polish and labour-only jobs, with a sample.",
    h1: "Carpentry Quotation Format",
    intro: [
      "A carpenter's quotation is different from an interior designer's. You are usually pricing individual pieces of furniture and repairs, often for customers who will compare your rate with a showroom price. The way to win is to show what goes into each piece, the board, the wood, the hardware and the finish, so the customer sees why a well-made bed costs more than a ready-made one.",
      "This page covers how to quote carpentry work, including labour-only jobs, with a sample for furniture and repairs in a home.",
    ],
    sections: [
      {
        heading: "Price each piece as its own line",
        paragraphs: [
          "Carpentry customers think in pieces: a bed, a study table, a shoe rack, five door repairs. Give each piece its own line with size and material in the description, and a single price per piece. \"Bed 6 x 6.5 ft with hydraulic storage, 18 mm MR ply, 1 mm laminate, soft-close hydraulic lift\" lets the customer compare your bed with any other quotation.",
          "Repairs work better as small fixed prices per item, such as per hinge replacement or per drawer channel, than as hourly labour. Customers are comfortable approving a known number.",
        ],
      },
      {
        heading: "Material details to always write",
        list: [
          "Board: plywood grade (MR or BWP), thickness, and brand or ISI marking; or solid wood type such as teak, sal or rubberwood.",
          "Surface: laminate thickness and finish, veneer, or paint and polish.",
          "Edge banding on exposed board edges, and its thickness.",
          "Hardware: hinges, channels, handles, locks and lift mechanisms, with brand and soft-close where included.",
          "Polish type for wooden items: melamine, PU or wax, and number of coats.",
          "Where the work is done: workshop-made and fitted at site, or made at site.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Labour-only carpentry quotations",
        paragraphs: [
          "Many customers prefer to buy material themselves and pay the carpenter for labour. If you quote labour only, include a material list: number of 8 x 4 ft plywood sheets by thickness, laminate sheets, edge band in metres, hardware pieces, adhesive and screws. Customers often buy too little or the wrong grade, and a clear list saves extra trips and delays.",
          "Also write that you are not responsible for defects in material bought by the customer, such as warped boards or weak hinges, and that waiting time for late material may be charged.",
        ],
      },
      {
        heading: "Payment and timeline",
        paragraphs: [
          "For custom furniture, take an advance to cover material, often 40 to 50 percent, with the balance on installation. Give a realistic timeline per piece or for the whole order, and say whether it starts from the advance date or from final measurement. For repair jobs, payment on completion is normal.",
        ],
      },
      {
        heading: "Faster carpentry quotations",
        paragraphs: [
          "Carpenters quote the same kinds of pieces again and again with different sizes. In [Quotely Pro](/quotation-maker-app) you save your standard pieces and repair rates, copy a previous quotation, adjust sizes and prices, and send the PDF on WhatsApp. Larger kitchen and wardrobe projects follow the [interior design quotation format](/interior-design-quotation-format), and repainting jobs the [painting quotation format](/painting-quotation-format).",
        ],
      },
    ],
    sample: {
      heading: "Sample carpentry quotation (custom furniture and repairs, 2BHK)",
      from: "Vishwakarma Wood Works, Jaipur",
      to: "Mr. Rohit Agarwal, Malviya Nagar, Jaipur",
      subject: "New furniture and repair work at residence",
      items: [
        { name: "Bed 6 x 6.5 ft with hydraulic storage, 18 mm MR ply, 1 mm laminate", qty: 1, unit: "Nos", rate: 32000, gst: 18 },
        { name: "Study table 4 ft with one drawer and keyboard tray", qty: 1, unit: "Nos", rate: 9500, gst: 18 },
        { name: "Shoe rack 3 x 3.5 ft with shutters, laminate finish", qty: 1, unit: "Nos", rate: 6800, gst: 18 },
        { name: "Kitchen shutter replacement, 18 mm BWP ply, laminate, soft-close hinges", qty: 14, unit: "Nos", rate: 1450, gst: 18 },
        { name: "Floating wall shelf 3 ft, concealed brackets", qty: 4, unit: "Nos", rate: 1100, gst: 18 },
        { name: "Door repair: hinge replacement and alignment", qty: 5, unit: "Doors", rate: 450, gst: 18 },
        { name: "Melamine polish on teak main door, both sides", qty: 1, unit: "Nos", rate: 4500, gst: 18 },
        { name: "Transport and installation", qty: 1, unit: "Job", rate: 2500, gst: 18 },
      ],
      terms: [
        "50% advance with order; balance after installation.",
        "Delivery of new furniture in 15 working days from final measurement.",
        "Hardware brand as discussed; changes may alter price.",
        "Workmanship warranty: 1 year on new furniture.",
      ],
    },
    ctaContext: "carpentry quotations",
    faqs: [
      {
        q: "What should a carpentry quotation include?",
        a: "A carpentry quotation should list each piece with size, board or wood type, surface finish, edge banding, hardware brand and polish, plus repairs as fixed prices per item, transport and installation, advance and balance terms, delivery time and workmanship warranty.",
      },
      {
        q: "How do carpenters charge for furniture?",
        a: "Carpenters usually charge a fixed price per piece, which includes material and labour, or labour only per piece or per square foot when the customer supplies material. Repairs are often charged as fixed rates per item, such as per hinge or channel.",
      },
      {
        q: "What is the difference between MR and BWP plywood?",
        a: "MR (moisture resistant) plywood is suitable for dry areas like bedrooms and living rooms. BWP (boiling water proof) plywood resists water and is used in kitchens, bathrooms and other wet areas. The plywood grade should be written in the quotation.",
      },
      {
        q: "What should a labour-only carpentry quotation mention?",
        a: "It should include a material list with plywood sheets by thickness, laminates, edge band, hardware and consumables, and state that the carpenter is not responsible for defects in customer-supplied material or delays caused by late material.",
      },
      {
        q: "How much advance do carpenters take?",
        a: "For custom furniture, carpenters commonly take 40 to 50 percent advance to buy material, with the balance on installation. For repair work, payment on completion is usual.",
      },
    ],
    related: ["interior-design-quotation-format", "painting-quotation-format", "construction-quotation-format"],
  },
  {
    slug: "catering-quotation-format",
    kind: "industry",
    navLabel: "Catering",
    title: "Catering Quotation Format (Free Sample + Excel)",
    description:
      "Catering quotation format: per plate pricing, detailed menu, minimum guarantee, extra plates, service staff and payment terms, with a sample.",
    h1: "Catering Quotation Format",
    intro: [
      "A catering quotation is really a promise about one evening that cannot be repeated. If food runs short at a wedding, nobody remembers the price; they remember the empty counter. A good catering quotation sets clear expectations on menu, quantity, guest count and service, so there is no argument on the day itself.",
      "This page explains how to quote catering for weddings, parties and corporate events, with a sample for a 300-guest reception.",
    ],
    sections: [
      {
        heading: "Per plate pricing and the guest count",
        paragraphs: [
          "Most caterers price per plate. The quotation must say what one plate includes and how the final count is decided. Use a minimum guarantee: \"Billing for a minimum of 300 plates. Extra plates served will be charged at Rs. 420 each.\" Ask for the final count a few days before the event and write that deadline in the terms.",
          "For buffets, mention how you count plates: by plates issued at the counter, or by the confirmed guest count. Agreeing this in writing prevents the most common post-event dispute.",
        ],
      },
      {
        heading: "Write the menu in detail",
        list: [
          "Welcome drinks and starters, with how many types and whether they are passed around or at a counter.",
          "Main course: each dish by name, for example paneer butter masala, dal makhani, mixed veg, jeera rice, and the breads.",
          "Live counters such as chaat, dosa or pasta, priced as a per-plate add-on.",
          "Desserts by name, and whether ice cream is included.",
          "Salads, raita, pickles and papad, which customers often forget to ask about.",
          "Water: bottles, dispensers or glasses, and who pays for them.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Service, setup and timing",
        paragraphs: [
          "Write the service style (buffet, served, or mixed), the number of uniformed staff, and the service duration, for example 7 pm to 11 pm. State the overtime rate per hour beyond that. Mention what you bring: chafing dishes, counters, table linen, crockery or disposables, and who provides tables and chairs if the venue does not.",
          "Also say who is responsible for venue permissions, gas cylinders, power for live counters and waste removal. Venues have their own rules, and your quotation should not promise what the venue does not allow.",
        ],
      },
      {
        heading: "Advance, tasting and cancellation",
        paragraphs: [
          "Catering involves buying ingredients days in advance, so an advance is standard, with the balance before or on the event day. If you offer a food tasting, say how many people it covers and whether it is free or adjusted against the order. Add a cancellation term: how much of the advance is refundable if the event is cancelled a week before, or a day before. Include your FSSAI licence or registration number on the quotation.",
        ],
      },
      {
        heading: "Faster catering quotations",
        paragraphs: [
          "Caterers send many quotations in the wedding season, mostly with the same dishes in different combinations. In [Quotely Pro](/quotation-maker-app) you save your menu items and per-plate rates once, copy a previous quotation, change the menu and guest count, and send the PDF on WhatsApp. Take the booking amount with an advance receipt. If the client also needs stage, sound and decor, see the [event management quotation format](/event-management-quotation-format).",
        ],
      },
    ],
    sample: {
      heading: "Sample catering quotation (wedding reception, 300 guests, veg buffet)",
      from: "Annapoorna Caterers, Indore",
      to: "Jain family, Vijay Nagar, Indore",
      subject: "Veg buffet catering for wedding reception, 300 guests",
      items: [
        { name: "Veg buffet per plate: 1 welcome drink, 2 starters, 4 main dishes, 2 breads, rice, 2 desserts", qty: 300, unit: "Plates", rate: 420, gst: 5 },
        { name: "Live chaat counter (per plate add-on)", qty: 300, unit: "Plates", rate: 55, gst: 5 },
        { name: "Packaged drinking water, 500 ml", qty: 360, unit: "Bottles", rate: 12, gst: 5 },
        { name: "Uniformed service staff, 4 hours", qty: 12, unit: "Persons", rate: 700, gst: 5 },
        { name: "Buffet setup with chafing dishes, counters and table linen", qty: 1, unit: "Job", rate: 8000, gst: 5 },
        { name: "Transport of food and equipment", qty: 1, unit: "Job", rate: 3500, gst: 5 },
      ],
      terms: [
        "Minimum guarantee 300 plates; extra plates at Rs. 420 each. Final count 3 days before event.",
        "Service 7 pm to 11 pm; overtime Rs. 1,500 per hour.",
        "40% advance at booking, balance on event day before service.",
        "FSSAI registration number printed on every quotation.",
      ],
    },
    gstNote:
      "Outdoor catering is commonly billed at 5% GST, but rates depend on the type of supply and venue. Confirm with your accountant.",
    ctaContext: "catering quotations",
    faqs: [
      {
        q: "What should a catering quotation include?",
        a: "A catering quotation should include the per-plate rate with a detailed menu, minimum guarantee and extra plate rate, live counters, water, service style and staff count, service hours and overtime, setup items, responsibilities at the venue, advance, cancellation terms and your FSSAI number.",
      },
      {
        q: "What is a minimum guarantee in catering?",
        a: "A minimum guarantee is the least number of plates the client agrees to pay for, even if fewer guests come. Extra plates beyond it are charged at a stated rate. It lets the caterer plan quantities and protects against last-minute drops in guest count.",
      },
      {
        q: "How do caterers price per plate?",
        a: "Caterers add up ingredient cost, cooking and service labour, transport and overheads for the menu, then divide by the guest count. The per-plate rate depends on the number and type of dishes, live counters and service style.",
      },
      {
        q: "What GST applies to outdoor catering?",
        a: "Outdoor catering is commonly billed at 5% GST, without input tax credit. The rate can differ in some situations, such as certain hotel premises, so confirm the correct rate with your accountant.",
      },
      {
        q: "Should a catering quotation include a cancellation policy?",
        a: "Yes. Caterers buy ingredients and book staff in advance, so the quotation should state how much of the advance is refundable at different notice periods, such as a week or a day before the event.",
      },
    ],
    related: ["event-management-quotation-format", "photography-quotation-format", "printing-quotation-format"],
  },
  {
    slug: "event-management-quotation-format",
    kind: "industry",
    navLabel: "Event management",
    title: "Event Management Quotation Format (Free Sample + Excel)",
    description:
      "Event management quotation format: management fee, stage, sound, LED wall, lighting, anchor and decor, with a sample for a corporate event.",
    h1: "Event Management Quotation Format",
    intro: [
      "An event quotation brings together many vendors: stage, sound, lights, decor, anchor, photographer and more. Clients compare event managers mostly on the total, without seeing which items are your own fee and which are vendor costs. A clear quotation separates the two, which builds trust and makes changes easy when the client trims the budget.",
      "This page explains how to structure an event management quotation, with a sample for a corporate annual day for 150 people.",
    ],
    sections: [
      {
        heading: "Separate your fee from vendor costs",
        paragraphs: [
          "There are two common ways to charge. In the first, you show a management fee for planning and coordination, then each vendor service at its cost. In the second, you quote each service at a price that includes your margin, without a separate fee. Either is fine. What matters is that the client understands what the management fee covers: concept, vendor booking, run of show, on-site coordination and the team on the day.",
          "If the client may book some vendors directly, such as the venue or caterer, say whether your management fee still applies and how you will coordinate with those vendors.",
        ],
      },
      {
        heading: "What to include in an event quotation",
        list: [
          "Event details: date, venue, timing, expected guests and event type.",
          "Stage: size in feet, height, backdrop and its print, and steps or ramps.",
          "Sound: system capacity, number of microphones, DJ or operator, and duration.",
          "Visuals: LED wall size and pixel pitch, or projector and screen.",
          "Lighting: stage lights, ambient and venue lighting.",
          "People: anchor or emcee, hostesses, performers, and security if needed.",
          "Decor: entrance, stage flowers, table centrepieces, photo booth.",
          "Photography and videography: hours, deliverables and timeline.",
          "Power: generator backup and who arranges it.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Run of show and responsibilities",
        paragraphs: [
          "Attach or promise a run of show: setup start time, sound check, guest arrival, programme segments and teardown deadline. Many venues charge for overtime, so the quotation should say who pays if setup or teardown runs late because of client delays. Also list what the client must provide, such as presentation files, award lists and guest lists, with deadlines.",
          "For public events with music, some venues ask for music licences or local permissions. Say in your quotation whether you are arranging these or whether the client or venue is.",
        ],
      },
      {
        heading: "Payment and cancellation",
        paragraphs: [
          "Event vendors need advances, so your quotation should ask for a booking amount, a larger payment a few days before the event, and the balance on completion. State cancellation and postponement terms clearly, because vendor advances are often non-refundable. For outdoor events, mention a weather backup plan and its cost.",
        ],
      },
      {
        heading: "Faster event quotations",
        paragraphs: [
          "Event managers rework the same quotation several times as the client changes the plan. In [Quotely Pro](/quotation-maker-app) you save your standard services and vendor rates, copy a previous event's quotation, drop or add items, and send the revised PDF on WhatsApp in minutes. Take booking amounts with advance receipts. For food and photography, see the [catering](/catering-quotation-format) and [photography](/photography-quotation-format) quotation formats.",
        ],
      },
    ],
    sample: {
      heading: "Sample event quotation (corporate annual day, 150 guests)",
      from: "Spotlight Events, Gurugram",
      to: "Admin Team, Orbit Software Pvt. Ltd., Gurugram",
      subject: "Annual day event at banquet hall, 6 pm to 10 pm",
      items: [
        { name: "Event concept, planning, vendor management and on-site coordination", qty: 1, unit: "Job", rate: 25000, gst: 18 },
        { name: "Stage 24 x 16 ft, 2 ft high, with printed backdrop", qty: 1, unit: "Set", rate: 38000, gst: 18 },
        { name: "Sound system 2 kW with 2 cordless mics and operator", qty: 1, unit: "Day", rate: 18000, gst: 18 },
        { name: "LED wall, P3.9 indoor, 12 x 8 ft", qty: 96, unit: "Sq ft", rate: 140, gst: 18 },
        { name: "Stage lighting: par cans and 4 moving heads with operator", qty: 1, unit: "Set", rate: 15000, gst: 18 },
        { name: "Anchor for 3 hours (English and Hindi)", qty: 1, unit: "Nos", rate: 20000, gst: 18 },
        { name: "Registration desk with 2 hostesses", qty: 1, unit: "Day", rate: 6000, gst: 18 },
        { name: "Photography and videography with edited highlights", qty: 1, unit: "Day", rate: 22000, gst: 18 },
        { name: "Decor: entrance arch, stage flowers and table centrepieces", qty: 1, unit: "Lot", rate: 18000, gst: 18 },
      ],
      terms: [
        "Venue, food and beverages booked by client directly.",
        "50% advance on confirmation, 40% two days before, 10% after event.",
        "Overtime beyond 10 pm as per venue and vendor charges.",
        "Vendor advances are non-refundable on cancellation within 7 days.",
      ],
    },
    ctaContext: "event quotations",
    faqs: [
      {
        q: "What should an event management quotation include?",
        a: "An event management quotation should include event details, the management fee and what it covers, each service such as stage, sound, LED wall, lighting, anchor, decor and photography with specifications, the run of show, client responsibilities, payment schedule and cancellation terms.",
      },
      {
        q: "How do event managers charge for their services?",
        a: "Event managers either charge a separate management fee, fixed or as a percentage of the budget, plus vendor costs, or include their margin within each service price. The quotation should make clear which method is used.",
      },
      {
        q: "How is an LED wall priced in an event quotation?",
        a: "LED walls are usually rented per square foot per day, with the rate depending on pixel pitch and indoor or outdoor use. A 12 x 8 ft wall is 96 sq ft. The quotation should state size, pixel pitch and duration.",
      },
      {
        q: "What payment terms are common for event management?",
        a: "A common structure is a booking advance on confirmation, a larger payment a few days before the event to pay vendors, and the balance after the event. Cancellation terms should mention non-refundable vendor advances.",
      },
      {
        q: "Should the venue and food be in an event management quotation?",
        a: "Only if you are arranging them. If the client books the venue and caterer directly, write that in the quotation and explain how you will coordinate with them on the day.",
      },
    ],
    related: ["catering-quotation-format", "photography-quotation-format", "printing-quotation-format"],
  },
  {
    slug: "printing-quotation-format",
    kind: "industry",
    navLabel: "Printing",
    title: "Printing Quotation Format (Free Sample + Excel)",
    description:
      "Printing quotation format: size, paper GSM, colours, finish, quantity breaks, design and proof approval, with a sample for cards, brochures and flex.",
    h1: "Printing Quotation Format",
    intro: [
      "In printing, two quotations for \"1,000 brochures\" can be for completely different products. Paper weight, colours, lamination and folding change the price a lot, and customers rarely know to ask. A printing quotation that spells out the specification for every job protects you from the customer who compares your rate with a cheaper shop that quoted thinner paper.",
      "This page explains how to write a printing quotation, how to show quantity pricing, and gives a sample order for a small business.",
    ],
    sections: [
      {
        heading: "The specification line is everything",
        paragraphs: [
          "Write each print job as one line with its full specification: product, finished size, paper type and GSM, colours on each side, finish, and any folding or binding. For example: \"Tri-fold brochure, A4 open, 170 GSM art paper, 4 colour both sides, matt lamination, folded.\" Use the standard colour notation if your customers understand it: 4/4 means full colour both sides, 4/0 means full colour one side.",
          "For large-format work like flex banners and standees, write the size in feet, the material (star flex, vinyl, sunboard) and finishing such as eyelets, pasting or frames.",
        ],
      },
      {
        heading: "What a printing quotation should include",
        list: [
          "Product and finished size, with orientation if it matters.",
          "Paper or material type and GSM.",
          "Colours: 4 colour, single colour or Pantone, and on how many sides.",
          "Finish: matt or gloss lamination, spot UV, foiling, embossing, die-cut.",
          "Quantity, and the rate per piece or for the lot.",
          "Design: whether the customer supplies print-ready files, or design charges and number of revisions.",
          "Proof approval: digital proof on WhatsApp before printing.",
          "Delivery time from proof approval, and delivery charges.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Show quantity breaks",
        paragraphs: [
          "Printing gets cheaper per piece as quantity goes up, because setup cost is shared across more copies. Customers often order the smallest quantity without realising that double the quantity costs much less than double the price. Add a line in your terms such as \"Brochures: 1,000 at Rs. 8.00 each, 2,000 at Rs. 6.50 each, 5,000 at Rs. 4.80 each.\" It helps the customer decide and often increases the order.",
        ],
      },
      {
        heading: "Proofs, colour and wastage",
        paragraphs: [
          "Always send a proof and get written approval, even a WhatsApp \"OK\", before printing. State in the quotation that you are not responsible for errors in an approved proof. Also mention that colours on screen may differ slightly from print, and that small colour variation between batches is normal. For large runs, many printers state that quantity may vary by a small percentage due to wastage; if you follow this practice, write it in.",
        ],
      },
      {
        heading: "Faster printing quotations",
        paragraphs: [
          "Print shops quote dozens of small jobs a day, often to the same customers. In [Quotely Pro](/quotation-maker-app) you save your standard products with specifications and rates, copy a customer's last order for the reprint, change quantities, and send the PDF on WhatsApp in a minute. For event printing such as backdrops and standees, the [event management quotation format](/event-management-quotation-format) covers the rest of the event.",
        ],
      },
    ],
    sample: {
      heading: "Sample printing quotation (stationery and promotional printing)",
      from: "PrintPoint Digital & Offset, Bhopal",
      to: "Mehta Diagnostics, MP Nagar, Bhopal",
      subject: "Stationery and promotional printing for new branch",
      items: [
        { name: "Visiting cards, 350 GSM, 4/4, matt lamination", qty: 1000, unit: "Nos", rate: 1.2, gst: 18 },
        { name: "Tri-fold brochure, A4 open, 170 GSM art paper, 4/4, folded", qty: 2000, unit: "Nos", rate: 6.5, gst: 18 },
        { name: "Letterhead A4, 100 GSM, 4/0", qty: 1000, unit: "Nos", rate: 3.2, gst: 18 },
        { name: "Flex banner, star flex with eyelets (4 banners of 6 x 3 ft)", qty: 72, unit: "Sq ft", rate: 18, gst: 18 },
        { name: "Roll-up standee 6 x 3 ft with print and carry bag", qty: 2, unit: "Nos", rate: 1650, gst: 18 },
        { name: "Brochure design, 2 revisions", qty: 1, unit: "Job", rate: 2500, gst: 18 },
        { name: "Delivery within city", qty: 1, unit: "Job", rate: 300, gst: 18 },
      ],
      terms: [
        "Printing starts after written proof approval.",
        "Delivery: 4 working days from proof approval.",
        "Slight colour variation from screen to print is normal.",
        "50% advance for orders above Rs. 5,000.",
      ],
    },
    gstNote:
      "GST on printing depends on whether it is treated as goods or a printing service, and on the product. Rates shown are common; confirm with your accountant.",
    ctaContext: "printing quotations",
    faqs: [
      {
        q: "What should a printing quotation include?",
        a: "A printing quotation should include the product, finished size, paper type and GSM, colours on each side, finish such as lamination or spot UV, quantity and rate, design charges or file requirements, proof approval, delivery time and payment terms.",
      },
      {
        q: "What does 4/4 and 4/0 mean in a printing quotation?",
        a: "4/4 means full colour (four colour process) printing on both sides, and 4/0 means full colour on one side with the other side blank. 1/0 means single colour on one side.",
      },
      {
        q: "Why does the price per piece drop for larger print quantities?",
        a: "Each print job has fixed setup costs such as plates, machine setup and cutting. In larger runs these costs are shared across more pieces, so the rate per piece falls. Showing quantity breaks helps customers choose.",
      },
      {
        q: "Should design charges be separate in a printing quotation?",
        a: "Yes. Show design as its own line with the number of revisions included. If the customer supplies print-ready files, write that no design charge applies, and mention the file format you need.",
      },
      {
        q: "Why is proof approval important before printing?",
        a: "A proof lets the customer check text, phone numbers, colours and layout before the full run is printed. Getting written approval, even on WhatsApp, protects the printer from reprinting at their own cost for errors the customer missed.",
      },
    ],
    related: ["event-management-quotation-format", "web-design-quotation-format", "photography-quotation-format"],
  },
  {
    slug: "web-design-quotation-format",
    kind: "industry",
    navLabel: "Web design",
    title: "Web Design Quotation Format (Free Sample + Excel)",
    description:
      "Web design quotation format for freelancers: pages, features, revisions, domain and hosting, milestones and ownership, with a sample quotation.",
    h1: "Web Design Quotation Format",
    intro: [
      "Web design projects go wrong in the middle, not at the start. The client adds pages, asks for a fifth round of changes, or sends content three weeks late, and the project that was quoted for two weeks is still open after two months. A good web design quotation defines the scope tightly enough that every change has a clear price.",
      "This page is written for freelancers and small agencies. It covers what to put in a website quotation, and gives a sample for a six-page business website.",
    ],
    sections: [
      {
        heading: "Define the scope precisely",
        list: [
          "Pages: list each page by name, such as Home, About, Services, Gallery, Blog and Contact, rather than a page count alone.",
          "Platform: WordPress, a site builder, or custom code, and whether the client will edit content themselves.",
          "Features: contact form, WhatsApp chat button, map, gallery, blog, booking or payment gateway. Each feature is a line.",
          "Design: custom design or a theme customised to the brand, and how many design concepts.",
          "Responsive design for mobile and tablet, which should be standard.",
          "Revisions: the number of revision rounds included, and the rate for extra rounds.",
          "Content: who writes the text and supplies the images, and the deadline for content.",
          "Exclusions: logo design, copywriting, paid plugins or themes, stock photos, and ads.",
        ],
      },
      {
        heading: "Domain, hosting and ownership",
        paragraphs: [
          "Register the domain and hosting in the client's name, with their email, even if you pay for it and bill them. Write this in the quotation. It avoids awkward situations later if the relationship ends, and clients trust freelancers who offer it.",
          "Also state when ownership of the design and code passes to the client, usually on full payment, and whether you may show the site in your portfolio.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Milestones and payment",
        paragraphs: [
          "Tie payments to milestones: an advance to start, a payment on design approval, and the balance before the site goes live. A common split is 50 percent, 25 percent and 25 percent. Give a timeline for each milestone in working days, and make it depend on the client: \"Timeline starts after receipt of advance and all content.\"",
          "After launch, offer a maintenance plan as a separate line: updates, backups and small content changes for a monthly or yearly fee. It keeps you in touch with the client and brings regular income.",
        ],
      },
      {
        heading: "GST for freelancers",
        paragraphs: [
          "Many freelancers are not GST registered, because registration is generally required only when turnover from services crosses Rs. 20 lakh in a year (Rs. 10 lakh in some special category states), or in certain cases such as some exports. If you are registered, show GST on the quotation. If not, write \"GST not applicable\" so the client does not expect tax to be added later. Your accountant can confirm which applies to you.",
        ],
      },
      {
        heading: "Faster web design quotations",
        paragraphs: [
          "Most website quotations reuse the same page and feature lines. In [Quotely Pro](/quotation-maker-app) you save your page rates, features and hosting lines, copy a previous proposal, adjust for the new client, and send a clean PDF on WhatsApp the same day as the discovery call. For print material to go with the website, see the [printing quotation format](/printing-quotation-format).",
        ],
      },
    ],
    sample: {
      heading: "Sample web design quotation (6-page business website)",
      from: "Riya Sharma, Freelance Web Designer, Chandigarh",
      to: "Kumar Physiotherapy Clinic, Sector 22, Chandigarh",
      subject: "Design and development of business website (6 pages)",
      items: [
        { name: "UI design: Home, About, Services, Gallery, Blog, Contact", qty: 6, unit: "Pages", rate: 3500, gst: 18 },
        { name: "Responsive WordPress development", qty: 6, unit: "Pages", rate: 3000, gst: 18 },
        { name: "Contact form, Google Map and WhatsApp chat button", qty: 1, unit: "Job", rate: 2000, gst: 18 },
        { name: "Basic on-page SEO: titles, meta descriptions, sitemap, Search Console", qty: 1, unit: "Job", rate: 3500, gst: 18 },
        { name: "Domain registration, .in (in client's name)", qty: 1, unit: "Year", rate: 800, gst: 18 },
        { name: "Shared hosting with SSL (in client's name)", qty: 1, unit: "Year", rate: 4500, gst: 18 },
        { name: "Content upload (text and images supplied by client)", qty: 1, unit: "Job", rate: 2000, gst: 18 },
        { name: "Training session and handover (1 hour)", qty: 1, unit: "Job", rate: 1500, gst: 18 },
      ],
      terms: [
        "2 rounds of design revisions included; extra rounds Rs. 1,500 each.",
        "Payment: 50% advance, 25% on design approval, 25% before go-live.",
        "Timeline: 15 working days after advance and all content received.",
        "Ownership transfers to client on full payment.",
      ],
    },
    ctaContext: "web design quotations",
    faqs: [
      {
        q: "What should a web design quotation include?",
        a: "A web design quotation should list each page, the platform, features such as forms and chat buttons, design approach, revision rounds, content responsibility, domain and hosting, timeline, payment milestones, ownership terms, maintenance options and exclusions such as logo design and copywriting.",
      },
      {
        q: "How do freelancers price website design?",
        a: "Freelancers commonly price per page plus features, or as a fixed project price for a defined scope. Per-page pricing makes it easy to adjust when the client adds or removes pages. Domain, hosting and maintenance are usually separate lines.",
      },
      {
        q: "Who should own the domain and hosting?",
        a: "The domain and hosting should be registered in the client's name and email, even if the designer sets them up. This gives the client full control of their website and avoids disputes if they change designers later.",
      },
      {
        q: "How many revisions should a web design quotation include?",
        a: "Two revision rounds for design is a common standard. The quotation should state the number included and the charge for extra rounds, so scope changes are paid for fairly.",
      },
      {
        q: "Do freelance web designers need to charge GST?",
        a: "Generally, GST registration is required when annual turnover from services exceeds Rs. 20 lakh (Rs. 10 lakh in some special category states), with some exceptions. If not registered, write that GST is not applicable. Confirm your position with an accountant.",
      },
    ],
    related: ["printing-quotation-format", "photography-quotation-format", "networking-quotation-format"],
  },
  {
    slug: "photography-quotation-format",
    kind: "industry",
    navLabel: "Photography",
    title: "Photography Quotation Format (Free Sample + Excel)",
    description:
      "Photography quotation format for weddings: coverage days, team, edited photos, films, albums, drone, travel and booking terms, with a sample.",
    h1: "Photography Quotation Format",
    intro: [
      "Clients book photographers months ahead, often after comparing five or six packages that all look similar. The difference is in the deliverables: how many edited photos, how long the film is, what album, and how soon they get it. A photography quotation that lists these clearly helps the client compare on value, and saves you from expectations you never agreed to.",
      "This page covers how to quote wedding and event photography, with a sample for a two-day wedding.",
    ],
    sections: [
      {
        heading: "Coverage: days, hours and team",
        paragraphs: [
          "Write coverage by event and day: \"Day 1: haldi and mehendi, 4 pm to 10 pm. Day 2: wedding, 8 am to 2 pm.\" Say how many photographers and videographers will be there, and who does candid versus traditional coverage. Add an overtime rate per hour, because Indian weddings rarely run on time.",
        ],
      },
      {
        heading: "Spell out the deliverables",
        list: [
          "Edited photos: an approximate number, and the editing level (colour correction, retouching on selected photos).",
          "Raw or unedited photos: whether they are delivered, and in what form.",
          "Films: highlight film length, full-length video, teaser for social media, and music licensing approach.",
          "Album: size, number of sheets, paper type, cover, and how many copies.",
          "Delivery method: online gallery, pen drive or hard disk.",
          "Delivery timeline for each deliverable, such as sneak peeks in 3 days, photos in 4 weeks, album after selection.",
        ],
      },
      {
        sample: true,
      },
      {
        heading: "Booking, travel and rights",
        paragraphs: [
          "A booking amount blocks the date, so state that it is non-refundable or adjustable if the date changes, and how much is due before the event and on delivery. For travel outside your city, list travel and stay as a separate line, or say the client arranges them for the team.",
          "Mention usage rights: the client gets personal use of the photos, and you may use selected photos in your portfolio and social media unless the client asks otherwise. Some families prefer privacy, and settling it in the quotation avoids hurt feelings later.",
        ],
      },
      {
        heading: "Drone coverage",
        paragraphs: [
          "Drone shots are popular, but flying is not allowed everywhere. Many venues, heritage sites and areas near airports restrict drones, and some need permission. Write \"Drone coverage subject to venue permission and applicable rules\" and say whether the drone charge is refunded or adjusted if flying is not allowed.",
        ],
      },
      {
        heading: "Faster photography quotations",
        paragraphs: [
          "Photographers send packages again and again with small changes in days and deliverables. In [Quotely Pro](/quotation-maker-app) you save your coverage, film, album and travel lines, copy a previous package, adjust for the new booking, and send the PDF on WhatsApp right after the enquiry call. Take the booking amount with an advance receipt. For the rest of the event, see the [event management](/event-management-quotation-format) and [catering](/catering-quotation-format) quotation formats.",
        ],
      },
    ],
    sample: {
      heading: "Sample photography quotation (2-day wedding)",
      from: "Frames by Arjun Photography, Kochi",
      to: "Mr. and Mrs. Thomas, Ernakulam",
      subject: "Wedding photography and films, 2 days",
      items: [
        { name: "Candid photography, 2 photographers, per day", qty: 2, unit: "Days", rate: 25000, gst: 18 },
        { name: "Traditional photography and videography, per day", qty: 2, unit: "Days", rate: 18000, gst: 18 },
        { name: "Cinematic highlight film, 4 to 5 minutes", qty: 1, unit: "Nos", rate: 20000, gst: 18 },
        { name: "Drone coverage (subject to venue permission)", qty: 1, unit: "Day", rate: 8000, gst: 18 },
        { name: "Pre-wedding shoot, 1 location, half day", qty: 1, unit: "Nos", rate: 22000, gst: 18 },
        { name: "Premium album 12 x 36 inch, 40 sheets", qty: 2, unit: "Nos", rate: 9500, gst: 18 },
        { name: "Travel and stay for team outside city", qty: 1, unit: "Lot", rate: 6000, gst: 18 },
      ],
      terms: [
        "About 600 edited photos via online gallery in 4 weeks.",
        "Overtime beyond scheduled hours: Rs. 3,000 per hour.",
        "Booking amount 30% to block dates; 50% before event; 20% on delivery.",
        "Selected photos may be used in our portfolio unless client opts out.",
      ],
    },
    ctaContext: "photography quotations",
    faqs: [
      {
        q: "What should a photography quotation include?",
        a: "A photography quotation should include coverage days and hours, team size, deliverables such as number of edited photos, films and albums, delivery timelines, drone coverage terms, travel, overtime rate, booking amount and payment schedule, and usage rights.",
      },
      {
        q: "How do wedding photographers price their packages?",
        a: "Wedding photographers usually price per day of coverage for each team, such as candid and traditional, then add films, albums, pre-wedding shoots, drone coverage and travel as separate lines. Packages combine these into one price.",
      },
      {
        q: "How many edited photos should a wedding photography quotation promise?",
        a: "It depends on coverage, but many photographers deliver a few hundred edited photos per wedding day. Write an approximate number in the quotation so the client knows what to expect.",
      },
      {
        q: "Is the photography booking amount refundable?",
        a: "Many photographers treat the booking amount as non-refundable because the date is blocked and other enquiries are turned away. Some allow it to be adjusted if the date changes. State your policy clearly in the quotation.",
      },
      {
        q: "Can drone photography be done at any wedding venue?",
        a: "No. Many venues, heritage sites and areas near airports restrict drone flying, and some require permission. Quotations should say drone coverage is subject to venue permission and applicable rules.",
      },
    ],
    related: ["event-management-quotation-format", "catering-quotation-format", "web-design-quotation-format"],
  },
];

// Comparison pages: describe other products only in general terms; never claim their
// features or prices. Each page has its own angle (not a name swap).
const TRADEMARK_NOTE =
  "Vyapar, Zoho and myBillBook are trademarks of their respective owners. Quotely Pro is not affiliated with them.";

export const COMPARISON_PAGES = [
  {
    slug: "vyapar-alternative-for-quotations",
    kind: "comparison",
    navLabel: "Quotely Pro and Vyapar",
    title: "Vyapar Alternative for Quotations | Quotely Pro",
    description:
      "Quotely Pro makes quotations and turns them into invoices. Keep Vyapar for accounts and GST returns. How they fit, and when Vyapar alone is enough.",
    h1: "Vyapar Alternative for Quotations",
    intro: [
      "If you are searching for a Vyapar alternative only because making quotations feels slow, you may not need to replace anything. Vyapar is full billing and accounting software for small businesses. Quotely Pro is built around quotations, and turns them into invoices when the customer agrees. Many businesses keep Vyapar for accounts and GST returns and use Quotely Pro for quotations and invoices.",
      "This page explains how the two fit together, the situations where a quotation-first tool helps, and when you are better off staying with Vyapar alone.",
    ],
    sections: [
      {
        heading: "Different tools for different jobs",
        compare: {
          columns: ["", "Vyapar", "Quotely Pro"],
          rows: [
            ["What it is", "Full billing and accounting software", "Quotation maker with invoices built in"],
            ["Main job", "Running the business's billing, books and records", "Getting a neat quotation to the customer fast"],
            ["Where it fits", "After the sale and for everyday accounts", "From the enquiry to the invoice"],
            ["Invoices", "Yes, as part of full billing", "Yes — convert a quotation to an invoice and print it"],
            ["Accounting and GST returns", "Its core job", "Not done; use your accounting software"],
            ["Typical user", "Owner or accountant managing the business", "Owner or technician quoting from the site"],
          ],
        },
      },
      {
        heading: "Who this is for: traders and installers who quote on the move",
        paragraphs: [
          "The businesses that benefit most from a separate quotation tool are those where quotations are made away from the counter or desk. An installer standing in a customer's shop, a contractor at a building site, or a trader visiting an office for a bulk order needs to send a quotation from a phone while the customer is still interested.",
          "Quotely Pro is built for that moment. You pick items from your saved list or copy a previous quotation, adjust quantities, and download a branded PDF to send on WhatsApp. When the customer confirms, convert the accepted quotation into an invoice with the customer and items already filled in, and print or download it as a branded PDF.",
        ],
      },
      {
        heading: "How to use both without double work",
        orderedList: [
          "Use the same item names and rates in both, so a quotation in Quotely Pro matches the invoice in Vyapar line for line.",
          "Make and send quotations in Quotely Pro. Revise them as often as the customer negotiates.",
          "When the customer accepts, record the advance if any, and convert the quotation into an invoice in Quotely Pro.",
          "If you are GST-registered, keep Vyapar for accounts, GST returns and stock. Quotely Pro does not do those.",
        ],
      },
      {
        heading: "Do you need both?",
        paragraphs: [
          "If you are GST-registered and need GST returns and accounts, keep Vyapar for that. If you are a small business that mainly sends quotations and simple invoices, Quotely Pro alone may be enough.",
        ],
      },
      {
        heading: "When you should stick with Vyapar",
        list: [
          "You send only a few quotations a month. One tool is simpler than two.",
          "Your quotations are short, with two or three lines, and you make them at your desk.",
          "You want every document, from quotation to invoice to payment, in one system for your accountant.",
          "Your staff are trained on Vyapar and adding another tool would slow them down.",
        ],
      },
      {
        heading: "When Quotely Pro is worth adding",
        list: [
          "You send quotations every day, many of them similar, with 10 or more line items.",
          "You or your team quote from sites on a phone and lose jobs to faster competitors.",
          "You want to reuse old quotations with Copy, or use AI Quick Create: type what you need in plain words, and AI picks the matching items, quantities and prices from your saved catalogue.",
          "You install equipment and want warranty certificates and a list of warranties ending soon for AMC follow-up.",
        ],
      },
      {
        heading: "Try it before deciding",
        paragraphs: [
          "7-day free trial. No payment needed. Use it alongside Vyapar for a week of real quotations and see whether they go out faster. If not, you have lost nothing. To learn what a strong quotation contains, read the [quotation format](/quotation-format) guide.",
        ],
      },
    ],
    ctaContext: "quotations and invoices",
    faqs: [
      {
        q: "Is Quotely Pro a replacement for Vyapar?",
        a: "Partly. It covers quotations and invoices. It does not do accounting, GST returns or stock, so GST-registered businesses usually keep Vyapar for those.",
      },
      {
        q: "Can I use Quotely Pro and Vyapar together?",
        a: "Yes. Make and send quotations and invoices in Quotely Pro, and keep Vyapar for accounts, GST returns and stock. Using the same item names and rates in both keeps the documents consistent.",
      },
      {
        q: "When should I just use Vyapar for quotations?",
        a: "If you send only a few short quotations a month from your desk, or want everything in one system for your accountant, staying with one tool is simpler. A separate quotation tool helps most when you quote often, with many items, from a phone.",
      },
      {
        q: "Does Quotely Pro do accounts and GST returns like Vyapar?",
        a: "No. Quotely Pro does not keep books, file GST returns, manage stock or split CGST, SGST and IGST. It makes quotations and turns them into invoices; your accounting software remains your system for accounts and returns.",
      },
      {
        q: "Is there a free trial of Quotely Pro?",
        a: "Yes. 7-day free trial. No payment needed. Message us on WhatsApp to set up your account.",
      },
    ],
    disclaimer: TRADEMARK_NOTE,
    related: ["mybillbook-alternative-for-quotations", "zoho-invoice-alternative-for-quotations", "quotely-pro-vs-excel-quotations"],
  },
  {
    slug: "zoho-invoice-alternative-for-quotations",
    kind: "comparison",
    navLabel: "Quotely Pro and Zoho Invoice",
    title: "Zoho Invoice Alternative for Quotations | Quotely Pro",
    description:
      "Quotely Pro makes item-heavy quotations on your phone and turns them into invoices. Keep Zoho for accounts and GST returns. When Zoho alone is enough.",
    h1: "Zoho Invoice Alternative for Quotations",
    intro: [
      "Zoho Invoice is invoicing software from Zoho, a company that offers a large family of business apps. Quotely Pro is much narrower: it is a quotation maker with invoices built in, for small businesses in India, built for quotations with many line items made on a phone. Quotely Pro is built around quotations, and turns them into invoices when the customer agrees.",
      "This page is for service businesses and freelancers deciding whether Quotely Pro makes sense next to Zoho, or instead of it, and when it does not.",
    ],
    sections: [
      {
        heading: "Different tools for different jobs",
        compare: {
          columns: ["", "Zoho Invoice", "Quotely Pro"],
          rows: [
            ["What it is", "Invoicing software, part of a wider Zoho suite", "Quotation maker with invoices built in"],
            ["Main job", "Invoicing and related business records", "Item-wise quotations made quickly on a phone"],
            ["Wider system", "Part of the wider Zoho suite of business apps", "Works on its own, alongside any accounting software"],
            ["Invoices", "Yes, its core job", "Yes — convert a quotation to an invoice and print it"],
            ["Accounting and GST returns", "Available through Zoho's accounting products", "Not done; use your accounting software"],
            ["Built around", "The invoicing workflow", "Repeating and reusing quotations"],
          ],
        },
      },
      {
        heading: "The problem Quotely Pro solves: repeat quotations with many items",
        paragraphs: [
          "Service businesses such as installers, interior contractors and AMC providers send quotations that look almost the same each time: the same 15 or 20 items, different quantities. Typing them again is slow and error-prone, especially on a phone.",
          "Quotely Pro is designed around reuse. You save your items and rates once, copy a previous quotation and change only what is different, or use AI Quick Create: type what you need in plain words, and AI picks the matching items, quantities and prices from your saved catalogue, so a quotation is ready in seconds. You download the PDF and send it on WhatsApp.",
        ],
      },
      {
        heading: "A simple workflow with both",
        orderedList: [
          "Quote in Quotely Pro, from the site or the office, and revise as the customer negotiates.",
          "When the customer accepts, convert the quotation into an invoice in Quotely Pro. If your accountant needs records in Zoho, keep that side in Zoho.",
          "Keep customer and item names the same in both to make matching easy.",
          "For installed equipment, issue a warranty certificate from Quotely Pro and track when it ends for AMC renewals.",
        ],
      },
      {
        heading: "Do you need both?",
        paragraphs: [
          "If you are GST-registered and need GST returns and accounts, keep Zoho for that. If you are a small business that mainly sends quotations and simple invoices, Quotely Pro alone may be enough.",
        ],
      },
      {
        heading: "When you should stick with Zoho",
        list: [
          "You already use other Zoho apps and want quotations, invoices and customer records connected in one ecosystem.",
          "Your quotations are short and you make them at a computer.",
          "Your accountant works directly in your Zoho account and prefers every document there.",
          "You send only a handful of quotations a month.",
        ],
      },
      {
        heading: "When Quotely Pro is worth adding",
        list: [
          "You quote daily and most quotations reuse the same items.",
          "You make quotations on your phone at customer sites.",
          "You want a branded PDF with your logo, terms, signature and payment QR, ready for WhatsApp in a minute.",
          "You want warranty certificates and expiry tracking for equipment you install.",
        ],
      },
      {
        heading: "Try it for a month",
        paragraphs: [
          "7-day free trial. No payment needed. Run it next to Zoho Invoice for a week and compare how long each quotation takes. For the difference between the two documents, read [quotation vs invoice](/quotation-vs-invoice).",
        ],
      },
    ],
    ctaContext: "quotations and invoices",
    faqs: [
      {
        q: "Is Quotely Pro an alternative to Zoho Invoice?",
        a: "Partly. It covers quotations and invoices. It does not do accounting, GST returns or stock, so GST-registered businesses usually keep Zoho for those.",
      },
      {
        q: "Can I use Quotely Pro with Zoho?",
        a: "Yes. Make quotations and invoices in Quotely Pro and keep Zoho for accounts and GST returns. Keeping the same item and customer names in both makes records easy to match.",
      },
      {
        q: "When is Zoho Invoice alone enough?",
        a: "If you use other Zoho apps and want everything connected, make short quotations at a computer, or send only a few quotations a month, using Zoho alone is simpler.",
      },
      {
        q: "What does Quotely Pro do better for quotations?",
        a: "Quotely Pro is built around quotations: saved items, copying old quotations, AI Quick Create from your saved catalogue, and branded PDFs ready for WhatsApp, all designed for use on a phone. Accepted quotations convert to invoices.",
      },
      {
        q: "Does Quotely Pro connect to Zoho?",
        a: "No. Quotely Pro does not connect to Zoho or other billing software. You can use them side by side, with quotations and invoices in Quotely Pro and accounts in your accounting software.",
      },
    ],
    disclaimer: TRADEMARK_NOTE,
    related: ["vyapar-alternative-for-quotations", "mybillbook-alternative-for-quotations", "quotely-pro-vs-excel-quotations"],
  },
  {
    slug: "mybillbook-alternative-for-quotations",
    kind: "comparison",
    navLabel: "Quotely Pro and myBillBook",
    title: "myBillBook Alternative for Quotations | Quotely Pro",
    description:
      "Quotely Pro makes quotations, turns them into invoices and tracks warranties. Keep myBillBook for accounts and GST returns. When myBillBook is enough.",
    h1: "myBillBook Alternative for Quotations",
    intro: [
      "myBillBook is billing and accounting software for small businesses. Quotely Pro is a quotation maker with invoices built in, and it also covers what happens after an installation: warranty certificates and tracking when warranties end. Quotely Pro is built around quotations, and turns them into invoices when the customer agrees.",
      "This page explains where each fits for installation and service businesses, and when myBillBook on its own is the better choice.",
    ],
    sections: [
      {
        heading: "Different tools for different jobs",
        compare: {
          columns: ["", "myBillBook", "Quotely Pro"],
          rows: [
            ["What it is", "Billing and accounting software", "Quotation maker with invoices built in"],
            ["Main job", "Billing, accounts and business records", "Quotations, invoices, then warranty and AMC follow-up"],
            ["Stage of the sale", "After the sale and ongoing accounts", "From enquiry to invoice, and after installation"],
            ["Invoices", "Yes, as part of full billing", "Yes — convert a quotation to an invoice and print it"],
            ["Accounting and GST returns", "Its core job", "Not done; use your accounting software"],
            ["Best for", "Running the business's books", "Installers who quote, install and maintain"],
          ],
        },
      },
      {
        heading: "For installers: quotation, installation, warranty, renewal",
        paragraphs: [
          "Installation businesses, such as CCTV, solar, AC, water purifiers and electrical, have a longer cycle than a simple sale. You quote, install, give a warranty, and then ideally sell an AMC when the warranty ends. The renewal is where much of the long-term profit is, and it is easy to forget.",
          "Quotely Pro covers this cycle. You make the quotation on your phone and send the PDF on WhatsApp. When the customer accepts, you convert it into an invoice. After installation, you issue a warranty certificate for the items installed. In Reports you can see which warranties are ending soon, so you call the customer about an AMC at the right time. Accounts and GST returns can stay in myBillBook.",
        ],
      },
      {
        heading: "How to use both",
        orderedList: [
          "Quote in Quotely Pro and send the PDF on WhatsApp.",
          "Take any booking amount and give an advance receipt.",
          "When the customer accepts, convert the quotation into an invoice and print it. Record it in myBillBook if you need it for your books and GST returns.",
          "Issue the warranty certificate in Quotely Pro, and check expiring warranties each month for AMC calls.",
        ],
      },
      {
        heading: "Do you need both?",
        paragraphs: [
          "If you are GST-registered and need GST returns and accounts, keep myBillBook for that. If you are a small business that mainly sends quotations and simple invoices, Quotely Pro alone may be enough.",
        ],
      },
      {
        heading: "When you should stick with myBillBook",
        list: [
          "You sell over the counter and rarely send formal quotations.",
          "You do not install equipment, so warranty and AMC follow-up does not apply.",
          "You prefer one app for everything and your quotations are simple.",
          "Your team already uses myBillBook daily and does not need a second tool.",
        ],
      },
      {
        heading: "When Quotely Pro is worth adding",
        list: [
          "You send detailed quotations with many items, often from customer sites.",
          "You reuse similar quotations and want Copy or AI Quick Create, which picks the matching items, quantities and prices from your saved catalogue when you type what you need in plain words.",
          "You install equipment and want to issue warranty certificates and follow up on AMC renewals.",
        ],
      },
      {
        heading: "Try it for a month",
        paragraphs: [
          "7-day free trial. No payment needed. Warranty certificates and receipts are part of the Pro plan. See the [CCTV](/cctv-quotation-format) and [AC installation](/ac-installation-service-quotation-format) quotation formats for examples of the quotations installers send.",
        ],
      },
    ],
    ctaContext: "quotations and invoices",
    faqs: [
      {
        q: "Is Quotely Pro a replacement for myBillBook?",
        a: "Partly. It covers quotations and invoices. It does not do accounting, GST returns or stock, so GST-registered businesses usually keep myBillBook for those.",
      },
      {
        q: "Why would an installer use Quotely Pro with myBillBook?",
        a: "Installers quote from sites, install equipment and give warranties. Quotely Pro makes quotations quickly on a phone, issues warranty certificates, and shows which warranties are ending so the installer can offer an AMC on time.",
      },
      {
        q: "When is myBillBook alone enough?",
        a: "If you mostly sell over the counter, rarely send formal quotations, and do not install equipment, one billing app is simpler and enough.",
      },
      {
        q: "Does Quotely Pro track AMC renewals?",
        a: "Quotely Pro lets you issue warranty certificates and see in Reports which warranties are ending soon. You use that list to contact customers about AMC renewals.",
      },
      {
        q: "Does Quotely Pro sync with myBillBook?",
        a: "No. There is no connection between the two. You can use them side by side, with quotations, invoices and warranties in Quotely Pro and accounts in myBillBook.",
      },
    ],
    disclaimer: TRADEMARK_NOTE,
    related: ["vyapar-alternative-for-quotations", "zoho-invoice-alternative-for-quotations", "quotely-pro-vs-excel-quotations"],
  },
  {
    slug: "quotely-pro-vs-excel-quotations",
    kind: "comparison",
    navLabel: "Quotely Pro vs Excel",
    title: "Quotely Pro vs Excel for Quotations: Which to Use?",
    description:
      "Excel is flexible and you may already have it. Quotely Pro is faster for repeat quotations on a phone. A fair comparison, and when Excel is better.",
    h1: "Quotely Pro vs Excel for Quotations",
    intro: [
      "Excel is where most small businesses make their first quotation template, and for good reason: it is flexible, many people already have it, and it does the maths. Quotely Pro is a quotation maker built for one thing, making item-wise quotations quickly on a phone. Neither is right for everyone.",
      "This page compares the two honestly, so you can decide which suits the way you work.",
    ],
    sections: [
      {
        heading: "Side by side",
        compare: {
          columns: ["", "Excel template", "Quotely Pro"],
          rows: [
            ["Cost", "Often already available; free alternatives like Google Sheets exist", "Free for 7 days, then from ₹999/month (final price, no hidden charges)"],
            ["Setup", "Build or download a template, set up formulas", "We set up your account, logo and terms with you"],
            ["On a phone", "Possible, but editing cells on a small screen is slow", "Built for phone use in the browser"],
            ["Totals", "Correct if formulas are right; easy to break by mistake", "Calculated automatically"],
            ["Reusing items", "Copy and paste from old files", "Saved items, Copy quotation, AI Quick Create"],
            ["Sharing", "Export to PDF, then send", "Download PDF, then send on WhatsApp"],
            ["Without internet", "Works offline", "Needs an internet connection"],
            ["Flexibility", "Any layout or calculation you can build", "A fixed, professional quotation layout"],
          ],
        },
      },
      {
        heading: "Where Excel is the better choice",
        list: [
          "You send a few quotations a month, at a computer.",
          "Your quotations need unusual calculations, such as complex area or load formulas, that a fixed layout cannot handle.",
          "You often work without internet.",
          "You do not want to pay for a tool, and a template works well for you.",
        ],
      },
      {
        paragraphs: [
          "If this is you, keep using Excel. Make one master template with your logo, terms and a numbered item table, and copy it for each new customer. Our [quotation format](/quotation-format) guide lists what the template should contain.",
        ],
      },
      {
        heading: "Where Quotely Pro saves time",
        paragraphs: [
          "Excel starts to slow you down when you quote often and away from a desk. Finding the right old file, copying rows, fixing a formula that broke, adjusting column widths so the PDF looks right, and doing all of it on a phone screen, takes minutes per quotation that add up over a month.",
          "In Quotely Pro, your items and rates are saved once. You copy a previous quotation or type what you need in plain words, and AI Quick Create picks the matching items, quantities and prices from your saved catalogue. The PDF always comes out with the same clean layout, your logo, terms, signature and payment QR, ready to send on WhatsApp.",
        ],
      },
      {
        heading: "Common Excel quotation mistakes",
        list: [
          "A formula that does not include a newly added row, so the total is wrong.",
          "An old customer's name left in the header of a copied file.",
          "Different versions of the same quotation saved with confusing names.",
          "Rates that are out of date because each file has its own copy of the price list.",
        ],
      },
      {
        heading: "Trying both",
        paragraphs: [
          "You do not have to choose blindly. 7-day free trial. No payment needed. Make your next few quotations in both and compare the time taken. If you also need invoices, read [quotation vs invoice](/quotation-vs-invoice); if you are looking for no-cost options, see the [free quotation maker](/free-quotation-maker) page.",
        ],
      },
    ],
    ctaContext: "quotations instead of Excel",
    faqs: [
      {
        q: "Is Excel good enough for making quotations?",
        a: "Yes, for many businesses. If you send a few quotations a month at a computer, an Excel or Google Sheets template with your details, an item table, totals and terms works well. A dedicated tool helps when you quote often or on a phone.",
      },
      {
        q: "What is the main advantage of a quotation app over Excel?",
        a: "Speed for repeat work. A quotation app saves your items and rates, lets you copy old quotations, calculates totals automatically and produces a consistent PDF, which is much faster than editing spreadsheets, especially on a phone.",
      },
      {
        q: "Does Quotely Pro work offline like Excel?",
        a: "No. Quotely Pro is a web app and needs an internet connection. Excel works offline, which matters if you often quote in places without mobile data.",
      },
      {
        q: "Can I move from Excel to Quotely Pro easily?",
        a: "Yes. Add the items and rates you use most into Quotely Pro once, and when we set up your account we add your logo and terms. After that, new quotations reuse those saved items.",
      },
      {
        q: "Can I use Quotely Pro for free, like Google Sheets?",
        a: "No. Quotely Pro is free for 7 days, then it is a paid tool from ₹999 per month. Final price. No hidden charges. Google Sheets is free, and it is a good choice if you send few quotations.",
      },
    ],
    disclaimer: "Microsoft Excel is a trademark of Microsoft Corporation, and Google Sheets is a trademark of Google LLC. Quotely Pro is not affiliated with them.",
    related: ["vyapar-alternative-for-quotations", "zoho-invoice-alternative-for-quotations", "mybillbook-alternative-for-quotations"],
  },
];

export const ALL_PAGES = [...GENERAL_PAGES, ...INDUSTRY_PAGES, ...COMPARISON_PAGES];

export function getPage(slug) {
  return ALL_PAGES.find((p) => p.slug === slug);
}
