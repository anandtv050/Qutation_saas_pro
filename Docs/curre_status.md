Frontend Pages (7 total)
#	Page	File	Status
1	Login	Login.jsx	✅ Connected to BE
2	Dashboard/Home	Dashboard.jsx	✅ UI done
3	New Quotation	NewQuotation.jsx	✅ UI done
4	New Invoice	NewInvoice.jsx	✅ UI done
5	Inventory	Inventory.jsx	✅ UI done
6	Reports	Reports.jsx	✅ UI done
7	Profile	Profile.jsx	✅ Connected to BE


APIs Needed (Total: ~15 APIs)
1. Auth APIs (Already Done ✅)

API	Method	Endpoint
Login	POST	/auth/login
2. Dashboard APIs (2)
API	Method	Endpoint	Used In
Get dashboard stats	GET	/dashboard/stats	Dashboard.jsx
Get recent activity	GET	/dashboard/recent	Dashboard.jsx (optional)

3. Quotation APIs (5)
API	Method	Endpoint	Used In
Create quotation	POST	/quotations	NewQuotation.jsx
List quotations	GET	/quotations	Reports.jsx
Get single quotation	GET	/quotations/{id}	(view/edit)
Update quotation	PUT	/quotations/{id}	NewQuotation.jsx
Delete quotation	DELETE	/quotations/{id}	(optional)

4. Invoice APIs (5)
API	Method	Endpoint	Used In
Create invoice	POST	/invoices	NewInvoice.jsx
List invoices	GET	/invoices	Reports.jsx
Get single invoice	GET	/invoices/{id}	(view/edit)
Update invoice	PUT	/invoices/{id}	NewInvoice.jsx
Delete invoice	DELETE	/invoices/{id}	(optional)

5. Inventory APIs (4)
API	Method	Endpoint	Used In
List inventory	GET	/inventory	Inventory.jsx, NewQuotation.jsx
Add inventory item	POST	/inventory	Inventory.jsx
Update inventory item	PUT	/inventory/{id}	Inventory.jsx
Delete inventory item	DELETE	/inventory/{id}	Inventory.jsx

Summary
Frontend Pages:  7
APIs Done:       1 (login)
APIs Needed:    ~15

Priority Order:
1. Inventory APIs    → NewQuotation needs it for search
2. Quotation APIs    → Core feature
3. Invoice APIs      → Convert from quotation
4. Dashboard APIs    → Show real stats