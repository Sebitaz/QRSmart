import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ticketsApi } from '../api/tickets'
import { soundFx } from '../utils/sound'
import { IconAlert, IconCheck, IconQrCode, IconX } from './Icons'

const COOLDOWN_MS = 2800

const OVERLAY_CONFIG = {
  ALLOWED: {
    themeClass: 'scan-overlay-allowed',
    title: 'Acceso Permitido',
    subtitle: 'Entrada validada correctamente',
  },
  USED: {
    themeClass: 'scan-overlay-used',
    title: 'Ticket Ya Usado',
    subtitle: 'Esta entrada ya fue registrada anteriormente',
  },
  INVALID: {
    themeClass: 'scan-overlay-invalid',
    title: 'Ticket Inválido',
    subtitle: 'El código QR no corresponde a una entrada válida',
  },
}

function OverlayBadgeIcon({ type }) {
  if (type === 'ALLOWED') return <IconCheck size={42} />
  if (type === 'USED') return <IconX size={42} />
  return <IconAlert size={40} />
}

async function safelyStopScanner(scanner) {
  if (!scanner) return
  try {
    const state = scanner.getState()
    if (
      state === Html5QrcodeScannerState.SCANNING ||
      state === Html5QrcodeScannerState.PAUSED
    ) {
      await scanner.stop()
    }
  } catch {
    // Ignorar si el stream ya fue cerrado por el navegador
  }
  try {
    scanner.clear()
  } catch {
    // Ignorar si el nodo del DOM ya fue desmontado
  }
}

