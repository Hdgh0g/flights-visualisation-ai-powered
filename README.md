# Flight Visualisation App

An interactive web application for visualizing flight data on a map. Upload CSV files containing flight information and see flight routes displayed as curved geodesic lines connecting airports on an interactive map with color-coded frequency indicators.

## Features

- 📁 **CSV File Upload**: Simple drag-and-drop or click-to-upload interface with processing state
- 🗺️ **Interactive Map**: Powered by Leaflet and OpenStreetMap with restricted bounds
- ✈️ **Flight Routes**: Geodesic (great circle) paths with gradient colors based on airport frequency
- 🎯 **Airport Markers**: Color-coded by frequency (blue→cyan→green→orange→red), expandable on hover
- 📊 **Year Filter**: Filter flights by year with live statistics
- 📈 **Histogram**: Visual breakdown of flights by year or month
- 🎨 **Modern UI**: Split-panel layout with compact, responsive design
- ⚠️ **Error Handling**: Comprehensive validation with detailed error reporting and dismissible banner

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
│       ├── airports.csv                       # Airport database (83k+ airports)
│       ├── sample-flights.csv                 # Sample valid flight data
│       ├── sample-flights-with-errors.csv     # Sample with parsing errors
│       └── sample-flights-invalid-airports.csv # Sample with invalid airport codes
├── src/
│   ├── components/
│   │   ├── FileUploadModal.vue    # File upload with processing spinner
│   │   ├── MapView.vue            # Interactive map with markers and routes
│   │   ├── YearFilter.vue         # Year filter with statistics and histogram
│   │   └── ResultBanner.vue       # Dismissible results/errors banner
│   ├── types/
│   │   ├── Flight.ts              # Flight data types and class
│   │   ├── Airport.ts             # Airport data types and class
│   │   └── FlightVisualization.ts # Combined flight + airport visualization data
│   ├── utils/
│   │   ├── flightDataParser.ts           # Flight CSV parser with validation
│   │   ├── airportsParser.ts             # Airports CSV parser (IATA-indexed)
│   │   └── flightVisualizationBuilder.ts # Combines flights with airport data
│   ├── App.vue                    # Main app component with layout orchestration
│   ├── main.ts                    # App entry point
│   └── style.css                  # Global styles
├── index.html                     # HTML template
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Project dependencies
```

## Features in Detail

### 📁 Data Upload & Processing
- **File upload modal** with drag-and-drop support
- **Processing spinner** during file parsing
- **Comprehensive validation** for CSV structure and data quality
- **Error reporting** with detailed messages and dismissible banner
- **Sample files** included for testing

### 🗺️ Interactive Map
- **Leaflet-based** map with OpenStreetMap tiles
- **Restricted bounds** to prevent panning outside world map
- **Auto-fit** to show all airports in current dataset
- **Min/max zoom** controls for optimal viewing
- **Smooth interactions** with hover effects and animations

### 🎯 Airport Markers
- **Color-coded by frequency**: Blue (0-15%) → Cyan (15-30%) → Green (30-50%) → Orange (50-75%) → Red (75-100%)
- **Compact circular markers** (16×16px) by default
- **Expand on hover** to show IATA code (48×28px pill shape)
- **Stay expanded** when popup is open
- **Auto-close** previous popup when clicking another marker
- **Interactive popups** showing:
  - IATA code (color-matched to marker)
  - Airport name
  - City/region
  - Flight frequency count

### ✈️ Flight Routes
- **Geodesic lines** following great circle paths (realistic curved routes)
- **Gradient colors** transitioning from departure to arrival airport frequency colors
- **10-segment interpolation** for smooth color transitions
- **Interactive popups** showing flight route and airline/flight number
- **Semi-transparent** (60% opacity) to avoid cluttering the map

### 📊 Year Filter & Statistics
- **Split-panel layout**: Upload on left, filter on right (when data loaded)
- **Year dropdown** to filter flights by departure year
- **Live statistics**: Shows flight count and distinct airports for selected period
- **Compact histogram**:
  - **By year** when no filter applied (shows last 2 digits)
  - **By month** when year selected (shows month initials)
  - **Hover tooltips** with exact counts
  - **Properly contained labels** within histogram wrapper

### ⚠️ Error Handling
- **CSV parsing errors**: Missing columns, invalid values, malformed timestamps
- **Airport resolution errors**: Invalid IATA codes not found in database
- **Detailed error messages**: Shows row numbers, field names, and actual values (truncated to 30 chars)
- **Partial success**: Continues processing valid rows even when some fail
- **Dismissible banner**: Close button to hide results after review
- **Auto-reset**: Banner reappears when new file uploaded

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

### Validation

The app performs comprehensive validation:
- ✅ **Column check**: All required columns must be present
- ✅ **Value check**: Each row validated for missing/empty values
- ✅ **Timestamp parsing**: Supports multiple formats with clear error messages
- ✅ **Airport resolution**: Verifies all airport codes exist in the database
- ✅ **Partial processing**: Continues with valid rows even if some fail
- ✅ **Summary display**: Shows flights parsed, distinct airports, and failed rows
- ✅ **Detailed errors**: Up to 10 errors shown with row numbers and values

**Error Message Examples:**
- `Row 5: Missing value for 'departure_airport'`
- `Row 12: Invalid timestamp '2024-13-45 25:00:00' for 'departure_timestamp_local'`
- `Flight Finnair AY123: Departure airport 'XXX' not found in airports database`

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
