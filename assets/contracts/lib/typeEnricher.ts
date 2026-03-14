/**
 * Type Enricher
 * Дополняет базовые parsed props метаданными для генерации rich controls
 * На основе типов, JSDoc, паттернов имен пропсов
 */

import { ParsedProp } from './advancedPropParser';

export interface EnrichedProp extends ParsedProp {
  controlType: 
    | 'text'
    | 'number'
    | 'checkbox'
    | 'select'
    | 'textarea'
    | 'date-picker'
    | 'range'
    | 'file-upload'
    | 'autocomplete'
    | 'multi-select'
    | 'json-editor'
    | 'rich-text';
  
  // Дополнительные метаданные для UI
  placeholder?: string;
  helpText?: string;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

/**
 * Главный класс обогащения типов
 */
export class TypeEnricher {
  /**
   * Обогащает массив props метаданными для контролов
   */
  public enrich(props: ParsedProp[]): EnrichedProp[] {
    return props.map((prop) => this.enrichSingleProp(prop));
  }

  /**
   * Обогащение одного пропа
   */
  private enrichSingleProp(prop: ParsedProp): EnrichedProp {
    const enriched: EnrichedProp = {
      ...prop,
      controlType: 'text', // default
    };

    // Приоритет 1: Явный @control в JSDoc
    if (prop.jsdoc?.control) {
      enriched.controlType = this.mapJSDocControl(prop.jsdoc.control);
      return enriched;
    }

    // Приоритет 2: Union types → select/multi-select
    if (prop.options && prop.options.length > 0) {
      if (prop.isArray) {
        enriched.controlType = 'multi-select';
      } else {
        enriched.controlType = 'select';
      }
      return enriched;
    }

    // Приоритет 3: Enum values → select
    if (prop.enumValues) {
      enriched.controlType = 'select';
      return enriched;
    }

    // Приоритет 4: По базовому типу + паттернам имен
    enriched.controlType = this.inferControlType(prop);

    // Добавляем дополнительные метаданные
    enriched.placeholder = this.generatePlaceholder(prop);
    enriched.helpText = this.generateHelpText(prop);
    enriched.validation = this.generateValidation(prop);

    return enriched;
  }

  /**
   * Маппинг JSDoc @control тега
   */
  private mapJSDocControl(control: string): EnrichedProp['controlType'] {
    const normalized = control.toLowerCase().replace(/[-_\s]/g, '');
    
    const mapping: Record<string, EnrichedProp['controlType']> = {
      'datepicker': 'date-picker',
      'date': 'date-picker',
      'datetime': 'date-picker',
      'range': 'range',
      'slider': 'range',
      'fileupload': 'file-upload',
      'file': 'file-upload',
      'autocomplete': 'autocomplete',
      'multiselect': 'multi-select',
      'jsoneditor': 'json-editor',
      'json': 'json-editor',
      'richtext': 'rich-text',
      'wysiwyg': 'rich-text',
      'textarea': 'textarea',
      'checkbox': 'checkbox',
      'select': 'select',
      'number': 'number',
      'text': 'text',
    };

    return mapping[normalized] || 'text';
  }

