import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for scanning with Gemini + Search Grounding
  app.post("/api/scan", async (req, res) => {
    try {
      const { category } = req.body;
      if (!category) {
        return res.status(400).json({ error: "Category is required" });
      }

      const prompt = `Search Amazon for recent significant price drops, clearance deals, or discounts in the category: "${category}". 
Identify 3 to 5 specific products that currently have good deals. 
For each product, provide:
1. The product name
2. A short description of the item
3. The most fitting Amazon department (e.g. Electronics, Kitchen & Dining, PC, etc.)
4. The current deal price
5. The original price (or estimate if not available)
6. A direct Amazon URL (or the ASIN) for the product.

Output the result purely as a JSON array of objects without any markdown formatting. Use the following schema for the objects:
{
  "productName": "string",
  "description": "string",
  "department": "string",
  "dealPrice": "string",
  "originalPrice": "string",
  "amazonUrl": "string"
}`;

      // We use gemini-3.5-flash with googleSearch tool for Live Grounding
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          temperature: 0.2
        }
      });

      const text = response.text || "[]";
      const products = JSON.parse(text);
      
      res.json({ products });
    } catch (error: any) {
      console.error("Error during scan:", error);
      res.status(500).json({ error: error.message || "Failed to scan" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
