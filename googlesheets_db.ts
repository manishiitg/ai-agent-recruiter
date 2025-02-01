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

    const client = new google.auth.JWT(
      client_email,
      undefined,
      private_key,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );

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
async function interactWithSheet(
  action: "get" | "append" | "update",
  options: ActionOptions
): Promise<sheets_v4.Schema$ValueRange | null> {
  const sheets = await getSheetsInstance();

  try {
    let response;
    switch (action) {
      case "get":
        response = await sheets.spreadsheets.values.get(options);
        return response.data;
      case "append":
        response = await sheets.spreadsheets.values.append(options);
        return response.data.updates?.updatedData || null;
      case "update":
        response = await sheets.spreadsheets.values.update(options);
        return {
          majorDimension: "ROWS",
          range: options.range,
          values: options.resource?.values || [],
        };
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
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

  const sheet = response.data.sheets?.find(
    (sheet) => sheet.properties?.title === tabName
  );
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
  return result?.values ? result.values[0] || [] : [];
}

/**
 * Get all data from a sheet
 */
async function getAllData(spreadsheetId: string, tabName: string): Promise<any[]> {
  const result = await interactWithSheet("get", {
    spreadsheetId,
    range: `${tabName}!A:Z`,
  });

  if (!result?.values || result.values.length <= 1) {
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
  return allData.find((row) => row.ID === id);
}

/**
 * Create a new row with unique ID or Email constraint
 */
async function create(
  spreadsheetId: string,
  tableName: string,
  payload: Record<string, any>
): Promise<SheetResponse> {
  try {
    // Check if payload is empty or missing
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("Payload is empty or missing.");
    }

    const exists = await tableExists(spreadsheetId, tableName);
    if (!exists) {
      throw new Error(`Table doesn't exist with name: ${tableName}`);
    }

    const headers = await getHeaders(spreadsheetId, tableName);
    const payloadKeys = Object.keys(payload);
    const extraKeys = payloadKeys.filter((key) => !headers.includes(key));

    if (extraKeys.length > 0) {
      throw new Error(
        `Invalid payload keys: ${extraKeys.join(", ")}. Ensure keys match table headers.`
      );
    }

    const allData = await getAllData(spreadsheetId, tableName);

    // Check for duplicate ID or Email
    const duplicate = allData.find(
      (row) => row.ID === payload.ID || row.Email === payload.Email
    );

    if (duplicate) {
      throw new Error(`Duplicate entry found. A row with the same ID or Email already exists.`);
    }

    // Assign a unique ID if not provided
    if (!payload.ID) {
      payload.ID = uuidv4();
    }

    const rowData = headers.map((header) => payload[header] || "");

    const result = await interactWithSheet("append", {
      spreadsheetId,
      range: tableName,
      valueInputOption: "RAW",
      resource: { values: [rowData] },
    });

    return {
      message: "Row created successfully!",
      data: { id: payload.ID, ...payload },
    };
  } catch (error) {
    console.error("Error in create operation:", error);
    throw error;
  }
}

/**
 * Update a row by ID
 */
async function updateById(
  spreadsheetId: string,
  tabName: string,
  id: string,
  payload: Record<string, any>
): Promise<SheetResponse> {
  try {
    // Check if payload is empty or missing
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("Payload is empty or missing.");
    }

    const result = await interactWithSheet("get", {
      spreadsheetId,
      range: `${tabName}!A:Z`,
    });

    if (!result?.values || result.values.length === 0) {
      throw new Error(`No data found in the tab '${tabName}'.`);
    }

    const [headers, ...dataRows] = result.values;
    const idIndex = headers.indexOf("ID");
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

    const updateResult = await interactWithSheet("update", {
      spreadsheetId,
      range: `${tabName}!A${rowIndex + 2}:${String.fromCharCode(65 + headers.length - 1)}${
        rowIndex + 2
      }`,
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
async function deleteById(
  spreadsheetId: string,
  tabName: string,
  id: string
): Promise<SheetResponse> {
  try {
    const sheets = await getSheetsInstance();
    const result = await interactWithSheet("get", {
      spreadsheetId,
      range: `${tabName}!A:Z`,
    });

    if (!result?.values || result.values.length === 0) {
      throw new Error(`No data found in the tab '${tabName}'.`);
    }

    const [headers, ...dataRows] = result.values;
    const idIndex = headers.indexOf("ID");
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

/**
 * Get ID by email
 */
async function getIdByEmail(
  spreadsheetId: string,
  tabName: string,
  email: string
): Promise<string> {
  const allData = await getAllData(spreadsheetId, tabName);
  const row = allData.find((row) => row.Email === email);

  if (!row) {
    throw new Error(`No row found with Email = '${email}'.`);
  }

  return row.ID;
}

/**
 * Get data by email
 */
async function getByEmail(
  spreadsheetId: string,
  tabName: string,
  email: string
): Promise<any> {
  const id = await getIdByEmail(spreadsheetId, tabName, email);
  return getById(spreadsheetId, tabName, id);
}

/**
 * Update a row by email
 */
async function updateByEmail(
  spreadsheetId: string,
  tabName: string,
  email: string,
  payload: Record<string, any>
): Promise<SheetResponse> {
  // Check if payload is empty or missing
  if (!payload || Object.keys(payload).length === 0) {
    throw new Error("Payload is empty or missing.");
  }

  const id = await getIdByEmail(spreadsheetId, tabName, email);
  return updateById(spreadsheetId, tabName, id, payload);
}

/**
 * Delete a row by email
 */
async function deleteByEmail(
  spreadsheetId: string,
  tabName: string,
  email: string
): Promise<SheetResponse> {
  const id = await getIdByEmail(spreadsheetId, tabName, email);
  return deleteById(spreadsheetId, tabName, id);
}

/**
 * Create a new row with unique ID or Email in a given tab
 */
async function createRowInTab(
  spreadsheetId: string,
  tableName: string,
  payload: Record<string, any>
): Promise<SheetResponse> {
  try {
    // Check if payload is empty or missing
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("Payload is empty or missing.");
    }

    const exists = await tableExists(spreadsheetId, tableName);
    if (!exists) {
      throw new Error(`Table doesn't exist with name: ${tableName}`);
    }

    const headers = await getHeaders(spreadsheetId, tableName);
    const allData = await getAllData(spreadsheetId, tableName);

    // Check for duplicate ID or Email
    const duplicate = allData.find(
      (row) => row.ID === payload.ID || row.Email === payload.Email
    );

    if (duplicate) {
      throw new Error(`Duplicate entry found. A row with the same ID or Email already exists.`);
    }

    // Assign a unique ID if not provided
    if (!payload.ID) {
      payload.ID = uuidv4();
    }

    const rowData = headers.map((header) => payload[header] || "");

    await interactWithSheet("append", {
      spreadsheetId,
      range: tableName,
      valueInputOption: "RAW",
      resource: { values: [rowData] },
    });

    return {
      message: "Row created successfully!",
      data: { id: payload.ID, ...payload },
    };
  } catch (error) {
    console.error("Error in createRowInTab:", error);
    throw error;
  }
}

/**
 * Update an existing row based on ID or Email
 */
async function updateRowInTab(
  spreadsheetId: string,
  tableName: string,
  identifier: { ID?: string; Email?: string },
  payload: Record<string, any>
): Promise<SheetResponse> {
  try {
    // Check if payload is empty or missing
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("Payload is empty or missing.");
    }

    const exists = await tableExists(spreadsheetId, tableName);
    if (!exists) {
      throw new Error(`Table doesn't exist with name: ${tableName}`);
    }

    const headers = await getHeaders(spreadsheetId, tableName);
    const allData = await getAllData(spreadsheetId, tableName);

    // Find row index by ID or Email
    const rowIndex = allData.findIndex(
      (row) => row.ID === identifier.ID || row.Email === identifier.Email
    );

    if (rowIndex === -1) {
      throw new Error(`No row found with the given ID or Email.`);
    }

    // Update values based on payload
    headers.forEach((header) => {
      if (payload[header] !== undefined) {
        allData[rowIndex][header] = payload[header];
      }
    });

    await interactWithSheet("update", {
      spreadsheetId,
      range: `${tableName}!A${rowIndex + 2}`,
      valueInputOption: "RAW",
      resource: { values: [Object.values(allData[rowIndex])] },
    });

    return { message: "Row updated successfully!", data: allData[rowIndex] };
  } catch (error) {
    console.error("Error in updateRowInTab:", error);
    throw error;
  }
}

/**
 * Delete a row based on ID or Email (by clearing its contents)
 */
async function deleteRowInTab(
  spreadsheetId: string,
  tableName: string,
  identifier: { ID?: string; Email?: string }
): Promise<SheetResponse> {
  try {
    const exists = await tableExists(spreadsheetId, tableName);
    if (!exists) {
      throw new Error(`Table doesn't exist with name: ${tableName}`);
    }

    const allData = await getAllData(spreadsheetId, tableName);

    // Find row index by ID or Email
    const rowIndex = allData.findIndex(
      (row) => row.ID === identifier.ID || row.Email === identifier.Email
    );

    if (rowIndex === -1) {
      throw new Error(`No row found with the given ID or Email.`);
    }

    // Clear the row contents (leaves an empty row)
    await interactWithSheet("update", {
      spreadsheetId,
      range: `${tableName}!A${rowIndex + 2}:Z${rowIndex + 2}`, // Adjust range as needed
      valueInputOption: "RAW",
      resource: { values: [[""]] }, // Clears the row
    });

    return { message: "Row cleared successfully!" };
  } catch (error) {
    console.error("Error in deleteRowInTab:", error);
    throw error;
  }
}

interface UpdateIdentifier {
  ID?: string;
  Email?: string;
}

interface RowData {
  ID: string;
  Email: string;
  [key: string]: any;
}

async function updateMultipleUsersInTab(
  spreadsheetId: string,
  tabName: string,
  updates: Array<{ identifier: UpdateIdentifier; payload: Record<string, any> }>
): Promise<SheetResponse> {
  try {
    if (!updates || updates.length === 0) {
      throw new Error("No updates provided. Please provide at least one update.");
    }

    const exists = await tableExists(spreadsheetId, tabName);
    if (!exists) {
      throw new Error(`Table doesn't exist with name: ${tabName}`);
    }

    const allData = await getAllData(spreadsheetId, tabName) as RowData[];
    const headers = await getHeaders(spreadsheetId, tabName);
    
    const batchUpdateRequests: sheets_v4.Schema$Request[] = [];
    
    for (const update of updates) {
      const { identifier, payload } = update;
      
      if (!payload || Object.keys(payload).length === 0) {
        console.warn(`Skipping update for identifier ${JSON.stringify(identifier)}: Payload is empty.`);
        continue;
      }

      const rowIndex = allData.findIndex(
        (row) => row.ID === identifier.ID || row.Email === identifier.Email
      );

      if (rowIndex === -1) {
        console.warn(`Skipping update for identifier ${JSON.stringify(identifier)}: No matching row found.`);
        continue;
      }

      // Create a copy of the row data as an object
      const rowDataObject = { ...allData[rowIndex] };
      
      // Update the values in the object
      for (const [key, value] of Object.entries(payload)) {
        if (headers.includes(key)) {
          rowDataObject[key] = value;
        }
      }

      // Convert the object back to an array matching headers order
      const updatedRowValues = headers.map(header => rowDataObject[header] || "");

      batchUpdateRequests.push({
        updateCells: {
          range: {
            sheetId: await getSheetId(spreadsheetId, tabName),
            startRowIndex: rowIndex + 1, // Rows are 0-indexed, and the header is row 0
            endRowIndex: rowIndex + 2,
            startColumnIndex: 0,
            endColumnIndex: headers.length,
          },
          rows: [
            {
              values: updatedRowValues.map(value => ({
                userEnteredValue: { stringValue: String(value) },
              })),
            },
          ],
          fields: "*", // Update all fields
        },
      });
    }

    if (batchUpdateRequests.length === 0) {
      return { message: "No valid updates were applied." };
    }

    const sheets = await getSheetsInstance();
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: batchUpdateRequests,
      },
    });

    return {
      message: "Batch update completed successfully!",
      data: updates.map((update) => update.payload),
    };
  } catch (error) {
    console.error("Error in updateMultipleUsersInTab:", error);
    throw error;
  }
}

// Export all functions
export {
  create,
  updateById,
  deleteById,
  getHeaders,
  getAllData,
  getById,
  tableExists,
  getSheetId,
  getIdByEmail,
  getByEmail,
  updateByEmail,
  deleteByEmail,
  interactWithSheet,
  createRowInTab,
  deleteRowInTab,
  updateRowInTab,
  updateMultipleUsersInTab,
};