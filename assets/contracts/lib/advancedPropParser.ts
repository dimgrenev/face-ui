/**
 * Advanced TypeScript AST Parser using ts-morph
 * Извлекает prop definitions из TypeScript/TSX/Vue/Svelte с полной поддержкой:
 * - Union types, enums, type aliases
 * - JSDoc комментарии (@control, @min, @max, @step, @autocomplete, @multiline)
 * - Import resolution для type aliases
 * - Framework-specific syntax (React, Vue, Svelte)
 */

import { Project, SourceFile, InterfaceDeclaration, TypeAliasDeclaration, EnumDeclaration, Node, SyntaxKind, ts } from 'ts-morph';
import path from 'path';
import type { VFSFile } from './vfs';

export interface ParsedProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: any;
  description?: string;
  jsdoc?: {
    control?: string;
    min?: number;
    max?: number;
    step?: number;
    autocomplete?: string;
    multiline?: boolean;
    example?: string;
  };
  // Enriched metadata
  options?: string[]; // для union types (closed set)
  suggestions?: string[]; // для mixed unions (open-ended with known values)
  enumValues?: Record<string, string | number>; // для enums
  isArray?: boolean;
  arrayItemType?: string;
  isObject?: boolean;
  objectShape?: Record<string, string>;
  /** True when the prop is inherited from React/HTML intrinsic types (node_modules). */
  isInherited?: boolean;
}

// Re-export shared VFS contract for backward compatibility with existing imports.
export type { VFSFile } from './vfs';

interface TypeCache {
  aliases: Map<string, string>; // typeName -> resolved type
  enums: Map<string, Record<string, string | number>>;
  interfaces: Map<string, ParsedProp[]>;
}

/**
 * Главный класс парсера
 */
export class AdvancedPropParser {
  // AP-004: Singleton — use getAdvancedPropParser() instead of constructor.
  private static _instance: AdvancedPropParser | null = null;
  /** @internal Use getAdvancedPropParser() instead. */
  private constructor() {}
  static getInstance(): AdvancedPropParser {
    if (!AdvancedPropParser._instance) {
      AdvancedPropParser._instance = new AdvancedPropParser();
    }
    return AdvancedPropParser._instance;
  }
  private project: Project | null = null;
  private cache: TypeCache = {
    aliases: new Map(),
    enums: new Map(),
    interfaces: new Map(),
  };
  private maxImportDepth = 5;
  private pathMap = new Map<string, string>();
  private cwd = process.cwd();

  // Task 3.2: LRU result cache — avoids re-parsing unchanged files.
  private static readonly RESULT_CACHE_MAX = 64;
  private static readonly RESULT_CACHE_TTL = 60_000; // 60 seconds
  private resultCache = new Map<string, { result: ParsedProp[]; ts: number }>();

  /** Simple FNV-1a for cache keys */
  private hashContent(s: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  }

  private buildCacheKey(fileName: string, vfs: Record<string, VFSFile>): string {
    // Key = hash of target file + hash of all VFS contents (import resolution may touch any file)
    const parts = [fileName];
    const keys = Object.keys(vfs).sort();
    for (const k of keys) {
      parts.push(k + ':' + this.hashContent(vfs[k]?.content || ''));
    }
    return this.hashContent(parts.join('|'));
  }

  /**
   * Инициализация виртуального ts-morph проекта
   */
  private initProject(vfs: Record<string, VFSFile>): void {
    // Task 3.2: Reuse existing Project to avoid expensive re-initialization.
    // Only create a new Project if one doesn't exist yet.
    if (!this.project) {
      try {
        this.project = new Project({
          tsConfigFilePath: path.join(this.cwd, 'tsconfig.json'),
          skipAddingFilesFromTsConfig: true,
          useInMemoryFileSystem: false,
          compilerOptions: {
            target: 99, // ESNext
            module: 99, // ESNext
            jsx: 2, // React
            strict: false,
            skipLibCheck: true,
            esModuleInterop: true,
          },
        });
      } catch (e) {
        // Fallback: in case tsconfig is unavailable, keep a minimal project.
        this.project = new Project({
          useInMemoryFileSystem: false,
          compilerOptions: {
            target: 99,
            module: 99,
            jsx: 2,
            strict: false,
            skipLibCheck: true,
            esModuleInterop: true,
          },
        });
      }
    } else {
      // Clear existing source files from the reused Project
      try {
        for (const sf of this.project.getSourceFiles()) {
          this.project.removeSourceFile(sf);
        }
      } catch {}
    }

    this.pathMap.clear();

    // Добавляем все файлы из VFS в проект
    for (const [fileName, file] of Object.entries(vfs)) {
      try {
        const rel = String(fileName || '').replace(/\\/g, '/');
        if (!rel) continue;
        const abs = path.isAbsolute(rel) ? rel : path.join(this.cwd, rel);
        this.pathMap.set(rel, abs);
        this.project?.createSourceFile(abs, file.content, { overwrite: true });
      } catch (err) {
        console.warn(`[AdvancedPropParser] Failed to add file ${fileName}:`, err);
      }
    }
  }

