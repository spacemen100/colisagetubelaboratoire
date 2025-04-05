import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  BarChart3,
  Box,
  BoxesIcon,
  ClipboardList,
  Download,
  FileInput,
  LogIn,
  LogOut,
  Package,
  PackageOpen,
  Scan,
  Settings,
  Truck,
  User,
} from "lucide-react";

type SidebarItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
};

function SidebarItem({ href, icon, label, active }: SidebarItemProps) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center py-3 px-4 text-gray-600 hover:bg-gray-100 rounded-md transition-colors",
          active && "bg-primary/10 text-primary font-medium"
        )}
      >
        <span className="mr-3">{icon}</span>
        <span>{label}</span>
      </a>
    </Link>
  );
}

export default function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    { href: "/", icon: <BarChart3 size={20} />, label: "Tableau de bord" },
    { href: "/alerts", icon: <AlertCircle size={20} />, label: "Alertes" },
    { href: "/import-reader", icon: <FileInput size={20} />, label: "Import Lecteur" },
    { href: "/scan-action", icon: <Scan size={20} />, label: "Scanner Action" },
    { href: "/load-box", icon: <Package size={20} />, label: "Charger Boîte" },
    { href: "/merge-boxes", icon: <BoxesIcon size={20} />, label: "Fusion Boîtes" },
    { href: "/pickup", icon: <LogOut size={20} />, label: "Enlèvement" },
    { href: "/delivery", icon: <LogIn size={20} />, label: "Livraison" },
    { href: "/unload-box", icon: <PackageOpen size={20} />, label: "Décharger Boîte" },
    { href: "/profile", icon: <User size={20} />, label: "Mon Profil" },
  ];

  return (
    <div className="w-64 bg-white h-full shadow-sm border-r pb-10">
      <div className="p-4 mb-2">
        <h2 className="text-xl font-semibold">Navigation</h2>
      </div>
      <nav className="space-y-1 px-2">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={location === item.href}
          />
        ))}
      </nav>
    </div>
  );
}