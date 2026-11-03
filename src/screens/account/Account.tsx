import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { lastSeenNotification, markNotificationsSeen, useNotifications, useOnlineStatus, type OnlineStatus } from '../../api/account'
import { Button, Card, EmptyState, Media, Stack, StatusIndicator, Text, type StatusKind } from '../../ui'

const STATUS: Record<OnlineStatus['kind'], [StatusKind, string]> = {
  online: ['online', 'Online'],
  'steam-offline': ['offline', 'Offline · Steam is not connected'],
  'no-account': ['connecting', 'Steam online · no Competition System account'],
  unavailable: ['error', 'Online services unavailable'],
}

/** Online status in words. */
export function OnlineStatusText() {
  const { data } = useOnlineStatus()
  const [kind, text] = data ? STATUS[data.kind] : (['connecting', 'Checking online status…'] as const)
  return <StatusIndicator kind={kind}>{text}</StatusIndicator>
}

/** Top bar: online status and the notifications button (with the unread count). */
export function AccountBar() {
  const navigate = useNavigate()
  const { data: status } = useOnlineStatus()
  const { data: list } = useNotifications(status?.kind === 'online')
  const seen = lastSeenNotification()
  const unread = (list ?? []).filter((n) => n.dateFrom > seen).length
  return (
    <Stack row gap={4}>
      <OnlineStatusText />
      {status?.kind === 'online' && (
        <Button size="s" variant="quiet" onClick={() => navigate('/notifications')} navId="notifications">
          {unread ? `Notifications · ${unread}` : 'Notifications'}
        </Button>
      )}
    </Stack>
  )
}

/** Studio 397 announcements, newest first; opening the page marks them read. */
export function Notifications() {
  const { data: status } = useOnlineStatus()
  const { data: list, error } = useNotifications(status?.kind === 'online')
  const seen = lastSeenNotification()
  useEffect(() => {
    if (list?.length) markNotificationsSeen(list)
  }, [list])

  if (status && status.kind !== 'online') return <EmptyState title="Notifications need the online services">{STATUS[status.kind][1]}.</EmptyState>
  if (error) return <EmptyState title="Notifications are not available">The online service did not answer.</EmptyState>
  if (list && !list.length) return <EmptyState title="No notifications">Announcements from Studio 397 show up here.</EmptyState>
  return (
    <Stack grow scroll pad={[5, 7]} gap={5}>
      {(list ?? []).map((n) => (
        <Card key={n.dateFrom} title={new Date(n.dateFrom * (n.dateFrom < 1e12 ? 1000 : 1)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} action={n.dateFrom > seen ? <Text variant="small" tone="muted">New</Text> : undefined} pad>
          <Stack gap={4}>
            {n.image && <Media src={n.image} label={n.title ?? ''} height={240} cover />}
            {n.title && <Text variant="title" weight="bold">{n.title}</Text>}
            {n.text && <Text>{n.text}</Text>}
            {n.link && <Text variant="small" tone="muted">{n.link}</Text>}
          </Stack>
        </Card>
      ))}
    </Stack>
  )
}
