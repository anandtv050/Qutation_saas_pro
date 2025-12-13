import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageSquareText, ListPlus, ArrowRight } from "lucide-react";
import { dummyInvoices } from "@/data/dummyData";

export default function Dashboard() {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserName(userData.strUserName || userData.strBusinessName || "");
      } catch {
        setUserName("");
      }
    }
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalCollected = dummyInvoices
    .filter(i => i.payment_status === "paid")
    .reduce((sum, i) => sum + i.total_amount, 0);

  const pendingAmount = dummyInvoices
    .filter(i => i.payment_status !== "paid")
    .reduce((sum, i) => sum + i.total_amount, 0);

  return (
    <div className="min-h-screen flex items-start justify-center">
      <div className="w-full max-w-md px-5 py-8 md:py-10">

        {/* Welcome */}
        <div className="mb-6">
          <p className="text-neutral-400 text-sm">Welcome back,</p>
          <h1 className="text-xl font-semibold text-neutral-900">{userName || "User"}</h1>
        </div>

        {/* Money Stats - Simple */}
        <Link to="/reports" className="block mb-6">
          <div className="rounded-2xl bg-white border border-neutral-200 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-neutral-500 mb-1">Collected</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">Due</p>
                <p className="text-2xl font-bold text-amber-500">{formatCurrency(pendingAmount)}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Quick Create */}
        <Link to="/quotations/new?mode=ai" className="block mb-3 group">
          <div className="rounded-xl bg-neutral-900 p-4 hover:bg-neutral-800 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <MessageSquareText className="w-[18px] h-[18px] text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-white text-sm">Quick Create</p>
                <p className="text-neutral-400 text-xs">"2 cameras, 1 DVR, wiring..."</p>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </div>
          </div>
        </Link>

        {/* Add Items */}
        <Link to="/quotations/new?mode=manual" className="block group">
          <div className="rounded-xl bg-white border border-neutral-200 p-4 hover:border-neutral-300 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center">
                <ListPlus className="w-[18px] h-[18px] text-neutral-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-neutral-900 text-sm">Add Items</p>
                <p className="text-neutral-500 text-xs">Pick from inventory</p>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-400 transition-colors" />
            </div>
          </div>
        </Link>

      </div>
    </div>
  );
}
