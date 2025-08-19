// pages/api/themes/[id].ts
import { db } from "@/lib/db";
import { ThemeTokens } from "@/lib/schemas";
import type { NextApiRequest, NextApiResponse } from "next";


export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };

  if (req.method === "GET") {
    const t = db.getTheme(id);
    if (!t) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(t);
  }

  if (req.method === "PUT") {
    try {
      const tokens = ThemeTokens.parse(req.body);
      const saved = db.saveTheme(id, tokens);
      return res.status(200).json(saved);
    } catch (e: any) {
      return res.status(400).json({ error: e.message || "Invalid tokens" });
    }
  }

  return res.status(405).end();
}
