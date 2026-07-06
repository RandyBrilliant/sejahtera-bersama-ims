import { Html5Qrcode } from 'html5-qrcode'

export const CAMERA_ERR_INSECURE = '__CAMERA_INSECURE_CONTEXT__'
export const CAMERA_ERR_NO_API = '__CAMERA_API_UNSUPPORTED__'
export const CAMERA_ERR_PERMISSION_DENIED = '__CAMERA_PERMISSION_DENIED__'
export const CAMERA_ERR_POLICY_BLOCKED = '__CAMERA_PERMISSIONS_POLICY_BLOCKED__'

export function assertCameraAllowedByDocumentPolicyOrThrow() {
  type DocWithPermissionsPolicy = Document & {
    permissionsPolicy?: { allowsFeature: (feature: string) => boolean }
  }
  const pp = (document as DocWithPermissionsPolicy).permissionsPolicy
  if (!pp) return
  try {
    if (!pp.allowsFeature('camera')) {
      throw new Error(CAMERA_ERR_POLICY_BLOCKED)
    }
  } catch (e) {
    if (e instanceof Error && e.message === CAMERA_ERR_POLICY_BLOCKED) throw e
  }
}

export function assertCameraEnvironmentOrThrow() {
  if (typeof window === 'undefined') return
  if (!window.isSecureContext) {
    throw new Error(CAMERA_ERR_INSECURE)
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(CAMERA_ERR_NO_API)
  }
}

export function formatCameraFailure(err: unknown): { title: string; detail: string } {
  const title = 'Kamera'
  if (err instanceof Error) {
    if (err.message === CAMERA_ERR_INSECURE) {
      return {
        title,
        detail:
          'Browser tidak menampilkan izin kamera untuk halaman HTTP. Buka aplikasi lewat HTTPS atau tunnel dengan SSL.',
      }
    }
    if (err.message === CAMERA_ERR_NO_API) {
      return {
        title,
        detail: 'Peramban ini tidak mendukung akses kamera. Coba Chrome atau Samsung Internet terbaru.',
      }
    }
    if (err.message === CAMERA_ERR_PERMISSION_DENIED) {
      return {
        title,
        detail:
          'Izin kamera ditolak. Buka pengaturan situs di browser dan setel Kamera ke Izinkan, lalu muat ulang.',
      }
    }
    if (err.message === CAMERA_ERR_POLICY_BLOCKED) {
      return {
        title,
        detail:
          'Kamera diblokir oleh Permissions-Policy pada situs ini. Pastikan deployment memakai `camera=(self)`.',
      }
    }
  }

  if (err instanceof DOMException && err.name === 'NotAllowedError') {
    return {
      title,
      detail: 'Akses kamera ditolak. Ubah izin kamera di pengaturan situs browser.',
    }
  }

  const raw =
    typeof err === 'string'
      ? err
      : err instanceof DOMException
        ? `${err.name}: ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err)

  return { title, detail: `Tidak dapat memulai kamera. ${raw}` }
}

export function isInsecureCameraError(err: unknown): boolean {
  return err instanceof Error && err.message === CAMERA_ERR_INSECURE
}

export function isNoCameraApiError(err: unknown): boolean {
  return err instanceof Error && err.message === CAMERA_ERR_NO_API
}

export function isPermissionDeniedError(err: unknown): boolean {
  return err instanceof Error && err.message === CAMERA_ERR_PERMISSION_DENIED
}

export function isPolicyBlockedError(err: unknown): boolean {
  return err instanceof Error && err.message === CAMERA_ERR_POLICY_BLOCKED
}

export async function assertCameraPermissionNotDeniedOrThrow() {
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName })
    if (status.state === 'denied') {
      throw new Error(CAMERA_ERR_PERMISSION_DENIED)
    }
  } catch (e) {
    if (e instanceof Error && e.message === CAMERA_ERR_PERMISSION_DENIED) throw e
  }
}

async function pickCameraIdForQrScan(): Promise<string | undefined> {
  try {
    const devices = await Html5Qrcode.getCameras()
    if (!devices?.length) return undefined
    const preferBack = (label: string) =>
      /back|rear|belakang|environment|wide|ultra|world/i.test(label)
    const preferFront = (label: string) => /front|user|depan|selfie|facetime/i.test(label)
    const withLabel = devices.filter((d) => d.label?.trim())
    const back = withLabel.find((d) => preferBack(d.label))
    if (back) return back.id
    const nonFront = withLabel.find((d) => !preferFront(d.label))
    if (nonFront) return nonFront.id
    if (devices.length === 1) return devices[0].id
    return devices[devices.length - 1]?.id
  } catch {
    return undefined
  }
}

type CameraStartConfig = string | { facingMode: string }

async function resolveCameraStartConfig(): Promise<CameraStartConfig> {
  const id = await pickCameraIdForQrScan()
  if (id) return id
  return { facingMode: 'environment' }
}

export async function safeReleaseScanner(qr: Html5Qrcode) {
  try {
    await qr.stop()
  } catch {
    /* noop */
  }
  try {
    await qr.clear()
  } catch {
    /* noop */
  }
}

export function clearScannerRegion(regionId: string) {
  const el = document.getElementById(regionId)
  if (el) el.innerHTML = ''
}

type StartScannerOptions = {
  regionId: string
  onDecode: (text: string) => void
  isActive: () => boolean
  getEpoch: () => number
}

export async function startAttendanceQrScanner({
  regionId,
  onDecode,
  isActive,
  getEpoch,
}: StartScannerOptions): Promise<Html5Qrcode> {
  assertCameraEnvironmentOrThrow()
  assertCameraAllowedByDocumentPolicyOrThrow()
  await assertCameraPermissionNotDeniedOrThrow()

  const epoch = getEpoch()
  clearScannerRegion(regionId)

  let qr = new Html5Qrcode(regionId, {
    verbose: false,
    experimentalFeatures: { useBarCodeDetectorIfSupported: false },
  })

  const config = { fps: 10, qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
    const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.72
    return { width: size, height: size }
  } }

  const tryStart = async (camera: CameraStartConfig) => {
    await qr.start(
      camera,
      config,
      (decodedText) => {
        if (!isActive()) return
        const trimmed = decodedText.trim()
        if (trimmed) onDecode(trimmed)
      },
      () => {
        /* frame errors ignored */
      }
    )
  }

  let camera = await resolveCameraStartConfig()
  if (!isActive() || getEpoch() !== epoch) {
    await safeReleaseScanner(qr)
    clearScannerRegion(regionId)
    throw new Error('Scanner dibatalkan')
  }

  try {
    await tryStart(camera)
  } catch (firstErr) {
    if (typeof camera === 'string') throw firstErr
    await safeReleaseScanner(qr)
    clearScannerRegion(regionId)
    qr = new Html5Qrcode(regionId, {
      verbose: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: false },
    })
    camera = { facingMode: 'user' }
    await tryStart(camera)
  }

  if (!isActive() || getEpoch() !== epoch) {
    await safeReleaseScanner(qr)
    clearScannerRegion(regionId)
    throw new Error('Scanner dibatalkan')
  }

  return qr
}
