# Icons - Clean Architecture

## Архитектура

**Единственный источник правды:** SVG файлы в этой папке.

**Автоматическая генерация:** `Icon.tsx` генерируется автоматически из SVG файлов.

## Как добавить новую иконку

1. Добавь SVG файл в эту папку: `packages/face-ui-react/assets/Icons/your-icon.svg`
2. Запусти: `npm run generate:icons`
3. Иконка автоматически появится в `Icon.tsx`
4. Используй: `<Icon name="your-icon" />` (без `size`, чтобы иконка вставлялась “как есть”).

## Как изменить существующую иконку

1. Отредактируй SVG файл: `packages/face-ui-react/assets/Icons/existing-icon.svg`
2. Запусти: `npm run generate:icons`
3. Изменения автоматически применятся в `Icon.tsx`

## Автоматическая синхронизация

При запуске `npm run dev` иконки автоматически синхронизируются.

Для ручной регенерации: `npm run generate:icons`

## Формат SVG файлов

- **ViewBox:** `0 0 20 20` (стандарт для всех иконок)
- **Цвета:** 
  - `fill="black"` → автоматически конвертируется в `fill="currentColor"`
  - `fill="white"` → автоматически конвертируется в `fill="var(--uf-color-background)"`
- **Атрибуты:** автоматически конвертируются из kebab-case в camelCase (stroke-width → strokeWidth)

## Пример SVG файла

```svg
<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M10 3V17M3 10H17" stroke="black" stroke-width="1.5"/>
</svg>
```

## ⚠️ Важно

**НЕ РЕДАКТИРУЙ `Icon.tsx` ВРУЧНУЮ!** Все изменения будут потеряны при следующей генерации.

Всегда редактируй SVG файлы, а не `Icon.tsx`.
