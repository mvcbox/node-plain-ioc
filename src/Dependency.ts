import type { DependencyFactory } from './DependencyFactory';

export interface Dependency<T> {
  factory: DependencyFactory<T>;
  singleton?: boolean;
}
