'use client'

import * as React from 'react'

interface ShellState {
  mobileOpen: boolean
  setMobileOpen: (o: boolean) => void
  crumb: string | null
  setCrumb: (c: string | null) => void
  paletteOpen: boolean
  setPaletteOpen: (o: boolean) => void
}

const Ctx = React.createContext<ShellState | null>(null)

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [crumb, setCrumb] = React.useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const value = React.useMemo(() => ({ mobileOpen, setMobileOpen, crumb, setCrumb, paletteOpen, setPaletteOpen }), [mobileOpen, crumb, paletteOpen])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShell() {
  const v = React.useContext(Ctx)
  if (!v) throw new Error('useShell outside ShellProvider')
  return v
}

/** Lets a detail page name the last breadcrumb (e.g. the record title). */
export function Crumb({ label }: { label: string }) {
  const { setCrumb } = useShell()
  React.useEffect(() => {
    setCrumb(label)
    return () => setCrumb(null)
  }, [label, setCrumb])
  return null
}
