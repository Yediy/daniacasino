import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UtensilsCrossed, Plus, Edit, DollarSign, Package } from "lucide-react";

interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean | null;
  stock_qty: number | null;
  tags: string[] | null;
  image: string | null;
}

interface Vendor {
  id: string;
  name: string;
  location: string;
}

export const MenuItemManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    vendor_id: '',
    name: '',
    description: '',
    price: 0,
    is_active: true,
    stock_qty: 999,
    tags: [] as string[],
    image: '',
  });
  const [tagInput, setTagInput] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
    fetchMenuItems();
  }, [selectedVendor]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('dining_vendors')
        .select('id, name, location')
        .eq('active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
      
      // Set first vendor as default if none selected
      if (data && data.length > 0 && !formData.vendor_id) {
        setFormData(prev => ({ ...prev, vendor_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      let query = supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true });

      if (selectedVendor !== "all") {
        query = query.eq('vendor_id', selectedVendor);
      }

      const { data, error } = await query;

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast({
        title: "Error",
        description: "Failed to load menu items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vendor_id: vendors.length > 0 ? vendors[0].id : '',
      name: '',
      description: '',
      price: 0,
      is_active: true,
      stock_qty: 999,
      tags: [],
      image: '',
    });
    setTagInput('');
    setEditingItem(null);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      vendor_id: item.vendor_id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      is_active: item.is_active ?? true,
      stock_qty: item.stock_qty ?? 999,
      tags: item.tags || [],
      image: item.image || '',
    });
    setDialogOpen(true);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Menu Item Updated",
          description: "Menu item has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert(formData);

        if (error) throw error;

        toast({
          title: "Menu Item Created",
          description: "New menu item has been added",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast({
        title: "Error",
        description: "Failed to save menu item",
        variant: "destructive",
      });
    }
  };

  const toggleItemStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Menu item ${!currentStatus ? 'activated' : 'deactivated'}`,
      });

      fetchMenuItems();
    } catch (error) {
      console.error('Error updating item status:', error);
      toast({
        title: "Error",
        description: "Failed to update item status",
        variant: "destructive",
      });
    }
  };

  const updateStock = async (id: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock_qty: newStock })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Stock Updated",
        description: `Stock updated to ${newStock}`,
      });

      fetchMenuItems();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading menu items...</div>;
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Menu Item Management</CardTitle>
            <CardDescription>Add and manage food & beverage items</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Create Menu Item'}</DialogTitle>
                <DialogDescription>Add item details and pricing</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Vendor</Label>
                  <Select
                    value={formData.vendor_id}
                    onValueChange={(value) => setFormData({ ...formData, vendor_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name} - {vendor.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Item Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Cheeseburger Deluxe"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Juicy beef patty with melted cheese..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label>Stock Quantity</Label>
                    <Input
                      type="number"
                      value={formData.stock_qty}
                      onChange={(e) => setFormData({ ...formData, stock_qty: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="e.g., vegetarian, spicy, popular"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active (Available for ordering)</Label>
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Vendor Filter */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 border-b">
          <Button
            variant={selectedVendor === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedVendor("all")}
          >
            All Vendors
          </Button>
          {vendors.map((vendor) => (
            <Button
              key={vendor.id}
              variant={selectedVendor === vendor.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVendor(vendor.id)}
              className="whitespace-nowrap"
            >
              {vendor.name}
            </Button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {menuItems.map((item) => {
            const vendor = vendors.find(v => v.id === item.vendor_id);
            return (
              <div key={item.id} className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-bold text-lg flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4 text-primary" />
                      {item.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {vendor?.name}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={item.is_active ? 'default' : 'secondary'}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {item.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-lg font-bold text-primary">
                    <DollarSign className="h-4 w-4" />
                    {item.price.toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <Input
                      type="number"
                      value={item.stock_qty || 0}
                      onChange={(e) => updateStock(item.id, parseInt(e.target.value) || 0)}
                      className="w-16 h-7 text-xs"
                    />
                  </div>
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  onClick={() => toggleItemStatus(item.id, item.is_active || false)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  {item.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            );
          })}
        </div>

        {menuItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No menu items yet. Create your first item to get started!
          </div>
        )}
      </CardContent>
    </Card>
  );
};