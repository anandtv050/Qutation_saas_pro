import { Package, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Inventory() {
  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Inventory</h1>
            <p className="text-neutral-500 text-sm mt-1">Manage your items</p>
          </div>
          <Button className="gap-2 bg-neutral-900 hover:bg-black">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Item</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search items..."
            className="pl-10 bg-white border-neutral-200"
          />
        </div>

        {/* Empty State */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
          <h3 className="font-medium text-neutral-900 mb-1">No items yet</h3>
          <p className="text-sm text-neutral-500 mb-4">Add your first inventory item to get started</p>
          <Button className="bg-neutral-900 hover:bg-black">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>
    </div>
  );
}
