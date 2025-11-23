import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Store, MapPin, Plus, Edit, Clock } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  location: string;
  accepts_mobile_orders: boolean | null;
  prep_minutes: number | null;
  active: boolean | null;
  is_open: boolean | null;
  pickup_counter_code: string | null;
}

export const VendorManagement = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    accepts_mobile_orders: true,
    prep_minutes: 15,
    active: true,
    is_open: true,
    pickup_counter_code: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('dining_vendors')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      toast({
        title: "Error",
        description: "Failed to load vendors",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      accepts_mobile_orders: true,
      prep_minutes: 15,
      active: true,
      is_open: true,
      pickup_counter_code: '',
    });
    setEditingVendor(null);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      location: vendor.location,
      accepts_mobile_orders: vendor.accepts_mobile_orders ?? true,
      prep_minutes: vendor.prep_minutes ?? 15,
      active: vendor.active ?? true,
      is_open: vendor.is_open ?? true,
      pickup_counter_code: vendor.pickup_counter_code || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingVendor) {
        const { error } = await supabase
          .from('dining_vendors')
          .update(formData)
          .eq('id', editingVendor.id);

        if (error) throw error;

        toast({
          title: "Vendor Updated",
          description: "Vendor has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('dining_vendors')
          .insert(formData);

        if (error) throw error;

        toast({
          title: "Vendor Created",
          description: "New vendor has been added",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast({
        title: "Error",
        description: "Failed to save vendor",
        variant: "destructive",
      });
    }
  };

  const toggleVendorStatus = async (id: string, field: 'active' | 'is_open', currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('dining_vendors')
        .update({ [field]: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Vendor ${field === 'active' ? 'active status' : 'open status'} updated`,
      });

      fetchVendors();
    } catch (error) {
      console.error('Error updating vendor status:', error);
      toast({
        title: "Error",
        description: "Failed to update vendor status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading vendors...</div>;
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vendor Management</CardTitle>
            <CardDescription>Manage dining vendors and food service locations</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Create New Vendor'}</DialogTitle>
                <DialogDescription>Add vendor details and settings</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Vendor Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Pizza Counter"
                  />
                </div>

                <div>
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Main Floor, North Side"
                  />
                </div>

                <div>
                  <Label>Pickup Counter Code</Label>
                  <Input
                    value={formData.pickup_counter_code}
                    onChange={(e) => setFormData({ ...formData, pickup_counter_code: e.target.value })}
                    placeholder="PC-01"
                  />
                </div>

                <div>
                  <Label>Prep Time (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.prep_minutes}
                    onChange={(e) => setFormData({ ...formData, prep_minutes: parseInt(e.target.value) || 15 })}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Accepts Mobile Orders</Label>
                    <Switch
                      checked={formData.accepts_mobile_orders}
                      onCheckedChange={(checked) => setFormData({ ...formData, accepts_mobile_orders: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Currently Open</Label>
                    <Switch
                      checked={formData.is_open}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_open: checked })}
                    />
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  {editingVendor ? 'Update Vendor' : 'Create Vendor'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {vendors.map((vendor) => (
            <div key={vendor.id} className="p-4 rounded-lg border-2 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-bold text-lg flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    {vendor.name}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3" />
                    {vendor.location}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={vendor.is_open ? 'default' : 'secondary'}>
                    {vendor.is_open ? 'Open' : 'Closed'}
                  </Badge>
                  <Badge variant={vendor.active ? 'default' : 'outline'}>
                    {vendor.active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleEdit(vendor)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Prep: {vendor.prep_minutes}min
                </div>
                <div className="text-muted-foreground">
                  Code: {vendor.pickup_counter_code || 'N/A'}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => toggleVendorStatus(vendor.id, 'is_open', vendor.is_open || false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {vendor.is_open ? 'Close' : 'Open'}
                </Button>
                <Button
                  onClick={() => toggleVendorStatus(vendor.id, 'active', vendor.active || false)}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  {vendor.active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}

          {vendors.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No vendors created yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};