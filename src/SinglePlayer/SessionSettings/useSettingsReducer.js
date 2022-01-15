import { useReducer } from 'react'

export function useSettingsReducer() {
  return useReducer((state, { type, ...action }) => {
    switch (type) {
      case UPDATE_PROP:
        return {
          ...state,
          [action.key]: action.value,
        }
      case SET_STATE:
        return action.value
      default:
        return state
    }
  }, null)
}

export const UPDATE_PROP = 'UPDATE_PROP'
export const SET_STATE = 'SET_STATE'
