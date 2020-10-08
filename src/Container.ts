import { Dependency} from './Dependency';
import { DependencyKey} from './DependencyKey';
import { DependencyFacroty} from './DependencyFacroty';
import { FactoryNotBoundError, FactoryAlreadyBoundError } from './errors';

export class Container {
    public dependencies = new Map<DependencyKey, Dependency<any>>();
    public initInstances = new Map<DependencyKey, any>();

    public bind<T>(key: DependencyKey, factory: DependencyFacroty<T>): void {
        if (this.dependencies.has(key)) {
            throw new FactoryAlreadyBoundError(`Factory for '${this.keyToString(key)}' already bound`);
        }

        this.dependencies.set(key, {
            factory
        });
    }

    public unbind(key: DependencyKey): void {
        if (!this.dependencies.has(key)) {
            throw new FactoryNotBoundError(`Factory not bound with '${this.keyToString(key)}'`);
        }

        this.dependencies.delete(key);
        this.initInstances.delete(key);
    }

    public bindSingleton<T>(key: DependencyKey, factory: DependencyFacroty<T>): void {
        if (this.dependencies.has(key)) {
            throw new FactoryAlreadyBoundError(`Factory for '${this.keyToString(key)}' already bound`);
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
            throw new FactoryNotBoundError(`Factory not bound with '${this.keyToString(key)}'`);
        }

        const dependency = <Dependency<T>>this.dependencies.get(key);

        if (dependency.singleton && this.initInstances.has(key)) {
            return <T>this.initInstances.get(key);
        } else if (dependency.singleton) {
            const instance = dependency.factory(this);
            this.initInstances.set(key, instance);
            return instance;
        }

        return dependency.factory(this);
    }

    public keyToString(key: DependencyKey): string {
        if (typeof key === 'function') {
            return key.name || '';
        }

        return String(key);
    }
}
