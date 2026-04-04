import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu'
import { exit } from '@tauri-apps/plugin-process'

let macMenuInstalled = false

type InstallMacAppMenuOptions = {
  openPreferences: () => void
}

export async function installMacAppMenu(
  options: InstallMacAppMenuOptions
) {
  if (macMenuInstalled) return

  const settingsItem = await MenuItem.new({
    id: 'preferences',
    text: 'Settings…',
    accelerator: 'Cmd+,',
    action: () => {
      options.openPreferences()
    },
  })

  const separator1 = await PredefinedMenuItem.new({
    item: 'Separator',
    text: 'separator-1',
  })

  const quitItem = await MenuItem.new({
    id: 'quit',
    text: 'Quit Popper Game',
    accelerator: 'Cmd+Q',
    action: async () => {
      await exit(0)
    },
  })

  const undoItem = await PredefinedMenuItem.new({
    item: 'Undo',
    text: 'Undo',
  })

  const redoItem = await PredefinedMenuItem.new({
    item: 'Redo',
    text: 'Redo',
  })

  const cutItem = await PredefinedMenuItem.new({
    item: 'Cut',
    text: 'Cut',
  })

  const copyItem = await PredefinedMenuItem.new({
    item: 'Copy',
    text: 'Copy',
  })

  const pasteItem = await PredefinedMenuItem.new({
    item: 'Paste',
    text: 'Paste',
  })

  const selectAllItem = await PredefinedMenuItem.new({
    item: 'SelectAll',
    text: 'Select All',
  })

  const appMenu = await Submenu.new({
    text: 'Popper Game',
    items: [settingsItem, separator1, quitItem],
  })

  const separator2 = await PredefinedMenuItem.new({
    item: 'Separator',
    text: 'separator-2',
  })

  const editMenu = await Submenu.new({
    text: 'Edit',
    items: [undoItem, redoItem, separator2, cutItem, copyItem, pasteItem, selectAllItem],
  })

  const menu = await Menu.new({
    items: [appMenu, editMenu],
  })

  await menu.setAsAppMenu()
  macMenuInstalled = true
}