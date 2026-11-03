import { useState } from 'react'
import { exitFullScreen, focusNext, focusPrevious, transport, useSessionInfo, useStandings } from '../../api/session'
import { clock } from '../../session/format'
import { Button, Card, ReplayTransport, Stack, Text, useAction } from '../../ui'

/** The full-screen monitor (native page MONITOR MAXIMIZED): only a bar at the bottom; H hides it. */
export function Fullscreen() {
  const { data: info } = useSessionInfo()
  const { data: standings } = useStandings()
  const [live, setLive] = useState(true)
  const [hidden, setHidden] = useState(false)
  useAction('back', () => void exitFullScreen())
  useAction('hideUi', () => setHidden((h) => !h), hidden ? 'Show bar' : 'Hide bar')
  const focused = standings?.find((v) => v.hasFocus || v.focus)
  if (hidden) return null
  return (
    <Stack fill justify="end" pad={6}>
      <Card pad>
        <Stack row gap={4}>
          <Button onClick={() => void exitFullScreen()} autoFocus>
            Exit full screen
          </Button>
          <Button size="s" variant="quiet" label="Previous car" onClick={() => void focusPrevious()}>‹</Button>
          <Text weight="medium" truncate>{focused ? `P${focused.position} · ${focused.driverName}` : ''}</Text>
          <Button size="s" variant="quiet" label="Next car" onClick={() => void focusNext()}>›</Button>
          <Stack grow>
            <ReplayTransport
              onCommand={(c) => {
                setLive(c === 'live')
                void transport(c)
              }}
              live={live}
              clock={clock(info?.currentEventTime)}
            />
          </Stack>
        </Stack>
      </Card>
    </Stack>
  )
}
