import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageSquareText,
  ListPlus,
  Send,
  Plus,
  Trash2,
  User,
  Phone,
  MapPin,
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewQuotation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get("mode") || "ai";

  const [step, setStep] = useState(1); // 1: Input, 2: Review, 3: Customer Details
  const [isProcessing, setIsProcessing] = useState(false);

  // AI Mode State
  const [rawInput, setRawInput] = useState("");

  // Items State (shared between modes)
  const [items, setItems] = useState([]);

  // Customer State
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    site_address: "",
  });

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

  // AI Processing (mock - will connect to backend later)
  const processWithAI = async () => {
    if (!rawInput.trim()) return;

    setIsProcessing(true);

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock AI response - parse basic patterns
    const mockItems = parseRawInput(rawInput);
    setItems(mockItems);
    setIsProcessing(false);
    setStep(2);
  };

  // Simple parser for demo (will be replaced with AI)
  const parseRawInput = (input) => {
    const lines = input.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    return lines.map((line, index) => {
      // Try to extract quantity and item name
      const match = line.match(/^(\d+)\s*(?:bags?|pcs?|pieces?|kg|units?|boxes?|sets?)?\s*(.+)/i);
      if (match) {
        return {
          id: Date.now() + index,
          name: match[2].trim(),
          qty: parseInt(match[1]),
          rate: 0,
        };
      }
      return {
        id: Date.now() + index,
        name: line,
        qty: 1,
        rate: 0,
      };
    });
  };

  // Manual mode - add empty item
  const addItem = () => {
    setItems([...items, { id: Date.now(), name: "", qty: 1, rate: 0 }]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: field === "name" ? value : Number(value) || 0 } : item
    ));
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Initialize manual mode with one empty item
  useEffect(() => {
    if (mode === "manual" && items.length === 0) {
      addItem();
    }
  }, [mode]);

  const handleSubmit = () => {
    // For now, just log and navigate back
    console.log("Quotation:", { customer, items, subtotal, taxAmount, discount, total });
    alert("Quotation created! (Demo mode)");
    navigate("/dashboard");
  };

  // Step 1: AI Input or Manual Items
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
              <h1 className="text-xl font-semibold text-neutral-900">
                {mode === "ai" ? "Quick Create" : "Add Items"}
              </h1>
              <p className="text-sm text-neutral-500">
                {mode === "ai" ? "Describe what you need" : "Add items to quotation"}
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-neutral-100 rounded-xl mb-6">
            <button
              onClick={() => navigate("/quotations/new?mode=ai")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "ai"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <MessageSquareText className="w-4 h-4" />
              Quick
            </button>
            <button
              onClick={() => navigate("/quotations/new?mode=manual")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "manual"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <ListPlus className="w-4 h-4" />
              Manual
            </button>
          </div>

          {mode === "ai" ? (
            /* AI Mode Input */
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder="Type your requirements...

Example:
100 bags cement
50 rods 12mm steel
200 cubic ft sand"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className="min-h-[200px] bg-white border-neutral-200 rounded-xl resize-none text-base p-4"
                />
                <div className="absolute bottom-3 right-3">
                  <Sparkles className="w-4 h-4 text-neutral-300" />
                </div>
              </div>

              <Button
                onClick={processWithAI}
                disabled={!rawInput.trim() || isProcessing}
                className="w-full h-12 bg-neutral-900 hover:bg-black text-white rounded-xl font-medium"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create List
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Manual Mode Items */
            <div className="space-y-4">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Qty</label>
                      <Input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                        className="border-neutral-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Rate (₹)</label>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, "rate", e.target.value)}
                        className="border-neutral-200"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={addItem}
                className="w-full py-3 border-2 border-dashed border-neutral-200 rounded-xl text-neutral-500 hover:border-neutral-300 hover:text-neutral-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>

              <Button
                onClick={() => setStep(2)}
                disabled={items.length === 0 || items.every(i => !i.name.trim())}
                className="w-full h-12 bg-neutral-900 hover:bg-black text-white rounded-xl font-medium"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Review Items
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
              <h1 className="text-xl font-semibold text-neutral-900">Review Items</h1>
              <p className="text-sm text-neutral-500">{items.length} items</p>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-3 mb-6">
            {items.map((item, index) => (
              <div key={item.id} className="bg-white rounded-xl border border-neutral-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, "name", e.target.value)}
                    className="border-0 p-0 h-auto text-base font-medium focus-visible:ring-0"
                    placeholder="Item name"
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 hover:bg-neutral-100 rounded transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
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
            Add Customer Details
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Customer Details
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
            <h1 className="text-xl font-semibold text-neutral-900">Customer Details</h1>
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
          Create Quotation
        </Button>
      </div>
    </div>
  );
}
