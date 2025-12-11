import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Users,
  Menu,
  CreditCard,
  History,
  LogOut,
  ShieldCheck,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/notification-bell";
import { EditNameModal } from "@/components/edit-name-modal";
import { getCurrentUser, logout } from "@/lib/auth";
import kontribLogo from "@assets/8_1764455185903.png";

export function Navigation() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editProfileNameModalOpen, setEditProfileNameModalOpen] = useState(false);
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user) return null;

  const isActive = (path: string) => location === path;

  const navLinks = [
    { href: "/groups", icon: Users, label: "My Groups" },
    { href: "/submit-proof", icon: CreditCard, label: "Submit Proof" },
    { href: "/my-contributions", icon: History, label: "History" },
  ];

  return (
    <>
      {/* Top Header Bar - Clean White */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link href="/groups">
              <div className="flex items-center gap-2" data-testid="link-home">
                <img src={kontribLogo} alt="Kontrib" className="w-9 h-9" />
                <span className="font-bold text-lg text-gray-900">Kontrib</span>
              </div>
            </Link>

            {/* Secure Badge */}
            <div className="flex items-center gap-2 text-primary border border-primary/20 rounded-full px-3 py-1.5">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Secure</span>
            </div>

            {/* Right side - Desktop */}
            <div className="hidden sm:flex items-center gap-3">
              <NotificationBell userId={user.id} />
              
              <button
                onClick={() => setEditProfileNameModalOpen(true)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 transition-colors"
                data-testid="button-edit-profile-name-desktop"
              >
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-sm font-medium text-white">
                  {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                  {user.fullName?.split(" ")[0] || "User"}
                </span>
                <Pencil className="h-3 w-3 text-gray-400" />
              </button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                data-testid="button-logout-desktop"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Mobile - Menu */}
            <div className="flex sm:hidden items-center gap-2">
              <NotificationBell userId={user.id} />
              
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:bg-gray-100 p-2"
                    data-testid="button-mobile-menu"
                  >
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0">
                  <div className="flex flex-col h-full">
                    {/* User Info Header */}
                    <div className="bg-primary text-white p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">
                          {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-lg">{user.fullName}</p>
                            <button
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setEditProfileNameModalOpen(true);
                              }}
                              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                              data-testid="button-edit-profile-name-mobile"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="text-white/70 text-sm capitalize">{user.role}</p>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex-1 py-4">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div
                            className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                              isActive(link.href)
                                ? "bg-primary/5 text-primary border-r-4 border-primary"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                            data-testid={`link-mobile-${link.label.toLowerCase().replace(" ", "-")}`}
                          >
                            <link.icon className="h-5 w-5" />
                            <span className="font-medium">{link.label}</span>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Logout Button */}
                    <div className="p-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        data-testid="button-logout-mobile"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        Log Out
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
        <div className="grid grid-cols-4 h-16">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <div
                className={`flex flex-col items-center justify-center h-full gap-1 transition-colors ${
                  isActive(link.href)
                    ? "text-primary"
                    : "text-gray-500"
                }`}
                data-testid={`nav-${link.label.toLowerCase().replace(" ", "-")}`}
              >
                <link.icon className={`h-5 w-5 ${isActive(link.href) ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop Sidebar/Secondary Nav */}
      <div className="hidden sm:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 h-12 overflow-x-auto">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 px-4 rounded-full transition-all ${
                    isActive(link.href)
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  data-testid={`nav-desktop-${link.label.toLowerCase().replace(" ", "-")}`}
                >
                  <link.icon className="h-4 w-4 mr-2" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {user && (
        <EditNameModal
          open={editProfileNameModalOpen}
          onOpenChange={setEditProfileNameModalOpen}
          type="profile"
          currentName={user.fullName || ""}
        />
      )}
    </>
  );
}
