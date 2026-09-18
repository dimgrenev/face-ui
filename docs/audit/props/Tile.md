# Tile: рабочая партия аудита

## Рабочая спецификация

Цель: проверить все собственные props строки на реальный эффект, сохранить независимость главного действия и вложенных контролов, устранить конкурирующие источники состояния и CSS, меняющий чужие компоненты. Владелец — canonical face-ui, потребители — Tree и app/site/Defrictor через локальные снимки. Публичный API и CSS могут измениться по подтверждённым находкам; JSX, контракты, сценарии и app runtime manifest мигрируются у владельца. Снимки — только package-sync. Проверки: unit/type regressions, измерения в Chromium/Firefox/WebKit, React 18/19 pnpm check и полные browser matrices, package-sync:check, app desktop:build, site build, Defrictor check:ui/build, workspace gates. Риск частичной миграции — потеря индикатора раскрытия/визуального состояния и неправильная семантика.

## Наблюдения до исправлений

- selector/selectorOpen повторяют индикатор и стандартный aria-expanded; индикатор должен следовать общему Button.chevron и одному источнику expanded.
- selector CSS перебивает даже явно переданный stretchText=true. Проверить геометрией.
- rightText теряется при React-элементе в children; false/пустые Fragment создают пустые слоты.
- busy и aria-busy могут противоречить; selectedDescendant полностью повторяет фон/reveal active. Реальные app-потребители уже передают обе пары с одинаковыми значениями.
- intent смешивает декоративный радиус, поведение hover и role. Tree уже владеет своим role, disclosure определяется aria-expanded; проверить необходимость оставшейся отдельной классификации.
- Цвет Text может перебить tone строки; общие descendant CSS могут изменять Text/Button/вложенный Tile. Проверить computed styles и геометрию.
- align, truncate и level требуют измерения содержания, а не только data-атрибутов. Ref merger теряет cleanup React 19.

Это незавершённая запись; перечисленные наблюдения ещё не считаются прошедшей проверкой API.

## Решения по API

| Проп | Сценарий / решение | Проверка |
| --- | --- | --- |
| text, children | Простая подпись и составной контент; children имеет приоритет, включая явный false/0. Иконка и остальные слоты независимы. | Обновление после mount, strong, 0, false. |
| rightText | Краткая подсказка внутри области подписи, в том числе Tree.node.rightText. Не заменяет meta, находящуюся снаружи сжимаемой подписи. | Теперь работает и с rich children; проверка строкового/составного текста и контраста. |
| icon, iconPosition | Декоративная иконка до/после подписи; строковый реестр или собственный элемент. Пустой icon не меняет отступы. | DOM-порядок, координаты, пустые слоты. |
| leading | Отдельное действие до подписи. В отличие от icon, не активирует основную строку. | Pin не вызывает Open; отсутствие пустого контейнера. |
| meta | Неинтерактивные данные перед actions, вне сжимаемой области подписи. | Размещение, цвет, совместная работа с rightText. |
| actions | Независимые действия после контента. | Click/Enter не вызывают основное действие; disabled основной строки не выключает независимые контролы. |
| actionVisibility | reveal учитывает active; hover — hover/focus; always; hidden сохраняет геометрию и убирает фокусируемость. На устройствах без hover действия доступны. | Вычисленная opacity/visibility, focus и независимость вложенных Tile. |
| variant | default показывает интерактивный фон; ghost убирает фоновую реакцию. | Hover измерения вместе с interactive/tone. |
| density | default/spacious: отступы компактной и более свободной строки. | Вычисленные padding и размеры. |
| tone | neutral/muted/accent/positive/warning/destructive. Семантический цвет подписи, для accent — акцентный интерактивный фон. | Цвет настоящей подписи и независимость вложенного Button; light/dark контраст. |
| disabled | Отключает основное действие. Вложенные кнопки управляют disabled самостоятельно, например Remove у недоступного проекта. | Native disabled основной кнопки, независимые pointer/keyboard действия; root не объявляет все дочерние контролы недоступными. |
| active | Только визуальная активность. Семантику выбора/текущего пункта автор задаёт aria-selected/aria-current согласно роли. | Не создаёт ложный aria-selected; reveal учитывает active. |
| interactive | Включает основное действие. По умолчанию следует onClick либо явному role button/tab. false позволяет неинтерактивный заголовок с отдельными actions. | Структурный listitem не получает tabindex; passive не подсвечивается при hover. |
| stretchText | Заполняет доступное место областью подписи; отдельный chevron больше не перебивает явное true. | До/после: прирост ширины был 0; теперь измеряется реальная разница. |
| chevron | down/right как у Button. Единственный источник раскрытия — aria-expanded, Booleanish поддержан. | Изменение native состояния, down/up и side rotation, фокус основной кнопки. |
| fullWidth | Растяжение строки и мембраны либо собственная ширина. | Реальная ширина с мембраной/без неё. |
| align | left/center/right выравнивает подпись, в том числе при stretchText. | Координаты текста через Range; раньше положение не менялось. |
| level | Целая глубина 0..9. Отступ по логическому началу; не подменяет aria-level дерева. | Отрицательные/дробные/нечисловые значения, RTL padding. |
| truncate | Однострочная подпись с ellipsis либо перенос слов при false. | Реальный рост высоты длинной подписи; вложенный Text сохраняет собственную политику. |
| membrane | Единая внешняя Membrane; forwarding адресует основное действие. | Внешняя геометрия и единичная активация; без дополнительного tabindex. |
| ref/native | Ref, title/style/class/data и события принадлежат div строки. В кнопочной строке id/control ARIA/tabIndex адресуют основную кнопку; aria-busy остаётся состоянием региона. | Ref на React 18/19, native ARIA/events; доступное имя проверяется getByRole, а не наличием атрибута. Input defaults/innerHTML исключены из несовместимого API. |

