import { Dependency} from './Dependency';
import { DependencyFacroty} from './DependencyFacroty';
import { FactoryNotBoundError, FactoryAlreadyBoundError } from './errors';

export class Container {
    public dependencies = new Map<string | symbol, Dependency<any>>();
    public initInstances = new Map<string | symbol, any>();

    public bind<T>(key: string | symbol, factory: DependencyFacroty<T>): void {
        if (this.dependencies.has(key)) {
            throw new FactoryAlreadyBoundError(`Factory for '${String(key)}' already bound`);
        }

        this.dependencies.set(key, {
            factory
        });
    }

    public unbind(key: string | symbol): void {
        if (!this.dependencies.has(key)) {
            throw new FactoryNotBoundError(`Factory not bound with '${String(key)}'`);
        }

        this.dependencies.delete(key);
        this.initInstances.delete(key);
    }

    public bindSingleton<T>(key: string | symbol, factory: DependencyFacroty<T>): void {
        if (this.dependencies.has(key)) {
            throw new FactoryAlreadyBoundError(`Factory for '${String(key)}' already bound`);
        }

        this.dependencies.set(key, {
            factory,
            singleton: true
        });
    }

    public isBound(key: string | symbol): boolean {
        return this.dependencies.has(key);
    }

    public resolve<T>(key: string | symbol): T {
        if (!this.dependencies.has(key)) {
            throw new FactoryNotBoundError(`Factory not bound with '${String(key)}'`);
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
}
