import 'server-only'
import { createElement } from 'react'
import type { Organization, Reservation, Stay, Client } from '@prisma/client'
import { ItineraryPdf } from './templates'
import { pdfResponse } from './render'

export function itineraryPdf(stay: Stay & { organization: Organization; client: Client | null; reservations: Reservation[] }) {
  return pdfResponse(
    createElement(ItineraryPdf, {
      d: {
        org: stay.organization.name,
        title: stay.title,
        destination: stay.destination,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        travelers: stay.travelers,
        accommodation: stay.accommodation,
        clientName: stay.client ? stay.client.firstName : null,
        items: stay.reservations.map((r) => ({ date: r.date, time: r.time, title: r.title, type: r.type, location: r.location, confirmation: r.confirmation, status: r.status })),
      },
    }),
    `itinerary-${stay.ref}.pdf`,
  )
}
