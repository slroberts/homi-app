'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogIn, LogOut, User2, Menu } from 'lucide-react';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/saved-listings', label: 'Saved Listings' },
];

/* ----------------------------- Small Components ---------------------------- */

function Brand() {
  return (
    <Link href="/" aria-label="Homi home">
      <span className="text-xl font-medium">Homi</span>
    </Link>
  );
}

function NavLinks({
  items,
  onNavigate,
  className = '',
}: {
  items: NavItem[];
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <nav aria-label="Primary" className={className}>
      <ul className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} onClick={onNavigate} className="text-sm font-medium">
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AvatarBadge() {
  return (
    <span
      aria-hidden="true"
      className="mx-2 hidden h-6 w-6 items-center justify-center rounded-full bg-amber-400/40 p-2 sm:flex"
    >
      <User2 className="h-4 w-4" />
    </span>
  );
}

function LogoutButton({
  onLogout,
  signingOut,
  title,
  className = '',
  size = 'default',
}: {
  onLogout: () => void | Promise<void>;
  signingOut: boolean;
  title?: string | null;
  className?: string;
  size?: 'default' | 'icon';
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onLogout}
      disabled={signingOut}
      className={`flex items-center gap-1 text-sm font-medium ${className}`}
      aria-label="Log out"
      title={title ?? 'Log out'}
      size={size}
    >
      {size === 'default' && <AvatarBadge />}
      {signingOut ? 'Signing out...' : 'Log out'}
      <LogOut className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}

function LoginLink({ hiddenOnLogin }: { hiddenOnLogin: boolean }) {
  if (hiddenOnLogin) return null;
  return (
    <Link href="/login" className="flex items-center gap-1 text-sm font-medium">
      <span>Log in</span>
      <LogIn className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function DesktopHeaderRow({
  user,
  signingOut,
  onLogout,
  onLoginPage,
}: {
  user: User | null;
  signingOut: boolean;
  onLogout: () => void | Promise<void>;
  onLoginPage: boolean;
}) {
  return (
    <>
      {user ? (
        <div className="hidden items-center gap-2 sm:flex">
          <NavLinks items={NAV_ITEMS} className="hidden sm:block" />
          <LogoutButton onLogout={onLogout} signingOut={signingOut} title={user.email} />
        </div>
      ) : (
        <nav aria-label="Primary" className="hidden sm:block">
          <LoginLink hiddenOnLogin={onLoginPage} />
        </nav>
      )}
    </>
  );
}

function MobileSheet({
  open,
  setOpen,
  user,
  signingOut,
  onLogout,
  onLoginPage,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  user: User | null;
  signingOut: boolean;
  onLogout: () => void | Promise<void>;
  onLoginPage: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-primary-nav"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="p-4 sm:hidden" id="mobile-primary-nav">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation menu</SheetTitle>
          <SheetDescription>Links to primary sections of the app</SheetDescription>
        </SheetHeader>

        {user ? (
          <div className="mt-2 flex flex-col gap-4">
            <NavLinks items={NAV_ITEMS} onNavigate={() => setOpen(false)} />

            <LogoutButton
              onLogout={onLogout}
              signingOut={signingOut}
              title={user.email}
              className="border-border/50 bg-background/50 text-primary hover:bg-primary hover:text-background mt-4 border backdrop-blur-md hover:border-0"
            />
          </div>
        ) : onLoginPage ? (
          <div className="mt-2">
            <Link href="/" onClick={() => setOpen(false)} className="text-base font-medium">
              Home
            </Link>
          </div>
        ) : (
          <div className="mt-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-base font-medium"
            >
              <span>Log in</span>
              <LogIn className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ---------------------------------- Header --------------------------------- */

export function Header() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLoginPage = pathname === '/login';

  // Fetch user + subscribe to auth changes
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (isMounted) setUser(data?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (isMounted) setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const logout = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      setMobileOpen(false);
      router.replace('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="border-border/50 bg-background/50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Brand />

        <DesktopHeaderRow
          user={user}
          signingOut={signingOut}
          onLogout={logout}
          onLoginPage={onLoginPage}
        />

        {/* Mobile menu is always present (icon hidden on sm+) */}
        <MobileSheet
          open={mobileOpen}
          setOpen={setMobileOpen}
          user={user}
          signingOut={signingOut}
          onLogout={logout}
          onLoginPage={onLoginPage}
        />
      </div>
    </header>
  );
}
