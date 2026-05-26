/**
 * Gemini Receipt OCR Parsing Service
 * Calls the Google Gemini 2.5 Flash-Lite API directly from the client.
 */

export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
}

export interface GeminiReceiptResult {
  items: ParsedItem[];
  tax: number;
  serviceCharge: number;
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
 * Returns parsed items along with detected tax and service charge amounts.
 */
export async function parseReceiptWithGemini(file: File, apiKey: string): Promise<GeminiReceiptResult> {
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
    "individual purchased items, plus any tax and service charge amounts. " +
    "For items: extract the item name, its unit price (or total price of the line divided by quantity), " +
    "and the quantity. Convert all item names to title case and keep them concise. " +
    "For tax: look for lines labeled 'tax', 'pajak', 'PPN', 'PB1', 'VAT', or similar. Return the total tax amount as a number. " +
    "For service charge: look for lines labeled 'service', 'service charge', 'biaya layanan', 'SC', or similar. Return the total service charge amount as a number. " +
    "If tax or service charge is not found on the receipt, return 0 for that field. " +
    "Do NOT include tax, service charge, tips, discounts, or total/subtotal lines as item lines.";

  const body = {
    contents: [
      {
        parts: [
          {
            text: "Extract all items, quantities, prices, tax, and service charge from this receipt image. " +
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
          },
          tax: {
            type: "NUMBER",
            description: "Total tax amount on the receipt (e.g. PPN, PB1, VAT). Return 0 if not found."
          },
          serviceCharge: {
            type: "NUMBER",
            description: "Total service charge amount on the receipt. Return 0 if not found."
          }
        },
        required: ["items", "tax", "serviceCharge"]
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

    const parsedJson = JSON.parse(textResponse) as GeminiReceiptResult;
    if (parsedJson && Array.isArray(parsedJson.items)) {
      return {
        items: parsedJson.items,
        tax: parsedJson.tax || 0,
        serviceCharge: parsedJson.serviceCharge || 0
      };
    } else {
      throw new Error("Invalid response format: 'items' array missing");
    }
  } catch (err) {
    console.error("Failed to parse Gemini output text to JSON:", err, result);
    throw new Error("Could not parse receipt contents. Make sure the image is clear and try again.");
  }
}
