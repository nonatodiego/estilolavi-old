import { Header } from "@/components/loja/Header";
import { Footer } from "@/components/loja/Footer";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Instagram } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

export default function Contato() {
  const { data: config } = useQuery<{ whatsapp: string }>({
    queryKey: ["/api/config"],
  });
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 md:px-6">
        <h1
          className="font-serif text-3xl font-semibold md:text-4xl"
          style={{ fontFamily: "Cormorant Garamond, Georgia, serif" }}
        >
          Fale com a Lavi
        </h1>
        <p className="mt-2 text-muted-foreground">
          Atendemos pelo WhatsApp e Instagram. Tire dúvidas, peça medidas ou
          envie o seu comprovante.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {config?.whatsapp && (
            <Button
              asChild
              className="h-auto w-full gap-3 py-6"
              data-testid="button-contato-whatsapp"
            >
              <a
                href={`https://wa.me/${config.whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                <SiWhatsapp className="h-6 w-6" />
                <div className="text-left">
                  <div className="text-base font-semibold">WhatsApp</div>
                  <div className="text-xs opacity-90">Resposta em até 1h</div>
                </div>
              </a>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            className="h-auto w-full gap-3 py-6"
            data-testid="button-contato-instagram"
          >
            <a
              href="https://instagram.com/estilolavi"
              target="_blank"
              rel="noreferrer"
            >
              <Instagram className="h-6 w-6" />
              <div className="text-left">
                <div className="text-base font-semibold">Instagram</div>
                <div className="text-xs text-muted-foreground">@estilolavi</div>
              </div>
            </a>
          </Button>
        </div>
      </main>
      <Footer whatsapp={config?.whatsapp} />
    </div>
  );
}
