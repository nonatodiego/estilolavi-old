import { adminUsers, produtos, pedidos } from "@shared/schema";
import type {
  AdminUser,
  InsertAdminUser,
  Produto,
  InsertProduto,
  Pedido,
  InsertPedido,
  ProdutoView,
  PedidoItem,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import bcrypt from "bcryptjs";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Bootstrap schema (Drizzle migrations not used — direct DDL)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT NOT NULL DEFAULT '',
    preco REAL NOT NULL,
    tamanhos TEXT NOT NULL DEFAULT '[]',
    cores TEXT NOT NULL DEFAULT '[]',
    imagem_url TEXT NOT NULL DEFAULT '',
    destaque INTEGER NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1,
    estoque INTEGER NOT NULL DEFAULT 99,
    criado_em INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_nome TEXT NOT NULL,
    cliente_whatsapp TEXT NOT NULL,
    cliente_email TEXT NOT NULL DEFAULT '',
    endereco_entrega TEXT NOT NULL DEFAULT '',
    itens TEXT NOT NULL DEFAULT '[]',
    total REAL NOT NULL,
    pix_key TEXT NOT NULL DEFAULT '',
    qr_code_data TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pendente',
    observacoes TEXT NOT NULL DEFAULT '',
    data_criacao INTEGER NOT NULL DEFAULT 0,
    data_pagamento INTEGER
  );
