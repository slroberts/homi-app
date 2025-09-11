export function Footer() {
  const year = new Date().getUTCFullYear();
  return (
    <footer
      className="border-border/50 bg-background/50 w-full border-t backdrop-blur-md"
      aria-label="Site footer"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <p className="text-foreground/50 text-sm">&copy; {year} Homi</p>
      </div>
    </footer>
  );
}
