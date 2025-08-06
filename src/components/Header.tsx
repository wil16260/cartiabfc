import { MapPin, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2 bg-gradient-hero rounded-lg shadow-ocean group-hover:shadow-glow transition-all duration-300">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              GeoAI
            </h1>
            <p className="text-xs text-muted-foreground">Map Generator</p>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          {location.pathname !== "/admin" && (
            <Link to="/admin">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
          {location.pathname === "/admin" && (
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <MapPin className="h-4 w-4" />
                Generator
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;