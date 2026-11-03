import type { RaceSelection } from '../../reference/rf2-api'
import { settingValue, type Amounts, type Settings } from '../api/sessions'
import { liveryName } from './content'
import { formatSetting } from './settings'

/** "Practice 60 min · Qualifying 15 min · Race 30 min · 20 AI" */
export function sessionSummary(settings: Settings | undefined, amounts: Amounts | undefined) {
  if (!settings || !amounts) return ''
  const parts: string[] = []
  const len = (key: 'SESSSET_Practice_Length' | 'SESSSET_Qualify_Length' | 'SESSSET_WarmUp_Length' | 'SESSSET_race_time') => {
    const v = settingValue(settings, key)
    return v == null ? '' : ` ${formatSetting(key, v)}`
  }
  const count = (n: number | undefined, name: string) => (n && n > 1 ? `${n}× ${name}` : name)
  if (amounts.PRACTICE) parts.push(count(amounts.PRACTICE, 'Practice') + len('SESSSET_Practice_Length'))
  if (amounts.QUALIFY) parts.push(count(amounts.QUALIFY, 'Qualifying') + len('SESSSET_Qualify_Length'))
  if (amounts.WARMUP) parts.push('Warm-up' + len('SESSSET_WarmUp_Length'))
  if (amounts.RACE) {
    const criteria = settingValue(settings, 'SESSSET_Finish_Criteria')
    const laps = settingValue(settings, 'SESSSET_Race_Laps')
    const race = criteria === 1 && laps != null ? ` ${laps} laps` : len('SESSSET_race_time')
    parts.push(count(amounts.RACE, 'Race') + race)
  }
  const ai = settingValue(settings, 'SESSSET_Num_Opponents')
  parts.push(ai ? `${ai} AI` : 'no AI')
  const weather = settingValue(settings, 'SESSSET_weather')
  if (weather != null) parts.push(`${formatSetting('SESSSET_weather', weather).toLowerCase()} weather`)
  return parts.join(' · ')
}

export function selectionTitle(sel: RaceSelection | undefined) {
  if (!sel?.car || !sel.track) return 'Race'
  return `${carModelName(sel)} at ${sel.track.name ?? sel.track.shortName}`
}

export function carModelName(sel: RaceSelection | undefined) {
  const path = sel?.car?.fullPathTree?.split(',')
  return path ? path[path.length - 1].trim() : liveryName(sel?.car ?? {owned: true, premId: 0})
}
