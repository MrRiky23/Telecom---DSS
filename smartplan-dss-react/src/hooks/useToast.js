import { useState, useRef, useEffect } from 'react'

/**
 * Estado y temporizador del toast global.
 * Un solo temporizador activo: cada toast nuevo cancela el anterior para no desaparecer antes de tiempo.
 */
export function useToast(duracionMs = 3500) {
  const [toastMessage, setToastMessage] = useState(null)
  const [toastType, setToastType] = useState('info')
  const toastTimerRef = useRef(null)

  const hideToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
      toastTimerRef.current = null
    }
    setToastMessage(null)
  }

  const showToast = (msg, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMessage(msg)
    setToastType(type)
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null
      setToastMessage(null)
    }, duracionMs)
  }

  // Limpia el temporizador al desmontar el componente.
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  return { toastMessage, toastType, showToast, hideToast }
}
