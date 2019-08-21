import { DependencyFacroty } from './DependencyFacroty';

export interface Dependency<T> {
    factory: DependencyFacroty<T>;
    singleton?: boolean;
}
