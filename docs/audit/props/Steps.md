# Steps: индивидуальный аудит

Canonical исправления проверены: 56 индивидуальных unit cases и 93 браузерных
проверки Steps в Chromium/Firefox/WebKit. Полный pnpm check: React 18 — 57 suites,
1020 passed + 8 React19-only skips; React 19 — 57 suites, 1028 passed. Полные
браузерные матрицы на обеих версиях: по 1637 passed + 4 emulation skips.
Визуально просмотрены обычная и длинная RTL-композиции.

Проверка собранных app/site пакетов и продуктовые сборки ведутся отдельно;
актуальные результаты и ограничения — в `.artifacts/steps-integration.md`.
Общий индивидуальный аудит библиотеки остаётся открытым.

Steps — навигация по упорядоченным позициям. Переход вперёд не доказывает
завершение или валидность предыдущей формы. Поэтому `linear` ограничивает
навигацию текущей, предыдущими и непосредственно следующей позициями. Проверку
данных выполняет владелец controlled `step`, принимая или отклоняя предложение.

| Параметр | Сценарий и решение | Доказательство |
| --- | --- | --- |
| `items` | Упорядоченная readonly коллекция. Пустая коллекция сохраняет корень, но не создаёт пустые кнопки/list. Повреждённые массивы и отсутствующие подписи отклоняются. | Empty/growth/shrink, frozen arrays, malformed boundaries. |
| `item.label` | Непустая строка или неинтерактивный React-контент именует кнопку. `0` допустим. Декоративная цифра скрыта от AT. Длинные подписи переносятся. | Rich/zero labels, accessible name, narrow LTR/RTL and zoom. |
| `item.content` | Панель существует только при наличии содержимого. Скрытие сохраняет локальное состояние. Строки/числа используют Text; собственные компоненты сохраняют стили. | Hidden field Tab order, values, form data, nested Button/Select. |
| `item.key` | Добавлен для динамических stateful форм. Уникальная строка/конечное число; `1` и `'1'` — одна identity. Индексные fallback имеют отдельное пространство ключей. | Reorder preserves DOM/value, duplicates rejected. |
| `step` | Controlled неотрицательный безопасный целый индекс. Отображается в текущих границах; перестановка не превращает индекс в key. Родитель может отклонять предложения. | Acceptance/refusal, external quiet update, list bounds and growth. |
| `defaultStep` | Только начальное uncontrolled значение; subsequent changes не сбрасывают пользовательскую навигацию. При уменьшении items bound сохраняется тихо. | Initial/default/controlled precedence, shrink/regrowth. |
| `linear` | Предыдущая/текущая/следующая позиция; `false` разрешает любой существующий шаг. История посещения и валидация не имитируются. | Back/next/skip, live mode changes. |
| `disabled` | Отключает кнопки навигации, сохраняя возможность работать с активной формой. Не выдаётся за запрет внешнего controlled update. | Keyboard, Membrane padding, active nested fields/actions/Select. |
| `onStepChange` | Одно предложение `{ step }` на новый пользовательский выбор. Current/no-op/prop changes/cancelled clicks не вызывают callback. | StrictMode, fresh/removed callback, cancellation and refusal. |
| `membrane` | Добавлен: включает/выключает spacing стандартной Membrane, например для встраивания в плотную панель. Не меняет identity или логику кнопки. | Actual padding hit test, disabled padding, toggle preserves DOM. |
| `className`, `style`, native attrs/events | Принадлежат одному div-корню: id, dir, lang, title, data/ARIA, capture, hidden и tabIndex реально действуют. | Ref identity, visual CSS, event delivery, hidden keyboard behavior. |
| `ref` | Div-корень; стандартный shared composed ref сохраняет attach/detach lifecycle. | Object ref, unmount; browser identity. |

Корень имеет `role=group`, список — `ol/li`, кнопка активного шага —
`aria-current=step`. Реальные панели названы через кнопку и связаны с ней
`aria-controls`. Нет роли tab и придуманной стрелочной навигации: используются
Tab, Enter и Space. Основание выбора семантики — [W3C multi-page forms](https://www.w3.org/WAI/tutorials/forms/multi-page/)
и [ARIA current](https://www.w3.org/TR/wai-aria-1.2/#aria-current).

Фокус восстанавливается на текущую кнопку, когда ранее сфокусированный потомок
удалён или скрыт. Если навигация отключена — на текущую панель. Уже перемещённый
наружу фокус не перехватывается. В пустом корне последний fallback — сам корень.

Удалены неиспользовавшиеся React-компонентом `COMPLETE`, `completed`, `progress`
и `separator` из внутренней машины. Их не было в npm exports; отдельных source
потребителей не найдено. Внешний `Steps` export и subpath сохранены, `StepItem`
добавлен в barrel. `data-state=completed` заменён на честный `previous`.
Убрана смена способа нумерации после 20-го шага. CSS ограничен собственными
`data-scope=steps` частями, чтобы не изменять вложенные компоненты.

Native input defaults, замена children/raw HTML, contentEditable, autoFocus,
переопределение role и дублирующий aria-disabled исключены из StepsProps.
Интерактивные JSON-примеры используют defaultStep вместо frozen controlled step.
Engine wizard-step pattern только называет компонент и не требует миграции API.

Границы: Steps сохраняет скрытые поля mounted, поэтому они остаются в FormData и
native validation. Владелец формы выбирает способ валидации/отправки своих шагов.
Произвольные consumer-компоненты не исполняются для проверки наличия label/content:
передать содержательный доступный label — обязанность вызывающего кода. Автоматические
axe/keyboard проверки не заменяют ручной прогон конкретного сценария со screen reader.

Before evidence: три воспроизведённые регрессии (сокращение списка, отмена клика,
root id) — `.artifacts/steps-before/` и `/tmp/face-ui-steps-before-recovered.log`.
Canonical tests: `assets/__tests__/props-steps.test.tsx` и
`scripts/browser/steps-cases.ts`; consumer tests используют ту же матрицу на
собранных app/site пакетах.
