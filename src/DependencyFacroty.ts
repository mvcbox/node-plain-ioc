import { Container } from './Container';

export interface DependencyFacroty<T> {
    (container: Container): T;
}
