import { Header } from "@/components/loja/Header";
import { Footer } from "@/components/loja/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCart, formatBRL } from "@/store/cart";
import { apiRequest } from "@/lib/queryClient";
import { useSavedOrder, type SavedOrder } from "@/lib/purchase-state";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { checkoutSchema } from "@shared/schema";
import {
  calcularResumo,
  ENTREGA_LABELS,
  type EntregaTipo,
} from "@shared/checkout";
import { Copy, MessageCircle, CheckCircle2, Clock3 } from "lucide-react";

interface PedidoStatus {
  id: number;
  status: string;
  total: number;
}

export default function Checkout() {
  const { items, total, clear } = useCart();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const [resp, saveOrder, orderPersisted] = useSavedOrder();
  const { data: config } = useQuery<{ whatsapp: string }>({
    queryKey: ["/api/config"],
  });
  const [form, setForm] = useState({
    clienteNome: "",
    clienteWhatsapp: "",
    clienteEmail: "",
    enderecoEntrega: "",
    observacoes: "",
  });
  const [entregaTipo, setEntregaTipo] = useState<EntregaTipo>("estacao");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const resumo = calcularResumo(total, entregaTipo);
  const showOrder = Boolean(
    resp &&
      (items.length === 0 || new URLSearchParams(search).get("pedido") === "1"),
  );
  const status = useQuery<PedidoStatus>({
    queryKey: ["/api/pedidos", resp?.pedidoId],
    enabled: showOrder,
    refetchInterval: (query) =>
      query.state.data?.status === "pendente" ? 15000 : false,
  });
  const mut = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/pedidos", {
        ...form,
        entregaTipo,
        itens: items,
      });
      return (await result.json()) as SavedOrder;
    },
    onSuccess: (data) => {
      saveOrder(data);
      clear();
      setLocation("/checkout?pedido=1");
      toast({
        title: "Pedido criado",
        description:
          "Confira o Pix. A confirmação do pagamento é feita pela loja.",
      });
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError("");
    const result = checkoutSchema.safeParse({
      ...form,
      entregaTipo,
      itens: items,
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = String(issue.path[0]);
        if (!next[field]) next[field] = issue.message;
      });
      setErrors(next);
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setErrors({});
    mut.mutate();
  }

  async function copiarPix() {
    if (!resp) return;
    try {
      await navigator.clipboard.writeText(resp.pixCopiaCola);
      toast({
        title: "Código Pix copiado",
        description: "Cole no aplicativo do seu banco.",
      });
    } catch {
      toast({
        title: "Não foi possível copiar",
        description: "Selecione o código Pix e copie manualmente.",
        variant: "destructive",
      });
    }
  }

  if (showOrder && resp) {
    const pending =
      status.data?.status === "pendente" && status.isFetchedAfterMount;
    const paid =
      status.data?.status === "pago" || status.data?.status === "enviado";
    const cancelled = status.data?.status === "cancelado";
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 md:px-6">
          <div className="rounded-xl border bg-card p-5 md:p-8">
            <div className="flex items-center gap-3">
              {paid ? (
                <CheckCircle2 className="h-7 w-7 shrink-0 text-primary" />
              ) : (
                <Clock3 className="h-7 w-7 shrink-0 text-gold" />
              )}
              <div>
                <h1
                  className="font-serif text-3xl font-semibold"
                  data-testid="text-order-title"
                >
                  Pedido #{resp.pedidoId}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground" role="status">
                  {status.isError
                    ? "Não foi possível consultar o pedido."
                    : paid
                      ? status.data?.status === "enviado"
                        ? "Pedido enviado"
                        : "Pagamento confirmado pela loja"
                      : cancelled
                        ? "Pedido cancelado · não pague este Pix"
                        : pending
                          ? "Aguardando pagamento e confirmação da loja"
                          : "Consultando status do pedido..."}
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-2 border-y py-4 text-sm">
              {resp.itens.map((item, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <span>
                    {item.qtd}× {item.nome}
                    <span className="block text-muted-foreground">
                      {[item.tamanho, item.cor].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0">
                    {formatBRL(item.preco * item.qtd)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-3">
                <span>Subtotal</span>
                <span>{formatBRL(resp.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>{ENTREGA_LABELS[resp.entregaTipo]}</span>
                <span className="shrink-0">
                  {resp.frete === 0 ? "Grátis" : formatBRL(resp.frete)}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-base font-semibold">
                <span>Total do pedido</span>
                <span>{formatBRL(status.data?.total ?? resp.total)}</span>
              </div>
            </div>
            {status.isError && (
              <div role="alert" className="mt-5">
                <p className="text-sm">Consulte novamente antes de pagar.</p>
                <Button
                  variant="outline"
                  onClick={() => status.refetch()}
                  className="mt-3"
                >
                  Consultar novamente
                </Button>
              </div>
            )}
            {pending && !status.isError && (
              <>
                <h2 className="mt-6 font-serif text-2xl font-semibold">
                  Pague com Pix
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Copie o código para pagar no celular ou escaneie o QR Code em
                  outro aparelho. Depois, envie o comprovante para a loja.
                </p>
                <div className="mt-5 grid items-start gap-5 sm:grid-cols-[176px_1fr]">
                  <img
                    src={resp.qrCodeImg}
                    alt="QR Code para pagar o pedido com Pix"
                    className="mx-auto w-44 rounded-lg bg-white p-3"
                    data-testid="img-qrcode"
                  />
                  <div className="min-w-0">
                    <Label htmlFor="pix-code">Código Pix copia e cola</Label>
                    <Textarea
                      id="pix-code"
                      readOnly
                      value={resp.pixCopiaCola}
                      className="mt-2 min-h-28 break-all font-mono text-sm"
                      onFocus={(event) => event.target.select()}
                    />
                    <Button
                      onClick={copiarPix}
                      variant="outline"
                      className="mt-3 w-full"
                      data-testid="button-copiar-pix"
                    >
                      <Copy />
                      Copiar código Pix
                    </Button>
                  </div>
                </div>
              </>
            )}
            {!cancelled && (
              <div className="mt-6 rounded-lg bg-secondary p-4">
                <p className="text-sm">
                  {resp.entregaTipo === "uber"
                    ? "Frete grátis por Uber. Combine o local e o horário da entrega pelo WhatsApp."
                    : "Combine com a loja a estação e o horário da entrega pelo WhatsApp."}
                </p>
                <Button
                  asChild
                  className="mt-3 w-full whitespace-normal"
                  data-testid="button-enviar-whatsapp"
                >
                  <a href={resp.linkWhatsapp} target="_blank" rel="noreferrer">
                    <MessageCircle />
                    {resp.entregaTipo === "uber"
                      ? "Combinar entrega no WhatsApp"
                      : "Falar sobre o pedido no WhatsApp"}
                  </a>
                </Button>
              </div>
            )}
            <p
              className="mt-5 text-sm text-muted-foreground"
              role={orderPersisted ? undefined : "alert"}
            >
              {orderPersisted
                ? "Você pode voltar a esta tela em “Meu pedido”, neste navegador."
                : "Este navegador não permitiu salvar o pedido. Mantenha esta página aberta e anote o número do pedido para falar com a loja."}
            </p>
            <Button
              variant="ghost"
              className="mt-3 w-full"
              onClick={() =>
                setLocation(items.length ? "/carrinho" : "/produtos")
              }
            >
              {items.length ? "Voltar ao carrinho" : "Continuar comprando"}
            </Button>
          </div>
        </main>
        <Footer whatsapp={config?.whatsapp} />
      </div>
    );
  }

  const fieldError = (field: string) =>
    errors[field] && (
      <p id={`${field}-error`} className="mt-1 text-sm text-destructive">
        {errors[field]}
      </p>
    );
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:py-12 md:px-6">
        <h1
          className="font-serif text-4xl font-semibold md:text-5xl"
          data-testid="text-page-title"
        >
          Finalizar pedido
        </h1>
        <p className="mt-3 text-muted-foreground">
          Escolha a entrega e confira o total antes de gerar o Pix.
        </p>
        {resp && (
          <p className="mt-4 text-sm">
            <Link
              href="/checkout?pedido=1"
              className="font-medium text-primary underline underline-offset-4"
            >
              Ver meu pedido anterior · #{resp.pedidoId}
            </Link>
          </p>
        )}
        {items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed p-8 text-center">
            <p>Seu carrinho está vazio.</p>
            <Button asChild className="mt-4">
              <Link href="/produtos">Explorar produtos</Link>
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_320px]"
          >
            <div className="min-w-0 space-y-8">
              <section aria-labelledby="dados-title">
                <h2
                  id="dados-title"
                  className="font-serif text-2xl font-semibold"
                >
                  Seus dados
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Os campos com * são obrigatórios.
                </p>
                <div className="mt-5 space-y-5">
                  <div>
                    <Label htmlFor="clienteNome">Nome completo *</Label>
                    <Input
                      id="clienteNome"
                      autoComplete="name"
                      value={form.clienteNome}
                      onChange={(e) =>
                        setForm({ ...form, clienteNome: e.target.value })
                      }
                      required
                      aria-invalid={Boolean(errors.clienteNome)}
                      aria-describedby={
                        errors.clienteNome ? "clienteNome-error" : undefined
                      }
                      className="mt-2"
                      data-testid="input-nome"
                    />
                    {fieldError("clienteNome")}
                  </div>
                  <div>
                    <Label htmlFor="clienteWhatsapp">WhatsApp com DDD *</Label>
                    <Input
                      id="clienteWhatsapp"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(21) 99999-9999"
                      value={form.clienteWhatsapp}
                      onChange={(e) =>
                        setForm({ ...form, clienteWhatsapp: e.target.value })
                      }
                      required
                      aria-invalid={Boolean(errors.clienteWhatsapp)}
                      aria-describedby={
                        errors.clienteWhatsapp
                          ? "clienteWhatsapp-error"
                          : undefined
                      }
                      className="mt-2"
                      data-testid="input-whatsapp"
                    />
                    {fieldError("clienteWhatsapp")}
                  </div>
                  <div>
                    <Label htmlFor="clienteEmail">Email (opcional)</Label>
                    <Input
                      id="clienteEmail"
                      type="email"
                      autoComplete="email"
                      value={form.clienteEmail}
                      onChange={(e) =>
                        setForm({ ...form, clienteEmail: e.target.value })
                      }
                      aria-invalid={Boolean(errors.clienteEmail)}
                      aria-describedby={
                        errors.clienteEmail ? "clienteEmail-error" : undefined
                      }
                      className="mt-2"
                      data-testid="input-email"
                    />
                    {fieldError("clienteEmail")}
                  </div>
                </div>
              </section>
              <fieldset>
                <legend className="font-serif text-2xl font-semibold">
                  Como você quer receber?
                </legend>
                <div className="mt-4 space-y-3">
                  {(["estacao", "uber"] as const).map((tipo) => (
                    <label
                      key={tipo}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${entregaTipo === tipo ? "border-primary bg-secondary" : "bg-card"}`}
                    >
                      <input
                        type="radio"
                        name="entregaTipo"
                        value={tipo}
                        checked={entregaTipo === tipo}
                        onChange={() => {
                          setEntregaTipo(tipo);
                          setForm({ ...form, enderecoEntrega: "" });
                          setErrors({});
                        }}
                        className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
                        data-testid={`radio-entrega-${tipo}`}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">
                          {tipo === "estacao"
                            ? "Estação de metrô ou trem · R$ 5,00"
                            : "Uber · frete grátis"}
                        </span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {tipo === "estacao"
                            ? "Informe a estação e combine o horário com a loja."
                            : "Combine os detalhes da entrega pelo WhatsApp."}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-5">
                  <Label htmlFor="enderecoEntrega">
                    {entregaTipo === "estacao"
                      ? "Nome da estação e cidade *"
                      : "Local da entrega *"}
                  </Label>
                  <Textarea
                    id="enderecoEntrega"
                    value={form.enderecoEntrega}
                    onChange={(e) =>
                      setForm({ ...form, enderecoEntrega: e.target.value })
                    }
                    required
                    rows={2}
                    placeholder={
                      entregaTipo === "estacao"
                        ? "Ex.: estação Central do Brasil, Rio de Janeiro"
                        : "Informe o endereço ou local para combinar com a loja"
                    }
                    aria-invalid={Boolean(errors.enderecoEntrega)}
                    aria-describedby={
                      errors.enderecoEntrega
                        ? "enderecoEntrega-error"
                        : undefined
                    }
                    className="mt-2 text-base"
                    data-testid="input-endereco"
                  />
                  {fieldError("enderecoEntrega")}
                </div>
                {entregaTipo === "uber" && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">
                      A entrega por Uber deve ser combinada com a loja pelo
                      WhatsApp. O frete no pedido é grátis.
                    </p>
                    {config?.whatsapp && (
                      <Button
                        asChild
                        variant="outline"
                        className="mt-3 w-full whitespace-normal"
                      >
                        <a
                          href={`https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Olá! Quero combinar a entrega por Uber de uma compra na Estilo Lavi.")}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MessageCircle />
                          Combinar entrega no WhatsApp
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </fieldset>
              <div>
                <Label htmlFor="observacoes">Observações (opcional)</Label>
                <Textarea
                  id="observacoes"
                  rows={2}
                  maxLength={1000}
                  value={form.observacoes}
                  onChange={(e) =>
                    setForm({ ...form, observacoes: e.target.value })
                  }
                  className="mt-2 text-base"
                  data-testid="input-observacoes"
                />
              </div>
            </div>
            <aside
              className="rounded-xl border bg-card p-5 md:sticky md:top-28"
              aria-label="Resumo do pedido"
            >
              <h2 className="font-serif text-2xl font-semibold">Seu pedido</h2>
              <div className="mt-4 space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.produtoId}-${item.tamanho}-${item.cor}`}
                    className="flex justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 break-words">
                      {item.qtd}× {item.nome}
                      <span className="mt-1 block text-muted-foreground">
                        {[item.tamanho, item.cor].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatBRL(item.preco * item.qtd)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-3 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatBRL(resumo.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>
                    Frete · {entregaTipo === "estacao" ? "estação" : "Uber"}
                  </span>
                  <span data-testid="text-checkout-frete">
                    {resumo.frete ? formatBRL(resumo.frete) : "Grátis"}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-4 text-lg font-semibold">
                  <span>Total</span>
                  <span
                    className="tabular-nums"
                    data-testid="text-checkout-total"
                  >
                    {formatBRL(resumo.total)}
                  </span>
                </div>
              </div>
              {submitError && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {submitError}
                </p>
              )}
              <Button
                type="submit"
                className="mt-5 w-full"
                size="lg"
                disabled={mut.isPending}
                data-testid="button-gerar-pix"
              >
                {mut.isPending
                  ? "Criando seu pedido..."
                  : "Criar pedido e gerar Pix"}
              </Button>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Pagamento via Pix. A loja confirma após receber o comprovante
                pelo WhatsApp.
              </p>
              <Button asChild variant="ghost" className="mt-2 w-full">
                <Link href="/carrinho">Revisar carrinho</Link>
              </Button>
            </aside>
          </form>
        )}
      </main>
      <Footer whatsapp={config?.whatsapp} />
    </div>
  );
}
