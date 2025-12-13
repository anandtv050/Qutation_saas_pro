import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  User,
  Phone,
  MapPin,
  Calendar,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { dummyQuotations } from "@/data/dummyData";

export default function NewInvoice() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Source Selection, 2: Items, 3: Customer Details

  // Source selection
  const [source, setSource] = useState("new"); // "new" or "quotation"
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  // Items State
  const [items, setItems] = useState([{ id: Date.now(), name: "", qty: 1, rate: 0 }]);

  // Customer State
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    site_address: "",
  });

  // Due date
  const [dueDate, setDueDate] = useState("");

  // Tax
  const [taxPercent, setTaxPercent] = useState(18);
  const [discount, setDiscount] = useState(0);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + taxAmount - discount;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Convert from quotation
  const convertFromQuotation = (quotation) => {
    setSelectedQuotation(quotation);
    setItems(quotation.items.map((item, index) => ({
      id: Date.now() + index,
      name: item.name,
      qty: item.qty,
      rate: item.rate,
    })));
    setCustomer({
      name: quotation.customer_name,
      phone: quotation.customer_phone,
      site_address: quotation.site_address,
    });
    setTaxPercent(quotation.tax_percent);
    setDiscount(quotation.discount_amount);
    setStep(2);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), name: "", qty: 1, rate: 0 }]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: field === "name" ? value : Number(value) || 0 } : item
    ));
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleSubmit = () => {
    console.log("Invoice:", { customer, items, subtotal, taxAmount, discount, total, dueDate });
    alert("Bill created! (Demo mode)");
    navigate("/dashboard");
  };

  // Approved quotations that can be converted
  const approvedQuotations = dummyQuotations.filter(q =>
    q.status === "approved" || q.status === "sent"
  );

  // Step 1: Source Selection
  if (step === 1) {
    return (
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto px-5 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">New Bill</h1>
              <p className="text-sm text-neutral-500">Create from scratch or quotation</p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {/* New Bill */}
            <button
              onClick={() => {
                setSource("new");
                setStep(2);
              }}
              className="w-full text-left"
            >
              <div className="rounded-2xl bg-neutral-900 p-5 transition-all duration-200 hover:bg-black active:scale-[0.99]">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">Create New</h2>
                    <p className="text-neutral-400 text-sm">Start fresh bill</p>
                  </div>
                </div>
              </div>
            </button>

            {/* From Quotation */}
            {approvedQuotations.length > 0 && (
              <div>
                <p className="text-sm text-neutral-500 mb-3 px-1">Or convert from quotation</p>
                <div className="space-y-2">
                  {approvedQuotations.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => convertFromQuotation(q)}
                      className="w-full text-left"
                    >
                      <div className="rounded-xl bg-white border border-neutral-200 p-4 transition-all duration-200 hover:border-neutral-300 active:scale-[0.99]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-neutral-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-neutral-900 truncate">{q.customer_name}</p>
                            <p className="text-sm text-neutral-500">{q.quotation_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-neutral-900">{formatCurrency(q.total_amount)}</p>
                            <p className="text-xs text-neutral-400">{q.created_at}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Items
  if (step === 2) {
    return (
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto px-5 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setStep(1)}
              className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">Bill Items</h1>
              <p className="text-sm text-neutral-500">
                {selectedQuotation ? `From ${selectedQuotation.quotation_number}` : "Add your items"}
              </p>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3 mb-6">
            {items.map((item, index) => (
              <div key={item.id} className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-neutral-400">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 hover:bg-neutral-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-neutral-400" />
                    </button>
                  )}
                </div>
                <Input
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
                  className="mb-3 border-neutral-200"
                />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Qty</label>
                    <Input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                      className="border-neutral-200 h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Rate</label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                      className="border-neutral-200 h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">Amount</label>
                    <div className="h-9 flex items-center text-sm font-medium text-neutral-700">
                      {formatCurrency(item.qty * item.rate)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add More */}
          <button
            onClick={addItem}
            className="w-full py-3 mb-6 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-500 hover:border-neutral-300 hover:text-neutral-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>GST</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                    className="w-16 h-7 text-center text-xs border-neutral-200"
                  />
                  <span className="text-xs">%</span>
                  <span className="w-20 text-right">{formatCurrency(taxAmount)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-neutral-600">
                <span>Discount</span>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-24 h-7 text-right text-xs border-neutral-200"
                />
              </div>
              <div className="border-t border-neutral-100 pt-2 mt-2">
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span className="text-neutral-900">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setStep(3)}
            disabled={items.length === 0 || subtotal === 0}
            className="w-full h-12 bg-neutral-900 hover:bg-black text-white rounded-xl font-medium"
          >
            {selectedQuotation ? "Review Details" : "Add Customer Details"}
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Customer Details & Due Date
  return (
    <div className="min-h-screen">
      <div className="max-w-lg mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setStep(2)}
            className="p-2 -ml-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Customer & Due Date</h1>
            <p className="text-sm text-neutral-500">Final step</p>
          </div>
        </div>

        {/* Customer Form */}
        <div className="space-y-4 mb-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <User className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-500">Customer Name</span>
            </div>
            <Input
              placeholder="Enter customer name"
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              className="border-neutral-200"
            />
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Phone className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-500">Phone Number</span>
            </div>
            <Input
              placeholder="Enter phone number"
              type="tel"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              className="border-neutral-200"
            />
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <MapPin className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-500">Site Address</span>
            </div>
            <Textarea
              placeholder="Enter site address"
              value={customer.site_address}
              onChange={(e) => setCustomer({ ...customer, site_address: e.target.value })}
              className="border-neutral-200 resize-none"
              rows={2}
            />
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-500">Due Date</span>
            </div>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border-neutral-200"
            />
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-neutral-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-neutral-500">{items.length} items</p>
              <p className="text-lg font-semibold text-neutral-900">{formatCurrency(total)}</p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Edit →
            </button>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!customer.name.trim() || !customer.phone.trim()}
          className="w-full h-12 bg-neutral-900 hover:bg-black text-white rounded-xl font-medium"
        >
          Create Bill
        </Button>
      </div>
    </div>
  );
}
