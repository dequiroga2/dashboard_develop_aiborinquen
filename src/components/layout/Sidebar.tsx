"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Bot,
  MessageSquare,
  ScrollText,
  Settings,
  UserCog,
  Zap,
  CircleUser,
  UserCheck,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clientes", icon: Users },
  { href: "/demos", label: "Demos", icon: Bot },
  { href: "/testers", label: "Testers", icon: UserCheck },
  { href: "/conversations", label: "Conversaciones", icon: MessageSquare },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/integration", label: "Integración", icon: Settings },
];

const adminItems = [
  { href: "/admin/users", label: "Usuarios", icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <aside className="w-60 min-h-screen bg-gray-900 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Demo Router</p>
            <p className="text-gray-400 text-xs">Internal Tool</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-gray-700">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
            pathname === "/profile" ? "bg-blue-600" : "hover:bg-gray-800"
          )}
        >
          <CircleUser className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{session?.user?.email}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
