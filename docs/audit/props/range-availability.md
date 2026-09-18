# Доступность диапазонов Calendar и Date

Calendar и Date раньше разрешали диапазон с запрещённым внутренним днём,
а week проверял всю неделю. Теперь доступность целого периода — общее правило.
При попытке завершить диапазон через разрыв следующий допустимый день начинает
новый draft; Date закрывается только после реального завершения. Исходные
значения, controlled updates и reset сохраняются без скрытой коррекции.

| Решение | Зачем | Наблюдаемый результат |
| --- | --- | --- |
| `excludeDisabledDates=true` по умолчанию, только range | Бронирование требует доступности всего периода | Запрещённый день разрывает выбор, включая обратное направление и end-only |
| `excludeDisabledDates=false` | Фильтры могут ограничивать лишь границы | Внутренний день разрешён, endpoints по-прежнему ограничены |
| Общий candidate validation | Один контракт для всех действий Date | Preset/native/time edit отклоняются целиком; Now и month/year следуют тому же правилу |
| Проверка фактической полноты | Старый anchor мог стать недоступным | Новый draft не закрывает Date; clock preference сохраняется при datetime restart |
| Фиксированная неделя | Недельный выбор не должен стать произвольным range | Любой route требует ровно семь доступных дней; override отсутствует |
| `aria-multiselectable` от типа значения | Сетка диапазона отмечает несколько cells | Range/week объявляют multiple selection, single — нет; лишнего публичного ARIA alias нет |

`disabledTime` ограничивает часы концов; он не запрещает каждую минуту внутри
интервала. Незавершённый диапазон по существующему контракту не отправляется
формой. Внешняя недоступная история может отображаться и отправляться, пока
пользователь не выбирает новое значение: доступность выбора не заменяет
прикладную проверку данных.

Миграция: код, намеренно разрешавший недоступные внутренние дни, должен установить
`selection="range" excludeDisabledDates={false}`. Название согласовано с
`disabledDates`; отдельная дублирующая коллекция или callback не добавлены.
TS запрещает prop для single/week; JSON-контракты отражают объединённую поверхность
компонента и не доказывают conditional controls в редакторе потребителя.

Доказательства: 15 baseline units и 10 Chromium cases воспроизвели дефекты до
исправления; расширение обнаружило отдельный week SELECT_RANGE обход. После
исправления 24 новых units проходят. 33 browser cases и весь затронутый набор
дают 489/489 на React18 и React19 в Chromium, Firefox и WebKit. Общий pnpm check:
React18 629 passed + 8 React19-only skips, React19 637/637, 51 suite. Положительные
и отрицательные type cases проходят; contracts/gallery/inventory обновлены.

Первый after browser прогон выявил неверное ожидание нового теста о сериализации
неполного range. Оно исправлено на существующий контракт FormData=null;
поведение формы ради зелёного теста не менялось. Полные финальные matrices
запущены после этой коррекции и финального runtime.

Синхронизация и проверки потребителей обязательны по workspace spec ниже.
Их фактические результаты фиксируются в `.artifacts/range-availability-recovery.txt`;
успех компонентных тестов не выдаётся за готовность продуктов. Общий аудит
API, локализации, alignment и ручной AT-проверки остаётся открытым.

## Проверка потребителей

Собранные app/site пакеты прошли 24/24 комбинации: Chromium/Firefox/WebKit,
light/dark, 360/1000px; каждая проверяет Calendar и Date с обеими политиками.
Проверены фактический контраст выбранного дня, клавиатура, форма, отсутствие
overflow и axe; четыре скриншота просмотрены вручную. Card использует равномерные
градиентные слои фона, поэтому измеритель контраста научен вычислять такие слои.
Контроль на всех трёх движках сравнивает их с эквивалентной сплошной заливкой и
подтверждает отказ для неравномерных градиентов, изображений и других неподдерживаемых эффектов.

App manifest/check, app typecheck/desktop build, site build, Def check:ui,
изолированная сборка Def и proof-pack прошли. Сборка Def выполнялась в отдельной
копии после Face sync; исходная `.next` не использовалась. Runtime и CSS не
менялись после двух 489-case matrices; до финального sync дополнен только
проверяющий контраст helper и этот отчёт.

