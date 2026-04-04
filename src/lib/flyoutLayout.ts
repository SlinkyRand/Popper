export const flyoutIds = ['zone2', 'zone3', 'zone4', 'counter', 'preferences'] as const

export type FlyoutId = (typeof flyoutIds)[number]

export const MAIN_APP_WIDTH_PREFERENCE_ID = 'display.mainAppWidth'
export const GLOBAL_FLYOUT_WIDTH_PREFERENCE_ID = 'display.flyoutWidth'

export function getFlyoutWidthPreferenceId(id: FlyoutId): string {
  return `display.flyoutWidth.${id}`
}

export function getFlyoutHeightPreferenceId(id: FlyoutId): string {
  return `display.flyoutHeight.${id}`
}
