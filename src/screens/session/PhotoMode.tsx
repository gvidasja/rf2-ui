import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PhotoModeEntry } from '../../../reference/rf2-api'
import { resetPhotoCamera, resetPhotoImage, setPhotoMode, setPhotoOption, setPhotoTarget, takePhoto, usePhotoOptions } from '../../api/photo'
import { focusNext, focusPrevious, useStandings } from '../../api/session'
import { Button, Card, Grid, PrimaryButton, Segmented, SettingRow, Stack, Stepper, Text, Toggle, useAction } from '../../ui'

const num = (v: unknown, fallback = 0) => (typeof v === 'number' ? v : fallback)

/** A photo-mode value: the game's own text for the current value (−/+ step by the game's step). */
function PhotoStepper({ entry, label, step, disabled }: { entry: PhotoModeEntry; label: string; step?: number; disabled?: boolean }) {
  const { data } = usePhotoOptions()
  const o = data?.[entry]
  const value = typeof o?.currentValue === 'number' ? o.currentValue : null
  return (
    <Stepper
      value={value}
      onChange={(v) => void setPhotoOption(entry, v)}
      min={num(o?.minValue)}
      max={num(o?.maxValue, 1)}
      step={step ?? num(o?.stepValue, 1)}
      format={(v) => (v === value ? o?.stringValue || String(v) : '…')}
      label={label}
      disabled={disabled || value == null}
      navId={entry}
    />
  )
}

/** Photo mode over the full-screen 3D view. P takes a photo, H hides the panel, Esc leaves. */
export function PhotoMode() {
  const navigate = useNavigate()
  const { data: options } = usePhotoOptions()
  const { data: standings } = useStandings()
  const [hidden, setHidden] = useState(false)
  const [shooting, setShooting] = useState(false)
  const [message, setMessage] = useState<string>()
  const focused = standings?.find((v) => v.hasFocus || v.focus)
  const tracking = num(options?.PM_FocusTracking?.currentValue, 1) === 1

  // photo mode is on while this screen is open
  useEffect(() => {
    void setPhotoMode(true)
    return () => void setPhotoMode(false)
  }, [])

  const leave = () => navigate('/fullscreen', { replace: true })
  const shoot = () => {
    if (shooting) return
    setShooting(true)
    setMessage(undefined)
    // the panel must not be in the picture: hide it, let a frame render, then take the shot
    window.setTimeout(() => {
      void takePhoto()
        .then((path) => setMessage(path ? `Saved: ${path}` : 'Saved.'))
        .catch(() => setMessage('The photo could not be saved.'))
        .finally(() => setShooting(false))
    }, 250)
  }
  useAction('back', leave)
  useAction('hideUi', () => setHidden((h) => !h), hidden ? 'Show panel' : 'Hide panel')
  useAction('primary', shoot, 'Take photo')

  if (hidden || shooting) return null
  return (
    <Grid grow columns="minmax(0, 1fr) 460px" pad={[6, 6]}>
      <span />
      <Card title="Photo mode" action={<Button size="s" variant="quiet" onClick={leave}>Exit</Button>} scroll>
        <Stack pad={[2, 4]} gap={1}>
          <Text variant="label">Camera</Text>
          <SettingRow label="Target">
            <Stack row gap={2}>
              <Button size="s" variant="quiet" label="Previous car" onClick={() => void focusPrevious().then(setPhotoTarget)}>‹</Button>
              <Text weight="medium" truncate>{focused ? `P${focused.position} · ${focused.driverName}` : '—'}</Text>
              <Button size="s" variant="quiet" label="Next car" onClick={() => void focusNext().then(setPhotoTarget)}>›</Button>
            </Stack>
          </SettingRow>
          <SettingRow label="Mouse look" help="Drag to orbit the camera, wheel to zoom.">
            <Toggle on={num(options?.PM_Mouselook?.currentValue) === 1} onChange={(on) => void setPhotoOption('PM_Mouselook', on ? 1 : 0)} label="Mouse look" />
          </SettingRow>
          <SettingRow label="Focus">
            <Segmented
              options={[
                { value: 1, label: 'Track car' },
                { value: 0, label: 'Manual' },
              ]}
              value={tracking ? 1 : 0}
              onChange={(v) => void setPhotoOption('PM_FocusTracking', v)}
              label="Focus"
            />
          </SettingRow>
          <SettingRow label="Focus distance" disabledReason={tracking ? 'Manual focus only' : undefined}>
            <PhotoStepper entry="PM_FocusValue" label="Focus distance" step={0.5} disabled={tracking} />
          </SettingRow>
          <Text variant="label">Lens</Text>
          <SettingRow label="Focal length">
            <PhotoStepper entry="PM_Sensor" label="Focal length" />
          </SettingRow>
          <SettingRow label="Aperture">
            <PhotoStepper entry="PM_Aperture" label="Aperture" step={0.2} />
          </SettingRow>
          <Text variant="label">Image</Text>
          <SettingRow label="Exposure">
            <PhotoStepper entry="PM_ExposureScalar" label="Exposure" step={0.05} />
          </SettingRow>
          <SettingRow label="Contrast">
            <PhotoStepper entry="PM_Contrast" label="Contrast" step={0.05} />
          </SettingRow>
          <SettingRow label="Saturation">
            <PhotoStepper entry="PM_Saturation" label="Saturation" step={0.05} />
          </SettingRow>
          <SettingRow label="White balance">
            <PhotoStepper entry="PM_Temperature" label="White balance" />
          </SettingRow>
          <Grid columns={2} gap={3} pad={[3, 0]}>
            <Button full onClick={() => void resetPhotoCamera()}>Reset camera</Button>
            <Button full onClick={() => void resetPhotoImage()}>Reset image</Button>
          </Grid>
          <PrimaryButton onClick={shoot} navId="shoot">
            Take photo
          </PrimaryButton>
          <Text variant="small" tone="muted">
            {message ?? 'Photos are saved to UserData\\ScreenShots. H hides this panel.'}
          </Text>
        </Stack>
      </Card>
    </Grid>
  )
}
