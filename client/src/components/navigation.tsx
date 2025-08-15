import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Users, Bell, Menu, X, MessageCircle, TrendingUp, CreditCard, History, Megaphone, LogOut, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/notification-bell";
import { getCurrentUser, isAdmin, logout } from "@/lib/auth";

export function Navigation() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/dashboard">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-nigerian-green rounded-lg flex items-center justify-center">
                <Users className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-nigerian-green">Kontrib</h1>
                <p className="text-xs text-gray-600">Group Financial Management</p>
              </div>
            </div>
          </Link>

          <div className="flex items-center space-x-4">
            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center space-x-4">
              <div className="bg-gray-100 p-1 rounded-lg">
                <Link href="/dashboard">
                  <Button 
                    variant={location === "/dashboard" ? "default" : "ghost"}
                    size="sm"
                    className={location === "/dashboard" ? "bg-nigerian-green text-white" : ""}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Dashboard
                  </Button>
                </Link>
                
                {isAdmin() ? (
                  <>
                    <Link href="/groups">
                      <Button 
                        variant={location === "/groups" ? "default" : "ghost"}
                        size="sm"
                        className={location === "/groups" ? "bg-nigerian-green text-white" : ""}
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Groups
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: Implement send reminders */}}
                    >
                      <Bell className="h-4 w-4 mr-1" />
                      Send Reminders
                    </Button>
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => {/* TODO: Implement generate report */}}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Generate Report
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/make-payment">
                      <Button 
                        variant={location === "/make-payment" ? "default" : "ghost"}
                        size="sm"
                        className={location === "/make-payment" ? "bg-nigerian-green text-white" : ""}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Make Payment
                      </Button>
                    </Link>
                    <Link href="/my-contributions">
                      <Button 
                        variant={location === "/my-contributions" ? "default" : "ghost"}
                        size="sm"
                        className={location === "/my-contributions" ? "bg-nigerian-green text-white" : ""}
                      >
                        <History className="h-4 w-4 mr-1" />
                        My Contributions
                      </Button>
                    </Link>
                    <Link href="/updates">
                      <Button 
                        variant={location === "/updates" ? "default" : "ghost"}
                        size="sm"
                        className={location === "/updates" ? "bg-nigerian-green text-white" : ""}
                      >
                        <Megaphone className="h-4 w-4 mr-1" />
                        Updates
                      </Button>
                    </Link>
                  </>
                )}
              </div>
              
              {isAdmin() && (
                <NotificationBell userId={user.id} />
              )}

              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{user.fullName}</span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="sm:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="flex flex-col space-y-4 mt-4">
                  <div className="pb-2 border-b">
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-sm text-gray-600">{user.role}</p>
                  </div>
                  
                  {user && (
                    <>
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Dashboard
                        </Button>
                      </Link>
                      
                      {isAdmin() ? (
                        <>
                          <Link href="/groups" onClick={() => setMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">
                              <Users className="h-4 w-4 mr-2" />
                              Groups
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              /* TODO: Implement send reminders */
                            }}
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            Send Reminders
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              /* TODO: Implement generate report */
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Report
                          </Button>
                        </>
                      ) : (
                        <>
                          <Link href="/make-payment" onClick={() => setMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">
                              <CreditCard className="h-4 w-4 mr-2" />
                              Make Payment
                            </Button>
                          </Link>
                          <Link href="/my-contributions" onClick={() => setMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">
                              <History className="h-4 w-4 mr-2" />
                              My Contributions
                            </Button>
                          </Link>
                          <Link href="/updates" onClick={() => setMobileMenuOpen(false)}>
                            <Button variant="ghost" className="w-full justify-start">
                              <Megaphone className="h-4 w-4 mr-2" />
                              Updates
                            </Button>
                          </Link>
                        </>
                      )}
                    </>
                  )}
                  
                  <Button variant="outline" onClick={handleLogout} className="w-full">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
