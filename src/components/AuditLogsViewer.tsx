import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  event_type: string;
  resource_type: string;
  resource_id: string | null;
  user_id: string | null;
  staff_id: string | null;
  details: any;
  ip_address: string | null;
  timestamp: string;
}

export const AuditLogsViewer = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeBadgeColor = (eventType: string) => {
    if (eventType.includes('delete') || eventType.includes('remove')) return "destructive";
    if (eventType.includes('update') || eventType.includes('modify')) return "default";
    if (eventType.includes('create') || eventType.includes('add')) return "secondary";
    if (eventType.includes('redeem')) return "outline";
    return "secondary";
  };

  const eventTypes = ["all", ...new Set(logs.map(log => log.event_type))];
  const resourceTypes = ["all", ...new Set(logs.map(log => log.resource_type))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === "" || 
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resource_id && log.resource_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesEventType = eventTypeFilter === "all" || log.event_type === eventTypeFilter;
    const matchesResourceType = resourceTypeFilter === "all" || log.resource_type === resourceTypeFilter;
    
    return matchesSearch && matchesEventType && matchesResourceType;
  });

  if (loading) {
    return <div className="text-center py-8">Loading audit logs...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Audit Logs
        </h2>
        <p className="text-muted-foreground">View all sensitive actions and system events</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "all" ? "All Events" : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type</label>
              <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "all" ? "All Resources" : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setEventTypeFilter("all");
              setResourceTypeFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <Card key={log.id} className="hover:shadow-elegant transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={getEventTypeBadgeColor(log.event_type)}>
                    {log.event_type}
                  </Badge>
                  <Badge variant="outline">
                    {log.resource_type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
              
              {log.resource_id && (
                <div className="text-sm mb-2">
                  <span className="text-muted-foreground">Resource ID:</span>{" "}
                  <code className="text-xs bg-muted px-2 py-1 rounded">{log.resource_id}</code>
                </div>
              )}
              
              {log.details && Object.keys(log.details).length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <div className="text-xs font-mono whitespace-pre-wrap">
                    {JSON.stringify(log.details, null, 2)}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                {log.staff_id && (
                  <div>Staff ID: {log.staff_id.substring(0, 8)}...</div>
                )}
                {log.user_id && (
                  <div>User ID: {log.user_id.substring(0, 8)}...</div>
                )}
                {log.ip_address && (
                  <div>IP: {log.ip_address}</div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLogs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No audit logs found matching your filters
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredLogs.length} of {logs.length} audit logs
      </div>
    </div>
  );
};
