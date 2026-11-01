import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage, seedDatabase } from "./storage";
import { checkoutSchema, insertProdutoSchema } from "@shared/schema";
import { gerarPayloadPix } from "./lib/pix";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prepararPedido } from "./lib/checkout";
import { ENTREGA_LABELS } from "@shared/checkout";

const PIX_KEY = process.env.PIX_KEY || "laisavitoriaa77@gmail.com";
const WA_PHONE = process.env.WA_PHONE || "5521970838278"; // 55 + DDD + número
const MERCHANT_NAME = process.env.MERCHANT_NAME || "ESTILO LAVI";
const MERCHANT_CITY = process.env.MERCHANT_CITY || "RIO DE JANEIRO";
// JWT_SECRET: usa env var em produção; senão gera segredo aleatório por instância
// (tokens não persistem entre restarts — admin precisa relogar, comportamento seguro)
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(64).toString("hex");
if (!process.env.JWT_SECRET) {
  console.warn("[security] JWT_SECRET não configurado — usando segredo aleatório de runtime. Tokens serão invalidados a cada restart.");
}

// ============ Auth middleware ============
function getTokenFromReq(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  // Also accept cookie "lavi_token"
  const cookie = req.headers.cookie?.split(";").map((c) => c.trim()).find((c) => c.startsWith("lavi_token="));
  if (cookie) return decodeURIComponent(cookie.slice("lavi_token=".length));
  return null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromReq(req);
  if (!token) return res.status(401).json({ error: "Não autenticado" });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { adminId: number; email: string };
    (req as any).admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// ============ Routes ============
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedDatabase();

  // ===== Config público =====
  app.get("/api/config", (_req, res) => {
    res.json({
      pixKey: PIX_KEY,
      whatsapp: WA_PHONE,
      merchantName: MERCHANT_NAME,
      merchantCity: MERCHANT_CITY,
    });
  });

  // ===== Produtos públicos =====
  app.get("/api/produtos", async (req, res) => {
    const destaque = req.query.destaque === "true";
    const lista = await storage.listProdutos({ destaque: destaque || undefined });
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(lista);
  });

  app.get("/api/produtos/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "ID inválido" });
    const p = await storage.getProduto(id);
    if (!p) return res.status(404).json({ error: "Produto não encontrado" });
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(p);
  });

  // ===== Pedidos: criar (gera Pix) =====
  app.post("/api/pedidos", async (req, res) => {
    try {
      const data = checkoutSchema.parse(req.body);
      let resumo;
      try { resumo = await prepararPedido(data, (id) => storage.getProduto(id)); }
      catch (error) { return res.status(400).json({ error: (error as Error).message }); }
      const { total, subtotal, frete, itens } = resumo;

      // Cria pedido temporário p/ pegar ID, depois atualiza qrCode
      const pedidoCriado = await storage.createPedido({
        clienteNome: data.clienteNome,
        clienteWhatsapp: data.clienteWhatsapp,
        clienteEmail: data.clienteEmail || "",
        enderecoEntrega: `${ENTREGA_LABELS[data.entregaTipo]}: ${data.enderecoEntrega}`,
        observacoes: data.observacoes || "",
        itens: JSON.stringify(itens),
        total,
        frete,
        entregaTipo: data.entregaTipo,
        pixKey: PIX_KEY,
        qrCodeData: "",
      });

      const txid = `LAVI${pedidoCriado.id}`;
      const payload = gerarPayloadPix({
        pixKey: PIX_KEY,
        merchantName: MERCHANT_NAME,
        merchantCity: MERCHANT_CITY,
        amount: total,
        txid,
      });
      const qrPng = await QRCode.toDataURL(payload, { margin: 1, width: 320 });

      // Atualiza pedido com payload
      const { db } = await import("./storage");
      const { pedidos } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      db.update(pedidos).set({ qrCodeData: payload }).where(eq(pedidos.id, pedidoCriado.id)).run();

      const mensagemWa = encodeURIComponent(
        data.entregaTipo === "uber"
          ? `Olá! Quero combinar a entrega por Uber do pedido #${pedidoCriado.id}, no valor de R$ ${total.toFixed(2).replace(".", ",")}.`
          : `Olá! Quero falar sobre a entrega e o pagamento do pedido #${pedidoCriado.id}, no valor de R$ ${total.toFixed(2).replace(".", ",")}.`
      );
      const linkWhatsapp = `https://wa.me/${WA_PHONE}?text=${mensagemWa}`;

      res.json({
        pedidoId: pedidoCriado.id,
        total,
        subtotal,
        frete,
        entregaTipo: data.entregaTipo,
        itens,
        pixKey: PIX_KEY,
        pixCopiaCola: payload,
        qrCodeImg: qrPng,
        linkWhatsapp,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Dados inválidos", details: err.errors });
      }
      console.error(err);
      res.status(500).json({ error: "Erro ao criar pedido" });
    }
  });

  app.get("/api/pedidos/:id", async (req, res) => {
    const id = Number(req.params.id);
    const p = await storage.getPedido(id);
    if (!p) return res.status(404).json({ error: "Pedido não encontrado" });
    // Públicamente expomos só o essencial
    res.json({
      id: p.id,
      status: p.status,
      total: p.total,
      frete: p.frete,
      entregaTipo: p.entregaTipo,
      pixKey: p.pixKey,
      pixCopiaCola: p.qrCodeData,
      dataCriacao: p.dataCriacao,
    });
  });

  // ===== Admin: login =====
  app.post("/api/admin/login", async (req, res) => {
    const schema = z.object({ email: z.string().email(), senha: z.string().min(1) });
    try {
      const { email, senha } = schema.parse(req.body);
      const admin = await storage.getAdminByEmail(email);
      if (!admin) return res.status(401).json({ error: "Credenciais inválidas" });
      const ok = await bcrypt.compare(senha, admin.senhaHash);
      if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });
      const token = jwt.sign({ adminId: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, email: admin.email });
    } catch (err: any) {
      res.status(400).json({ error: "Dados inválidos" });
    }
  });

  app.get("/api/admin/me", requireAdmin, (req, res) => {
    res.json({ admin: (req as any).admin });
  });

  // ===== Admin: pedidos =====
  app.get("/api/admin/pedidos", requireAdmin, async (req, res) => {
    const status = (req.query.status as string) || undefined;
    const from = req.query.from ? Number(req.query.from) : undefined;
    const to = req.query.to ? Number(req.query.to) : undefined;
    const lista = await storage.listPedidos({ status, from, to });
    res.json(lista);
  });

  app.put("/api/admin/pedidos/:id/confirmar", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const p = await storage.confirmarPedido(id);
    if (!p) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(p);
  });

  app.put("/api/admin/pedidos/:id/status", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const schema = z.object({ status: z.enum(["pendente", "pago", "enviado", "cancelado"]) });
    try {
      const { status } = schema.parse(req.body);
      const p = await storage.updateStatusPedido(id, status);
      if (!p) return res.status(404).json({ error: "Pedido não encontrado" });
      res.json(p);
    } catch {
      res.status(400).json({ error: "Status inválido" });
    }
  });

  app.get("/api/admin/dashboard", requireAdmin, async (_req, res) => {
    const todos = await storage.listPedidos();
    const now = new Date();
    const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const pagos = todos.filter((p) => p.status === "pago" || p.status === "enviado");
    const vendasHoje = pagos.filter((p) => (p.dataPagamento || p.dataCriacao) >= inicioHoje);
    const vendasMes = pagos.filter((p) => (p.dataPagamento || p.dataCriacao) >= inicioMes);
    const pendentes = todos.filter((p) => p.status === "pendente");

    res.json({
      totalHoje: vendasHoje.reduce((s, p) => s + p.total, 0),
      countHoje: vendasHoje.length,
      totalMes: vendasMes.reduce((s, p) => s + p.total, 0),
      countMes: vendasMes.length,
      pendentes: pendentes.length,
      totalPedidos: todos.length,
    });
  });

  // ===== Admin: produtos CRUD =====
  app.get("/api/admin/produtos", requireAdmin, async (_req, res) => {
    const lista = await storage.listProdutos({ ativo: false });
    res.json(lista);
  });

  app.post("/api/admin/produtos", requireAdmin, async (req, res) => {
    try {
      const data = insertProdutoSchema.parse(req.body);
      const p = await storage.createProduto(data);
      res.json(p);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: "Dados inválidos", details: err.errors });
      res.status(500).json({ error: "Erro ao criar produto" });
    }
  });

  app.put("/api/admin/produtos/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    try {
      const data = insertProdutoSchema.partial().parse(req.body);
      const p = await storage.updateProduto(id, data);
      if (!p) return res.status(404).json({ error: "Produto não encontrado" });
      res.json(p);
    } catch (err: any) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: "Dados inválidos", details: err.errors });
      res.status(500).json({ error: "Erro ao atualizar produto" });
    }
  });

  app.delete("/api/admin/produtos/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const ok = await storage.deleteProduto(id);
    if (!ok) return res.status(404).json({ error: "Produto não encontrado" });
    res.json({ ok: true });
  });

  return httpServer;
}
