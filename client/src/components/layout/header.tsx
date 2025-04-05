import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLabContext } from "@/hooks/use-lab-context";
import { FlaskConical, ChevronDown, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { user, logoutMutation } = useAuth();
  const { labs, currentLab, setCurrentLab } = useLabContext();
  
  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <FlaskConical className="text-primary text-2xl mr-2" />
          <h1 className="text-xl font-semibold text-gray-800">LabTrack</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Lab Selector */}
          {currentLab && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center bg-gray-100 px-3 py-2 rounded text-sm font-medium text-gray-700">
                <span>{currentLab.name}</span>
                <ChevronDown className="ml-2 h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {labs.map((lab) => (
                  <DropdownMenuItem 
                    key={lab.id} 
                    onClick={() => setCurrentLab(lab)}
                    className={currentLab.id === lab.id ? "bg-primary/10" : ""}
                  >
                    {lab.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center space-x-2">
                <div className="bg-primary rounded-full w-8 h-8 flex items-center justify-center text-white">
                  <span>{getUserInitials(user.name)}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden md:inline-block">
                  {user.name}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="border-b pb-2">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Mon profil</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