## Удаления и миграция

- selector → chevron="down"; selectorOpen → aria-expanded. Для disclosure связь состояния и основного действия следует [APG Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/).
- busy → aria-busy. Состояние больше не может расходиться с его визуализацией.
- selectedDescendant → active, при необходимости выражение active={selected || containsSelected}. Это были одинаковые фон/reveal без отдельной семантики; оба app-потребителя уже передавали одинаковый active.
- intent и TileIntent удалены: disclosure определяется aria-expanded, section — interactive=false и tone=muted, роль tab задаётся явно. Радиус строки единый; отдельная имитация tree/tab не нужна. Полное управление вкладками принадлежит Tabs или автору композиции ([APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)).
- Удалены базовые классы uf-option/uf-control с Tile: собственный стиль строки уже задаёт нужные токены, а наследуемый hover .uf-option делал passive строку интерактивной на вид. Публичный класс строки — uf-tile.

Первые unit-регрессии: 3 failed, 1 passed, 1 React-19-only skip. Первые browser-регрессии: 15/15 failed; после исправлений все 15 прошли. Расширение до 30 browser cases дополнительно воспроизвело неверное доступное имя и passive hover. Финальные полные матрицы этой контрольной точки прошли: по 336/336 на React 18 и 19.


Кнопочная строка теперь всегда имеет настоящую основную button, включая простой text без actions. Добавление/удаление вложенного действия не заменяет DOM-узел фокуса. id адресует эту кнопку, поэтому getElementById(id).focus() и ARIA-ссылки работают в DesktopBrowserTabs. Ref остаётся типизированным ref контейнера для геометрии; потребитель TerminalShellListPanel, находящий контейнер по data-атрибуту, фокусирует его явно именованную primary-часть. Регрессия id/focus сначала упала и прошла после исправления. Внешняя disabled-маркировка изменена на data-primary-disabled: универсальный data-disabled описывал весь контейнер и делал отдельные действия визуально отключёнными.

