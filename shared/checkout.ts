export type EntregaTipo = "estacao" | "uber";

export const ENTREGA_LABELS: Record<EntregaTipo, string> = {
  estacao: "Estação de metrô ou trem",
  uber: "Uber · combinar pelo WhatsApp",
};

export function calcularResumo(subtotal: number, entregaTipo: EntregaTipo) {
  const subtotalCentavos = Math.round(subtotal * 100);
  const freteCentavos = entregaTipo === "estacao" ? 500 : 0;
  return {
    subtotal: subtotalCentavos / 100,
    frete: freteCentavos / 100,
    total: (subtotalCentavos + freteCentavos) / 100,
  };
}
