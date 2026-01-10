import type { Dependency } from './Dependency';
import type { DependencyKey } from './DependencyKey';
import type { ContainerOptions } from './ContainerOptions';
import type { DependencyFactory } from './DependencyFactory';
import {
  PlainIocFactoryNotBoundError,
  PlainIocCircularDependencyError,
  PlainIocFactoryAlreadyBoundError
} from './errors';

export class Container {
  protected readonly circularDependencyDetect: boolean;
  protected readonly circularDependencyStack: DependencyKey[];
  protected readonly initializedInstances: Map<DependencyKey, unknown>;
  protected readonly dependencies: Map<DependencyKey, Dependency<unknown>>;

  public constructor(options?: ContainerOptions) {
    this.circularDependencyStack = [];
    this.initializedInstances = new Map<DependencyKey, unknown>();
    this.dependencies = new Map<DependencyKey, Dependency<unknown>>();
    this.circularDependencyDetect = options?.circularDependencyDetect ?? false;
  }

  protected circularDependencyStackPush(key: DependencyKey): void {
    if (!this.circularDependencyDetect) {
      return;
    }

    const detected = this.circularDependencyStack.findIndex(item => item === key) !== -1;
    this.circularDependencyStack.push(key);

    if (detected) {
      let errorMessage = 'Circular dependency detected\n\n';
      errorMessage += '>>>>>>> Circular Dependency Stack <<<<<<<\n';
      errorMessage += this.circularDependencyStack.map((item, index) => {
        return `>>> [${index}]: ${this.keyToString(item)}\n`;
      }).join('');

      throw new PlainIocCircularDependencyError(errorMessage);
    }
  }

  protected circularDependencyStackPop(): void {
    if (this.circularDependencyDetect) {
      this.circularDependencyStack.pop();
    }
  }

  protected keyToString(key: DependencyKey): string {
    const keyType = typeof key;

    try {
      if (typeof key === 'function') {
        return `[${keyType}] "${key.name || '<anonymous>'}"`;
      } else if (typeof key === 'symbol') {
        return `[${keyType}] "${Symbol.prototype.toString.call(key)}"`;
      } else if (typeof key === 'object') {
        return `[${keyType}] "${Object.prototype.toString.call(key)}"`;
      }

      return `[${keyType}] "${String(key)}"`;
    } catch {
      return `[${keyType}] "<unprintable>"`;
    }
  }

  public bind<T>(key: DependencyKey, factory: DependencyFactory<T>): this {
    if (this.dependencies.has(key)) {
      throw new PlainIocFactoryAlreadyBoundError(`Factory for ${this.keyToString(key)} already bound`);
    }

    this.dependencies.set(key, {
      factory
    });

    return this;
  }

  public bindSingleton<T>(key: DependencyKey, factory: DependencyFactory<T>): this {
    if (this.dependencies.has(key)) {
      throw new PlainIocFactoryAlreadyBoundError(`Factory for ${this.keyToString(key)} already bound`);
    }

    this.dependencies.set(key, {
      factory,
      singleton: true
    });

    return this;
  }

  public unbind(key: DependencyKey): this {
    if (!this.dependencies.has(key)) {
      throw new PlainIocFactoryNotBoundError(`Factory not bound with ${this.keyToString(key)}`);
    }

    this.dependencies.delete(key);
    this.initializedInstances.delete(key);
    return this;
  }

  public isBound(key: DependencyKey): boolean {
    return this.dependencies.has(key);
  }

  public resolve<T>(key: DependencyKey): T {
    const dependency = this.dependencies.get(key);

    if (!dependency) {
      throw new PlainIocFactoryNotBoundError(`Factory not bound with ${this.keyToString(key)}`);
    }

    if (dependency.singleton && this.initializedInstances.has(key)) {
      return this.initializedInstances.get(key) as T;
    }

    try {
      this.circularDependencyStackPush(key);
      const { factory } = dependency;
      const instance = factory(this) as T;

      if (dependency.singleton) {
        this.initializedInstances.set(key, instance);
      }

      return instance;
    } finally {
      this.circularDependencyStackPop();
    }
  }
}
