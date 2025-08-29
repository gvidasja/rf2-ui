import { createContext, useCallback, useContext, useEffect, useReducer, type PropsWithChildren } from 'react'
import { getSettings, updateSetting, type SessionSetting, type SessionSettings } from '../../api'

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

const SettingsContext = createContext<{
  state: SessionSettings
  inc: (key: string, value: number) => void
  reload: () => void
}>({ state: {}, inc() {}, reload() {} })

export function SessionSettingsProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(settingsReducer, {})

  const inc = useCallback(async (key: string, value: number) => {
    const newValue = await updateSetting(key, value)
    dispatch({ type: 'UPDATE_PROP', key, value: newValue })
  }, [])

  const reload = useCallback(async () => {
    const settings = await getSettings()
    dispatch({ type: 'SET_STATE', value: settings })
  }, [])

  useEffect(() => {
    reload()
  }, [])

  return <SettingsContext.Provider value={{ state, inc, reload }}>{children}</SettingsContext.Provider>
}

export function useSessionSettings() {
  return useContext(SettingsContext)
}
