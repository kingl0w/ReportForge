"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, FileText, Unplug, ShoppingBag, Gavel } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConnectionCardProps {
  id: string;
  provider: string;
  shopDomain: string | null;
  lastSyncAt: string | null;
  syncing: boolean;
  onSync: (id: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
}

export default function ConnectionCard({
  id,
  provider,
  shopDomain,
  lastSyncAt,
  syncing,
  onSync,
  onDisconnect,
}: ConnectionCardProps) {
  const router = useRouter();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await onDisconnect(id);
    } catch {
      //error handled by parent
    } finally {
      setDisconnecting(false);
      setConfirmDisconnect(false);
    }
  }

  const formattedLastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString()
    : "Never";

  const isEbay = provider === "EBAY";
  const ProviderIcon = isEbay ? Gavel : ShoppingBag;
  const iconColor = isEbay ? "#0064d2" : "#96bf48";
  const displayName = isEbay ? "eBay" : provider;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${iconColor}15` }}
          >
            <ProviderIcon className="h-5 w-5" style={{ color: iconColor }} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{displayName}</CardTitle>
              <Badge
                variant="secondary"
                className={syncing ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"}
              >
                {syncing ? "Syncing" : "Active"}
              </Badge>
            </div>
            <CardDescription>{shopDomain ?? "Unknown store"}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Last synced: {formattedLastSync}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
              onClick={() => onSync(id)}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
              )}
              Sync Now
            </Button>
            <Button
              size="sm"
              className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
              onClick={() =>
                router.push(`/dashboard/reports/new?connectionId=${id}`)
              }
            >
              <FileText className="mr-2 h-3.5 w-3.5" />
              Generate Report
            </Button>
            <Button
              size="sm"
              className="bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30"
              onClick={() => setConfirmDisconnect(true)}
            >
              <Unplug className="mr-2 h-3.5 w-3.5" />
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disconnect {displayName}?</DialogTitle>
            <DialogDescription>
              This will revoke access to {shopDomain}. Existing reports will not
              be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
              onClick={() => setConfirmDisconnect(false)}
              disabled={disconnecting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
