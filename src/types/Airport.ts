export interface AirportData {
  id: string
  ident: string
  type: string
  name: string
  latitude: number
  longitude: number
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
  latitude: number
  longitude: number
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
    this.latitude = data.latitude
    this.longitude = data.longitude
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
    return [this.latitude, this.longitude]
  }

  getDisplayName(): string {
    return `${this.name} (${this.iataCode || this.icaoCode})`
  }

  hasIataCode(): boolean {
    return this.iataCode !== ''
  }
}

export type AirportsMap = Map<string, Airport>
