
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, Map, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  console.log('🏠 Header - User:', user?.id);
  console.log('🏠 Header - Current location:', location.pathname);

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 bg-gradient-hero rounded-lg">
              <Map className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                CartIA BFC
              </h1>
              <p className="text-xs text-muted-foreground">
                Générateur de cartes IA
              </p>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            <Link to="/">
              <Button 
                variant={location.pathname === "/" ? "default" : "ghost"}
                size="sm"
              >
                Accueil
              </Button>
            </Link>
            
            {!user ? (
              <Link to="/auth">
                <Button 
                  variant={location.pathname === "/auth" ? "default" : "ghost"}
                  size="sm"
                >
                  Connexion
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/admin">
                  <Button 
                    variant={location.pathname === "/admin" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Administration
                  </Button>
                </Link>
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
