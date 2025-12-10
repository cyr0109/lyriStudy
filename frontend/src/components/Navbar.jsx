import { Link, useLocation, useNavigate } from "react-router-dom";
import { Music, History, BookOpen, LogOut, User } from "lucide-react"; // Import BookOpen for Vocabulary icon
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    // Also remove the default header to prevent accidental authenticated requests
    // (though reloading the page usually handles this, it's safer)
    // We can't easily access the axios instance here without importing it, 
    // but navigating to login is usually enough as App.jsx will re-check on reload/navigation.
    navigate('/login');
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto flex h-14 items-center px-4">
        <div className="flex w-full items-center">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <Music className="h-6 w-6" />
            <span className="font-bold hidden sm:inline-block">LyriStudy</span>
          </Link>
          <div className="flex gap-4">
            <Link
              to="/"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === "/" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Analyze
            </Link>
            <Link
              to="/history"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === "/history" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              History
            </Link>
            <Link
              to="/vocabulary"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                location.pathname === "/vocabulary" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Vocabulary
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {username && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground hidden sm:flex">
                <User className="h-4 w-4" />
                <span className="font-medium">{username}</span>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}