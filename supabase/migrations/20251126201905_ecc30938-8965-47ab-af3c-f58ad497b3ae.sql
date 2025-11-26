-- Enable RLS on tier_thresholds table
ALTER TABLE public.tier_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view tier thresholds"
ON public.tier_thresholds FOR SELECT
USING (true);

CREATE POLICY "Admin can manage tier thresholds"
ON public.tier_thresholds FOR ALL
USING (has_role(auth.uid(), 'Admin'::app_role));