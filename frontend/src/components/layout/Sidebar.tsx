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
    <div
      className="flex h-full w-64 flex-col border-r"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      {/* Logo / Brand */}
      <div
        className="flex h-16 items-center border-b px-6"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
          🍕 DPZ Analytics
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.15s ease',
              background: isActive ? 'var(--color-accent)' : 'transparent',
              color: isActive ? 'white' : 'var(--color-text-secondary)',
            })}
            onMouseEnter={(e) => {
              const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }
            }}
          >
            <item.icon className="h-5 w-5" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      {/* Footer / User Info */}
      <div
        className="border-t p-4"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{
              background: 'var(--color-accent)',
              color: 'white',
            }}
          >
            U
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>User</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>user@dominos.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
