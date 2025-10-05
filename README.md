# Flight Visualisation App

An interactive web application for visualizing flight data on a map. Upload CSV files containing flight information (dates, airports) and see flight routes displayed as lines connecting airports on an interactive map.

## Features

- 📁 **CSV File Upload**: Simple drag-and-drop or click-to-upload interface for CSV files
- 🗺️ **Interactive Map**: Powered by Leaflet and OpenStreetMap, centered on Helsinki
- 🎨 **Modern UI**: Clean, responsive design with gradient header
- 📊 **Future Features**: Date filtering (year/month) and statistics visualization with charts

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Leaflet** - Interactive map library
- **Leaflet.geodesic** - Great circle route visualization
- **OpenStreetMap** - Free map tiles

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Hdgh0g/flights-visualisation-ai-powered.git
cd flights-visualisation-ai-powered
```

2. Install dependencies:
```bash
npm install
```

### Running the App

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or another port if 5173 is busy).

### Building for Production

Build the app for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
flights-visualisation-ai-powered/
├── public/
│   └── data/
│       ├── airports.csv                    # Airport database (83k+ airports)
│       ├── sample-flights.csv              # Sample valid flight data
│       └── sample-flights-with-errors.csv  # Sample with errors
├── src/
│   ├── components/
│   │   ├── FileUploadModal.vue  # File upload with processing state
│   │   └── MapView.vue          # Map display component
│   ├── types/
│   │   ├── Flight.ts            # Flight data types and class
│   │   └── Airport.ts           # Airport data types and class
│   ├── utils/
│   │   ├── flightDataParser.ts  # Flight CSV parser with validation
│   │   └── airportsParser.ts    # Airports CSV parser (IATA-indexed)
│   ├── App.vue                  # Main app component
│   ├── main.ts                  # App entry point
│   └── style.css                # Global styles
├── index.html                   # HTML template
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Project dependencies
```

## Current Status

✅ Basic project structure
✅ File upload interface with processing state
✅ Interactive map centered on Helsinki
✅ Flight data CSV parsing with error handling
✅ Airports CSV parsing (83k+ airports indexed by IATA code)
✅ TypeScript classes for flight and airport data
✅ Validation and error reporting
✅ Standard JS date parsing (no regex)
✅ Airport resolution validation (checks if airport codes exist)
✅ Flight visualization data builder (combines flights with airport coordinates)
✅ Statistics display (flights count, distinct airports count)
✅ Airport markers on map with IATA codes
✅ Color-coded markers based on flight frequency (blue→cyan→green→orange→red)
✅ Interactive popups showing airport name, city, and flight count
✅ Auto-fit map bounds to show all airports
✅ Year filter with statistics (flights and airports per year)
✅ Compact histogram showing flights per year (or per month when filtered)
✅ Flight route lines following great circle paths (geodesic curves)
✅ Gradient flight lines matching airport frequency colors (start→end)
✅ Interactive flight lines with flight info popups
✅ Realistic curved routes respecting Earth's spherical geometry
⏳ Statistics charts (coming soon)

## CSV Format

The app expects CSV files with the following **required columns**:

- `airline` - Airline name or code
- `flight_code` - Flight number/code
- `departure_airport` - Departure airport code (e.g., HEL)
- `arrival_airport` - Arrival airport code (e.g., JFK)
- `departure_timestamp_local` - Departure time (local timezone)
- `arrival_timestamp_local` - Arrival time (local timezone)

### Supported Timestamp Formats

The parser supports multiple timestamp formats:
- `YYYY-MM-DD HH:mm:ss` (e.g., `2019-07-28 20:20:00`)
- `DD.MM.YYYY HH:mm:ss` (e.g., `14.11.2025 20:35:00`)

### Example CSV

```csv
airline,flight_code,departure_airport,arrival_airport,departure_timestamp_local,arrival_timestamp_local
Finnair,AY123,HEL,JFK,2024-01-15 12:30:00,2024-01-15 08:45:00
Lufthansa,LH456,HEL,FRA,14.02.2024 10:15:00,14.02.2024 10:30:00
```

**Sample files** are included in `/public/data/`:
- `sample-flights.csv` - Valid flight data for testing
- `sample-flights-with-errors.csv` - CSV parsing errors (missing values, invalid timestamps)
- `sample-flights-invalid-airports.csv` - Airport resolution errors (invalid IATA codes)

### Error Handling

The app validates:
- ✅ All required columns are present
- ✅ Each row for missing values
- ✅ Timestamp formats
- ✅ Airport codes exist in the airports database
- ✅ Continues processing valid rows even if some rows fail
- ✅ Displays summary: flights parsed, distinct airports found, failed rows
- ✅ Shows detailed error messages including unresolved airport codes

**Error Types:**
- CSV parsing errors (missing values, invalid timestamps)
- Airport resolution errors (e.g., "Flight Finnair AY123: Departure airport 'XXX' not found in airports database")

## Airports Database

The app includes a comprehensive airports database (`/public/data/airports.csv`) with 83,000+ airports worldwide.

### Airport Data Structure

Each airport includes:
- **IATA Code** - 3-letter code (e.g., HEL, JFK, LHR) - used as the key in the airports map
- **ICAO Code** - 4-letter code
- **Name** - Full airport name
- **Coordinates** - Latitude and longitude
- **Location** - Municipality, region, country
- **Type** - Airport type (large_airport, medium_airport, etc.)
- **Elevation** - Elevation in feet

### Usage

```typescript
import { loadAirports } from './utils/airportsParser'

// Load all airports (only those with IATA codes)
const airportsMap = await loadAirports()

// Get specific airport by IATA code
const helsinki = airportsMap.get('HEL')
console.log(helsinki?.name) // "Helsinki Vantaa Airport"
console.log(helsinki?.getCoordinates()) // [60.318363, 24.963341]
```
