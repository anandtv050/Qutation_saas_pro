import { useState, useMemo, useEffect } from "react";
import { Search, Plus, Package, Edit2, Trash2, X, ChevronDown, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import inventoryService from "@/services/inventoryService";

// Unit options for dropdown
const unitOptions = [
  { value: "piece", label: "Piece" },
  { value: "meter", label: "Meter" },
  { value: "roll", label: "Roll" },
  { value: "box", label: "Box" },
  { value: "set", label: "Set" },
  { value: "kg", label: "Kilogram" },
  { value: "liter", label: "Liter" },
];

export default function Inventory() {
  // State
  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Toast notification state
  const [toast, setToast] = useState({ show: false, type: "", message: "" });

  // Show toast notification
  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: "", message: "" }), 4000);
  };

  // Form state
  const [formData, setFormData] = useState({
    strItemCode: "",
    strItemName: "",
    strCategory: "",
    strUnit: "piece",
    dblUnitPrice: "",
    intStockQuantity: "",
    strDescription: ""
  });

  // Fetch inventory on mount
  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await inventoryService.getList();

      if (response.intStatus === 1) {
        setInventoryItems(response.lstItem || []);
      } else if (response.intStatus === -1) {
        setInventoryItems([]);
      } else {
        setError(response.strMessage || "Failed to fetch inventory");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique categories from items
  const categories = useMemo(() => {
    const cats = [...new Set(inventoryItems.map(item => item.strCategory))];
    return cats.sort();
  }, [inventoryItems]);

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
        item.strItemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.strItemCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || item.strCategory === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [inventoryItems, searchQuery, categoryFilter]);

  // Reset form
  const resetForm = () => {
    setFormData({
      strItemCode: "",
      strItemName: "",
      strCategory: "",
      strUnit: "piece",
      dblUnitPrice: "",
      intStockQuantity: "",
      strDescription: ""
    });
    setModalError("");
  };

  // Handle Add
  const handleAdd = async () => {
    if (!formData.strItemCode || !formData.strItemName || !formData.strCategory || !formData.dblUnitPrice) {
      setModalError("Please fill all required fields");
      return;
    }

    try {
      setIsSaving(true);
      setModalError("");
      const response = await inventoryService.add(formData);

      if (response.intStatus === 1) {
        await fetchInventory();
        setShowAddModal(false);
        resetForm();
        showToast("success", "Item added successfully!");
      } else {
        // Show error from backend
        setModalError(response.strMessage || "Failed to add item");
        showToast("error", response.strMessage || "Failed to add item");
      }
    } catch (err) {
      setModalError(err.message);
      showToast("error", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Edit Click
  const handleEditClick = (item) => {
    setSelectedItem(item);
    setFormData({
      strItemCode: item.strItemCode,
      strItemName: item.strItemName,
      strCategory: item.strCategory,
      strUnit: item.strUnit,
      dblUnitPrice: item.dblUnitPrice.toString(),
      intStockQuantity: item.intStockQuantity.toString(),
      strDescription: item.strDescription || ""
    });
    setShowEditModal(true);
  };

  // Handle Update
  const handleUpdate = async () => {
    if (!formData.strItemCode || !formData.strItemName || !formData.strCategory || !formData.dblUnitPrice) {
      setModalError("Please fill all required fields");
      return;
    }

    try {
      setIsSaving(true);
      setModalError("");
      const response = await inventoryService.update({
        intPkInventoryId: selectedItem.intPkInventoryId,
        ...formData
      });

      if (response.intStatus === 1) {
        await fetchInventory();
        setShowEditModal(false);
        resetForm();
        setSelectedItem(null);
        showToast("success", "Item updated successfully!");
      } else {
        setModalError(response.strMessage || "Failed to update item");
        showToast("error", response.strMessage || "Failed to update item");
      }
    } catch (err) {
      setModalError(err.message);
      showToast("error", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Click
  const handleDeleteClick = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    try {
      setIsSaving(true);
      setModalError("");
      const response = await inventoryService.delete(selectedItem.intPkInventoryId);

      if (response.intStatus === 1) {
        await fetchInventory();
        setShowDeleteModal(false);
        setSelectedItem(null);
        showToast("success", "Item deleted successfully!");
      } else {
        setModalError(response.strMessage || "Failed to delete item");
        showToast("error", response.strMessage || "Failed to delete item");
      }
    } catch (err) {
      setModalError(err.message);
      showToast("error", err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
          <p className="text-sm text-neutral-500">Loading inventory...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchInventory} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 pb-24 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Inventory</h1>
          <p className="text-sm text-neutral-500">{inventoryItems.length} items</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowAddModal(true); }}
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
        <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-12 text-center">
          <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-neutral-300 mb-3 sm:mb-4" />
          <h3 className="font-medium text-neutral-900 mb-1">No inventory items</h3>
          <p className="text-sm text-neutral-500 mb-4">
            {searchQuery ? "Try a different search" : "Add your first item to get started"}
          </p>
          {!searchQuery && inventoryItems.length === 0 && (
            <Button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="bg-neutral-900 hover:bg-neutral-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          )}
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
            const isOutOfStock = item.intStockQuantity === 0;
            return (
              <div
                key={item.intPkInventoryId}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-neutral-50 ${
                  index !== filteredItems.length - 1 ? "border-b border-neutral-100" : ""
                } ${isOutOfStock ? "bg-red-50/50" : ""}`}
              >
                {/* Mobile View */}
                <div className="col-span-12 lg:hidden">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className={`text-xs font-mono ${isOutOfStock ? 'text-red-400' : 'text-neutral-400'}`}>{item.strItemCode}</span>
                      <p className={`font-medium ${isOutOfStock ? 'text-red-600' : 'text-neutral-900'}`}>{item.strItemName}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className={`flex gap-4 text-sm ${isOutOfStock ? 'text-red-500' : 'text-neutral-500'}`}>
                    <span>{item.strCategory}</span>
                    <span>{formatCurrency(item.dblUnitPrice)}/{item.strUnit}</span>
                    <span className={`font-medium ${isOutOfStock ? 'text-red-600' : item.intStockQuantity < 10 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {isOutOfStock ? 'Out of stock' : `${item.intStockQuantity} in stock`}
                    </span>
                  </div>
                </div>

                {/* Desktop View */}
                <div className={`hidden lg:block col-span-1 text-xs font-mono ${isOutOfStock ? 'text-red-400' : 'text-neutral-500'}`}>
                  {item.strItemCode}
                </div>
                <div className={`hidden lg:block col-span-4 font-medium ${isOutOfStock ? 'text-red-600' : 'text-neutral-900'}`}>
                  {item.strItemName}
                </div>
                <div className={`hidden lg:block col-span-2 text-sm ${isOutOfStock ? 'text-red-500' : 'text-neutral-600'}`}>
                  {item.strCategory}
                </div>
                <div className={`hidden lg:block col-span-2 text-right font-medium ${isOutOfStock ? 'text-red-600' : 'text-neutral-900'}`}>
                  {formatCurrency(item.dblUnitPrice)}
                </div>
                <div className="hidden lg:block col-span-1 text-right">
                  <span className={`text-sm font-medium ${
                    isOutOfStock ? 'text-red-600' :
                    item.intStockQuantity < 10 ? 'text-amber-500' :
                    'text-emerald-600'
                  }`}>
                    {item.intStockQuantity}
                  </span>
                </div>
                <div className="hidden lg:flex col-span-2 justify-end gap-1">
                  <button
                    onClick={() => handleEditClick(item)}
                    className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(item)}
                    className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
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
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {modalError}
                </div>
              )}

              {/* Item Code */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Item Code *</label>
                <Input
                  placeholder="e.g., CAM-009"
                  className="h-10"
                  value={formData.strItemCode}
                  onChange={(e) => setFormData({...formData, strItemCode: e.target.value})}
                />
              </div>

              {/* Item Name */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Item Name *</label>
                <Input
                  placeholder="e.g., Hikvision 4MP Camera"
                  className="h-10"
                  value={formData.strItemName}
                  onChange={(e) => setFormData({...formData, strItemName: e.target.value})}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Category *</label>
                <Input
                  placeholder="e.g., Camera, DVR, Cable"
                  className="h-10"
                  value={formData.strCategory}
                  onChange={(e) => setFormData({...formData, strCategory: e.target.value})}
                />
              </div>

              {/* Unit */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Unit</label>
                <div className="relative">
                  <select
                    className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={formData.strUnit}
                    onChange={(e) => setFormData({...formData, strUnit: e.target.value})}
                  >
                    {unitOptions.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Rate (per unit) *</label>
                <Input
                  type="number"
                  placeholder="0"
                  className="h-10"
                  value={formData.dblUnitPrice}
                  onChange={(e) => setFormData({...formData, dblUnitPrice: e.target.value})}
                />
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Current Stock</label>
                <Input
                  type="number"
                  placeholder="0"
                  className="h-10"
                  value={formData.intStockQuantity}
                  onChange={(e) => setFormData({...formData, intStockQuantity: e.target.value})}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">
                  Description <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Add any notes or specifications..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  rows={3}
                  value={formData.strDescription}
                  onChange={(e) => setFormData({...formData, strDescription: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t bg-neutral-50 sticky bottom-0">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1" disabled={isSaving}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-neutral-900 hover:bg-neutral-800"
                onClick={handleAdd}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h2 className="font-semibold">Edit Item</h2>
              <button onClick={() => { setShowEditModal(false); resetForm(); }} className="p-1 hover:bg-neutral-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {modalError}
                </div>
              )}

              {/* Item Code */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Item Code *</label>
                <Input
                  placeholder="e.g., CAM-009"
                  className="h-10"
                  value={formData.strItemCode}
                  onChange={(e) => setFormData({...formData, strItemCode: e.target.value})}
                />
              </div>

              {/* Item Name */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Item Name *</label>
                <Input
                  placeholder="e.g., Hikvision 4MP Camera"
                  className="h-10"
                  value={formData.strItemName}
                  onChange={(e) => setFormData({...formData, strItemName: e.target.value})}
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Category *</label>
                <Input
                  placeholder="e.g., Camera, DVR, Cable"
                  className="h-10"
                  value={formData.strCategory}
                  onChange={(e) => setFormData({...formData, strCategory: e.target.value})}
                />
              </div>

              {/* Unit */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Unit</label>
                <div className="relative">
                  <select
                    className="w-full h-10 px-3 border border-neutral-200 rounded-lg text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    value={formData.strUnit}
                    onChange={(e) => setFormData({...formData, strUnit: e.target.value})}
                  >
                    {unitOptions.map(unit => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Rate (per unit) *</label>
                <Input
                  type="number"
                  placeholder="0"
                  className="h-10"
                  value={formData.dblUnitPrice}
                  onChange={(e) => setFormData({...formData, dblUnitPrice: e.target.value})}
                />
              </div>

              {/* Stock Quantity */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">Current Stock</label>
                <Input
                  type="number"
                  placeholder="0"
                  className="h-10"
                  value={formData.intStockQuantity}
                  onChange={(e) => setFormData({...formData, intStockQuantity: e.target.value})}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-neutral-700 mb-1 block">
                  Description <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Add any notes or specifications..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  rows={3}
                  value={formData.strDescription}
                  onChange={(e) => setFormData({...formData, strDescription: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t bg-neutral-50 sticky bottom-0">
              <Button variant="outline" onClick={() => { setShowEditModal(false); resetForm(); }} className="flex-1" disabled={isSaving}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-neutral-900 hover:bg-neutral-800"
                onClick={handleUpdate}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Item
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Delete Item?</h3>
              <p className="text-sm text-neutral-500 mb-1">
                Are you sure you want to delete
              </p>
              <p className="font-medium text-neutral-900 mb-4">
                {selectedItem?.strItemName}
              </p>
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-4">
                  {modalError}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t bg-neutral-50">
              <Button
                variant="outline"
                onClick={() => { setShowDeleteModal(false); setSelectedItem(null); setModalError(""); }}
                className="flex-1"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteConfirm}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
          toast.type === "success"
            ? "bg-emerald-600 text-white"
            : "bg-red-600 text-white"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, type: "", message: "" })}
            className="ml-2 p-1 hover:bg-white/20 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
