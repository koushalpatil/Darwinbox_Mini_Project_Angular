import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Toast notification message. */
export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

/**
 * Application-wide toast notification service.
 * Manages a queue of toast messages with auto-dismiss.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);

  /** Observable stream of active toast messages. */
  readonly toasts$ = this.toastsSubject.asObservable();

  /** Show a toast of a given type. */
  private show(type: ToastMessage['type'], message: string, duration = 5000): void {
    const id = ++this.counter;
    const toast: ToastMessage = { id, type, message };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);
    setTimeout(() => this.remove(id), duration);
  }

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message, 6000);
  }

  info(message: string): void {
    this.show('info', message);
  }

  warning(message: string): void {
    this.show('warning', message);
  }

  /** Remove a toast by ID. */
  remove(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter((t) => t.id !== id));
  }
}
