# Видимый фокус составных контролов

Предыдущая goal-итерация — подтверждённый progress по Date modes, не завершение
аудита. Новая исходная точка: Face snapshots совпадают с canonical source.
Engine имеет отдельный drift из параллельной работы (новые face-contract/source
exports); изменения этого владельца не переносить автоматически в рамках Face.

## Рабочая спецификация

Цель: любой явно обработанный переход по сетке месяцев, лет, часов и минут
должен показывать текущую клавиатурную позицию. В частности, реальный клик35 →
Ctrl+End сейчас фокусирует59 без обводки в Chromium/WebKit, а Firefox показывает
её. Обычная стрелка включает native focus-visible во всех движках. Before:
`date-modes-focus-pointer-probe.log`, production CSS, три браузера.

Owner — canonical Face. Потребители — app/site/Defrictor через штатные snapshots.
Публичные props, exports, callbacks и формы не меняются. Владелец Date
отмечает явно обработанную клавиатурную навигацию; общий focus style использует
этот признак вместе с native `:focus-visible`. Указатель и уход за пределы
всего Date (поле и portal) сбрасывают признак; чужие/необработанные сочетания
не включают его. Переходы внутри Date сохраняют видимый фокус, включая возврат
на trigger после Escape. Обводка
работает на границе сетки, после paging и при изменении ограничений, не меняет
геометрию и значение. Полностью недоступная сетка остаётся именованной точкой
фокуса с видимым индикатором. Forced colors используют существующий Highlight.

Не заводить новые публичные настройки, глобальный перехват клавиатуры или
отдельный цвет/толщину для Date. Native поведение pointer focus не подавлять.
Другие составные контролы проверять по фактическим обработчикам: наличие Home/
End само по себе не доказывает поддержку Ctrl+Home/End. Общий календарь дней
использует геометрическую навигацию через aria-disabled, это отдельная модель.

Проверки: регрессии с настоящими pointer/keyboard событиями и computed outline
до изменения; light/dark, четыре вида сетки, bounds, disabled choices, paging,
изменение props, blur/pointer reset, all-disabled, forced colors. Затем связанные
Date/browser suites, sequential полные React18/19 matrices и `pnpm check` с
типами JSX-примеров. Drift review, Face-only sync, dist/manifest и product builds,
точная частная копия Defrictor, compiled consumers, визуальный просмотр и gates.
Риск частичного sync — новый признак навигации без соответствующего общего CSS.

