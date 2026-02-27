"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PlanId } from "@/lib/stripe/plans";

interface SubscriptionState {
  plan: PlanId;
  reportsUsed: number;
  reportsLimit: number;
  reportsRemaining: number;
  canGenerateReport: boolean;
  hasStripeCustomer: boolean;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const INITIAL_STATE: SubscriptionState = {
  plan: "FREE",
  reportsUsed: 0,
  reportsLimit: 1,
  reportsRemaining: 1,
  canGenerateReport: true,
  hasStripeCustomer: false,
  subscription: null,
  isLoading: true,
  error: null,
};

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>(INITIAL_STATE);

  const fetchSubscription = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const res = await fetch("/api/subscription");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to fetch subscription");
      }

      const data = await res.json();
      setState({
        plan: data.plan,
        reportsUsed: data.reportsUsed,
        reportsLimit: data.reportsLimit,
        reportsRemaining: data.reportsRemaining,
        canGenerateReport: data.canGenerateReport,
        hasStripeCustomer: data.hasStripeCustomer,
        subscription: data.subscription,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load subscription";
      toast.error(message);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const upgrade = useCallback(async (planId: "PRO" | "PER_REPORT") => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create checkout");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Checkout failed";
      toast.error(message);
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  const openPortal = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to open billing portal");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Portal failed";
      toast.error(message);
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  return {
    ...state,
    isPro: state.plan === "PRO",
    isFree: state.plan === "FREE",
    refresh: fetchSubscription,
    upgrade,
    openPortal,
  };
}
