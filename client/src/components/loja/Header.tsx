import { Link, useLocation } from "wouter";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Menu, ReceiptText } from "lucide-react";
import { useCart } from "@/store/cart";
import { useState } from "react";
import { useSavedOrder } from "@/lib/purchase-state";

export function Header() {
  const { count } = useCart();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [savedOrder] = useSavedOrder();

  const links = [
    { href: "/", label: "Início" },
    { href: "/produtos", label: "Produtos" },
    { href: "/contato", label: "Contato" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link
          href="/"
          data-testid="link-home-logo"
          className="flex items-center"
          aria-label="Estilo Lavi, início"
        >
          <Logo className="[&>div]:hidden min-[360px]:[&>div]:block" />
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-6 md:flex"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-foreground/80 hover:text-foreground transition-colors"
              data-testid={`link-nav-${l.href.replace("/", "") || "home"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {savedOrder && (
            <Button asChild variant="ghost" size="sm">
              <Link
                href="/checkout?pedido=1"
                aria-label={`Meu pedido ${savedOrder.pedidoId}`}
                data-testid="link-meu-pedido"
              >
                <ReceiptText />
                <span className="hidden lg:inline">Meu pedido</span>
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((o) => !o)}
            data-testid="button-menu-toggle"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/carrinho")}
            className="relative gap-2"
            data-testid="button-carrinho"
            aria-label={`Carrinho, ${count} ${count === 1 ? "peça" : "peças"}`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Carrinho</span>
            {count > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
                data-testid="badge-cart-count"
              >
                {count}
              </span>
            )}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav
            id="mobile-nav"
            aria-label="Navegação no celular"
            className="mx-auto flex max-w-6xl flex-col px-4 py-2"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3 text-sm border-b last:border-b-0 border-border/60"
                data-testid={`link-mobile-${l.href.replace("/", "") || "home"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
