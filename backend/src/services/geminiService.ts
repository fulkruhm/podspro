
import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import { getProducts, getRoutes } from '../db.js';

const SYSTEM_PROMPT = `
# PODS (Predictive Order & Demand Solutions) AI Assistant
## System Identity & Core Mission
You are an advanced supply chain optimization platform specifically designed for **Multi-Store Grocery Retail Groups**. You manage a hierarchy of Regions, Stores, Departments, and Products.

## Context: Hierarchical Grocery Retail
Always consider the hierarchy:
1. **Region**: (North, South, West)
2. **Store**: (Main St. Market, Uptown Grocers, Lakeside Foods, River Walk Grocers, Coastal Foods)
3. **Department**: (Produce, Dairy, Bakery, Pantry, Meat, Frozen, Beverages)
4. **Product**: Individual grocery items.

## Analysis Rules
- **Perishability**: Short shelf-life for produce/dairy affects Safety Stock.
- **Aggregation**: Be able to summarize metrics at the store or regional level.
- **ROP Formula**: ROP = (Daily Demand × Lead Time) + Safety Stock.
- **Safety Stock**: Use service level targets (95-99%).
`;

// Use either API_KEY or GEMINI_API_KEY environment variable
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.warn('[geminiService] GEMINI_API_KEY not set - chat will work in demo mode');
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const startChat = (history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []): Chat | any => {
  const ai = getAI();
  if (!ai) {
    // Return a mock chat object for demo mode
    console.log('[geminiService] Starting chat in demo mode (no API key)');
    return {
      _isDemoMode: true,
      sendMessage: async (msg: string) => {
        return {
          text: "Demo Mode: AI Advisor is in read-only mode without a valid GEMINI_API_KEY. To enable full AI capabilities, set your API key in the environment.",
        };
      },
    } as any;
  }
  return ai.chats.create({
    model: 'gemini-3.1-pro-preview',
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.7,
    },
  });
};

export const sendMessage = async (chat: Chat | any, message: string): Promise<string> => {
  try {
    // Handle demo mode
    if (chat._isDemoMode) {
      return "Demo Mode: AI Advisor is in read-only mode without a valid GEMINI_API_KEY. To enable full AI capabilities, set your API key in the environment.";
    }
    
    const result: GenerateContentResponse = await chat.sendMessage({ message });
    return result.text || "No response from AI.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    if (error instanceof Error && error.message.includes("Requested entity was not found")) {
        return "ERROR_API_KEY_REQUIRED";
    }
    return "I'm sorry, I encountered an error processing your request.";
  }
};

export const fetchRealtimeData = async () => {
  const ai = getAI();
  
  // If no API key, return current database data as fallback
  if (!ai) {
    console.log('[geminiService] fetchRealtimeData: No API key, returning database data');
    try {
      const products = await getProducts();
      const routes = await getRoutes();
      
      // Map database format to frontend format
      const mappedProducts = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        currentStock: parseInt(p.current_stock) || 0,
        avgDailyDemand: parseFloat(p.avg_daily_demand) || 0,
        leadTime: p.lead_time || 0,
        safetyStock: p.safety_stock || 0,
        reorderPoint: p.reorder_point || 0,
        status: p.status || 'optimal',
        category: p.category || '',
        price: parseFloat(p.price) || 0,
        region: p.region || '',
        store: p.store || '',
        department: p.department || '',
        historicalDemand: p.historical_demand,
        imageUrl: p.image_url,
        shrinkRate: parseFloat(p.shrink_rate) || 0,
        markdownRate: parseFloat(p.markdown_rate) || 0,
        oosDays: p.oos_days || 0,
        turnoverRate: parseFloat(p.turnover_rate) || 0,
        lastRestockDate: p.last_restock_date,
        forecastedDemand: p.forecasted_demand,
      }));

      const mappedRoutes = routes.map((r: any) => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        currentRate: parseFloat(r.current_rate) || 0,
        trend: (r.trend || 'stable'),
        capacity: (r.capacity || 'moderate'),
        riskLevel: (r.risk_level || 'low'),
        historicalRates: r.historical_rates || [],
      }));

      return {
        products: mappedProducts,
        routes: mappedRoutes,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('[geminiService] Error fetching fallback data:', error);
      return null;
    }
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: "Generate a realistic supply chain scenario for a grocery retail chain. Create 15 products distributed across 3 regions (North, South, West), 5 different stores, and departments like Produce, Dairy, Bakery, Meat, Frozen, Beverages, and Pantry. Ensure no electronics or non-grocery items. Vary the stock levels to show a mix of optimal, low, excess, and critical statuses. IMPORTANT: For each product, provide 7 days of realistic historicalDemand, a relevant picsum.photos imageUrl, shrinkRate (0-10%), markdownRate (0-20%), oosDays (0-10), turnoverRate, and 7 days of forecastedDemand. For each route, provide 12 weeks of realistic historicalRates to enable trend visualization.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  currentStock: { type: Type.NUMBER },
                  avgDailyDemand: { type: Type.NUMBER },
                  leadTime: { type: Type.NUMBER },
                  safetyStock: { type: Type.NUMBER },
                  reorderPoint: { type: Type.NUMBER },
                  status: { type: Type.STRING },
                  category: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  region: { type: Type.STRING },
                  store: { type: Type.STRING },
                  department: { type: Type.STRING },
                  historicalDemand: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "Last 14 days of demand"
                  },
                  imageUrl: { type: Type.STRING, description: "A picsum.photos URL with a relevant seed" },
                  shrinkRate: { type: Type.NUMBER, description: "Percentage of inventory lost to shrink" },
                  markdownRate: { type: Type.NUMBER, description: "Percentage of inventory marked down" },
                  oosDays: { type: Type.NUMBER, description: "Days out of stock in last 30 days" },
                  turnoverRate: { type: Type.NUMBER },
                  lastRestockDate: { type: Type.STRING },
                  forecastedDemand: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER },
                    description: "Next 7 days of forecasted demand"
                  }
                },
                required: ['id', 'name', 'currentStock', 'avgDailyDemand', 'leadTime', 'safetyStock', 'reorderPoint', 'status', 'category', 'price', 'region', 'store', 'department']
              }
            },
            routes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  origin: { type: Type.STRING },
                  destination: { type: Type.STRING },
                  currentRate: { type: Type.NUMBER },
                  trend: { type: Type.STRING },
                  capacity: { type: Type.STRING },
                  riskLevel: { type: Type.STRING },
                  historicalRates: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        date: { type: Type.STRING },
                        rate: { type: Type.NUMBER }
                      },
                      required: ['date', 'rate']
                    },
                    description: "Past 12 weeks of rates"
                  }
                },
                required: ['id', 'origin', 'destination', 'currentRate', 'trend', 'capacity', 'riskLevel']
              }
            }
          },
          required: ['products', 'routes']
        }
      }
    });

    // Fix: Access text as a property
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to fetch realtime data:", error);
    return null;
  }
};
