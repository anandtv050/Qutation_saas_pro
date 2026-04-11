import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Plus, Pencil, Trash2, X, Check,
  Brain, Wrench, Zap, Eye
} from "lucide-react";
import serviceService from "@/services/serviceService";

export default function ServiceManagement() {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    strServiceName: "", strDisplayName: "", strDescription: "",
    strAiPrompt: "", blnAiReady: false, blnActive: true, intSortOrder: 0,
  });

  // Prompt viewer
  const [viewingPrompt, setViewingPrompt] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await serviceService.getAll();
      if (res.lstServices) setServices(res.lstServices);
    } catch (err) {
      console.error("Failed to load services:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      strServiceName: "", strDisplayName: "", strDescription: "",
      strAiPrompt: "", blnAiReady: false, blnActive: true, intSortOrder: 0,
    });
    setEditingService(null);
    setShowForm(false);
  };

  const handleEdit = async (svc) => {
    try {
      const res = await serviceService.getDetail(svc.intServiceId);
      if (res.data) {
        setFormData({
          strServiceName: res.data.strServiceName,
          strDisplayName: res.data.strDisplayName,
          strDescription: res.data.strDescription || "",
          strAiPrompt: res.data.strAiPrompt || "",
          blnAiReady: res.data.blnAiReady,
          blnActive: res.data.blnActive,
          intSortOrder: res.data.intSortOrder,
        });
        setEditingService(res.data);
        setShowForm(true);
      }
    } catch (err) {
      console.error("Failed to load service detail:", err);
    }
  };

  const handleSave = async () => {
    try {
      if (editingService) {
        await serviceService.update({ intServiceId: editingService.intServiceId, ...formData });
      } else {
        await serviceService.create(formData);
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error("Failed to save:", err);
    }
  };

  const handleDelete = async (intServiceId) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await serviceService.delete(intServiceId);
      loadData();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleViewPrompt = async (svc) => {
    try {
      const res = await serviceService.getDetail(svc.intServiceId);
      if (res.data) setViewingPrompt(res.data);
    } catch (err) {
      console.error("Failed to load prompt:", err);
    }
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
            <h1 className="text-xl font-semibold text-neutral-900">Services</h1>
            <p className="text-xs text-neutral-500">Manage service types and AI prompts</p>
          </div>
        </div>

        {/* Add Button */}
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-4 border-2 border-dashed border-neutral-200 rounded-xl text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add New Service
          </button>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-neutral-900">
                {editingService ? "Edit Service" : "New Service"}
              </h3>
              <button onClick={resetForm} className="p-1.5 hover:bg-neutral-100 rounded-lg">
                <X className="w-4 h-4 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Service Key</label>
                  <input
                    type="text" value={formData.strServiceName}
                    onChange={(e) => setFormData({ ...formData, strServiceName: e.target.value })}
                    disabled={!!editingService} placeholder="e.g. cctv"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg disabled:bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Display Name</label>
                  <input
                    type="text" value={formData.strDisplayName}
                    onChange={(e) => setFormData({ ...formData, strDisplayName: e.target.value })}
                    placeholder="e.g. CCTV & Security"
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Description</label>
                <input
                  type="text" value={formData.strDescription}
                  onChange={(e) => setFormData({ ...formData, strDescription: e.target.value })}
                  placeholder="Short description of this service"
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-500 mb-1 block">
                  AI System Prompt
                  <span className="text-neutral-400 ml-1">(the instructions AI follows for this service)</span>
                </label>
                <textarea
                  value={formData.strAiPrompt}
                  onChange={(e) => setFormData({ ...formData, strAiPrompt: e.target.value })}
                  placeholder="You are a quotation generator for... (paste your full prompt here)"
                  rows={10}
                  className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg font-mono resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Sort Order</label>
                  <input
                    type="number" value={formData.intSortOrder}
                    onChange={(e) => setFormData({ ...formData, intSortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                  />
                </div>
                <div className="flex items-end gap-4 pb-1">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={formData.blnAiReady}
                      onChange={(e) => setFormData({ ...formData, blnAiReady: e.target.checked })}
                      className="rounded" />
                    <Brain className="w-4 h-4 text-purple-500" /> AI Ready
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={formData.blnActive}
                      onChange={(e) => setFormData({ ...formData, blnActive: e.target.checked })}
                      className="rounded" />
                    <Check className="w-4 h-4 text-emerald-500" /> Active
                  </label>
                </div>
              </div>

              <button onClick={handleSave}
                className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
                {editingService ? "Update Service" : "Create Service"}
              </button>
            </div>
          </div>
        )}

        {/* Service List */}
        <div className="space-y-3">
          {services.map((svc) => (
            <div key={svc.intServiceId} className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    svc.blnAiReady ? "bg-purple-50" : "bg-neutral-100"
                  }`}>
                    {svc.blnAiReady ? (
                      <Zap className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Wrench className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 text-sm">{svc.strDisplayName}</h3>
                    <p className="text-xs text-neutral-400">{svc.strServiceName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {svc.blnHasPrompt && (
                    <button onClick={() => handleViewPrompt(svc)}
                      className="p-1.5 hover:bg-neutral-100 rounded-lg" title="View prompt">
                      <Eye className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  )}
                  <button onClick={() => handleEdit(svc)}
                    className="p-1.5 hover:bg-neutral-100 rounded-lg">
                    <Pencil className="w-3.5 h-3.5 text-neutral-400" />
                  </button>
                  <button onClick={() => handleDelete(svc.intServiceId)}
                    className="p-1.5 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
                {svc.strDescription && <span>{svc.strDescription}</span>}
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs">
                {svc.blnAiReady ? (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded font-medium">AI Ready</span>
                ) : (
                  <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded font-medium">No AI</span>
                )}
                {!svc.blnActive && <span className="px-2 py-0.5 bg-red-50 text-red-500 rounded font-medium">Inactive</span>}
                <span className="text-neutral-400">{svc.intUserCount} users</span>
              </div>
            </div>
          ))}
        </div>

        {/* Prompt Viewer Modal */}
        {viewingPrompt && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900">
                  {viewingPrompt.strDisplayName} — AI Prompt
                </h3>
                <button onClick={() => setViewingPrompt(null)}
                  className="p-1.5 hover:bg-neutral-100 rounded-lg">
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
              <pre className="text-xs text-neutral-700 whitespace-pre-wrap font-mono bg-neutral-50 p-4 rounded-lg border">
                {viewingPrompt.strAiPrompt || "No prompt configured"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
