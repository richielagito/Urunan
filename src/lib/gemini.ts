/**
 * Gemini Receipt OCR Parsing Service
 * Calls the Google Gemini 2.5 Flash-Lite API directly from the client.
 * 
 * Features:
 * - Extracts items, tax, service charge, discount, other fees, and bill name
 * - Client-side image preprocessing for improved OCR accuracy
 * - Optimized prompts for Indonesian receipt formats
 */

import { preprocessReceiptImage } from "./imagePreprocess";

export interface ParsedItem {
  name: string;
  price: number;
  quantity: number;
}

export interface OtherFee {
  label: string;
  amount: number;
}

export interface GeminiReceiptResult {
  items: ParsedItem[];
  tax: number;
  serviceCharge: number;
  discount: number;
  otherFees: OtherFee[];
  billName: string;
}

/**
 * Converts a File or Blob to a base64 encoded string and extracts the mimeType.
 */
function fileToBase64(source: File | Blob): Promise<{ mimeType: string; base64Data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const parts = reader.result.split(",");
        const base64Data = parts[1] || "";
        const mimeType = (source instanceof File ? source.type : source.type) || "image/jpeg";
        resolve({ mimeType, base64Data });
      } else {
        reject(new Error("Failed to read file as base64 string"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(source);
  });
}

/**
 * Parses a receipt image file using the Gemini 2.5 Flash-Lite API.
 * Applies client-side image preprocessing before sending to improve OCR accuracy.
 * Returns parsed items along with detected tax, service charge, discount, other fees, and bill name.
 */