`);

export const db = drizzle(sqlite);
// Add delivery fields without replacing existing orders or data.
const pedidoColumns = sqlite.pragma("table_info(pedidos)") as { name: string }[];
if (!pedidoColumns.some((column) => column.name === "frete")) sqlite.exec("ALTER TABLE pedidos ADD COLUMN frete REAL NOT NULL DEFAULT 0");
if (!pedidoColumns.some((column) => column.name === "entrega_tipo")) sqlite.exec("ALTER TABLE pedidos ADD COLUMN entrega_tipo TEXT NOT NULL DEFAULT 'estacao'");

// ============ Helpers ============
export function produtoToView(p: Produto): ProdutoView {
  let tamanhos: string[] = [];
  let cores: string[] = [];
  try { tamanhos = JSON.parse(p.tamanhos || "[]"); } catch {}
  try { cores = JSON.parse(p.cores || "[]"); } catch {}
  return { ...p, tamanhos, cores };
}

// ============ Storage interface ============
export interface IStorage {
  // Admin auth
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  createAdmin(email: string, senhaPlana: string): Promise<AdminUser>;

  // Produtos
  listProdutos(opts?: { destaque?: boolean; ativo?: boolean }): Promise<ProdutoView[]>;
  getProduto(id: number): Promise<ProdutoView | undefined>;
  createProduto(data: InsertProduto): Promise<Produto>;
  updateProduto(id: number, data: Partial<InsertProduto>): Promise<Produto | undefined>;
  deleteProduto(id: number): Promise<boolean>;

  // Pedidos
  listPedidos(opts?: { status?: string; from?: number; to?: number }): Promise<Pedido[]>;
  getPedido(id: number): Promise<Pedido | undefined>;
  createPedido(data: InsertPedido & { qrCodeData: string; pixKey: string }): Promise<Pedido>;
  confirmarPedido(id: number): Promise<Pedido | undefined>;
  updateStatusPedido(id: number, status: string): Promise<Pedido | undefined>;
}

export class DatabaseStorage implements IStorage {
  // ===== Admin =====
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    return db.select().from(adminUsers).where(eq(adminUsers.email, email)).get();
  }
  async createAdmin(email: string, senhaPlana: string): Promise<AdminUser> {
    const senhaHash = await bcrypt.hash(senhaPlana, 10);
    return db.insert(adminUsers).values({ email, senhaHash }).returning().get();
  }

  // ===== Produtos =====
  async listProdutos(opts: { destaque?: boolean; ativo?: boolean } = {}): Promise<ProdutoView[]> {
    const conds = [] as any[];
    if (opts.destaque) conds.push(eq(produtos.destaque, 1));
    if (opts.ativo !== false) conds.push(eq(produtos.ativo, 1));
    const q = conds.length
      ? db.select().from(produtos).where(and(...conds)).orderBy(desc(produtos.criadoEm))
      : db.select().from(produtos).orderBy(desc(produtos.criadoEm));
    const rows = q.all();
    return rows.map(produtoToView);
  }

  async getProduto(id: number): Promise<ProdutoView | undefined> {
    const row = db.select().from(produtos).where(eq(produtos.id, id)).get();
    return row ? produtoToView(row) : undefined;
  }

  async createProduto(data: InsertProduto): Promise<Produto> {
    return db
      .insert(produtos)
      .values({ ...data, criadoEm: Date.now() })
      .returning()
      .get();
  }

  async updateProduto(id: number, data: Partial<InsertProduto>): Promise<Produto | undefined> {
    return db.update(produtos).set(data).where(eq(produtos.id, id)).returning().get();
  }

  async deleteProduto(id: number): Promise<boolean> {
    const r = db.delete(produtos).where(eq(produtos.id, id)).run();
    return r.changes > 0;
  }

  // ===== Pedidos =====
  async listPedidos(opts: { status?: string; from?: number; to?: number } = {}): Promise<Pedido[]> {
    const conds = [] as any[];
    if (opts.status) conds.push(eq(pedidos.status, opts.status));
    if (opts.from) conds.push(gte(pedidos.dataCriacao, opts.from));
    if (opts.to) conds.push(lte(pedidos.dataCriacao, opts.to));
    const q = conds.length
      ? db.select().from(pedidos).where(and(...conds)).orderBy(desc(pedidos.dataCriacao))
      : db.select().from(pedidos).orderBy(desc(pedidos.dataCriacao));
    return q.all();
  }

  async getPedido(id: number): Promise<Pedido | undefined> {
    return db.select().from(pedidos).where(eq(pedidos.id, id)).get();
  }

  async createPedido(data: InsertPedido & { qrCodeData: string; pixKey: string }): Promise<Pedido> {
    return db
      .insert(pedidos)
      .values({
        ...data,
        dataCriacao: Date.now(),
        status: "pendente",
      } as any)
      .returning()
      .get();
  }

  async confirmarPedido(id: number): Promise<Pedido | undefined> {
    return db
      .update(pedidos)
      .set({ status: "pago", dataPagamento: Date.now() })
      .where(eq(pedidos.id, id))
      .returning()
      .get();
  }

  async updateStatusPedido(id: number, status: string): Promise<Pedido | undefined> {
    return db.update(pedidos).set({ status }).where(eq(pedidos.id, id)).returning().get();
  }
}

export const storage = new DatabaseStorage();

// ============ Seed inicial ============
export async function seedDatabase() {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "laisavitoriaa77@gmail.com";
  const ADMIN_PASS = process.env.ADMIN_PASS || "Lais@2412";

  const existing = await storage.getAdminByEmail(ADMIN_EMAIL);
  if (!existing) {
    await storage.createAdmin(ADMIN_EMAIL, ADMIN_PASS);
    console.log(`[seed] Admin criado: ${ADMIN_EMAIL}`);
  }

  const existingProds = db.select().from(produtos).all();
  if (existingProds.length === 0) {
    const seedProds: InsertProduto[] = [
      {
        nome: "Vestido Floral Lavi",
        descricao: "Vestido midi com estampa floral delicada, tecido leve e fluido. Perfeito para o dia a dia ou ocasiões especiais.",
        preco: 189.9,
        tamanhos: JSON.stringify(["P", "M", "G", "GG"]),
        cores: JSON.stringify(["Rosé", "Branco"]),
        imagemUrl: "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80",
        destaque: 1,
        ativo: 1,
        estoque: 12,
      },
      {
        nome: "Blusa Cropped Renda",
        descricao: "Blusa cropped em renda artesanal com forro. Acabamento sofisticado e caimento impecável.",
        preco: 89.9,
        tamanhos: JSON.stringify(["P", "M", "G"]),
        cores: JSON.stringify(["Bege", "Preto"]),
        imagemUrl: "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=800&q=80",
        destaque: 1,
        ativo: 1,
        estoque: 20,
      },
      {
        nome: "Saia Plissada Dourada",
        descricao: "Saia plissada midi acetinada com toque dourado. Versátil e elegante.",
        preco: 159.9,
        tamanhos: JSON.stringify(["P", "M", "G", "GG"]),
        cores: JSON.stringify(["Dourado", "Champanhe"]),
        imagemUrl: "https://images.unsplash.com/photo-1583496661160-fb5886a13d44?w=800&q=80",
        destaque: 1,
        ativo: 1,
        estoque: 8,
      },
      {
        nome: "Conjunto Tricot Soft",
        descricao: "Conjunto de blusa e calça em tricot suave. Conforto e sofisticação para o dia inteiro.",
        preco: 249.9,
        tamanhos: JSON.stringify(["P", "M", "G"]),
        cores: JSON.stringify(["Rosé", "Off-white", "Preto"]),
        imagemUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
        destaque: 1,
        ativo: 1,
        estoque: 10,
      },
      {
        nome: "Body Manga Longa Tule",
        descricao: "Body de manga longa em tule com detalhes em renda. Peça-chave para looks marcantes.",
        preco: 119.9,
        tamanhos: JSON.stringify(["P", "M", "G"]),
        cores: JSON.stringify(["Preto", "Nude"]),
        imagemUrl: "https://images.unsplash.com/photo-1551803091-e20673f15770?w=800&q=80",
        destaque: 1,
        ativo: 1,
        estoque: 15,
      },
      {
        nome: "Calça Pantalona Alfaiataria",
        descricao: "Calça pantalona em tecido de alfaiataria com cintura alta. Caimento elegante e moderno.",
        preco: 199.9,
        tamanhos: JSON.stringify(["36", "38", "40", "42", "44"]),
        cores: JSON.stringify(["Preto", "Bege", "Marrom"]),
        imagemUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80",
        destaque: 1,
        ativo: 1,
        estoque: 14,
      },
    ];
    for (const p of seedProds) {
      await storage.createProduto(p);
    }
    console.log(`[seed] ${seedProds.length} produtos criados`);
  }
}
