export const SETTING_TYPE = {
  PRACTICE: 'set',
  QUALIFY: 'set',
  RACE: 'set',
  WARMUP: 'set',
  DEFAULT: 'inc',
}

export const SHOULD_RELOAD = {
  SESSSET_Finish_Criteria: ['SESSSET_Race_Laps', 'SESSSET_race_time'],
  SESSSET_weather: true,
}

export const SETTING_CATEGORIES = {
  MAIN: {
    PRACTICE: ['PRACTICE', 'SESSSET_private_prac', 'SESSSET_Practice_Length', 'SESSSET_practice1_starting_time'],
    QUALIFY: [
      'QUALIFY',
      'SESSSET_private_qual',
      'SESSSET_Qualify_Length',
      'SESSSET_Qualify_Laps',
      'SESSSET_qualify_starting_time',
    ],
    WARMUP: ['WARMUP', 'SESSSET_WarmUp_Length', 'SESSSET_warmup_starting_time'],
    RACE: [
      'RACE',
      'SESSSET_formation',
      'SESSSET_Grid_Position',
      'SESSSET_Finish_Criteria',
      'SESSSET_race_time',
      'SESSSET_Race_Laps',
      'SESSSET_race_starting_time',
    ],
    GENERAL: [
      'SESSSET_race_timescale',
      'SESSSET_flag_rules',
      'SESSSET_Fuel_Usage',
      'SESSSET_Tire_Wear',
      'SESSSET_Mech_Failures',
      'SESSSET_Damage_Multi',
    ],
  },
  OPPONENTS: {
    OPPONENTS: ['SESSSET_Num_Opponents', 'SESSSET_AI_Strength', 'SESSSET_AI_Aggression', 'SESSSET_AI_Limiter'],
  },
  CONDITIONS: {
    WEATHER: ['SESSSET_weather'],
    REALROAD: [
      'SESSSET_pract1_realroad_init',
      'SESSSET_realroad_timescale_practice',
      'SESSSET_qual1_realroad_init',
      'SESSSET_realroad_timescale_qualify',
      'SESSSET_race_realroad_init',
      'SESSSET_realroad_timescale_race',
    ],
  },
}

export const DISABLED = {
  ...forKeys(SETTING_CATEGORIES.MAIN.PRACTICE.slice(1), (state) => eq(state, 'PRACTICE', 0)),
  ...forKeys(SETTING_CATEGORIES.MAIN.QUALIFY.slice(1), (state) => eq(state, 'QUALIFY', 0)),
  ...forKeys(SETTING_CATEGORIES.MAIN.WARMUP.slice(1), (state) => eq(state, 'WARMUP', 0)),
  ...forKeys(SETTING_CATEGORIES.MAIN.RACE.slice(1), (state) => eq(state, 'RACE', 0)),
  SESSSET_pract1_realroad_init: (state) => eq(state, 'PRACTICE', 0) || notEq(state, 'SESSSET_weather', 4),
  SESSSET_qual1_realroad_init: (state) => eq(state, 'QUALIFY', 0) || notEq(state, 'SESSSET_weather', 4),
  SESSSET_race_realroad_init: (state) => eq(state, 'RACE', 0) || notEq(state, 'SESSSET_weather', 4),
  SESSSET_realroad_timescale_practice: (state) => eq(state, 'PRACTICE', 0),
  SESSSET_realroad_timescale_qualify: (state) => eq(state, 'QUALIFY', 0),
  SESSSET_realroad_timescale_race: (state) => eq(state, 'RACE', 0),
}

function forKeys(keys, disableCheck) {
  return Object.fromEntries(keys.map((key) => [key, disableCheck]))
}

function eq(state, key, value) {
  return state && state[key] && state[key].currentValue === value
}

function notEq(state, key, value) {
  return state && state[key] && state[key].currentValue !== value
}