export async function parseReceiptWithGemini(file: File, apiKey: string): Promise<GeminiReceiptResult> {
  if (!apiKey) {
    throw new Error("Gemini API Key is required. Please set it in Settings.");
  }

  // 1. Preprocess image for better OCR accuracy
  let processedImage: File | Blob;
  try {
    processedImage = await preprocessReceiptImage(file);
  } catch (err) {
    // If preprocessing fails, fall back to the original file
    console.warn("Image preprocessing failed, using original:", err);
    processedImage = file;
  }

  // 2. Convert to base64 inline data
  const { mimeType, base64Data } = await fileToBase64(processedImage);

  // 3. Prepare the endpoint
  const modelName = "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // 4. Assemble system instructions and multimodal prompt
  const systemInstruction =
    "You are an expert receipt parser specializing in Indonesian restaurant bills (struk/bon). " +
    "Your task is to extract structured data from receipt images with high precision.\n\n" +
    "EXTRACTION RULES:\n\n" +
    "1. BILL NAME (billName):\n" +
    "   - Extract the restaurant or establishment name from the receipt header (usually the first 1-3 lines of text, often in larger font or bold).\n" +
    "   - Common formats: 'RESTORAN ABC', 'Cafe XYZ', 'Warung Makan Sederhana', etc.\n" +
    "   - Do NOT include addresses, phone numbers, or taglines — only the business name.\n" +
    "   - If you cannot identify the name, return an empty string.\n\n" +
    "2. ITEMS:\n" +
    "   - Extract each purchased item with its name, unit price, and quantity.\n" +
    "   - Convert item names to Title Case and keep them concise (max ~30 chars).\n" +
    "   - If the receipt shows a total line price and quantity, compute the unit price = total / quantity.\n" +
    "   - Merge multi-line items (e.g. item name on one line, price on the next) into a single item.\n" +
    "   - Do NOT include modifier lines (e.g. 'Extra Cheese', 'Level 5') as separate items — append them to the parent item name.\n" +
    "   - Do NOT include subtotal, total, change, payment method, or summary lines as items.\n" +
    "   - Handle Indonesian number formats: periods as thousand separators (e.g. '135.000' = 135000), commas as decimals.\n\n" +
    "3. TAX (tax):\n" +
    "   - Look for lines labeled: 'tax', 'pajak', 'PPN', 'PB1', 'VAT', 'PPh', or similar.\n" +
    "   - Return the ABSOLUTE tax amount as a number (not percentage). Return 0 if not found.\n\n" +
    "4. SERVICE CHARGE (serviceCharge):\n" +
    "   - Look for lines labeled: 'service', 'service charge', 'biaya layanan', 'SC', or similar.\n" +
    "   - Return the ABSOLUTE service charge amount as a number. Return 0 if not found.\n\n" +
    "5. DISCOUNT (discount):\n" +
    "   - Look for lines labeled: 'diskon', 'discount', 'potongan', 'promo', 'voucher', 'member disc', 'potongan harga', or similar.\n" +
    "   - Discounts are usually shown as negative values or with a minus sign on the receipt.\n" +
    "   - Return the discount as a POSITIVE number (absolute value). Return 0 if not found.\n" +
    "   - If there are multiple discount lines, sum them all.\n\n" +
    "6. OTHER FEES (otherFees):\n" +
    "   - Look for additional charges that are NOT tax or service charge:\n" +
    "     'pembulatan' (rounding), 'delivery', 'ongkir' (shipping), 'kemasan' (packaging),\n" +
    "     'takeaway', 'biaya platform', 'tip', 'gratuity', or any other labeled fee.\n" +
    "   - Return each as an object with { label, amount }.\n" +
    "   - Use a clean, concise label for each fee.\n" +
    "   - If none found, return an empty array.\n\n" +
    "IMPORTANT: Be precise with numbers. Double-check that item prices × quantities are reasonable " +
    "and match what's visible on the receipt. When in doubt about a faded or unclear character, " +
    "make your best inference from context (e.g. if other items are in thousands, a '1' is likely '1000').";

  const body = {
    contents: [
      {
        parts: [
          {
            text: "Parse this receipt image completely. Extract the restaurant name, all items with prices, tax, service charge, " +
                  "any discounts, and any other miscellaneous fees. Return the structured JSON matching the schema."
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
          billName: {
            type: "STRING",
            description: "Restaurant or establishment name from the receipt header. Empty string if not identifiable."
          },
          items: {
            type: "ARRAY",
            description: "List of purchased items parsed from the receipt",
            items: {
              type: "OBJECT",
              properties: {
                name: {
                  type: "STRING",
                  description: "Clean, concise item name in Title Case (e.g. 'Nasi Goreng Spesial')"
                },
                price: {
                  type: "NUMBER",
                  description: "Unit price of a single item (if receipt shows total, divide by quantity)"
                },
                quantity: {
                  type: "NUMBER",
                  description: "Number of units purchased (default 1)"
                }
              },
              required: ["name", "price", "quantity"]
            }
          },
          tax: {
            type: "NUMBER",
            description: "Total tax amount (PPN/PB1/VAT) as absolute number. Return 0 if not found."
          },
          serviceCharge: {
            type: "NUMBER",
            description: "Total service charge as absolute number. Return 0 if not found."
          },
          discount: {
            type: "NUMBER",
            description: "Total discount as a POSITIVE number (absolute value). Return 0 if not found."
          },
          otherFees: {
            type: "ARRAY",
            description: "List of other miscellaneous fees (packaging, delivery, rounding, etc.). Empty array if none.",
            items: {
              type: "OBJECT",
              properties: {
                label: {
                  type: "STRING",
                  description: "Clean label for the fee (e.g. 'Pembulatan', 'Biaya Kemasan')"
                },
                amount: {
                  type: "NUMBER",
                  description: "The fee amount as a number"
                }
              },
              required: ["label", "amount"]
            }
          }
        },
        required: ["items", "tax", "serviceCharge", "discount", "otherFees", "billName"]
      }
    }
  };

  // 5. Send request
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
  
  // 6. Extract JSON string from response
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
        serviceCharge: parsedJson.serviceCharge || 0,
        discount: parsedJson.discount || 0,
        otherFees: Array.isArray(parsedJson.otherFees) ? parsedJson.otherFees : [],
        billName: (parsedJson.billName || "").trim()
      };
    } else {
      throw new Error("Invalid response format: 'items' array missing");
    }
  } catch (err) {
    console.error("Failed to parse Gemini output text to JSON:", err, result);
    throw new Error("Could not parse receipt contents. Make sure the image is clear and try again.");
  }
}
