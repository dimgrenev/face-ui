# Radio — индивидуальный аудит

## Рабочая спецификация

Radio — группа взаимоисключающих native radio inputs, управляемая value/defaultValue
и options. Владелец shared API/runtime/styles/contracts — canonical Face; JSX/JSON
и host-specific integrations — app/site. Generated snapshots меняются только sync.

Каждый собственный prop и RadioOption должен иметь ясный сценарий и наблюдаемый
эффект. Проверяются null/empty-string selection, controlled/uncontrolled updates,
form reset/required/disabled, изменение options, оба layout, RTL, labels, membrane,
root refs и native events. Options остаётся flat API для простой группы; без
потребности не вводятся второй children API, alias props или новый renderer.

Начальные решения для проверки:

- Удалить ariaLabel/ariaLabelledBy в пользу native aria-label/aria-labelledby.
  Root принимает применимые HTML/ARIA attrs и events; ref/style/className — группа.
- Добавить form для связи native radio inputs с внешней формой. Не добавлять
  generated name в FormData, если пользователь не дал name.
- Проверить полезность native option id/ARIA description/name для сложных labels.
- Исправить empty string в поиске следующего значения и реальном фокусе.
- Сравнить keyboard navigation с native radios, отдельно RTL/disabled/wrap/Tab.
  Ориентация — layout и aria-orientation, не запрет второй пары arrow keys.
- Использовать общий ref lifecycle, убрать inline ref callback и потерю cleanup.
- Разделить item (visual label) и input в anatomy; native input не должен получить
  padding/min-height/opacity визуальной строки. Disabled визуально применяется
  один раз, через token, без блокировки native semantics двумя слоями.
- Убрать фиктивные defaults options/defaultValue из JSON; оставить примеры в states.
- onValueChange уведомляет только о пользовательском изменении; parent update,
  options update и reset не имитируют пользовательский ввод. Проверить bubbling
  native events для pointer и keyboard, а также preventDefault/capture.

Порядок: before unit/browser tests → API/implementation → migration и per-prop
решения → meaningful types/SSR/a11y/geometry → pnpm check React 18/19 → полные
browser matrices → inspected package sync → app/site/Defrictor builds и gates.
Не менять source во время полной матрицы. Сборки и browser runs ограничены по
workers на 16 GB host. Откат должен включать API, contracts, consumers и snapshots.

