import { Container } from './Container';

export interface DependencyFactory<T> {
    (container: Container): T;
}
