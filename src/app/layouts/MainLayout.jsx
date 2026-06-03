import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Calendar, Users, Settings, Radio, Printer, Eye } from "lucide-react";

function NavItem({ to, children, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded transition-colors ${isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`
      }
    >
      {Icon && <Icon size={18} />}
      {children}
    </NavLink>
  );
}

export default function MainLayout() {
  const [footerActions, setFooterActions] = useState(null);
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="fixed inset-x-0 top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">OÖHV Mini-Spieltag</h1>
          <nav className="flex gap-2">
            <NavItem to="/teams" icon={Users}>Teams</NavItem>   
	          <NavItem to="/" icon={Calendar}>Spielplan</NavItem>   
            <NavItem to="/live" icon={Radio}>Live</NavItem>
            <NavItem to="/druck" icon={Printer}>Drucken</NavItem>
            <NavItem to="/viewer" icon={Eye}>Viewer</NavItem>
            <NavItem to="/einstellungen" icon={Settings}>Einstellungen</NavItem>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-[90%] max-w-full mx-auto px-4 py-6 pt-24 pb-28">
        <Outlet context={{ setFooterActions }} />
      </main>

      {footerActions && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-white border-t border-slate-200 shadow-lg print:hidden">
          <div className="max-w-7xl mx-auto px-4 py-3">{footerActions}</div>
        </div>
      )}

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-3 text-sm text-slate-500">© {new Date().getFullYear()} Turnier Manager</div>
      </footer>
    </div>
  );
}
