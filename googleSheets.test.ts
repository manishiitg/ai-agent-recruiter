// import { create } from "./googlesheets_db";
// import { google } from "googleapis";
// import { JWT } from "google-auth-library";

// // Mock the Google Sheets API and other dependencies
// jest.mock("googleapis");
// jest.mock("google-auth-library");

// // Create a mocked version of the JWT class
// const mockJWT = jest.mocked(JWT);

// describe("create function", () => {
//   const spreadsheetId = "1DrYojwFWr-MUydJdE7E-zsqLV4lPGXz100q2QLx6Y9M";
//   const tableName = "PROFILE";
//   const payload = {
//     NAME: "John Doe",
//     EMAIL: "john.doe@example.com",
//     ADDRESS: "123 Main St",
//     RESUME: "https://example.com/resume.pdf"
//   };

//   // Mock sheets instance
//   const mockSheets = {
//     spreadsheets: {
//       get: jest.fn(),
//       values: {
//         get: jest.fn(),
//         append: jest.fn(),
//       },
//     },
//   };

//   beforeEach(() => {
//     // Clear all mocks before each test
//     jest.clearAllMocks();

//     // Mock the authorize method of JWT
//     mockJWT.prototype.authorize = jest.fn().mockResolvedValue(undefined);

//     // Setup basic mock responses
//     (google.sheets as jest.Mock).mockReturnValue(mockSheets);

//     // Mock table exists check
//     mockSheets.spreadsheets.get.mockResolvedValue({
//       data: {
//         sheets: [
//           {
//             properties: {
//               title: tableName,
//               sheetId: 0,
//             },
//           },
//         ],
//       },
//     });

//     // Mock headers response with actual sheet headers
//     mockSheets.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: [["ID", "NAME", "EMAIL", "ADDRESS", "RESUME"]],
//       },
//     });
//   });

//   it("should create a new row in the specified tab", async () => {
//     // Mock successful append operation
//     mockSheets.spreadsheets.values.append.mockResolvedValue({
//       data: {
//         updates: {
//           updatedData: {
//             values: [[
//               expect.any(String),
//               "John Doe",
//               "john.doe@example.com",
//               "123 Main St",
//               "https://example.com/resume.pdf"
//             ]],
//           },
//         },
//       },
//     });

//     // Call the create function
//     const result = await create(spreadsheetId, tableName, payload);

//     // Verify table existence check
//     expect(mockSheets.spreadsheets.get).toHaveBeenCalledWith({
//       spreadsheetId,
//     });

//     // Verify headers retrieval
//     expect(mockSheets.spreadsheets.values.get).toHaveBeenCalledWith({
//       spreadsheetId,
//       range: `${tableName}!1:1`,
//     });

//     // Verify append operation
//     expect(mockSheets.spreadsheets.values.append).toHaveBeenCalledWith({
//       spreadsheetId,
//       range: tableName,
//       valueInputOption: "RAW",
//       resource: {
//         values: expect.arrayContaining([
//           expect.arrayContaining([
//             expect.any(String), // ID
//             "John Doe",
//             "john.doe@example.com",
//             "123 Main St",
//             "https://example.com/resume.pdf"
//           ]),
//         ]),
//       },
//     });

//     // Verify response structure
//     expect(result).toEqual({
//       message: "Row created successfully!",
//       data: expect.objectContaining({
//         ID: expect.any(String),
//         ...payload,
//       }),
//     });
//   });

//   it("should handle non-existent table", async () => {
//     // Mock table doesn't exist
//     mockSheets.spreadsheets.get.mockResolvedValue({
//       data: {
//         sheets: [
//           {
//             properties: {
//               title: "OtherTable",
//               sheetId: 0,
//             },
//           },
//         ],
//       },
//     });

//     // Call create function and expect it to throw
//     await expect(create(spreadsheetId, tableName, payload)).rejects.toThrow(
//       `Table doesn't exist with name: ${tableName}`
//     );
//   });

//   it("should handle invalid payload keys", async () => {
//     const invalidPayload = {
//       NAME: "John Doe",
//       EMAIL: "john.doe@example.com",
//       InvalidField: "Something", // Field that doesn't exist in headers
//     };

//     // Call create function and expect it to throw
//     await expect(create(spreadsheetId, tableName, invalidPayload)).rejects.toThrow(
//       "Invalid payload keys: InvalidField"
//     );
//   });

//   it("should handle API errors during create operation", async () => {
//     // Mock API error
//     mockSheets.spreadsheets.values.append.mockRejectedValue(
//       new Error("API Error")
//     );

//     // Call create function and expect it to throw
//     await expect(create(spreadsheetId, tableName, payload)).rejects.toThrow(
//       "Error in create operation: API Error"
//     );
//   });

