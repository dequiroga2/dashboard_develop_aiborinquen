"use client";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { LogOut } from "lucide-react";

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-3">
        {action}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-gray-500"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </Button>
      </div>
    </div>
  );
}
