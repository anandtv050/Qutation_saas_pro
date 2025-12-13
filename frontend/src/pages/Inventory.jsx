import { useState, useMemo } from "react";
import { Search, Plus, Package, Edit2, Trash2, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { inventoryItems, unitOptions } from "@/data/inventoryData";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(inventoryItems.map(item => item.category))];
    return cats.sort();
  }, []);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const matchesSearch = !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Inventory</h1>
          <p className="text-sm text-neutral-500">{inventoryItems.length} items</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="h-10 px-4 bg-neutral-900 hover:bg-neutral-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Search & Filter Row */}
      <div className="flex gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-white border-neutral-200"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 pl-3 pr-8 border border-neutral-200 rounded-lg text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        </div>
      </div>

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
          <h3 className="font-medium text-neutral-900 mb-1">No items found</h3>
          <p className="text-sm text-neutral-500">
            {searchQuery ? "Try a different search" : "Add your first item"}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          {/* Table Header - Desktop */}
          <div className="hidden lg:grid grid-cols-12 gap-2 px-4 py-3 bg-neutral-50 border-b border-neutral-200 text-xs font-medium text-neutral-500 uppercase">
            <div className="col-span-1">Code</div>
            <div className="col-span-4">Item Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2 text-right">Rate</div>
            <div className="col-span-1 text-right">Stock</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Items */}
          {filteredItems.map((item, index) => {
            const isOutOfStock = item.stock === 0;
            return (
              <div
                key={item.id}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-neutral-50 ${
                  index !== filteredItems.length - 1 ? "border-b border-neutral-100" : ""
                } ${isOutOfStock ? "bg-red-50/50" : ""}`}
              >
                {/* Mobile View */}
                <div className="col-span-12 lg:hidden">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className={`text-xs font-mono ${isOutOfStock ? 'text-red-400' : 'text-neutral-400'}`}>{item.code}</span>
                      <p className={`font-medium ${isOutOfStock ? 'text-red-600' : 'text-neutral-900'}`}>{item.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className={`flex gap-4 text-sm ${isOutOfStock ? 'text-red-500' : 'text-neutral-500'}`}>
                    <span>{item.category}</span>
                    <span>{formatCurrency(item.rate)}/{item.unit}</span>
                    <span className={`font-medium ${isOutOfStock ? 'text-red-600' : item.stock < 10 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {isOutOfStock ? 'Out of stock' : `${item.stock} in stock`}
                    </span>
                  </div>
                </div>

                {/* Desktop View */}
                <div className={`hidden lg:block col-span-1 text-xs font-mono ${isOutOfStock ? 'text-red-400' : 'text-neutral-500'}`}>
                  {item.code}
                </div>
                <div className={`hidden lg:block col-span-4 font-medium ${isOutOfStock ? 'text-red-600' : 'text-neutral-900'}`}>
                  {item.name}
                </div>
                <div className={`hidden lg:block col-span-2 text-sm ${isOutOfStock ? 'text-red-500' : 'text-neutral-600'}`}>
                  {item.category}
                </div>
                <div className={`hidden lg:block col-span-2 text-right font-medium ${isOutOfStock ? 'text-red-600' : 'text-neutral-900'}`}>
                  {formatCurrency(item.rate)}
                </div>
                <div className="hidden lg:block col-span-1 text-right">
                  <span className={`text-sm font-medium ${
                    isOutOfStock ? 'text-red-600' :
                    item.stock < 10 ? 'text-amber-500' :
                    'text-emerald-600'
                  }`}>
                    {item.stock}
                  </span>
                </div>
                <div className="hidden lg:flex col-span-2 justify-end gap-1">
                  <button className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results count */}
      {(searchQuery || categoryFilter !== "all") && filteredItems.length > 0 && (
        <p className="text-sm text-neutral-500 mt-3">
          Showing {filteredItems.length} of {inventoryItems.length} items
        </p>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="font-semibold">Add New Item</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-neutral-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Item Code */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Item Code</label>
                <Input placeholder="e.g., CAM-009" className="h-10" />
              </div>

              {/* Item Name */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Item Name</label>
                <Input placeholder="e.g., Hikvision 4MP Camera" className="h-10" />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Category</label>
                <div className="relative">
                  <select className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900">
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Unit</label>
                <div className="relative">
                  <select className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900">
                    {unitOptions.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Rate (per unit)</label>
                <Input type="number" placeholder="0" className="h-10" />
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Current Stock</label>
                <Input type="number" placeholder="0" className="h-10" />
              </div>

              {/* Description (optional) */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">
                  Description <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Add any notes or specifications..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t bg-neutral-50 sticky bottom-0">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button className="flex-1 bg-neutral-900 hover:bg-neutral-800">
                Add Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
