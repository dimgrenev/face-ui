// @face-ui/react — main barrel export

// Primitives
export { Button, ButtonGroup, buttonAnatomy } from './Button/Button'
export type { ButtonProps, ButtonVariant, ButtonGroupProps } from './Button/Button'

export { Tile, tileAnatomy } from './Tile/Tile'
export type { TileProps, TileVariant } from './Tile/Tile'

export { Text, textAnatomy } from './Text/Text'
export type { TextProps, TextVariant } from './Text/Text'

export { Separator, separatorAnatomy } from './Separator/Separator'
export type { SeparatorProps } from './Separator/Separator'

// Data Display (no machine)
export { Badge, badgeAnatomy } from './Badge/Badge'
export type { BadgeProps, BadgeVariant } from './Badge/Badge'

export { Card, cardAnatomy } from './Card/Card'
export type { CardProps } from './Card/Card'

export { Skeleton, skeletonAnatomy } from './Skeleton/Skeleton'
export type { SkeletonProps } from './Skeleton/Skeleton'

// Form Controls
export { Checkbox } from './Checkbox/Checkbox'
export type { CheckboxProps } from './Checkbox/Checkbox'

export { Switcher } from './Switcher/Switcher'
export type { SwitcherProps } from './Switcher/Switcher'

export { Radio } from './Radio/Radio'
export type { RadioProps } from './Radio/Radio'

export { SegmentedControl } from './SegmentedControl/SegmentedControl'
export type { SegmentedControlProps, SegmentedControlItem } from './SegmentedControl/SegmentedControl'

export { Slider } from './Slider/Slider'
export type { SliderProps } from './Slider/Slider'

export { Rating } from './Rating/Rating'
export type { RatingProps } from './Rating/Rating'

export { Input } from './Input/Input'
export type { InputProps } from './Input/Input'

export { Select } from './Select/Select'
export type { SelectProps } from './Select/Select'

// Overlays
export { Modal } from './Modal/Modal'
export type { ModalProps } from './Modal/Modal'

export { Tooltip } from './Tooltip/Tooltip'
export type { TooltipProps } from './Tooltip/Tooltip'

export { Popover } from './Popover/Popover'
export type { PopoverProps } from './Popover/Popover'

export { Menu } from './Menu/Menu'
export type { MenuProps } from './Menu/Menu'

export { Toaster, useToast, createToastContext } from './Toast/Toast'
export type { ToastAction, ToasterProps } from './Toast/Toast'

// Navigation
export { Tabs } from './Tabs/Tabs'
export type { TabsProps } from './Tabs/Tabs'

export { Accordion } from './Accordion/Accordion'
export type { AccordionProps } from './Accordion/Accordion'

export { Pagination } from './Pagination/Pagination'
export type { PaginationProps } from './Pagination/Pagination'

export { Steps } from './Steps/Steps'
export type { StepsProps } from './Steps/Steps'

// Data Display (with machine)
export { Progress } from './Progress/Progress'
export type { ProgressProps } from './Progress/Progress'

export { Avatar } from './Avatar/Avatar'
export type { AvatarProps } from './Avatar/Avatar'

// Utilities
export { Carousel } from './Carousel/Carousel'
export type { CarouselProps } from './Carousel/Carousel'

// Tree / Panel / Navigation / Command
export { Tree } from './Tree/Tree'
export type { TreeProps, TreeNode } from './Tree/Tree'

export { Panel } from './Panel/Panel'
export type { PanelProps, PanelItem } from './Panel/Panel'

export { Navigation } from './Navigation/Navigation'
export type { NavigationProps, NavigationItem } from './Navigation/Navigation'

export { Command } from './Command/Command'
export type { CommandProps, CommandItem, CommandGroup } from './Command/Command'

// Upload / Table / Calendar / Date
export { Upload } from './Upload/Upload'
export type { UploadProps } from './Upload/Upload'

export { Table } from './Table/Table'
export type { TableProps, TableColumn } from './Table/Table'

export { Calendar } from './Calendar/Calendar'
export type { CalendarProps } from './Calendar/Calendar'

export { DatePicker } from './DatePicker/DatePicker'
export type { DatePickerProps, DatePreset } from './DatePicker/DatePicker'

export { Drawer } from './Drawer/Drawer'
export type { DrawerProps } from './Drawer/Drawer'

// Toc / Bar / Breadcrumb / Code / Media / Scroll
export { Toc } from './Toc/Toc'
export type { TocProps, TocItem } from './Toc/Toc'

export { Bar, BarSection } from './Bar/Bar'
export type { BarProps, BarSectionProps } from './Bar/Bar'

export { Breadcrumb } from './Breadcrumb/Breadcrumb'
export type { BreadcrumbProps, BreadcrumbItem } from './Breadcrumb/Breadcrumb'

export { Code } from './Code/Code'
export type { CodeProps } from './Code/Code'

export { Media } from './Media/Media'
export type { MediaProps } from './Media/Media'

export { Scroll } from './Scroll/Scroll'
export type { ScrollProps } from './Scroll/Scroll'

export { Markdown } from './Markdown/Markdown'
export type { MarkdownProps } from './Markdown/Markdown'

// Utils
export { cn } from './assets/utils'
export {
  FACE_UI_COMPONENT_REGISTRY,
  FACE_UI_COMPONENT_META,
  getFaceUiComponentMeta,
  isDeprecatedFaceUiComponent,
} from './assets/component-governance'
