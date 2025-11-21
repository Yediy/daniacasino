import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Edit, Trash2, Key } from "lucide-react";

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  pin_code: string | null;
  created_at: string;
  auth_user_id: string | null;
}

export const StaffManagement = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStaff, setNewStaff] = useState({
    full_name: "",
    email: "",
    role: "staff_floor",
    pin_code: ""
  });
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error",
        description: "Failed to load staff members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePIN = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleCreateStaff = async () => {
    if (!newStaff.full_name || !newStaff.role) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const pin = newStaff.pin_code || generatePIN();

      const { error } = await supabase
        .from('staff')
        .insert({
          full_name: newStaff.full_name,
          email: newStaff.email || null,
          role: newStaff.role,
          pin_code: pin
        });

      if (error) throw error;

      toast({
        title: "Staff Member Created",
        description: `${newStaff.full_name} has been added with PIN: ${pin}`,
      });

      setNewStaff({ full_name: "", email: "", role: "staff_floor", pin_code: "" });
      setIsDialogOpen(false);
      fetchStaff();
    } catch (error) {
      console.error('Error creating staff:', error);
      toast({
        title: "Error",
        description: "Failed to create staff member",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStaff = async () => {
    if (!editingStaff) return;

    try {
      const { error } = await supabase
        .from('staff')
        .update({
          full_name: editingStaff.full_name,
          email: editingStaff.email,
          role: editingStaff.role,
          pin_code: editingStaff.pin_code
        })
        .eq('id', editingStaff.id);

      if (error) throw error;

      toast({
        title: "Staff Updated",
        description: "Staff member information updated successfully",
      });

      setEditingStaff(null);
      fetchStaff();
    } catch (error) {
      console.error('Error updating staff:', error);
      toast({
        title: "Error",
        description: "Failed to update staff member",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Staff Deleted",
        description: `${name} has been removed`,
      });

      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return "destructive";
      case 'super_admin': return "default";
      case 'staff_kitchen': return "secondary";
      case 'staff_floor': return "outline";
      case 'staff_poker': return "outline";
      default: return "secondary";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading staff members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-muted-foreground">Manage staff accounts, roles, and PINs</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff account with role and PIN
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={newStaff.role} onValueChange={(value) => setNewStaff({...newStaff, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff_kitchen">Kitchen Staff</SelectItem>
                    <SelectItem value="staff_floor">Floor Staff</SelectItem>
                    <SelectItem value="staff_poker">Poker Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin_code">PIN Code (4 digits)</Label>
                <div className="flex gap-2">
                  <Input
                    id="pin_code"
                    value={newStaff.pin_code}
                    onChange={(e) => setNewStaff({...newStaff, pin_code: e.target.value})}
                    placeholder="Auto-generated if empty"
                    maxLength={4}
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setNewStaff({...newStaff, pin_code: generatePIN()})}
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateStaff}>Create Staff Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {staff.map((member) => (
          <Card key={member.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{member.full_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {member.email || 'No email'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleBadgeColor(member.role)}>
                    {member.role.replace('_', ' ')}
                  </Badge>
                  {member.pin_code && (
                    <Badge variant="outline" className="font-mono">
                      PIN: {member.pin_code}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  Added {new Date(member.created_at).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingStaff(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Staff Member</DialogTitle>
                      </DialogHeader>
                      {editingStaff && (
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                              value={editingStaff.full_name}
                              onChange={(e) => setEditingStaff({...editingStaff, full_name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={editingStaff.email || ""}
                              onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select 
                              value={editingStaff.role} 
                              onValueChange={(value) => setEditingStaff({...editingStaff, role: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="staff_kitchen">Kitchen Staff</SelectItem>
                                <SelectItem value="staff_floor">Floor Staff</SelectItem>
                                <SelectItem value="staff_poker">Poker Staff</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>PIN Code</Label>
                            <Input
                              value={editingStaff.pin_code || ""}
                              onChange={(e) => setEditingStaff({...editingStaff, pin_code: e.target.value})}
                              maxLength={4}
                            />
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingStaff(null)}>Cancel</Button>
                        <Button onClick={handleUpdateStaff}>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteStaff(member.id, member.full_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {staff.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No staff members found. Add your first staff member to get started.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