//   it("should handle missing headers", async () => {
//     // Mock empty headers response
//     mockSheets.spreadsheets.values.get.mockResolvedValue({
//       data: {
//         values: [],
//       },
//     });

//     // Call create function and expect it to throw
//     await expect(create(spreadsheetId, tableName, payload)).rejects.toThrow(
//       "No headers found in the table"
//     );
//   });

//   it("should maintain data types during creation", async () => {
//     const typedPayload = {
//       NAME: "John Doe",
//       EMAIL: "john.doe@example.com",
//       ADDRESS: "123 Main St",
//       RESUME: "https://example.com/resume.pdf"
//     };

//     mockSheets.spreadsheets.values.append.mockResolvedValue({
//       data: {
//         updates: {
//           updatedData: {
//             values: [[
//               expect.any(String),
//               "John Doe",
//               "john.doe@example.com",
//               "123 Main St",
//               "https://example.com/resume.pdf"
//             ]],
//           },
//         },
//       },
//     });

//     const result = await create(spreadsheetId, tableName, typedPayload);

//     expect(result.data).toEqual(expect.objectContaining({
//       ID: expect.any(String),
//       ...typedPayload,
//     }));
//   });

//   it("should handle empty payload", async () => {
//     const emptyPayload = {};

//     await expect(create(spreadsheetId, tableName, emptyPayload)).rejects.toThrow(
//       "Payload cannot be empty"
//     );
//   });

//   it("should handle null values in payload", async () => {
//     const payloadWithNull = {
//       NAME: "John Doe",
//       EMAIL: null,
//       ADDRESS: "123 Main St",
//       RESUME: "https://example.com/resume.pdf"
//     };

//     mockSheets.spreadsheets.values.append.mockResolvedValue({
//       data: {
//         updates: {
//           updatedData: {
//             values: [[
//               expect.any(String),
//               "John Doe",
//               "",
//               "123 Main St",
//               "https://example.com/resume.pdf"
//             ]],
//           },
//         },
//       },
//     });

//     const result = await create(spreadsheetId, tableName, payloadWithNull);

//     expect(result.data).toEqual(expect.objectContaining({
//       ID: expect.any(String),
//       ...payloadWithNull,
//     }));
//   });
// });

import {
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
} from './googlesheets_db';

import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Mock modules
jest.mock('googleapis');
jest.mock('google-auth-library');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

// Properly type the mocked JWT class and its authorize method
const MockJWT = JWT as jest.MockedClass<typeof JWT>;
const mockAuthorize = jest.fn().mockImplementation(() => Promise.resolve());

