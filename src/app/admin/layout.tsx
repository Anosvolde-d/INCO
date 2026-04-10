"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Network, Server, BookOpen, Search, Settings, Activity, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = () => {
    Cookies.remove("inco_admin_auth");
    router.push("/");
  };

  if (!isMounted) return null;

  const NavLink = ({ href, icon: Icon, children }: { href: string, icon: any, children: React.ReactNode }) => {
    const isActive = pathname === href;
    return (
      <Link 
        href={href} 
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
          isActive 
            ? "bg-white/[0.08] text-white" 
            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
        }`}
      >
        <Icon className="w-4 h-4" /> {children}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-zinc-800">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-white/[0.05] flex flex-col z-20 shadow-2xl">
        <div className="p-6 border-b border-white/[0.03] flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-white/[0.03] border border-white/[0.08] flex items-center justify-center">
             <Network className="w-3 h-3 text-zinc-300" />
          </div>
          <h1 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-200">INCO ADMIN</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5">
          <NavLink href="/admin" icon={Activity}>Dashboard</NavLink>
          <NavLink href="/admin/providers" icon={Server}>Providers & Models</NavLink>
          <NavLink href="/admin/lorebooks" icon={BookOpen}>Lorebooks</NavLink>
          <NavLink href="/admin/search" icon={Search}>Search Config</NavLink>
          <NavLink href="/admin/settings" icon={Settings}>System Settings</NavLink>
        </nav>

        <div className="p-4 border-t border-white/[0.03]">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Lock Panel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#050505] p-10 relative">
        {/* Background Grid */}
        <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.05),rgba(255,255,255,0))] pointer-events-none"></div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
