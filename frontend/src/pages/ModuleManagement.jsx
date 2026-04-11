import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, Settings, Shield, Check, X, Save, Plus, Trash2,
  Home, FilePlus, Receipt, Package, Brain, BarChart3, Printer
} from "lucide-react";
import userService from "@/services/userService";

const ICON_MAP = {
  Home, FilePlus, Receipt, Package, Brain, Shield, BarChart3, Printer,
};

// "global" is not in tbl_module, so we hardcode just that one
const FALLBACK_LABELS = { global: "Global" };

export default function ModuleManagement() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("permissions");

  // Permission grid
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [toggling, setToggling] = useState(null);

  // Settings
  const [moduleSettings, setModuleSettings] = useState({});
  const [editingModule, setEditingModule] = useState(null);
  const [editValues, setEditValues] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Add new setting
  const [showAddSetting, setShowAddSetting] = useState(false);
  const [newSetting, setNewSetting] = useState({
    strModule: "global", strKey: "", strValue: "",
    strType: "string", strLabel: "", strDescription: "",
  });

  // Add new module
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModule, setNewModule] = useState({
    strModuleKey: "", strDisplayName: "", strIcon: "Package",
    strPath: "", strLabel: "", blnShowInSidebar: true,
    blnIsAdminOnly: false, intSortOrder: 50,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [gridRes, settingsRes] = await Promise.all([
        userService.getPermissionGrid(),
        userService.getAllSettings(),
      ]);
      if (gridRes.lstModules) setModules(gridRes.lstModules);
      if (gridRes.lstUsers) setUsers(gridRes.lstUsers);
      if (settingsRes.dctModuleSettings) setModuleSettings(settingsRes.dctModuleSettings);
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (intUserId, strModuleKey, currentValue) => {
    const key = `${intUserId}-${strModuleKey}`;
    setToggling(key);

    // Optimistic update
    setUsers(prev => prev.map(u =>
      u.intUserId === intUserId
        ? { ...u, dctModules: { ...u.dctModules, [strModuleKey]: !currentValue } }
        : u
    ));

    try {
      await userService.togglePermission(intUserId, strModuleKey, !currentValue);
    } catch (err) {
      // Revert on error
      setUsers(prev => prev.map(u =>
        u.intUserId === intUserId
          ? { ...u, dctModules: { ...u.dctModules, [strModuleKey]: currentValue } }
          : u
      ));
    } finally {
      setToggling(null);
    }
  };

  const openModuleSettings = (strModule) => {
    setEditingModule(strModule);
    setEditValues(moduleSettings[strModule]?.map(s => ({ ...s })) || []);
  };

  const handleSettingChange = (strKey, strValue) => {
    setEditValues(prev => prev.map(s =>
      s.strKey === strKey ? { ...s, strValue } : s
    ));
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await userService.updateSettings(editingModule, editValues);
      // Update local state
      setModuleSettings(prev => ({ ...prev, [editingModule]: editValues }));
      setEditingModule(null);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddModule = async () => {
    if (!newModule.strModuleKey || !newModule.strDisplayName) return;
    try {
      await userService.addModule(newModule);
      setShowAddModule(false);
      setNewModule({ strModuleKey: "", strDisplayName: "", strIcon: "Package", strPath: "", strLabel: "", blnShowInSidebar: true, blnIsAdminOnly: false, intSortOrder: 50 });
      loadData();
    } catch (err) {
      console.error("Failed to add module:", err);
    }
  };

  const handleDeleteModule = async (intModuleId) => {
    if (!window.confirm("Delete this module?")) return;
    try {
      await userService.deleteModule(intModuleId);
      loadData();
    } catch (err) {
      console.error("Failed to delete module:", err);
    }
  };

  const handleAddSetting = async () => {
    if (!newSetting.strKey || !newSetting.strModule) return;
    try {
      await userService.addSetting(newSetting);
      setShowAddSetting(false);
      setNewSetting({ strModule: "global", strKey: "", strValue: "", strType: "string", strLabel: "", strDescription: "" });
      loadData();
    } catch (err) {
      console.error("Failed to add setting:", err);
    }
  };

  const handleDeleteSetting = async (strModule, strKey) => {
    if (!window.confirm(`Delete setting "${strKey}" from ${strModule}?`)) return;
    try {
      await userService.deleteSetting(strModule, strKey);
      loadData();
    } catch (err) {
      console.error("Failed to delete:", err);
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
      <div className="w-full max-w-4xl px-5 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/admin")} className="p-2 hover:bg-neutral-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-neutral-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900">Modules & Settings</h1>
            <p className="text-xs text-neutral-500">Control user access and configure module settings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-neutral-100 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab("permissions")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "permissions" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            <Shield className="w-4 h-4 inline mr-1.5" />Permissions
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === "settings" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
            }`}
          >
            <Settings className="w-4 h-4 inline mr-1.5" />Module Settings
          </button>
        </div>

        {/* ═══ PERMISSIONS GRID TAB ═══ */}
        {activeTab === "permissions" && (
          <div className="space-y-4">
          {/* Add Module */}
          {!showAddModule ? (
            <button onClick={() => setShowAddModule(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-200 rounded-xl text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors">
              <Plus className="w-4 h-4" /> Add New Module
            </button>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-neutral-900 text-sm">New Module</h3>
                <button onClick={() => setShowAddModule(false)} className="p-1 hover:bg-neutral-100 rounded-lg">
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Key (unique)</label>
                    <input type="text" value={newModule.strModuleKey}
                      onChange={(e) => setNewModule({ ...newModule, strModuleKey: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                      placeholder="e.g. warranty" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Display Name</label>
                    <input type="text" value={newModule.strDisplayName}
                      onChange={(e) => setNewModule({ ...newModule, strDisplayName: e.target.value })}
                      placeholder="Warranty" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Icon</label>
                    <select value={newModule.strIcon} onChange={(e) => setNewModule({ ...newModule, strIcon: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg">
                      {Object.keys(ICON_MAP).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Path</label>
                    <input type="text" value={newModule.strPath}
                      onChange={(e) => setNewModule({ ...newModule, strPath: e.target.value })}
                      placeholder="/warranty" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Sidebar Label</label>
                    <input type="text" value={newModule.strLabel}
                      onChange={(e) => setNewModule({ ...newModule, strLabel: e.target.value })}
                      placeholder="Warranty" className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">Sort Order</label>
                    <input type="number" value={newModule.intSortOrder}
                      onChange={(e) => setNewModule({ ...newModule, intSortOrder: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={newModule.blnShowInSidebar}
                      onChange={(e) => setNewModule({ ...newModule, blnShowInSidebar: e.target.checked })} className="rounded" />
                    Show in Sidebar
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={newModule.blnIsAdminOnly}
                      onChange={(e) => setNewModule({ ...newModule, blnIsAdminOnly: e.target.checked })} className="rounded" />
                    Admin Only
                  </label>
                </div>
                <button onClick={handleAddModule} disabled={!newModule.strModuleKey || !newModule.strDisplayName}
                  className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50">
                  Add Module
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-neutral-50 border-b border-neutral-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 uppercase w-48">
                      User
                    </th>
                    {modules.map((mod) => {
                      const Icon = ICON_MAP[mod.strIcon] || Shield;
                      return (
                        <th key={mod.strKey} className="px-2 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Icon className="w-4 h-4 text-neutral-400" />
                            <span className="text-[10px] font-medium text-neutral-500">{mod.strName}</span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={modules.length + 1} className="text-center py-8 text-sm text-neutral-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user, idx) => (
                      <tr
                        key={user.intUserId}
                        className={`${idx !== users.length - 1 ? "border-b border-neutral-100" : ""} ${
                          !user.blnIsActive ? "opacity-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-neutral-900">{user.strUsername}</p>
                            <p className="text-[11px] text-neutral-400">{user.strEmail}</p>
                          </div>
                          {!user.blnIsActive && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded mt-1 inline-block">Inactive</span>
                          )}
                        </td>
                        {modules.map((mod) => {
                          const blnEnabled = user.dctModules?.[mod.strKey] ?? true;
                          const isToggling = toggling === `${user.intUserId}-${mod.strKey}`;
                          return (
                            <td key={mod.strKey} className="px-2 py-3 text-center">
                              <button
                                onClick={() => handleToggle(user.intUserId, mod.strKey, blnEnabled)}
                                disabled={isToggling}
                                className={`relative w-10 h-6 rounded-full transition-colors mx-auto block ${
                                  blnEnabled ? "bg-emerald-500" : "bg-neutral-300"
                                } ${isToggling ? "opacity-50" : "cursor-pointer"}`}
                              >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                  blnEnabled ? "translate-x-4" : "translate-x-0.5"
                                }`} />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 flex items-center gap-4 text-xs text-neutral-500">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-3 bg-emerald-500 rounded-full" /> Enabled
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-3 bg-neutral-300 rounded-full" /> Disabled
              </div>
              <span className="text-neutral-400">Changes save instantly</span>
            </div>
          </div>
          </div>
        )}

        {/* ═══ MODULE SETTINGS TAB ═══ */}
        {activeTab === "settings" && (
          <div className="space-y-3">
            {/* Add Setting Button */}
            {!showAddSetting ? (
              <button
                onClick={() => setShowAddSetting(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-200 rounded-xl text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add New Setting
              </button>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-neutral-900 text-sm">New Setting</h3>
                  <button onClick={() => setShowAddSetting(false)} className="p-1 hover:bg-neutral-100 rounded-lg">
                    <X className="w-4 h-4 text-neutral-500" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Module</label>
                      <select value={newSetting.strModule} onChange={(e) => setNewSetting({ ...newSetting, strModule: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg">
                        <option value="global">Global</option>
                        {modules.map((mod) => (
                          <option key={mod.strKey} value={mod.strKey}>{mod.strName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Type</label>
                      <select value={newSetting.strType} onChange={(e) => setNewSetting({ ...newSetting, strType: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg">
                        <option value="string">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">On/Off</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Key (unique, no spaces)</label>
                      <input type="text" value={newSetting.strKey}
                        onChange={(e) => setNewSetting({ ...newSetting, strKey: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                        placeholder="e.g. warranty_manual_override"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Default Value</label>
                      {newSetting.strType === "boolean" ? (
                        <select value={newSetting.strValue} onChange={(e) => setNewSetting({ ...newSetting, strValue: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg">
                          <option value="false">Off</option>
                          <option value="true">On</option>
                        </select>
                      ) : (
                        <input type={newSetting.strType === "number" ? "number" : "text"} value={newSetting.strValue}
                          onChange={(e) => setNewSetting({ ...newSetting, strValue: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg" />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Label</label>
                      <input type="text" value={newSetting.strLabel}
                        onChange={(e) => setNewSetting({ ...newSetting, strLabel: e.target.value })}
                        placeholder="Warranty Manual Override"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg" />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 mb-1 block">Description</label>
                      <input type="text" value={newSetting.strDescription}
                        onChange={(e) => setNewSetting({ ...newSetting, strDescription: e.target.value })}
                        placeholder="Allow users to manually override warranty dates"
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg" />
                    </div>
                  </div>
                  <button onClick={handleAddSetting}
                    disabled={!newSetting.strKey || !newSetting.strLabel}
                    className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50">
                    Add Setting
                  </button>
                </div>
              </div>
            )}

            {/* Settings by module */}
            {Object.entries(moduleSettings).map(([strModule, lstSettings]) => (
              <div key={strModule} className="bg-white border border-neutral-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-neutral-400" />
                    <h3 className="font-semibold text-neutral-900 text-sm capitalize">
                      {modules.find(m => m.strKey === strModule)?.strName || FALLBACK_LABELS[strModule] || strModule}
                    </h3>
                    <span className="text-xs text-neutral-400">({lstSettings.length} settings)</span>
                  </div>
                  <button
                    onClick={() => openModuleSettings(strModule)}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 rounded-lg hover:bg-neutral-200"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lstSettings.map((setting) => (
                    <div key={setting.strKey} className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-lg group">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-neutral-600 truncate">{setting.strLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-900">
                          {setting.strType === "boolean"
                            ? setting.strValue === "true" ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-400" />
                            : setting.strValue}
                        </span>
                        <button
                          onClick={() => handleDeleteSetting(strModule, setting.strKey)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ EDIT SETTINGS MODAL ═══ */}
        {editingModule && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-neutral-900 capitalize">
                  {modules.find(m => m.strKey === editingModule)?.strName || FALLBACK_LABELS[editingModule] || editingModule} Settings
                </h3>
                <button onClick={() => setEditingModule(null)} className="p-1.5 hover:bg-neutral-100 rounded-lg">
                  <X className="w-4 h-4 text-neutral-500" />
                </button>
              </div>

              <div className="space-y-4 mb-4">
                {editValues.map((setting) => (
                  <div key={setting.strKey}>
                    <label className="text-xs font-medium text-neutral-700 mb-1 block">
                      {setting.strLabel}
                    </label>
                    {setting.strDescription && (
                      <p className="text-[10px] text-neutral-400 mb-1.5">{setting.strDescription}</p>
                    )}

                    {setting.strType === "boolean" ? (
                      <button
                        onClick={() => handleSettingChange(
                          setting.strKey,
                          setting.strValue === "true" ? "false" : "true"
                        )}
                        className={`relative w-12 h-7 rounded-full transition-colors ${
                          setting.strValue === "true" ? "bg-emerald-500" : "bg-neutral-300"
                        }`}
                      >
                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                          setting.strValue === "true" ? "translate-x-5" : "translate-x-0.5"
                        }`} />
                      </button>
                    ) : setting.strType === "number" ? (
                      <input
                        type="number"
                        value={setting.strValue}
                        onChange={(e) => handleSettingChange(setting.strKey, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                      />
                    ) : (
                      <input
                        type="text"
                        value={setting.strValue || ""}
                        onChange={(e) => handleSettingChange(setting.strKey, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingModule(null)}
                  className="flex-1 py-2.5 text-sm font-medium border border-neutral-200 rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex-1 py-2.5 text-sm font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Save className="w-4 h-4" /> Save</>
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