  /**
   * Основной метод парсинга
   */
  public parse(fileName: string, vfs: Record<string, VFSFile>, framework: 'react' | 'vue' | 'svelte' = 'react'): ParsedProp[] {
    try {
      // Task 3.2: check result cache
      const cacheKey = this.buildCacheKey(fileName + ':' + framework, vfs);
      const cached = this.resultCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < AdvancedPropParser.RESULT_CACHE_TTL) {
        console.log(`[AdvancedPropParser] Cache HIT for ${fileName} (${framework})`);
        return cached.result;
      }

      console.log(`[AdvancedPropParser] Parsing ${fileName} (${framework})`);

      this.initProject(vfs);
      if (!this.project) {
        throw new Error('Failed to initialize ts-morph project');
      }

      const rel = String(fileName || '').replace(/\\/g, '/');
      const abs = this.pathMap.get(rel) || (path.isAbsolute(rel) ? rel : path.join(this.cwd, rel));
      const sourceFile = this.project.getSourceFile(abs) || this.project.addSourceFileAtPathIfExists(abs);
      if (!sourceFile) {
        throw new Error(`Source file ${fileName} not found in project`);
      }

      // Сначала собираем все type aliases и enums для резолва
      this.buildTypeCache(sourceFile);

      // Парсим в зависимости от фреймворка
      let result: ParsedProp[];
      switch (framework) {
        case 'react':
          result = this.parseReactProps(sourceFile);
          break;
        case 'vue':
          result = this.parseVueProps(sourceFile);
          break;
        case 'svelte':
          result = this.parseSvelteProps(sourceFile);
          break;
        default:
          result = this.parseReactProps(sourceFile);
      }

      // Task 3.2: store in result cache (evict oldest if over limit)
      this.resultCache.set(cacheKey, { result, ts: Date.now() });
      if (this.resultCache.size > AdvancedPropParser.RESULT_CACHE_MAX) {
        const oldest = this.resultCache.keys().next().value;
        if (oldest !== undefined) this.resultCache.delete(oldest);
      }

      return result;
    } catch (error) {
      console.error('[AdvancedPropParser] Parse error:', error);
      return [];
    } finally {
      // Очищаем type cache после парсинга (Project is preserved for reuse)
      this.cleanup();
    }
  }

  /**
   * Собираем кеш типов (aliases, enums, interfaces)
   */
  private buildTypeCache(sourceFile: SourceFile): void {
    // Type aliases
    sourceFile.getTypeAliases().forEach((alias) => {
      const name = alias.getName();
      const typeNode = alias.getTypeNode();
      if (typeNode) {
        this.cache.aliases.set(name, typeNode.getText());
      }
    });

    // Enums
    sourceFile.getEnums().forEach((enumDecl) => {
      const name = enumDecl.getName();
      const values: Record<string, string | number> = {};
      let lastNumeric = -1;
      enumDecl.getMembers().forEach((member) => {
        const memberName = member.getName();
        const initializer = member.getInitializer();
        if (initializer) {
          const value = initializer.getText().replace(/['"]/g, '');
          const numVal = Number(value);
          if (!isNaN(numVal)) {
            values[memberName] = numVal;
            lastNumeric = numVal;
          } else {
            values[memberName] = value;
          }
        } else {
          // Enum без значения: автоинкремент от последнего числового
          lastNumeric++;
          values[memberName] = lastNumeric;
        }
      });
      this.cache.enums.set(name, values);
    });

    // Interfaces (для будущего резолва)
    sourceFile.getInterfaces().forEach((iface) => {
      const name = iface.getName();
      const props = this.extractPropsFromInterface(iface);
      this.cache.interfaces.set(name, props);
    });
  }

  /**
   * Парсинг React props (interface/type с Props в названии или FC generic)
   */
  private parseReactProps(sourceFile: SourceFile): ParsedProp[] {
    const defaults = this.extractReactDefaults(sourceFile);
    const cvaMeta = this.extractCvaVariants(sourceFile);

    // Preferred: resolve props via type checker (covers extends, React.ComponentProps, VariantProps, etc.)
    try {
      const propsFromTypes = this.extractPropsFromTypeChecker(sourceFile, defaults, cvaMeta);
      if (propsFromTypes.length > 0) return propsFromTypes;
    } catch (e) {
      console.warn('[AdvancedPropParser] type-checker extraction failed, falling back:', e);
    }

    // Fallback 0: infer prop names from React component parameters (destructuring)
    const inferredNames = this.extractReactPropNamesFromParams(sourceFile);
    if (inferredNames.length > 0) {
      const inferred = inferredNames.map((name) => ({
        name,
        type: 'any',
        required: false,
        defaultValue: (defaults && Object.prototype.hasOwnProperty.call(defaults, name)) ? (defaults as any)[name] : undefined,
      }));
      return this.applyCvaMeta(inferred, cvaMeta, defaults);
    }

    // Fallback 1: interface with "Props" in name
    const propsInterface = sourceFile.getInterfaces().find((iface) =>
      iface.getName().toLowerCase().includes('props')
    );
    if (propsInterface) {
      try {
        if (this.project) {
          const ifaceType = propsInterface.getType();
          const base = this.extractPropsFromType(ifaceType, propsInterface, defaults);
          if (base.length > 0) return this.applyCvaMeta(base, cvaMeta, defaults);
        }
      } catch {}
      const base = this.extractPropsFromInterface(propsInterface, defaults);
      return this.applyCvaMeta(base, cvaMeta, defaults);
    }

    // Fallback 2: type alias with "Props" in name
    const propsType = sourceFile.getTypeAliases().find((alias) =>
      alias.getName().toLowerCase().includes('props')
    );
    if (propsType) {
      try {
        if (this.project) {
          const typeNode = propsType.getTypeNode();
          if (typeNode) {
            const aliasType = propsType.getType();
            const base = this.extractPropsFromType(aliasType, propsType, defaults);
            if (base.length > 0) return this.applyCvaMeta(base, cvaMeta, defaults);
          }
        }
      } catch {}
      const base = this.extractPropsFromTypeAlias(propsType);
      return this.applyCvaMeta(base, cvaMeta, defaults);
    }

    // Fallback 3: React.FC<PropsType>
    const fcComponent = sourceFile.getVariableDeclarations().find((varDecl) => {
      const typeNode = varDecl.getTypeNode();
      if (!typeNode) return false;
      const typeText = typeNode.getText();
      return typeText.includes('React.FC') || typeText.includes('FC<');
    });
    if (fcComponent) {
      const typeNode = fcComponent.getTypeNode();
      if (typeNode) {
        const match = typeNode.getText().match(/FC<(\w+)>/);
        if (match) {
          const propsTypeName = match[1];
          if (this.cache.interfaces.has(propsTypeName)) {
            const base = this.cache.interfaces.get(propsTypeName)!;
            const merged = base.map((p) => ({
              ...p,
              defaultValue: (p.defaultValue === undefined && Object.prototype.hasOwnProperty.call(defaults, p.name))
                ? (defaults as any)[p.name]
                : p.defaultValue,
            }));
            return this.applyCvaMeta(merged, cvaMeta, defaults);
          }
        }
      }
    }

    console.warn('[AdvancedPropParser] No React props found in', sourceFile.getFilePath());
    return [];
  }

  private extractReactPropNamesFromParams(sourceFile: SourceFile): string[] {
    const out: string[] = [];
    const addName = (n: string) => {
      const name = String(n || '').trim();
      if (!name || name === '...props') return;
      if (!out.includes(name)) out.push(name);
    };

    const extractFromBindingPattern = (bp: any) => {
      try {
        const els = bp.getElements ? bp.getElements() : [];
        for (const el of els) {
          const name = String(el.getName ? el.getName() : '').trim();
          if (!name) continue;
          addName(name.replace(/^\.{3}/, ''));
        }
      } catch {}
    };

    const extractFromFn = (fn: any) => {
      try {
        const p0 = fn.getParameters ? fn.getParameters()[0] : null;
        if (!p0) return;
        const nameNode = p0.getNameNode ? p0.getNameNode() : null;
        if (nameNode && Node.isObjectBindingPattern(nameNode)) {
          extractFromBindingPattern(nameNode);
          return;
        }
        const paramName = p0.getName ? String(p0.getName() || '') : '';
        if (paramName && fn.getBody) {
          const body = fn.getBody();
          const decls = body.getDescendantsOfKind ? body.getDescendantsOfKind(SyntaxKind.VariableDeclaration) : [];
          for (const d of decls) {
            const init = d.getInitializer ? d.getInitializer() : null;
            if (!init) continue;
            if (String(init.getText ? init.getText() : '') !== paramName) continue;
            const nm = d.getNameNode ? d.getNameNode() : null;
            if (nm && Node.isObjectBindingPattern(nm)) {
              extractFromBindingPattern(nm);
            }
          }
        }
      } catch {}
    };

    const node = this.resolveReactComponentNode(sourceFile);
    if (node) {
      if (Node.isFunctionDeclaration(node) || Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
        extractFromFn(node);
      } else if (Node.isVariableDeclaration(node)) {
        const init = node.getInitializer();
        if (init && Node.isCallExpression(init)) {
          const exprText = String(init.getExpression().getText() || '');
          if (exprText.includes('forwardRef')) {
            const a0 = init.getArguments()[0];
            if (a0 && (Node.isArrowFunction(a0) || Node.isFunctionExpression(a0))) {
              extractFromFn(a0);
            }
          }
        } else if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
          extractFromFn(init);
        }
      }
    }

    return out;
  }

  /**
   * Extract props via TS type checker (most complete path).
   */
  private extractPropsFromTypeChecker(
    sourceFile: SourceFile,
    defaults?: Record<string, any>,
    cvaMeta?: Record<string, { options?: string[]; defaultValue?: string }>
  ): ParsedProp[] {
    if (!this.project) return [];
    const checker = this.project.getTypeChecker();

    const componentNode = this.resolveReactComponentNode(sourceFile);
    if (!componentNode) return [];

    const compType = checker.getTypeAtLocation(componentNode);
    const sigs = compType.getCallSignatures();
    if (!sigs || sigs.length === 0) return [];
    const sig = sigs[0];
    const params = sig.getParameters();
    if (!params || params.length === 0) return [];

    const paramSymbol = params[0];
    const paramDecl = (paramSymbol.getDeclarations && paramSymbol.getDeclarations()[0]) || componentNode;
    const propsType = checker.getTypeOfSymbolAtLocation(paramSymbol, paramDecl as any);
    if (!propsType) return [];

    const props = this.extractPropsFromType(propsType, paramDecl as any, defaults, { includeNodeModules: false });
    return this.applyCvaMeta(props, cvaMeta, defaults);
  }

  /**
   * Resolve the React component declaration for the default export.
   */
  private resolveReactComponentNode(sourceFile: SourceFile): Node | null {
    try {
      const defSym = sourceFile.getDefaultExportSymbol();
      if (defSym) {
        const decls = defSym.getDeclarations();
        if (!decls || decls.length === 0) return null;
        let d: Node = decls[0];
        if (Node.isExportAssignment(d)) {
          const expr = d.getExpression();
          if (Node.isIdentifier(expr)) {
            const sym = expr.getSymbol();
            const sdecl = sym?.getDeclarations()?.[0];
            if (sdecl) d = sdecl;
          } else if (expr) {
            d = expr;
          }
        }
        return d;
      }

      // Fallback for named exports: try to match file name (e.g. badge.tsx -> Badge)
      const base = sourceFile.getBaseNameWithoutExtension();
      const preferred = this.toPascalCase(base);
      const exported = sourceFile.getExportedDeclarations();
      const pickFromDecls = (decls: Node[]): Node | null => {
        for (const d of decls) {
          if (Node.isFunctionDeclaration(d) || Node.isClassDeclaration(d)) return d;
          if (Node.isVariableDeclaration(d)) return d;
        }
        return null;
      };
      if (exported.has(preferred)) {
        const d = pickFromDecls(exported.get(preferred) || []);
        if (d) return d;
      }
      // Otherwise pick the first exported PascalCase component-like symbol
      for (const [name, decls] of exported.entries()) {
        if (!/^[A-Z]/.test(name)) continue;
        const d = pickFromDecls(decls);
        if (d) return d;
      }

      return null;
    } catch {
      return null;
    }
  }

  private toPascalCase(value: string): string {
    const s = String(value || '').replace(/[^a-zA-Z0-9]+/g, ' ').trim();
    if (!s) return value;
    return s
      .split(/\s+/)
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : ''))
      .join('');
  }

  private extractPropsFromType(
    type: any,
    loc: Node,
    defaults?: Record<string, any>,
    opts?: { includeNodeModules?: boolean; skippedNodeModules?: { count: number } }
  ): ParsedProp[] {
    const props: ParsedProp[] = [];
    if (!this.project) return props;
    const checker = this.project.getTypeChecker();
    const symbols = type.getProperties ? type.getProperties() : [];
    const seen = new Set<string>();
    const intrinsicAllow = new Set([
      'children',
      'className',
      'style',
      'id',
      'key',
      'disabled',
      'checked',
      'defaultChecked',
      'value',
      'defaultValue',
      'name',
      'placeholder',
      'type',
      'size',
      'href',
      'src',
      'alt',
      'title',
      'role',
      'tabIndex',
      'dir',
      'orientation',
      'collapsible',
      'loop',
      'open',
      'defaultOpen',
      'onOpenChange',
      'onValueChange',
      'onCheckedChange',
      'modal',
      'forceMount',
      'side',
      'sideOffset',
      'align',
      'alignOffset',
      'avoidCollisions',
      'collisionPadding',
      'sticky',
      'hideWhenDetached',
      'delayDuration',
      'skipDelayDuration',
      'min',
      'max',
      'step',
      'onClick',
      'onChange',
      'onSubmit',
      'onBlur',
      'onFocus',
      'asChild',
    ]);

    const includeNodeModules = !!opts?.includeNodeModules;
    for (const sym of symbols) {
      try {
        const name = sym.getName();
        if (!name || name === 'id') continue;
        if (seen.has(name)) continue;
        seen.add(name);

        const decls = sym.getDeclarations ? sym.getDeclarations() : [];
        const decl = decls && decls.length > 0 ? decls[0] : loc;
        // Determine if the prop is explicitly declared in the component's own source
        // (any file outside node_modules) vs purely inherited from React/HTML types.
        // A prop like `disabled` can be declared in BOTH Button.tsx AND @types/react —
        // it's only "inherited" if ALL its declarations live in node_modules.
        let isInherited = false;
        try {
          let hasOwnDecl = false;
          for (const d of decls) {
            try {
              const p = (d as any).getSourceFile?.().getFilePath?.() || '';
              if (p && !p.includes('/node_modules/')) { hasOwnDecl = true; break; }
            } catch {}
          }
          if (!hasOwnDecl && decls.length > 0) {
            if (!intrinsicAllow.has(name) && !includeNodeModules) {
              if (opts?.skippedNodeModules) opts.skippedNodeModules.count += 1;
              continue;
            }
            isInherited = true;
          }
        } catch {}
        const propType = checker.getTypeOfSymbolAtLocation(sym as any, decl as any);

        let typeText = '';
        try { typeText = propType.getText(decl as any); } catch { typeText = 'any'; }
        let typeLabel = this.simplifyType(typeText);

        // Optional?
        let isOptional = false;
        try {
          const flags = sym.getFlags ? sym.getFlags() : 0;
          if (flags & ts.SymbolFlags.Optional) isOptional = true;
        } catch {}
        try {
          if (!isOptional && propType.isUnion && propType.isUnion()) {
            isOptional = propType.getUnionTypes().some((u: any) => u.isUndefined && u.isUndefined());
          }
        } catch {}

        // Union literal options
        let options: string[] | undefined;
        let hasFreeformMember = false;
        try {
          if (propType.isUnion && propType.isUnion()) {
            const opts: string[] = [];
            for (const u of propType.getUnionTypes()) {
              if (u.isUndefined && u.isUndefined()) continue;
              if (u.isNull && u.isNull()) continue;
              if (u.isStringLiteral && u.isStringLiteral()) opts.push(String(u.getLiteralValue()));
              else if (u.isNumberLiteral && u.isNumberLiteral()) opts.push(String(u.getLiteralValue()));
              else if (u.isBooleanLiteral && u.isBooleanLiteral()) opts.push(String(u.getLiteralValue()));
              else {
                // Non-literal member (bare `string`, `number`, `boolean`, etc.) →
                // the union is open-ended, so literals are suggestions, not a closed set.
                hasFreeformMember = true;
              }
            }
            if (opts.length > 0) options = opts;
          }
        } catch {}

        // Enum values
        let enumValues: Record<string, string | number> | undefined;
        try {
          const symDecls = propType.getSymbol && propType.getSymbol()?.getDeclarations();
          const enumDecl = symDecls?.find((d: any) => Node.isEnumDeclaration(d)) as EnumDeclaration | undefined;
          if (enumDecl) {
            enumValues = {};
            enumDecl.getMembers().forEach((m) => {
              const mn = m.getName();
              const init = m.getInitializer();
              if (init) {
                const v = init.getText().replace(/['"]/g, '');
                enumValues![mn] = isNaN(Number(v)) ? v : Number(v);
              } else {
                enumValues![mn] = Object.keys(enumValues!).length;
              }
            });
            if (!options) options = Object.keys(enumValues);
          }
        } catch {}

        // Arrays
        let isArray = false;
        let arrayItemType: string | undefined;
        try {
          if (propType.isArray && propType.isArray()) {
            isArray = true;
            const el = propType.getArrayElementType();
            if (el) arrayItemType = this.simplifyType(el.getText(decl as any));
            typeLabel = 'array';
          }
        } catch {}

        // Objects (avoid over-expanding huge shapes)
        let isObject = false;
        let objectShape: Record<string, string> | undefined;
        try {
          if (!isArray && propType.isObject && propType.isObject()) {
            const callSigs = propType.getCallSignatures ? propType.getCallSignatures() : [];
            if (!callSigs || callSigs.length === 0) {
              isObject = true;
              typeLabel = 'object';
              const objProps = propType.getProperties ? propType.getProperties() : [];
              if (objProps.length > 0 && objProps.length <= 12) {
                objectShape = {};
                objProps.forEach((op: any) => {
                  try {
                    const on = op.getName();
                    const od = op.getDeclarations ? op.getDeclarations()[0] : decl;
                    const ot = checker.getTypeOfSymbolAtLocation(op, od as any);
                    objectShape![on] = this.simplifyType(ot.getText(od as any));
                  } catch {}
                });
              }
            }
          }
        } catch {}

        // JSDoc
        let jsdocData: any = undefined;
        try {
          if (decl && (decl as any).getJsDocs) {
            const jsdocs = (decl as any).getJsDocs();
            jsdocData = this.extractJSDoc(jsdocs.map((doc: any) => doc.getInnerText()).join('\n'));
          }
        } catch {}

        // If the union has non-literal members (e.g. `'sm' | 'md' | string`),
        // treat the literal values as suggestions, not a closed set.
        let finalOptions = options;
        let suggestions: string[] | undefined;
        if (hasFreeformMember && options && options.length > 0) {
          suggestions = options;
          finalOptions = undefined; // not a closed enum
        }

        props.push({
          name,
          type: typeLabel,
          required: !isOptional,
          description: jsdocData?.description,
          jsdoc: jsdocData?.tags,
          options: finalOptions,
          suggestions,
          enumValues,
          isArray,
          arrayItemType,
          isObject,
          objectShape,
          defaultValue: (defaults && Object.prototype.hasOwnProperty.call(defaults, name)) ? (defaults as any)[name] : undefined,
          ...(isInherited ? { isInherited: true } : {}),
        });
      } catch {}
    }

    return props;
  }

  private extractCvaVariants(sourceFile: SourceFile): Record<string, { options?: string[]; defaultValue?: string }> {
    const out: Record<string, { options?: string[]; defaultValue?: string }> = {};
    try {
      const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of calls) {
        const expr = call.getExpression();
        const exprText = expr ? expr.getText() : '';
        if (exprText !== 'cva') continue;
        const args = call.getArguments();
        if (!args || args.length < 2) continue;
        const arg1 = args[1];
        if (!Node.isObjectLiteralExpression(arg1)) continue;
        const variantsProp = arg1.getProperty('variants');
        const defaultsProp = arg1.getProperty('defaultVariants');
        const defaults: Record<string, string> = {};
        if (defaultsProp && Node.isPropertyAssignment(defaultsProp)) {
          const dv = defaultsProp.getInitializer();
          if (dv && Node.isObjectLiteralExpression(dv)) {
            dv.getProperties().forEach((p) => {
              if (!Node.isPropertyAssignment(p)) return;
              const k = p.getName().replace(/['"]/g, '');
              const v = p.getInitializer();
              if (k && v && Node.isStringLiteral(v)) defaults[k] = v.getLiteralText();
            });
          }
        }
        if (variantsProp && Node.isPropertyAssignment(variantsProp)) {
          const vinit = variantsProp.getInitializer();
          if (vinit && Node.isObjectLiteralExpression(vinit)) {
            vinit.getProperties().forEach((p) => {
              if (!Node.isPropertyAssignment(p)) return;
              const key = p.getName().replace(/['"]/g, '');
              const val = p.getInitializer();
              if (!key || !val || !Node.isObjectLiteralExpression(val)) return;
              const opts: string[] = [];
              val.getProperties().forEach((op) => {
                if (!Node.isPropertyAssignment(op)) return;
                const on = op.getName().replace(/['"]/g, '');
                if (on) opts.push(on);
              });
              if (opts.length > 0) {
                out[key] = { options: opts, defaultValue: defaults[key] };
              }
            });
          }
        }
      }
    } catch {}
    return out;
  }

  private applyCvaMeta(
    props: ParsedProp[],
    cvaMeta?: Record<string, { options?: string[]; defaultValue?: string }>,
    defaults?: Record<string, any>
  ): ParsedProp[] {
    if (!cvaMeta || Object.keys(cvaMeta).length === 0) return props;
    const out = props.slice();
    const byName = new Map(out.map((p) => [p.name, p]));
    for (const [name, meta] of Object.entries(cvaMeta)) {
      const existing = byName.get(name);
      if (existing) {
        if ((!existing.options || existing.options.length === 0) && meta.options && meta.options.length > 0) {
          existing.options = meta.options;
        }
        if (existing.defaultValue === undefined && meta.defaultValue !== undefined) {
          existing.defaultValue = meta.defaultValue;
        }
      } else {
        out.push({
          name,
          type: 'union',
          required: false,
          options: meta.options,
          defaultValue: meta.defaultValue ?? (defaults ? (defaults as any)[name] : undefined),
        });
      }
    }
    return out;
  }

  /**
   * Извлечение props из interface
   */
  private extractPropsFromInterface(iface: InterfaceDeclaration, defaults?: Record<string, any>): ParsedProp[] {
    const props: ParsedProp[] = [];

    iface.getProperties().forEach((prop) => {
      const name = prop.getName();
      const typeNode = prop.getTypeNode();
      const isOptional = prop.hasQuestionToken();
      const jsdocs = prop.getJsDocs();

      let type = 'any';
      let options: string[] | undefined;
      let enumValues: Record<string, string | number> | undefined;
      let isArray = false;
      let arrayItemType: string | undefined;
      let isObject = false;
      let objectShape: Record<string, string> | undefined;

      if (typeNode) {
        const typeText = typeNode.getText();
        type = this.simplifyType(typeText);

        // Проверяем union types
        if (Node.isUnionTypeNode(typeNode)) {
          options = this.extractUnionOptions(typeNode);
        }

        // Проверяем enum
        if (this.cache.enums.has(typeText)) {
          enumValues = this.cache.enums.get(typeText);
          options = Object.keys(enumValues!);
        }

        // Проверяем type alias
        if (this.cache.aliases.has(typeText)) {
          const resolvedType = this.cache.aliases.get(typeText)!;
          type = this.simplifyType(resolvedType);
          // Если alias - это union, извлекаем опции
          if (resolvedType.includes('|')) {
            options = resolvedType.split('|').map((opt) => opt.trim().replace(/['"]/g, ''));
          }
        }

        // Проверяем массивы
        const arrayGenericMatch = !Node.isArrayTypeNode(typeNode) && typeText.match(/^Array<(.+)>$/);
        if (Node.isArrayTypeNode(typeNode) || arrayGenericMatch) {
          isArray = true;
          const elementType = Node.isArrayTypeNode(typeNode)
            ? typeNode.getElementTypeNode().getText()
            : (arrayGenericMatch ? arrayGenericMatch[1] : 'any');
          arrayItemType = this.simplifyType(elementType);
          type = 'array';

          // Если элемент массива - union, извлекаем опции
          if (elementType.includes('|')) {
            options = elementType.split('|').map((opt) => opt.trim().replace(/['"]/g, ''));
          }
        }

        // Проверяем объекты
        if (Node.isTypeLiteral(typeNode) || typeText.startsWith('{')) {
          isObject = true;
          type = 'object';
          objectShape = {};
          if (Node.isTypeLiteral(typeNode)) {
            typeNode.getProperties().forEach((objProp) => {
              const objPropName = objProp.getName();
              const objPropType = objProp.getTypeNode();
              objectShape![objPropName] = objPropType ? this.simplifyType(objPropType.getText()) : 'any';
            });
          }
        }
      }

      // Извлекаем JSDoc
      const jsdocData = this.extractJSDoc(jsdocs.map((doc) => doc.getInnerText()).join('\n'));

      props.push({
        name,
        type,
        required: !isOptional,
        description: jsdocData.description,
        jsdoc: jsdocData.tags,
        options,
        enumValues,
        isArray,
        arrayItemType,
        isObject,
        objectShape,
        defaultValue: (defaults && Object.prototype.hasOwnProperty.call(defaults, name)) ? (defaults as any)[name] : undefined,
      });
    });

    return props;
  }

  /**
   * Best-effort extraction of default values from React component parameter destructuring.
   * Supports common patterns:
   * - export const X = forwardRef(( { a = 1, b = 'x', c = true }, ref) => ...)
   * - export const X = ({ a = 1, ... }: Props) => ...
   * - const X: React.FC<Props> = (props) => { const { a = 1 } = props; ... }
   */
  private extractReactDefaults(sourceFile: SourceFile): Record<string, any> {
    const out: Record<string, any> = {};

    const parseLiteral = (n: Node | undefined): any => {
      try {
        if (!n) return undefined;
        if (Node.isStringLiteral(n) || Node.isNoSubstitutionTemplateLiteral(n)) return n.getLiteralText();
        if (Node.isNumericLiteral(n)) return Number(n.getText());
        if (n.getKind() === SyntaxKind.TrueKeyword) return true;
        if (n.getKind() === SyntaxKind.FalseKeyword) return false;
        if (n.getKind() === SyntaxKind.NullKeyword) return null;
        if (Node.isPrefixUnaryExpression(n)) {
          const op = n.getOperatorToken();
          const operand = n.getOperand();
          if (op === SyntaxKind.MinusToken && Node.isNumericLiteral(operand)) return -Number(operand.getText());
        }
        return undefined;
      } catch {
        return undefined;
      }
    };

    const extractFromBindingPattern = (bp: any) => {
      try {
        const els = bp.getElements ? bp.getElements() : [];
        for (const el of els) {
          const name = String(el.getName ? el.getName() : '').trim();
          if (!name) continue;
          const init = el.getInitializer ? el.getInitializer() : null;
          const dv = parseLiteral(init || undefined);
          if (dv !== undefined) out[name] = dv;
        }
      } catch {}
    };

    const tryExtractFromFn = (fn: any) => {
      try {
        const p0 = fn.getParameters ? fn.getParameters()[0] : null;
        if (!p0) return false;
        const nameNode = p0.getNameNode ? p0.getNameNode() : null;
        if (nameNode && Node.isObjectBindingPattern(nameNode)) {
          extractFromBindingPattern(nameNode);
          return Object.keys(out).length > 0;
        }
        // Pattern: (props) => { const { a = 1 } = props; ... }
        const paramName = p0.getName ? String(p0.getName() || '') : '';
        if (paramName && fn.getBody) {
          const body = fn.getBody();
          const decls = body.getDescendantsOfKind ? body.getDescendantsOfKind(SyntaxKind.VariableDeclaration) : [];
          for (const d of decls) {
            const init = d.getInitializer ? d.getInitializer() : null;
            if (!init) continue;
            if (String(init.getText ? init.getText() : '') !== paramName) continue;
            const nm = d.getNameNode ? d.getNameNode() : null;
            if (nm && Node.isObjectBindingPattern(nm)) {
              extractFromBindingPattern(nm);
              return Object.keys(out).length > 0;
            }
          }
        }
      } catch {}
      return false;
    };

    const decls = sourceFile.getVariableDeclarations();
    for (const vd of decls) {
      const init = vd.getInitializer();
      if (!init) continue;

      // forwardRef((...) => ...)
      if (Node.isCallExpression(init)) {
        const exprText = String(init.getExpression().getText() || '');
        if (exprText.includes('forwardRef')) {
          const a0 = init.getArguments()[0];
          if (a0 && (Node.isArrowFunction(a0) || Node.isFunctionExpression(a0))) {
            if (tryExtractFromFn(a0)) break;
          }
        }
      }

      // direct arrow/function
      if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
        if (tryExtractFromFn(init)) break;
      }
    }

    return out;
  }

  /**
   * Извлечение props из type alias
   */
  private extractPropsFromTypeAlias(alias: TypeAliasDeclaration): ParsedProp[] {
    const typeNode = alias.getTypeNode();
    if (!typeNode) return [];

    // Если это type literal ({ foo: string; bar: number })
    if (Node.isTypeLiteral(typeNode)) {
      const props: ParsedProp[] = [];
      typeNode.getProperties().forEach((prop) => {
        const name = prop.getName();
        const propTypeNode = prop.getTypeNode();
        const isOptional = prop.hasQuestionToken();

        let type = 'any';
        let options: string[] | undefined;

        if (propTypeNode) {
          type = this.simplifyType(propTypeNode.getText());
          if (Node.isUnionTypeNode(propTypeNode)) {
            options = this.extractUnionOptions(propTypeNode);
          }
        }

        props.push({
          name,
          type,
          required: !isOptional,
          options,
        });
      });
      return props;
    }

    return [];
  }

  /**
   * Извлечение опций из union type
   */
  private extractUnionOptions(unionNode: Node): string[] {
    const options: string[] = [];
    
    if (Node.isUnionTypeNode(unionNode)) {
      unionNode.getTypeNodes().forEach((typeNode) => {
        if (Node.isLiteralTypeNode(typeNode)) {
          const literal = typeNode.getLiteral();
          if (Node.isStringLiteral(literal) || Node.isNumericLiteral(literal)) {
            options.push(literal.getLiteralText());
          }
        }
      });
    }

    return options;
  }

  /**
   * Парсинг Vue SFC props
   */
  private parseVueProps(sourceFile: SourceFile): ParsedProp[] {
    const content = sourceFile.getFullText();

    // Ищем defineProps<...>() или withDefaults(defineProps<...>(), {...})
    const definePropsRegex = /defineProps<\{([^}]+)\}>\(\)/;
    const withDefaultsRegex = /withDefaults\(defineProps<\{([^}]+)\}>\(\),\s*\{([^}]+)\}\)/;

    let match = withDefaultsRegex.exec(content);
    if (match) {
      const [, propsText, defaultsText] = match;
      return this.parseVuePropsText(propsText, defaultsText);
    }

    match = definePropsRegex.exec(content);
    if (match) {
      const [, propsText] = match;
      return this.parseVuePropsText(propsText);
    }

    console.warn('[AdvancedPropParser] No Vue defineProps found');
    return [];
  }

  /**
   * Парсинг текста Vue props
   */
  private parseVuePropsText(propsText: string, defaultsText?: string): ParsedProp[] {
    const props: ParsedProp[] = [];
    const lines = propsText.split(/[;\n]/).map((l) => l.trim()).filter(Boolean);

    const defaults: Record<string, string> = {};
    if (defaultsText) {
      const defaultLines = defaultsText.split(/[,\n]/).map((l) => l.trim()).filter(Boolean);
      defaultLines.forEach((line) => {
        const [key, value] = line.split(':').map((s) => s.trim());
        if (key && value) {
          defaults[key] = value;
        }
      });
    }

    lines.forEach((line) => {
      const match = /^(\w+)(\??)\s*:\s*(.+)$/.exec(line);
      if (!match) return;

      const [, name, opt, rawType] = match;
      const type = this.simplifyType(rawType);
      const required = opt !== '?';

      let options: string[] | undefined;
      if (rawType.includes('|')) {
        options = rawType.split('|').map((o) => o.trim().replace(/['"]/g, ''));
      }

      props.push({
        name,
        type,
        required,
        options,
        defaultValue: defaults[name],
      });
    });

    return props;
  }

  /**
   * Парсинг Svelte props
   */
  private parseSvelteProps(sourceFile: SourceFile): ParsedProp[] {
    const content = sourceFile.getFullText();
    const props: ParsedProp[] = [];

    // Ищем export let name: type = default
    const exportLetRegex = /export\s+let\s+(\w+)(\??)\s*:\s*([^=;]+)(?:\s*=\s*([^;]+))?/g;
    let match;

    while ((match = exportLetRegex.exec(content)) !== null) {
      const [, name, opt, rawType, defaultValue] = match;
      const type = this.simplifyType(rawType.trim());
      const required = opt !== '?';

      let options: string[] | undefined;
      if (rawType.includes('|')) {
        options = rawType.split('|').map((o) => o.trim().replace(/['"]/g, ''));
      }

      props.push({
        name,
        type,
        required,
        options,
        defaultValue: defaultValue?.trim(),
      });
    }

    return props;
  }

  /**
   * Упрощение TypeScript типа до базового
   */
  private simplifyType(type: string): string {
    const trimmed = type.trim();

    // Удаляем | undefined
    const withoutUndefined = trimmed.replace(/\s*\|\s*undefined\s*/g, '');

    // Массивы
    if (withoutUndefined.endsWith('[]') || withoutUndefined.startsWith('Array<')) {
      return 'array';
    }

    // TE-004: Record<K,V> gets its own simplified type for richer enrichment.
    if (withoutUndefined.startsWith('Record<')) {
      return 'record';
    }

    // Объекты
    if (withoutUndefined.startsWith('{')) {
      return 'object';
    }

    // Функции — only classify if arrow/parens are at top-level (not inside generics)
    if (withoutUndefined.startsWith('Function')) {
      return 'function';
    }
    {
      let depth = 0;
      let isTopLevelFn = false;
      for (let i = 0; i < withoutUndefined.length - 1; i++) {
        const ch = withoutUndefined[i];
        if (ch === '<' || ch === '(') depth++;
        else if (ch === '>' || ch === ')') depth--;
        if (depth === 0 && ch === '=' && withoutUndefined[i + 1] === '>') { isTopLevelFn = true; break; }
        if (depth === 0 && ch === '(' && withoutUndefined[i + 1] === ')') { isTopLevelFn = true; break; }
      }
      if (isTopLevelFn) return 'function';
    }

    // Union types (оставляем как есть для дальнейшей обработки)
    if (withoutUndefined.includes('|')) {
      return 'union';
    }

    // Базовые типы
    const lowerType = withoutUndefined.toLowerCase();
    if (lowerType === 'string') return 'string';
    if (lowerType === 'number') return 'number';
    if (lowerType === 'boolean') return 'boolean';
    if (lowerType === 'any' || lowerType === 'unknown') return 'any';

    // Если не распознали - возвращаем как есть
    return withoutUndefined;
  }

  /**
   * Извлечение JSDoc тегов
   */
  private extractJSDoc(jsdocText: string): { description?: string; tags: any } {
    const tags: any = {};
    let description = '';

    const lines = jsdocText.split('\n').map((l) => l.trim());
    
    lines.forEach((line) => {
      // @control
      if (line.startsWith('@control')) {
        tags.control = line.replace('@control', '').trim();
      }
      // @min
      else if (line.startsWith('@min')) {
        tags.min = parseFloat(line.replace('@min', '').trim());
      }
      // @max
      else if (line.startsWith('@max')) {
        tags.max = parseFloat(line.replace('@max', '').trim());
      }
      // @step
      else if (line.startsWith('@step')) {
        tags.step = parseFloat(line.replace('@step', '').trim());
      }
      // @autocomplete
      else if (line.startsWith('@autocomplete')) {
        tags.autocomplete = line.replace('@autocomplete', '').trim();
      }
      // @multiline
      else if (line.includes('@multiline')) {
        tags.multiline = true;
      }
      // @example
      else if (line.startsWith('@example')) {
        tags.example = line.replace('@example', '').trim();
      }
      // Description
      else if (!line.startsWith('@') && line.length > 0) {
        description += line + ' ';
      }
    });

    return {
      description: description.trim() || undefined,
      tags: Object.keys(tags).length > 0 ? tags : undefined,
    };
  }

  /**
   * Очистка per-parse ресурсов.
   * Task 3.2: Project is intentionally KEPT alive for reuse across parses.
   * Only the type cache (per-file) is cleared.
   */
  private cleanup(): void {
    // DO NOT null-out this.project — it is reused in the next parse.
    this.cache = {
      aliases: new Map(),
      enums: new Map(),
      interfaces: new Map(),
    };
  }
}

/**
 * Singleton instance для переиспользования
 */
/** @deprecated Use AdvancedPropParser.getInstance() directly. Kept for backward compat. */
export function getAdvancedPropParser(): AdvancedPropParser {
  return AdvancedPropParser.getInstance();
}