export default function QrScanner() {
  const readerId = useId().replace(/:/g, '-')
  const scannerContainerId = `qrsmart-reader-${readerId}`

  const scannerRef = useRef(null)
  const isProcessingRef = useRef(false)
  const cooldownTimerRef = useRef(null)
  const mountedRef = useRef(true)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [validating, setValidating] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [history, setHistory] = useState([])

  const resumeScanner = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current)
      cooldownTimerRef.current = null
    }
    if (!mountedRef.current) return

    setScanResult(null)
    setValidating(false)

    const scanner = scannerRef.current
    if (scanner) {
      try {
        if (scanner.getState() === Html5QrcodeScannerState.PAUSED) {
          scanner.resume()
        }
      } catch {
        // Si la cámara no estaba en estado PAUSED, continúa normalmente
      }
    }
    isProcessingRef.current = false
  }, [])

  const validateCode = useCallback(
    async (rawCode) => {
      const cleanedCode = String(rawCode ?? '').trim()
      if (!cleanedCode) return

      setValidating(true)
      let outcome

      try {
        const data = await ticketsApi.validate(cleanedCode)
        soundFx.scanAllowed()
        outcome = {
          type: 'ALLOWED',
          code: cleanedCode,
          detail: `${data.holder?.full_name ?? 'Asistente'} · ${data.event?.name ?? 'Evento'}`,
          timestamp: new Date().toLocaleTimeString('es-CO'),
        }
      } catch (err) {
        if (err.status === 409) {
          soundFx.scanUsed()
          outcome = {
            type: 'USED',
            code: cleanedCode,
            detail: err.message || 'Este ticket ya fue utilizado en puerta.',
            timestamp: new Date().toLocaleTimeString('es-CO'),
          }
        } else if (err.status === 404 || err.status === 400) {
          soundFx.scanInvalid()
          outcome = {
            type: 'INVALID',
            code: cleanedCode,
            detail:
              err.status === 404
                ? 'No existe ningún ticket registrado con este UUID.'
                : 'El código leído no tiene un formato UUID v4 válido.',
            timestamp: new Date().toLocaleTimeString('es-CO'),
          }
        } else {
          soundFx.scanInvalid()
          outcome = {
            type: 'INVALID',
            code: cleanedCode,
            detail: err.message || 'Error al verificar el código QR.',
            timestamp: new Date().toLocaleTimeString('es-CO'),
          }
        }
      }

      if (!mountedRef.current) return

      setValidating(false)
      setScanResult(outcome)
      setHistory((prev) => [outcome, ...prev.slice(0, 4)])

      cooldownTimerRef.current = setTimeout(() => {
        resumeScanner()
      }, COOLDOWN_MS)
    },
    [resumeScanner]
  )

  const handleQrDetected = useCallback(
    (decodedText) => {
      // 2. SISTEMA DE COOLDOWN: bloqueo inmediato síncrono + pausa de cámara antes del request HTTP
      if (isProcessingRef.current) return
      isProcessingRef.current = true

      const scanner = scannerRef.current
      if (scanner) {
        try {
          if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
            scanner.pause(true)
          }
        } catch {
          // Continúa con la validación aunque el frame no admita pausa
        }
      }

      validateCode(decodedText)
    },
    [validateCode]
  )

  useEffect(() => {
    mountedRef.current = true
    const html5QrCode = new Html5Qrcode(scannerContainerId)
    scannerRef.current = html5QrCode

    const scannerConfig = {
      fps: 10,
      aspectRatio: 1.0,
    }

    // 1. CONFIGURACIÓN DE CÁMARA: fuerza la cámara trasera (facingMode: "environment")
    html5QrCode
      .start(
        { facingMode: 'environment' },
        scannerConfig,
        handleQrDetected,
        () => {
          // Errores por frame sin QR se ignoran intencionalmente
        }
      )
      .then(() => {
        if (mountedRef.current) {
          setCameraActive(true)
          setCameraError('')
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setCameraActive(false)
          setCameraError(
            err?.message ||
              'No se pudo acceder a la cámara trasera. Verifica los permisos del navegador.'
          )
        }
      })

    // 5. CLEANUP EN DESMONTAJE: detiene la cámara y limpia timers para evitar memory leaks
    return () => {
      mountedRef.current = false
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current)
      }
      safelyStopScanner(html5QrCode)
    }
  }, [scannerContainerId, handleQrDetected])

  const handleManualSubmit = (event) => {
    event.preventDefault()
    if (!manualCode.trim() || isProcessingRef.current) return
    soundFx.tap()
    isProcessingRef.current = true
    const codeToValidate = manualCode.trim()
    setManualCode('')
    validateCode(codeToValidate)
  }

  const activeOverlay = scanResult ? OVERLAY_CONFIG[scanResult.type] : null

  return (
    <div className="scanner-wrapper">
      <div className="card scanner-card">
        <div className="scanner-status-bar">
          <span className={`scanner-dot ${cameraActive ? 'scanner-dot-live' : ''}`} />
          <span>
            {validating
              ? 'Verificando ticket en servidor…'
              : cameraActive
                ? 'Cámara trasera activa · Apunta al código QR'
                : 'Esperando acceso a la cámara…'}
          </span>
        </div>

        <div className="scanner-viewport-container">
          <div id={scannerContainerId} className="scanner-viewport" />
          {cameraActive && !scanResult && (
            <div className="scanner-reticle" aria-hidden="true">
              <span className="reticle-corner reticle-tl" />
              <span className="reticle-corner reticle-tr" />
              <span className="reticle-corner reticle-bl" />
              <span className="reticle-corner reticle-br" />
              <span className="scanner-laser-beam" />
            </div>
          )}
        </div>

        {cameraError && (
          <div className="alert alert-error scanner-camera-alert" role="alert">
            <strong>Cámara no disponible:</strong> {cameraError}
          </div>
        )}

        <form className="scanner-manual-form" onSubmit={handleManualSubmit}>
          <label htmlFor="manual-qr-uuid" className="muted">
            ¿Problemas con el brillo o cámara? Ingresa el UUID manualmente:
          </label>
          <div className="scanner-manual-row">
            <input
              id="manual-qr-uuid"
              type="text"
              placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              disabled={validating || Boolean(scanResult)}
            />
            <button
              type="submit"
              className="btn btn-primary btn-icon-label"
              disabled={!manualCode.trim() || validating || Boolean(scanResult)}
            >
              <IconQrCode size={15} />
              <span>Validar</span>
            </button>
          </div>
        </form>
      </div>

      {history.length > 0 && (
        <div className="card scanner-history-card">
          <h3>Últimas lecturas en puerta</h3>
          <ul className="scanner-history-list">
            {history.map((item, index) => (
              <li key={`${item.code}-${item.timestamp}-${index}`} className="scanner-history-item">
                <span className={`badge badge-scan-${item.type.toLowerCase()}`}>
                  {OVERLAY_CONFIG[item.type]?.title}
                </span>
                <span className="scanner-history-detail">{item.detail}</span>
                <code className="ticket-code tabular-nums">{item.timestamp}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {scanResult && activeOverlay && (
        <div
          className={`scan-fullscreen-overlay ${activeOverlay.themeClass}`}
          role="alertdialog"
          aria-live="assertive"
          aria-labelledby="scan-result-title"
          onClick={() => {
            soundFx.tap()
            resumeScanner()
          }}
        >
          <div className="scan-overlay-content">
            <div className="scan-overlay-icon" aria-hidden="true">
              <OverlayBadgeIcon type={scanResult.type} />
            </div>
            <h2 id="scan-result-title" className="scan-overlay-title">
              {activeOverlay.title}
            </h2>
            <p className="scan-overlay-subtitle">{activeOverlay.subtitle}</p>
            <div className="scan-overlay-meta">
              <p className="scan-overlay-detail">{scanResult.detail}</p>
              <code className="scan-overlay-uuid">{scanResult.code}</code>
            </div>
            <div className="scan-cooldown-bar" aria-hidden="true">
              <div className="scan-cooldown-progress" />
            </div>
            <button
              type="button"
              className="btn scan-overlay-btn"
              onClick={(event) => {
                event.stopPropagation()
                soundFx.tap()
                resumeScanner()
              }}
            >
              Escanear siguiente asistente ahora
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
