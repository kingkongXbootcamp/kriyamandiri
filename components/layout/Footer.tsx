export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-slate-50 py-6">
      <div className="mx-auto max-w-5xl px-4 text-center text-xs text-slate-500 sm:px-6">
        <p className="font-medium text-slate-700">
          KRIYAMANDIRI &copy; {new Date().getFullYear()}
        </p>
        <p className="mt-1">
          Platform katalog instan dan pesanan WhatsApp untuk UMKM Indonesia.
        </p>
      </div>
    </footer>
  );
}