Из контракта убран одиночный пример Tab без владельца tablist. aria-expanded/aria-busy явно описаны в TS как существующие native поля и в JSON как редактируемые состояния. Generator и проверка контрактов больше не восстанавливают удалённый intent. Tree leaves не получают aria-expanded; отдельный тест воспроизвёл ложное раскрытие и прошёл после исправления обеих разновидностей строки.

Проверка контраста axe пропускала текст внутри display:contents. Добавлен расчёт фактического foreground alpha и opacity предков на фоне темы. До исправления — 2.67:1 и 3.63:1; after-проверка требует не меньше 4.5:1 у подписи, подсказки и meta во всех tone light/dark. Убрана деградация читаемости busy и повторное приглушение rightText. Для disabled основного действия используются muted-токены без opacity на контейнере.


Интеграционная проверка использует реальные AgentSidebarThreads/AgentSidebarThreadRow и CSS приложения, со stub только сетевого preloadThreadPayload на границе стенда. В standalone Vite потребовалась изоляция этого серверно связанного импорта; проверка не заявляет работу загрузки чатов. Chromium/Firefox/WebKit прошли ширины 280/360 px, Enter/Space раскрытия, New Agent, выбор строки и Open Workspace без побочных callbacks. При визуальном просмотре обнаружена зависимость шрифта/letter-spacing заголовка чата от переменных соседнего UnifiedPanel; исправлена на общие токены design system. Дальнейший поиск охватил весь app, включая apps/desktop/web: DesktopBrowserTabs и DesktopSettingsDialog мигрированы отдельно от UI-пакета.

Обновление: iconPosition согласован с Button/Text/Input как start/end, включая RTL-геометрию и отступы; собственный шрифт Tile закреплён на корневом элементе. Проверки и миграция — [Unicode-direction.md](Unicode-direction.md). Вопросы align и trailing text остаются для отдельного анализа. Полный аудит Tree и остальных компонентов этой партией не закрыт.


Финальная проверка native props воспроизвела ещё два дефекта: aria-hidden скрывал только основную кнопку, оставляя действия в accessibility tree, а hidden оставлял видимую мембрану без контента. Region ARIA (hidden/live/atomic/relevant) остаётся на контейнере; control naming/state адресует primary. Общий CSS Membrane скрывает всю внешнюю границу, когда прямой дочерний control имеет hidden. Проверка выполнена для Tile и Button, без отдельных компонентных обходов.

## Закрытая контрольная точка перед следующим изменением Membrane

React 18: pnpm check — 317 passed + 2 React-19-only skips. React 19.3: 319/319. Полные browser matrices — 336/336 на каждой версии, Chromium/Firefox/WebKit; 45 Tile cases в каждой. Первый полный прогон React 19 упёрся в timeout общих contract/smoke тестов под параллельной нагрузкой; standalone повтор прошёл без изменения assertions или таймаутов. В focus test добавлено ожидание завершённого render при смене membrane, затем он прошёл 15 повторных cases; это ещё не доказывало сохранение фокуса во время самого переключения. Дефект lifecycle теперь воспроизведён отдельно и исправляется в Membrane.md.

App: 66/66 тестов в шести файлах, runtime manifest актуален. Реальная боковая панель — 280/360 px в Chromium/Firefox/WebKit, шрифт, раскрытие, выбор, независимые действия. App desktop:build, site build, Defrictor check:ui/build завершились. Workspace package-sync/proof-pack/production-isolation passed до начала следующей партии. Финальные light/dark screenshots созданы; эти проверки относятся к состоянию до Membrane.md.

Логи: /tmp/face-ui-props-tile-check-verified.log, /tmp/face-ui-props-tile-react19-verified.log, /tmp/face-ui-props-tile-browser-matrix-final.log, /tmp/face-ui-props-tile-react19-matrix-final.log, /tmp/face-ui-props-tile-app-tests-final.log, /tmp/face-ui-props-tile-app-integration-final.log, /tmp/face-ui-props-tile-app-build-final.log, /tmp/face-ui-props-tile-site-build-final.log, /tmp/face-ui-props-tile-defrictor-final.log, /tmp/face-ui-props-tile-workspace-final.log.
