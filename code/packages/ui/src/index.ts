// Primitives
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './primitives/Button.js';
export { Tag, type TagProps, type TagTone } from './primitives/Tag.js';
export { Card, type CardProps } from './primitives/Card.js';
export { Input, type InputProps } from './primitives/Input.js';
export { Toggle, type ToggleProps } from './primitives/Toggle.js';
export { Checkbox, type CheckboxProps } from './primitives/Checkbox.js';
export { Avatar, type AvatarProps } from './primitives/Avatar.js';
export { Kbd, type KbdProps } from './primitives/Kbd.js';
export { Dot, type DotProps, type DotTone } from './primitives/Dot.js';
export { Badge, type BadgeProps } from './primitives/Badge.js';

// Components
export { HfIcon, type HfIconProps, type HfIconName } from './components/HfIcon.js';
export {
  Dropdown,
  DropdownItem,
  type DropdownProps,
  type DropdownItemProps,
} from './components/Dropdown.js';
export {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  type ModalProps,
} from './components/Modal.js';
export { Tooltip, type TooltipProps } from './components/Tooltip.js';

// Layout
export {
  AdminShell,
  type AdminShellProps,
  type AdminMenuItem,
  type AdminMenuGroup,
  type AdminBreadcrumb,
} from './layout/admin-shell.js';
export {
  publicLayout,
  escHtml,
  type PublicLayoutOpts,
} from './layout/public-layout.js';

// Hooks
export {
  useTheme,
  THEME_BOOT_SCRIPT,
  type ThemeMode,
  type UseThemeResult,
} from './hooks/useTheme.js';
export {
  useToast,
  ToastProvider,
  showToast,
  type ToastTone,
  type ToastItem,
} from './hooks/useToast.js';

// CSS — supplied as TS export so admin/public can write to disk
export { TOKENS_CSS, PRIMITIVES_CSS, ALL_CSS } from './tokens.css.js';
