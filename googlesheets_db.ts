import { google } from 'googleapis';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { JWT } from 'google-auth-library';
import { sheets_v4 } from 'googleapis';

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
}

let jwtClient: JWT | null = null;

// Load client secrets from a local file and authorize a JWT client
fs.readFile('credentials.json', (err: NodeJS.ErrnoException | null, content: Buffer) => {
  if (err) return console.error('Error loading client secret file:', err);
  const credentials: Credentials = JSON.parse(content.toString());
  const { client_email, private_key } = credentials;
  jwtClient = new google.auth.JWT(client_email, null, private_key, [
    'https://www.googleapis.com/auth/spreadsheets',
  ]);

  jwtClient.authorize((authErr: Error | null) => {
    if (authErr) {
      console.error('Error authorizing JWT client:', authErr);
    } else {
      console.log('Google Sheets API authorized successfully!');
    }
  });
});

// Interact with Google Sheets API helper function
async function interactWithSheet(
  action: 'get' | 'append' | 'update',
  options: ActionOptions
): Promise<sheets_v4.Schema$ValueRange> {
  if (!jwtClient) {
    throw new Error('Google Sheets not authorized. Please authorize first.');
  }

  const sheets = google.sheets({ version: 'v4', auth: jwtClient });

  return new Promise((resolve, reject) => {
    sheets.spreadsheets.values[action](options, (err: Error | null, result: sheets_v4.Schema$ValueRange | null) => {
      if (err) {
        reject(err);
      } else {
        resolve(result?.data || {});
      }
    });
  });
}

// Check if a table (sheet) exists
async function tableExists(spreadsheetId: string, tabName: string): Promise<boolean> {
  if (!jwtClient) throw new Error('Google Sheets not authorized. Please authorize first.');
  
  const sheets = google.sheets({ version: 'v4', auth: jwtClient });
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  return response.data.sheets?.some(sheet => sheet.properties?.title === tabName) || false;
}

async function getSheetId(spreadsheetId: string, tabName: string): Promise<number> {
  if (!jwtClient) throw new Error('Google Sheets not authorized. Please authorize first.');

  const sheets = google.sheets({ version: 'v4', auth: jwtClient });
  const response = await sheets.spreadsheets.get({ spreadsheetId });

  const sheet = response.data.sheets?.find(
    (sheet) => sheet.properties?.title === tabName
  );
  if (!sheet || !sheet.properties?.sheetId) {
    throw new Error(`Tab '${tabName}' not found in the spreadsheet.`);
  }

  return sheet.properties.sheetId;
}

// Retrieve headers from the specified sheet
async function getHeaders(spreadsheetId: string, tabName: string): Promise<string[]> {
  const result = await interactWithSheet('get', {
    spreadsheetId,
    range: `${tabName}!1:1`,
  });
  return result.values ? result.values[0] : [];
}

// Create a new row in the sheet
async function create(
  spreadsheetId: string,
  tableName: string,
  payload: Record<string, any>
): Promise<SheetResponse> {
  // Verify if the table exists
  if (!(await tableExists(spreadsheetId, tableName))) {
    throw new Error(`Table doesn't exist with name: ${tableName}`);
  }

  // Retrieve headers to validate payload
  const headers = await getHeaders(spreadsheetId, tableName);
  const payloadKeys = Object.keys(payload);
  const extraKeys = payloadKeys.filter(key => !headers.includes(key));

  if (extraKeys.length > 0) {
    throw new Error(
      `Invalid payload keys: ${extraKeys.join(', ')}. Ensure keys match table headers.`
    );
  }

  const newId = uuidv4();
  payload.IDs = newId;

  // Map payload data to headers
  const rowData = headers.map(header => payload[header] || '');

  // Append the row to the sheet
  await interactWithSheet('append', {
    spreadsheetId,
    range: tableName,
    valueInputOption: 'RAW',
    resource: { values: [rowData] },
  });

  return { message: 'Row created successfully!' };
}

async function updateById(
  spreadsheetId: string,
  tabName: string,
  id: string,
  payload: Record<string, any>
): Promise<SheetResponse> {
  // Retrieve all rows
  const result = await interactWithSheet('get', {
    spreadsheetId,
    range: `${tabName}!A:Z`,
  });

  const rows = result.values;
  if (!rows || rows.length === 0) {
    throw new Error(`No data found in the tab '${tabName}'.`);
  }

  // Extract headers and find the row with the given ID
  const [headers, ...dataRows] = rows;
  const idIndex = 0; // ID is always in column A
  const rowIndex = dataRows.findIndex((row) => row[idIndex] === id);
  if (rowIndex === -1) {
    throw new Error(`No row found with ID = '${id}'.`);
  }

  // Map payload to headers
  const updatedRow = [...dataRows[rowIndex]];
  for (const [key, value] of Object.entries(payload)) {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1) {
      updatedRow[colIndex] = value;
    }
  }

  // Update the row in the sheet
  await interactWithSheet('update', {
    spreadsheetId,
    range: `${tabName}!A${rowIndex + 2}:Z${rowIndex + 2}`,
    valueInputOption: 'RAW',
    resource: { values: [updatedRow] },
  });

  return { message: 'Row updated successfully!' };
}

// Delete a record by ID
async function deleteById(
  spreadsheetId: string,
  tabName: string,
  id: string
): Promise<SheetResponse> {
  if (!jwtClient) throw new Error('Google Sheets not authorized. Please authorize first.');

  // Retrieve all rows
  const result = await interactWithSheet('get', {
    spreadsheetId,
    range: `${tabName}!A:Z`,
  });

  const rows = result.values;
  if (!rows || rows.length === 0) {
    throw new Error(`No data found in the tab '${tabName}'.`);
  }

  // Find the row with the given ID
  const idIndex = 0; // ID is always in column A
  const rowIndex = rows.findIndex((row) => row[idIndex] === id);
  if (rowIndex === -1) {
    throw new Error(`No row found with ID = '${id}'.`);
  }

  // Use batchUpdate to delete the row
  const sheets = google.sheets({ version: 'v4', auth: jwtClient });
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: await getSheetId(spreadsheetId, tabName),
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });

  return { message: `Row with ID '${id}' deleted successfully!` };
}

export { create, updateById, deleteById, getHeaders, interactWithSheet };