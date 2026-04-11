import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, X, Check,
  CreditCard, Users, Brain, Crown, Shield, IndianRupee, Receipt
} from "lucide-react";
import planService from "@/services/planService";

const PAYMENT_METHODS = [
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "razorpay", label: "Razorpay" },
];

const OPS = ["Create", "Read", "Update", "Delete", "Print"];
const OP_KEYS = ["intCreate", "intRead", "intUpdate", "intDelete", "intPrint"];

const fmtLimit = (v) => v === -1 ? "\u221E" : v === 0 ? "No" : v;

export default function PlanManagement() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("subscriptions");

  // Plan form
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    strPlanName: "", strDisplayName: "", dblPriceMonthly: 0, dblPriceYearly: 0,
    blnActive: true,
    lstModules: [],
  });

  // Record payment modal
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    intPlanId: "", dblAmount: "", strPaymentMethod: "upi",
    strReference: "", strNotes: "", intDays: 365,
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [planRes, subRes, payRes] = await Promise.all([
        planService.getAll(),
        planService.getAllSubscriptions(),
        planService.getPayments().catch(() => ({ lstPayments: [] })),
      ]);
      if (planRes.lstPlans) setPlans(planRes.lstPlans);
      if (subRes.lstSubscriptions) setSubscriptions(subRes.lstSubscriptions);
      if (payRes.lstPayments) setPayments(payRes.lstPayments);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Plan handlers ──
  // Build default modules from all known modules (for new plan form)
  const buildDefaultModules = () => {
    // Use modules from any existing plan, or empty
    const firstPlan = plans.find(p => p.lstModules?.length > 0);
    if (firstPlan) {
      return firstPlan.lstModules.map(m => ({
        ...m, intCreate: -1, intRead: -1, intUpdate: -1, intDelete: -1, intPrint: -1,
        intMonthlyLimit: -1, intDailyLimit: -1,
      }));
    }
    return [];
  };

  const resetForm = () => {
    setFormData({
      strPlanName: "", strDisplayName: "", dblPriceMonthly: 0, dblPriceYearly: 0,
      blnActive: true,
      lstModules: buildDefaultModules(),
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  const handleEditPlan = (plan) => {
    setFormData({
      strPlanName: plan.strPlanName, strDisplayName: plan.strDisplayName,
      dblPriceMonthly: plan.dblPriceMonthly, dblPriceYearly: plan.dblPriceYearly,
      blnActive: plan.blnActive,
      lstModules: (plan.lstModules || []).map(m => ({ ...m })),
    });
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleModuleChange = (index, field, value) => {
    const updated = [...formData.lstModules];
    updated[index] = {
      ...updated[index],
      [field]: field === "strDisplayName" ? value : parseInt(value) || 0,
    };
    setFormData({ ...formData, lstModules: updated });
  };

  const handleSavePlan = async () => {
    try {
      if (editingPlan) {
        await planService.update({ intPlanId: editingPlan.intPlanId, ...formData });
      } else {
        await planService.create(formData);
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error("Failed to save plan:", err);
    }
  };

  const handleDeletePlan = async (intPlanId) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    try {
      await planService.delete(intPlanId);
      loadData();
    } catch (err) {
      console.error("Failed to delete plan:", err);
    }
  };

  // ── Payment handlers ──
  const openPaymentModal = (sub) => {
    const paidPlan = plans.find(p => p.dblPriceYearly > 0 && p.blnActive);
    setPaymentForm({
      intPlanId: paidPlan?.intPlanId || "",
      dblAmount: paidPlan?.dblPriceYearly || "",
      strPaymentMethod: "upi",
      strReference: "",
      strNotes: "",
      intDays: 365,
    });
    setPaymentModal(sub);
  };

  const handleRecordPayment = async () => {
    if (!paymentModal || !paymentForm.intPlanId || !paymentForm.dblAmount) return;
    setPaymentSubmitting(true);
    try {
      await planService.recordPayment({
        intTargetUserId: paymentModal.intUserId,
        intPlanId: parseInt(paymentForm.intPlanId),
        dblAmount: parseFloat(paymentForm.dblAmount),
        strPaymentMethod: paymentForm.strPaymentMethod,
        strReference: paymentForm.strReference,
        strNotes: paymentForm.strNotes,
        intDays: paymentForm.intDays,
      });
      setPaymentModal(null);
      loadData();
    } catch (err) {
      console.error("Failed to record payment:", err);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleSuspend = async (intUserId) => {
    if (!window.confirm("Suspend this user's subscription?")) return;
    try {
      await planService.suspendUser(intUserId);
      loadData();
    } catch (err) {
      console.error("Failed to suspend:", err);
    }
  };

  const statusColor = (s) => ({
    active: "bg-emerald-50 text-emerald-700",
    trial: "bg-blue-50 text-blue-700",
    expired: "bg-red-50 text-red-700",
    suspended: "bg-orange-50 text-orange-700",
    captured: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    failed: "bg-red-50 text-red-700",
  }[s] || "bg-neutral-100 text-neutral-600");

  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center">
      <div className="w-full max-w-2xl px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/admin")} className="p-2 hover:bg-neutral-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Plans & Payments</h1>
            <p className="text-xs text-neutral-500">Manage plans, subscriptions, and payments</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg mb-6">
          {[
            { key: "subscriptions", icon: Users, label: "Users" },
            { key: "payments", icon: IndianRupee, label: "Payments" },
            { key: "plans", icon: CreditCard, label: "Plans" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
              }`}
            >
              <tab.icon className="w-4 h-4 inline mr-1" />{tab.label}
            </button>
          ))}
        </div>

        {/* ═══ SUBSCRIPTIONS TAB ═══ */}
        {activeTab === "subscriptions" && (
          <div className="space-y-3">
            {subscriptions.length === 0 ? (
              <p className="text-center text-neutral-400 text-sm py-8">No users found</p>
            ) : (
              subscriptions.map((sub) => (
                <div key={sub.intUserId} className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-neutral-900 text-sm">{sub.strUsername || sub.strEmail}</h3>
                      <p className="text-xs text-neutral-400">{sub.strEmail}</p>
                      {sub.strBusinessName && (
                        <p className="text-xs text-neutral-500 mt-0.5">{sub.strBusinessName}</p>
                      )}
                    </div>
                    {sub.strStatus && (
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColor(sub.strStatus)}`}>
                        {sub.strStatus}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-neutral-500">
                      {sub.strPlanName && <span className="mr-3">{sub.strPlanName}</span>}
                      {sub.intDaysRemaining !== null && sub.intDaysRemaining !== undefined && (
                        <span className={sub.intDaysRemaining <= 3 ? "text-red-500 font-medium" : ""}>
                          {sub.intDaysRemaining > 0 ? `${sub.intDaysRemaining} days left` : "Expired"}
                        </span>
                      )}
                      {sub.datEndDate && (
                        <span className="ml-3 text-neutral-400">Ends: {sub.datEndDate}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openPaymentModal(sub)}
                        className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                      >
                        <IndianRupee className="w-3 h-3 inline mr-0.5" />Record Payment
                      </button>
                      {(sub.strStatus === "active" || sub.strStatus === "trial") && (
                        <button
                          onClick={() => handleSuspend(sub.intUserId)}
                          className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ PAYMENTS TAB ═══ */}
        {activeTab === "payments" && (
          <div className="space-y-3">
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-400 text-sm">No payments recorded yet</p>
                <p className="text-neutral-400 text-xs mt-1">Go to Users tab to record a payment</p>
              </div>
            ) : (
              payments.map((pay) => (
                <div key={pay.intPaymentId} className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-neutral-900 text-sm">{pay.strUsername || pay.strEmail}</h3>
                      <p className="text-xs text-neutral-400">
                        {pay.strBusinessName && `${pay.strBusinessName} · `}
                        {pay.strEmail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-neutral-900">
                        {`\u20B9${pay.dblAmount.toLocaleString("en-IN")}`}
                      </p>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${statusColor(pay.strStatus)}`}>
                        {pay.strStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                    <span className="px-2 py-0.5 bg-neutral-100 rounded text-neutral-600 font-medium uppercase">
                      {pay.strPaymentMethod}
                    </span>
                    {pay.strPlanName && <span>{pay.strPlanName}</span>}
                    {pay.strReference && <span>Ref: {pay.strReference}</span>}
                    <span>{fmtDate(pay.strCreatedAt)}</span>
                  </div>
                  {pay.strNotes && (
                    <p className="mt-1.5 text-xs text-neutral-400 italic">{pay.strNotes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══ PLANS TAB ═══ */}
        {activeTab === "plans" && (
          <div>
            {!showForm && (
              <button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 border-2 border-dashed border-neutral-200 rounded-xl text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add New Plan
              </button>
            )}

            {showForm && (
              <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-neutral-900">
                    {editingPlan ? "Edit Plan" : "New Plan"}
                  </h3>
                  <button onClick={resetForm} className="p-1.5 hover:bg-neutral-100 rounded-lg">
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Plan Key</label>
                      <input
                        type="text" value={formData.strPlanName}
                        onChange={(e) => setFormData({ ...formData, strPlanName: e.target.value })}
                        disabled={!!editingPlan} placeholder="e.g. standard"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg disabled:bg-neutral-50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Display Name</label>
                      <input
                        type="text" value={formData.strDisplayName}
                        onChange={(e) => setFormData({ ...formData, strDisplayName: e.target.value })}
                        placeholder="e.g. Standard"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Price/Month (INR)</label>
                      <input
                        type="number" value={formData.dblPriceMonthly}
                        onChange={(e) => setFormData({ ...formData, dblPriceMonthly: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Price/Year (INR)</label>
                      <input
                        type="number" value={formData.dblPriceYearly}
                        onChange={(e) => setFormData({ ...formData, dblPriceYearly: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={formData.blnActive}
                      onChange={(e) => setFormData({ ...formData, blnActive: e.target.checked })}
                      className="rounded" />
                    <Check className="w-4 h-4 text-emerald-500" /> Active
                  </label>

                  {/* Module Grid Editor */}
                  {formData.lstModules.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-neutral-700">Module Permissions</label>
                      <span className="text-[10px] text-neutral-400">0 = blocked, -1 = unlimited</span>
                    </div>
                    <div className="border border-neutral-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-neutral-50 border-b border-neutral-200">
                            <th className="text-left px-3 py-2 font-medium text-neutral-600">Module</th>
                            {OPS.map(op => (
                              <th key={op} className="px-2 py-2 font-medium text-neutral-600 text-center w-16">{op}</th>
                            ))}
                            <th className="px-2 py-2 font-medium text-neutral-600 text-center w-16">Mo.</th>
                            <th className="px-2 py-2 font-medium text-neutral-600 text-center w-16">Day</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {formData.lstModules.map((mod, idx) => (
                            <tr key={mod.intModuleId}>
                              <td className="px-3 py-2">
                                <input
                                  type="text" value={mod.strDisplayName}
                                  onChange={(e) => handleModuleChange(idx, "strDisplayName", e.target.value)}
                                  className="w-full px-2 py-1 text-sm border border-neutral-200 rounded-lg"
                                />
                                <p className="text-[10px] text-neutral-400 mt-1">{mod.strModuleKey}</p>
                              </td>
                              {OP_KEYS.map(key => (
                                <td key={key} className="px-1 py-1.5 text-center">
                                  <input
                                    type="number" value={mod[key]}
                                    onChange={(e) => handleModuleChange(idx, key, e.target.value)}
                                    className={`w-14 px-1 py-1 text-xs text-center border rounded ${
                                      mod[key] === 0 ? "border-red-200 bg-red-50 text-red-600" :
                                      mod[key] === -1 ? "border-emerald-200 bg-emerald-50 text-emerald-600" :
                                      "border-neutral-200"
                                    }`}
                                  />
                                </td>
                              ))}
                              <td className="px-1 py-1.5 text-center">
                                <input
                                  type="number" value={mod.intMonthlyLimit}
                                  onChange={(e) => handleModuleChange(idx, "intMonthlyLimit", e.target.value)}
                                  className={`w-14 px-1 py-1 text-xs text-center border rounded ${
                                    mod.intMonthlyLimit === -1 ? "border-emerald-200 bg-emerald-50 text-emerald-600" :
                                    "border-blue-200 bg-blue-50 text-blue-600"
                                  }`}
                                />
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <input
                                  type="number" value={mod.intDailyLimit}
                                  onChange={(e) => handleModuleChange(idx, "intDailyLimit", e.target.value)}
                                  className={`w-14 px-1 py-1 text-xs text-center border rounded ${
                                    mod.intDailyLimit === -1 ? "border-emerald-200 bg-emerald-50 text-emerald-600" :
                                    "border-blue-200 bg-blue-50 text-blue-600"
                                  }`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}

                  <button onClick={handleSavePlan}
                    className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
                    {editingPlan ? "Update Plan" : "Create Plan"}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.intPlanId} className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        plan.dblPriceYearly > 0 ? "bg-amber-50" : "bg-blue-50"
                      }`}>
                        {plan.dblPriceYearly > 0 ? (
                          <Crown className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Shield className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-neutral-900 text-sm">{plan.strDisplayName}</h3>
                        <p className="text-xs text-neutral-400">{plan.strPlanName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleEditPlan(plan)} className="p-1.5 hover:bg-neutral-100 rounded-lg">
                        <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                      </button>
                      <button onClick={() => handleDeletePlan(plan.intPlanId)} className="p-1.5 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                    <span className="font-medium text-neutral-900 text-lg">
                      {plan.dblPriceMonthly > 0 ? `\u20B9${plan.dblPriceMonthly.toLocaleString("en-IN")}` : "Free"}
                      {plan.dblPriceMonthly > 0 && <span className="text-xs text-neutral-400 font-normal">/mo</span>}
                    </span>
                    {plan.dblPriceYearly > 0 && (
                      <span>{`\u20B9${plan.dblPriceYearly.toLocaleString("en-IN")}/yr`}</span>
                    )}
                    {!plan.blnActive && <span className="text-red-500">Inactive</span>}
                    <span>{plan.intSubscriberCount} subscribers</span>
                  </div>
                  {plan.lstModules && plan.lstModules.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {plan.lstModules.map((m) => {
                        const blnBlocked = m.intCreate === 0 && m.intRead === 0;
                        return (
                          <span key={m.intModuleId} className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            blnBlocked ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
                          }`}>
                            {m.strDisplayName}: {blnBlocked ? "No" : m.intMonthlyLimit > 0 ? `${m.intMonthlyLimit}/mo` : m.intDailyLimit > 0 ? `${m.intDailyLimit}/day` : "\u221E"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ RECORD PAYMENT MODAL ═══ */}
        {paymentModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <h3 className="font-semibold text-neutral-900 mb-1">Record Payment</h3>
              <p className="text-xs text-neutral-500 mb-4">
                For {paymentModal.strUsername || paymentModal.strEmail}
                {paymentModal.strBusinessName && ` (${paymentModal.strBusinessName})`}
              </p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Plan</label>
                  <select
                    value={paymentForm.intPlanId}
                    onChange={(e) => {
                      const plan = plans.find(p => p.intPlanId === parseInt(e.target.value));
                      setPaymentForm({
                        ...paymentForm,
                        intPlanId: e.target.value,
                        dblAmount: plan ? plan.dblPriceYearly : paymentForm.dblAmount,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                  >
                    <option value="">Select plan</option>
                    {plans.filter(p => p.dblPriceYearly > 0 && p.blnActive).map((p) => (
                      <option key={p.intPlanId} value={p.intPlanId}>
                        {p.strDisplayName} - {`\u20B9${p.dblPriceYearly.toLocaleString("en-IN")}/yr`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Amount (INR)</label>
                    <input
                      type="number" value={paymentForm.dblAmount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, dblAmount: e.target.value })}
                      placeholder="20000"
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Duration (days)</label>
                    <input
                      type="number" value={paymentForm.intDays}
                      onChange={(e) => setPaymentForm({ ...paymentForm, intDays: parseInt(e.target.value) || 365 })}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Payment Method</label>
                  <div className="flex gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setPaymentForm({ ...paymentForm, strPaymentMethod: m.value })}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                          paymentForm.strPaymentMethod === m.value
                            ? "bg-neutral-900 text-white border-neutral-900"
                            : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Reference / Transaction ID</label>
                  <input
                    type="text" value={paymentForm.strReference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, strReference: e.target.value })}
                    placeholder="UPI ref or bank txn ID"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Notes (optional)</label>
                  <input
                    type="text" value={paymentForm.strNotes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, strNotes: e.target.value })}
                    placeholder="e.g. Paid via PhonePe"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentModal(null)}
                  className="flex-1 py-2.5 text-sm font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={!paymentForm.intPlanId || !paymentForm.dblAmount || paymentSubmitting}
                  className="flex-1 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paymentSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Record & Activate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
