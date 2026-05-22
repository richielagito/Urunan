/**
 * Gemini Receipt OCR Parsing Service
 * Calls the Google Gemini 2.5 Flash-Lite API directly from the client.
 */

export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
}

export interface GeminiResponse {
  items: ParsedItem[];
}

/**
 * Converts a File object to a base64 encoded string and extracts the mimeType.
 */
function fileToBase64(file: File): Promise<{ mimeType: string; base64Data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const parts = reader.result.split(",");
        const base64Data = parts[1] || "";
        const mimeType = file.type || "image/jpeg";
        resolve({ mimeType, base64Data });
      } else {
        reject(new Error("Failed to read file as base64 string"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Parses a receipt image file using the Gemini 2.5 Flash-Lite API.
 */
export async function parseReceiptWithGemini(file: File, apiKey: string): Promise<ParsedItem[]> {
  if (!apiKey) {
    throw new Error("Gemini API Key is required. Please set it in Settings.");
  }

  // 1. Convert file to base64 inline data
  const { mimeType, base64Data } = await fileToBase64(file);

  // 2. Prepare the endpoint
  const modelName = "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // 3. Assemble system instructions and multimodal prompt
  const systemInstruction = 
    "You are an expert receipt parsing assistant. Your task is to look at the receipt image and extract " +
    "individual purchased items. Extract the item name, its unit price (or total price of the line divided by quantity), " +
    "and the quantity. Do not include taxes, service charges, tips, or total summaries as item lines. " +
    "Instead, parse only actual items purchased. Convert all item names to title case and keep them concise.";

  const body = {
    contents: [
      {
        parts: [
          {
            text: "Extract all items, quantities, and prices from this receipt image. " +
                  "Return only the structured JSON representation matching the requested schema."
          },
          {
            inlineData: {
              mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        {
          text: systemInstruction
        }
      ]
    },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          items: {
            type: "ARRAY",
            description: "List of items parsed from the receipt",
            items: {
              type: "OBJECT",
              properties: {
                name: {
                  type: "STRING",
                  description: "Clean, brief name of the item (e.g. 'Wood-Fired Pizza')"
                },
                price: {
                  type: "NUMBER",
                  description: "The individual price of a single unit of this item"
                },
                quantity: {
                  type: "NUMBER",
                  description: "The number of units purchased (default is 1)"
                }
              },
              required: ["name", "price", "quantity"]
            }
          }
        },
        required: ["items"]
      }
    }
  };

  // 4. Send request
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API Error details:", errorText);
    throw new Error(`Gemini API request failed with status ${response.status}. Please check your API key.`);
  }

  const result = await response.json();
  
  // 5. Extract JSON string from response
  try {
    const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
      throw new Error("Empty text response from Gemini API");
    }

    const parsedJson = JSON.parse(textResponse) as GeminiResponse;
    if (parsedJson && Array.isArray(parsedJson.items)) {
      return parsedJson.items;
    } else {
      throw new Error("Invalid response format: 'items' array missing");
    }
  } catch (err) {
    console.error("Failed to parse Gemini output text to JSON:", err, result);
    throw new Error("Could not parse receipt contents. Make sure the image is clear and try again.");
  }
}

/**
 * Mock Receipt Parser Presets to experience the application immediately without an API Key.
 */
export const MOCK_RECEIPTS = [
  {
    name: "🍕 Makan Malam Pizza Parlor",
    items: [
      { name: "Pizza Margherita Gede", price: 120000, quantity: 1 },
      { name: "Kentang Goreng Truffle", price: 45000, quantity: 1 },
      { name: "Salad Caesar Seger", price: 55000, quantity: 2 },
      { name: "Bir Craft Segelas", price: 70000, quantity: 4 },
      { name: "Es Gelato Satu Cup", price: 35000, quantity: 3 }
    ]
  },
  {
    name: "☕ Kopi & Nongkrong Cantik",
    items: [
      { name: "Roti Panggang Alpukat Sourdough", price: 65000, quantity: 2 },
      { name: "Eggs Benedict Royale Mewah", price: 85000, quantity: 1 },
      { name: "Es Caramel Macchiato", price: 45000, quantity: 2 },
      { name: "Matcha Latte Anget", price: 40000, quantity: 1 },
      { name: "Croissant Cokelat Lembut", price: 25000, quantity: 3 }
    ]
  },
  {
    name: "🛒 Belanja Cemilan & Bulanan",
    items: [
      { name: "Bluberi Organik Manis", price: 45000, quantity: 2 },
      { name: "Yogurt Yunani Satu Bak", price: 65000, quantity: 1 },
      { name: "Granola Cokelat Chip", price: 55000, quantity: 1 },
      { name: "Susu Almond 1L", price: 35000, quantity: 2 },
      { name: "Air Soda Dus-dusan", price: 28000, quantity: 1 }
    ]
  }
];
