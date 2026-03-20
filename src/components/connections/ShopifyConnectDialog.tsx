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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShopifyConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (shop: string) => Promise<void>;
}

const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export default function ShopifyConnectDialog({
  open,
  onOpenChange,
  onConnect,
}: ShopifyConnectDialogProps) {
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = DOMAIN_REGEX.test(shop);

  async function handleConnect() {
    if (!isValid) return;

    setLoading(true);
    setError(null);

    try {
      await onConnect(shop);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setShop("");
      setError(null);
      setLoading(false);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Shopify Store</DialogTitle>
          <DialogDescription>
            Enter your Shopify store domain to connect. We&apos;ll redirect you to
            Shopify to authorize access to your orders, products, and customers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="shop-domain">Store Domain</Label>
            <Input
              id="shop-domain"
              placeholder="mystore.myshopify.com"
              value={shop}
              onChange={(e) => {
                setShop(e.target.value.trim().toLowerCase());
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValid) handleConnect();
              }}
              disabled={loading}
            />
            {shop && !isValid && (
              <p className="text-sm text-destructive">
                Enter a valid domain (e.g. mystore.myshopify.com)
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            className="bg-secondary border border-border text-foreground hover:bg-accent"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConnect}
            disabled={!isValid || loading}
            className="bg-[#96bf48] text-white font-medium hover:bg-[#96bf48]/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Store
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
