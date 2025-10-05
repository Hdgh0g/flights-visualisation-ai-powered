export interface FlightData {
  airline: string
  flightCode: string
  departureAirport: string
  arrivalAirport: string
  departureTimestampLocal: Date
  arrivalTimestampLocal: Date
}

export class Flight implements FlightData {
  airline: string
  flightCode: string
  departureAirport: string
  arrivalAirport: string
  departureTimestampLocal: Date
  arrivalTimestampLocal: Date

  constructor(data: FlightData) {
    this.airline = data.airline
    this.flightCode = data.flightCode
    this.departureAirport = data.departureAirport
    this.arrivalAirport = data.arrivalAirport
    this.departureTimestampLocal = data.departureTimestampLocal
    this.arrivalTimestampLocal = data.arrivalTimestampLocal
  }

  getRoute(): string {
    return `${this.departureAirport} → ${this.arrivalAirport}`
  }

  getDuration(): number {
    return this.arrivalTimestampLocal.getTime() - this.departureTimestampLocal.getTime()
  }

  getDurationHours(): number {
    return this.getDuration() / (1000 * 60 * 60)
  }
}

export interface ParseResult {
  flights: Flight[]
  errors: string[]
  totalRows: number
  successfulRows: number
  failedRows: number
}
