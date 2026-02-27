"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plug, Plus, ShoppingBag, Gavel } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import ConnectionCard from "@/components/connections/ConnectionCard";
import ShopifyConnectDialog from "@/components/connections/ShopifyConnectDialog";
import { useConnections } from "@/hooks/useConnections";

export default function ConnectionsPage() {
  const searchParams = useSearchParams();
  const [shopifyDialogOpen, setShopifyDialogOpen] = useState(false);
  const {
    connections,
    loading,
    syncing,
    connectShopify,
    disconnectConnection,
    syncConnection,
  } = useConnections();

  //show success toast when redirected back from OAuth
  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected === "shopify") {
      toast.success("Shopify store connected successfully");
      window.history.replaceState(null, "", "/dashboard/connections");
    } else if (connected === "ebay") {
      toast.success("eBay account connected successfully");
      window.history.replaceState(null, "", "/dashboard/connections");
    }
    const error = searchParams.get("error");
    if (error) {
      const messages: Record<string, string> = {
        hmac_verification_failed: "Shopify verification failed. Please try again.",
        state_mismatch: "Security check failed. Please try again.",
        missing_state: "Session expired. Please try again.",
        invalid_state: "Invalid session. Please try again.",
        callback_failed: "Connection failed. Please try again.",
        db_error: "Failed to save connection. Please try again.",
        invalid_callback: "Invalid callback parameters.",
      };
      toast.error(messages[error] ?? "Connection failed. Please try again.");
      window.history.replaceState(null, "", "/dashboard/connections");
    }
  }, [searchParams]);

  async function handleSync(connectionId: string, provider?: string) {
    try {
      await syncConnection(connectionId, provider);
      toast.success("Data synced successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      toast.error(message);
    }
  }

  async function handleDisconnect(connectionId: string, provider?: string) {
    try {
      await disconnectConnection(connectionId, provider);
      toast.success("Connection removed");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to disconnect";
      toast.error(message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Connections</h1>
          <p className="text-sm text-muted-foreground">
            Connect your data sources to generate reports automatically.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-blue-600 text-white font-medium hover:bg-blue-500">
              <Plus className="mr-2 h-4 w-4" />
              Connect
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShopifyDialogOpen(true)}>
              <ShoppingBag className="mr-2 h-4 w-4 text-[#96bf48]" />
              Shopify
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Gavel className="mr-2 h-4 w-4 text-muted-foreground" />
              eBay
              <span className="ml-auto text-xs text-muted-foreground">Soon</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <svg className="mr-2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google Analytics
              <span className="ml-auto text-xs text-muted-foreground">Soon</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border p-6">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Plug className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">
            No connections yet
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your first data source to start generating automated reports.
          </p>
          <Button
            className="mt-6 bg-blue-600 text-white font-medium hover:bg-blue-500"
            onClick={() => setShopifyDialogOpen(true)}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Connect Shopify
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              id={conn.id}
              provider={conn.provider}
              shopDomain={conn.shopDomain}
              lastSyncAt={conn.lastSyncAt}
              syncing={syncing[conn.id] ?? false}
              onSync={(id) => handleSync(id, conn.provider)}
              onDisconnect={(id) => handleDisconnect(id, conn.provider)}
            />
          ))}
        </div>
      )}

      <ShopifyConnectDialog
        open={shopifyDialogOpen}
        onOpenChange={setShopifyDialogOpen}
        onConnect={connectShopify}
      />

    </div>
  );
}