  /**
   * Инференс типа контрола на основе типа и имени пропа
   */
  private inferControlType(prop: ParsedProp): EnrichedProp['controlType'] {
    const name = prop.name.toLowerCase();
    const type = prop.type.toLowerCase();

    // Boolean → checkbox
    if (type === 'boolean') {
      return 'checkbox';
    }

    // Number with min/max → range slider
    if (type === 'number' && (prop.jsdoc?.min !== undefined || prop.jsdoc?.max !== undefined)) {
      return 'range';
    }

    // Number without constraints → number input
    if (type === 'number') {
      return 'number';
    }

    // Array of primitives → multi-select (если нет options, будет tag input)
    if (prop.isArray) {
      if (prop.arrayItemType === 'string' || prop.arrayItemType === 'number') {
        return 'multi-select';
      }
      // Array of objects → JSON editor
      return 'json-editor';
    }

    // Object / Record → JSON editor (TE-004: Record<K,V> is now a distinct simplified type)
    if (prop.isObject || type === 'object' || type === 'record') {
      return 'json-editor';
    }

    // String patterns по имени
    if (type === 'string') {
      // Date/Time
      if (name.includes('date') || name.includes('time') || name.includes('timestamp')) {
        return 'date-picker';
      }

      // File — but only when the name actually refers to a file/upload, not URL/alt/src properties
      if (name.includes('file') || name.includes('upload')) {
        return 'file-upload';
      }
      if ((name.includes('image') || name.includes('photo') || name.includes('avatar'))
        && !name.includes('url') && !name.includes('src') && !name.includes('alt')
        && !name.includes('name') && !name.includes('caption') && !name.includes('title')) {
        return 'file-upload';
      }

      // Autocomplete hints
      if (prop.jsdoc?.autocomplete) {
        return 'autocomplete';
      }

      // Multiline text — exact name or suffix match to avoid false positives like contentClassName
      if (prop.jsdoc?.multiline
        || name === 'description' || name.endsWith('description')
        || name === 'content' || name === 'body' || name === 'text'
        || name === 'bio' || name.endsWith('bio')
        || name === 'message' || name.endsWith('message')) {
        return 'textarea';
      }

      // Rich text
      if (name.includes('html') || name.includes('rich') || name.includes('formatted')) {
        return 'rich-text';
      }

      // Email pattern
      if (name.includes('email')) {
        return 'text'; // можно было бы вернуть 'email', но используем обычный text с валидацией
      }
    }

    // Function → показываем placeholder (не редактируемо)
    if (type === 'function') {
      return 'text'; // disabled input
    }

    // Default fallback
    return 'text';
  }

  /**
   * Генерация placeholder
   */
  private generatePlaceholder(prop: ParsedProp): string | undefined {
    const name = prop.name;
    const type = prop.type.toLowerCase();

    if (type === 'string') {
      if (name.toLowerCase().includes('email')) return 'example@domain.com';
      if (name.toLowerCase().includes('url') || name.toLowerCase().includes('link')) return 'https://example.com';
      if (name.toLowerCase().includes('phone')) return '+1 (555) 000-0000';
      return `Enter ${name}...`;
    }

    if (type === 'number') {
      if (prop.jsdoc?.min !== undefined && prop.jsdoc?.max !== undefined) {
        return `${prop.jsdoc.min} - ${prop.jsdoc.max}`;
      }
      return `Enter ${name}...`;
    }

    if (type === 'array') {
      return `Add ${name}...`;
    }

    return undefined;
  }

  /**
   * Генерация help text
   */
  private generateHelpText(prop: ParsedProp): string | undefined {
    if (prop.description) {
      return prop.description;
    }

    if (prop.jsdoc?.example) {
      return `Example: ${prop.jsdoc.example}`;
    }

    if (prop.options && prop.options.length > 0 && prop.options.length <= 5) {
      return `Options: ${prop.options.join(', ')}`;
    }

    if (prop.jsdoc?.min !== undefined || prop.jsdoc?.max !== undefined) {
      const min = prop.jsdoc.min ?? '-∞';
      const max = prop.jsdoc.max ?? '∞';
      return `Range: ${min} to ${max}`;
    }

    return undefined;
  }

  /**
   * Генерация правил валидации
   */
  private generateValidation(prop: ParsedProp): EnrichedProp['validation'] | undefined {
    const name = prop.name.toLowerCase();
    const type = prop.type.toLowerCase();

    const validation: EnrichedProp['validation'] = {};

    // Email pattern
    if (name.includes('email')) {
      validation.pattern = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
    }

    // URL pattern
    if (name.includes('url') || name.includes('link')) {
      validation.pattern = '^https?:\\/\\/.+';
    }

    // Color pattern: accept hex (#RGB, #RRGGBB, #RRGGBBAA), named colors, rgb/rgba/hsl/hsla, CSS vars
    if (name.includes('color') && type === 'string') {
      validation.pattern = '^(#[0-9A-Fa-f]{3,8}|[a-zA-Z]+|rgba?\\(.+\\)|hsla?\\(.+\\)|var\\(.+\\))$';
    }

    // String length
    if (type === 'string') {
      if (name.includes('password')) {
        validation.minLength = 8;
      }
      if (name.includes('username')) {
        validation.minLength = 3;
        validation.maxLength = 20;
      }
    }

    return Object.keys(validation).length > 0 ? validation : undefined;
  }
}

/**
 * Singleton instance
 */
let enricherInstance: TypeEnricher | null = null;

export function getTypeEnricher(): TypeEnricher {
  if (!enricherInstance) {
    enricherInstance = new TypeEnricher();
  }
  return enricherInstance;
}

