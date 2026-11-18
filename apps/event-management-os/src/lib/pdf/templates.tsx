/* Premium PDF templates rendered server-side with @react-pdf/renderer. */
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { computeTotals, formatMoney } from '@/lib/money'
import { formatDate } from '@/lib/dates'

const C = { coral: '#F07F73', coralLight: '#FCE9E6', ink: '#252525', muted: '#777777', line: '#ECEBE8', beige: '#F5F1ED' }

const s = StyleSheet.create({
  page: { padding: 44, paddingBottom: 70, fontSize: 9.5, color: C.ink, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  brand: { flexDirection: 'row', alignItems: 'center' },
  mark: { width: 26, height: 26, borderRadius: 7, backgroundColor: C.coral, marginRight: 9 },
  brandName: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  brandSub: { fontSize: 8, color: C.muted, marginTop: 1 },
  docType: { fontSize: 20, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: C.ink },
  docRef: { fontSize: 9, color: C.muted, textAlign: 'right', marginTop: 3 },
  row: { flexDirection: 'row' },
  box: { flex: 1, backgroundColor: C.beige, borderRadius: 8, padding: 12 },
  label: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  strong: { fontFamily: 'Helvetica-Bold' },
  th: { flexDirection: 'row', backgroundColor: C.coralLight, borderRadius: 6, paddingVertical: 7, paddingHorizontal: 8, marginTop: 22 },
  thText: { fontSize: 7.5, color: '#B85650', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'Helvetica-Bold' },
  tr: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  totals: { marginTop: 16, marginLeft: 'auto', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grand: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 4, borderTopWidth: 1.5, borderTopColor: C.ink },
  terms: { marginTop: 26, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: C.line },
  footer: { position: 'absolute', bottom: 28, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.muted, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 },
})

function Brand({ org }: { org: string }) {
  return (
    <View style={s.brand}>
      <View style={s.mark} />
      <View>
        <Text style={s.brandName}>Event Management</Text>
        <Text style={s.brandSub}>{org}</Text>
      </View>
    </View>
  )
}

export interface CommercialDocData {
  kind: 'QUOTE' | 'INVOICE'
  ref: string
  title?: string | null
  org: { name: string; currency: string }
  client: { name: string; company?: string | null; email?: string | null; phone?: string | null; address?: string | null }
  project?: string | null
  issueDate: Date
  secondDate?: Date | null
  status: string
  discountPct?: number
  items: { description: string; quantity: number; unitPrice: number; discountPct: number; taxRate: number }[]
  terms?: string | null
  notes?: string | null
  paid?: number
}

export function CommercialPdf({ d }: { d: CommercialDocData }) {
  const t = computeTotals(d.items, d.discountPct ?? 0)
  const m = (n: number) => formatMoney(n, d.org.currency)
  return (
    <Document title={`${d.kind === 'QUOTE' ? 'Quote' : 'Invoice'} ${d.ref}`} author={d.org.name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Brand org={d.org.name} />
          <View>
            <Text style={s.docType}>{d.kind === 'QUOTE' ? 'Quote' : 'Invoice'}</Text>
            <Text style={s.docRef}>{d.ref}</Text>
          </View>
        </View>
        <View style={[s.row, { gap: 10 }]}>
          <View style={s.box}>
            <Text style={s.label}>Billed to</Text>
            <Text style={s.strong}>{d.client.company ?? d.client.name}</Text>
            {d.client.company && <Text>{d.client.name}</Text>}
            {d.client.address && <Text style={{ color: C.muted }}>{d.client.address}</Text>}
            {d.client.email && <Text style={{ color: C.muted }}>{d.client.email}</Text>}
            {d.client.phone && <Text style={{ color: C.muted }}>{d.client.phone}</Text>}
          </View>
          <View style={s.box}>
            <Text style={s.label}>Details</Text>
            <Text>Reference: <Text style={s.strong}>{d.ref}</Text></Text>
            <Text>Issue date: {formatDate(d.issueDate)}</Text>
            {d.secondDate && <Text>{d.kind === 'QUOTE' ? 'Valid until' : 'Due date'}: {formatDate(d.secondDate)}</Text>}
            {d.project && <Text>Project: {d.project}</Text>}
          </View>
        </View>
        {d.title && <Text style={{ marginTop: 18, fontSize: 12, fontFamily: 'Helvetica-Bold' }}>{d.title}</Text>}
        <View style={s.th}>
          <Text style={[s.thText, { flex: 1 }]}>Description</Text>
          <Text style={[s.thText, { width: 40, textAlign: 'right' }]}>Qty</Text>
          <Text style={[s.thText, { width: 70, textAlign: 'right' }]}>Unit price</Text>
          <Text style={[s.thText, { width: 40, textAlign: 'right' }]}>Disc.</Text>
          <Text style={[s.thText, { width: 40, textAlign: 'right' }]}>Tax</Text>
          <Text style={[s.thText, { width: 76, textAlign: 'right' }]}>Total excl.</Text>
        </View>
        {d.items.map((it, i) => (
          <View key={i} style={s.tr} wrap={false}>
            <Text style={{ flex: 1, paddingRight: 8 }}>{it.description}</Text>
            <Text style={{ width: 40, textAlign: 'right' }}>{it.quantity}</Text>
            <Text style={{ width: 70, textAlign: 'right' }}>{m(it.unitPrice)}</Text>
            <Text style={{ width: 40, textAlign: 'right', color: C.muted }}>{it.discountPct ? `${it.discountPct}%` : '—'}</Text>
            <Text style={{ width: 40, textAlign: 'right', color: C.muted }}>{it.taxRate}%</Text>
            <Text style={{ width: 76, textAlign: 'right' }}>{m(Math.round(it.quantity * it.unitPrice * (1 - it.discountPct / 100)))}</Text>
          </View>
        ))}
        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}><Text style={{ color: C.muted }}>Subtotal</Text><Text>{m(t.subtotal)}</Text></View>
          {t.discount > 0 && <View style={s.totalRow}><Text style={{ color: C.muted }}>Discounts{d.discountPct ? ` (${d.discountPct}% global)` : ''}</Text><Text>−{m(t.discount)}</Text></View>}
          <View style={s.totalRow}><Text style={{ color: C.muted }}>Net amount</Text><Text>{m(t.net)}</Text></View>
          <View style={s.totalRow}><Text style={{ color: C.muted }}>Tax</Text><Text>{m(t.tax)}</Text></View>
          <View style={s.grand}><Text style={[s.strong, { fontSize: 11 }]}>Total</Text><Text style={[s.strong, { fontSize: 11 }]}>{m(t.total)}</Text></View>
          {d.kind === 'INVOICE' && d.paid !== undefined && (
            <>
              <View style={s.totalRow}><Text style={{ color: C.muted }}>Paid</Text><Text>{m(d.paid)}</Text></View>
              <View style={s.totalRow}><Text style={s.strong}>Balance due</Text><Text style={[s.strong, { color: '#B85650' }]}>{m(t.total - d.paid)}</Text></View>
            </>
          )}
        </View>
        {(d.terms || d.notes) && (
          <View style={s.terms} wrap={false}>
            {d.terms && <><Text style={s.label}>Terms & conditions</Text><Text style={{ lineHeight: 1.5 }}>{d.terms}</Text></>}
            {d.notes && <><Text style={[s.label, { marginTop: 8 }]}>Notes</Text><Text style={{ lineHeight: 1.5 }}>{d.notes}</Text></>}
          </View>
        )}
        <View style={s.footer} fixed>
          <Text>{d.org.name} · Generated with Event Management OS</Text>
          <Text render={({ pageNumber, totalPages }) => `${d.ref} · ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export interface ItineraryPdfData {
  org: string
  title: string
  destination: string
  checkIn: Date | null
  checkOut: Date | null
  travelers: number
  accommodation: string | null
  clientName: string | null
  items: { date: Date; time: string | null; title: string; type: string; location: string | null; confirmation: string | null; status: string }[]
}

export function ItineraryPdf({ d }: { d: ItineraryPdfData }) {
  const days = new Map<string, ItineraryPdfData['items']>()
  for (const it of d.items) {
    const k = it.date.toISOString().slice(0, 10)
    days.set(k, [...(days.get(k) ?? []), it])
  }
  return (
    <Document title={d.title} author={d.org}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Brand org={d.org} />
          <View><Text style={s.docType}>Itinerary</Text>{d.clientName && <Text style={s.docRef}>Prepared for {d.clientName}</Text>}</View>
        </View>
        <Text style={{ fontSize: 16, fontFamily: 'Helvetica-Bold' }}>{d.title}</Text>
        <Text style={{ color: C.muted, marginTop: 4 }}>{d.destination} · {formatDate(d.checkIn)} → {formatDate(d.checkOut)} · {d.travelers} travellers</Text>
        {d.accommodation && <View style={[s.box, { marginTop: 14, flex: 0 }]}><Text style={s.label}>Accommodation</Text><Text>{d.accommodation}</Text></View>}
        {[...days.entries()].map(([k, list]) => (
          <View key={k} style={{ marginTop: 18 }} wrap={false}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#B85650', marginBottom: 6 }}>{formatDate(new Date(`${k}T00:00:00`), { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            {list.map((it, i) => (
              <View key={i} style={[s.tr, { paddingHorizontal: 0 }]}>
                <Text style={{ width: 46, fontFamily: 'Helvetica-Bold' }}>{it.time ?? ''}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.strong}>{it.title}</Text>
                  <Text style={{ color: C.muted, marginTop: 2 }}>{[it.location, it.confirmation && `Confirmation ${it.confirmation}`].filter(Boolean).join(' · ')}</Text>
                </View>
                <Text style={{ width: 70, textAlign: 'right', color: it.status === 'CONFIRMED' ? '#047857' : C.muted }}>{it.status.toLowerCase()}</Text>
              </View>
            ))}
          </View>
        ))}
        <View style={s.footer} fixed>
          <Text>{d.org}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