Общий production-isolation gate остаётся красным на четырёх `to` путях в
`userface-app/packages/playground/migration.json`: строки 615, 623, 631, 639.
Это metadata, у записей есть корректный package `publicEntry`; проверка всё же
классифицирует их как ссылки на соседний engine checkout. Отчёт не объявляет
полную production isolation подтверждённой; metadata и scanner не исправлялись
ради зелёного статуса. Актуальные финальные статусы sync/build записаны в execution log.

## Working spec, 2026-09-13

Previous goal turn: PROGRESS (Calendar DOM + disabled/readOnly + single-opacity
state verified). Current baseline Face snapshots match, engine snapshots have
four independent changes. No owned process/server/private Def copy remains.

Goal: Calendar and Date must not publish a range containing unavailable whole
days by accident. Distinguish full-period availability (booking) from endpoint
availability (report boundaries). Week already requires seven available days.

Owner: canonical face-ui Calendar, Date, shared pure date-range calculation,
date machine candidate validation. Consumers: app/site/Defrictor generated Face
snapshots; no engine or product source edits. Existing shared CalendarGrid,
Membrane, form layer and DOM identity stay the owners of their responsibilities.

API decision: excludeDisabledDates?: boolean ONLY for selection="range" in
Calendar and Date, default true. False intentionally permits disabled dates
between otherwise permitted endpoints. No alias, extra list or callback for the
same constraint. Week has no override (its seven-day invariant is fixed), single
selection has no such prop. Existing locale/min/max/disabledDates formats unchanged.
DisabledTime still restricts endpoint clock choices; the new prop specifically
concerns disabledDates (whole civil days), not every minute inside an interval.
External/default/historical values remain accepted and visible without silent
correction or callbacks; constraints apply to user selection. Invalid date syntax
keeps its existing errors. This is a deliberate default behavior change; users
requiring endpoint-only constraints set excludeDisabledDates={false}.

Interaction: clicking a valid day to complete a range across a forbidden day,
or from an anchor that became unavailable after a constraint update, starts a
new incomplete range at the clicked day. It does not trap users behind an old
anchor, select a forbidden interval or close Date before completion. Reverse
and end-only ranges behave symmetrically. When no gap exists, complete normally.
Datetime restart preserves the previous anchor's preferred clock, subject to the
new day's time constraints. Range and week grids declare aria-multiselectable;
single grids do not. This is derived grid semantics, not another public prop.
An atomic preset/native range/time edit that violates the current constraints is
rejected, not silently converted to a different action. All routes share candidate
validation, including Now and month/year selection. Clear stays available for drafts.

Implementation: shared next-range helper and civil range availability predicate;
scan the finite disabledDates list, not every date in a potentially 10,000-year
interval. Calendar and Date use the same predicate. Date may add its existing
endpoint time validation. Close-on-select derives from the actual candidate,
not the previous assumption that any partial range necessarily completes.

References informing the choice (not a mandate to copy a library):
https://daypicker.dev/selections/disabling-dates documents opt-in exclusion and
resetting a range across unavailable days; https://react-aria.adobe.com/RangeCalendar
supports both contiguous and non-contiguous ranges. Face chooses exclusion by
default and a direct day-specific name consistent with disabledDates.

Verification: before/after units for Calendar/Date pointer+keyboard, every Date
selection route, stale anchors, reverse/end-only, single/week modes, constraints,
readOnly/disabled, native/refused form changes and quiet external/default/reset.
Positive/negative TS cases for range-only prop. 3-browser production cases with
real pointer/keyboard and live props in light/dark/RTL, React18/19, full affected
Calendar+Date family after final runtime. Canonical pnpm check, contracts/gallery/
inventory generation, inspect untruncated sync drift, Face-only sync and rebuild
both product dist; compiled app/site consumers+screens; app manifest/check/types/
desktop build, site build, Def UI and private standalone Def build with post-sync
source parity, package-sync/proof/isolation. Preserve independently changing engine.

Rollback risk: stale snapshots could show a rejected interval as selected or close
on a restarted draft. A flags-only adapter fix would leave presets/native/time routes
inconsistent. Validation and integrations are required, not inferred from API types.
