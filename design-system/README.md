# Face UI Design System

Canonical token source for Face UI primitives and the Userface product interfaces.

## 📁 Структура

```
design-system/
├── source/           # Canonical storage shards for the variable authoring model
├── generated/        # Generated manifests, preview metadata and bridge outputs
├── tokens/           # Downstream CSS token outputs
│   ├── colors.css    # Цветовая палитра
│   ├── typography.css # Типографика
│   ├── geometry.css  # Геометрия контролов
│   ├── motion.css    # Motion (durations/easings)
│   ├── spacing.css   # Отступы
│   ├── shadows.css   # Тени и elevation
│   ├── borders.css   # Границы и скругления
│   └── index.css     # Главный файл (импортирует все)
├── themes/           # Темы (default values + overrides)
│   ├── default.css   # Default тема приложения
│   └── index.css     # Импорт всех тем
├── utilities/        # Утилитарные классы
│   ├── spacing.css   # Классы для отступов (.uf-m-*, .uf-p-*)
│   └── borders.css   # Классы для границ (.uf-rounded-*, .uf-border-*)
└── index.css         # Главная точка входа
```

## Source of truth

Token authority follows the DS-UP contract:

1. ProjectMap variable authoring owns edits and review/publish flow.
2. `source/*.jsonc` is canonical physical storage for authored variables.
3. `generated/*`, `tokens/*`, `themes/*` and `index.css` are downstream consumer outputs.
4. `@userface/face-ui-react/design-system/index.css` is the canonical package token entrypoint.
5. Manual edits in generated CSS/manifests are not the authoring path.

`assets/styles/index.css` is the runtime component stylesheet. Product UI packages may keep compatibility/runtime shims, but they should not become a second source of truth for shared `--uf-*` foundations.

## 🎨 Использование

### Импорт в проекте

```typescript
import '@userface/face-ui-react/design-system/index.css';
import '@userface/face-ui-react/assets/styles/index.css';
```

### UI primitives

**Единственный источник UI-примитивов — `@userface/face-ui-react/*`.**
Product packages keep only app/site-specific compositions and patterns on top of Face UI, without parallel primitive buttons, inputs, selects, etc.

- `face-ui-react Button/Input/Select/...` — примитивы
- `@userface/app-ui` / `@userface/site-ui` — прикладные композиции поверх Face UI

### Использование токенов в CSS

```css
.my-component {
  /* Цвета */
  background: var(--uf-color-background);
  color: var(--uf-color-foreground);
  border: var(--uf-border-default);

  /* Типографика */
  font-family: var(--uf-font-family-base);
  font-size: var(--uf-font-size-md);
  font-weight: var(--uf-font-weight-medium);

  /* Отступы */
  padding: var(--uf-spacing-4);
  margin: var(--uf-spacing-2);

  /* Скругления */
  border-radius: var(--uf-radius-base);

  /* Тени */
  box-shadow: var(--uf-shadow-md);
}
```

### Использование утилитарных классов

```tsx
<div className="uf-p-4 uf-m-2 uf-rounded-base">
  <h1 className="uf-text-display">Заголовок</h1>
  <p className="uf-text-body">Текст</p>
</div>
```

## 🎯 Принципы

1. **Префикс `--uf-`** - все токены начинаются с этого префикса
2. **Семантические имена** - `--uf-color-background`, а не `--uf-color-black`
3. **Тематизация** - поддержка светлой/темной темы через `data-theme`
4. **Обратная совместимость** - legacy переменные (`--background`, `--foreground`) остаются

## 📚 Документация токенов

### Colors
- `--uf-color-background` - основной фон
- `--uf-color-foreground` - основной текст
- `--uf-color-panel` - фон панелей
- `--uf-color-border` - границы
- `--uf-color-border-hover` - границы интерактивных элементов при наведении
- `--uf-color-active` - активное состояние
- `--uf-color-hover` - состояние при наведении

### Typography
- `--uf-font-family-base` - основной шрифт
- `--uf-font-size-*` - размеры (xs, sm, base, md, lg, xl, 2xl, 3xl, 4xl, 5xl)
- `--uf-font-weight-*` - веса (normal, medium, semibold, bold)
- `--uf-line-height-*` - высота строки (tight, normal, relaxed)

### Motion
- `--uf-motion-fast/snappy/normal/...` - длительности
- `--uf-ease-out`, `--uf-ease-in-out` - easing кривые

### Spacing
- `--uf-spacing-*` - отступы (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24)
- `--uf-spacing-xs/sm/md/lg/xl/2xl` - семантические отступы
- `--uf-spacing-panel` - стандартный отступ панели, алиас на spacing scale

