import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/loja/Header";
import { Footer } from "@/components/loja/Footer";
import { ProductCard } from "@/components/loja/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { ProdutoView } from "@shared/schema";
import { ArrowRight, Sparkles, Truck, ShieldCheck } from "lucide-react";

export default function Home() {
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

  const destaques = (produtos || []).filter((p) => p.destaque).slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-secondary via-background to-background">
        <div className="absolute inset-0 bg-rose-soft opacity-40" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:gap-12 md:py-24 md:px-6">
          <div>
            <h1
              className="font-serif text-4xl font-semibold leading-[1.1] md:text-5xl lg:text-6xl"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
              data-testid="text-hero-title"
            >
              Sua essência em <em className="text-gold">cada peça</em>.
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground md:text-lg">
              Moda feminina cuidadosamente selecionada para mulheres que
              valorizam originalidade, conforto e atitude.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="gap-2"
                data-testid="button-hero-comprar"
              >
                <Link href="/produtos">
                  Ver coleção
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {config?.whatsapp && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  data-testid="button-hero-whatsapp"
                >
                  <a
                    href={`https://wa.me/${config.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fale conosco
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-muted shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900&q=85"
                alt="Coleção Estilo Lavi"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 hidden rounded-xl border border-border bg-card p-4 shadow-xl md:block">
              <div
                className="mt-1 font-serif text-lg font-semibold"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
              >
                Pagamento via Pix
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Truck,
              title: "Entrega do seu jeito",
              desc: "Estação por R$ 5 ou Uber a combinar",
            },
            {
              icon: ShieldCheck,
              title: "Compra protegida",
              desc: "Pagamento via Pix com confirmação",
            },
            {
              icon: Sparkles,
              title: "Peças exclusivas",
              desc: "Curadoria autoral semanal",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="rounded-lg bg-secondary p-2">
                <f.icon className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold">{f.title}</div>
                <div className="text-xs text-muted-foreground">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Destaques */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2
              className="font-serif text-3xl font-semibold md:text-4xl"
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
              data-testid="text-section-destaques"
            >
              Em destaque
            </h2>
            <p className="text-sm text-muted-foreground">
              As queridinhas da coleção
            </p>
          </div>
          <Link
            href="/produtos"
            className="text-sm font-medium text-foreground hover:underline"
            data-testid="link-ver-todos"
          >
            Ver todos →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div role="alert" className="rounded-xl border p-6 text-center">
            <p>Não foi possível carregar a coleção.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : destaques.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
            Nenhum produto cadastrado.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {destaques.map((p) => (
              <ProductCard key={p.id} produto={p} />
            ))}
          </div>
        )}
      </section>

      <Footer whatsapp={config?.whatsapp} />
    </div>
  );
}
