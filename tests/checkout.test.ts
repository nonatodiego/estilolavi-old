import test from "node:test";
import assert from "node:assert/strict";
import { calcularResumo } from "../shared/checkout";
import {
  checkoutSchema,
  type CheckoutInput,
  type ProdutoView,
} from "../shared/schema";
import { prepararPedido } from "../server/lib/checkout";

const produto: ProdutoView = {
  id: 1,
  nome: "Vestido",
  descricao: "",
  preco: 89.9,
  tamanhos: ["M"],
  cores: ["Rosé"],
  imagemUrl: "",
  destaque: 1,
  ativo: 1,
  estoque: 3,
  criadoEm: 0,
};
const input: CheckoutInput = {
  clienteNome: "Cliente Teste",
  clienteWhatsapp: "21999999999",
  clienteEmail: "",
  enderecoEntrega: "Estação Central",
  entregaTipo: "estacao",
  itens: [
    {
      produtoId: 1,
      nome: "Nome enviado pelo cliente",
      preco: 89.9,
      qtd: 2,
      tamanho: "M",
      cor: "Rosé",
    },
  ],
};
const getProduto = async () => produto;

test("estação cobra R$5 e Uber não cobra frete, sem aplicar desconto", () => {
  assert.deepEqual(calcularResumo(89.9, "estacao"), {
    subtotal: 89.9,
    frete: 5,
    total: 94.9,
  });
  assert.deepEqual(calcularResumo(89.9, "uber"), {
    subtotal: 89.9,
    frete: 0,
    total: 89.9,
  });
});
test("o servidor usa valores e nomes do catálogo e soma o frete em centavos", async () => {
  const result = await prepararPedido(input, getProduto);
  assert.equal(result.total, 184.8);
  assert.equal(result.itens[0].nome, "Vestido");
  assert.equal(result.frete, 5);
  assert.equal(
    (await prepararPedido({ ...input, entregaTipo: "uber" }, getProduto)).total,
    179.8,
  );
});
test("preço alterado, variante inválida e peça inativa são recusados antes de criar pedido", async () => {
  await assert.rejects(
    prepararPedido(
      { ...input, itens: [{ ...input.itens[0], preco: 1 }] },
      getProduto,
    ),
    /preço/,
  );
  await assert.rejects(
    prepararPedido(
      { ...input, itens: [{ ...input.itens[0], tamanho: "P" }] },
      getProduto,
    ),
    /tamanho/,
  );
  await assert.rejects(
    prepararPedido(input, async () => ({ ...produto, ativo: 0 })),
    /indisponível/,
  );
});
test("estoque considera a soma de linhas repetidas", async () => {
  await assert.rejects(
    prepararPedido(
      { ...input, itens: [...input.itens, ...input.itens] },
      getProduto,
    ),
    /estoque/,
  );
});
test("checkout recusa modalidade desconhecida, quantidade fracionada e WhatsApp sem dígitos", () => {
  assert.equal(checkoutSchema.safeParse(input).success, true);
  assert.equal(
    checkoutSchema.safeParse({ ...input, entregaTipo: "outro" }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({
      ...input,
      itens: [{ ...input.itens[0], qtd: 1.5 }],
    }).success,
    false,
  );
  assert.equal(
    checkoutSchema.safeParse({ ...input, clienteWhatsapp: "----------" })
      .success,
    false,
  );
});
