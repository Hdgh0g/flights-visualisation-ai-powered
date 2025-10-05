import { Airport, type AirportData, type AirportsMap } from '../types/Airport'

// Map of old airport codes to new codes (for airports that have changed their IATA codes)
type CodeReplacementMap = Map<string, string>

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'yes' || value === '1' || value.toLowerCase() === 'true'
}

function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') {
    return null
  }
  const num = parseFloat(value)
  return isNaN(num) ? null : num
}

/**
 * Parse airports CSV and return a Map with IATA codes as keys
 * Only includes airports that have a valid IATA code
 */
export function parseAirportsCsv(csvContent: string): AirportsMap {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '')
  const airportsMap: AirportsMap = new Map()

  if (lines.length === 0) {
    return airportsMap
  }

  // Parse header to get column indices
  const headerLine = lines[0]
  const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().trim())

  // Create column index map
  const columnIndex: Record<string, number> = {}
  headers.forEach((header, index) => {
    columnIndex[header] = index
  })

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const values = parseCsvLine(line)

    try {
      const iataCode = values[columnIndex['iata_code']]?.trim() || ''
      
      // Skip airports without IATA code
      if (!iataCode) {
        continue
      }

      const id = values[columnIndex['id']]?.trim() || ''
      const ident = values[columnIndex['ident']]?.trim() || ''
      const type = values[columnIndex['type']]?.trim() || ''
      const name = values[columnIndex['name']]?.trim() || ''
      const latitudeStr = values[columnIndex['latitude_deg']]?.trim() || ''
      const longitudeStr = values[columnIndex['longitude_deg']]?.trim() || ''
      const elevationStr = values[columnIndex['elevation_ft']]?.trim() || ''
      const continent = values[columnIndex['continent']]?.trim() || ''
      const isoCountry = values[columnIndex['iso_country']]?.trim() || ''
      const isoRegion = values[columnIndex['iso_region']]?.trim() || ''
      const municipality = values[columnIndex['municipality']]?.trim() || ''
      const scheduledServiceStr = values[columnIndex['scheduled_service']]?.trim() || ''
      const icaoCode = values[columnIndex['icao_code']]?.trim() || ''
      const gpsCode = values[columnIndex['gps_code']]?.trim() || ''
      const localCode = values[columnIndex['local_code']]?.trim() || ''

      // Parse coordinates
      const latitude = parseNumber(latitudeStr)
      const longitude = parseNumber(longitudeStr)

      // Skip if coordinates are invalid
      if (latitude === null || longitude === null) {
        continue
      }

      const elevationFt = parseNumber(elevationStr)
      const scheduledService = parseBoolean(scheduledServiceStr)

      const airportData: AirportData = {
        id,
        ident,
        type,
        name,
        coordinates: [latitude, longitude],
        elevationFt,
        continent,
        isoCountry,
        isoRegion,
        municipality,
        scheduledService,
        icaoCode,
        iataCode,
        gpsCode,
        localCode
      }

      const airport = new Airport(airportData)
      airportsMap.set(iataCode, airport)
    } catch (error) {
      // Skip rows with errors
      console.warn(`Failed to parse airport row ${i + 1}:`, error)
      continue
    }
  }

  return airportsMap
}

/**
 * Load airport code replacements from the public data file
 * Returns a map of old codes to new codes
 */
async function loadAirportCodeReplacements(): Promise<CodeReplacementMap> {
  const replacements: CodeReplacementMap = new Map()
  
  try {
    const response = await fetch('/data/airport-code-replacements.csv')
    if (!response.ok) {
      console.warn('Airport code replacements file not found, skipping')
      return replacements
    }
    
    const csvText = await response.text()
    const lines = csvText.split('\n').filter(line => line.trim() !== '')
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i])
      if (values.length >= 2) {
        const oldCode = values[0]?.trim()
        const newCode = values[1]?.trim()
        if (oldCode && newCode) {
          replacements.set(oldCode, newCode)
        }
      }
    }
    
    console.log(`Loaded ${replacements.size} airport code replacements`)
  } catch (error) {
    console.warn('Failed to load airport code replacements:', error)
  }
  
  return replacements
}

/**
 * Load airports from the public data file
 */
export async function loadAirports(): Promise<AirportsMap> {
  try {
    const response = await fetch('/data/airports.csv')
    if (!response.ok) {
      throw new Error(`Failed to load airports: ${response.statusText}`)
    }
    const csvText = await response.text()
    return parseAirportsCsv(csvText)
  } catch (error) {
    console.error('Error loading airports:', error)
    return new Map()
  }
}

/**
 * Get airport by code, with fallback to replacement codes if not found
 */
export function getAirportByCode(
  code: string,
  airportsMap: AirportsMap,
  replacements: CodeReplacementMap
): Airport | undefined {
  // Try direct lookup first
  let airport = airportsMap.get(code)
  
  // If not found, check if there's a replacement code
  if (!airport && replacements.has(code)) {
    const newCode = replacements.get(code)!
    console.log(`Airport code ${code} has been replaced with ${newCode}`)
    airport = airportsMap.get(newCode)
  }
  
  return airport
}

/**
 * Load both airports and code replacements
 */
export async function loadAirportsWithReplacements(): Promise<{
  airportsMap: AirportsMap
  replacements: CodeReplacementMap
}> {
  const [airportsMap, replacements] = await Promise.all([
    loadAirports(),
    loadAirportCodeReplacements()
  ])
  
  return { airportsMap, replacements }
}
