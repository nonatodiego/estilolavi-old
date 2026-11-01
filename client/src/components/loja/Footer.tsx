import { Logo } from "./Logo";
import { Instagram } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

export function Footer({ whatsapp }: { whatsapp?: string }) {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">
            Moda feminina autoral com peças cuidadosamente escolhidas para você
            se sentir única.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">
            Atendimento
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Pagamento via Pix</li>
            <li>Entrega em estação ou por Uber</li>
            <li>Trocas em até 7 dias</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">
            Fale com a gente
          </h3>
          <div className="flex gap-3">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white hover-elevate"
                data-testid="link-footer-whatsapp"
                aria-label="Falar com a Estilo Lavi no WhatsApp"
              >
                <SiWhatsapp className="h-5 w-5" />
              </a>
            )}
            <a
              href="https://instagram.com/estilolavi"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background hover-elevate"
              data-testid="link-footer-instagram"
              aria-label="Instagram da Estilo Lavi"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Estilo Lavi · Todos os direitos reservados
      </div>
    </footer>
  );
}