Справка: [Selectors Level 4](https://www.w3.org/TR/selectors-4/#the-focus-visible-pseudo)
описывает `:focus-visible` через браузерную эвристику; [пример WAI](https://www.w3.org/WAI/WCAG21/working-examples/css-focus-visible/)
показывает его использование для клавиатурного индикатора. Наше дополнение
касается явно обработанной компонентом навигации, а не переопределения всей
браузерной модели фокуса. Автоматические проверки не заменяют manual AT audit.

## Реализация и доказательства

Before новая matrix — **28 failed /11 passed**, `date-focus-before.log`.
Промежуточная реализация: DateChoiceGrid отмечает `data-keyboard-focus` для распознанной навигации;
сбрасывает на pointerdown и blur за пределы группы. Единый focus rule поддерживает
и native pseudo-class, и этот явный режим. Тот же rule работает в forced colors.
В Date anatomy добавлен grid: полностью недоступная именованная группа получает
индикатор через общий механизм. Новых props/hooks/exports нет.

Первый after — 36/39. Три WebKit failure касались ожидания plain Tab на native
Clear button; все assertions видимого фокуса уже проходили. Отдельная проба на
чистом HTML подтвердила macOS поведение: Tab пропускает implicit button, Alt+Tab
попадает на него (`date-focus-native-tab.log`). Тест определяет этот режим на
native button, затем проверяет те же Clear/focus-return/blur assertions.
Итог — **39/39**, `date-focus-fixed.log`, три движка, включая forced colors.

Дополнительно исправлена устаревшая формулировка Button.md: membrane=false
убирает внешний отступ, сохраняя прозрачную обёртку и identity кнопки.
Это документация уже существующего поведения, не изменение Button runtime.
Полные React18/19 matrices, checks и consumer verification выполняются далее.

Полные matrices завершены: React18 и React19 — по **836 passed +4 emulation
skips**, `date-focus-browser-all.log` и `date-focus-react19-browser-all.log`.
`pnpm check`: React18 **469 passed +8 React19-only skips**, React19 **477/477**,
44 suites, включая types/examples/contracts/gallery/build/smoke/pack.
Логи `date-focus-check.log`, `date-focus-react19-check.log`, chain11221 terminal0.
После этих прогонов добавлен только дополнительный assert CSS после pointer
reset: когда native pseudo-class не активен, outline действительно none.
Этот assert повторяется на обеих версиях React; runtime остаётся тем же.

Consumer verification расширила доказанный дефект: после настоящего click →
Escape → Enter/Space/ArrowDown Firefox фокусирует панель, но не включает native
focus-visible. Это подтверждено и для обычной сетки, и для полностью недоступной
(`date-focus-reopen-probe.log`, `date-focus-reopen-enabled-probe.log`). Поэтому
состояние нельзя оставлять только внутри сетки: владелец всей сессии Date должен
связывать способ открытия и внутреннюю навигацию с одним индикатором.

Дополнение scope: Date хранит один признак видимого фокуса для поля и портала.
Native click detail=0 (клавиатура/assistive activation), Escape и обработанная
навигация задают его. События CalendarGrid/DateChoiceGrid доходят до владельца по
[дереву React, включая portal](https://react.dev/reference/react-dom/createPortal),
поэтому дополнительного протокола callbacks и слушателей document не требуется.
Pointer и уход за пределы поля/портала сбрасывают признак. Общий CSS остаётся
тем же. Публичный API не расширяется. Нужны before-регрессии
повторного открытия для day/month/year/hours/minutes и unavailable group, затем
повтор всех проверок на окончательной реализации. Предыдущие 836 matrices и
package checks относятся к промежуточной реализации, не к этому дополнению.

Before повторного открытия: **6 failed (Firefox) /12 passed**,
`date-focus-entry-before.log`. Окончательное состояние хранится в Date;
DateChoiceGrid больше не имеет своего modality-state. Root capture получает
pointer/non-pointer click, bubble видит уже обработанный keydown. Escape и
outside-dismiss используют существующие callbacks слоя. Уход учитывает обе
DOM-части — поле и portal. Один признак проецируется в обе части, поэтому
возврат на trigger также получает видимую обводку. Дополнительные callbacks
внутренним сеткам не понадобились; CalendarGrid runtime не изменён.

Расширенный after — **57/57**, `date-focus-owner-first.log`: исходные 39 случаев,
повторное открытие шести видов, видимый возврат на trigger и уход за пределы
компонента. Pointer сбрасывает принудительную обводку; native focus-visible
сохраняет собственное поведение браузера. Полные проверки выполняются заново.

Первый полный прогон модели Date-owner: 852 passed +4 skips, две ошибки в старых
геометрических fixtures Select/Switcher (Chromium), `date-focus-owner-browser-all.log`.
Select измерял popup в начальной позиции за экраном (ошибка выравнивания 10790px).
Теперь он ждёт тех же условий выравнивания через poll и дополнительно проверяет
границы viewport. Switcher сравнивал разнесённые по кадрам bounding boxes при
смене RTL и переходе checked→unchecked. Он ждёт заданные direction/state/logical
inset и считывает обе координаты за один evaluate. Ожидаемые 4/16px позиции и
±12px перемещение сохранены. Runtime этих компонентов не изменяется.

Повтор геометрических fixtures после исправления ожиданий — **90/90**
(три сценария × три движка × десять повторений),
`date-focus-geometry-fixtures-repeat.log`. Полные проверки окончательного
Date-owner выполняются в `date-focus-owner-*-final.log`.

Окончательная реализация прошла полные browser matrices: React18 и React19
— по **854 passed +4 emulation skips**. Логи
`date-focus-owner-browser-final.log`, `date-focus-owner-react19-browser-final.log`.
Это результаты Date-owner вместе с исправленными ожиданиями геометрии,
а не повторная ссылка на промежуточную локальную модель сетки.

Окончательные package checks прошли полностью: React18 **469 passed +8 skips**,
React19 **477/477**,44 suites, types/examples/contracts/gallery/build/smoke/pack.
Логи `date-focus-owner-check-final.log`, `date-focus-owner-react19-check-final.log`.
Compiled product matrix — **24/24**, `date-focus-consumers-owner-final.log`;
сборки fixture используют публичный gallery/CSS из app/site snapshot dist.
Проверены четыре сетки и полностью недоступная группа, pointer→Ctrl+End,
year paging, live constraints, visible Escape return, отсутствие лишних
callbacks/FormData changes, viewport и axe. Визуально просмотрены mobile
minutes dark/unavailable light и desktop years dark. Это не E2E всего продукта.

Face-only sync перенёс окончательную реализацию в app/site/Defrictor, оба Face
dist восстановлены сборкой. Manifest app актуален:
`f8a7324f387668429959133a`. App global typecheck прошёл,
`date-focus-owner-app-typecheck.log`; прежняя Playground ошибка больше
не воспроизводится, эти продуктовые файлы текущая партия не редактировала.
Defrictor check:ui —81 компонент. Полные product builds выполняются далее.

Сборки site и Defrictor прошли (`date-focus-owner-site-build.log`,
`date-focus-owner-defrictor-build.log`). Defrictor собран неизменённой командой
в отдельной копии source/dependencies; checksum parity после сборки не нашёл
различий содержимого (`date-focus-owner-defrictor-parity.log`, только mtime
корневой папки). Оригинальные `.next` и пользовательский сервер не затронуты.

App desktop build **не прошёл целиком**: web build успешен, Electron TypeScript
не разрешает новые `@userface/engine/face-contract` и `@userface/engine/source`
при `moduleResolution: node`. Лог `date-focus-owner-app-build.log`. Declarations
существуют и указаны в exports, но engine не имеет legacy typesVersions;
ошибки отсутствующих экспортов и implicit-any следуют из этой границы.
Изолированная noEmit-проба с двумя mappings на существующие product-local
declarations проходит (`date-focus-owner-electron-types-probe.log`).
Это диагностическая проба в `.artifacts`, а не внесённый обход в tsconfig.
Engine package.json и Electron integration уже изменяются отдельно; текущая
партия не редактировала их. Общий app typecheck и compiled Face consumers
прошли, но они не заменяют неуспешную сборку Electron.

Итоговый перенос docs выполняется Face-only sync с восстановлением обоих dist
и workspace gates. Runtime после полных финальных матриц не менялся.
Оставшиеся Date/Calendar/public-prop задачи перечислены в Date.md; goal активен.

Заключительные package-sync и proof-pack checks прошли. Production-isolation
gate вернул четыре совпадения в `userface-app/packages/playground/migration.json`
на строках615/623/631/639: поля `to` описывают перенос исходников в canonical
engine, рядом задан `publicEntry` с package-name import. Это metadata миграции,
не runtime import; поиск потребителей migration.json их не обнаружил.
В остальных проверенных файлах gate не нашёл canonical sibling references.
Лог `date-focus-owner-final-isolation.log` сохранён как **failed**; текущая партия
не меняла чужой migration manifest или workspace scanner для зелёного статуса.
Итог Face проверен, но полная desktop сборка и формальный isolation gate имеют
перечисленные внешние ограничения. После этого дополнения синхронизируются
только docs и восстанавливаются оба Face dist; runtime проверен ранее.
