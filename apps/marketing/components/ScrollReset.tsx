'use client'
import { useEffect } from 'react'

// Disables browser scroll restoration and forces the page to the top on load.
// Without this, the browser reopens at whatever scroll position it last saved,
// and scroll-snap then jumps to the nearest section (often mid-page).
export function ScrollReset() {
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return null
}
