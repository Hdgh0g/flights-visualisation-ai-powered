import type { Airport } from './Airport'
import type { Flight } from './Flight'

export interface FlightVisualizationData {
  fromAirport: Airport
  fromCoordinates: [number, number]
  toAirport: Airport
  toCoordinates: [number, number]
  departureTimestamp: Date
  arrivalTimestamp: Date
  flightNumber: string
  airline: string
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
    fromCoordinates: fromAirport.getCoordinates(),
    toAirport,
    toCoordinates: toAirport.getCoordinates(),
    departureTimestamp: flight.departureTimestampLocal,
    arrivalTimestamp: flight.arrivalTimestampLocal,
    flightNumber: flight.flightCode,
    airline: flight.airline,
    flight
  }
}
