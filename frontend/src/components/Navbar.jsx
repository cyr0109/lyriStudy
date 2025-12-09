import { Link, useLocation } from "react-router-dom";
import { Music, History, BookOpen } from "lucide-react"; // Import BookOpen for Vocabulary icon
import { cn } from "../lib/utils";

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto flex h-14 items-center px-4">
        <div className="mr-4 flex">
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
        </div>
      </div>
    </nav>
  );
}
