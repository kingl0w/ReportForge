"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EbayConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => Promise<void>;
}

export default function EbayConnectDialog({
  open,
  onOpenChange,
  onConnect,
}: EbayConnectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      await onConnect();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null);
      setLoading(false);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect eBay Account</DialogTitle>
          <DialogDescription>
            You&apos;ll be redirected to eBay to authorize access to your
            orders, listings, and financial data. We only request read-only
            access.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              Permissions requested:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>View your orders and fulfillment data</li>
              <li>View your seller analytics</li>
              <li>View your financial transactions and payouts</li>
              <li>View your inventory and listings</li>
            </ul>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            className="bg-white/10 border border-white/20 text-white hover:bg-white/20"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={loading}
            className="bg-[#0064d2] text-white font-medium hover:bg-[#0050a8]"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect eBay
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
