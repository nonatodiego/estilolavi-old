import type {
  CheckoutInput,
  PedidoItem,
  ProdutoView,
} from "../../shared/schema";
import { calcularResumo } from "../../shared/checkout";

export async function prepararPedido(
  data: CheckoutInput,
  getProduto: (id: number) => Promise<ProdutoView | undefined>,
) {
  const itens: PedidoItem[] = [];
  const quantidades = new Map<number, number>();
  let subtotalCentavos = 0;
  for (const item of data.itens) {
    const produto = await getProduto(item.produtoId);
    if (!produto || !produto.ativo)
      throw new Error(
        "Uma peça ficou indisponível. Revise seu carrinho antes de tentar novamente.",
      );
    const quantidade = (quantidades.get(produto.id) || 0) + item.qtd;
    if (quantidade > produto.estoque)
      throw new Error(
        `A quantidade de ${produto.nome} supera o estoque disponível. Ajuste seu carrinho.`,
      );
    quantidades.set(produto.id, quantidade);
    if (
      (produto.tamanhos.length &&
        !produto.tamanhos.includes(item.tamanho || "")) ||
      (produto.cores.length && !produto.cores.includes(item.cor || ""))
    ) {
      throw new Error(
        `Selecione um tamanho e uma cor disponíveis para ${produto.nome}.`,
      );
    }
    if (Math.round(item.preco * 100) !== Math.round(produto.preco * 100)) {
      throw new Error(
        `O preço de ${produto.nome} mudou. Remova a peça do carrinho e adicione novamente para conferir o valor atual.`,
      );
    }
    subtotalCentavos += Math.round(produto.preco * 100) * item.qtd;
    itens.push({
      produtoId: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      qtd: item.qtd,
      tamanho: produto.tamanhos.length ? item.tamanho : undefined,
      cor: produto.cores.length ? item.cor : undefined,
      imagemUrl: produto.imagemUrl,
    });
  }
  return { itens, ...calcularResumo(subtotalCentavos / 100, data.entregaTipo) };
}
