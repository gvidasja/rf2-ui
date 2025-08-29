import { useReducer } from 'react'
import type { SessionSetting, SessionSettings } from '../../api'

export type SettingsAction =
  | { type: 'UPDATE_PROP'; key: string; value: SessionSetting }
  | { type: 'SET_STATE'; value: SessionSettings }

function settingsReducer(state: SessionSettings, action: SettingsAction) {
  switch (action.type) {
    case 'UPDATE_PROP':
      return {
        ...state,
        [action.key]: action.value,
      }
    case 'SET_STATE':
      return action.value
    default:
      return state
  }
}

export function useSettingsReducer() {
  return useReducer(settingsReducer, {})
}
