import { google, sheets_v4 } from "googleapis";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { JWT } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

// Interfaces
interface Credentials {
  client_email: string;
  private_key: string;
}

interface ActionOptions {
  spreadsheetId: string;
  range: string;
  valueInputOption?: string;
  resource?: {
    values: any[][];
  };
}

interface SheetResponse {
  message: string;
  data?: any;
}

// Global JWT client
let jwtClient: JWT | null = null;

/**
 * Initialize the JWT client for Google Sheets API
 */
const initializeJwtClient = async (): Promise<JWT> => {
  try {
    const content = await fs.promises.readFile("credentials.json");
    const credentials: Credentials = JSON.parse(content.toString());
    const { client_email, private_key } = credentials;

    const client = new google.auth.JWT(client_email, undefined, private_key, ["https://www.googleapis.com/auth/spreadsheets"]);

    await client.authorize();
    console.log("Google Sheets API authorized successfully!");
    return client;
  } catch (error) {
    console.error("Error initializing JWT client:", error);
    throw error;
  }
};

/**
 * Get Google Sheets instance
 */
const getSheetsInstance = async () => {
  if (!jwtClient) {
    jwtClient = await initializeJwtClient();
  }
  return google.sheets({ version: "v4", auth: jwtClient });
};

/**
 * Interact with Google Sheets API
 */
async function interactWithSheet(action: "get" | "append" | "update", options: ActionOptions): Promise<sheets_v4.Schema$ValueRange> {
  const sheets = await getSheetsInstance();

  try {
    let response;
    switch (action) {
      case "get":
        response = await sheets.spreadsheets.values.get(options);
        break;
      case "append":
        response = await sheets.spreadsheets.values.append(options);
        break;
      case "update":
        response = await sheets.spreadsheets.values.update(options);
        break;
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
    return response.data;
  } catch (error) {
    console.error(`Error in ${action} operation:`, error);
    throw error;
  }
}

/**
 * Check if a table (sheet) exists
 */
async function tableExists(spreadsheetId: string, tabName: string): Promise<boolean> {
  const sheets = await getSheetsInstance();
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  return response.data.sheets?.some((sheet) => sheet.properties?.title === tabName) || false;
}

/**
 * Get sheet ID by name
 */
async function getSheetId(spreadsheetId: string, tabName: string): Promise<number> {
  const sheets = await getSheetsInstance();
  const response = await sheets.spreadsheets.get({ spreadsheetId });

  const sheet = response.data.sheets?.find((sheet) => sheet.properties?.title === tabName);
  if (!sheet || !sheet.properties?.sheetId) {
    throw new Error(`Tab '${tabName}' not found in the spreadsheet.`);
  }

  return sheet.properties.sheetId;
}

/**
 * Get headers from the sheet
 */
async function getHeaders(spreadsheetId: string, tabName: string): Promise<string[]> {
  const result = await interactWithSheet("get", {
    spreadsheetId,
    range: `${tabName}!1:1`,
  });
  return result.values ? result.values[0] : [];
}

/**
 * Get all data from a sheet
 */
async function getAllData(spreadsheetId: string, tabName: string): Promise<any[]> {
  const result = await interactWithSheet("get", {
    spreadsheetId,
    range: `${tabName}!A:Z`,
  });

  if (!result.values || result.values.length <= 1) {
    return [];
  }

  const [headers, ...rows] = result.values;
  return rows.map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || "";
    });
    return obj;
  });
}

/**
 * Get data by ID
 */
async function getById(spreadsheetId: string, tabName: string, id: string): Promise<any> {
  const allData = await getAllData(spreadsheetId, tabName);
  return allData.find((row) => row.IDs === id);
}

/**
 * Create a new row
 */
async function create(spreadsheetId: string, tableName: string, payload: Record<string, any>): Promise<SheetResponse> {
  try {
    const exists = await tableExists(spreadsheetId, tableName);
    if (!exists) {
      throw new Error(`Table doesn't exist with name: ${tableName}`);
    }

    const headers = await getHeaders(spreadsheetId, tableName);
    const payloadKeys = Object.keys(payload);
    const extraKeys = payloadKeys.filter((key) => !headers.includes(key));

    if (extraKeys.length > 0) {
      throw new Error(`Invalid payload keys: ${extraKeys.join(", ")}. Ensure keys match table headers.`);
    }

    const newId = uuidv4();
    payload.ID = newId;

    const rowData = headers.map((header) => payload[header] || "");

    await interactWithSheet("append", {
      spreadsheetId,
      range: tableName,
      valueInputOption: "RAW",
      resource: { values: [rowData] },
    });

    return {
      message: "Row created successfully!",
      data: { id: newId, ...payload },
    };
  } catch (error) {
    console.error("Error in create operation:", error);
    throw error;
  }
}

/**
 * Update a row by ID
 */
async function updateById(spreadsheetId: string, tabName: string, id: string, payload: Record<string, any>): Promise<SheetResponse> {
  try {
    const result = await interactWithSheet("get", {
      spreadsheetId,
      range: `${tabName}!A:Z`,
    });

    if (!result.values || result.values.length === 0) {
      throw new Error(`No data found in the tab '${tabName}'.`);
    }

    const [headers, ...dataRows] = result.values;
    const idIndex = headers.indexOf("IDs");
    const rowIndex = dataRows.findIndex((row) => row[idIndex] === id);

    if (rowIndex === -1) {
      throw new Error(`No row found with ID = '${id}'.`);
    }

    const updatedRow = [...dataRows[rowIndex]];
    for (const [key, value] of Object.entries(payload)) {
      const colIndex = headers.indexOf(key);
      if (colIndex !== -1) {
        updatedRow[colIndex] = value;
      }
    }

    await interactWithSheet("update", {
      spreadsheetId,
      range: `${tabName}!A${rowIndex + 2}:${String.fromCharCode(65 + headers.length - 1)}${rowIndex + 2}`,
      valueInputOption: "RAW",
      resource: { values: [updatedRow] },
    });

    return {
      message: "Row updated successfully!",
      data: headers.reduce((obj, header, index) => {
        obj[header] = updatedRow[index];
        return obj;
      }, {} as Record<string, any>),
    };
  } catch (error) {
    console.error("Error in update operation:", error);
    throw error;
  }
}

/**
 * Delete a row by ID
 */
async function deleteById(spreadsheetId: string, tabName: string, id: string): Promise<SheetResponse> {
  try {
    const sheets = await getSheetsInstance();
    const result = await interactWithSheet("get", {
      spreadsheetId,
      range: `${tabName}!A:Z`,
    });

    if (!result.values || result.values.length === 0) {
      throw new Error(`No data found in the tab '${tabName}'.`);
    }

    const [headers, ...dataRows] = result.values;
    const idIndex = headers.indexOf("IDs");
    const rowIndex = dataRows.findIndex((row) => row[idIndex] === id);

    if (rowIndex === -1) {
      throw new Error(`No row found with ID = '${id}'.`);
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: await getSheetId(spreadsheetId, tabName),
                dimension: "ROWS",
                startIndex: rowIndex + 1,
                endIndex: rowIndex + 2,
              },
            },
          },
        ],
      },
    });

    return { message: `Row with ID '${id}' deleted successfully!` };
  } catch (error) {
    console.error("Error in delete operation:", error);
    throw error;
  }
}

// Export all functions
export { create, updateById, deleteById, getHeaders, getAllData, getById, tableExists, interactWithSheet };
