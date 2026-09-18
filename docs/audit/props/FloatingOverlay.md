# Tooltip / Popover — единая поверхность и осмысленный API

Владелец — canonical Face UI. Tooltip, Popover и deprecated Overlay используют
один FloatingOverlay, одну машину состояния, один слой позиционирования и общую
Membrane. Изменения требуют синхронизации app/site/Defrictor и проверки сборок.
Engine в этой партии не изменяется.

## Решения по параметрам

| Параметр | Смысл и решение | Проверка |
| --- | --- | --- |
| children | Реальный trigger с собственным ref, id, обработчиками и ARIA; текст использует Button | fragment, ref cleanup, сохранение id/описания, native/Face disabled Button; обычный span Tooltip не получает роль button |
| content | Содержимое поверхности; без содержимого/триггера нет слоя | null/undefined/boolean/пустая строка/пустой fragment/array, 0, rich content, удаление содержимого во время ожидания |
| open | Управляемая видимость; родитель может отказать запросу | повторные open/close requests, принятие, внешние тихие обновления, освобождение управления, StrictMode |
| defaultOpen | Начальная uncontrolled видимость без дополнительного состояния | инициализация, последующее изменение не сбрасывает слой, приоритет open |
| onOpenChange | Запрос видимости от взаимодействия | отсутствие дубликатов и callback при внешних обновлениях/скрытии; актуальный callback |
| openDelay | Только hover/focus; default 200ms, конечное число 0…2147483647 | границы времени, отмена ухода/размонтирования, live restart; удалён из Popover |
| closeDelay | Только hover/focus; default 0ms, тот же диапазон | удержание фокуса/указателя, отмена re-entry, live restart; удалён из Popover |
| side | Предпочтительная top/right/bottom/left; collision может перевернуть | все стороны; data-side сообщает фактическую сторону |
| align | start/center/end на поперечной оси | логическое горизонтальное выравнивание в RTL; для left/right start/end означают верх/низ |
| sideOffset | Дополнительный неотрицательный зазор от border box trigger до Membrane | 0, дробное и обычное значение, live update; видимая поверхность добавляет внутренний inset мембраны |
| dir | Нативное направление содержимого; по умолчанию наследует trigger через portal | RTL без prop, explicit RTL/LTR и auto по тексту; позиционирование использует то же направление |
| className / style / id / ref | Один публичный DOM surface | class, opacity, id и ref указывают на один div; позиционирование не перезаписывает пользовательский style |
| title / lang / data-* | Обычные native атрибуты поверхности | title не превращается в rich Card slot; атрибуты не оказываются на внешней Membrane |
| aria-label / aria-labelledby | Имя dialog; fallback — имя trigger | явное имя/ссылка приоритетны; Tooltip добавляет свой ID к существующему aria-describedby trigger |
| hidden | Недоступность слоя, включая глобальные обработчики | hidden отключает Escape/outside registration; uncontrolled закрывается тихо, controlled open восстанавливается при reveal |
| native events | События публичной поверхности и композиция событий trigger | bubbling/capture click cancellation, Escape cancellation, hover callback вместе с удержанием; native focus capture не обещает отмену неотменяемого DOM focus |
| Overlay.trigger | Deprecated выбор hover/click | wrappers имеют фиксированные режимы; смена на click отменяет pending hover timer |
| Overlay.interactive | Только hover-card: dialog semantics и восстановление фокуса | фокус между trigger/content; не управляет hoverability — обычная подсказка тоже доступна указателю |

Типы исключают role, tabIndex, autoFocus, contentEditable,
suppressContentEditableWarning, dangerouslySetInnerHTML, defaultValue/defaultChecked,
native popover: эти механизмы конфликтуют с собственными семантикой, содержимым и
жизненным циклом слоя. Остальные HTMLAttributes остаются стандартным native API.
Один успешный spread не считается индивидуальной проверкой всех ARIA и событий.

## Исправленные причины

Раньше className находился на Card, ref/атрибуты — на Membrane, а style перекрывался
координатами. Теперь публичный div владеет всей native поверхностью. Card и
floating div получают одни presentation attributes из чистого общего helper;
Card title/content shorthand не протекает в native props. Popover сохраняет
Card control inset: прежний dropdown row token перекрывал его и прижимал текст
к рамке. Визуальное наблюдение подтверждено отдельным тестом во всех трёх движках.
Membrane остаётся
внешней границей отступов и позиционирования. Её padding входит в область слоя
для outside dismissal.

Hover intent объединяет фокус и два участка наведения. Геометрический коридор
позволяет пересечь настоящий зазор без искусственного minimum closeDelay.
Быстрый уход на далёкий элемент не превращается в бесконечное удержание. Escape,
размонтирование, недоступность и выход из документа очищают коридор. Машина
по-прежнему единственный владелец open/closing и задержек.

Disabled Button раньше имела pointer-events:none и не могла показать Tooltip.
Native disabled уже запрещает активацию; Button сохраняет получение pointer hover
и disabled оформление. Это не делает disabled кнопку доступной с клавиатуры:
существенная помощь также должна иметь видимое или фокусируемое место.

Удалён пустой, не рисовавшийся DOM arrow вместе с его ложным описанием в контрактах.
Удалены неиспользуемые DOM references/events из машины. Metadata больше не обещает
native Popover API / CSS Anchor Positioning; реальное решение использует portal,
общий layer stack и измерение DOM. Popover сообщает role=dialog и фактическое
поведение автофокуса.

## Миграция

- Popover.openDelay/closeDelay удалить: они никогда не влияли на click-переходы.
- Overlay trigger=click не принимает interactive/openDelay/closeDelay; hover-card
  сохраняет interactive. Новые интерфейсы используют Tooltip/Popover.
- ref, style и className FloatingOverlay теперь относятся к одному surface div;
  код с parentElement для ARIA/id переносится на сам surface.
- sideOffset относится к внешней границе Membrane; её inset остаётся частью
  системных отступов. Никаких дополнительных prop aliases не добавлено.
- App UnifiedPanelTooltip передаёт content ref через forwardRef; plain function
  теряла его в React18, что воспроизвели compiled consumer tests.
- Shared useFloatingPosition выравнивает start/end логически; прежний ручной RTL
  flip в Select удалён, чтобы не переворачивать направление дважды.

## Доказательства и границы

Before probes отдельно подтвердили потерю native style и no-op задержки Popover.
Начальные 30 browser regressions падали в Chromium, Firefox и WebKit. Последующие
проверки нашли зависание геометрического коридора при быстрых переходах, потерю
hover у disabled Face Button, лишнюю роль button, направление portal/auto и клик
по padding как outside. Эти находки исправлены, а тесты сохранены.

73 индивидуальных unit case и отрицательные type cases. Общий check React18:
56 suites, 964 passed + 8 React19-only skips; React19: 972/972. Полные browser
matrices: по 1544 passed + 4 emulation skips на каждой версии. Compiled consumer
и product build результаты фиксируются после выполнения в
.artifacts/floating-overlay-integration.md. Общий аудит библиотеки остаётся открытым.

Tooltip pattern в APG прямо отмечен как work in progress, поэтому не объявляется
полным стандартом соответствия. Удержание hover/focus и возможность закрытия
соотносятся с [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)
и [APG Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).
Ручная проверка screen readers, pinch zoom/visual viewport и произвольных custom
triggers остаётся необходимой; автоматические проверки не заменяют её.
