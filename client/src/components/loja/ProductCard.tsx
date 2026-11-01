import { Link } from "wouter";
import { formatBRL } from "@/store/cart";
import type { ProdutoView } from "@shared/schema";
import { Card } from "@/components/ui/card";

export function ProductCard({ produto }: { produto: ProdutoView }) {
  return (
    <Link
      href={`/produto/${produto.id}`}
      className="group block"
      data-testid={`card-product-${produto.id}`}
    >
      <Card className="overflow-hidden border-card-border bg-card hover-elevate transition-shadow">
        <div className="aspect-[3/4] overflow-hidden bg-muted">
          {produto.imagemUrl ? (
            <img
              src={produto.imagemUrl}
              alt={produto.nome}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sem imagem
            </div>
          )}
        </div>
        <div className="p-3 md:p-4">
          <h3
            className="text-sm font-medium leading-tight line-clamp-2"
            data-testid={`text-product-name-${produto.id}`}
          >
            {produto.nome}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="text-base font-semibold text-foreground"
              data-testid={`text-product-price-${produto.id}`}
            >
              {formatBRL(produto.preco)}
            </span>
            {produto.tamanhos.length > 0 && (
              <span className="text-xs text-muted-foreground">
                · {produto.tamanhos.length} tamanhos
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
