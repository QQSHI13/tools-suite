# 📊 CSV to JSON Converter

Transform CSV files to JSON instantly. Drag-and-drop or paste, convert, download.

**Live:** https://qqshi13.github.io/csv-json/

## Features

- 📁 **Drag & Drop** - Drop CSV files directly
- ✏️ **Paste Input** - Or paste CSV text
- ⚙️ **Smart Options**:
  - First row as headers
  - Trim whitespace
  - Parse numbers
  - Parse booleans
  - Minify output
- 📋 **Copy JSON** - One-click copy
- 💾 **Download** - Save as .json file
- 📊 **Live Stats** - Row count, column count, file size

## How to Use

1. Drop a CSV file OR paste CSV text
2. Toggle options as needed
3. Copy or download the JSON output

## CSV Format Support

- Comma-separated values
- Tab-separated values
- Quoted fields with commas
- Multiline fields

## Example

**Input CSV:**
```csv
name,age,city
John,30,NYC
Jane,25,LA
```

**Output JSON:**
```json
[
  { "name": "John", "age": 30, "city": "NYC" },
  { "name": "Jane", "age": 25, "city": "LA" }
]
```

## Tech Stack

- **Vanilla JavaScript** - No dependencies
- **FileReader API** - Handle file uploads
- **GitHub Pages** - Free hosting

---

Built with ❤️ by QQ & Nova ☄️
