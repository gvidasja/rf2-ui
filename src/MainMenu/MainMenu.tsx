import c from 'classnames'
import type { PropsWithChildren } from 'react'
import { NavLink } from 'react-router-dom'
import { asset } from '../api'
import styles from './MainMenu.module.css'

function MenuLink({ to, children }: PropsWithChildren<{ to: string }>) {
  return (
    <NavLink id={styles[to]} to={'/' + to}>
      <div className={c(styles.MenuItem, 'hover')}>
        <img alt={to} src={asset(`${to}.jpg`)} />
        <div className={styles.Text}>{children}</div>
      </div>
    </NavLink>
  )
}

export function MainMenu() {
  return (
    <div className={styles.MenuGrid}>
      <MenuLink to="sp">Single Player Race</MenuLink>
      <MenuLink to="mp">Multiplayer</MenuLink>
      <MenuLink to="cmp">Competition</MenuLink>
      <MenuLink to="watch">Watch</MenuLink>
      <MenuLink to="community">Community</MenuLink>
      <MenuLink to="profile">Profile</MenuLink>
      <MenuLink to="settings">Settings</MenuLink>
    </div>
  )
}
