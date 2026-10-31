import "dotenv/config";
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
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API route for scanning with Gemini + Search Grounding
  app.post("/api/scan", async (req, res) => {
    try {
      const { category, discountThreshold } = req.body;
      if (!category) {
        return res.status(400).json({ error: "Category is required" });
      }

      const discountRequirement = discountThreshold 
        ? `Ensure all products have a discount of at least ${discountThreshold}% off the original price.` 
        : "Identify 3 to 5 specific products that currently have good deals.";

      const prompt = `Search Amazon for recent significant price drops, clearance deals, or discounts in the category: "${category}". 
${discountRequirement}
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
      const parsed = JSON.parse(text);

      // Validate the model output before it reaches the client: a non-array payload
      // or mistyped fields used to flow straight into state and crash rendering.
      if (!Array.isArray(parsed)) {
        return res.status(502).json({ error: "Model returned an unexpected format" });
      }
      const products = parsed.map((item: any) => ({
        productName: String(item?.productName ?? ""),
        description: String(item?.description ?? ""),
        department: String(item?.department ?? ""),
        dealPrice: String(item?.dealPrice ?? ""),
        originalPrice: String(item?.originalPrice ?? ""),
        amazonUrl: String(item?.amazonUrl ?? ""),
      }));

      res.json({ products });
    } catch (error: any) {
      console.error("Error during scan:", error);
      res.status(500).json({ error: error.message || "Failed to scan" });
    }
  });

  // API route for getting estimated price history
  app.post("/api/price-history", async (req, res) => {
    try {
      const { productName, originalPrice, dealPrice } = req.body;
      if (!productName) {
        return res.status(400).json({ error: "Product name is required" });
      }

      const prompt = `Generate a realistic 30-day price history for the product "${productName}". 
The price 30 days ago was roughly ${originalPrice} and the current deal price today is ${dealPrice}. 
Provide exactly 30 data points (one for each of the last 30 days) showing how the price fluctuated or dropped over this period. 
Output as a pure JSON array of objects with schema:
[
  { "date": "MMM DD", "price": number }
]
Do not use markdown formatting. Just output the JSON.`;

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
      const parsed = JSON.parse(text);

      if (!Array.isArray(parsed)) {
        return res.status(502).json({ error: "Model returned an unexpected format" });
      }
      // Coerce prices to numbers: string prices crashed the chart tooltip's toFixed().
      const history = parsed
        .map((item: any) => ({ date: String(item?.date ?? ""), price: Number(item?.price) }))
        .filter((item) => Number.isFinite(item.price));

      res.json({ history });
    } catch (error: any) {
      console.error("Error generating history:", error);
      res.status(500).json({ error: error.message || "Failed to generate history" });
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

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
