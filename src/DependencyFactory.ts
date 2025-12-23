import type { Container } from './Container';

type NotPromise<T> = T extends PromiseLike<any> ? never : T;

export interface DependencyFactory<T> {
  (container: Container): NotPromise<T>;
}
