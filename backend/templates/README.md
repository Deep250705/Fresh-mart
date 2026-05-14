Place your predefined Excel template at:

`backend/templates/analytics-report-template.xlsx`

Expected workbook contract:

- `RawData` sheet
  - Columns `A:F` are reserved for:
    - `Date`
    - `Vendor`
    - `Product`
    - `Category`
    - `Revenue`
    - `Profit`
- `SalesByDate` sheet
  - Columns must stay in this order:
    - `Date`
    - `Revenue`
    - `Profit`
    - `Quantity`
    - `Margin %`
- `SalesByCategory` sheet
  - Columns must stay in this order:
    - `Category`
    - `Revenue`
    - `Profit`
    - `Quantity`
    - `Margin %`
- `SalesByVendor` sheet
  - Columns must stay in this order:
    - `Vendor`
    - `VendorId`
    - `Revenue`
    - `Profit`
    - `Quantity`
    - `Margin %`
- `SalesByProduct` sheet
  - Columns must stay in this order:
    - `Product`
    - `ProductId`
    - `Category`
    - `Revenue`
    - `Profit`
    - `Quantity`
    - `Margin %`
- `Summary` sheet
  - The exporter will first look for workbook or sheet defined names:
    - `TotalRevenue`
    - `TotalProfit`
    - `MarginPercent`
  - If those do not exist, it will look for placeholders:
    - `{{TOTAL_REVENUE}}`
    - `{{TOTAL_PROFIT}}`
    - `{{MARGIN_PERCENT}}`
  - If neither is present, it falls back to cells `B2:B4`
- `Charts` sheet
  - Keep your pre-built Excel charts here
  - Bind them to `SalesByDate`, `SalesByCategory`, `SalesByVendor`, and `SalesByProduct`
  - Do not bind template charts directly to `RawData`
  - Dynamic named ranges or structured range references are recommended so charts refresh when the workbook opens

The backend preserves the template workbook and only updates data cells. It does not generate charts programmatically.
