"use client";

import { useState, useEffect, useCallback } from "react";
import type { DataSet } from "@/types/data";

interface Connection {
  id: string;
  provider: string;
  config: { shop?: string; scopes?: string; apiVersion?: string } | null;
  shopDomain: string | null;
  lastSyncAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/connections");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch connections");
      }
      const data = await res.json();
      setConnections(data.connections);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load connections";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const connectShopify = useCallback(async (shop: string) => {
    const res = await fetch("/api/connections/shopify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shop }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to initiate connection");
    }

    const { authUrl } = await res.json();
    window.location.href = authUrl;
  }, []);

  const connectEbay = useCallback(async () => {
    const res = await fetch("/api/connections/ebay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to initiate eBay connection");
    }

    const { authUrl } = await res.json();
    window.location.href = authUrl;
  }, []);

  const disconnectConnection = useCallback(
    async (connectionId: string, provider?: string) => {
      //route to the correct provider's disconnect endpoint
      const endpoint =
        provider === "EBAY"
          ? "/api/connections/ebay"
          : "/api/connections/shopify";
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to disconnect");
      }

      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    },
    []
  );

  const syncConnection = useCallback(
    async (connectionId: string, provider?: string): Promise<DataSet> => {
      setSyncing((prev) => ({ ...prev, [connectionId]: true }));
      try {
        //route to the correct provider's sync endpoint
        const endpoint =
          provider === "EBAY"
            ? "/api/connections/ebay/sync"
            : "/api/connections/shopify/sync";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Sync failed");
        }

        const { dataSet } = await res.json();

        setConnections((prev) =>
          prev.map((c) =>
            c.id === connectionId
              ? { ...c, lastSyncAt: new Date().toISOString() }
              : c
          )
        );

        return dataSet as DataSet;
      } finally {
        setSyncing((prev) => ({ ...prev, [connectionId]: false }));
      }
    },
    []
  );

  return {
    connections,
    loading,
    error,
    syncing,
    connectShopify,
    connectEbay,
    disconnectConnection,
    syncConnection,
    refresh: fetchConnections,
  };
}
