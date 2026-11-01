import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";

const memory = new Map<string, string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
if (typeof window !== "undefined")
  window.addEventListener("storage", (event) => {
    if (event.key) memory.delete(event.key);
    else memory.clear();
    notify();
  });

function read(key: string) {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function usePurchaseState<T>(
  key: string,
  schema: z.ZodType<T>,
  initial: T,
) {
  const raw = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => read(key),
    () => null,
  );
  const value = useMemo(() => {
    if (!raw) return initial;
    try {
      const parsed = schema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : initial;
    } catch {
      return initial;
    }
  }, [raw, schema, initial]);
  function save(next: T) {
    const serialized = JSON.stringify(next);
    memory.set(key, serialized);
    try {
      localStorage.setItem(key, serialized);
    } catch {
      /* Keep the current tab usable when storage is blocked. */
    }
    notify();
  }
  let persisted = false;
  try {
    persisted = raw !== null && localStorage.getItem(key) === raw;
  } catch {
    /* Storage is optional. */
  }
  return [value, save, persisted] as const;
}

export const cartItemSchema = z.object({
  produtoId: z.number().int().positive(),
  nome: z.string(),
  preco: z.number().finite().nonnegative(),
  qtd: z.number().int().min(1).max(99),
  tamanho: z.string().optional(),
  cor: z.string().optional(),
  imagemUrl: z.string().optional(),
});
export const savedOrderSchema = z
  .object({
    pedidoId: z.number().int().positive(),
    subtotal: z.number(),
    frete: z.number(),
    total: z.number(),
    entregaTipo: z.enum(["estacao", "uber"]),
    pixKey: z.string(),
    pixCopiaCola: z.string(),
    qrCodeImg: z.string(),
    linkWhatsapp: z.string().url(),
    itens: z.array(cartItemSchema),
  })
  .nullable();
export type SavedOrder = NonNullable<z.infer<typeof savedOrderSchema>>;
export const useSavedOrder = () =>
  usePurchaseState("lavi:pedido:v1", savedOrderSchema, null);