### Borders
- `--uf-radius-*` - скругления (none, sm, base, md, lg, xl, full)
- `--uf-border-default` - стандартная граница
- `--uf-border-subtle` - тонкая граница

### Shadows
- `--uf-shadow-sm/base/md/lg/xl` - уровни теней
- `--uf-elevation-0/1/2/3/4/5` - уровни elevation

## 🔄 Миграция

При применении токенов в существующих CSS модулях:

1. Замените хардкод цвета на `var(--uf-color-*)`
2. Замените хардкод размеры на `var(--uf-font-size-*)`
3. Замените хардкод отступы на `var(--uf-spacing-*)`
4. Замените хардкод скругления на `var(--uf-radius-*)`
5. Замените хардкод тени на `var(--uf-shadow-*)`

## 📝 Примеры

### До
```css
.button {
  padding: 0.75rem 1.5rem;
  background: #000000;
  color: #ffffff;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}
```

### После
```css
.button {
  padding: var(--uf-spacing-3) var(--uf-spacing-6);
  background: var(--uf-color-foreground);
  color: var(--uf-color-background);
  border-radius: var(--uf-radius-base);
  font-size: var(--uf-font-size-md);
}
```

## 🎨 Theming Architecture

### Слои стилизации

1. **Authoring model (ProjectMap)** — владеет редактированием, review/publish и migration queue
2. **Source storage (`source/*.jsonc`)** — хранит canonical variables физически
3. **Generated outputs (`generated/*`, `tokens/*`, `themes/*`)** — поставляют CSS/manifests consumers
4. **Components** — используют semantic/component tokens без локальных hardcoded fallbacks
5. **Page themes** — переопределяют только разрешенные semantic/component tokens для конкретных страниц

### Доступные темы

#### Default Theme (`:root`)
```css
/* Автоматически применяется ко всему приложению */
--uf-control-height: var(--uf-spacing-8);
--uf-control-font-size: var(--uf-font-size-base);
--uf-control-line-height: var(--uf-line-height-normal);
```

#### Specimen Theme (`.uf-theme-specimen`)
```css
/* Для страниц шрифтов: увеличенная типографика через semantic tokens */
<div className="uf-theme-specimen">
  <Button text="Кнопка" /> {/* геометрия берется из темы */}
</div>
```

### Создание новой темы

```css
/* src/styles/my-theme.css */
.uf-theme-my-custom {
  --uf-control-font-size: var(--uf-font-size-lg);
  --uf-control-line-height: var(--uf-line-height-relaxed);
  --uf-control-pad-y: var(--uf-spacing-1);
  --uf-control-height: calc(var(--uf-control-line-height) + (var(--uf-control-pad-y) * 2));
}
```

```tsx
// pages/MyPage.tsx
<div className="uf-theme-my-custom">
  {/* Все Feld компоненты автоматически подстраиваются */}
</div>
```

### Геометрические токены

Все размеры контролов управляются через переменные:

#### Control Geometry
- `--uf-control-height` — высота контролов, задается theme layer
- `--uf-control-font-size` — шрифт в контролах, задается typography tokens
- `--uf-control-line-height` — line-height в контролах, задается typography tokens
- `--uf-control-pad-y` — вертикальный padding, задается spacing tokens
- `--uf-control-pad-text` — горизонтальный padding текста, задается spacing tokens
- `--uf-control-pad-icon` — горизонтальный padding иконки, задается spacing tokens
- `--uf-control-gap` — gap между элементами, задается spacing tokens

#### Text Component
- `--uf-text-body-size` — размер body текста, задается typography tokens
- `--uf-text-body-line-height` — line-height body, задается typography tokens
- `--uf-text-section-size` — размер section текста, задается typography tokens
- `--uf-text-section-line-height` — line-height section, задается typography tokens
- `--uf-text-pad-y` — дополнительный вертикальный padding, обычно `0`

#### Top Component
- `--uf-topbar-control-height` — высота контролов в Top, задается component tokens
- `--uf-topbar-pad-top/right/bottom/left` — padding Top bar, задается component tokens
- `--uf-topbar-slot-pad-y` — вертикальный padding слотов, обычно `0`

### Правила темизации

1. **НЕ используйте `!important`** для геометрии — темы работают через CSS переменные
2. **НЕ хардкодьте** размеры в Feld компонентах — только переменные
3. **Темы определяют все значения** — Feld компоненты не имеют fallbacks
4. **Page-level CSS** только для layout — геометрия в темах
