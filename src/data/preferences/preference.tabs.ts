// Defines the tab map, order, divider position, labels, icons, and descriptions.

import type { PreferenceTabDefinition } from '@/types/preference.types'

export const preferenceTabs: PreferenceTabDefinition[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: 'user',
    kind: 'tab',
    description: 'Identity, locale, and personal defaults.',
  },
  {
    id: 'display',
    label: 'Display',
    icon: 'monitor',
    kind: 'tab',
    description: 'Layout, wallpaper, translucency, motion, and startup display behavior.',
  },
  {
    id: 'coreContent',
    label: 'Core Content',
    icon: 'layout-grid',
    kind: 'tab',
    description: 'Tasks, calendar, counters, and default content behavior.',
  },
  {
    id: 'wizards',
    label: 'Wizards',
    icon: 'sparkles',
    kind: 'tab',
    description: 'Guided flows, tips, onboarding, and progressive help.',
  },

  {
    id: 'divider-system',
    label: 'System',
    kind: 'divider',
    description: 'Power and system preferences.',
  },

  {
    id: 'hotkeys',
    label: 'Hotkeys',
    icon: 'keyboard',
    kind: 'tab',
    description: 'Global and in-app shortcuts.',
    powerUser: true,
  },
  {
    id: 'dataPrivacy',
    label: 'Data & Privacy',
    icon: 'shield',
    kind: 'tab',
    description: 'Private mode, backups, import/export, and sync readiness.',
    powerUser: true,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'bell',
    kind: 'tab',
    description: 'Notification preferences.',
    powerUser: true,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: 'flask-conical',
    kind: 'tab',
    description: 'Experimental and diagnostic options.',
    powerUser: true,
  },
  {
    id: 'about',
    label: 'About',
    icon: 'info',
    kind: 'tab',
    description: 'Version, licenses, changelog, and support.',
    powerUser: true,
  },
  {
    id: 'halp',
    label: 'Halp.',
    icon: 'life-buoy',
    kind: 'tab',
    description: 'Support and external contact links.',
    powerUser: true,
  },
]