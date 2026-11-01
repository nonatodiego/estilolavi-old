import { Header } from "@/components/loja/Header";
import { Footer } from "@/components/loja/Footer";
import { Button } from "@/components/ui/button";
import { useCart, formatBRL } from "@/store/cart";
import { useLocation, Link } from "wouter";
import { Trash2, ShoppingBag, Minus, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Carrinho() {
  const { items, updateQty, remove, total } = useCart();
  const [, setLocation] = useLocation();
  const { data: config } = useQuery<{ whatsapp: string }>({
    queryKey: ["/api/config"],
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 md:px-6">
        <h1
          className="font-serif text-3xl font-semibold md:text-4xl"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
          data-testid="text-page-title"
        >
          Seu carrinho
        </h1>

        {items.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-border p-12 text-center">
            <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Seu carrinho está vazio</p>
            <Button asChild className="mt-4" data-testid="button-explorar">
              <Link href="/produtos">Explorar produtos</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {items.map((item) => {
                const key = `${item.produtoId}-${item.tamanho}-${item.cor}`;
                return (
                  <div
                    key={key}
                    className="flex gap-3 rounded-lg border border-border bg-card p-3"
                    data-testid={`row-cart-item-${item.produtoId}`}
                  >
                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                      {item.imagemUrl && (
                        <img
                          src={item.imagemUrl}
                          alt={item.nome}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 break-words">
                          <div
                            className="font-medium"
                            data-testid={`text-cart-name-${item.produtoId}`}
                          >
                            {item.nome}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.tamanho && `Tam ${item.tamanho}`}
                            {item.tamanho && item.cor && " · "}
                            {item.cor}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            remove(item.produtoId, item.tamanho, item.cor)
                          }
                          className="flex h-11 w-11 shrink-0 items-center justify-center text-muted-foreground hover:text-destructive"
                          data-testid={`button-remove-${item.produtoId}`}
                          aria-label={`Remover ${item.nome}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                        <div className="flex items-center rounded-md border border-border">
                          <button
                            onClick={() =>
                              updateQty(
                                item.produtoId,
                                Math.max(1, item.qtd - 1),
                                item.tamanho,
                                item.cor,
                              )
                            }
                            className="flex h-11 w-11 items-center justify-center hover-elevate"
                            aria-label={`Diminuir quantidade de ${item.nome}`}
                            disabled={item.qtd <= 1}
                            data-testid={`button-qtd-menos-${item.produtoId}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center text-sm">
                            {item.qtd}
                          </span>
                          <button
                            onClick={() =>
                              updateQty(
                                item.produtoId,
                                item.qtd + 1,
                                item.tamanho,
                                item.cor,
                              )
                            }
                            className="flex h-11 w-11 items-center justify-center hover-elevate"
                            aria-label={`Aumentar quantidade de ${item.nome}`}
                            disabled={item.qtd >= 99}
                            data-testid={`button-qtd-mais-${item.produtoId}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div
                          className="font-semibold"
                          data-testid={`text-cart-subtotal-${item.produtoId}`}
                        >
                          {formatBRL(item.preco * item.qtd)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="h-fit rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider">
                Resumo
              </h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span data-testid="text-subtotal">{formatBRL(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrega</span>
                  <span className="text-right text-muted-foreground">
                    Escolha no próximo passo
                  </span>
                </div>
                <div className="my-3 border-t border-border" />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total das peças</span>
                  <span data-testid="text-total">{formatBRL(total)}</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Estação de metrô ou trem: R$ 5. Uber: frete grátis, com entrega
                a combinar pelo WhatsApp.
              </p>
              <Button
                onClick={() => setLocation("/checkout")}
                className="mt-4 w-full"
                size="lg"
                data-testid="button-finalizar"
              >
                Finalizar pedido
              </Button>
            </aside>
          </div>
        )}
      </main>

      <Footer whatsapp={config?.whatsapp} />
    </div>
  );
}
