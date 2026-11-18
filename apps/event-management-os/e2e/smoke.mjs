/**
 * End-to-end smoke test of real writes & automations against a running, seeded app.
 *   BASE_URL=http://localhost:3000 node e2e/smoke.mjs
 * Requires Playwright with Chromium (npx playwright install chromium if needed).
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const stamp = Date.now().toString(36)
let failures = 0
const step = async (name, fn) => {
  try {
    await fn()
    console.log(`✔ ${name}`)
  } catch (e) {
    failures++
    console.log(`✘ ${name}\n   ${String(e.message ?? e).split('\n')[0]}`)
  }
}
// Wait for client hydration before interacting (dev servers compile lazily).
const settle = (page) => page.waitForLoadState('networkidle').catch(() => {})
const expectText = async (page, text, timeout = 15000) => page.getByText(text, { exact: false }).first().waitFor({ timeout })

const browser = await chromium.launch()
async function login(email) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`)
  await page.fill('#email', email)
  await page.fill('#password', 'demo1234')
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60000 }), page.click('button[type=submit]')])
  return page
}

const admin = await login('admin@demo.events')

await step('Create a lead → qualification task is generated automatically', async () => {
  await admin.goto(`${BASE}/leads?new=1`)
  await admin.fill('#f-firstName', 'Test')
  await admin.fill('#f-lastName', `Lead ${stamp}`)
  await admin.fill('#f-email', `lead-${stamp}@example.com`)
  await admin.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click()
  await admin.waitForURL(/\/leads\/c/, { timeout: 30000 })
  await expectText(admin, `Qualify lead Test Lead ${stamp}`)
})

await step('Deal won → client + project with default checklist', async () => {
  await settle(admin)
  await admin.getByRole('button', { name: /Won → create project/ }).click()
  await admin.waitForURL(/\/projects\/c/, { timeout: 30000 })
  await admin.goto(admin.url() + '?tab=tasks')
  await expectText(admin, 'Kick-off meeting with client')
})

await step('Duplicate client email is rejected', async () => {
  await admin.goto(`${BASE}/clients?new=1`)
  await admin.fill('#f-firstName', 'Dup')
  await admin.fill('#f-lastName', 'Client')
  await admin.fill('#f-email', 'Sophie.Laurent@example.com')
  await admin.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click()
  await expectText(admin, 'A client with this email already exists')
})

await step('Duplicate supplier name is rejected (single record across categories)', async () => {
  await admin.goto(`${BASE}/suppliers?new=1`)
  await admin.fill('#f-companyName', 'chateau des lys (FICTITIOUS)')
  await admin.getByRole('dialog').getByRole('button', { name: 'Florists', exact: true }).click()
  await admin.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click()
  await expectText(admin, 'already exists')
})

await step('Approve a sent quote → deposit invoice', async () => {
  await admin.goto(`${BASE}/quotes?status=SENT`)
  await admin.locator('table tbody tr a').first().click()
  await admin.waitForURL(/\/quotes\/c/)
  await admin.waitForLoadState('networkidle')
  await admin.getByRole('button', { name: 'Approve' }).click()
  await admin.getByRole('button', { name: /Deposit invoice 30%/ }).waitFor({ timeout: 20000 })
  await admin.getByRole('button', { name: /Deposit invoice 30%/ }).click()
  await admin.waitForURL(/\/invoices\/c/, { timeout: 30000 })
  await expectText(admin, 'Invoice INV-')
  if (!(await admin.locator('input[value^="Deposit 30%"]').count())) throw new Error('deposit line missing')
})

await step('Global search finds a supplier', async () => {
  const res = await admin.request.get(`${BASE}/api/search?q=fleurie`)
  const body = await res.json()
  if (!body.results.some((r) => r.type === 'Suppliers')) throw new Error('supplier not found in search')
})

const client = await login('client@demo.events')
await step('Client portal: approve a pending item', async () => {
  await client.goto(`${BASE}/portal?tab=approvals`)
  await settle(client)
  const approve = client.getByRole('button', { name: 'Approve', exact: true }).first()
  await approve.click()
  await expectText(client, 'Approved — thank you')
})
await step('Client portal cannot reach the back office', async () => {
  await client.goto(`${BASE}/finance`)
  if (!client.url().includes('/portal')) throw new Error(`landed on ${client.url()}`)
  const r = await client.request.get(`${BASE}/api/export/clients`)
  if (r.status() !== 403) throw new Error(`export returned ${r.status()}`)
})

const team = await login('team@demo.events')
await step('Team member is blocked from finance', async () => {
  await team.goto(`${BASE}/finance`)
  await expectText(team, 'Access restricted')
})

await browser.close()
console.log(failures ? `\n${failures} step(s) failed` : '\nAll smoke steps passed')
process.exit(failures ? 1 : 0)
