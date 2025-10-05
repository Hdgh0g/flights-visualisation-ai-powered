export interface AirportData {
  id: string
  ident: string
  type: string
  name: string
  coordinates: [number, number] // [latitude, longitude]
  elevationFt: number | null
  continent: string
  isoCountry: string
  isoRegion: string
  municipality: string
  scheduledService: boolean
  icaoCode: string
  iataCode: string
  gpsCode: string
  localCode: string
}

export class Airport implements AirportData {
  id: string
  ident: string
  type: string
  name: string
  coordinates: [number, number] // [latitude, longitude]
  elevationFt: number | null
  continent: string
  isoCountry: string
  isoRegion: string
  municipality: string
  scheduledService: boolean
  icaoCode: string
  iataCode: string
  gpsCode: string
  localCode: string

  constructor(data: AirportData) {
    this.id = data.id
    this.ident = data.ident
    this.type = data.type
    this.name = data.name
    this.coordinates = data.coordinates
    this.elevationFt = data.elevationFt
    this.continent = data.continent
    this.isoCountry = data.isoCountry
    this.isoRegion = data.isoRegion
    this.municipality = data.municipality
    this.scheduledService = data.scheduledService
    this.icaoCode = data.icaoCode
    this.iataCode = data.iataCode
    this.gpsCode = data.gpsCode
    this.localCode = data.localCode
  }

  getCoordinates(): [number, number] {
    return this.coordinates
  }

  get latitude(): number {
    return this.coordinates[0]
  }

  get longitude(): number {
    return this.coordinates[1]
  }

  getDisplayName(): string {
    return `${this.name} (${this.iataCode || this.icaoCode})`
  }

  hasIataCode(): boolean {
    return this.iataCode !== ''
  }
}

export type AirportsMap = Map<string, Airport>
