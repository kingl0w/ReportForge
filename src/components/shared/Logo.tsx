import { cn } from "@/lib/utils";

function LogoIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="52" height="52" rx="10" fill="#0F6E56" />
      <text
        x="26"
        y="31"
        textAnchor="middle"
        fontFamily="var(--font-space-grotesk), system-ui, sans-serif"
        fontSize="22"
        fontWeight="700"
        fill="#fff"
      >
        RF
      </text>
    </svg>
  );
}

interface LogoProps {
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  className?: string;
}

export default function Logo({ size = "md", iconOnly = false, className }: LogoProps) {
  const iconSizes = { sm: 24, md: 32, lg: 40 };
  const textSizes = { sm: "text-base", md: "text-lg", lg: "text-xl" };

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoIcon size={iconSizes[size]} />
      {!iconOnly && (
        <span className={cn("font-bold tracking-tight", textSizes[size])}>
          <span style={{ color: "#0F6E56" }}>Report</span>
          <span className="text-muted-foreground font-medium">Forge</span>
        </span>
      )}
    </span>
  );
}

export { LogoIcon };
