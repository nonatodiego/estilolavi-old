import { createContext, useContext, useMemo, ReactNode } from "react";
import { z } from "zod";
import { cartItemSchema, usePurchaseState } from "@/lib/purchase-state";

export interface CartItem {
  produtoId: number;
  nome: string;
  preco: number;
  qtd: number;
  tamanho?: string;
  cor?: string;
  imagemUrl?: string;
}

interface CartContextValue {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (produtoId: number, tamanho?: string, cor?: string) => void;
  updateQty: (
    produtoId: number,
    qtd: number,
    tamanho?: string,
    cor?: string,
  ) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const cartSchema = z.array(cartItemSchema).max(100);
const emptyCart: CartItem[] = [];

function sameVariant(
  a: CartItem,
  produtoId: number,
  tamanho?: string,
  cor?: string,
) {
  return (
    a.produtoId === produtoId &&
    (a.tamanho || "") === (tamanho || "") &&
    (a.cor || "") === (cor || "")
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = usePurchaseState<CartItem[]>(
    "lavi:carrinho:v1",
    cartSchema,
    emptyCart,
  );

  const add = (item: CartItem) => {
    const idx = items.findIndex((p) =>
      sameVariant(p, item.produtoId, item.tamanho, item.cor),
    );
    if (idx >= 0) {
      const next = [...items];
      next[idx] = { ...next[idx], qtd: Math.min(99, next[idx].qtd + item.qtd) };
      setItems(next);
    } else {
      setItems([...items, item]);
    }
  };

  const remove = (produtoId: number, tamanho?: string, cor?: string) => {
    setItems(items.filter((p) => !sameVariant(p, produtoId, tamanho, cor)));
  };

  const updateQty = (
    produtoId: number,
    qtd: number,
    tamanho?: string,
    cor?: string,
  ) => {
    setItems(
      items
        .map((p) =>
          sameVariant(p, produtoId, tamanho, cor)
            ? { ...p, qtd: Math.min(99, qtd) }
            : p,
        )
        .filter((p) => p.qtd > 0),
    );
  };

  const clear = () => setItems([]);

  const total = useMemo(
    () => items.reduce((s, i) => s + i.preco * i.qtd, 0),
    [items],
  );
  const count = useMemo(() => items.reduce((s, i) => s + i.qtd, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, add, remove, updateQty, clear, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
