import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Download, FileText, Calendar } from "lucide-react";

interface RevenueBreakdown {
  category: string;
  amount: number;
  count: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--warning))'];

export default function Reports() {
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const breakdown: RevenueBreakdown[] = [];
      const dailyMap: Record<string, any> = {};

      // Fetch orders (food)
      const { data: orders } = await supabase
        .from('orders')
        .select('total, placed_at')
        .gte('placed_at', startDate)
        .lte('placed_at', endDate)
        .eq('status', 'completed');

      const foodRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
      breakdown.push({ category: 'Food & Beverage', amount: foodRevenue / 100, count: orders?.length || 0 });

      orders?.forEach(order => {
        const date = new Date(order.placed_at).toLocaleDateString();
        if (!dailyMap[date]) dailyMap[date] = { date, tickets: 0, food: 0, poker: 0, vouchers: 0 };
        dailyMap[date].food += order.total / 100;
      });

      // Fetch event tickets
      const { data: tickets } = await supabase
        .from('event_tickets')
        .select('amount, issued_at')
        .gte('issued_at', startDate)
        .lte('issued_at', endDate);

      const ticketRevenue = tickets?.reduce((sum, t) => sum + t.amount, 0) || 0;
      breakdown.push({ category: 'Event Tickets', amount: ticketRevenue / 100, count: tickets?.length || 0 });

      tickets?.forEach(ticket => {
        const date = new Date(ticket.issued_at).toLocaleDateString();
        if (!dailyMap[date]) dailyMap[date] = { date, tickets: 0, food: 0, poker: 0, vouchers: 0 };
        dailyMap[date].tickets += ticket.amount / 100;
      });

      // Fetch poker entries
      const { data: entries } = await supabase
        .from('poker_entries')
        .select('amount, issued_at')
        .gte('issued_at', startDate)
        .lte('issued_at', endDate);

      const pokerRevenue = entries?.reduce((sum, e) => sum + e.amount, 0) || 0;
      breakdown.push({ category: 'Poker Entries', amount: pokerRevenue / 100, count: entries?.length || 0 });

      entries?.forEach(entry => {
        const date = new Date(entry.issued_at).toLocaleDateString();
        if (!dailyMap[date]) dailyMap[date] = { date, tickets: 0, food: 0, poker: 0, vouchers: 0 };
        dailyMap[date].poker += entry.amount / 100;
      });

      // Fetch vouchers
      const { data: vouchers } = await supabase
        .from('chip_vouchers')
        .select('amount, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .eq('status', 'paid');

      const voucherRevenue = vouchers?.reduce((sum, v) => sum + v.amount, 0) || 0;
      breakdown.push({ category: 'Chip Vouchers', amount: voucherRevenue / 100, count: vouchers?.length || 0 });

      vouchers?.forEach(voucher => {
        const date = new Date(voucher.created_at).toLocaleDateString();
        if (!dailyMap[date]) dailyMap[date] = { date, tickets: 0, food: 0, poker: 0, vouchers: 0 };
        dailyMap[date].vouchers += voucher.amount / 100;
      });

      setRevenueBreakdown(breakdown);
      setDailyRevenue(Object.values(dailyMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setTotalRevenue(breakdown.reduce((sum, b) => sum + b.amount, 0));
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to load report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Category', 'Amount ($)', 'Count'];
    const rows = revenueBreakdown.map(b => [b.category, b.amount.toFixed(2), b.count]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '',
      'Total Revenue,' + totalRevenue.toFixed(2)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-report-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "CSV file downloaded",
    });
  };

  const exportToPDF = () => {
    // Simple PDF export using print dialog
    window.print();
    toast({
      title: "Print Dialog Opened",
      description: "Use your browser's print dialog to save as PDF",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Revenue Reports
          </h1>
          <p className="text-muted-foreground">
            Detailed breakdowns and analytics
          </p>
        </div>

        {/* Filters */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={exportToCSV} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button onClick={exportToPDF} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="shadow-elegant bg-primary/5 border-primary">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Total Revenue</div>
              <div className="text-4xl font-bold text-primary">${totalRevenue.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground mt-2">
                {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
              <CardDescription>Distribution across all revenue streams</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, amount }) => `${category}: $${amount.toFixed(0)}`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="amount"
                  >
                    {revenueBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Transaction Counts</CardTitle>
              <CardDescription>Number of transactions per category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Daily Revenue Trend */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Daily Revenue Trend</CardTitle>
            <CardDescription>Revenue breakdown by day and category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="tickets" stroke={COLORS[0]} strokeWidth={2} name="Tickets" />
                <Line type="monotone" dataKey="food" stroke={COLORS[1]} strokeWidth={2} name="Food" />
                <Line type="monotone" dataKey="poker" stroke={COLORS[2]} strokeWidth={2} name="Poker" />
                <Line type="monotone" dataKey="vouchers" stroke={COLORS[3]} strokeWidth={2} name="Vouchers" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Detailed Breakdown Table */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Category</th>
                    <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                    <th className="text-right py-3 px-4 font-semibold">Count</th>
                    <th className="text-right py-3 px-4 font-semibold">Avg/Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueBreakdown.map((item, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-3 px-4">{item.category}</td>
                      <td className="text-right py-3 px-4 font-mono">${item.amount.toFixed(2)}</td>
                      <td className="text-right py-3 px-4">{item.count}</td>
                      <td className="text-right py-3 px-4 font-mono">
                        ${item.count > 0 ? (item.amount / item.count).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-border">
                    <td className="py-3 px-4">Total</td>
                    <td className="text-right py-3 px-4 font-mono">${totalRevenue.toFixed(2)}</td>
                    <td className="text-right py-3 px-4">
                      {revenueBreakdown.reduce((sum, b) => sum + b.count, 0)}
                    </td>
                    <td className="text-right py-3 px-4">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
