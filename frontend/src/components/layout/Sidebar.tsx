import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  Search,
  BarChart3,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Chat",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Explore",
    href: "/explore",
    icon: Search,
  },
  {
    title: "Insights",
    href: "/insights",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-white">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-gray-900">
          DPZ Analytics
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      {/* Footer / User Info */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-200" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-gray-900">User</p>
            <p className="text-xs text-gray-500">user@dominos.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