Ссылки для keyboard/form behavior: [WAI-ARIA APG Radio](https://www.w3.org/WAI/ARIA/apg/patterns/radio/),
[HTML Radio](https://html.spec.whatwg.org/multipage/input.html#radio-button-state-(type=radio)).
APG отличает standalone group от group внутри toolbar; toolbar-composition не
обещается этим простым flat Radio без отдельного обоснования и тестирования.

## Решения по каждому prop

| Prop / поле | Сценарий и решение | Проверяемый эффект |
| --- | --- | --- |
| options | Оставлен один flat API, принимает readonly array. Не добавлены children/renderer aliases. | Порядок строк и стрелок, перестановка без remount, disabled options, пустая группа. Нет придуманных options в JSON default. |
| value | Controlled string или null; пустая строка — полноценное значение. | Выбор, FormData, снятие выбора через null; неизвестное значение не выбирает случайную опцию. Parent updates не вызывают callback и не переносят фокус. |
| defaultValue | Только исходное uncontrolled значение и цель form reset. | Изменение defaultValue после mount не заменяет ввод; reset восстанавливает исходное значение. Удалён фиктивный JSON default `one`. |
| onValueChange | Сериализуемое уведомление о новом пользовательском выборе. | Клик, Space и стрелки используют native activation. Повторный выбор, parent update, options update, reset молчат. Callback replacement работает. |
| orientation | Оставлен: визуальная раскладка и aria-orientation. | vertical/horizontal, перенос строк, обе пары стрелок, RTL. Горизонтальные стрелки следуют физическому направлению; WebKit native reference отличается, Face намеренно одинаков во всех браузерах. |
| autoFocus | Унаследованный no-op стал работающим prop. | На mount фокус получает выбранная доступная опция, иначе первая доступная; wrapper не становится лишней остановкой Tab. |
| disabled | Оставлен native group state. | Все inputs disabled, исключены из focus/submit; controlled selection сохраняется. Прозрачность строки применяется один раз через token. |
| required | Оставлен с явным условием: нужен непустой name. | TypeScript запрещает required без name. Named group проходит native validation после выбора. Исправлен Firefox validity cache при внешней форме после inputs. |
| name | Native group identity и ключ FormData. Независимые группы с одним form owner должны иметь разные names. | Выбранное значение, включая пустую строку, отправляется один раз. Без name компонент не добавляет случайный ключ в FormData; для settings callback достаточно. |
| form | Добавлен для portal/внешних форм. | Владелец inputs, FormData, required и reset, в том числе смена form после mount. Форма должна существовать к завершению React commit. |
| membrane | Оставлена единая Membrane вокруг каждой строки. | Включение/выключение сохраняет inputs, focus и выбор. Строки доступны кликом через общую membrane; layout не переполняется в обоих режимах. |
| aria-label / aria-labelledby | Native доступное имя группы. Camel aliases удалены. | Имя radiogroup разрешается из текста или внешних заголовков. Потребители и примеры мигрированы. |
| className / style | Native props внешней группы. | Пользовательская ширина/направление и оформление действительно доходят до root. |
| ref | Обычный HTMLDivElement ref на группу, общий useComposedRefs. | Нет detach на каждом render; callback cleanup поддержан в React 19 StrictMode. |
| id / title / lang / dir / hidden / data-* / aria-* | Стандартные атрибуты root, без вторых aliases. | DOM forwarding, external descriptions, RTL через предка, hidden убирает группу из layout. Native aria-disabled/required могут переопределить объявления, как у Input; функциональность задают disabled/required. |
| onChange / onInput / focus / keyboard / pointer events | Native bubbling events группы, отдельный смысл от value callback. | Controlled parent может пользоваться onChange; consumer onKeyDown и onClick могут отменить default. Capture cancellation сохраняется. |
| children / dangerouslySetInnerHTML / defaultChecked / role / aria-orientation | Исключены из публичных типов. | У группы один владелец content/selection/semantics; orientation уже задаёт соответствующую ARIA. |
| RadioOption.value | Уникальная внутри группы строка, не текст подписи. | Пустая строка участвует в checked/focus/navigation; неизвестный/disabled SELECT отвергается машиной. |
| RadioOption.label | Visible ReactNode, включая 0 и inline rich text. | Не теряется ноль, длинное слово переносится, native label активирует свой input. Внутри label следует использовать phrasing content. |
| RadioOption.disabled | Запрет только этой опции; текущий controlled выбор можно сохранить. | Пропуск стрелками/Tab, native disabled, единая прозрачность, отсутствие пользовательского callback. |
| RadioOption.id / aria-label / aria-labelledby / aria-describedby | Добавлены точечные native input attributes; нет второго объекта произвольных props. | Внешние подписи/описания и rich label доступны screen-reader API. RadioOption экспортируется из package root. |

## Воспроизведённые дефекты и исправления

Начальные unit-проверки: 7 failures, 1 pass, 1 React-19-only skip. Начальные
browser-проверки: 11 failures, 4 passes. Они выявили потерю реального фокуса
на empty value, игнорирование root native props, ref detach/cleanup, смешанную
anatomy и многократную disabled opacity. Hidden input получал min-height/padding
визуальной строки. Теперь `item` — label, `input` — отдельная native часть;
getInputProps отделён от getItemProps. Headless adapter callers должны перейти
на getInputProps для control handlers; поиск локальных потребителей не выявил
внешних вызовов старого метода.

Дополнительные проверки подтвердили неработающий autoFocus и позднюю отмену
стрелок через root onKeyDown. Навигация выполняется после consumer handler;
выбор происходит через input.click(), поэтому pointer и keyboard не обходят
native onChange. Расчёт порядка один: getRadioNavigationValue используется
машиной и React-адаптером. Отдельный effect для движения фокуса удалён.

На чистом HTML без React воспроизведён Firefox bug: required radio inputs,
стоящие до external form, могут оставаться valid при отсутствии выбора.
Повторное назначение того же required не помогает; переключение false/true
после подключения формы пересчитывает group validity. Локальный effect Radio
делает это только для required external form, без UA sniffing и без новых props.
SSR до hydration сохраняет нативные ограничения браузера.

Проверка длинного идентификатора в колонке 180px воспроизвела scrollWidth
1208–1216px. Ограничены flex-items/мембрана и включён перенос длинных слов.
Проверяются vertical/horizontal × membrane true/false; скрытый input остаётся
1×1px, фокус виден на visual label. Light/dark проходят axe и geometry checks.

## Миграция и границы

- ariaLabel → aria-label, ariaLabelledBy → aria-labelledby в JSX и product scenarios.
- Добавлены доступные имена реальным группам FontPropsPanel, Playground settings,
  RoleSection, FontUploadModal, CartPanel и alphabet settings. Использованы
  существующие подписи/переводы.
- У settings Radio FontPropsPanel/CartPanel удалены жёстко заданные native names:
  их значения обрабатывают callbacks, а одинаковый name связывал бы независимые
  экземпляры в одну браузерную группу. Имена для доступности задаются через ARIA.
- required требует name; для отправляемой формы задаётся осмысленный непустой ключ.
  Пустая или полностью disabled группа не создаёт enabled validation control.
- FormControlProps остаётся общей семантической базой, но Radio выражает
  зависимость required/name явно в своём типе. Не добавлены readOnly или второй
  visible group label: первый не является native radio state, для второго
  работают внешние headings с aria-labelledby.
- JSON props/defaults, anatomy/keyboard/ARIA metadata, generated scenarios и gallery
  обновляются вместе. Динамические Json/JS consumers также должны соблюдать
  условие непустого name для required; TS не способен доказать непустоту string.

## Проверки

Проверки кода этой контрольной точки:

- `pnpm check`: React 18 — 369 passed + 4 React-19-only skips;
  React 19.3 — 373/373. Включены type-negative checks, contracts, gallery,
  npm build/smoke/pack. Логи `/tmp/face-ui-radio-check-reviewed.log`,
  `/tmp/face-ui-radio-react19-check.log`.
- Полная browser matrix — **510/510 на каждой версии React**, Chromium,
  Firefox, WebKit. Radio отдельно — 48 browser cases; существующий SSR/hydration
  case дополнен empty-value Radio. Логи `/tmp/face-ui-radio-browser-full.log`,
  `/tmp/face-ui-radio-react19-browser-full.log`.
- App PropsEditor и parsers — 41/41, включая новый тест чтения фактического
  RadioProps из product-local snapshot. Первая попытка до восстановления dist
  после sync не загрузила 6 suites; после штатной сборки пакета все 13 suites
  прошли. Assertions и импорты ради этого не ослаблялись.
  Лог `/tmp/face-ui-radio-app-tests-reviewed.log`.
- App `desktop:build`, site `build`, Defrictor `check:ui` и `build` прошли.
  Логи `/tmp/face-ui-radio-app-build.log`, `/tmp/face-ui-radio-site-build.log`,
  `/tmp/face-ui-radio-defrictor-check.log`, `/tmp/face-ui-radio-defrictor-build.log`.
  Site postbuild пропустил регистрацию analytics fonts без DATABASE_URL;
  эта локальная конфигурация не менялась.
- Светлый и тёмный рендеры просмотрены вручную: `.artifacts/radio-light.png`,
  `.artifacts/radio-dark.png`. Сопоставлены отступы Radio/Checkbox, обе ориентации,
  rich/multiline/disabled labels, RTL и focus ring.

Инвентаризация: 107 public API types, 873 library prop/field occurrences,
9926 inherited platform occurrences. Это не процент завершённого общего аудита.
Browser проверки не заменяют отдельную ручную проверку всех assistive technologies.
Общий index по-прежнему выводит известные Vite dependency externalization warnings;
цепочка зависимости и незавершённая проверка production bundle записаны в
next-layout-findings.md.

Финальный перенос журнала выполняется через workspace package-sync после
проверенного drift; затем штатно восстанавливается dist app/site Face packages.
Заключительные команды: `package-sync:check`, `proof-pack:check`,
`production-isolation:check`, app `design-system:runtime-manifest:check`.
Логи `/tmp/face-ui-radio-docs-sync.log`, `/tmp/face-ui-radio-gates-final.log`.
Runtime manifest пересоздан генератором: `sha256:51e71d7f1327cf2291fde4d7`.
