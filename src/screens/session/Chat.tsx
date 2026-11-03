import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Car } from '../../../reference/rf2-api'
import { changeCarOnline, sendChat, useChat, useGameMode } from '../../api/session'
import { CarPicker } from '../CarPicker'
import { Button, Card, EmptyState, Stack, Text, TextField } from '../../ui'

const time = (t?: number) => (t ? new Date(t < 1e12 ? t * 1000 : t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '')

/** Online sessions: the server's chat. */
export function Chat() {
  const { data: mode } = useGameMode()
  const { data: messages } = useChat(!!mode?.online)
  const [text, setText] = useState('')
  const end = useRef<HTMLSpanElement>(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [messages?.length])

  const send = () => {
    const t = text.trim()
    if (!t) return
    setText('')
    void sendChat(t)
  }

  return (
    <Stack grow gap={4} pad={[5, 7]}>
      <Card title="Chat" grow scroll pad>
        {!messages?.length ? (
          <EmptyState title="No messages yet">Messages from everyone on the server show up here.</EmptyState>
        ) : (
          <Stack gap={2}>
            {messages.map((m, i) => (
              <Stack key={i} row gap={4} align="start">
                <Text tone="muted" variant="small">
                  {time(m.timestamp)}
                </Text>
                <Text>{m.message}</Text>
              </Stack>
            ))}
            <span ref={end} />
          </Stack>
        )}
      </Card>
      <Stack row gap={3}>
        <Stack grow>
          <TextField value={text} onChange={setText} onEnter={send} label="Message" placeholder="Message everyone on the server" autoFocus />
        </Stack>
        <Button onClick={send} disabled={!text.trim()}>
          Send
        </Button>
      </Stack>
    </Stack>
  )
}

/** Online practice: change to another car the server allows (you go back to the garage). */
export function ChangeCar() {
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const use = (car: Car) => {
    if (!car.vehFile) return setError('This car has no vehicle file.')
    void changeCarOnline(car.vehFile)
      .then(() => navigate('/', { replace: true }))
      .catch(() => setError('The server did not accept the change.'))
  }
  return <CarPicker onUse={use} back={false} note={error ?? 'Changing car is allowed in practice; you go back to the garage.'} />
}