describe('Google Sheets Utility Functions', () => {
  // Mock data for testing
  const mockSpreadsheetId = 'mock-spreadsheet-id';
  const mockTabName = 'Users';
  const mockHeaders = ['ID', 'Email', 'Name', 'Age'];
  const mockData = [
    ['ID1', 'test1@email.com', 'John Doe', '25'],
    ['ID2', 'test2@email.com', 'Jane Smith', '30'],
  ];
  
  // Setup mock responses
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock JWT client with proper typing
    MockJWT.mockImplementation(() => ({
      authorize: mockAuthorize,
    }) as unknown as JWT);

    // Mock Google Sheets API responses with proper typing
    const mockSheetsAPI = {
      spreadsheets: {
        values: {
          get: jest.fn().mockImplementation(() => 
            Promise.resolve({ data: { values: [mockHeaders, ...mockData] } })
          ),
          append: jest.fn().mockImplementation(() => 
            Promise.resolve({ data: { updates: { updatedData: { values: [] } } } })
          ),
          update: jest.fn().mockImplementation(() => 
            Promise.resolve({ data: {} })
          ),
        },
        get: jest.fn().mockImplementation(() => 
          Promise.resolve({
            data: {
              sheets: [{ properties: { title: mockTabName, sheetId: 123 } }],
            },
          })
        ),
        batchUpdate: jest.fn().mockImplementation(() => 
          Promise.resolve({ data: {} })
        ),
      },
    };

    (google.sheets as jest.Mock).mockReturnValue(mockSheetsAPI);
  });

  /**
   * Test tableExists function
   * Verifies if the function correctly checks for the existence of a sheet
   */
  describe('tableExists', () => {
    it('should return true when table exists', async () => {
      const result = await tableExists(mockSpreadsheetId, mockTabName);
      expect(result).toBe(true);
    });

    it('should return false when table does not exist', async () => {
      const mockEmptySheetsAPI = {
        spreadsheets: {
          get: jest.fn().mockImplementation(() => 
            Promise.resolve({
              data: {
                sheets: [],
              },
            })
          ),
        },
      };
      (google.sheets as jest.Mock).mockReturnValueOnce(mockEmptySheetsAPI);
      
      const result = await tableExists(mockSpreadsheetId, 'NonExistentTab');
      expect(result).toBe(false);
    });
  });

  /**
   * Test getHeaders function
   * Verifies if the function correctly retrieves column headers
   */
  describe('getHeaders', () => {
    it('should return array of headers', async () => {
      const headers = await getHeaders(mockSpreadsheetId, mockTabName);
      expect(headers).toEqual(mockHeaders);
    });

    it('should return empty array when no headers exist', async () => {
      const mockEmptySheetsAPI = {
        spreadsheets: {
          values: {
            get: jest.fn().mockImplementation(() => 
              Promise.resolve({ data: { values: [] } })
            ),
          },
        },
      };
      (google.sheets as jest.Mock).mockReturnValueOnce(mockEmptySheetsAPI);
      
      const headers = await getHeaders(mockSpreadsheetId, mockTabName);
      expect(headers).toEqual([]);
    });
  });

  /**
   * Test getAllData function
   * Verifies if the function correctly retrieves all data from the sheet
   */
  describe('getAllData', () => {
    it('should return array of objects with row data', async () => {
      const data = await getAllData(mockSpreadsheetId, mockTabName);
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty('Email', 'test1@email.com');
    });

    it('should return empty array when no data exists', async () => {
      const mockEmptySheetsAPI = {
        spreadsheets: {
          values: {
            get: jest.fn().mockImplementation(() => 
              Promise.resolve({ data: { values: [mockHeaders] } })
            ),
          },
        },
      };
      (google.sheets as jest.Mock).mockReturnValueOnce(mockEmptySheetsAPI);
      
      const data = await getAllData(mockSpreadsheetId, mockTabName);
      expect(data).toEqual([]);
    });
  });

  /**
   * Test create function
   * Verifies if the function correctly creates new rows with proper validation
   */
  describe('create', () => {
    it('should create new row with generated ID', async () => {
      const payload = {
        Email: 'new@email.com',
        Name: 'New User',
        Age: '28',
      };
      
      const response = await create(mockSpreadsheetId, mockTabName, payload);
      expect(response.message).toBe('Row created successfully!');
      expect(response.data).toHaveProperty('ID', 'mock-uuid');
    });

    it('should throw error for duplicate email', async () => {
      const payload = {
        Email: 'test1@email.com',
        Name: 'Duplicate User',
      };
      
      await expect(create(mockSpreadsheetId, mockTabName, payload))
        .rejects
        .toThrow('Duplicate entry found');
    });

    it('should throw error for empty payload', async () => {
      await expect(create(mockSpreadsheetId, mockTabName, {}))
        .rejects
        .toThrow('Payload is empty or missing');
    });
  });

  /**
   * Test updateMultipleUsersInTab function
   * Verifies if the function correctly handles batch updates
   */
  describe('updateMultipleUsersInTab', () => {
    it('should update multiple users successfully', async () => {
      const updates = [
        {
          identifier: { Email: 'test1@email.com' },
          payload: { Name: 'Updated Name 1' },
        },
        {
          identifier: { ID: 'ID2' },
          payload: { Name: 'Updated Name 2' },
        },
      ];
      
      const response = await updateMultipleUsersInTab(mockSpreadsheetId, mockTabName, updates);
      expect(response.message).toBe('Batch update completed successfully!');
    });

    it('should handle empty updates array', async () => {
      await expect(updateMultipleUsersInTab(mockSpreadsheetId, mockTabName, []))
        .rejects
        .toThrow('No updates provided');
    });

    it('should skip invalid updates but continue processing valid ones', async () => {
      const updates = [
        {
          identifier: { Email: 'nonexistent@email.com' },
          payload: { Name: 'Should Skip' },
        },
        {
          identifier: { ID: 'ID2' },
          payload: { Name: 'Should Update' },
        },
      ];
      
      const response = await updateMultipleUsersInTab(mockSpreadsheetId, mockTabName, updates);
      expect(response.message).toBe('Batch update completed successfully!');
    });
  });

  /**
   * Test error handling in interactWithSheet function
   * Verifies if the function properly handles API errors
   */
  describe('interactWithSheet', () => {
    it('should throw error for invalid action', async () => {
      await expect(interactWithSheet('invalid' as any, { spreadsheetId: '', range: '' }))
        .rejects
        .toThrow('Unsupported action');
    });

    it('should handle API errors gracefully', async () => {
      const mockErrorSheetsAPI = {
        spreadsheets: {
          values: {
            get: jest.fn().mockImplementation(() => 
              Promise.reject(new Error('API Error'))
            ),
          },
        },
      };
      (google.sheets as jest.Mock).mockReturnValueOnce(mockErrorSheetsAPI);

      await expect(interactWithSheet('get', { 
        spreadsheetId: mockSpreadsheetId, 
        range: mockTabName 
      }))
        .rejects
        .toThrow('API Error');
    });
  });
});