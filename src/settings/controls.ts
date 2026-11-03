// The Controls page: calibrated axes and the wheel / force feedback / steering options.
import type { OptionEntry } from '../../reference/rf2-api'
import type { AxisName } from '../api/controls'
import { game, num, pct01, toggle, type Section } from './options'

export type AxisDef = { name: AxisName; label: string; centered?: boolean; steps: { entry: OptionEntry; prompt: string; button: string }[] }

/** Calibration steps per axis; each step stores the axis' current position. */
export const AXES: AxisDef[] = [
  {
    name: 'Steering',
    label: 'Steering',
    centered: true,
    steps: [
      { entry: 'CONTROL_SETSTEERINGMAXLEFT', prompt: 'Turn the wheel fully left', button: 'Set left' },
      { entry: 'CONTROL_SETSTEERINGCENTER', prompt: 'Centre the wheel', button: 'Set centre' },
      { entry: 'CONTROL_SETSTEERINGMAXRIGHT', prompt: 'Turn the wheel fully right', button: 'Set right' },
    ],
  },
  ...(['Throttle', 'Brake', 'Clutch'] as const).map((name) => ({
    name,
    label: name,
    steps: [
      { entry: `CONTROL_SET${name.toUpperCase()}MIN` as OptionEntry, prompt: `Release the ${name.toLowerCase()} fully`, button: 'Set released' },
      { entry: `CONTROL_SET${name.toUpperCase()}MAX` as OptionEntry, prompt: `Press the ${name.toLowerCase()} fully`, button: 'Set pressed' },
    ],
  })),
]

const deg = (v: number) => `${v}°`
const ratio = (v: number) => `${v.toFixed(2)}×`

export const CONTROL_SECTIONS: Section[] = [
  {
    id: 'wheel',
    title: 'Wheel & force feedback',
    items: [
      { ...toggle('CONTROL_autoset_steering_wheel_range_from_vehicle', 'Rotation from the car', "Use each car's own steering rotation.") },
      {
        ...num('CONTROL_steering_wheel_range', 'Rotation', deg, 10),
        disabledWhen: { key: 'CONTROL_autoset_steering_wheel_range_from_vehicle', value: 1, reason: 'Set by the car' },
      },
      game('CONTROL_steering_wheel_software_rotation', 'Rotation limit', 'Software: the game limits the wheel. Hardware: the wheel driver does.'),
      game('CONTROL_steering_wheel_read_rotation_from_driver', 'Maximum wheel angle'),
      {
        ...num('CONTROL_steering_wheel_max_rotation_default', 'Default maximum angle', deg, 10),
        disabledWhen: { key: 'CONTROL_steering_wheel_read_rotation_from_driver', value: 1, reason: 'Read from the wheel driver' },
      },
      game('FFB_device_type', 'Force feedback device'),
      num('CONTROL_FFB_steering_fx_strength', 'Force feedback strength', (v) => `${Math.round(v / 100)} %`, 100),
      num('FFB_steer_torque_per_veh_mult', 'Car-specific multiplier', ratio, 0.05),
      num('FFB_steer_torque_minimum', 'Minimum torque', pct01, 0.005),
      num('FFB_steer_torque_filter', 'Smoothing', String, 1),
      game('GRAPHOPT_car_vibration_mult1', 'Car vibration'),
    ],
  },
  {
    id: 'input',
    title: 'Input response',
    items: [
      num('CONTROL_steering_sensitivity', 'Steering sensitivity', pct01, 0.05),
      num('GAMEOPT_STEERING_DEADZONE', 'Steering deadzone', pct01, 0.01),
      num('CONTROL_throttle_sensitivity', 'Throttle sensitivity', pct01, 0.05),
      num('CONTROL_brake_sensitivity', 'Brake sensitivity', pct01, 0.05),
      num('CONTROL_clutch_sensitivity', 'Clutch sensitivity', pct01, 0.05),
    ],
  },
  {
    id: 'pad',
    title: 'Gamepad & keyboard steering',
    items: [
      game('CONTROL_speed_sensitivity_type', 'Filter type'),
      { ...num('CONTROL_steering_aggression', 'Steering aggression', pct01, 0.05), disabledWhen: { key: 'CONTROL_speed_sensitivity_type', not: 1, reason: 'Not used by this filter' } },
      { ...num('CONTROL_speed_sensitivity', 'Speed sensitivity', pct01, 0.05), disabledWhen: { key: 'CONTROL_speed_sensitivity_type', not: 2, reason: 'Not used by this filter' } },
      num('CONTROL_steering_rate', 'Steering rate', pct01, 0.05),
      num('CONTROL_steering_return_rate', 'Return rate', ratio, 0.05),
      num('CONTROL_steering_snap_rate', 'Snap factor', pct01, 0.05),
    ],
  },
  {
    id: 'head',
    title: 'Head movement',
    items: [
      num('GRAPHOPT_head_physics', 'Head physics', pct01, 0.05),
      num('GRAPHOPT_lookahead_radians', 'Look ahead', (v) => `${(v * 57.2958).toFixed(1)}°`, 0.002),
      num('GRAPHOPT_exaggerate_yaw', 'Exaggerate yaw', (v) => v.toFixed(2), 0.008),
    ],
  },
]
