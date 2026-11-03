import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { quitGame, useProfile } from '../api/race'
import { NotificationsButton, OnlineStatusText } from './account/Account'
import { AREAS } from './areas'
import { switchToStockUi } from '../stockUi'
import { Button, ConfirmButton, Frame, MainMenuLayout, Stack, UnderConstruction, type MenuItem } from '../ui'

/**
 * Every menu screen: the rail of areas on the left, the current area's screen on the right. The home
 * screen is the rail alone.
 */
export function MenuFrame() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { data: profile } = useProfile()
  const current = AREAS.find((a) => pathname === a.path || pathname.startsWith(`${a.path}/`))?.id
  const items: MenuItem[] = AREAS.map((a) => ({
    id: a.id,
    label: a.label,
    sub:
      a.id === 'profile' ? (
        <Stack gap={1}>
          {(profile?.nick ?? profile?.name) && <span>{profile?.nick ?? profile?.name}</span>}
          <OnlineStatusText />
        </Stack>
      ) : undefined,
    onOpen: () => navigate(a.path, { replace: pathname !== '/' }),
  }))
  const home = pathname === '/'
  // the home screen has no content to focus: start on the rail
  useEffect(() => {
    if (!home) return
    const t = window.setTimeout(() => {
      const el = document.activeElement
      if (!el || el === document.body || !el.closest('nav')) document.querySelector<HTMLElement>('[data-nav-id^="menu-"][data-autofocus]')?.focus()
    }, 50)
    return () => window.clearTimeout(t)
  }, [home])

  return (
    <Frame hints={home ? ['move', 'select'] : undefined}>
      <MainMenuLayout
        items={items}
        current={current}
        autoFocus={home}
        onHome={() => navigate('/')}
        bottom={
          <Stack gap={2}>
            <NotificationsButton />
            <Button variant="quiet" full onClick={switchToStockUi} navId="stock-ui">
              Switch to the stock UI
            </Button>
            <ConfirmButton variant="quiet" full question="Quit rFactor 2?" confirmLabel="Quit" onConfirm={() => void quitGame()}>
              Quit
            </ConfirmButton>
          </Stack>
        }
      >
        <Outlet />
      </MainMenuLayout>
    </Frame>
  )
}

/** An area that is not rebuilt yet; the stock UI still has it. */
export function StockArea({ name }: { name: string }) {
  return (
    <UnderConstruction
      name={name}
      plan="Until then the stock UI has it; its NEW UI button brings you back."
      action={<Button variant="primary" onClick={switchToStockUi}>Open the stock UI</Button>}
    />
  )
}
