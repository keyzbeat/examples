'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ForbiddenError, requireAction } from '@/lib/auth/context'
import type { FormState } from './resources'

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  role: z.string().max(100).optional(),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  isPrimary: z.boolean(),
})

export async function addSupplierContact(supplierId: string, _prev: FormState, form: FormData): Promise<FormState> {
  try {
    const ctx = await requireAction('suppliers', 'write')
    const s = await prisma.supplier.findFirst({ where: { id: supplierId, organizationId: ctx.org.id } })
    if (!s) throw new ForbiddenError('Supplier not found.')
    const parsed = contactSchema.safeParse({ name: form.get('name'), role: form.get('role') || undefined, email: form.get('email') || '', phone: form.get('phone') || undefined, isPrimary: form.get('isPrimary') === 'on' })
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message }
    if (parsed.data.isPrimary) await prisma.supplierContact.updateMany({ where: { supplierId }, data: { isPrimary: false } })
    await prisma.supplierContact.create({ data: { supplierId, ...parsed.data, email: parsed.data.email || null } })
    revalidatePath(`/suppliers/${supplierId}`)
    return { ok: true, message: 'Contact added.' }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Could not add contact.' }
  }
}

export async function deleteSupplierContact(contactId: string): Promise<FormState> {
  try {
    const ctx = await requireAction('suppliers', 'write')
    const c = await prisma.supplierContact.findFirst({ where: { id: contactId, supplier: { organizationId: ctx.org.id } } })
    if (!c) throw new ForbiddenError('Contact not found.')
    await prisma.supplierContact.delete({ where: { id: contactId } })
    revalidatePath(`/suppliers/${c.supplierId}`)
    return { ok: true, message: 'Contact removed.' }
  } catch (e) {
    return { ok: false, message: e instanceof ForbiddenError ? e.message : 'Could not remove contact.' }
  }
}
