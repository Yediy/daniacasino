import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Send, Calendar as CalendarIcon, Megaphone, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Campaign {
  id: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
  segment_filter: any;
}

export const CampaignBuilder = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    channel: 'push',
    segment: 'all',
    scheduledDate: null as Date | undefined,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();

    const campaignsChannel = supabase
      .channel('campaigns-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'campaigns'
      }, () => {
        fetchCampaigns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(campaignsChannel);
    };
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to load campaigns",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.title || !formData.message) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const segmentFilter = formData.segment === 'all' 
        ? {} 
        : { tier: formData.segment };

      const { error } = await supabase
        .from('campaigns')
        .insert({
          title: formData.title,
          message: formData.message,
          channel: formData.channel,
          segment_filter: segmentFilter,
          scheduled_for: formData.scheduledDate?.toISOString(),
          status: formData.scheduledDate ? 'scheduled' : 'draft',
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Campaign Created",
        description: formData.scheduledDate 
          ? `Campaign scheduled for ${format(formData.scheduledDate, 'PPP')}` 
          : "Campaign created as draft",
      });

      setDialogOpen(false);
      setFormData({
        title: '',
        message: '',
        channel: 'push',
        segment: 'all',
        scheduledDate: undefined,
      });
      fetchCampaigns();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Error",
        description: "Failed to create campaign",
        variant: "destructive",
      });
    }
  };

  const handleSendNow = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      if (error) throw error;

      // TODO: Trigger actual campaign send via edge function
      toast({
        title: "Campaign Sent",
        description: "Campaign has been sent to targeted users",
      });

      fetchCampaigns();
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        title: "Error",
        description: "Failed to send campaign",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      draft: "secondary",
      scheduled: "default",
      sent: "success",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
        return '📱';
      case 'email':
        return '📧';
      case 'push':
        return '🔔';
      default:
        return '📢';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading campaigns...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Campaign Management</h3>
          <p className="text-muted-foreground">Create and manage marketing campaigns</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-elegant">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Campaign</DialogTitle>
              <DialogDescription>
                Set up a new marketing campaign to reach your users
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Weekend Tournament Special"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your campaign message..."
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.message.length} characters
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="channel">Channel</Label>
                  <Select
                    value={formData.channel}
                    onValueChange={(value) => setFormData({ ...formData, channel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">🔔 Push Notification</SelectItem>
                      <SelectItem value="sms">📱 SMS</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="segment">Target Segment</Label>
                  <Select
                    value={formData.segment}
                    onValueChange={(value) => setFormData({ ...formData, segment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="User">User Tier</SelectItem>
                      <SelectItem value="Staff">Staff Tier</SelectItem>
                      <SelectItem value="Admin">Admin Tier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Schedule (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.scheduledDate ? format(formData.scheduledDate, 'PPP') : 'Send immediately'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.scheduledDate}
                      onSelect={(date) => setFormData({ ...formData, scheduledDate: date })}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateCampaign}>
                {formData.scheduledDate ? 'Schedule Campaign' : 'Create Draft'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <Card className="shadow-elegant">
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No campaigns yet. Create your first campaign!</p>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id} className="shadow-elegant">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{getChannelIcon(campaign.channel)}</span>
                      <CardTitle className="text-lg">{campaign.title}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">{campaign.message}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(campaign.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        Target: {campaign.segment_filter?.tier || 'All Users'}
                      </span>
                    </div>
                    {campaign.scheduled_for && !campaign.sent_at && (
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>
                          Scheduled: {format(new Date(campaign.scheduled_for), 'PPP')}
                        </span>
                      </div>
                    )}
                    {campaign.sent_at && (
                      <div className="text-muted-foreground">
                        Sent: {format(new Date(campaign.sent_at), 'PPP')}
                      </div>
                    )}
                  </div>
                  {campaign.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleSendNow(campaign.id)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
