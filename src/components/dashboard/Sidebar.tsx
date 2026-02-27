"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  LayoutTemplate,
  Plug,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  Crown,
  LogOut,
  ExternalLink,
  ArrowUpCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { useSubscription } from "@/hooks/useSubscription";

const BASE_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/reports/new", label: "New Report", icon: FilePlus },
  { href: "/dashboard/reports", label: "My Reports", icon: FileText },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/connections", label: "Connections", icon: Plug },
];

const UPGRADE_ITEM = { href: "/dashboard/upgrade", label: "Upgrade", icon: ArrowUpCircle };
const SETTINGS_ITEM = { href: "/dashboard/settings", label: "Settings", icon: Settings };
function getNavItems(plan: string) {
  const items = [...BASE_NAV_ITEMS];
  if (plan !== "PRO") {
    items.push(UPGRADE_ITEM);
  }
  items.push(SETTINGS_ITEM);
  return items;
}

function getInitials(name: string | null | undefined, email: string | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

function getPlanLabel(plan: string): string {
  if (plan === "PRO") return "Pro";
  if (plan === "PAY_PER_REPORT") return "Pay per Report";
  return "Free";
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const { user, loading: userLoading, signOut } = useUser();
  const { plan, isLoading: subLoading } = useSubscription();

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "";
  const avatarUrl = user?.user_metadata?.avatar_url ?? "";
  const initials = getInitials(displayName, user?.email);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">
                ReportForge
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="mx-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <FileText className="h-4 w-4 text-white" />
              </div>
            </Link>
          )}
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "hidden rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white lg:block",
              collapsed && "mx-auto mt-2"
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {getNavItems(plan).map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600/15 text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        <div className="px-2 pb-2">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/"
                  className="flex items-center justify-center rounded-lg px-2 py-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Back to site</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Back to site
            </Link>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed && "justify-center"
            )}
          >
            {userLoading ? (
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            ) : (
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={avatarUrl} alt={displayName || "User"} />
                <AvatarFallback className="bg-blue-600/20 text-sm text-blue-500">
                  {initials}
                </AvatarFallback>
              </Avatar>
            )}
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                {userLoading ? (
                  <>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-1 h-4 w-12" />
                  </>
                ) : (
                  <>
                    <p className="truncate text-sm font-medium text-white">
                      {displayName}
                    </p>
                    {subLoading ? (
                      <Skeleton className="mt-0.5 h-4 w-12" />
                    ) : (
                      <Badge
                        variant="secondary"
                        className="mt-0.5 gap-1 border-white/10 bg-white/10 text-[10px] text-white/70"
                      >
                        <Crown className="h-2.5 w-2.5" />
                        {getPlanLabel(plan)}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            )}
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign out</TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={signOut}
                className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

/**Sidebar content for mobile sheet -- always expanded*/
export function MobileSidebar({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { user, loading: userLoading, signOut } = useUser();
  const { plan, isLoading: subLoading } = useSubscription();

  const displayName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "";
  const mobileAvatarUrl = user?.user_metadata?.avatar_url ?? "";
  const mobileInitials = getInitials(displayName, user?.email);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-border px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={onNavigate}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground">ReportForge</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {getNavItems(plan).map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600/15 text-white"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-2">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Back to site
        </Link>
      </div>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          {userLoading ? (
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          ) : (
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={mobileAvatarUrl} alt={displayName || "User"} />
              <AvatarFallback className="bg-blue-600/20 text-sm text-blue-500">
                {mobileInitials}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1 overflow-hidden">
            {userLoading ? (
              <>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1 h-4 w-12" />
              </>
            ) : (
              <>
                <p className="truncate text-sm font-medium text-white">
                  {displayName}
                </p>
                {subLoading ? (
                  <Skeleton className="mt-0.5 h-4 w-12" />
                ) : (
                  <Badge variant="secondary" className="mt-0.5 gap-1 border-white/10 bg-white/10 text-[10px] text-white/70">
                    <Crown className="h-2.5 w-2.5" />
                    {getPlanLabel(plan)}
                  </Badge>
                )}
              </>
            )}
          </div>
          <button
            onClick={() => { signOut(); onNavigate(); }}
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
