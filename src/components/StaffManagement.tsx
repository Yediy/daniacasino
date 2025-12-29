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
import { UserPlus, Edit, Trash2, Key, ShieldCheck, Eye, EyeOff } from "lucide-react";

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  created_at: string;
  auth_user_id: string | null;
  has_pin: boolean;
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
  const [newPinForEdit, setNewPinForEdit] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPinResetDialogOpen, setIsPinResetDialogOpen] = useState(false);
  const [staffForPinReset, setStaffForPinReset] = useState<StaffMember | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [showNewPin, setShowNewPin] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, email, role, created_at, auth_user_id, pin_code')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to hide actual pin_code but indicate if one exists
      const transformedData = (data || []).map(member => ({
        id: member.id,
        full_name: member.full_name,
        email: member.email,
        role: member.role,
        created_at: member.created_at,
        auth_user_id: member.auth_user_id,
        has_pin: !!member.pin_code
      }));
      
      setStaff(transformedData);
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

      // First create the staff member without PIN
      const { data: createdStaff, error: insertError } = await supabase
        .from('staff')
        .insert({
          full_name: newStaff.full_name,
          email: newStaff.email || null,
          role: newStaff.role
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Then set the PIN using the secure RPC function
      const { error: pinError } = await supabase.rpc('set_staff_pin', {
        p_staff_id: createdStaff.id,
        p_pin: pin
      });

      if (pinError) {
        // If PIN setting fails, still show success but warn about PIN
        console.error('Error setting PIN:', pinError);
        toast({
          title: "Staff Created (PIN Issue)",
          description: `${newStaff.full_name} has been added but PIN could not be set. Please reset their PIN.`,
          variant: "destructive",
        });
      } else {
        // Show the generated PIN one time only
        setGeneratedPin(pin);
        toast({
          title: "Staff Member Created",
          description: `${newStaff.full_name} has been added. PIN is displayed below - save it now as it cannot be viewed again.`,
        });
      }

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
          role: editingStaff.role
        })
        .eq('id', editingStaff.id);

      if (error) throw error;

      // If a new PIN was provided, update it securely
      if (newPinForEdit && newPinForEdit.length === 4) {
        const { error: pinError } = await supabase.rpc('set_staff_pin', {
          p_staff_id: editingStaff.id,
          p_pin: newPinForEdit
        });

        if (pinError) {
          console.error('Error updating PIN:', pinError);
          toast({
            title: "Staff Updated (PIN Issue)",
            description: "Staff info updated but PIN change failed.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Staff Updated",
            description: "Staff member information and PIN updated successfully",
          });
        }
      } else {
        toast({
          title: "Staff Updated",
          description: "Staff member information updated successfully",
        });
      }

      setEditingStaff(null);
      setNewPinForEdit("");
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

  const handleResetPin = async () => {
    if (!staffForPinReset || !resetPin || resetPin.length !== 4) {
      toast({
        title: "Validation Error",
        description: "PIN must be exactly 4 digits",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.rpc('set_staff_pin', {
        p_staff_id: staffForPinReset.id,
        p_pin: resetPin
      });

      if (error) throw error;

      toast({
        title: "PIN Reset Successfully",
        description: `PIN for ${staffForPinReset.full_name} has been updated.`,
      });

      setIsPinResetDialogOpen(false);
      setStaffForPinReset(null);
      setResetPin("");
      fetchStaff();
    } catch (error) {
      console.error('Error resetting PIN:', error);
      toast({
        title: "Error",
        description: "Failed to reset PIN. Make sure you have admin privileges.",
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
      {/* One-time PIN display dialog */}
      <Dialog open={!!generatedPin} onOpenChange={() => setGeneratedPin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-500" />
              Staff PIN Created
            </DialogTitle>
            <DialogDescription>
              This PIN will only be shown once. Please save it securely.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="text-4xl font-mono font-bold tracking-wider bg-muted p-4 rounded-lg">
              {generatedPin}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Write this PIN down and give it to the staff member securely.
              It cannot be viewed again after closing this dialog.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setGeneratedPin(null)}>
              I've Saved the PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Reset Dialog */}
      <Dialog open={isPinResetDialogOpen} onOpenChange={setIsPinResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset PIN for {staffForPinReset?.full_name}</DialogTitle>
            <DialogDescription>
              Enter a new 4-digit PIN for this staff member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset_pin">New PIN (4 digits)</Label>
              <div className="flex gap-2">
                <Input
                  id="reset_pin"
                  type={showNewPin ? "text" : "password"}
                  value={resetPin}
                  onChange={(e) => setResetPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewPin(!showNewPin)}
                >
                  {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setResetPin(generatePIN())}
                >
                  <Key className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPinResetDialogOpen(false);
              setStaffForPinReset(null);
              setResetPin("");
            }}>Cancel</Button>
            <Button onClick={handleResetPin} disabled={resetPin.length !== 4}>Reset PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-muted-foreground">Manage staff accounts and roles. PINs are securely hashed.</p>
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
                Create a new staff account with role and PIN. The PIN will be shown once after creation.
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
                    type={showNewPin ? "text" : "password"}
                    value={newStaff.pin_code}
                    onChange={(e) => setNewStaff({...newStaff, pin_code: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                    placeholder="Auto-generated if empty"
                    maxLength={4}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewPin(!showNewPin)}
                  >
                    {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setNewStaff({...newStaff, pin_code: generatePIN()})}
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty for auto-generated PIN. PIN will only be shown once after creation.
                </p>
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
                  {member.has_pin ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      PIN Set
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      No PIN
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
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setStaffForPinReset(member);
                      setResetPin("");
                      setIsPinResetDialogOpen(true);
                    }}
                    title="Reset PIN"
                  >
                    <Key className="h-4 w-4" />
                  </Button>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingStaff(member);
                          setNewPinForEdit("");
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Staff Member</DialogTitle>
                        <DialogDescription>
                          Update staff information. Leave PIN empty to keep current PIN.
                        </DialogDescription>
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
                            <Label>New PIN (leave empty to keep current)</Label>
                            <Input
                              type="password"
                              value={newPinForEdit}
                              onChange={(e) => setNewPinForEdit(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="Enter new 4-digit PIN"
                              maxLength={4}
                              className="font-mono"
                            />
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setEditingStaff(null);
                          setNewPinForEdit("");
                        }}>Cancel</Button>
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