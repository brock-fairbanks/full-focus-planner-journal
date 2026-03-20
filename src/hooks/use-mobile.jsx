import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}

export function useIsSmallPhone() {
  const [isSmallPhone, setIsSmallPhone] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: 639px)`)
    const onChange = () => {
      setIsSmallPhone(window.innerWidth < 640)
    }
    mql.addEventListener("change", onChange)
    setIsSmallPhone(window.innerWidth < 640)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isSmallPhone
}