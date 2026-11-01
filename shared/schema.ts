import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============ ADMIN USERS ============
export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).pick({
  email: true,
  senhaHash: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// ============ PRODUTOS ============
export const produtos = sqliteTable("produtos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  descricao: text("descricao").notNull().default(""),
  preco: real("preco").notNull(),
  // Stored as JSON strings (SQLite has no native arrays)
  tamanhos: text("tamanhos").notNull().default("[]"), // JSON: string[]
  cores: text("cores").notNull().default("[]"),       // JSON: string[]
  imagemUrl: text("imagem_url").notNull().default(""),
  destaque: integer("destaque").notNull().default(0), // 0 = não, 1 = sim
  ativo: integer("ativo").notNull().default(1),
  estoque: integer("estoque").notNull().default(99),
  criadoEm: integer("criado_em").notNull().default(0), // unix ms
});

export const insertProdutoSchema = createInsertSchema(produtos).omit({
  id: true,
  criadoEm: true,
});

export type InsertProduto = z.infer<typeof insertProdutoSchema>;
export type Produto = typeof produtos.$inferSelect;

// Helper interface for parsed product (deserialized JSON)
export interface ProdutoView extends Omit<Produto, "tamanhos" | "cores"> {
  tamanhos: string[];
  cores: string[];
}

// ============ PEDIDOS ============
export const pedidos = sqliteTable("pedidos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clienteNome: text("cliente_nome").notNull(),
  clienteWhatsapp: text("cliente_whatsapp").notNull(),
  clienteEmail: text("cliente_email").notNull().default(""),
  enderecoEntrega: text("endereco_entrega").notNull().default(""),
  // JSON: { produtoId, nome, preco, qtd, tamanho, cor, imagemUrl }[]
  itens: text("itens").notNull().default("[]"),
  total: real("total").notNull(),
  frete: real("frete").notNull().default(0),
  entregaTipo: text("entrega_tipo").notNull().default("estacao"),
  pixKey: text("pix_key").notNull().default(""),
  qrCodeData: text("qr_code_data").notNull().default(""), // EMV BR Code payload
  // pendente | pago | enviado | cancelado
  status: text("status").notNull().default("pendente"),
  observacoes: text("observacoes").notNull().default(""),
  dataCriacao: integer("data_criacao").notNull().default(0), // unix ms
  dataPagamento: integer("data_pagamento"),
});

export const insertPedidoSchema = createInsertSchema(pedidos).omit({
  id: true,
  dataCriacao: true,
  dataPagamento: true,
  qrCodeData: true,
  pixKey: true,
  status: true,
});

export type InsertPedido = z.infer<typeof insertPedidoSchema>;
export type Pedido = typeof pedidos.$inferSelect;

export interface PedidoItem {
  produtoId: number;
  nome: string;
  preco: number;
  qtd: number;
  tamanho?: string;
  cor?: string;
  imagemUrl?: string;
}

// ============ Schema validações entrada (frontend) ============
export const checkoutSchema = z.object({
  clienteNome: z.string().trim().min(2, "Informe seu nome completo").max(150),
  clienteWhatsapp: z.string().trim().regex(/^[+\d\s()-]{10,20}$/, "Informe um WhatsApp com DDD").refine((value) => /^\d{10,13}$/.test(value.replace(/\D/g, "")), "Informe um WhatsApp com DDD"),
  clienteEmail: z.string().email("Email inválido").or(z.literal("")),
  enderecoEntrega: z.string().trim().min(3, "Informe o local da entrega").max(500),
  entregaTipo: z.enum(["estacao", "uber"]),
  observacoes: z.string().max(1000).optional(),
  itens: z.array(z.object({
    produtoId: z.number().int().positive(),
    nome: z.string(),
    preco: z.number().finite().nonnegative(),
    qtd: z.number().int().min(1).max(99),
    tamanho: z.string().optional(),
    cor: z.string().optional(),
    imagemUrl: z.string().optional(),
  })).min(1, "Carrinho vazio").max(100),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
