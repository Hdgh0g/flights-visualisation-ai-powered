import { Flight, type FlightData, type ParseResult } from '../types/Flight'

const REQUIRED_COLUMNS = [
  'airline',
  'flight_code',
  'departure_airport',
  'arrival_airport',
  'departure_timestamp_local',
  'arrival_timestamp_local'
]

/**
 * Parse timestamp in multiple formats using standard JS Date parsing:
 * - 2019-07-28 20:20:00 (YYYY-MM-DD HH:mm:ss)
 * - 14.11.2025 20:35:00 (DD.MM.YYYY HH:mm:ss) - converted to ISO format
 * - Any other format supported by Date constructor
 */
function parseTimestamp(timestamp: string): Date | null {
  if (!timestamp || timestamp.trim() === '') {
    return null
  }

  const trimmed = timestamp.trim()

  // Convert DD.MM.YYYY HH:mm:ss to YYYY-MM-DD HH:mm:ss for Date constructor
  // Check if it matches the DD.MM.YYYY pattern (has dots as separators)
  if (trimmed.includes('.') && trimmed.split('.').length === 3) {
    const parts = trimmed.split(' ')
    if (parts.length === 2) {
      const datePart = parts[0]
      const timePart = parts[1]
      const dateComponents = datePart.split('.')
      
      if (dateComponents.length === 3) {
        const [day, month, year] = dateComponents
        // Reformat to YYYY-MM-DD HH:mm:ss
        const isoFormat = `${year}-${month}-${day} ${timePart}`
        const date = new Date(isoFormat)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }
  }

  // Try standard Date parsing (handles YYYY-MM-DD HH:mm:ss and many other formats)
  const date = new Date(trimmed)
  if (!isNaN(date.getTime())) {
    return date
  }

  return null
}

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

export function parseFlightsCsv(csvContent: string): ParseResult {
  const lines = csvContent.split('\n').filter(line => line.trim() !== '')
  const errors: string[] = []
  const flights: Flight[] = []

  if (lines.length === 0) {
    errors.push('CSV file is empty')
    return {
      flights: [],
      errors,
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0
    }
  }

  // Parse header
  const headerLine = lines[0]
  const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().trim())

  // Check for required columns
  const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col))
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`)
    return {
      flights: [],
      errors,
      totalRows: lines.length - 1,
      successfulRows: 0,
      failedRows: lines.length - 1
    }
  }

  // Create column index map
  const columnIndex: Record<string, number> = {}
  headers.forEach((header, index) => {
    columnIndex[header] = index
  })

  // Parse data rows
  let successfulRows = 0
  let failedRows = 0

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const values = parseCsvLine(line)

    try {
      const airline = values[columnIndex['airline']]?.trim()
      const flightCode = values[columnIndex['flight_code']]?.trim()
      const departureAirport = values[columnIndex['departure_airport']]?.trim()
      const arrivalAirport = values[columnIndex['arrival_airport']]?.trim()
      const departureTimestampLocalStr = values[columnIndex['departure_timestamp_local']]?.trim()
      const arrivalTimestampLocalStr = values[columnIndex['arrival_timestamp_local']]?.trim()

      // Validate required fields
      const missingFields: string[] = []
      if (!airline) missingFields.push('airline')
      if (!flightCode) missingFields.push('flight_code')
      if (!departureAirport) missingFields.push('departure_airport')
      if (!arrivalAirport) missingFields.push('arrival_airport')
      if (!departureTimestampLocalStr) missingFields.push('departure_timestamp_local')
      if (!arrivalTimestampLocalStr) missingFields.push('arrival_timestamp_local')

      if (missingFields.length > 0) {
        errors.push(`Row ${i + 1}: Missing values for ${missingFields.join(', ')} (empty or not provided)`)
        failedRows++
        continue
      }

      // Parse timestamps
      const departureTimestampLocal = parseTimestamp(departureTimestampLocalStr)
      const arrivalTimestampLocal = parseTimestamp(arrivalTimestampLocalStr)

      if (!departureTimestampLocal || !arrivalTimestampLocal) {
        const invalidTimestamps: string[] = []
        if (!departureTimestampLocal) {
          const value = departureTimestampLocalStr.substring(0, 30)
          invalidTimestamps.push(`departure_timestamp_local="${value}"`)
        }
        if (!arrivalTimestampLocal) {
          const value = arrivalTimestampLocalStr.substring(0, 30)
          invalidTimestamps.push(`arrival_timestamp_local="${value}"`)
        }
        
        errors.push(`Row ${i + 1}: Invalid timestamp format: ${invalidTimestamps.join(', ')}`)
        failedRows++
        continue
      }

      const flightData: FlightData = {
        airline,
        flightCode,
        departureAirport,
        arrivalAirport,
        departureTimestampLocal,
        arrivalTimestampLocal
      }

      flights.push(new Flight(flightData))
      successfulRows++
    } catch (error) {
      errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failedRows++
    }
  }

  return {
    flights,
    errors,
    totalRows: lines.length - 1,
    successfulRows,
    failedRows
  }
}
