import type { Airport } from './Airport'
import type { Flight } from './Flight'

export interface FlightVisualizationData {
  fromAirport: Airport
  toAirport: Airport
  departureTimestamp: Date
  arrivalTimestamp: Date
  flight: Flight
}

export interface VisualizationResult {
  visualizations: FlightVisualizationData[]
  totalFlightsParsed: number
  distinctAirports: Set<string>
  errors: string[]
  unresolvedAirports: Set<string>
}

export function createFlightVisualization(
  flight: Flight,
  fromAirport: Airport,
  toAirport: Airport
): FlightVisualizationData {
  return {
    fromAirport,
    toAirport,
    departureTimestamp: flight.departureTimestampLocal,
    arrivalTimestamp: flight.arrivalTimestampLocal,
    flight
  }
}
