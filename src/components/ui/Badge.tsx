"use client";
import { cn } from "@/lib/utils";

type Variant = "green" | "red" | "yellow" | "blue" | "gray" | "purple";

const variants: Record<Variant, string> = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  yellow: "bg-yellow-100 text-yellow-800",
  blue: "bg-blue-100 text-blue-800",
  gray: "bg-gray-100 text-gray-700",
  purple: "bg-purple-100 text-purple-800",
};

export function Badge({
  children,
  variant = "gray",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: Variant }> = {
    active: { label: "Activa", variant: "green" },
    inactive: { label: "Inactiva", variant: "gray" },
    open: { label: "Abierta", variant: "blue" },
    closed: { label: "Cerrada", variant: "gray" },
    blocked: { label: "Bloqueada", variant: "red" },
    success: { label: "OK", variant: "green" },
    error: { label: "Error", variant: "red" },
    unauthorized: { label: "No autorizado", variant: "yellow" },
    inactive_demo: { label: "Demo inactiva", variant: "gray" },
    ADMIN: { label: "Admin", variant: "purple" },
    DEVELOPER: { label: "Developer", variant: "blue" },
    client: { label: "Cliente", variant: "blue" },
    tester: { label: "Tester", variant: "green" },
    internal: { label: "Interno", variant: "purple" },
    whatsapp: { label: "WhatsApp", variant: "green" },
    sms: { label: "SMS", variant: "blue" },
    both: { label: "WhatsApp + SMS", variant: "purple" },
  };

  const config = map[status] || { label: status, variant: "gray" as Variant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
