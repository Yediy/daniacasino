import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface UseRealtimeChannelOptions {
  channelName: string;
  table: string;
  schema?: string;
  event?: PostgresChangeEvent;
  filter?: string;
  enabled?: boolean;
}

/**
 * Hook for subscribing to Supabase realtime postgres changes.
 * Automatically handles cleanup on unmount.
 */
export function useRealtimeChannel<T = any>(
  options: UseRealtimeChannelOptions,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
) {
  const {
    channelName,
    table,
    schema = "public",
    event = "*",
    filter,
    enabled = true
  } = options;
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(callback);
  
  // Keep callback ref up to date
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channelConfig: any = {
      event,
      schema,
      table
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        channelConfig,
        (payload) => {
          callbackRef.current(payload as RealtimePostgresChangesPayload<T>);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Realtime channel "${channelName}" subscribed`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelName, table, schema, event, filter, enabled]);
}

/**
 * Simplified hook for watching a single table.
 */
export function useTableChanges<T = any>(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  enabled = true
) {
  const stableCallback = useCallback(callback, []);
  
  useRealtimeChannel<T>(
    {
      channelName: `${table}-changes`,
      table,
      enabled
    },
    stableCallback
  );
}
