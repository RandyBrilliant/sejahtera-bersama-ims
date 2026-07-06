import { Html5Qrcode } from 'html5-qrcode'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import {
  clearScannerRegion,
  formatCameraFailure,
  isInsecureCameraError,
  isNoCameraApiError,
  isPermissionDeniedError,
  isPolicyBlockedError,
  safeReleaseScanner,
  startAttendanceQrScanner,
} from '@/lib/attendance-camera'
import { alert } from '@/lib/alert'

type CameraEnvIssue = 'insecure' | 'unsupported' | 'denied' | 'policy' | null

type Options = {
  onScan: (raw: string) => void | Promise<void>
  enabled?: boolean
}

export function useAttendanceQrScanner({ onScan, enabled = true }: Options) {
  const reactId = useId()
  const regionId = `attendance-scan-${reactId.replace(/:/g, '')}`

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const busyRef = useRef(false)
  const activeRef = useRef(true)
  const sessionEpochRef = useRef(0)
  const startLockRef = useRef<Promise<void> | null>(null)
  const onScanRef = useRef(onScan)

  const [scannerReady, setScannerReady] = useState(false)
  const [cameraEnvIssue, setCameraEnvIssue] = useState<CameraEnvIssue>(null)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const stopScanner = useCallback(async () => {
    const qr = scannerRef.current
    scannerRef.current = null
    if (!qr) {
      clearScannerRegion(regionId)
      return
    }
    await safeReleaseScanner(qr)
    clearScannerRegion(regionId)
    setScannerReady(false)
  }, [regionId])

  const startScanner = useCallback(async () => {
    if (!enabled) return

    if (startLockRef.current) {
      await startLockRef.current.catch(() => undefined)
    }

    const run = (async () => {
      await stopScanner()
      if (!activeRef.current || !enabled) return

      const epoch = sessionEpochRef.current

      try {
        const qr = await startAttendanceQrScanner({
          regionId,
          isActive: () => activeRef.current && sessionEpochRef.current === epoch,
          getEpoch: () => sessionEpochRef.current,
          onDecode: (trimmed) => {
            void (async () => {
              if (busyRef.current || !activeRef.current) return
              busyRef.current = true
              try {
                await onScanRef.current(trimmed)
              } finally {
                busyRef.current = false
              }
            })()
          },
        })
        scannerRef.current = qr
        if (!activeRef.current || sessionEpochRef.current !== epoch) {
          await safeReleaseScanner(qr)
          scannerRef.current = null
          clearScannerRegion(regionId)
          return
        }
        setCameraEnvIssue(null)
        setScannerReady(true)
      } catch (err) {
        scannerRef.current = null
        clearScannerRegion(regionId)
        if (!activeRef.current || sessionEpochRef.current !== epoch) return
        if (isInsecureCameraError(err)) setCameraEnvIssue('insecure')
        else if (isNoCameraApiError(err)) setCameraEnvIssue('unsupported')
        else if (isPermissionDeniedError(err)) setCameraEnvIssue('denied')
        else if (isPolicyBlockedError(err)) setCameraEnvIssue('policy')
        else setCameraEnvIssue(null)
        throw err
      }
    })()

    startLockRef.current = run
    try {
      await run
    } finally {
      if (startLockRef.current === run) startLockRef.current = null
    }
  }, [enabled, regionId, stopScanner])

  const handleCameraStartFailure = useCallback((err: unknown) => {
    const { title, detail } = formatCameraFailure(err)
    alert.error(title, detail)
    setScannerReady(false)
  }, [])

  useEffect(() => {
    activeRef.current = true
    if (!enabled) {
      void stopScanner()
      return () => {
        sessionEpochRef.current += 1
        activeRef.current = false
      }
    }

    void startScanner().catch((err: unknown) => {
      if (!activeRef.current) return
      handleCameraStartFailure(err)
    })

    return () => {
      sessionEpochRef.current += 1
      activeRef.current = false
      void stopScanner()
    }
  }, [enabled, handleCameraStartFailure, startScanner, stopScanner])

  const restartScanner = useCallback(() => {
    void startScanner().catch((err: unknown) => handleCameraStartFailure(err))
  }, [handleCameraStartFailure, startScanner])

  return {
    regionId,
    scannerReady,
    cameraEnvIssue,
    restartScanner,
  }
}
