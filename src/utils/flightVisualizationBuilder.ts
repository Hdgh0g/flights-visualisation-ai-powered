import type { Flight } from '../types/Flight'
import type { AirportsMap } from '../types/Airport'
import type { VisualizationResult } from '../types/FlightVisualization'
import { createFlightVisualization } from '../types/FlightVisualization'

/**
 * Build visualization data from parsed flights and airports map
 * Validates that all airport codes can be resolved to actual airports
 */
export function buildFlightVisualizations(
  flights: Flight[],
  airportsMap: AirportsMap
): VisualizationResult {
  const visualizations = []
  const errors: string[] = []
  const unresolvedAirports = new Set<string>()
  const distinctAirports = new Set<string>()

  for (let i = 0; i < flights.length; i++) {
    const flight = flights[i]
    const flightNumber = `${flight.airline} ${flight.flightCode}`

    // Track all airport codes
    distinctAirports.add(flight.departureAirport)
    distinctAirports.add(flight.arrivalAirport)

    // Resolve departure airport
    const fromAirport = airportsMap.get(flight.departureAirport)
    if (!fromAirport) {
      unresolvedAirports.add(flight.departureAirport)
      errors.push(
        `Flight ${flightNumber}: Departure airport "${flight.departureAirport}" not found in airports database`
      )
      continue
    }

    // Resolve arrival airport
    const toAirport = airportsMap.get(flight.arrivalAirport)
    if (!toAirport) {
      unresolvedAirports.add(flight.arrivalAirport)
      errors.push(
        `Flight ${flightNumber}: Arrival airport "${flight.arrivalAirport}" not found in airports database`
      )
      continue
    }

    // Create visualization data
    const visualization = createFlightVisualization(flight, fromAirport, toAirport)
    visualizations.push(visualization)
  }

  return {
    visualizations,
    totalFlightsParsed: flights.length,
    distinctAirports,
    errors,
    unresolvedAirports
  }
}
