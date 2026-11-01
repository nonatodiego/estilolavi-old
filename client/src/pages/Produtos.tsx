import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Header } from "@/components/loja/Header";
import { Footer } from "@/components/loja/Footer";
import { ProductCard } from "@/components/loja/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProdutoView } from "@shared/schema";
import { Search } from "lucide-react";

export default function Produtos() {
  const {
    data: produtos,
    isLoading,
    isError,
    refetch,
  } = useQuery<ProdutoView[]>({
    queryKey: ["/api/produtos"],
  });
  const { data: config } = useQuery<{ whatsapp: string }>({
    queryKey: ["/api/config"],
  });

  const [busca, setBusca] = useState("");
  const [tamanho, setTamanho] = useState<string>("");
  const [cor, setCor] = useState<string>("");
  const [precoMax, setPrecoMax] = useState<number>(0);

  const todosTamanhos = useMemo(() => {
    const set = new Set<string>();
    (produtos || []).forEach((p) => p.tamanhos.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [produtos]);

  const todasCores = useMemo(() => {
    const set = new Set<string>();
    (produtos || []).forEach((p) => p.cores.forEach((c) => set.add(c)));
    return Array.from(set);
  }, [produtos]);

  const maxPreco = useMemo(
    () => Math.ceil(Math.max(0, ...(produtos || []).map((p) => p.preco))),
    [produtos],
  );

  const filtrados = useMemo(() => {
    return (produtos || []).filter((p) => {
      if (busca && !p.nome.toLowerCase().includes(busca.toLowerCase()))
        return false;
      if (tamanho && !p.tamanhos.includes(tamanho)) return false;
      if (cor && !p.cores.includes(cor)) return false;
      if (precoMax > 0 && p.preco > precoMax) return false;
      return true;
    });
  }, [produtos, busca, tamanho, cor, precoMax]);

  function limparFiltros() {
    setBusca("");
    setTamanho("");
    setCor("");
    setPrecoMax(0);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-6">
          <h1
            className="font-serif text-3xl font-semibold md:text-4xl"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
            data-testid="text-page-title"
          >
            Todos os produtos
          </h1>
          <p className="text-sm text-muted-foreground">
            {filtrados.length || 0} {filtrados.length === 1 ? "peça" : "peças"}{" "}
            encontradas
          </p>
        </div>

        <div className="mb-6 grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              aria-label="Buscar produto pelo nome"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
              data-testid="input-busca"
            />
          </div>
          <select
            value={tamanho}
            onChange={(e) => setTamanho(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            data-testid="select-tamanho"
            aria-label="Filtrar por tamanho"
          >
            <option value="">Tamanho</option>
            {todosTamanhos.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            data-testid="select-cor"
            aria-label="Filtrar por cor"
          >
            <option value="">Cor</option>
            {todasCores.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={precoMax}
            onChange={(e) => setPrecoMax(Number(e.target.value))}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            data-testid="select-preco"
            aria-label="Filtrar por preço máximo"
          >
            <option value={0}>Preço</option>
            {[100, 150, 200, 300, maxPreco]
              .filter((v) => v > 0)
              .map((v) => (
                <option key={v} value={v}>
                  Até R$ {v}
                </option>
              ))}
          </select>
          <Button
            variant="outline"
            onClick={limparFiltros}
            data-testid="button-limpar-filtros"
          >
            Limpar
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div role="alert" className="rounded-xl border p-6 text-center">
            <p>
              Não foi possível carregar os produtos. Confira sua conexão e tente
              novamente.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <p className="text-muted-foreground">
              Nenhum produto encontrado com esses filtros.
            </p>
            <Button variant="outline" onClick={limparFiltros} className="mt-4">
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {filtrados.map((p) => (
              <ProductCard key={p.id} produto={p} />
            ))}
          </div>
        )}
      </section>

      <Footer whatsapp={config?.whatsapp} />
    </div>
  );
}
