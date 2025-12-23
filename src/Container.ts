import type { Dependency } from './Dependency';
import type { DependencyKey } from './DependencyKey';
import type { ContainerOptions } from './ContainerOptions';
import type { DependencyFactory } from './DependencyFactory';
import {
  FactoryNotBoundError,
  CircularDependencyError,
  FactoryAlreadyBoundError
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

      throw new CircularDependencyError(errorMessage);
    }
  }

  protected circularDependencyStackPop(): void {
    if (this.circularDependencyDetect) {
      this.circularDependencyStack.pop();
    }
  }

  protected keyToString(key: DependencyKey): string {
    const type = typeof key;

    try {
      if (typeof key === 'function') {
        return `"${key.name || '<anonymous>'}" (${type})`;
      }

      if (type === 'object') {
        return `"${Object.prototype.toString.call(key)}" (${type})`;
      }

      return `"${String(key)}" (${type})`;
    } catch {
      return `"<unprintable>" (${type})`;
    }
  }

  public bind<T>(key: DependencyKey, factory: DependencyFactory<T>): void {
    if (this.dependencies.has(key)) {
      throw new FactoryAlreadyBoundError(`Factory for ${this.keyToString(key)} already bound`);
    }

    this.dependencies.set(key, {
      factory
    });
  }

  public unbind(key: DependencyKey): void {
    if (!this.dependencies.has(key)) {
      throw new FactoryNotBoundError(`Factory not bound with ${this.keyToString(key)}`);
    }

    this.dependencies.delete(key);
    this.initializedInstances.delete(key);
  }

  public bindSingleton<T>(key: DependencyKey, factory: DependencyFactory<T>): void {
    if (this.dependencies.has(key)) {
      throw new FactoryAlreadyBoundError(`Factory for ${this.keyToString(key)} already bound`);
    }

    this.dependencies.set(key, {
      factory,
      singleton: true
    });
  }

  public isBound(key: DependencyKey): boolean {
    return this.dependencies.has(key);
  }

  public resolve<T>(key: DependencyKey): T {
    if (!this.dependencies.has(key)) {
      throw new FactoryNotBoundError(`Factory not bound with ${this.keyToString(key)}`);
    }

    const dependency = <Dependency<T>>this.dependencies.get(key);

    if (dependency.singleton && this.initializedInstances.has(key)) {
      return <T>this.initializedInstances.get(key);
    }

    try {
      this.circularDependencyStackPush(key);

      if (dependency.singleton) {
        const instance = dependency.factory(this);
        this.initializedInstances.set(key, instance);
        return instance;
      }

      return dependency.factory(this);
    } finally {
      this.circularDependencyStackPop();
    }
  }
}
